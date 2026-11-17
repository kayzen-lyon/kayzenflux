/**
 * Logique pure de la mise à jour automatique (sans Electron, testée par vitest) :
 * - décider si la mise à jour est possible (build, plateforme, adresse configurée) ;
 * - planifier les vérifications selon le consentement de l'utilisateur ;
 * - traduire les événements d'electron-updater en état affichable ;
 * - nettoyer les journaux (aucune URL ni identifiant, règle 7 de CLAUDE.md).
 */
import type { UpdateState } from '@kayzen-flux/core';

/** Vérification au démarrage puis toutes les 6 heures. */
export const UPDATE_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** Adresse par défaut, reprise dans electron-builder.yml (`publish.url`). */
export const DEFAULT_UPDATE_URL = 'https://flux.kayzen-lyon.com/updates/';
/** Page de téléchargement proposée quand l'installation ne se met pas à jour seule (.deb). */
export const DOWNLOAD_PAGE_URL = 'https://flux.kayzen-lyon.com/#telecharger';
/**
 * electron-updater envoie au serveur un identifiant aléatoire persistant (`x-user-staging-id`),
 * qui permettrait de suivre un appareil d'une vérification à l'autre. On le remplace par une
 * valeur identique pour tous les utilisateurs (pas de déploiement progressif).
 */
export const ANONYMOUS_STAGING_ID = '00000000-0000-4000-8000-000000000000';

export type UpdateSupport =
  | { mode: 'auto'; feedUrl: string }
  | { mode: 'manual'; reason: string }
  | { mode: 'off'; reason: string };

/**
 * Lit l'adresse du fournisseur « generic » dans le fichier `app-update.yml` produit par
 * electron-builder. Seules les adresses https sont acceptées.
 */
export function parseFeedUrl(appUpdateYml: string | null): string | null {
  if (!appUpdateYml) return null;
  const provider = /^provider:\s*['"]?([\w-]+)['"]?\s*$/m.exec(appUpdateYml)?.[1];
  if (provider !== 'generic') return null;
  const raw = /^url:\s*['"]?([^'"\s]+)['"]?\s*$/m.exec(appUpdateYml)?.[1];
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

export interface SupportInput {
  isPackaged: boolean;
  platform: NodeJS.Platform;
  /** Variable APPIMAGE définie par le lanceur AppImage (absente pour le .deb). */
  appImage: string | undefined;
  feedUrl: string | null;
  /** KAYZEN_DISABLE_UPDATES=1 : désactivation par l'administrateur. */
  disabledByEnv: boolean;
}

export function resolveUpdateSupport(input: SupportInput): UpdateSupport {
  if (!input.isPackaged) return { mode: 'off', reason: 'Mode développement : aucune vérification.' };
  if (input.disabledByEnv) return { mode: 'off', reason: 'Mises à jour désactivées par l’administrateur.' };
  if (!input.feedUrl) return { mode: 'off', reason: 'Aucune adresse de mise à jour configurée dans ce build.' };
  if (input.platform === 'linux' && !input.appImage) {
    return { mode: 'manual', reason: 'Cette installation (paquet .deb) se met à jour depuis la page de téléchargement.' };
  }
  if (!['linux', 'win32', 'darwin'].includes(input.platform)) {
    return { mode: 'off', reason: 'Plateforme non prise en charge.' };
  }
  return { mode: 'auto', feedUrl: input.feedUrl };
}

export function initialUpdateState(support: UpdateSupport, currentVersion: string): UpdateState {
  return {
    status: support.mode === 'auto' ? 'idle' : support.mode === 'manual' ? 'manual' : 'unavailable',
    currentVersion,
    version: null,
    percent: null,
    lastCheck: null,
    message: support.mode === 'auto' ? null : support.reason,
    downloadPage: support.mode === 'manual' ? DOWNLOAD_PAGE_URL : null,
  };
}

export type UpdaterEvent =
  | { type: 'checking' }
  | { type: 'available'; version: string }
  | { type: 'not-available' }
  | { type: 'progress'; percent: number }
  | { type: 'downloaded'; version: string }
  | { type: 'error' };

const VERSION_RE = /^\d+\.\d+\.\d+(?:-[\w.]+)?$/;
const safeVersion = (v: string): string | null => (VERSION_RE.test(v) ? v : null);

/** Applique un événement d'electron-updater. Une mise à jour prête n'est jamais « oubliée ». */
export function reduceUpdateState(state: UpdateState, event: UpdaterEvent, now: Date): UpdateState {
  if (state.status === 'unavailable' || state.status === 'manual') return state;
  if (state.status === 'downloaded' && event.type !== 'downloaded') return state;
  switch (event.type) {
    case 'checking':
      return { ...state, status: 'checking', message: null };
    case 'available':
      return { ...state, status: 'downloading', version: safeVersion(event.version), percent: 0, message: null };
    case 'not-available':
      return { ...state, status: 'up-to-date', percent: null, lastCheck: now.toISOString(), message: 'KAYZEN Flux est à jour.' };
    case 'progress': {
      const p = Number.isFinite(event.percent) ? Math.min(100, Math.max(0, Math.round(event.percent))) : 0;
      return { ...state, status: 'downloading', percent: p };
    }
    case 'downloaded':
      return { ...state, status: 'downloaded', version: safeVersion(event.version) ?? state.version, percent: 100, lastCheck: now.toISOString(), message: null };
    case 'error':
      // Le détail technique (qui peut contenir l'adresse du serveur) n'est jamais affiché.
      return { ...state, status: 'error', percent: null, lastCheck: now.toISOString(), message: 'La recherche de mise à jour a échoué. Réessayez plus tard.' };
  }
}

export interface Timers {
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (handle: unknown) => void;
}

/**
 * Planifie les vérifications : aucune tant que l'utilisateur n'a pas répondu (`null`) ou a refusé
 * (`false`) ; au démarrage puis toutes les 6 h s'il a accepté (`true`). Une vérification manuelle
 * (« Rechercher maintenant ») est une action explicite : elle est permise quel que soit le choix.
 */
export class UpdateScheduler {
  private handle: unknown = null;
  private inFlight: Promise<void> | null = null;
  private consent: boolean | null = null;

  constructor(
    private readonly check: () => Promise<void>,
    private readonly timers: Timers,
    private readonly intervalMs = UPDATE_INTERVAL_MS,
  ) {}

  get running(): boolean {
    return this.handle !== null;
  }

  get consentGiven(): boolean | null {
    return this.consent;
  }

  setConsent(consent: boolean | null): void {
    this.consent = consent;
    if (consent === true) {
      if (this.running) return;
      this.handle = this.timers.setInterval(() => void this.run(), this.intervalMs);
      void this.run();
    } else {
      this.stop();
    }
  }

  /** Vérification demandée par l'utilisateur. Renvoie false si une vérification est déjà en cours. */
  async checkNow(): Promise<boolean> {
    if (this.inFlight) return false;
    await this.run();
    return true;
  }

  stop(): void {
    if (this.handle !== null) this.timers.clearInterval(this.handle);
    this.handle = null;
  }

  private run(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = this.check()
      .catch(() => undefined) // l'erreur est déjà reflétée dans l'état (événement « error »)
      .finally(() => {
        this.inFlight = null;
      });
    return this.inFlight;
  }
}

/** Retire URL, chemins et identifiants des messages d'electron-updater avant journalisation. */
export function redactLogMessage(message: unknown): string {
  return String(message instanceof Error ? message.message : message)
    .replace(/\b[a-z][\w+.-]*:\/\/\S+/gi, '[url]')
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[id]')
    .replace(/(?:[A-Za-z]:\\|\/)(?:[^\s/\\]+[/\\])+[^\s/\\]*/g, '[chemin]')
    .slice(0, 300);
}

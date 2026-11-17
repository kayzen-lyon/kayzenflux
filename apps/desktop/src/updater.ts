/**
 * Mise à jour automatique de l'application de bureau (electron-updater, fournisseur « generic »).
 *
 * - Adresse : lue dans `app-update.yml`, produit par electron-builder à partir de `publish.url`
 *   (electron-builder.yml). Aucun appel réseau en développement ou sans adresse https configurée.
 * - Consentement : aucune vérification automatique tant que l'utilisateur n'a pas accepté
 *   (réglage `autoUpdate` du démon). Planification dans update-policy.ts (testée).
 * - Intégrité : electron-updater vérifie le sha512 annoncé par latest*.yml avant d'installer.
 *   Ce n'est PAS une preuve d'origine : seule la signature de code (Windows, macOS) l'apporte.
 * - Confidentialité : identifiant de déploiement progressif neutralisé, journaux sans URL.
 * - Jamais de redémarrage forcé : l'installation se fait sur demande ou à la fermeture.
 */
import { app } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AppUpdater } from 'electron-updater';
import type { UpdateState } from '@kayzen-flux/core';
import type { UpdateBridge } from '../../daemon/src/updates.js';
import {
  ANONYMOUS_STAGING_ID,
  UpdateScheduler,
  initialUpdateState,
  parseFeedUrl,
  redactLogMessage,
  reduceUpdateState,
  resolveUpdateSupport,
  type UpdaterEvent,
} from './update-policy.js';

export function createUpdater(onState: (state: UpdateState) => void): UpdateBridge {
  const ymlPath = join(process.resourcesPath, 'app-update.yml');
  const yml = app.isPackaged && existsSync(ymlPath) ? readFileSync(ymlPath, 'utf8') : null;
  const support = resolveUpdateSupport({
    isPackaged: app.isPackaged,
    platform: process.platform,
    appImage: process.env.APPIMAGE,
    feedUrl: parseFeedUrl(yml),
    disabledByEnv: process.env.KAYZEN_DISABLE_UPDATES === '1',
  });

  let state = initialUpdateState(support, app.getVersion());
  let updater: AppUpdater | null = null;

  const apply = (event: UpdaterEvent) => {
    const next = reduceUpdateState(state, event, new Date());
    if (next === state) return;
    state = next;
    onState(state);
  };

  // electron-updater n'est chargé qu'au premier besoin (et jamais sans adresse configurée).
  const load = async (): Promise<AppUpdater> => {
    if (updater) return updater;
    const { autoUpdater } = await import('electron-updater');
    autoUpdater.logger = {
      info: () => undefined,
      warn: (m?: unknown) => console.warn('[mise à jour]', redactLogMessage(m)),
      error: (m?: unknown) => console.error('[mise à jour]', redactLogMessage(m)),
    };
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    // Remplace l'identifiant aléatoire persistant envoyé au serveur par une valeur commune à tous.
    autoUpdater.requestHeaders = { 'x-user-staging-id': ANONYMOUS_STAGING_ID };
    autoUpdater.on('checking-for-update', () => apply({ type: 'checking' }));
    autoUpdater.on('update-available', (info) => apply({ type: 'available', version: info.version }));
    autoUpdater.on('update-not-available', () => apply({ type: 'not-available' }));
    autoUpdater.on('download-progress', (p) => apply({ type: 'progress', percent: p.percent }));
    autoUpdater.on('update-downloaded', (info) => apply({ type: 'downloaded', version: info.version }));
    autoUpdater.on('error', () => apply({ type: 'error' }));
    updater = autoUpdater;
    return autoUpdater;
  };

  const check = async () => {
    if (support.mode !== 'auto') return;
    // Rien à faire pendant un téléchargement ou si une version attend déjà l'installation.
    if (state.status === 'downloading' || state.status === 'downloaded') return;
    const u = await load();
    try {
      await u.checkForUpdates();
    } catch {
      apply({ type: 'error' });
    }
  };

  const scheduler = new UpdateScheduler(check, {
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (h) => clearInterval(h as NodeJS.Timeout),
  });

  return {
    getState: () => state,
    setConsent: (consent) => {
      if (support.mode === 'auto') scheduler.setConsent(consent);
    },
    checkNow: async () => {
      if (support.mode === 'auto') await scheduler.checkNow();
      return state;
    },
    install: () => {
      if (state.status !== 'downloaded' || !updater) return false;
      const u = updater;
      // Laisse la réponse HTTP partir avant de quitter. Redémarrage uniquement à la demande de l'utilisateur.
      setTimeout(() => u.quitAndInstall(false, true), 300);
      return true;
    },
  };
}

/**
 * Types partagés de la mise à jour automatique de l'application de bureau
 * (application Electron ↔ démon local ↔ interface). Aucune logique ici :
 * la planification et le consentement sont dans apps/desktop/src/update-policy.ts.
 */

/**
 * - `unavailable` : pas d'application de bureau (démon seul, développement, adresse non configurée) ;
 * - `manual` : installation non mise à jour automatiquement (paquet .deb) : lien vers la page de téléchargement ;
 * - `idle` … `error` : cycle de vie d'electron-updater.
 */
export type UpdateStatus =
  | 'unavailable'
  | 'manual'
  | 'idle'
  | 'checking'
  | 'up-to-date'
  | 'downloading'
  | 'downloaded'
  | 'error';

export interface UpdateState {
  status: UpdateStatus;
  /** Version installée. */
  currentVersion: string | null;
  /** Version proposée par le serveur de mise à jour (dès qu'elle est connue). */
  version: string | null;
  /** Avancement du téléchargement, 0 à 100. */
  percent: number | null;
  /** Date ISO de la dernière vérification terminée. */
  lastCheck: string | null;
  /** Message destiné à l'utilisateur (jamais d'URL ni de détail technique). */
  message: string | null;
  /** Page de téléchargement à proposer quand la mise à jour n'est pas automatique. */
  downloadPage: string | null;
}

/** Réponse quand aucune application de bureau n'est branchée sur le démon. */
export const UPDATE_UNAVAILABLE: UpdateState = {
  status: 'unavailable',
  currentVersion: null,
  version: null,
  percent: null,
  lastCheck: null,
  message: null,
  downloadPage: null,
};

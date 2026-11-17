import type { UpdateState } from '@kayzen-flux/core';

/**
 * Pont entre le démon et le module de mise à jour de l'application de bureau.
 * Le démon seul (`pnpm start`) n'en a pas : les routes /api/update répondent « indisponible ».
 */
export interface UpdateBridge {
  getState(): UpdateState;
  /** Appelé au démarrage puis à chaque changement du réglage `autoUpdate`. */
  setConsent(consent: boolean | null): void;
  /** Vérification demandée explicitement par l'utilisateur. */
  checkNow(): Promise<UpdateState>;
  /** Redémarre pour installer la mise à jour téléchargée ; false si aucune n'est prête. */
  install(): boolean;
}

export interface DaemonHooks {
  updater?: UpdateBridge;
}

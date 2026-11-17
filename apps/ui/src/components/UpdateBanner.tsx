import { useState } from 'react';
import { Loader2, RefreshCw, ShieldCheck } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../state';

/** La mise à jour automatique est-elle possible pour cette installation ? */
export const canAutoUpdate = (status: string | undefined) => !!status && status !== 'unavailable' && status !== 'manual';

/**
 * Bandeaux de mise à jour de l'application de bureau :
 * - au premier lancement, demande l'accord (aucune vérification sans réponse) ;
 * - quand une version est téléchargée, propose de redémarrer (jamais imposé).
 */
export function UpdateBanner() {
  const { appUpdate, settings, setSettings, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [later, setLater] = useState(false);

  if (!appUpdate || !settings) return null;

  const answer = async (autoUpdate: boolean) => {
    setBusy(true);
    try {
      setSettings(await api.saveSettings({ autoUpdate }));
      toast(autoUpdate ? 'Mises à jour automatiques activées.' : 'Mises à jour automatiques désactivées. Vous pourrez changer d’avis dans Moteur & Paramètres.', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const install = async () => {
    setBusy(true);
    try {
      await api.installAppUpdate();
      toast('Redémarrage pour installer la mise à jour…', 'info');
    } catch (e) {
      toast((e as Error).message, 'error');
      setBusy(false);
    }
  };

  if (appUpdate.status === 'downloaded' && !later) {
    return (
      <div role="status" className="flex flex-wrap items-center gap-3 border-b border-primary/30 bg-primary-soft px-4 py-3 text-sm md:px-8">
        <RefreshCw className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
        <p className="flex-1 font-semibold text-ink">
          Nouvelle version {appUpdate.version ?? ''} prête — Redémarrer pour installer
          <span className="block text-xs font-normal">Sinon, elle s’installera à la prochaine fermeture de KAYZEN Flux.</span>
        </p>
        <button className="btn-ghost" onClick={() => setLater(true)} disabled={busy}>Plus tard</button>
        <button className="btn-primary" onClick={install} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Redémarrer
        </button>
      </div>
    );
  }

  if (settings.autoUpdate === null && canAutoUpdate(appUpdate.status)) {
    return (
      <div role="region" aria-labelledby="upd-consent" className="flex flex-wrap items-center gap-3 border-b border-hairline bg-card px-4 py-3 text-sm md:px-8">
        <ShieldCheck className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
        <div className="min-w-[240px] flex-1">
          <p id="upd-consent" className="font-semibold text-ink">Rechercher automatiquement les mises à jour de KAYZEN Flux ?</p>
          <p className="text-xs">
            Au démarrage puis toutes les 6 heures, l’application consulte le fichier de version publié par KAYZEN,
            télécharge la nouvelle version en arrière-plan et vous propose de redémarrer. Comme pour toute page web, le serveur voit
            votre adresse IP et la version de l’application ; aucun identifiant ni statistique n’est envoyé.
          </p>
        </div>
        <button className="btn-ghost" onClick={() => answer(false)} disabled={busy}>Non merci</button>
        <button className="btn-primary" onClick={() => answer(true)} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Oui, activer
        </button>
      </div>
    );
  }

  return null;
}

import { useCallback, useEffect, useState } from 'react';
import { BellRing, Loader2, Lock, Plus, RefreshCw, Rss, Trash2 } from 'lucide-react';
import { api } from '../api';
import { relative } from '../format';
import { useApp } from '../state';
import { EmptyState } from '../components/Shell';
import type { PresetId, Subscription } from '../types';

const INTERVALS = [1, 3, 6, 12, 24];

export function SubscriptionsPage() {
  const { status, settings, toast, go } = useApp();
  const premium = status?.tier === 'premium';
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [url, setUrl] = useState('');
  const [preset, setPreset] = useState<PresetId>(settings?.defaultPreset ?? 'mp3-320');
  const [intervalHours, setIntervalHours] = useState(6);
  const [latest, setLatest] = useState(1);
  const [adding, setAdding] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setSubs(await api.subscriptions());
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      const sub = await api.addSubscription({ url: url.trim(), preset, intervalHours, downloadLatest: latest });
      toast(`Abonné à « ${sub.title} »${sub.lastNew ? ` : ${sub.lastNew} élément(s) en téléchargement` : ''}.`, 'success');
      setUrl('');
      await load();
    } catch (err) {
      toast((err as Error).message, 'error');
    } finally {
      setAdding(false);
    }
  };

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast(ok, 'success');
      await load();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const checkNow = async (s: Subscription) => {
    setChecking(s.id);
    try {
      const { found } = await api.checkSubscription(s.id);
      toast(found ? `${found} nouveauté(s) ajoutée(s) à la file.` : 'Aucune nouveauté.', found ? 'success' : 'info');
      await load();
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setChecking(null);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="eyebrow flex items-center gap-1.5"><BellRing className="h-3.5 w-3.5" /> Premium · vérification automatique en arrière-plan</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Abonnements</h1>
        <p className="mt-1">Suivez une chaîne, une playlist ou un flux de podcast : les nouveautés sont téléchargées automatiquement, sur cet ordinateur.</p>
      </header>

      {!premium && (
        <div className="card flex flex-wrap items-center gap-4 border-gold/40 p-5">
          <Lock className="h-5 w-5 text-gold" />
          <p className="flex-1 text-sm">Les abonnements font partie de l'offre Premium.</p>
          <button className="btn-primary" onClick={() => go('settings')}>Activer une licence</button>
        </div>
      )}

      <form onSubmit={add} className={`card grid gap-4 p-5 md:grid-cols-[1fr_auto] ${premium ? '' : 'pointer-events-none opacity-60'}`} aria-label="Nouvel abonnement">
        <label className="md:col-span-2">
          <span className="font-display text-[15px] font-semibold text-ink">Adresse de la chaîne, de la playlist ou du flux RSS</span>
          <input className="input mt-2" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" required disabled={!premium} />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className="text-sm">
            <span className="block font-semibold text-ink">Format</span>
            <select className="input mt-1 py-2" value={preset} onChange={(e) => setPreset(e.target.value as PresetId)} disabled={!premium}>
              {status?.presets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-ink">Vérifier toutes les</span>
            <select className="input mt-1 py-2" value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))} disabled={!premium}>
              {INTERVALS.map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="block font-semibold text-ink">Télécharger tout de suite</span>
            <select className="input mt-1 py-2" value={latest} onChange={(e) => setLatest(Number(e.target.value))} disabled={!premium}>
              {[0, 1, 3, 5, 10].map((n) => <option key={n} value={n}>{n === 0 ? 'rien (nouveautés seulement)' : n === 1 ? 'le dernier' : `les ${n} derniers`}</option>)}
            </select>
          </label>
        </div>
        <button type="submit" className="btn-primary self-end" disabled={!premium || adding || !url.trim()}>
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} S'abonner
        </button>
      </form>

      {subs.length === 0 ? (
        <EmptyState icon={<Rss className="h-6 w-6" />} title="Aucun abonnement" text="Ajoutez l'adresse d'une chaîne ou d'un flux de podcast pour recevoir automatiquement les nouveautés." />
      ) : (
        <ul className="card divide-y divide-hairline overflow-hidden">
          {subs.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-4 p-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary dark:text-white"><Rss className="h-5 w-5" /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-display font-semibold text-ink">{s.title}</p>
                <p className="truncate text-xs">{s.url}</p>
                <p className="mt-0.5 text-xs">
                  {status?.presets.find((p) => p.id === s.preset)?.label} · toutes les {s.intervalHours} h · {s.lastCheck ? `vérifié ${relative(s.lastCheck)}` : 'jamais vérifié'}
                  {s.lastError && <span className="text-danger"> · {s.lastError}</span>}
                </p>
              </div>
              <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                <input type="checkbox" checked={s.enabled} onChange={(e) => act(() => api.updateSubscription(s.id, { enabled: e.target.checked }))} className="h-4 w-4 accent-[rgb(var(--primary))]" />
                Actif
              </label>
              <button className="btn-ghost px-3 py-2" onClick={() => checkNow(s)} disabled={checking === s.id || !premium}>
                {checking === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Vérifier
              </button>
              <button className="icon-btn hover:text-danger" aria-label={`Se désabonner de ${s.title}`} onClick={() => window.confirm(`Se désabonner de « ${s.title} » ?`) && act(() => api.removeSubscription(s.id), 'Abonnement supprimé.')}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

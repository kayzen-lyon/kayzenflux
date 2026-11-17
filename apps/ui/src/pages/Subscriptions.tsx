import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, RefreshCw, Rss, Trash2 } from 'lucide-react';
import { api } from '../api';
import { relative } from '../format';
import { useApp } from '../state';
import { EmptyState, PageHeader } from '../components/Shell';
import type { PresetId, Subscription } from '../types';

const INTERVALS = [1, 3, 6, 12, 24];

export function SubscriptionsPage() {
  const { status, settings, toast } = useApp();
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

  const latestLabel = (n: number) => (n === 0 ? 'Aucun (nouveautés seulement)' : n === 1 ? 'Le dernier' : `Les ${n} derniers`);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Abonnements"
        lead="Suivez une chaîne, une playlist ou un flux de podcast : les nouveautés sont téléchargées automatiquement sur cet ordinateur, tant que KAYZEN Flux est ouvert."
      />

      <form onSubmit={add} className="card p-5 md:p-6" aria-labelledby="sub-new">
        <h2 id="sub-new" className="text-lead font-semibold">Nouvel abonnement</h2>
        <label className="mt-4 block">
          <span className="label">Adresse de la chaîne, de la playlist ou du flux RSS</span>
          <input className="input mt-2" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" inputMode="url" required />
        </label>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Format</span>
            <select className="input mt-2" value={preset} onChange={(e) => setPreset(e.target.value as PresetId)}>
              {status?.presets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Vérifier toutes les</span>
            <select className="input mt-2" value={intervalHours} onChange={(e) => setIntervalHours(Number(e.target.value))}>
              {INTERVALS.map((h) => <option key={h} value={h}>{h} h</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">À télécharger tout de suite</span>
            <select className="input mt-2" value={latest} onChange={(e) => setLatest(Number(e.target.value))}>
              {[0, 1, 3, 5, 10].map((n) => <option key={n} value={n}>{latestLabel(n)}</option>)}
            </select>
          </label>
        </div>
        <div className="mt-5 flex justify-end border-t border-hairline pt-5">
          <button type="submit" className="btn-primary" disabled={adding || !url.trim()}>
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} S’abonner
          </button>
        </div>
      </form>

      <section aria-labelledby="sub-list" className="space-y-3">
        <h2 id="sub-list" className="flex items-baseline gap-2 text-lead font-semibold">Vos abonnements <span className="font-sans text-small font-medium tabular-nums text-body">{subs.length}</span></h2>
        {subs.length === 0 ? (
          <EmptyState icon={<Rss className="h-5 w-5" />} title="Aucun abonnement" text="Ajoutez l’adresse d’une chaîne ou d’un flux de podcast ci-dessus pour recevoir automatiquement les nouveautés." />
        ) : (
          <ul className="card divide-y divide-hairline overflow-hidden">
            {subs.map((s) => (
              <li key={s.id} className={`flex flex-wrap items-center gap-4 px-4 py-3.5 ${s.enabled ? '' : 'opacity-70'}`}>
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Rss className="h-[18px] w-[18px]" /></div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold text-ink">{s.title}</p>
                  <p className="truncate text-meta">{s.url}</p>
                  <p className="mt-1 flex flex-wrap gap-x-4 text-meta">
                    <span>{status?.presets.find((p) => p.id === s.preset)?.label}</span>
                    <span>toutes les {s.intervalHours} h</span>
                    <span>{s.lastCheck ? `vérifié ${relative(s.lastCheck)}` : 'jamais vérifié'}</span>
                    {s.lastError && <span className="text-danger">{s.lastError}</span>}
                  </p>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-small font-semibold text-ink">
                  <input type="checkbox" checked={s.enabled} onChange={(e) => act(() => api.updateSubscription(s.id, { enabled: e.target.checked }))} className="h-4 w-4 accent-[rgb(var(--primary))]" />
                  Actif
                </label>
                <button className="btn-ghost px-3 py-2" onClick={() => checkNow(s)} disabled={checking === s.id}>
                  {checking === s.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Vérifier
                </button>
                <button className="icon-btn hover:text-danger" aria-label={`Se désabonner de ${s.title}`} title="Se désabonner" onClick={() => window.confirm(`Se désabonner de « ${s.title} » ?`) && act(() => api.removeSubscription(s.id), 'Abonnement supprimé.')}>
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

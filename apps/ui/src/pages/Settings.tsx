import { useEffect, useState } from 'react';
import { CheckCircle2, Chrome, Cpu, FolderOpen, Laptop, Loader2, RefreshCw, Save, Smartphone, XCircle, Crown } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../state';
import { Toggle } from '../components/Shell';
import type { Settings } from '../types';

export function SettingsPage() {
  const { status, settings, setSettings, toast } = useApp();
  const [draft, setDraft] = useState<Settings | null>(settings);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState<string | null>(null);

  useEffect(() => setDraft(settings), [settings]);
  if (!draft) return <p>Chargement…</p>;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft({ ...draft, [k]: v });
  const maxPar = status?.limits.maxParallelJobs ?? 2;

  const save = async () => {
    setSaving(true);
    try {
      const saved = await api.saveSettings(draft);
      setSettings(saved);
      toast('Réglages enregistrés.', 'success');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const update = async () => {
    setUpdating(true);
    setUpdateLog(null);
    try {
      const r = await api.updateEngine();
      setUpdateLog(r.output || (r.ok ? 'Moteur à jour.' : 'Échec de la mise à jour.'));
      toast(r.ok ? 'Vérification du moteur terminée.' : 'La mise à jour automatique a échoué.', r.ok ? 'success' : 'error');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-10">
      <header>
        <p className="eyebrow">Configuration</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Moteur & Paramètres</h1>
        <p className="mt-1">Tout est appliqué et enregistré localement.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="card space-y-6 p-6" aria-labelledby="prefs">
          <h2 id="prefs" className="text-lg font-bold">Préférences de téléchargement</h2>
          <div>
            <label htmlFor="dir" className="font-display text-[15px] font-semibold text-ink">Dossier de destination</label>
            <div className="mt-2 flex gap-2">
              <input id="dir" className="input font-mono text-sm" value={draft.downloadDir} onChange={(e) => set('downloadDir', e.target.value)} />
              <button className="btn-ghost shrink-0" onClick={() => api.openFolder().catch((e: Error) => toast(e.message, 'error'))}><FolderOpen className="h-4 w-4" /> Ouvrir</button>
            </div>
          </div>

          <div>
            <p className="font-display text-[15px] font-semibold text-ink">Format par défaut</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {status?.presets.map((p) => (
                <label key={p.id} className={`flex cursor-pointer items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${draft.defaultPreset === p.id ? 'border-primary bg-primary-soft/50' : 'border-hairline'} ${!p.allowed ? 'cursor-not-allowed opacity-50' : ''}`}>
                  <span>
                    <span className="block font-semibold text-ink">{p.label}</span>
                    <span className="text-xs">{p.allowed ? p.hint : 'Offre Premium'}</span>
                  </span>
                  <input type="radio" name="preset" disabled={!p.allowed} checked={draft.defaultPreset === p.id} onChange={() => set('defaultPreset', p.id)} className="h-4 w-4 accent-[rgb(var(--primary))]" />
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle checked={draft.sponsorBlock} onChange={(v) => set('sponsorBlock', v)} label="SponsorBlock" hint="Retire les passages sponsorisés, autopromotions et rappels d'abonnement (base communautaire)." />
            <Toggle checked={draft.embedMetadata} onChange={(v) => set('embedMetadata', v)} label="Métadonnées & pochette" hint="Titre, artiste et vignette intégrés au fichier." />
            <Toggle checked={draft.subtitles} onChange={(v) => set('subtitles', v)} label="Sous-titres" hint="Récupère les pistes français et anglais existantes (.srt)." />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="par" className="font-display text-[15px] font-semibold text-ink">Téléchargements simultanés</label>
              <span className="chip bg-primary-soft text-primary dark:text-white">{draft.maxParallel} en parallèle</span>
            </div>
            <input id="par" type="range" min={1} max={maxPar} value={Math.min(draft.maxParallel, maxPar)} onChange={(e) => set('maxParallel', Number(e.target.value))} className="mt-3 w-full accent-[rgb(var(--primary))]" />
            <p className="mt-1 text-xs">Maximum {maxPar} avec votre offre.</p>
          </div>

          <div className="flex justify-end">
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer</button>
          </div>
        </section>

        <aside className="space-y-6">
          <section className="rounded-3xl bg-navy p-6 text-white shadow-lift" aria-labelledby="engine">
            <h2 id="engine" className="flex items-center gap-2 font-display text-lg font-bold text-white"><Cpu className="h-5 w-5 text-gold" /> Moteur local</h2>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label="yt-dlp" value={status?.engine} />
              <Row label="ffmpeg" value={status?.ffmpeg} />
              <div className="flex justify-between"><dt className="text-white/60">Application</dt><dd className="font-mono">{status?.app}</dd></div>
            </dl>
            <div className="mt-4 rounded-2xl bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-white/80">
              <p className="text-gold">$ yt-dlp --version</p>
              <p>{status?.engine ?? 'introuvable'}</p>
              {updateLog && <p className="mt-2 whitespace-pre-wrap break-words text-white/70">{updateLog}</p>}
            </div>
            <button className="btn-primary mt-4 w-full" onClick={update} disabled={updating}>
              {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Rechercher une mise à jour
            </button>
            <p className="mt-2 text-[11px] text-white/60">Si yt-dlp a été installé avec pip ou un gestionnaire de paquets, mettez-le à jour avec celui-ci.</p>
          </section>

          <section className="card p-6" aria-labelledby="plan">
            <h2 id="plan" className="flex items-center gap-2 text-lg font-bold"><Crown className="h-5 w-5 text-gold" /> Offre {status?.tier === 'premium' ? 'Premium' : 'Gratuite'}</h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li>Playlists : {status?.limits.maxPlaylistItems} éléments max</li>
              <li>Parallèle : {status?.limits.maxParallelJobs} téléchargements</li>
              <li>Formats Premium : 4K, FLAC</li>
            </ul>
            {status?.tier !== 'premium' && <p className="mt-3 rounded-2xl bg-surface p-3 text-xs">L'offre Premium (licence) arrive à la phase 3 de la roadmap.</p>}
          </section>
        </aside>
      </div>

      <section aria-labelledby="eco">
        <p className="eyebrow">Écosystème</p>
        <h2 id="eco" className="mt-1 text-2xl font-bold">Applications & extension</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Platform icon={<Laptop className="h-5 w-5" />} title="KAYZEN Flux Desktop" status="Disponible (version 1)" ok text="Ce que vous utilisez : moteur local + interface. Installateurs Windows, macOS et Linux signés à venir." />
          <Platform icon={<Smartphone className="h-5 w-5" />} title="KAYZEN Flux Android" status="Phase 5" text="APK distribué depuis le site. Pas de version iPhone avec téléchargement (règles de l'App Store)." />
          <Platform icon={<Chrome className="h-5 w-5" />} title="Extension navigateur" status="Phase 2" text="Lecture sans publicité, SponsorBlock, et bouton « Envoyer vers KAYZEN Flux ». L'extension ne télécharge rien elle-même." />
        </div>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/60">{label}</dt>
      <dd className="flex items-center gap-1.5 font-mono">
        {value ? <CheckCircle2 className="h-3.5 w-3.5 text-ok" /> : <XCircle className="h-3.5 w-3.5 text-danger" />}
        {value ?? 'absent'}
      </dd>
    </div>
  );
}

function Platform({ icon, title, status, text, ok = false }: { icon: React.ReactNode; title: string; status: string; text: string; ok?: boolean }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-primary-soft text-primary dark:text-white">{icon}</div>
        <span className={`chip ${ok ? 'text-ok' : ''}`}>{status}</span>
      </div>
      <h3 className="mt-4 font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed">{text}</p>
    </div>
  );
}


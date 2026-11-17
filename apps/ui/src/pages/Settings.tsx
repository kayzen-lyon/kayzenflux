import { useEffect, useState } from 'react';
import { Check, CheckCircle2, ExternalLink, FolderOpen, Loader2, RefreshCw, Save, XCircle } from 'lucide-react';
import { api } from '../api';
import { useApp } from '../state';
import { LogoMark, PageHeader, Toggle } from '../components/Shell';
import { canAutoUpdate } from '../components/UpdateBanner';
import { LocalTranscriptionSettings } from '../components/LocalAi';
import { PRESET_KIND } from '../components/presetKind';
import type { Settings } from '../types';

const REPO_URL = 'https://github.com/kayzen-lyon/kayzenflux';

/** Réglages enregistrés par le bouton « Enregistrer » (le choix de mise à jour automatique est enregistré à part). */
const prefsOf = (s: Settings | null) => {
  if (!s) return '';
  const { autoUpdate: _ignored, ...prefs } = s;
  return JSON.stringify(prefs);
};

export function SettingsPage() {
  const { status, settings, setSettings, toast, playing, playerExpanded } = useApp();
  const [draft, setDraft] = useState<Settings | null>(settings);
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [updateLog, setUpdateLog] = useState<string | null>(null);

  useEffect(() => setDraft(settings), [settings]);
  if (!draft) return <p className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Chargement des réglages…</p>;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft({ ...draft, [k]: v });
  const maxPar = status?.limits?.maxParallelJobs ?? 6;
  const dirty = prefsOf(draft) !== prefsOf(settings);
  const saveBarOffset = !playing ? 'bottom-4' : PRESET_KIND[playing.preset] === 'video' && playerExpanded ? 'bottom-[13.5rem]' : 'bottom-28';

  const save = async () => {
    setSaving(true);
    try {
      // Le choix de mise à jour automatique est enregistré à part, dès qu'il change.
      const { autoUpdate: _ignored, ...prefs } = draft;
      const saved = await api.saveSettings(prefs);
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
    <div className="space-y-0">
      <PageHeader title="Paramètres" lead="Tout est appliqué et enregistré sur cet ordinateur." />

      <nav aria-label="Sections des paramètres" className="flex flex-wrap gap-x-5 gap-y-1 py-4 text-small font-semibold">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} onClick={(e) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }} className="text-body underline-offset-4 hover:text-ink hover:underline">{label}</a>
        ))}
      </nav>

      <Section id="set-download" title="Téléchargement" text="Format, options et emplacement appliqués à chaque nouveau lien.">
        <div>
          <label htmlFor="dir" className="label">Dossier de destination</label>
          <div className="mt-2 flex gap-2">
            <input id="dir" className="input text-small" value={draft.downloadDir} onChange={(e) => set('downloadDir', e.target.value)} spellCheck={false} />
            <button className="btn-ghost shrink-0" onClick={() => api.openFolder().catch((e: Error) => toast(e.message, 'error'))}><FolderOpen className="h-4 w-4" /> Ouvrir</button>
          </div>
        </div>

        <fieldset>
          <legend className="label">Format par défaut</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup">
            {status?.presets.map((p) => {
              const on = draft.defaultPreset === p.id;
              return (
                <label key={p.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-2.5 transition duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-primary ${on ? 'border-primary bg-primary-soft/70 ring-1 ring-primary' : 'border-hairline hover:border-ink/30'}`}>
                  <input type="radio" name="preset" className="sr-only" checked={on} onChange={() => set('defaultPreset', p.id)} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-base font-semibold text-ink">{p.label}</span>
                    <span className="block text-meta leading-snug">{p.hint}</span>
                  </span>
                  <span className={`mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full ${on ? 'bg-primary text-on-primary' : 'border border-hairline'}`} aria-hidden="true">{on && <Check className="h-3 w-3" strokeWidth={3} />}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="divide-y divide-hairline border-y border-hairline">
          <Toggle checked={draft.sponsorBlock} onChange={(v) => set('sponsorBlock', v)} label="Couper les passages sponsorisés" hint="SponsorBlock retire les placements de produits, autopromotions et rappels d’abonnement (base communautaire)." />
          <Toggle checked={draft.embedMetadata} onChange={(v) => set('embedMetadata', v)} label="Métadonnées et pochette" hint="Titre, artiste et vignette intégrés au fichier." />
          <Toggle checked={draft.subtitles} onChange={(v) => set('subtitles', v)} label="Sous-titres" hint="Récupère les pistes française et anglaise existantes (.srt)." />
          <Toggle checked={draft.normalizeAudio} onChange={(v) => set('normalizeAudio', v)} label="Normaliser le volume" hint="Niveau sonore homogène entre les morceaux audio (EBU R128, environ −16 LUFS)." />
          <Toggle checked={draft.transcript} onChange={(v) => set('transcript', v)} label="Transcription automatique" hint="Crée un fichier texte horodaté à partir des sous-titres, ou de l’audio via la transcription locale si elle est installée." />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="tpl" className="label">Nom des fichiers</label>
            <select id="tpl" className="input mt-2" value={draft.filenameTemplate} onChange={(e) => set('filenameTemplate', e.target.value)}>
              {status?.templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="par" className="label">Téléchargements simultanés</label>
              <span className="font-display text-lead font-bold tabular-nums text-ink">{Math.min(draft.maxParallel, maxPar)}</span>
            </div>
            <input id="par" type="range" min={1} max={maxPar} value={Math.min(draft.maxParallel, maxPar)} onChange={(e) => set('maxParallel', Number(e.target.value))}
              className="seek mt-4 w-full" style={{ '--p': `${maxPar > 1 ? ((Math.min(draft.maxParallel, maxPar) - 1) / (maxPar - 1)) * 100 : 100}%` } as React.CSSProperties} />
            <p className="mt-2 flex justify-between text-meta tabular-nums"><span>1</span><span>{maxPar}</span></p>
          </div>
        </div>
      </Section>

      <Section id="set-transcription" title="Transcription locale" text="Transcrire l’audio avec whisper.cpp, sur cet ordinateur. Les composants se téléchargent à la demande.">
        <LocalTranscriptionSettings draft={draft} set={set} />
      </Section>

      <Section id="set-engine" title="Moteur" text="yt-dlp télécharge, ffmpeg convertit. Les deux tournent en local.">
        <dl className="grid gap-3 sm:grid-cols-3">
          <EngineFact label="yt-dlp" value={status?.engine} />
          <EngineFact label="ffmpeg" value={status?.ffmpeg} />
          <EngineFact label="Application" value={status?.app} />
        </dl>
        {updateLog && <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-navy p-4 font-mono text-meta text-rail-ink">{updateLog}</pre>}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-md text-small">Si yt-dlp a été installé avec pip ou un gestionnaire de paquets, mettez-le à jour avec celui-ci.</p>
          <button className="btn-ghost" onClick={update} disabled={updating}>
            {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Mettre à jour yt-dlp
          </button>
        </div>
      </Section>

      <Section id="set-updates" title="Mises à jour" text="Les nouvelles versions de KAYZEN Flux, jamais installées sans votre accord.">
        <AppUpdateCard />
      </Section>

      <Section id="set-extension" title="Extension et applications" text="Envoyer un lien depuis le navigateur vers l’application.">
        <ul className="divide-y divide-hairline border-y border-hairline">
          <Platform title="Application de bureau" status="Disponible" ok text="Windows, macOS et Linux. Moteur yt-dlp et ffmpeg intégrés." />
          <Platform title="Extension navigateur" status="Disponible" ok text="Chrome, Edge, Brave, Firefox : lecture sans publicité, SponsorBlock et bouton « Envoyer vers KAYZEN Flux ». L’extension ne télécharge rien elle-même." />
          <Platform title="Android" status="Prochainement" text="APK distribué depuis le site. Pas de version iPhone avec téléchargement (règles de l’App Store)." />
        </ul>
      </Section>

      <Section id="set-about" title="À propos" text="KAYZEN Flux est gratuit et open source.">
        <div className="mb-4 flex items-center gap-3">
          <LogoMark tone="auto" className="h-10" />
          <p className="font-display text-lead leading-none tracking-tight text-ink">
            <span className="font-extrabold">KAYZEN</span> <span className="font-normal">Flux</span>
          </p>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-small">
          <dt>Version</dt><dd className="font-semibold tabular-nums text-ink">{status?.app ?? '?'}</dd>
          <dt>Licence</dt><dd className="font-semibold text-ink">MIT</dd>
          <dt>Éditeur</dt><dd className="font-semibold text-ink">KAYZEN, Lyon</dd>
          <dt>Code source</dt>
          <dd>
            <a className="inline-flex items-center gap-1.5 font-semibold text-primary underline-offset-4 hover:underline" href={REPO_URL} target="_blank" rel="noreferrer">
              github.com/kayzen-lyon/kayzenflux <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </dd>
        </dl>
      </Section>

      {dirty && (
        <div className={`sticky z-20 mt-6 flex animate-[toast-in_180ms_ease-out] flex-wrap items-center justify-between gap-3 rounded-xl border border-hairline bg-card px-5 py-3 shadow-lift ${saveBarOffset}`} role="region" aria-label="Modifications non enregistrées">
          <p className="text-small font-semibold text-ink">Modifications non enregistrées</p>
          <div className="flex gap-2">
            <button className="btn-quiet" onClick={() => setDraft(settings)} disabled={saving}>Annuler</button>
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer</button>
          </div>
        </div>
      )}
    </div>
  );
}

const SECTIONS: Array<[string, string]> = [
  ['set-download', 'Téléchargement'],
  ['set-transcription', 'Transcription locale'],
  ['set-engine', 'Moteur'],
  ['set-updates', 'Mises à jour'],
  ['set-extension', 'Extension'],
  ['set-about', 'À propos'],
];

function Section({ id, title, text, children }: { id: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="grid scroll-mt-6 gap-x-10 gap-y-4 border-t border-hairline py-9 md:grid-cols-[14rem_minmax(0,1fr)]">
      <div>
        <h2 id={`${id}-h`} className="text-lead font-semibold">{title}</h2>
        <p className="mt-1 text-small">{text}</p>
      </div>
      <div className="min-w-0 space-y-6">{children}</div>
    </section>
  );
}

function EngineFact({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-xl border border-hairline bg-card px-4 py-3">
      <dt className="text-meta">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-1.5 truncate font-display text-base font-semibold tabular-nums text-ink">
        {value ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" aria-label="présent" /> : <XCircle className="h-4 w-4 shrink-0 text-danger" aria-label="absent" />}
        <span className="truncate" title={value ?? undefined}>{value ?? 'absent'}</span>
      </dd>
    </div>
  );
}

function Platform({ title, status, text, ok = false }: { title: string; status: string; text: string; ok?: boolean }) {
  return (
    <li className="flex items-start gap-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="font-display text-base font-semibold text-ink">{title}</p>
        <p className="mt-0.5 text-small">{text}</p>
      </div>
      <span className={`chip mt-0.5 ${ok ? 'bg-ok/10 text-ok' : ''}`}>{status}</span>
    </li>
  );
}

const UPDATE_LABELS: Record<string, string> = {
  idle: 'Aucune vérification pour l’instant.',
  checking: 'Recherche en cours…',
  'up-to-date': 'KAYZEN Flux est à jour.',
  downloading: 'Téléchargement de la nouvelle version…',
  downloaded: 'Nouvelle version prête à installer.',
  error: 'La recherche de mise à jour a échoué.',
};

function AppUpdateCard() {
  const { appUpdate, setAppUpdate, settings, setSettings, toast } = useApp();
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  if (!appUpdate || !settings) return <p className="text-small">Vérification de l’installation…</p>;
  if (appUpdate.status === 'unavailable') return <p className="text-small">{appUpdate.message ?? 'La mise à jour automatique n’est pas disponible pour cette installation.'}</p>;

  const setAuto = async (autoUpdate: boolean) => {
    try {
      setSettings(await api.saveSettings({ autoUpdate }));
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const checkNow = async () => {
    setChecking(true);
    try {
      setAppUpdate(await api.checkAppUpdate());
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setChecking(false);
    }
  };
  const install = async () => {
    setInstalling(true);
    try {
      await api.installAppUpdate();
    } catch (e) {
      toast((e as Error).message, 'error');
      setInstalling(false);
    }
  };

  const busy = checking || appUpdate.status === 'checking';
  const line = appUpdate.status === 'downloading' && appUpdate.percent !== null
    ? `Téléchargement de la version ${appUpdate.version ?? ''} : ${appUpdate.percent} %`
    : appUpdate.status === 'downloaded'
      ? `Version ${appUpdate.version ?? ''} prête à installer.`
      : appUpdate.message ?? UPDATE_LABELS[appUpdate.status] ?? '';

  return (
    <div className="space-y-3">
      <p className="text-small">Version installée : <span className="font-semibold tabular-nums text-ink">{appUpdate.currentVersion ?? '?'}</span></p>
      {canAutoUpdate(appUpdate.status) ? (
        <>
          <div className="border-y border-hairline">
            <Toggle
              checked={settings.autoUpdate === true}
              onChange={(v) => void setAuto(v)}
              label="Rechercher automatiquement"
              hint="Au démarrage puis toutes les 6 heures. Téléchargement en arrière-plan, installation quand vous le décidez. Aucun identifiant envoyé."
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-small" aria-live="polite">
              <p className="font-semibold text-ink">{line}</p>
              {appUpdate.lastCheck && <p className="text-meta">Dernière vérification : {new Date(appUpdate.lastCheck).toLocaleString('fr-FR')}</p>}
            </div>
            {appUpdate.status === 'downloaded' ? (
              <button className="btn-primary" onClick={install} disabled={installing}>
                {installing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Redémarrer pour installer
              </button>
            ) : (
              <button className="btn-ghost" onClick={checkNow} disabled={busy || appUpdate.status === 'downloading'}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Rechercher maintenant
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="text-small">{appUpdate.message}</p>
          {appUpdate.downloadPage && (
            <a className="btn-ghost" href={appUpdate.downloadPage} target="_blank" rel="noreferrer">
              <ExternalLink className="h-4 w-4" /> Page de téléchargement
            </a>
          )}
        </>
      )}
    </div>
  );
}


import { useEffect, useState } from 'react';
import { BadgeCheck, Check as CheckIcon, Download, Film, FolderOpen, Link2, ListVideo, Loader2, Music } from 'lucide-react';
import { api, ApiError } from '../api';
import { duration, isActive } from '../format';
import { useApp } from '../state';
import type { MediaInfo, PresetId, PresetView } from '../types';
import { JobCard } from '../components/JobCard';

export function HomePage() {
  const { status, settings, jobs, toast, go, urlInputRef, pendingUrl, consumePendingUrl } = useApp();
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetId>('mp3-320');
  const [sponsorBlock, setSponsorBlock] = useState(true);
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [subtitles, setSubtitles] = useState(false);
  const [playlist, setPlaylist] = useState(false);
  const [splitChapters, setSplitChapters] = useState(false);
  const [normalizeAudio, setNormalizeAudio] = useState(false);
  const [transcript, setTranscript] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setPreset(settings.defaultPreset);
    setSponsorBlock(settings.sponsorBlock);
    setEmbedMetadata(settings.embedMetadata);
    setSubtitles(settings.subtitles);
    setNormalizeAudio(settings.normalizeAudio);
    setTranscript(settings.transcript);
  }, [settings]);

  // Lien envoyé par l'extension navigateur : analyse immédiate.
  useEffect(() => {
    if (!pendingUrl) return;
    const u = consumePendingUrl();
    if (u) {
      setUrl(u);
      void analyse(u, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingUrl]);

  const analyse = async (target = url, asPlaylist = playlist) => {
    const clean = target.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      const res = await api.info(clean, asPlaylist || /[?&]list=/.test(clean));
      setInfo(res);
      setPlaylist(res.isPlaylist);
      if (!res.hasVideo && status?.presets.find((p) => p.id === preset)?.kind === 'video') setPreset('mp3-320');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Analyse impossible.');
    } finally {
      setLoading(false);
    }
  };

  const download = async () => {
    setSubmitting(true);
    try {
      const isAudio = status?.presets.find((p) => p.id === preset)?.kind === 'audio';
      await api.createJob({
        url: url.trim(),
        preset,
        sponsorBlock,
        embedMetadata,
        subtitles,
        playlist,
        info,
        splitChapters,
        normalizeAudio: normalizeAudio && isAudio,
        transcript,
      });
      toast('Ajouté à la file de téléchargement.', 'success');
      setInfo(null);
      setUrl('');
    } catch (e) {
      toast((e as Error).message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const onPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (/^https?:\/\//i.test(text.trim()) && !url) {
      e.preventDefault();
      setUrl(text.trim());
      void analyse(text.trim(), false);
    }
  };

  // Coller un lien n'importe où sur la page lance l'analyse.
  useEffect(() => {
    const onGlobalPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA'].includes(t.tagName) || t.isContentEditable) return;
      const text = e.clipboardData?.getData('text').trim() ?? '';
      if (/^https?:\/\//i.test(text)) {
        setUrl(text);
        void analyse(text, false);
      }
    };
    window.addEventListener('paste', onGlobalPaste);
    return () => window.removeEventListener('paste', onGlobalPaste);
  });

  const recent = jobs.filter((j) => isActive(j.phase)).slice(0, 3);
  const presets = (status?.presets ?? []).filter((p) => p.kind === 'audio' || info?.hasVideo);
  const selected = status?.presets.find((p) => p.id === preset);
  const audioSelected = selected?.kind === 'audio';
  const maxPlaylist = status?.limits?.maxPlaylistItems;

  return (
    <div className="space-y-12">
      <section aria-labelledby="convert-title">
        <h1 id="convert-title" className="max-w-3xl font-display text-hero font-bold text-ink">Collez un lien, récupérez le fichier.</h1>
        <p className="page-lead">Vidéo, musique ou playlist : KAYZEN Flux télécharge et convertit directement sur cet ordinateur, au format de votre choix.</p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-hairline bg-card">
          <div className="bg-navy px-5 pb-5 pt-6 md:px-7">
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(e) => {
                e.preventDefault();
                void analyse();
              }}
            >
              <label className="relative flex-1">
                <span className="sr-only">Adresse de la vidéo ou du son</span>
                <Link2 className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-rail-muted" aria-hidden="true" />
                <input
                  ref={urlInputRef}
                  className="h-16 w-full rounded-xl border border-white/15 bg-white/[0.06] pl-14 pr-5 font-display text-lead text-rail-ink placeholder:text-rail-muted focus:border-primary focus:bg-white/[0.09] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="https://… (vidéo, musique, playlist)"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onPaste={onPaste}
                  inputMode="url"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>
              <button type="submit" className="btn-primary h-16 px-8 text-base focus-visible:outline-rail-ink" disabled={!url.trim() || loading}>
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null} {loading ? 'Analyse…' : 'Analyser'}
              </button>
            </form>
            <p className="mt-3 text-meta text-rail-muted">
              Collez un lien n’importe où dans l’application pour l’analyser, ou appuyez sur{' '}
              <kbd className="rounded border border-white/20 px-1 font-display font-semibold text-rail-ink">Ctrl</kbd> + <kbd className="rounded border border-white/20 px-1 font-display font-semibold text-rail-ink">K</kbd> pour revenir à ce champ.
            </p>
          </div>

          {error && <p className="flex items-start gap-2 border-t border-danger/30 bg-danger/[0.07] px-5 py-4 text-small font-medium text-danger md:px-7" role="alert">{error}</p>}

          {loading && !info && <PreviewSkeleton />}

          {info && (
            <div className="grid gap-8 p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:p-7">
              <div className="min-w-0">
                <div className="relative aspect-video overflow-hidden rounded-xl bg-surface">
                  {info.thumbnail ? <img src={info.thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-body/60"><Film className="h-8 w-8" /></div>}
                  {info.durationSec ? <span className="absolute bottom-2 right-2 rounded-md bg-black/80 px-1.5 py-0.5 font-display text-meta font-semibold tabular-nums text-white">{duration(info.durationSec)}</span> : null}
                </div>
                <h2 className="mt-4 text-lead font-semibold leading-snug">{info.title}</h2>
                {info.author && <p className="mt-0.5 text-small">{info.author}</p>}
                <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 border-t border-hairline pt-4 text-small">
                  <dt>Source</dt><dd className="font-semibold text-ink">{info.site}</dd>
                  {info.maxHeight ? (<><dt>Vidéo</dt><dd className="font-semibold text-ink">jusqu’à {info.maxHeight}p</dd></>) : null}
                  {info.bestAudioKbps ? (<><dt>Audio source</dt><dd className="font-semibold text-ink">≈ {info.bestAudioKbps} kbps</dd></>) : null}
                  {info.isPlaylist && (<><dt>Playlist</dt><dd className="inline-flex items-center gap-1 font-semibold text-ink"><ListVideo className="h-3.5 w-3.5" /> {info.entryCount} éléments</dd></>)}
                </dl>
                {info.isCreativeCommons && <p className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ok/10 px-2 py-1 text-meta font-semibold text-ok"><BadgeCheck className="h-3.5 w-3.5" /> Licence Creative Commons</p>}
              </div>

              <div className="min-w-0">
                <FormatGroup title="Audio" icon={<Music className="h-4 w-4" />} presets={presets.filter((p) => p.kind === 'audio')} value={preset} onChange={setPreset} />
                {info.hasVideo && <FormatGroup title="Vidéo" icon={<Film className="h-4 w-4" />} presets={presets.filter((p) => p.kind === 'video')} value={preset} onChange={setPreset} />}

                <fieldset className="mt-6">
                  <legend className="label">Options</legend>
                  <div className="mt-2 grid gap-x-4 sm:grid-cols-2">
                    <Check label="Couper les passages sponsorisés" checked={sponsorBlock} onChange={setSponsorBlock} />
                    <Check label="Ajouter titre, artiste et pochette" checked={embedMetadata} onChange={setEmbedMetadata} />
                    <Check label="Sous-titres (fr, en)" checked={subtitles} onChange={setSubtitles} />
                    <Check label="Un fichier par chapitre" checked={splitChapters} onChange={setSplitChapters} />
                    <Check label="Normaliser le volume" hint={audioSelected ? undefined : 'formats audio'} checked={normalizeAudio} onChange={setNormalizeAudio} disabled={!audioSelected} />
                    <Check label="Transcription texte (Markdown)" checked={transcript} onChange={setTranscript} />
                    {info.isPlaylist && (
                      <Check label={maxPlaylist ? `Toute la playlist (max ${maxPlaylist})` : 'Toute la playlist'} checked={playlist} onChange={setPlaylist} />
                    )}
                  </div>
                </fieldset>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5 md:col-span-2">
                <p className="flex min-w-0 items-center gap-2 text-small">
                  <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="shrink-0">Enregistré dans</span>
                  <span className="truncate font-semibold text-ink" title={settings?.downloadDir}>{settings?.downloadDir}</span>
                </p>
                <button className="btn-primary h-12 px-7 text-base" onClick={download} disabled={submitting}>
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />} Télécharger{selected ? ` en ${selected.label.replace(/\s*\(.*\)$/, '')}` : ''}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {recent.length > 0 && (
        <section className="space-y-3" aria-labelledby="active-title">
          <div className="flex items-baseline justify-between">
            <h2 id="active-title" className="text-lead font-semibold">En cours</h2>
            <button className="text-small font-semibold text-primary underline-offset-4 hover:underline" onClick={() => go('downloads')}>Voir tous les téléchargements</button>
          </div>
          {recent.map((j) => <JobCard key={j.id} job={j} compact />)}
        </section>
      )}

      <section className="grid gap-x-10 gap-y-6 border-t border-hairline pt-8 md:grid-cols-3" aria-label="Engagements">
        <Value title="Sans publicité" text="Ni bannières, ni fenêtres surgissantes, ni redirections. L’outil ne vit pas de votre attention." />
        <Value title="Sur votre ordinateur" text="Le téléchargement et la conversion se font ici, avec le moteur yt-dlp. Rien ne passe par nos serveurs." />
        <Value title="Gratuit et open source" text="Aucun compte, aucun cookie de suivi. Le code est publié sous licence MIT." />
      </section>

      <p className="max-w-3xl text-meta leading-relaxed">
        Usage personnel uniquement, pour des contenus que vous avez le droit de copier (vos propres vidéos, licences libres, copie privée).
        Les contenus protégés par DRM ne sont jamais pris en charge.
      </p>
    </div>
  );
}

function FormatGroup({ title, icon, presets, value, onChange }: { title: string; icon: React.ReactNode; presets: PresetView[]; value: PresetId; onChange: (id: PresetId) => void }) {
  if (!presets.length) return null;
  return (
    <fieldset className="mb-5">
      <legend className="label flex items-center gap-2">{icon} {title}</legend>
      <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Formats ${title.toLowerCase()}`}>
        {presets.map((p) => {
          const on = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(p.id)}
              className={`relative rounded-xl border px-3.5 py-2.5 text-left transition duration-150 ${
                on ? 'border-primary bg-primary-soft/70 ring-1 ring-primary' : 'border-hairline bg-card hover:border-ink/30'
              }`}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="font-display text-base font-semibold text-ink">{p.label}</span>
                <span className={`grid h-4 w-4 shrink-0 place-items-center rounded-full ${on ? 'bg-primary text-on-primary' : 'border border-hairline'}`} aria-hidden="true">
                  {on && <CheckIcon className="h-3 w-3" strokeWidth={3} />}
                </span>
              </span>
              <span className="mt-0.5 block text-meta leading-snug">{p.hint}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function PreviewSkeleton() {
  return (
    <div className="grid gap-8 p-5 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:p-7" aria-hidden="true">
      <div className="space-y-3">
        <div className="aspect-video animate-pulse rounded-xl bg-surface" />
        <div className="h-5 w-4/5 animate-pulse rounded bg-surface" />
        <div className="h-4 w-2/5 animate-pulse rounded bg-surface" />
      </div>
      <div className="grid content-start gap-2 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-surface" />)}
      </div>
    </div>
  );
}

function Check({ label, hint, checked, onChange, disabled = false }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2.5 py-1.5 text-small font-medium text-ink ${disabled ? 'cursor-not-allowed opacity-55' : 'cursor-pointer'}`}>
      <input type="checkbox" disabled={disabled} checked={checked && !disabled} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 shrink-0 rounded accent-[rgb(var(--primary))]" />
      <span>{label}{hint && <span className="font-normal text-body"> ({hint})</span>}</span>
    </label>
  );
}

function Value({ title, text }: { title: string; text: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 text-small leading-relaxed">{text}</p>
    </div>
  );
}

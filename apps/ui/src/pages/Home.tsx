import { useEffect, useState } from 'react';
import { Ban, Cpu, Film, Link2, ListVideo, Loader2, Lock, Music, ShieldCheck, Sparkles, Zap, ArrowRight, BadgeCheck } from 'lucide-react';
import { api, ApiError } from '../api';
import { duration, isActive } from '../format';
import { useApp } from '../state';
import type { MediaInfo, PresetId } from '../types';
import { JobCard } from '../components/JobCard';

export function HomePage() {
  const { status, settings, jobs, toast, go, urlInputRef } = useApp();
  const [url, setUrl] = useState('');
  const [info, setInfo] = useState<MediaInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState<PresetId>('mp3-320');
  const [sponsorBlock, setSponsorBlock] = useState(true);
  const [embedMetadata, setEmbedMetadata] = useState(true);
  const [subtitles, setSubtitles] = useState(false);
  const [playlist, setPlaylist] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!settings) return;
    setPreset(settings.defaultPreset);
    setSponsorBlock(settings.sponsorBlock);
    setEmbedMetadata(settings.embedMetadata);
    setSubtitles(settings.subtitles);
  }, [settings]);

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
      await api.createJob({ url: url.trim(), preset, sponsorBlock, embedMetadata, subtitles, playlist, info });
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
  const presets = status?.presets ?? [];

  return (
    <div className="space-y-10">
      <section className="text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-hairline bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-ink">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" /> Moteur yt-dlp local · Rien ne passe par nos serveurs
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-extrabold leading-[1.06] tracking-tight md:text-6xl">
          Téléchargez et convertissez, <span className="font-display italic text-primary">sans pub ni pistage</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base md:text-lg">
          Collez un lien vers une vidéo ou un son. KAYZEN Flux le récupère directement sur votre ordinateur, au format de votre choix.
        </p>
      </section>

      <section className="card p-5 md:p-7" aria-labelledby="convert-title">
        <h2 id="convert-title" className="sr-only">Convertisseur</h2>
        <form
          className="flex flex-col gap-3 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            void analyse();
          }}
        >
          <label className="relative flex-1">
            <span className="sr-only">Adresse de la vidéo ou du son</span>
            <Link2 className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
            <input
              ref={urlInputRef}
              className="input py-4 pl-12"
              placeholder="Collez un lien (vidéo, musique, playlist…)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={onPaste}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
            />
          </label>
          <button type="submit" className="btn-primary px-7 py-4 text-base" disabled={!url.trim() || loading}>
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Zap className="h-5 w-5" />} Analyser
          </button>
        </form>
        <p className="mt-2 px-2 text-xs">Astuce : collez un lien n'importe où sur la page (ou <kbd className="rounded bg-surface px-1 font-semibold">Ctrl</kbd>+<kbd className="rounded bg-surface px-1 font-semibold">K</kbd> pour viser ce champ).</p>

        {error && <p className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger" role="alert">{error}</p>}

        {info && (
          <div className="mt-6 grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-surface">
              {info.thumbnail ? <img src={info.thumbnail} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center"><Film className="h-8 w-8" /></div>}
              {info.durationSec ? <span className="absolute bottom-2 right-2 rounded-md bg-black/75 px-1.5 py-0.5 text-[11px] font-bold text-white">{duration(info.durationSec)}</span> : null}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap gap-2">
                <span className="chip">{info.site}</span>
                {info.isPlaylist && <span className="chip"><ListVideo className="h-3 w-3" /> {info.entryCount} éléments</span>}
                {info.maxHeight && <span className="chip">Jusqu'à {info.maxHeight}p</span>}
                {info.bestAudioKbps && <span className="chip">Audio source ≈ {info.bestAudioKbps} kbps</span>}
                {info.isCreativeCommons && <span className="chip text-ok"><BadgeCheck className="h-3 w-3" /> Creative Commons</span>}
              </div>
              <h3 className="mt-2 text-xl font-bold leading-snug">{info.title}</h3>
              {info.author && <p className="text-sm">{info.author}</p>}

              <p className="eyebrow mt-5">Format d'export</p>
              <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Format d'export">
                {presets
                  .filter((p) => p.kind === 'audio' || info.hasVideo)
                  .map((p) => (
                    <button
                      key={p.id}
                      role="radio"
                      aria-checked={preset === p.id}
                      disabled={!p.allowed}
                      title={p.allowed ? p.hint : 'Réservé à l’offre Premium'}
                      onClick={() => setPreset(p.id)}
                      className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
                        preset === p.id ? 'border-primary bg-primary text-white shadow-md shadow-primary/25' : 'border-hairline bg-card text-ink hover:border-primary/40'
                      } disabled:cursor-not-allowed disabled:opacity-55`}
                    >
                      {p.kind === 'audio' ? <Music className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
                      {p.label}
                      {!p.allowed && <Lock className="h-3 w-3" />}
                    </button>
                  ))}
              </div>
              <p className="mt-2 text-xs">{presets.find((p) => p.id === preset)?.hint}</p>

              <div className="mt-5 grid gap-2 rounded-2xl bg-surface p-3 sm:grid-cols-2">
                <Check label="Couper les segments sponsorisés (SponsorBlock)" checked={sponsorBlock} onChange={setSponsorBlock} />
                <Check label="Ajouter titre, artiste et pochette" checked={embedMetadata} onChange={setEmbedMetadata} />
                <Check label="Récupérer les sous-titres (fr, en)" checked={subtitles} onChange={setSubtitles} />
                {info.isPlaylist && (
                  <Check
                    label={`Toute la playlist (max ${status?.limits.maxPlaylistItems ?? 25})`}
                    checked={playlist}
                    onChange={setPlaylist}
                  />
                )}
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button className="btn-primary px-7 py-3 text-base" onClick={download} disabled={submitting}>
                  {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />} Télécharger
                </button>
                <span className="text-xs">Enregistré dans votre dossier : {settings?.downloadDir}</span>
              </div>
            </div>
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="space-y-3" aria-labelledby="active-title">
          <div className="flex items-center justify-between">
            <h2 id="active-title" className="text-xl font-bold">En cours</h2>
            <button className="text-sm font-semibold text-primary" onClick={() => go('downloads')}>Tout voir</button>
          </div>
          {recent.map((j) => <JobCard key={j.id} job={j} compact />)}
        </section>
      )}

      <section className="grid gap-4 md:grid-cols-3">
        <Value icon={<Ban className="h-5 w-5" />} title="100 % sans publicité" text="Ni bannières, ni pop-ups, ni redirections douteuses. L'outil ne gagne pas d'argent sur votre attention." link="Zéro distraction" />
        <Value icon={<Cpu className="h-5 w-5" />} title="Moteur yt-dlp local" text="Le téléchargement et la conversion se font sur votre ordinateur. Le moteur se met à jour en un clic." link="Voir le moteur" onClick={() => go('settings')} />
        <Value icon={<ShieldCheck className="h-5 w-5" />} title="Vie privée" text="Aucun compte, aucun cookie de suivi. Votre historique reste dans un fichier sur cet ordinateur." link="Ma bibliothèque" onClick={() => go('library')} />
      </section>

      <p className="text-center text-xs leading-relaxed">
        Usage personnel uniquement, pour des contenus que vous avez le droit de copier (vos propres vidéos, licences libres, copie privée).
        Les contenus protégés par DRM ne sont jamais pris en charge.
      </p>
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-medium text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded accent-[rgb(var(--primary))]" />
      {label}
    </label>
  );
}

function Value({ icon, title, text, link, onClick }: { icon: React.ReactNode; title: string; text: string; link: string; onClick?: () => void }) {
  return (
    <div className="card p-6">
      <div className="grid h-11 w-11 place-items-center rounded-full bg-primary-soft text-primary dark:text-white">{icon}</div>
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed">{text}</p>
      {onClick ? (
        <button onClick={onClick} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">{link} <ArrowRight className="h-4 w-4" /></button>
      ) : (
        <p className="mt-4 text-sm font-bold text-primary">{link}</p>
      )}
    </div>
  );
}

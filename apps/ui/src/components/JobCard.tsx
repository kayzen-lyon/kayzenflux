import { AlertTriangle, CheckCircle2, Clock, Loader2, Play, RotateCcw, Trash2, X, FolderOpen, Film, Music, FileText, Sparkles } from 'lucide-react';
import { api } from '../api';
import { bytes, duration, isActive, speed } from '../format';
import { useApp } from '../state';
import type { Job } from '../types';
import { PRESET_KIND } from './presetKind';

/** Carte d'une tâche (téléchargement, transcription ou résumé) avec sa progression en direct. */
export function JobCard({ job, compact = false }: { job: Job; compact?: boolean }) {
  const { toast, library, play } = useApp();
  const active = isActive(job.phase);
  const pct = job.phase === 'done' ? 100 : (job.percent ?? 0);
  const item = library.find((i) => job.libraryIds.includes(i.id));
  const kindLabel = job.kind === 'summary' ? 'Résumé' : job.kind === 'transcription' ? 'Transcription' : job.presetLabel;
  const KindIcon = job.kind === 'summary' ? Sparkles : job.kind === 'transcription' ? FileText : PRESET_KIND[job.preset] === 'video' ? Film : Music;

  const act = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const retry = () =>
    act(() =>
      api.createJob({
        url: job.url,
        preset: job.preset,
        sponsorBlock: true,
        embedMetadata: true,
        subtitles: false,
        playlist: job.playlist,
        info: null,
      }),
    );

  return (
    <article className={`card flex gap-4 p-3 pr-4 ${job.phase === 'error' ? 'border-danger/40' : ''}`}>
      <div className={`relative aspect-video shrink-0 overflow-hidden rounded-lg bg-surface ${compact ? 'w-24' : 'w-32'}`}>
        {job.thumbnail ? <img src={job.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" /> : (
          <div className="grid h-full place-items-center text-body/70"><KindIcon className="h-5 w-5" /></div>
        )}
        {job.phase === 'done' && <span className="absolute inset-0 bg-black/10" aria-hidden="true" />}
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold" title={job.title}>{job.title}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-meta">
              <span className="inline-flex items-center gap-1 font-semibold text-ink"><KindIcon className="h-3.5 w-3.5" aria-hidden="true" /> {kindLabel}</span>
              {!compact && (job.author || job.site) && <span className="truncate">{job.author ?? job.site}</span>}
              {job.playlist && <span>Playlist {job.playlistIndex ?? 0}/{job.entryCount}</span>}
              {job.subscriptionId && <span>Abonnement</span>}
              {job.options?.map((o) => <span key={o} className="chip">{o}</span>)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {active && (
              <button className="icon-btn hover:text-danger" aria-label="Annuler" title="Annuler" onClick={() => act(() => api.cancelJob(job.id))}><X className="h-4 w-4" /></button>
            )}
            {job.phase === 'done' && item && (
              <>
                <button className="icon-btn" aria-label="Ouvrir le dossier" title="Ouvrir le dossier" onClick={() => act(() => api.reveal(item.id))}><FolderOpen className="h-4 w-4" /></button>
                <button className="play-btn" aria-label="Lire" title="Lire" onClick={() => play(item)}><Play className="h-4 w-4 translate-x-px fill-current" /></button>
              </>
            )}
            {(job.phase === 'error' || job.phase === 'cancelled') && job.kind === 'download' && (
              <button className="icon-btn" aria-label="Réessayer" title="Réessayer" onClick={retry}><RotateCcw className="h-4 w-4" /></button>
            )}
            {!active && (
              <button className="icon-btn hover:text-danger" aria-label="Retirer de la liste" title="Retirer de la liste" onClick={() => act(() => api.removeJob(job.id))}><Trash2 className="h-4 w-4" /></button>
            )}
          </div>
        </div>

        {active && (
          <div className="mt-3">
            <div className="flex items-baseline justify-between gap-3 text-meta">
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                {job.phase === 'queued' ? <Clock className="h-3.5 w-3.5" aria-hidden="true" /> : <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" aria-hidden="true" />}
                {job.label}
              </span>
              <span className="flex items-baseline gap-4 tabular-nums">
                {job.total ? <span>{bytes(job.downloaded)} sur {bytes(job.total)}</span> : null}
                {job.speed ? <span>{speed(job.speed)}</span> : null}
                {job.eta ? <span>encore {duration(job.eta)}</span> : null}
                {job.percent !== null && <span className="font-display text-small font-bold text-ink">{job.percent.toFixed(0)} %</span>}
              </span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuenow={job.percent === null ? undefined : Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progression : ${job.title}`}>
              {job.percent === null ? (
                job.phase === 'queued' ? null : <div className="indet h-full w-2/5 rounded-full bg-primary" />
              ) : (
                <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
              )}
            </div>
          </div>
        )}
        {!active && <StatusLine job={job} />}
      </div>
    </article>
  );
}

function StatusLine({ job }: { job: Job }) {
  switch (job.phase) {
    case 'done':
      return <p className="mt-1.5 inline-flex items-center gap-1.5 text-meta font-semibold text-ok"><CheckCircle2 className="h-3.5 w-3.5" /> Terminé</p>;
    case 'error':
      return (
        <p className="mt-1.5 flex items-start gap-1.5 text-small text-danger" role="alert">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span><span className="font-semibold">Échec.</span> {job.error ?? ''}</span>
        </p>
      );
    case 'cancelled':
      return <p className="mt-1.5 text-meta font-semibold">Annulé</p>;
    default:
      return null;
  }
}

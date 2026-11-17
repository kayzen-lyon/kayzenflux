import { AlertTriangle, CheckCircle2, Loader2, Pause, Play, RotateCcw, Trash2, X, FolderOpen } from 'lucide-react';
import { api } from '../api';
import { bytes, duration, isActive, speed } from '../format';
import { useApp } from '../state';
import type { Job } from '../types';

export function JobCard({ job, compact = false }: { job: Job; compact?: boolean }) {
  const { toast, library, play } = useApp();
  const active = isActive(job.phase);
  const pct = job.phase === 'done' ? 100 : (job.percent ?? 0);
  const item = library.find((i) => job.libraryIds.includes(i.id));

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
    <article className={`card flex flex-col gap-4 p-4 sm:flex-row sm:items-center ${job.phase === 'error' ? 'border-danger/30' : ''}`}>
      <div className="relative h-20 w-full shrink-0 overflow-hidden rounded-2xl bg-surface sm:w-32">
        {job.thumbnail ? <img src={job.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" /> : (
          <div className="grid h-full place-items-center text-xs font-semibold">{job.site || 'Média'}</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-primary-soft text-primary dark:text-white">{job.kind === 'summary' ? 'Résumé' : job.kind === 'transcription' ? 'Transcription' : job.presetLabel}</span>
          {job.playlist && <span className="chip">Playlist · {job.playlistIndex ?? 0}/{job.entryCount}</span>}
          {job.subscriptionId && <span className="chip">Abonnement</span>}
          {job.options?.map((o) => <span key={o} className="chip">{o}</span>)}
          <StatusChip job={job} />
        </div>
        <h3 className="mt-1.5 truncate text-[15px] font-bold" title={job.title}>{job.title}</h3>
        {!compact && <p className="truncate text-xs">{job.author ?? job.url}</p>}
        {active && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] font-semibold">
              <span className="text-primary">{job.label}{job.percent !== null ? ` · ${job.percent.toFixed(0)} %` : ''}</span>
              <span className="tabular-nums">{speed(job.speed)}{job.eta ? ` · reste ${duration(job.eta)}` : ''}</span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={`Progression : ${job.title}`}>
              <div className={`h-full rounded-full bg-gradient-to-r from-primary to-gold transition-all duration-300 ${job.percent === null ? 'w-1/3 animate-pulse' : ''}`} style={job.percent === null ? undefined : { width: `${pct}%` }} />
            </div>
            {job.total ? <p className="mt-1 text-[11px] tabular-nums">{bytes(job.downloaded)} / {bytes(job.total)}</p> : null}
          </div>
        )}
        {job.phase === 'error' && job.error && <p className="mt-2 text-sm text-danger">{job.error}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
        {active && (
          <button className="icon-btn hover:text-danger" aria-label="Annuler" onClick={() => act(() => api.cancelJob(job.id))}><X className="h-4 w-4" /></button>
        )}
        {job.phase === 'done' && item && (
          <>
            <button className="icon-btn" aria-label="Ouvrir le dossier" onClick={() => act(() => api.reveal(item.id))}><FolderOpen className="h-4 w-4" /></button>
            <button className="grid h-10 w-10 place-items-center rounded-full bg-primary text-white" aria-label="Lire" onClick={() => play(item)}><Play className="h-4 w-4 translate-x-px" /></button>
          </>
        )}
        {(job.phase === 'error' || job.phase === 'cancelled') && job.kind === 'download' && (
          <button className="icon-btn" aria-label="Réessayer" onClick={retry}><RotateCcw className="h-4 w-4" /></button>
        )}
        {!active && (
          <button className="icon-btn hover:text-danger" aria-label="Retirer de la liste" onClick={() => act(() => api.removeJob(job.id))}><Trash2 className="h-4 w-4" /></button>
        )}
      </div>
    </article>
  );
}

function StatusChip({ job }: { job: Job }) {
  switch (job.phase) {
    case 'done':
      return <span className="chip text-ok"><CheckCircle2 className="h-3 w-3" /> Terminé</span>;
    case 'error':
      return <span className="chip text-danger"><AlertTriangle className="h-3 w-3" /> Échec</span>;
    case 'cancelled':
      return <span className="chip"><Pause className="h-3 w-3" /> Annulé</span>;
    case 'queued':
      return <span className="chip">En attente</span>;
    default:
      return <span className="chip text-primary"><Loader2 className="h-3 w-3 animate-spin" /> En cours</span>;
  }
}

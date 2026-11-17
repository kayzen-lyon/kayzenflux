import { FolderDown, FolderOpen, Trash2 } from 'lucide-react';
import { api } from '../api';
import { isActive } from '../format';
import { useApp } from '../state';
import { JobCard } from '../components/JobCard';
import { EmptyState, PageHeader } from '../components/Shell';

export function DownloadsPage() {
  const { jobs, go, toast, status, settings } = useApp();
  const active = jobs.filter((j) => isActive(j.phase));
  const finished = jobs.filter((j) => !isActive(j.phase));
  const parallel = Math.min(settings?.maxParallel ?? 2, status?.limits?.maxParallelJobs ?? Number.POSITIVE_INFINITY);

  const clearFinished = async () => {
    for (const j of finished) await api.removeJob(j.id).catch(() => undefined);
    toast('Liste nettoyée (les fichiers sont conservés).');
  };

  return (
    <div className="space-y-10">
      <PageHeader
        title="Téléchargements"
        lead="Suivi en direct de chaque tâche : téléchargement, conversion, métadonnées."
        meta={<span>{parallel} téléchargement{parallel > 1 ? 's' : ''} à la fois, réglable dans Paramètres.</span>}
        actions={
          <>
            <button className="btn-ghost" onClick={() => api.openFolder().catch((e: Error) => toast(e.message, 'error'))}><FolderOpen className="h-4 w-4" /> Ouvrir le dossier</button>
            {finished.length > 0 && <button className="btn-quiet" onClick={clearFinished}><Trash2 className="h-4 w-4" /> Nettoyer la liste</button>}
          </>
        }
      />

      {jobs.length === 0 ? (
        <EmptyState icon={<FolderDown className="h-5 w-5" />} title="Aucun téléchargement" text="Collez un lien dans le convertisseur : la progression s’affichera ici." action={<button className="btn-primary" onClick={() => go('home')}>Ouvrir le convertisseur</button>} />
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3" aria-labelledby="dl-active">
              <h2 id="dl-active" className="flex items-baseline gap-2 text-lead font-semibold">En cours <span className="font-sans text-small font-medium tabular-nums text-body">{active.length}</span></h2>
              {active.map((j) => <JobCard key={j.id} job={j} />)}
            </section>
          )}
          {finished.length > 0 && (
            <section className="space-y-3" aria-labelledby="dl-done">
              <h2 id="dl-done" className="flex items-baseline gap-2 text-lead font-semibold">Terminés et échecs <span className="font-sans text-small font-medium tabular-nums text-body">{finished.length}</span></h2>
              {finished.map((j) => <JobCard key={j.id} job={j} compact />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

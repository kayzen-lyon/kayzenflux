import { FolderDown, FolderOpen, Trash2 } from 'lucide-react';
import { api } from '../api';
import { isActive } from '../format';
import { useApp } from '../state';
import { JobCard } from '../components/JobCard';
import { EmptyState } from '../components/Shell';

export function DownloadsPage() {
  const { jobs, go, toast, status, settings } = useApp();
  const active = jobs.filter((j) => isActive(j.phase));
  const finished = jobs.filter((j) => !isActive(j.phase));

  const clearFinished = async () => {
    for (const j of finished) await api.removeJob(j.id).catch(() => undefined);
    toast('Liste nettoyée (les fichiers sont conservés).');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">File locale · {Math.min(settings?.maxParallel ?? 2, status?.limits.maxParallelJobs ?? 2)} en parallèle</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Téléchargements</h1>
          <p className="mt-1">Suivi en direct de chaque tâche : téléchargement, conversion, métadonnées.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => api.openFolder().catch((e: Error) => toast(e.message, 'error'))}><FolderOpen className="h-4 w-4" /> Ouvrir le dossier</button>
          {finished.length > 0 && <button className="btn-ghost" onClick={clearFinished}><Trash2 className="h-4 w-4" /> Nettoyer la liste</button>}
        </div>
      </header>

      {jobs.length === 0 ? (
        <EmptyState icon={<FolderDown className="h-6 w-6" />} title="Aucun téléchargement" text="Collez un lien sur la page d'accueil pour commencer." action={<button className="btn-primary" onClick={() => go('home')}>Aller au convertisseur</button>} />
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3" aria-labelledby="dl-active">
              <h2 id="dl-active" className="text-lg font-bold">En cours <span className="chip ml-1 align-middle">{active.length}</span></h2>
              {active.map((j) => <JobCard key={j.id} job={j} />)}
            </section>
          )}
          {finished.length > 0 && (
            <section className="space-y-3" aria-labelledby="dl-done">
              <h2 id="dl-done" className="text-lg font-bold">Terminés et échecs</h2>
              {finished.map((j) => <JobCard key={j.id} job={j} />)}
            </section>
          )}
        </>
      )}
    </div>
  );
}

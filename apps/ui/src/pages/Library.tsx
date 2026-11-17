import { useMemo, useState } from 'react';
import { Download, FolderOpen, HardDrive, Heart, Library, Music, Play, Search, ShieldCheck, Trash2, Film, FileJson, FileText, Copy, X, Sparkles } from 'lucide-react';
import { api } from '../api';
import { bytes, duration, relative } from '../format';
import { useApp } from '../state';
import { EmptyState } from '../components/Shell';
import { PRESET_KIND } from '../components/presetKind';
import { MarkdownView, SummaryPanel, TranscribeButton } from '../components/LocalAi';
import type { LibraryItem } from '../types';

type Filter = 'all' | 'audio' | 'video' | 'fav';

export function LibraryPage() {
  const { library, play, playing, toast, refreshLibrary, go, status } = useApp();
  const premium = status?.tier === 'premium';
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [transcript, setTranscript] = useState<{ id: string; kind: 'transcript' | 'summary'; title: string; markdown: string } | null>(null);

  const openTranscript = async (item: LibraryItem, kind: 'transcript' | 'summary' = 'transcript') => {
    try {
      const t = kind === 'summary' ? await api.summary(item.id) : await api.transcript(item.id);
      setTranscript({ id: item.id, kind, title: item.title, markdown: t.markdown });
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };
  const openItem = transcript ? library.find((i) => i.id === transcript.id) : undefined;

  const total = library.reduce((s, i) => s + (i.sizeBytes || 0), 0);
  const favs = library.filter((i) => i.favorite).length;

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return library.filter((i) => {
      if (filter === 'fav' && !i.favorite) return false;
      if ((filter === 'audio' || filter === 'video') && PRESET_KIND[i.preset] !== filter) return false;
      return !needle || `${i.title} ${i.author ?? ''} ${i.site}`.toLowerCase().includes(needle);
    });
  }, [library, q, filter]);

  const act = async (fn: () => Promise<unknown>, ok?: string) => {
    try {
      await fn();
      if (ok) toast(ok, 'success');
      await refreshLibrary();
    } catch (e) {
      toast((e as Error).message, 'error');
    }
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(library, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `kayzen-flux-bibliotheque-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const remove = (item: LibraryItem) => {
    const deleteFile = window.confirm(`Supprimer aussi le fichier « ${item.fileName} » du disque ?\n\nOK = supprimer le fichier · Annuler = retirer seulement de la bibliothèque`);
    if (playing?.id === item.id) play(null);
    void act(() => api.removeItem(item.id, deleteFile), deleteFile ? 'Fichier supprimé.' : 'Retiré de la bibliothèque.');
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Stocké sur cet ordinateur uniquement</p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight md:text-4xl">Bibliothèque & Lecteur</h1>
          <p className="mt-1">Vos fichiers téléchargés, lisibles hors connexion.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={exportJson} disabled={!library.length}><FileJson className="h-4 w-4" /> Exporter (JSON)</button>
          <button
            className="btn border border-danger/30 bg-danger/10 text-danger hover:bg-danger/15"
            disabled={!library.length}
            onClick={() => window.confirm('Vider la bibliothèque ? Les fichiers restent sur le disque.') && act(() => api.clearLibrary(), 'Bibliothèque vidée.')}
          >
            <Trash2 className="h-4 w-4" /> Vider l'historique
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4" aria-label="Statistiques">
        <Stat icon={<Library className="h-5 w-5" />} value={String(library.length)} label="Fichiers enregistrés" />
        <Stat icon={<HardDrive className="h-5 w-5" />} value={bytes(total)} label="Sur le disque" />
        <Stat icon={<Heart className="h-5 w-5" />} value={String(favs)} label="Favoris" />
        <Stat icon={<ShieldCheck className="h-5 w-5" />} value="0" label="Donnée envoyée en ligne" />
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-full border border-hairline bg-card p-1" role="tablist" aria-label="Filtrer">
          {([['all', 'Tout'], ['audio', 'Audio'], ['video', 'Vidéo'], ['fav', 'Favoris']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${filter === id ? 'bg-primary text-white' : 'text-ink hover:bg-surface'}`}>{label}</button>
          ))}
        </div>
        <label className="relative ml-auto w-full sm:w-72">
          <span className="sr-only">Rechercher</span>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2" />
          <input className="input py-2 pl-10" placeholder="Rechercher un titre, un auteur…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>

      {library.length === 0 ? (
        <EmptyState icon={<Download className="h-6 w-6" />} title="Votre bibliothèque est vide" text="Les fichiers que vous téléchargez apparaîtront ici, prêts à être lus hors connexion." action={<button className="btn-primary" onClick={() => go('home')}>Télécharger un premier fichier</button>} />
      ) : list.length === 0 ? (
        <p className="py-10 text-center">Aucun résultat pour ce filtre.</p>
      ) : (
        <ul className="card divide-y divide-hairline overflow-hidden">
          {list.map((item) => {
            const kind = PRESET_KIND[item.preset];
            const current = playing?.id === item.id;
            return (
              <li key={item.id} className={`flex items-center gap-3 p-3 sm:gap-4 sm:p-4 transition ${current ? 'bg-primary-soft/60' : 'hover:bg-surface/60'}`}>
                <button onClick={() => play(item)} className="group relative h-12 w-16 shrink-0 sm:h-14 sm:w-24 overflow-hidden rounded-xl bg-surface" aria-label={`Lire ${item.title}`}>
                  {item.thumbnail ? <img src={item.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" /> : (
                    <span className="grid h-full place-items-center">{kind === 'audio' ? <Music className="h-5 w-5" /> : <Film className="h-5 w-5" />}</span>
                  )}
                  <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition group-hover:opacity-100"><Play className="h-5 w-5 text-white" /></span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display font-semibold text-ink" title={item.title}>{item.title}</p>
                  <p className="truncate text-xs">
                    {[item.author, item.site, item.preset.toUpperCase(), bytes(item.sizeBytes), duration(item.durationSec), relative(item.createdAt)].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button className={`icon-btn hidden sm:inline-flex ${item.favorite ? 'text-primary' : ''}`} aria-pressed={item.favorite} aria-label={item.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => act(() => api.favorite(item.id, !item.favorite))}>
                    <Heart className={`h-4 w-4 ${item.favorite ? 'fill-current' : ''}`} />
                  </button>
                  {item.transcriptPath ? (
                    <button className="icon-btn" aria-label="Lire la transcription" onClick={() => openTranscript(item)}><FileText className="h-4 w-4" /></button>
                  ) : premium ? (
                    <TranscribeButton itemId={item.id} onNeedSetup={() => go('settings')} />
                  ) : null}
                  {item.summaryPath && (
                    <button className="icon-btn" aria-label="Lire le résumé" onClick={() => openTranscript(item, 'summary')}><Sparkles className="h-4 w-4" /></button>
                  )}
                  <button className="icon-btn hidden sm:inline-flex" aria-label="Ouvrir le dossier" onClick={() => act(() => api.reveal(item.id))}><FolderOpen className="h-4 w-4" /></button>
                  <button className="icon-btn hover:text-danger" aria-label="Supprimer" onClick={() => remove(item)}><Trash2 className="h-4 w-4" /></button>
                  <button className="ml-1 grid h-10 w-10 place-items-center rounded-full bg-primary text-white" aria-label={`Lire ${item.title}`} onClick={() => play(item)}><Play className="h-4 w-4 translate-x-px" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {transcript && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="tr-title" onClick={() => setTranscript(null)}>
          <div className="card flex max-h-[85vh] w-full max-w-2xl flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-hairline p-4">
              {transcript.kind === 'summary' ? <Sparkles className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
              <h2 id="tr-title" className="flex-1 truncate text-lg font-bold">{transcript.kind === 'summary' ? 'Résumé' : 'Transcription'} : {transcript.title}</h2>
              <button className="btn-ghost px-3 py-1.5" onClick={() => navigator.clipboard?.writeText(transcript.markdown).then(() => toast('Texte copié.', 'success'))}><Copy className="h-4 w-4" /> Copier</button>
              <button className="icon-btn" aria-label="Fermer" onClick={() => setTranscript(null)}><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <MarkdownView markdown={transcript.markdown} />
            </div>
            {transcript.kind === 'transcript' && (
              <div className="space-y-2 border-t border-hairline p-4">
                {openItem?.summaryPath && (
                  <button className="btn-ghost px-3 py-1.5 text-sm" onClick={() => openItem && openTranscript(openItem, 'summary')}><Sparkles className="h-4 w-4" /> Voir le résumé existant</button>
                )}
                <SummaryPanel itemId={transcript.id} premium={premium} onStarted={() => setTranscript(null)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary dark:text-white">{icon}</div>
      <div>
        <p className="font-display text-2xl font-extrabold text-ink">{value}</p>
        <p className="text-xs">{label}</p>
      </div>
    </div>
  );
}

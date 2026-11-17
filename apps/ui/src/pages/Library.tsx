import { useMemo, useState } from 'react';
import { Download, FolderOpen, Heart, Music, Play, Search, Trash2, Film, FileJson, FileText, Copy, X, Sparkles } from 'lucide-react';
import { api } from '../api';
import { bytes, duration, relative } from '../format';
import { useApp } from '../state';
import { EmptyState, PageHeader } from '../components/Shell';
import { PRESET_KIND } from '../components/presetKind';
import { MarkdownView, SummaryPanel, TranscribeButton } from '../components/LocalAi';
import type { LibraryItem } from '../types';

type Filter = 'all' | 'audio' | 'video' | 'fav';

export function LibraryPage() {
  const { library, play, playing, toast, refreshLibrary, go, status } = useApp();
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

  const presetLabel = (id: string) => status?.presets.find((p) => p.id === id)?.label.replace(/\s*\((.*)\)$/, ' $1') ?? id.toUpperCase();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Bibliothèque"
        lead="Vos fichiers téléchargés, lisibles hors connexion. Rien n’est envoyé en ligne."
        meta={library.length ? (
          <>
            <span><strong className="font-semibold text-ink">{library.length}</strong> fichier{library.length > 1 ? 's' : ''}</span>
            <span><strong className="font-semibold text-ink">{bytes(total)}</strong> sur le disque</span>
            <span><strong className="font-semibold text-ink">{favs}</strong> favori{favs > 1 ? 's' : ''}</span>
          </>
        ) : undefined}
        actions={
          <>
            <button className="btn-ghost" onClick={exportJson} disabled={!library.length}><FileJson className="h-4 w-4" /> Exporter (JSON)</button>
            <button
              className="btn-quiet text-danger hover:bg-danger/10"
              disabled={!library.length}
              onClick={() => window.confirm('Vider la bibliothèque ? Les fichiers restent sur le disque.') && act(() => api.clearLibrary(), 'Bibliothèque vidée.')}
            >
              <Trash2 className="h-4 w-4" /> Vider l’historique
            </button>
          </>
        }
      />

      {library.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded-xl bg-surface p-1" role="tablist" aria-label="Filtrer la bibliothèque">
            {([['all', 'Tout'], ['audio', 'Audio'], ['video', 'Vidéo'], ['fav', 'Favoris']] as const).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}
                className={`rounded-lg px-4 py-1.5 font-display text-small font-semibold transition duration-150 ${filter === id ? 'bg-card text-ink shadow-soft' : 'text-body hover:text-ink'}`}>{label}</button>
            ))}
          </div>
          <label className="relative ml-auto w-full sm:w-72">
            <span className="sr-only">Rechercher dans la bibliothèque</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2" aria-hidden="true" />
            <input className="input pl-10" type="search" placeholder="Titre, auteur, site…" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
      )}

      {library.length === 0 ? (
        <EmptyState icon={<Download className="h-5 w-5" />} title="Votre bibliothèque est vide" text="Les fichiers téléchargés apparaîtront ici, prêts à être lus hors connexion." action={<button className="btn-primary" onClick={() => go('home')}>Télécharger un premier fichier</button>} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Search className="h-5 w-5" />} title="Aucun résultat" text="Aucun fichier ne correspond à ce filtre ou à cette recherche." action={<button className="btn-ghost" onClick={() => { setQ(''); setFilter('all'); }}>Tout afficher</button>} />
      ) : (
        <ul className="card divide-y divide-hairline overflow-hidden" aria-label="Fichiers">
          {list.map((item) => {
            const kind = PRESET_KIND[item.preset];
            const current = playing?.id === item.id;
            return (
              <li key={item.id} className={`group/row relative flex items-center gap-4 px-3 py-3 transition-colors duration-150 sm:px-4 ${current ? 'bg-primary-soft/50' : 'hover:bg-surface/70'}`}>
                {current && <span className="absolute inset-y-0 left-0 w-[3px] bg-primary" aria-hidden="true" />}
                <button onClick={() => play(item)} className="group relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-surface sm:w-28" aria-label={`Lire ${item.title}`} data-shot="play">
                  {item.thumbnail ? <img src={item.thumbnail} alt="" className="h-full w-full object-cover" loading="lazy" /> : (
                    <span className="grid h-full place-items-center text-body/70">{kind === 'audio' ? <Music className="h-5 w-5" /> : <Film className="h-5 w-5" />}</span>
                  )}
                  {item.durationSec ? <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 font-display text-[0.6875rem] font-semibold tabular-nums leading-4 text-white">{duration(item.durationSec)}</span> : null}
                  <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"><Play className="h-5 w-5 fill-white text-white" /></span>
                </button>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-semibold text-ink" title={item.title}>{item.title}</p>
                  <p className="mt-0.5 flex min-w-0 items-center gap-x-3 text-meta">
                    {current && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-semibold text-primary"><span className="eq flex h-3 items-end gap-[2px]" aria-hidden="true"><span className="h-3" /><span className="h-3" /><span className="h-3" /></span> En lecture</span>
                    )}
                    <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap font-semibold text-ink">{kind === 'audio' ? <Music className="h-3.5 w-3.5" aria-hidden="true" /> : <Film className="h-3.5 w-3.5" aria-hidden="true" />}{presetLabel(item.preset)}</span>
                    <span className="shrink-0 whitespace-nowrap tabular-nums">{bytes(item.sizeBytes)}</span>
                    <span className="truncate">{[item.author, item.site].filter(Boolean).join(' – ')}</span>
                  </p>
                </div>
                <p className="hidden w-32 shrink-0 truncate text-right text-meta xl:block" title={new Date(item.createdAt).toLocaleString('fr-FR')}>{relative(item.createdAt)}</p>
                <div className="flex shrink-0 items-center gap-0.5">
                  <div className={`flex items-center gap-0.5 transition-opacity duration-150 focus-within:opacity-100 group-hover/row:opacity-100 ${current ? 'opacity-100' : 'opacity-0'}`}>
                  {item.transcriptPath ? (
                    <button className="icon-btn" aria-label="Lire la transcription" title="Lire la transcription" onClick={() => openTranscript(item)}><FileText className="h-4 w-4" /></button>
                  ) : (
                    <TranscribeButton itemId={item.id} onNeedSetup={() => go('settings')} />
                  )}
                  {item.summaryPath && (
                    <button className="icon-btn" aria-label="Lire le résumé" title="Lire le résumé" onClick={() => openTranscript(item, 'summary')}><Sparkles className="h-4 w-4" /></button>
                  )}
                  <button className="icon-btn hidden sm:inline-flex" aria-label="Ouvrir le dossier" title="Ouvrir le dossier" onClick={() => act(() => api.reveal(item.id))}><FolderOpen className="h-4 w-4" /></button>
                  <button className="icon-btn hover:text-danger" aria-label="Supprimer" title="Supprimer" onClick={() => remove(item)}><Trash2 className="h-4 w-4" /></button>
                  </div>
                  <button className={`icon-btn hidden sm:inline-flex ${item.favorite ? 'text-primary hover:text-primary' : ''}`} aria-pressed={item.favorite} aria-label={item.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} title={item.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'} onClick={() => act(() => api.favorite(item.id, !item.favorite))}>
                    <Heart className={`h-4 w-4 ${item.favorite ? 'fill-current' : ''}`} />
                  </button>
                  <button className="play-btn ml-2" aria-label={`Lire ${item.title}`} title="Lire" onClick={() => play(item)}><Play className="h-4 w-4 translate-x-px fill-current" /></button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {transcript && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-navy/60 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="tr-title" onClick={() => setTranscript(null)}>
          <div className="card flex max-h-[85vh] w-full max-w-2xl flex-col shadow-lift" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-hairline p-4">
              {transcript.kind === 'summary' ? <Sparkles className="h-5 w-5 text-primary" /> : <FileText className="h-5 w-5 text-primary" />}
              <h2 id="tr-title" className="flex-1 truncate text-lead font-semibold">{transcript.kind === 'summary' ? 'Résumé' : 'Transcription'} : {transcript.title}</h2>
              <button className="btn-ghost px-3 py-1.5" onClick={() => navigator.clipboard?.writeText(transcript.markdown).then(() => toast('Texte copié.', 'success'))}><Copy className="h-4 w-4" /> Copier</button>
              <button className="icon-btn" aria-label="Fermer" onClick={() => setTranscript(null)}><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-5">
              <MarkdownView markdown={transcript.markdown} />
            </div>
            {transcript.kind === 'transcript' && (
              <div className="space-y-2 border-t border-hairline p-4">
                {openItem?.summaryPath && (
                  <button className="btn-ghost px-3 py-1.5" onClick={() => openItem && openTranscript(openItem, 'summary')}><Sparkles className="h-4 w-4" /> Voir le résumé existant</button>
                )}
                <SummaryPanel itemId={transcript.id} onStarted={() => setTranscript(null)} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

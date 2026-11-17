import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Pause, Play, Rewind, FastForward, Volume2, VolumeX, X, Maximize2, ChevronDown, ChevronUp, Music } from 'lucide-react';
import { mediaUrl } from '../api';
import { useApp } from '../state';
import { duration } from '../format';
import { PRESET_KIND } from './presetKind';

const dockBtn =
  'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-rail-muted transition duration-150 hover:bg-white/[0.07] hover:text-rail-ink focus-visible:outline-rail-ink';

/**
 * Lecteur local, ancré en bas de la zone de contenu (il ne recouvre jamais la barre latérale
 * et la page réserve sa hauteur). Il lit uniquement les fichiers déjà téléchargés (aucun flux distant).
 * La vidéo reste montée quand on réduit le lecteur : elle passe en vignette sans interrompre la lecture.
 */
export function PlayerBar() {
  const { playing, play, library, playerExpanded, setPlayerExpanded } = useApp();
  const ref = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(true);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el || !playing) return;
    el.playbackRate = rate;
    void el.play().catch(() => setPaused(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing?.id]);

  // Raccourcis lecteur : Espace, J/L (±10 s), M (muet)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = ref.current;
      const target = e.target as HTMLElement;
      if (!el || !playing || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || e.ctrlKey || e.metaKey) return;
      if (e.code === 'Space' || e.key === 'k') {
        e.preventDefault();
        if (el.paused) void el.play();
        else el.pause();
      } else if (e.key === 'j') el.currentTime = Math.max(0, el.currentTime - 10);
      else if (e.key === 'l') el.currentTime = Math.min(el.duration || 0, el.currentTime + 10);
      else if (e.key === 'm') el.muted = !el.muted;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [playing]);

  if (!playing) return null;
  const isVideo = PRESET_KIND[playing.preset] === 'video';
  const expanded = isVideo && playerExpanded;
  const idx = library.findIndex((i) => i.id === playing.id);
  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play();
    else el.pause();
  };
  const handlers = {
    onPlay: () => setPaused(false),
    onPause: () => setPaused(true),
    onTimeUpdate: (e: React.SyntheticEvent<HTMLMediaElement>) => setTime(e.currentTarget.currentTime),
    onLoadedMetadata: (e: React.SyntheticEvent<HTMLMediaElement>) => setDur(e.currentTarget.duration),
    onVolumeChange: (e: React.SyntheticEvent<HTMLMediaElement>) => setMuted(e.currentTarget.muted),
    onEnded: () => {
      const next = library[idx + 1];
      if (next) play(next);
    },
  };
  const pct = dur ? Math.min(100, (time / dur) * 100) : 0;

  return (
    <section
      aria-label="Lecteur"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-rail text-rail-ink shadow-dock lg:left-64"
    >
      <div className={`mx-auto flex max-w-[68rem] gap-5 px-5 md:px-10 ${expanded ? 'items-stretch py-5' : 'items-center py-3'}`}>
        <div
          className={`relative shrink-0 overflow-hidden rounded-lg bg-black transition-[width] duration-200 ease-out ${
            expanded ? 'w-[min(18rem,32vw)]' : isVideo ? 'w-[5.5rem]' : 'w-12'
          } ${isVideo ? 'aspect-video' : 'aspect-square'}`}
        >
          {isVideo ? (
            <video
              ref={ref}
              src={mediaUrl(playing.id)}
              className="h-full w-full cursor-pointer object-contain"
              playsInline
              onClick={toggle}
              onDoubleClick={() => void ref.current?.requestFullscreen?.()}
              {...handlers}
            />
          ) : (
            <>
              {playing.thumbnail ? <img src={playing.thumbnail} alt="" className="h-full w-full object-cover" /> : <span className="grid h-full place-items-center text-rail-muted"><Music className="h-5 w-5" /></span>}
              <audio ref={ref as unknown as React.RefObject<HTMLAudioElement>} src={mediaUrl(playing.id)} {...handlers} />
            </>
          )}
        </div>

        <div className={`flex min-w-0 flex-1 flex-col ${expanded ? 'justify-between py-1' : 'gap-1.5'}`}>
          <div className="flex min-w-0 items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className={`truncate font-display font-semibold ${expanded ? 'text-lead' : 'text-small'}`} title={playing.title}>{playing.title}</p>
              <p className="truncate text-meta text-rail-muted">{[playing.author, playing.site].filter(Boolean).join(' – ')}</p>
              {expanded && <p className="mt-1 text-meta text-rail-muted">Lecture du fichier local. Double-cliquez sur l’image pour le plein écran.</p>}
            </div>
            <div className="flex shrink-0 items-center">
              {isVideo && (
                <button className={dockBtn} aria-pressed={expanded} aria-label={expanded ? 'Réduire le lecteur' : 'Agrandir le lecteur'} title={expanded ? 'Réduire' : 'Agrandir'} onClick={() => setPlayerExpanded(!playerExpanded)}>
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              )}
              <button className={dockBtn} aria-label="Fermer le lecteur" title="Fermer" onClick={() => play(null)}><X className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1">
              <button className={dockBtn} aria-label="Reculer de 10 secondes" title="Reculer de 10 s (J)" onClick={() => ref.current && (ref.current.currentTime -= 10)}><Rewind className="h-4 w-4" /></button>
              <button className="grid h-10 w-10 place-items-center rounded-full bg-primary text-on-primary transition duration-150 hover:scale-105 active:scale-95 focus-visible:outline-rail-ink" aria-label={paused ? 'Lecture' : 'Pause'} onClick={toggle}>
                {paused ? <Play className="h-[18px] w-[18px] translate-x-px fill-current" /> : <Pause className="h-[18px] w-[18px] fill-current" />}
              </button>
              <button className={dockBtn} aria-label="Avancer de 10 secondes" title="Avancer de 10 s (L)" onClick={() => ref.current && (ref.current.currentTime += 10)}><FastForward className="h-4 w-4" /></button>
            </div>
            <div className="flex min-w-[12rem] flex-1 items-center gap-3 text-meta tabular-nums text-rail-muted">
              <span className="w-10 text-right">{duration(time)}</span>
              <input
                type="range"
                min={0}
                max={dur || 0}
                step={0.1}
                value={time}
                aria-label="Position de lecture"
                aria-valuetext={`${duration(time)} sur ${duration(dur)}`}
                onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value); }}
                className="seek flex-1"
                style={{ '--p': `${pct}%`, '--track': 'rgb(255 255 255 / 0.16)' } as CSSProperties}
              />
              <span className="w-10">{duration(dur)}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <button className={`${dockBtn} w-auto px-2 font-display text-meta font-bold tabular-nums`} aria-label={`Vitesse de lecture : ${rate}×`} title="Vitesse de lecture"
                onClick={() => { const r = rate >= 2 ? 0.75 : rate + 0.25; setRate(r); if (ref.current) ref.current.playbackRate = r; }}>{rate.toLocaleString('fr-FR')}×</button>
              <button className={dockBtn} aria-label={muted ? 'Réactiver le son' : 'Couper le son'} title={muted ? 'Réactiver le son (M)' : 'Couper le son (M)'} onClick={() => ref.current && (ref.current.muted = !ref.current.muted)}>
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              {isVideo && (
                <button className={dockBtn} aria-label="Plein écran" title="Plein écran" onClick={() => void ref.current?.requestFullscreen?.()}>
                  <Maximize2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

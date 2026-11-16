import { useEffect, useRef, useState } from 'react';
import { Pause, Play, Rewind, FastForward, Volume2, VolumeX, X, Maximize2 } from 'lucide-react';
import { mediaUrl } from '../api';
import { useApp } from '../state';
import { duration } from '../format';
import { PRESET_KIND } from './presetKind';

/** Lecteur local : lit uniquement les fichiers déjà téléchargés (aucun flux distant). */
export function PlayerBar() {
  const { playing, play, library } = useApp();
  const ref = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(true);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [videoHidden, setVideoHidden] = useState(false);

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
  const idx = library.findIndex((i) => i.id === playing.id);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-3 lg:pl-[19rem]">
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl bg-navy text-white shadow-lift">
        {isVideo && (
          <div className={`fixed bottom-28 right-4 z-30 w-[min(440px,calc(100vw-2rem))] overflow-hidden rounded-2xl bg-black shadow-lift ring-1 ring-white/10 ${videoHidden ? 'pointer-events-none h-0 opacity-0' : ''}`}>
            <video ref={ref} src={mediaUrl(playing.id)} className="aspect-video w-full" playsInline
              onPlay={() => setPaused(false)} onPause={() => setPaused(true)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
              onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
              onEnded={() => { const next = library[idx + 1]; if (next) play(next); }} />
          </div>
        )}
        {!isVideo && (
          <audio ref={ref as unknown as React.RefObject<HTMLAudioElement>} src={mediaUrl(playing.id)}
            onPlay={() => setPaused(false)} onPause={() => setPaused(true)}
            onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)} onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
            onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
            onEnded={() => { const next = library[idx + 1]; if (next) play(next); }} />
        )}
        <div className="flex flex-wrap items-center gap-4 px-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-white/10">
              {playing.thumbnail && <img src={playing.thumbnail} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold">{playing.title}</p>
              <p className="truncate text-xs text-white/60">{playing.author ?? playing.site} · lecture locale</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button className="icon-btn text-white/80 hover:bg-white/10 hover:text-white" aria-label="Reculer de 10 secondes" onClick={() => ref.current && (ref.current.currentTime -= 10)}><Rewind className="h-4 w-4" /></button>
            <button className="grid h-11 w-11 place-items-center rounded-full bg-primary text-white" aria-label={paused ? 'Lecture' : 'Pause'}
              onClick={() => { const el = ref.current; if (!el) return; if (el.paused) void el.play(); else el.pause(); }}>
              {paused ? <Play className="h-5 w-5 translate-x-px" /> : <Pause className="h-5 w-5" />}
            </button>
            <button className="icon-btn text-white/80 hover:bg-white/10 hover:text-white" aria-label="Avancer de 10 secondes" onClick={() => ref.current && (ref.current.currentTime += 10)}><FastForward className="h-4 w-4" /></button>
          </div>
          <div className="flex min-w-[220px] flex-[1.4] items-center gap-3 text-xs tabular-nums text-white/70">
            <span>{duration(time)}</span>
            <input type="range" min={0} max={dur || 0} step={0.1} value={time} aria-label="Position de lecture"
              onChange={(e) => { if (ref.current) ref.current.currentTime = Number(e.target.value); }}
              className="h-1 flex-1 cursor-pointer accent-[rgb(var(--primary))]" />
            <span>{duration(dur)}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="rounded-full px-2 py-1 text-xs font-bold text-white/80 hover:bg-white/10" aria-label="Vitesse de lecture"
              onClick={() => { const r = rate >= 2 ? 0.75 : rate + 0.25; setRate(r); if (ref.current) ref.current.playbackRate = r; }}>{rate}×</button>
            <button className="icon-btn text-white/80 hover:bg-white/10 hover:text-white" aria-label={muted ? 'Réactiver le son' : 'Couper le son'} onClick={() => ref.current && (ref.current.muted = !ref.current.muted)}>
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </button>
            {isVideo && (
              <button className="rounded-full px-2 py-1 text-xs font-bold text-white/80 hover:bg-white/10" aria-pressed={!videoHidden} onClick={() => setVideoHidden((v) => !v)}>
                {videoHidden ? 'Afficher la vidéo' : 'Masquer la vidéo'}
              </button>
            )}
            {isVideo && (
              <button className="icon-btn text-white/80 hover:bg-white/10 hover:text-white" aria-label="Plein écran" onClick={() => void (ref.current as HTMLVideoElement | null)?.requestFullscreen?.()}>
                <Maximize2 className="h-4 w-4" />
              </button>
            )}
            <button className="icon-btn text-white/80 hover:bg-white/10 hover:text-white" aria-label="Fermer le lecteur" onClick={() => play(null)}><X className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

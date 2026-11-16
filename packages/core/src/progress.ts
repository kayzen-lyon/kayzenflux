import { FILE_PREFIX, PROGRESS_PREFIX } from './args.js';

export type Phase = 'queued' | 'fetching' | 'downloading' | 'processing' | 'done' | 'error' | 'cancelled';

export type EngineEvent =
  | {
      type: 'progress';
      status: string;
      downloaded: number | null;
      total: number | null;
      speed: number | null;
      eta: number | null;
      playlistIndex: number | null;
      percent: number | null;
    }
  | { type: 'phase'; phase: Phase; label: string }
  | { type: 'file'; path: string }
  | { type: 'error'; message: string }
  | { type: 'log'; line: string };

function num(value: string | undefined): number | null {
  if (value === undefined || value === '' || value === 'NA' || value === 'None') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const PHASE_MARKERS: Array<[RegExp, string]> = [
  [/^\[Merger\]/, 'Fusion audio + vidéo'],
  [/^\[ExtractAudio\]/, 'Conversion audio'],
  [/^\[VideoConvertor\]|^\[VideoRemuxer\]/, 'Conversion vidéo'],
  [/^\[SponsorBlock\]|^\[ModifyChapters\]/, 'Suppression des segments sponsorisés'],
  [/^\[Metadata\]/, 'Ajout des métadonnées'],
  [/^\[EmbedThumbnail\]|^\[ThumbnailsConvertor\]/, 'Ajout de la pochette'],
  [/^\[EmbedSubtitle\]|^\[SubtitlesConvertor\]/, 'Ajout des sous-titres'],
];

/** Analyse une ligne de sortie de yt-dlp (stdout ou stderr). */
export function parseEngineLine(rawLine: string): EngineEvent {
  const line = rawLine.replace(/\r$/, '').trimEnd();

  if (line.startsWith(PROGRESS_PREFIX)) {
    const [status = '', d, t, te, s, e, pi] = line.slice(PROGRESS_PREFIX.length).split('|');
    const downloaded = num(d);
    const total = num(t) ?? num(te);
    const percent = downloaded !== null && total ? Math.min(100, (downloaded / total) * 100) : null;
    return {
      type: 'progress',
      status,
      downloaded,
      total,
      speed: num(s),
      eta: num(e),
      playlistIndex: num(pi),
      percent: percent === null ? null : Math.round(percent * 10) / 10,
    };
  }
  if (line.startsWith(FILE_PREFIX)) return { type: 'file', path: line.slice(FILE_PREFIX.length) };
  if (line.startsWith('ERROR:')) return { type: 'error', message: line.slice(6).trim() };
  for (const [re, label] of PHASE_MARKERS) {
    if (re.test(line)) return { type: 'phase', phase: 'processing', label };
  }
  return { type: 'log', line };
}

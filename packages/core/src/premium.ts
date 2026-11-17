/** Modèles de nom de fichier (liste fermée : aucun gabarit libre, donc aucun chemin arbitraire). */
export const FILENAME_TEMPLATES = {
  'title-id': { label: 'Titre [identifiant]', template: '%(title).150B [%(id)s].%(ext)s' },
  title: { label: 'Titre', template: '%(title).150B.%(ext)s' },
  'author-title': { label: 'Auteur - Titre', template: '%(uploader,channel,creator|Inconnu).60B - %(title).120B.%(ext)s' },
  'date-title': { label: 'Date - Titre', template: '%(upload_date>%Y-%m-%d,release_date>%Y-%m-%d|sans-date)s - %(title).130B.%(ext)s' },
} as const;

export type FilenameTemplateId = keyof typeof FILENAME_TEMPLATES;

export function isFilenameTemplateId(v: unknown): v is FilenameTemplateId {
  return typeof v === 'string' && v in FILENAME_TEMPLATES;
}

/** Normalisation de volume EBU R128 (≈ -16 LUFS, niveau des plateformes de podcast). */
export const LOUDNORM_FILTER = 'loudnorm=I=-16:TP=-1.5:LRA=11';

export interface TranscriptCue {
  start: number;
  text: string;
}

function toSeconds(ts: string): number {
  const m = /(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{1,3})/.exec(ts);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2]) * 60 + Number(m[3]) + Number(m[4]!.padEnd(3, '0')) / 1000;
}

/** Lit un fichier SRT ou WebVTT et renvoie des répliques nettoyées et dédoublonnées. */
export function parseSubtitles(content: string): TranscriptCue[] {
  const text = content.replace(/\r/g, '').replace(/^﻿/, '');
  const blocks = text.split(/\n{2,}/);
  const cues: TranscriptCue[] = [];
  let last = '';
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean);
    const timeIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeIdx === -1) continue;
    const start = toSeconds(lines[timeIdx]!.split('-->')[0]!.trim());
    const body = lines
      .slice(timeIdx + 1)
      .join(' ')
      .replace(/<[^>]+>/g, '')
      .replace(/\{[^}]+\}/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
    if (!body) continue;
    // Les sous-titres automatiques répètent la ligne précédente : on ne garde que le nouveau texte.
    let fresh = body;
    if (last && body.startsWith(last)) fresh = body.slice(last.length).trim();
    if (!fresh || fresh === last) {
      last = body;
      continue;
    }
    cues.push({ start, text: fresh });
    last = body;
  }
  return cues;
}

function stamp(sec: number): string {
  const s = Math.floor(sec);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(r).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Transcription Markdown lisible, en paragraphes horodatés (~30 s). */
export function buildTranscript(cues: TranscriptCue[], meta: { title: string; source: string; lang: string; note?: string }): string {
  const out: string[] = [`# ${meta.title}`, '', `Source : ${meta.source}  `, `Langue : ${meta.lang}`, ''];
  // Mention facultative (ex. transcription par reconnaissance vocale) ; même format horodaté ensuite.
  if (meta.note) out.push(`> ${meta.note}`, '');
  let para: string[] = [];
  let paraStart = cues[0]?.start ?? 0;
  for (const cue of cues) {
    if (para.length && cue.start - paraStart >= 30) {
      out.push(`**[${stamp(paraStart)}]** ${para.join(' ')}`, '');
      para = [];
      paraStart = cue.start;
    }
    para.push(cue.text);
  }
  if (para.length) out.push(`**[${stamp(paraStart)}]** ${para.join(' ')}`, '');
  return out.join('\n');
}

/** Arguments pour lire les dernières entrées d'une chaîne / playlist / flux RSS. */
export function buildFeedArgs(url: string, limit: number): string[] {
  return ['--ignore-config', '--no-colors', '--no-warnings', '-J', '--flat-playlist', '--playlist-items', `1:${Math.max(1, Math.min(limit, 50))}`, '--', url];
}

export interface FeedEntry {
  id: string;
  title: string;
  url: string;
}

export function parseFeed(json: unknown): { title: string; entries: FeedEntry[] } {
  const root = (json ?? {}) as { title?: string; entries?: unknown[]; id?: string; webpage_url?: string; original_url?: string };
  const entries: FeedEntry[] = [];
  for (const raw of root.entries ?? []) {
    const e = (raw ?? {}) as { id?: string; title?: string; url?: string; webpage_url?: string };
    const url = e.webpage_url ?? e.url;
    if (!url || !/^https?:\/\//.test(url)) continue;
    entries.push({ id: String(e.id ?? url), title: e.title ?? url, url });
  }
  if (!root.entries && (root.webpage_url || root.original_url) && root.id) {
    entries.push({ id: root.id, title: root.title ?? root.id, url: (root.webpage_url ?? root.original_url)! });
  }
  return { title: root.title ?? 'Abonnement', entries };
}

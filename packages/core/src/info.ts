import { z } from 'zod';

/**
 * Schéma (volontairement permissif) de la sortie JSON de `yt-dlp -J`,
 * puis normalisation en un objet stable pour l'interface.
 */
const FormatSchema = z
  .object({
    format_id: z.string().optional(),
    ext: z.string().nullish(),
    height: z.number().nullish(),
    vcodec: z.string().nullish(),
    acodec: z.string().nullish(),
    abr: z.number().nullish(),
    filesize: z.number().nullish(),
    filesize_approx: z.number().nullish(),
    has_drm: z.union([z.boolean(), z.literal('maybe')]).nullish(),
  })
  .passthrough();

const EntrySchema = z
  .object({
    id: z.string().nullish(),
    title: z.string().nullish(),
    url: z.string().nullish(),
    duration: z.number().nullish(),
  })
  .passthrough();

export const RawInfoSchema = z
  .object({
    id: z.string(),
    title: z.string().nullish(),
    _type: z.string().nullish(),
    uploader: z.string().nullish(),
    channel: z.string().nullish(),
    duration: z.number().nullish(),
    thumbnail: z.string().nullish(),
    webpage_url: z.string().nullish(),
    original_url: z.string().nullish(),
    extractor_key: z.string().nullish(),
    playlist_count: z.number().nullish(),
    license: z.string().nullish(),
    formats: z.array(FormatSchema).nullish(),
    entries: z.array(EntrySchema.nullable()).nullish(),
    has_drm: z.boolean().nullish(),
  })
  .passthrough();

export type RawInfo = z.infer<typeof RawInfoSchema>;

export interface MediaInfo {
  id: string;
  title: string;
  author: string | null;
  durationSec: number | null;
  thumbnail: string | null;
  pageUrl: string | null;
  site: string;
  isPlaylist: boolean;
  entryCount: number;
  maxHeight: number | null;
  bestAudioKbps: number | null;
  hasAudio: boolean;
  hasVideo: boolean;
  drm: boolean;
  license: string | null;
  isCreativeCommons: boolean;
}

export class InfoParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InfoParseError';
  }
}

export function parseInfoJson(text: string): MediaInfo {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new InfoParseError('Réponse du moteur illisible.');
  }
  const res = RawInfoSchema.safeParse(json);
  if (!res.success) throw new InfoParseError('Réponse du moteur inattendue.');
  return normalizeInfo(res.data);
}

export function normalizeInfo(raw: RawInfo): MediaInfo {
  const formats = raw.formats ?? [];
  const isPlaylist = raw._type === 'playlist' || Array.isArray(raw.entries);
  const heights = formats.map((f) => f.height ?? 0).filter((h) => h > 0);
  const audioRates = formats.map((f) => f.abr ?? 0).filter((a) => a > 0);
  // Codec inconnu (null) = « peut-être » : on se fie alors à l'extension du conteneur.
  const VIDEO_EXT = /^(mp4|webm|mkv|mov|m4v|avi|flv|3gp|ts|m3u8|mpd)$/i;
  const hasVideo =
    heights.length > 0 ||
    formats.some((f) => (f.vcodec ? f.vcodec !== 'none' : f.vcodec !== 'none' && VIDEO_EXT.test(f.ext ?? '')));
  const hasAudio = formats.some((f) => f.acodec !== 'none') || audioRates.length > 0;
  const license = raw.license ?? null;

  return {
    id: raw.id,
    title: raw.title?.trim() || 'Sans titre',
    author: raw.uploader ?? raw.channel ?? null,
    durationSec: raw.duration ?? null,
    thumbnail: raw.thumbnail ?? null,
    pageUrl: raw.webpage_url ?? raw.original_url ?? null,
    site: raw.extractor_key ?? 'Generic',
    isPlaylist,
    entryCount: isPlaylist ? (raw.playlist_count ?? raw.entries?.filter(Boolean).length ?? 0) : 1,
    maxHeight: heights.length ? Math.max(...heights) : null,
    bestAudioKbps: audioRates.length ? Math.round(Math.max(...audioRates)) : null,
    hasAudio: isPlaylist ? true : hasAudio || formats.length === 0,
    hasVideo: isPlaylist ? true : hasVideo,
    drm: detectDrm(raw),
    license,
    isCreativeCommons: !!license && /creative\s*commons|\bcc[- ]by/i.test(license),
  };
}

/**
 * Règle non négociable : tout contenu chiffré est refusé.
 * On considère le média protégé si yt-dlp le signale globalement, ou si
 * TOUS les formats exposés sont marqués DRM.
 */
export function detectDrm(raw: Pick<RawInfo, 'has_drm' | 'formats'>): boolean {
  if (raw.has_drm) return true;
  const formats = raw.formats ?? [];
  return formats.length > 0 && formats.every((f) => f.has_drm === true || f.has_drm === 'maybe');
}

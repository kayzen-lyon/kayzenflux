/**
 * Préréglages d'export. Les libellés restent honnêtes : un conteneur sans perte
 * (FLAC/WAV) ne restaure jamais la qualité d'une source déjà compressée.
 */

export type Tier = 'free' | 'premium';
export type MediaKind = 'audio' | 'video';

export interface Preset {
  id: PresetId;
  kind: MediaKind;
  label: string;
  hint: string;
  tier: Tier;
  /** Arguments yt-dlp propres au préréglage. */
  args: readonly string[];
}

export const PRESET_IDS = [
  'mp3-320',
  'm4a',
  'opus',
  'flac',
  'mp4-720',
  'mp4-1080',
  'mp4-2160',
] as const;
export type PresetId = (typeof PRESET_IDS)[number];

export const PRESETS: Record<PresetId, Preset> = {
  'mp3-320': {
    id: 'mp3-320',
    kind: 'audio',
    label: 'MP3 (320 kbps)',
    hint: 'Compatible partout. Qualité plafonnée par la source.',
    tier: 'free',
    args: ['-f', 'ba/b', '-x', '--audio-format', 'mp3', '--audio-quality', '320K'],
  },
  m4a: {
    id: 'm4a',
    kind: 'audio',
    label: 'M4A (AAC)',
    hint: 'Idéal iPhone et Apple Music.',
    tier: 'free',
    args: ['-f', 'ba[ext=m4a]/ba/b', '-x', '--audio-format', 'm4a'],
  },
  opus: {
    id: 'opus',
    kind: 'audio',
    label: 'Opus (flux d’origine)',
    hint: 'Souvent le flux audio d’origine, sans réencodage.',
    tier: 'free',
    args: ['-f', 'ba[acodec^=opus]/ba/b', '-x', '--audio-format', 'opus'],
  },
  flac: {
    id: 'flac',
    kind: 'audio',
    label: 'FLAC (conteneur)',
    hint: 'Pour logiciels de montage ou DJ. N’ajoute aucune qualité à la source.',
    tier: 'premium',
    args: ['-f', 'ba/b', '-x', '--audio-format', 'flac'],
  },
  'mp4-720': {
    id: 'mp4-720',
    kind: 'video',
    label: 'MP4 (720p)',
    hint: 'Léger, pour téléphone.',
    tier: 'free',
    args: ['-f', 'bv*[height<=?720]+ba/b[height<=?720]', '-S', 'vcodec:h264,res,acodec:m4a', '--merge-output-format', 'mp4'],
  },
  'mp4-1080': {
    id: 'mp4-1080',
    kind: 'video',
    label: 'MP4 (1080p)',
    hint: 'Full HD, compatible partout (H.264 privilégié).',
    tier: 'free',
    args: ['-f', 'bv*[height<=?1080]+ba/b[height<=?1080]', '-S', 'vcodec:h264,res,acodec:m4a', '--merge-output-format', 'mp4'],
  },
  'mp4-2160': {
    id: 'mp4-2160',
    kind: 'video',
    label: 'MP4 (4K)',
    hint: 'Meilleure définition disponible jusqu’à 2160p.',
    tier: 'premium',
    args: ['-f', 'bv*[height<=?2160]+ba/b', '-S', 'res,fps', '--merge-output-format', 'mp4'],
  },
};

export function isPresetId(value: unknown): value is PresetId {
  return typeof value === 'string' && (PRESET_IDS as readonly string[]).includes(value);
}

export function isPresetAllowed(id: PresetId, tier: Tier): boolean {
  return tier === 'premium' || PRESETS[id].tier === 'free';
}

/** Limites par offre (cf. roadmap, matrice gratuit/premium). */
export const TIER_LIMITS: Record<Tier, { maxPlaylistItems: number; maxParallelJobs: number }> = {
  free: { maxPlaylistItems: 25, maxParallelJobs: 2 },
  premium: { maxPlaylistItems: 5000, maxParallelJobs: 6 },
};

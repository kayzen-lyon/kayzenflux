import type { PresetId } from '../types';

/** Copie légère (sans zod) du type de média par préréglage, pour l'interface. */
export const PRESET_KIND: Record<PresetId, 'audio' | 'video'> = {
  'mp3-320': 'audio',
  m4a: 'audio',
  opus: 'audio',
  flac: 'audio',
  'mp4-720': 'video',
  'mp4-1080': 'video',
  'mp4-2160': 'video',
};

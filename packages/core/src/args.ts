import { LIMITS, PRESETS, type PresetId } from './presets.js';
import { validateUrl } from './url.js';
import { FILENAME_TEMPLATES, LOUDNORM_FILTER, type FilenameTemplateId } from './features.js';

/** Préfixes des lignes machine émises par yt-dlp et lues par le démon. */
export const PROGRESS_PREFIX = 'KZP|';
export const FILE_PREFIX = 'KZF|';
export const META_PREFIX = 'KZM|';

export const PROGRESS_TEMPLATE =
  'download:' +
  PROGRESS_PREFIX +
  '%(progress.status)s|%(progress.downloaded_bytes)s|%(progress.total_bytes)s|%(progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s|%(info.playlist_index)s';

export interface DownloadOptions {
  url: string;
  preset: PresetId;
  outputDir: string;
  sponsorBlock?: boolean;
  embedMetadata?: boolean;
  playlist?: boolean;
  /** Nombre max d'éléments de playlist ; plafonné par LIMITS.maxPlaylistItems. */
  playlistLimit?: number;
  subtitles?: boolean;
  ffmpegLocation?: string;
  /** Fichier d'archive pour reprendre une playlist sans re-télécharger. */
  archiveFile?: string;
  allowLocal?: boolean;
  /** Découpe un fichier par chapitre (dans un sous-dossier). */
  splitChapters?: boolean;
  /** Normalisation du volume (audio uniquement). */
  normalizeAudio?: boolean;
  /** Récupère les sous-titres (y compris automatiques) pour produire une transcription. */
  transcript?: boolean;
  filenameTemplate?: FilenameTemplateId;
}

export class ArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArgsError';
  }
}

/**
 * Construit la ligne de commande yt-dlp sous forme de tableau (jamais de
 * concaténation de chaînes : aucune injection possible). L'URL est toujours
 * placée après « -- » pour ne jamais être lue comme une option.
 */
export function buildDownloadArgs(opts: DownloadOptions): string[] {
  const check = validateUrl(opts.url, { allowLocal: opts.allowLocal });
  if (!check.ok) throw new ArgsError(check.reason);
  if (!opts.outputDir || opts.outputDir.startsWith('-')) throw new ArgsError('Dossier de sortie invalide.');
  const nameTemplate = FILENAME_TEMPLATES[opts.filenameTemplate ?? 'title-id']?.template ?? FILENAME_TEMPLATES['title-id'].template;

  const preset = PRESETS[opts.preset];
  const args: string[] = [
    '--newline',
    '--no-colors',
    '--ignore-config',
    '--no-simulate',
    '--progress-template',
    PROGRESS_TEMPLATE,
    '--print',
    `video:${META_PREFIX}%(.{title,uploader,channel,thumbnail,duration,extractor_key})j`,
    '--print',
    `after_move:${FILE_PREFIX}%(filepath)s`,
    '-P',
    opts.outputDir,
    '-o',
    nameTemplate,
    '--windows-filenames',
    ...preset.args,
  ];

  if (opts.playlist) {
    const cap = LIMITS.maxPlaylistItems;
    const limit = Math.max(1, Math.min(opts.playlistLimit ?? cap, cap));
    args.push('--yes-playlist', '--playlist-items', `1:${limit}`);
    args.push('-o', '%(playlist_title).80B/%(playlist_index)03d - %(title).120B [%(id)s].%(ext)s');
    if (opts.archiveFile) args.push('--download-archive', opts.archiveFile);
  } else {
    args.push('--no-playlist');
  }

  if (opts.sponsorBlock) args.push('--sponsorblock-remove', 'sponsor,selfpromo,interaction');
  if (opts.embedMetadata) {
    args.push('--embed-metadata', '--embed-thumbnail', '--convert-thumbnails', 'jpg');
  }
  if (opts.subtitles || opts.transcript) {
    args.push('--write-subs', '--sub-langs', 'fr.*,en.*,-live_chat', '--convert-subs', 'srt');
    if (opts.transcript) args.push('--write-auto-subs');
    // Les sous-titres intégrés à la vidéo sont supprimés du disque : on les garde si une transcription est demandée.
    if (preset.kind === 'video' && opts.subtitles && !opts.transcript) args.push('--embed-subs');
  }
  if (opts.normalizeAudio && preset.kind === 'audio') {
    args.push('--postprocessor-args', `ExtractAudio:-af ${LOUDNORM_FILTER}`);
  }
  if (opts.splitChapters) {
    args.push('--split-chapters', '-o', 'chapter:%(title).80B - chapitres/%(section_number)02d - %(section_title).100B.%(ext)s');
  }
  if (opts.ffmpegLocation) args.push('--ffmpeg-location', opts.ffmpegLocation);

  args.push('--', check.url);
  return args;
}

/** Arguments pour récupérer les informations (aperçu) sans rien télécharger. */
export function buildInfoArgs(url: string, opts: { allowLocal?: boolean; playlist?: boolean } = {}): string[] {
  const check = validateUrl(url, { allowLocal: opts.allowLocal });
  if (!check.ok) throw new ArgsError(check.reason);
  return [
    '--ignore-config',
    '--no-colors',
    '-J',
    '--no-warnings',
    opts.playlist ? '--flat-playlist' : '--no-playlist',
    '--',
    check.url,
  ];
}

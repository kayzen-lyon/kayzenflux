/**
 * Transcription locale avec whisper.cpp — logique pure (aucun accès disque ni réseau ici).
 *
 * Sources officielles (vérifiées le 17/11/2026) :
 *  - moteur : https://github.com/ggml-org/whisper.cpp/releases (licence MIT), build CI « b5454 »
 *    publié le 06/10/2026 avec la version v1.9.5. Empreintes SHA-256 relevées sur la page de la release
 *    (champ « sha256: » affiché par GitHub pour chaque fichier).
 *  - modèles : https://huggingface.co/ggerganov/whisper.cpp (poids OpenAI Whisper convertis, licence MIT).
 *    Empreintes = « oid sha256 » des pointeurs Git LFS officiels.
 *
 * Aucun binaire officiel en ligne de commande n'est publié pour macOS (seulement un xcframework) :
 * la fonction n'est donc pas proposée sur cette plate-forme.
 */
import { parseSubtitles, type TranscriptCue } from './features.js';

export const WHISPER_RELEASE = 'b5454';
const RELEASE_BASE = `https://github.com/ggml-org/whisper.cpp/releases/download/${WHISPER_RELEASE}`;
const MODEL_BASE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

export type WhisperPlatform = 'linux-x64' | 'linux-arm64' | 'win32-x64' | 'win32-arm64';

export interface WhisperEngineAsset {
  platform: WhisperPlatform;
  file: string;
  url: string;
  sha256: string;
  /** Taille approximative affichée par GitHub (en octets, arrondie) : sert à informer et à borner le téléchargement. */
  approxBytes: number;
  archive: 'zip' | 'tar.gz';
  binaryName: string;
}

const MB = 1_000_000;

export const WHISPER_ENGINE_ASSETS: Record<WhisperPlatform, WhisperEngineAsset> = {
  'linux-x64': {
    platform: 'linux-x64',
    file: 'whisper-bin-ubuntu-x64.tar.gz',
    url: `${RELEASE_BASE}/whisper-bin-ubuntu-x64.tar.gz`,
    sha256: 'a72becf15d7917f990f6313867a52638b82b7f9ef237fb0c980dac56a135781c',
    approxBytes: Math.round(9.88 * MB),
    archive: 'tar.gz',
    binaryName: 'whisper-cli',
  },
  'linux-arm64': {
    platform: 'linux-arm64',
    file: 'whisper-bin-ubuntu-arm64.tar.gz',
    url: `${RELEASE_BASE}/whisper-bin-ubuntu-arm64.tar.gz`,
    sha256: '6b95ebfc60447df48e70ef00a73bdc3f41679ed2d01ef465827206a2ff325149',
    approxBytes: Math.round(4.39 * MB),
    archive: 'tar.gz',
    binaryName: 'whisper-cli',
  },
  'win32-x64': {
    platform: 'win32-x64',
    file: 'whisper-bin-x64.zip',
    url: `${RELEASE_BASE}/whisper-bin-x64.zip`,
    sha256: '6ba69e3482d7826214f90a6a9c84ca07782aec1e1d0c6a7c30c994fd5d816ccb',
    approxBytes: Math.round(8.52 * MB),
    archive: 'zip',
    binaryName: 'whisper-cli.exe',
  },
  'win32-arm64': {
    platform: 'win32-arm64',
    file: 'whisper-bin-win-cpu-arm64.zip',
    url: `${RELEASE_BASE}/whisper-bin-win-cpu-arm64.zip`,
    sha256: '28c37e7b598c3d9bbfef94f3bd67f2ee6f12b7c86f3da5edcf5e4308d615ff6d',
    approxBytes: Math.round(4.17 * MB),
    archive: 'zip',
    binaryName: 'whisper-cli.exe',
  },
};

export type WhisperModelId = 'base' | 'small';

export interface WhisperModelAsset {
  id: WhisperModelId;
  label: string;
  hint: string;
  file: string;
  url: string;
  sha256: string;
  /** Taille exacte (pointeur Git LFS officiel). */
  sizeBytes: number;
  /** Mémoire vive conseillée pour une utilisation confortable. */
  minMemoryBytes: number;
}

export const WHISPER_MODELS: Record<WhisperModelId, WhisperModelAsset> = {
  base: {
    id: 'base',
    label: 'Base (multilingue)',
    hint: 'Rapide, précision correcte. Recommandé pour la plupart des ordinateurs.',
    file: 'ggml-base.bin',
    url: `${MODEL_BASE}/ggml-base.bin`,
    sha256: '60ed5bc3dd14eea856493d334349b405782ddcaf0028d4b5df4088345fba2efe',
    sizeBytes: 147_951_465,
    minMemoryBytes: 2 * 1024 ** 3,
  },
  small: {
    id: 'small',
    label: 'Small (multilingue)',
    hint: 'Plus précis, environ 3 fois plus lent que Base.',
    file: 'ggml-small.bin',
    url: `${MODEL_BASE}/ggml-small.bin`,
    sha256: '1be3a9b2063867b937e64e2ec7483364a79917e157fa98c5d94b5c1fffea987b',
    sizeBytes: 487_601_967,
    minMemoryBytes: 4 * 1024 ** 3,
  },
};

export const WHISPER_MODEL_IDS = Object.keys(WHISPER_MODELS) as WhisperModelId[];

export function isWhisperModelId(v: unknown): v is WhisperModelId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(WHISPER_MODELS, v);
}

/** Plate-forme whisper.cpp pour un couple (process.platform, process.arch) ; null si aucun binaire officiel. */
export function whisperPlatform(platform: string, arch: string): WhisperPlatform | null {
  const key = `${platform}-${arch}`;
  return key in WHISPER_ENGINE_ASSETS ? (key as WhisperPlatform) : null;
}

export function getWhisperEngineAsset(platform: string, arch: string): WhisperEngineAsset | null {
  const p = whisperPlatform(platform, arch);
  return p ? WHISPER_ENGINE_ASSETS[p] : null;
}

/** Message affiché quand la plate-forme n'a pas de binaire officiel. */
export function unsupportedPlatformMessage(platform: string, arch: string): string {
  const name = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : platform === 'linux' ? 'Linux' : platform;
  return `La transcription sans sous-titres n'est pas disponible sur ${name} (${arch}) : whisper.cpp ne publie pas de programme officiel pour cette plate-forme. Les transcriptions à partir des sous-titres restent disponibles.`;
}

// ---------- Empreintes SHA-256 ----------

export function isSha256Hex(v: unknown): v is string {
  return typeof v === 'string' && /^[a-f0-9]{64}$/i.test(v);
}

/** Compare une empreinte calculée à l'empreinte épinglée. Refuse toute empreinte attendue invalide ou absente. */
export function sha256Matches(actual: string, expected: string | null | undefined): boolean {
  if (!isSha256Hex(expected) || !isSha256Hex(actual)) return false;
  return actual.toLowerCase() === expected.toLowerCase();
}

// ---------- Choix du modèle et de la langue ----------

/**
 * Choisit le modèle à utiliser : le modèle préféré s'il est installé, sinon un autre modèle installé
 * (le plus léger d'abord), sinon null.
 */
export function selectWhisperModel(preferred: WhisperModelId, installed: readonly WhisperModelId[]): WhisperModelId | null {
  if (installed.includes(preferred)) return preferred;
  const fallback = WHISPER_MODEL_IDS.filter((id) => installed.includes(id)).sort((a, b) => WHISPER_MODELS[a].sizeBytes - WHISPER_MODELS[b].sizeBytes);
  return fallback[0] ?? null;
}

/** Modèle conseillé selon la mémoire vive de l'ordinateur. */
export function recommendWhisperModel(totalMemoryBytes: number): WhisperModelId {
  return totalMemoryBytes >= WHISPER_MODELS.small.minMemoryBytes * 2 ? 'small' : 'base';
}

export const WHISPER_LANGUAGES: ReadonlyArray<{ id: string; label: string }> = [
  { id: 'auto', label: 'Détection automatique' },
  { id: 'fr', label: 'Français' },
  { id: 'en', label: 'Anglais' },
  { id: 'es', label: 'Espagnol' },
  { id: 'de', label: 'Allemand' },
  { id: 'it', label: 'Italien' },
  { id: 'pt', label: 'Portugais' },
  { id: 'ar', label: 'Arabe' },
];

export function isWhisperLanguage(v: unknown): v is string {
  return typeof v === 'string' && WHISPER_LANGUAGES.some((l) => l.id === v);
}

/** Nombre de fils de calcul : tous les cœurs sauf un, entre 1 et 8. */
export function whisperThreads(cpuCount: number): number {
  const n = Number.isFinite(cpuCount) ? Math.floor(cpuCount) - 1 : 1;
  return Math.max(1, Math.min(8, n));
}

// ---------- Arguments (toujours en tableau, jamais de shell) ----------

export class WhisperArgsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WhisperArgsError';
  }
}

/** Chemin absolu POSIX (/…) ou Windows (C:\… ou \\serveur\…). Un chemin absolu ne peut pas commencer par « - ». */
export function isAbsolutePath(p: string): boolean {
  return p.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(p) || p.startsWith('\\\\');
}

function requireAbsolute(p: string, what: string): string {
  if (typeof p !== 'string' || !p || !isAbsolutePath(p) || /[\0\n\r]/.test(p)) throw new WhisperArgsError(`Chemin invalide pour ${what}.`);
  return p;
}

/** ffmpeg : extrait la piste audio en WAV PCM 16 bits, 16 kHz, mono (format attendu par whisper.cpp). */
export function buildAudioExtractArgs(input: string, output: string): string[] {
  return [
    '-hide_banner',
    '-nostdin',
    '-loglevel',
    'error',
    '-y',
    '-i',
    requireAbsolute(input, 'le fichier source'),
    '-vn',
    '-ac',
    '1',
    '-ar',
    '16000',
    '-c:a',
    'pcm_s16le',
    '-f',
    'wav',
    requireAbsolute(output, 'le fichier audio temporaire'),
  ];
}

export interface WhisperRunOptions {
  modelPath: string;
  wavPath: string;
  /** Chemin de sortie sans extension : whisper-cli écrit `${outputBase}.srt`. */
  outputBase: string;
  language: string;
  threads: number;
}

export function buildWhisperArgs(o: WhisperRunOptions): string[] {
  if (!isWhisperLanguage(o.language)) throw new WhisperArgsError('Langue de transcription non prise en charge.');
  const threads = Number.isInteger(o.threads) && o.threads >= 1 && o.threads <= 64 ? o.threads : 1;
  return [
    '-m',
    requireAbsolute(o.modelPath, 'le modèle'),
    '-f',
    requireAbsolute(o.wavPath, 'le fichier audio'),
    '-l',
    o.language,
    '-t',
    String(threads),
    '-osrt',
    '-of',
    requireAbsolute(o.outputBase, 'la sortie'),
    '-pp',
  ];
}

// ---------- Lecture de la sortie de whisper.cpp ----------

/** Progression affichée par `--print-progress` (« progress = 42% »). */
export function parseWhisperProgress(line: string): number | null {
  const m = /progress\s*=\s*(\d{1,3})\s*%/.exec(line);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 0 && n <= 100 ? n : null;
}

/** Langue détectée (« auto-detected language: fr (p = 0.98) »). */
export function parseWhisperDetectedLanguage(line: string): string | null {
  const m = /auto-detected language:\s*([a-z]{2,3})\b/i.exec(line);
  return m ? m[1]!.toLowerCase() : null;
}

/** Jetons spéciaux produits par whisper sur les silences (« [BLANK_AUDIO] », « [_TT_123] »…). */
const SPECIAL_TOKEN = /^\s*[[(]\s*(?:BLANK_AUDIO|_[A-Z]+_?\d*|SILENCE|NO_SPEECH)\s*[\])]\s*$/i;

/** Convertit le fichier SRT écrit par whisper-cli en répliques nettoyées (même format que les sous-titres). */
export function parseWhisperSrt(content: string): TranscriptCue[] {
  return parseSubtitles(content)
    .map((c) => ({ start: c.start, text: c.text.replace(/\[BLANK_AUDIO\]/gi, '').replace(/\s+/g, ' ').trim() }))
    .filter((c) => c.text && !SPECIAL_TOKEN.test(c.text));
}

/** Mention ajoutée en tête des transcriptions produites par la reconnaissance vocale (honnêteté). */
export function whisperTranscriptNote(model: WhisperModelId): string {
  return `Transcription automatique générée sur cet ordinateur par whisper.cpp (modèle ${model}) : elle peut contenir des erreurs.`;
}

// ---------- Erreurs typées (codes partagés démon / interface) ----------

export type TranscriptionErrorCode =
  | 'unsupported_platform'
  | 'not_installed'
  | 'confirmation_required'
  | 'busy'
  | 'download_failed'
  | 'size_mismatch'
  | 'checksum_mismatch'
  | 'extract_failed'
  | 'engine_broken'
  | 'audio_failed'
  | 'whisper_failed'
  | 'empty'
  | 'cancelled'
  | 'missing_file';

export const TRANSCRIPTION_MESSAGES: Record<TranscriptionErrorCode, string> = {
  unsupported_platform: 'La transcription locale n’est pas disponible sur cette plate-forme.',
  not_installed: 'Le moteur ou le modèle de transcription n’est pas installé (Paramètres > Transcription locale).',
  confirmation_required: 'Confirmation requise : la taille du téléchargement doit être acceptée.',
  busy: 'Un téléchargement de composant est déjà en cours.',
  download_failed: 'Le téléchargement du composant a échoué. Vérifiez votre connexion puis réessayez.',
  size_mismatch: 'Le fichier téléchargé n’a pas la taille attendue : il a été supprimé.',
  checksum_mismatch: 'Empreinte SHA-256 invalide : le fichier téléchargé a été supprimé par sécurité.',
  extract_failed: 'L’archive du moteur n’a pas pu être décompressée.',
  engine_broken: 'Le moteur officiel ne démarre pas sur ce système (bibliothèques manquantes ou système trop ancien).',
  audio_failed: 'L’extraction de l’audio a échoué (ffmpeg).',
  whisper_failed: 'La reconnaissance vocale a échoué.',
  empty: 'Aucune parole n’a été détectée dans ce fichier.',
  cancelled: 'Transcription annulée.',
  missing_file: 'Fichier introuvable : il a été déplacé ou supprimé.',
};

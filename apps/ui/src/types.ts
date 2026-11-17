import type { MediaInfo, OllamaModel, Phase, PresetId, Tier, TranscriptionErrorCode, UpdateState, UpdateStatus, WhisperModelId } from '@kayzen-flux/core';
export type { MediaInfo, OllamaModel, Phase, PresetId, Tier, UpdateState, UpdateStatus, WhisperModelId };

export type WhisperTarget = 'engine' | WhisperModelId;

/** État de la transcription locale (whisper.cpp), renvoyé par le démon. */
export interface WhisperStatus {
  supported: boolean;
  platform: string;
  unsupportedReason: string | null;
  ready: boolean;
  engine: { installed: boolean; release: string; file: string | null; sizeBytes: number | null; source: string | null };
  models: Array<{ id: WhisperModelId; label: string; hint: string; sizeBytes: number; installed: boolean; source: string }>;
  recommendedModel: WhisperModelId;
  installing: { target: WhisperTarget; phase: 'download' | 'verify' | 'extract' | 'check'; receivedBytes: number; totalBytes: number } | null;
  lastError: { target: WhisperTarget; code: TranscriptionErrorCode; message: string } | null;
}

/** Serveur Ollama détecté sur 127.0.0.1 (jamais sur Internet). */
export interface OllamaStatus {
  available: boolean;
  version: string | null;
  models: OllamaModel[];
}

export interface PresetView {
  id: PresetId;
  kind: 'audio' | 'video';
  label: string;
  hint: string;
  tier: Tier;
  allowed: boolean;
}

export interface Status {
  app: string;
  engine: string | null;
  ffmpeg: string | null;
  tier: Tier;
  limits: { maxPlaylistItems: number; maxParallelJobs: number };
  presets: PresetView[];
  license: LicenseState;
  devLicenseKey: boolean;
  templates: Array<{ id: string; label: string }>;
}

export interface LicenseState {
  tier: Tier;
  source: 'license' | 'env' | 'none';
  email: string | null;
  name: string | null;
  expiresAt: string | null;
  error: string | null;
}

export interface Subscription {
  id: string;
  url: string;
  title: string;
  preset: PresetId;
  intervalHours: number;
  enabled: boolean;
  lastCheck: string | null;
  lastError: string | null;
  lastNew: number;
  createdAt: string;
}

export interface Job {
  id: string;
  kind: 'download' | 'transcription' | 'summary';
  url: string;
  preset: PresetId;
  presetLabel: string;
  title: string;
  author: string | null;
  thumbnail: string | null;
  site: string;
  playlist: boolean;
  phase: Phase;
  label: string;
  percent: number | null;
  speed: number | null;
  eta: number | null;
  downloaded: number | null;
  total: number | null;
  playlistIndex: number | null;
  entryCount: number;
  files: string[];
  libraryIds: string[];
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
  options: string[];
  subscriptionId: string | null;
  transcripts: string[];
}

export interface LibraryItem {
  id: string;
  title: string;
  author: string | null;
  site: string;
  preset: PresetId;
  filePath: string;
  fileName: string;
  sizeBytes: number;
  durationSec: number | null;
  thumbnail: string | null;
  sourceUrl: string;
  createdAt: string;
  favorite: boolean;
  transcriptPath?: string | null;
  summaryPath?: string | null;
}

export interface Settings {
  downloadDir: string;
  defaultPreset: PresetId;
  sponsorBlock: boolean;
  embedMetadata: boolean;
  subtitles: boolean;
  maxParallel: number;
  filenameTemplate: string;
  normalizeAudio: boolean;
  transcript: boolean;
  /** Mise à jour automatique : null tant que l'utilisateur n'a pas répondu. */
  autoUpdate: boolean | null;
  whisperModel: WhisperModelId;
  whisperLanguage: string;
}

export type Page = 'home' | 'downloads' | 'library' | 'subscriptions' | 'settings' | 'shortcuts';

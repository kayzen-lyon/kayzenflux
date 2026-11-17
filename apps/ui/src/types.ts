import type { MediaInfo, Phase, PresetId, Tier, UpdateState, UpdateStatus } from '@kayzen-flux/core';
export type { MediaInfo, Phase, PresetId, Tier, UpdateState, UpdateStatus };

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
}

export type Page = 'home' | 'downloads' | 'library' | 'subscriptions' | 'settings' | 'shortcuts';

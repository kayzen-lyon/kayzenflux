import type { MediaInfo, Phase, PresetId, Tier } from '@kayzen-flux/core';
export type { MediaInfo, Phase, PresetId, Tier };

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
}

export interface Settings {
  downloadDir: string;
  defaultPreset: PresetId;
  sponsorBlock: boolean;
  embedMetadata: boolean;
  subtitles: boolean;
  maxParallel: number;
}

export type Page = 'home' | 'downloads' | 'library' | 'settings' | 'shortcuts';

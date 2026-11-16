import { homedir } from 'node:os';
import { join } from 'node:path';
import type { Tier } from '@kayzen-flux/core';

export interface DaemonConfig {
  host: '127.0.0.1';
  port: number;
  dataDir: string;
  defaultDownloadDir: string;
  ytdlpPath: string;
  ffmpegPath: string | undefined;
  tier: Tier;
  /** Uniquement pour les tests automatisés : autorise les URL locales. */
  allowLocalUrls: boolean;
  uiDir: string;
  appVersion: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, uiDir: string): DaemonConfig {
  const port = Number(env.KAYZEN_PORT ?? 49152);
  return {
    host: '127.0.0.1',
    port: Number.isInteger(port) && port > 0 && port < 65536 ? port : 49152,
    dataDir: env.KAYZEN_DATA_DIR ?? join(homedir(), '.kayzen-flux'),
    defaultDownloadDir: env.KAYZEN_DOWNLOAD_DIR ?? join(homedir(), 'Downloads', 'KAYZEN Flux'),
    ytdlpPath: env.KAYZEN_YTDLP ?? 'yt-dlp',
    ffmpegPath: env.KAYZEN_FFMPEG || undefined,
    // L'offre Premium sera débloquée par une licence signée (phase 3).
    tier: env.KAYZEN_TIER === 'premium' ? 'premium' : 'free',
    allowLocalUrls: env.KAYZEN_ALLOW_LOCAL === '1',
    uiDir,
    appVersion: '0.1.0',
  };
}

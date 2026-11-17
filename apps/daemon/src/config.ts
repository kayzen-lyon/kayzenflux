import { homedir } from 'node:os';
import { join } from 'node:path';
import { OLLAMA_DEFAULT_URL } from '@kayzen-flux/core';
import type { WhisperSources } from './whisper.js';

export interface DaemonConfig {
  host: '127.0.0.1';
  port: number;
  dataDir: string;
  defaultDownloadDir: string;
  ytdlpPath: string;
  ffmpegPath: string | undefined;
  /** Uniquement pour les tests automatisés : autorise les URL locales. */
  allowLocalUrls: boolean;
  uiDir: string;
  appVersion: string;
  subscriptionTickMs?: number;
  /** Serveur Ollama local (boucle locale uniquement, vérifié au démarrage). */
  ollamaUrl: string;
  /** Remplace les sources whisper.cpp (tests uniquement : jamais lu depuis l'environnement). */
  whisperSources?: Partial<WhisperSources>;
  /** Remplace la plate-forme détectée (tests). */
  whisperPlatform?: { platform: string; arch: string };
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env, uiDir: string): DaemonConfig {
  const port = Number(env.KAYZEN_PORT ?? 49152);
  return {
    host: '127.0.0.1',
    port: Number.isInteger(port) && port >= 0 && port < 65536 ? port : 49152,
    dataDir: env.KAYZEN_DATA_DIR ?? join(homedir(), '.kayzen-flux'),
    defaultDownloadDir: env.KAYZEN_DOWNLOAD_DIR ?? join(homedir(), 'Downloads', 'KAYZEN Flux'),
    ytdlpPath: env.KAYZEN_YTDLP ?? 'yt-dlp',
    ffmpegPath: env.KAYZEN_FFMPEG || undefined,
    allowLocalUrls: env.KAYZEN_ALLOW_LOCAL === '1',
    uiDir,
    appVersion: '1.0.0',
    ollamaUrl: OLLAMA_DEFAULT_URL,
  };
}

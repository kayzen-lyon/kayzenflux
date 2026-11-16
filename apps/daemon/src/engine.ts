import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import {
  buildInfoArgs,
  classifyEngineError,
  parseInfoJson,
  type MediaInfo,
} from '@kayzen-flux/core';

export interface RunHandle {
  done: Promise<{ code: number | null; cancelled: boolean }>;
  cancel: () => void;
}

/**
 * Lance yt-dlp sans shell (arguments en tableau) et remonte chaque ligne.
 */
export function runEngine(binary: string, args: string[], onLine: (line: string) => void): RunHandle {
  const child = spawn(binary, args, { shell: false, windowsHide: true, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } });
  let cancelled = false;
  const pipe = (stream: NodeJS.ReadableStream | null) => {
    if (!stream) return;
    createInterface({ input: stream }).on('line', onLine);
  };
  pipe(child.stdout);
  pipe(child.stderr);
  const done = new Promise<{ code: number | null; cancelled: boolean }>((resolve) => {
    child.on('error', (err) => {
      onLine(`ERROR: ${(err as NodeJS.ErrnoException).code === 'ENOENT' ? 'Moteur yt-dlp introuvable' : err.message}`);
      resolve({ code: -1, cancelled });
    });
    child.on('close', (code) => resolve({ code, cancelled }));
  });
  return {
    done,
    cancel: () => {
      cancelled = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 3000).unref();
    },
  };
}

export class EngineError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'EngineError';
  }
}

/** Exécute une commande courte et renvoie stdout (stderr gardé pour les erreurs). */
export function capture(binary: string, args: string[], timeoutMs: number): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(binary, args, { shell: false, windowsHide: true });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill('SIGKILL'), timeoutMs);
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
      if (stdout.length > 50_000_000) child.kill('SIGKILL');
    });
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString('utf8')));
    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ code: -1, stdout: '', stderr: (err as NodeJS.ErrnoException).code === 'ENOENT' ? 'Moteur yt-dlp introuvable' : err.message });
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

export async function fetchInfo(binary: string, url: string, opts: { allowLocal: boolean; playlist: boolean }): Promise<MediaInfo> {
  const res = await capture(binary, buildInfoArgs(url, opts), 90_000);
  if (res.code !== 0) {
    const last = res.stderr.split('\n').filter((l) => l.startsWith('ERROR')).pop() ?? res.stderr;
    if (/introuvable/.test(last)) throw new EngineError('missing_engine', 'Moteur yt-dlp introuvable. Installez-le ou indiquez son chemin.');
    const friendly = classifyEngineError(last);
    throw new EngineError(friendly.code, friendly.message);
  }
  const info = parseInfoJson(res.stdout);
  if (info.drm) throw new EngineError('drm', classifyEngineError('drm').message);
  return info;
}

export async function engineVersion(binary: string): Promise<string | null> {
  const res = await capture(binary, ['--version'], 15_000);
  return res.code === 0 ? res.stdout.trim() : null;
}

export async function ffmpegVersion(binary: string): Promise<string | null> {
  const res = await capture(binary, ['-version'], 15_000);
  if (res.code !== 0) return null;
  return /ffmpeg version (\S+)/.exec(res.stdout)?.[1] ?? 'présent';
}

export async function updateEngine(binary: string): Promise<{ ok: boolean; output: string }> {
  const res = await capture(binary, ['-U'], 180_000);
  const output = (res.stdout + res.stderr).trim().slice(-2000);
  return { ok: res.code === 0, output };
}

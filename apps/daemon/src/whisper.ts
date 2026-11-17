import { EventEmitter } from 'node:events';
import { createHash, randomUUID } from 'node:crypto';
import { createWriteStream } from 'node:fs';
import { chmod, mkdir, readFile, readdir, rename, rm, stat, writeFile } from 'node:fs/promises';
import { once } from 'node:events';
import { totalmem, cpus } from 'node:os';
import { delimiter, dirname, join, relative } from 'node:path';
import { Readable } from 'node:stream';
import type { ReadableStream as WebReadableStream } from 'node:stream/web';
import {
  TRANSCRIPTION_MESSAGES,
  WHISPER_MODELS,
  WHISPER_MODEL_IDS,
  WHISPER_RELEASE,
  buildAudioExtractArgs,
  buildWhisperArgs,
  getWhisperEngineAsset,
  isWhisperModelId,
  parseWhisperDetectedLanguage,
  parseWhisperProgress,
  parseWhisperSrt,
  recommendWhisperModel,
  selectWhisperModel,
  sha256Matches,
  unsupportedPlatformMessage,
  whisperThreads,
  type TranscriptCue,
  type TranscriptionErrorCode,
  type WhisperEngineAsset,
  type WhisperModelAsset,
  type WhisperModelId,
} from '@kayzen-flux/core';
import { runProcess } from './engine.js';

export class TranscriptionError extends Error {
  constructor(public readonly code: TranscriptionErrorCode, message: string = TRANSCRIPTION_MESSAGES[code]) {
    super(message);
    this.name = 'TranscriptionError';
  }
}

export type WhisperTarget = 'engine' | WhisperModelId;

export function isWhisperTarget(v: unknown): v is WhisperTarget {
  return v === 'engine' || isWhisperModelId(v);
}

/** Sources de téléchargement : celles de packages/core en production, remplaçables uniquement dans les tests. */
export interface WhisperSources {
  engine: WhisperEngineAsset | null;
  models: Record<WhisperModelId, WhisperModelAsset>;
}

export interface WhisperDeps {
  dataDir: string;
  ffmpegPath?: string;
  platform?: string;
  arch?: string;
  sources?: Partial<WhisperSources>;
}

export interface InstallProgress {
  target: WhisperTarget;
  phase: 'download' | 'verify' | 'extract' | 'check';
  receivedBytes: number;
  totalBytes: number;
}

export interface WhisperStatus {
  supported: boolean;
  platform: string;
  unsupportedReason: string | null;
  ready: boolean;
  engine: { installed: boolean; release: string; file: string | null; sizeBytes: number | null; source: string | null };
  models: Array<{ id: WhisperModelId; label: string; hint: string; sizeBytes: number; installed: boolean; source: string }>;
  recommendedModel: WhisperModelId;
  installing: InstallProgress | null;
  lastError: { target: WhisperTarget; code: TranscriptionErrorCode; message: string } | null;
}

interface EngineState {
  release: string;
  sha256: string;
  binary: string;
  libDirs: string[];
}

interface PersistedState {
  engine?: EngineState;
}

export interface TranscribeOptions {
  preferredModel: WhisperModelId;
  language: string;
  signal?: AbortSignal;
  onProgress?: (percent: number, label: string) => void;
}

export interface TranscribeResult {
  cues: TranscriptCue[];
  lang: string;
  model: WhisperModelId;
}

const SHARED_LIB = /\.(so(\.\d+)*|dll|dylib)$/i;

/**
 * Transcription 100 % locale avec whisper.cpp. Le moteur et les modèles ne sont téléchargés
 * qu'à la demande (après confirmation de la taille), depuis leurs sources officielles, puis vérifiés
 * par empreinte SHA-256 épinglée dans le code. Aucun média ne quitte l'ordinateur.
 */
export class WhisperManager extends EventEmitter {
  private readonly root: string;
  private readonly platform: string;
  private readonly arch: string;
  private readonly sources: WhisperSources;
  private state: PersistedState = {};
  private installing: InstallProgress | null = null;
  private installAbort: AbortController | null = null;
  private installDone: Promise<void> = Promise.resolve();
  private lastError: WhisperStatus['lastError'] = null;
  private runChain: Promise<unknown> = Promise.resolve();
  private lastEmit = 0;

  constructor(private readonly deps: WhisperDeps) {
    super();
    this.root = join(deps.dataDir, 'whisper');
    this.platform = deps.platform ?? process.platform;
    this.arch = deps.arch ?? process.arch;
    this.sources = {
      engine: deps.sources?.engine !== undefined ? deps.sources.engine : getWhisperEngineAsset(this.platform, this.arch),
      models: deps.sources?.models ?? WHISPER_MODELS,
    };
  }

  async init(): Promise<void> {
    await mkdir(join(this.root, 'models'), { recursive: true });
    try {
      this.state = JSON.parse(await readFile(join(this.root, 'state.json'), 'utf8')) as PersistedState;
    } catch {
      this.state = {};
    }
    // Restes d'une transcription interrompue (fichiers audio temporaires).
    await rm(join(this.root, 'tmp'), { recursive: true, force: true });
  }

  get supported(): boolean {
    return this.sources.engine !== null;
  }

  async status(): Promise<WhisperStatus> {
    const engineInstalled = await this.engineInstalled();
    const installed = await this.installedModels();
    const asset = this.sources.engine;
    return {
      supported: this.supported,
      platform: `${this.platform}-${this.arch}`,
      unsupportedReason: this.supported ? null : unsupportedPlatformMessage(this.platform, this.arch),
      ready: this.supported && engineInstalled && installed.length > 0,
      engine: {
        installed: engineInstalled,
        release: WHISPER_RELEASE,
        file: asset?.file ?? null,
        sizeBytes: asset?.approxBytes ?? null,
        source: asset?.url ?? null,
      },
      models: WHISPER_MODEL_IDS.map((id) => ({
        id,
        label: this.sources.models[id].label,
        hint: this.sources.models[id].hint,
        sizeBytes: this.sources.models[id].sizeBytes,
        installed: installed.includes(id),
        source: this.sources.models[id].url,
      })),
      recommendedModel: recommendWhisperModel(totalmem()),
      installing: this.installing ? { ...this.installing } : null,
      lastError: this.lastError,
    };
  }

  /** Taille annoncée à l'utilisateur pour la confirmation. */
  expectedBytes(target: WhisperTarget): number | null {
    if (target === 'engine') return this.sources.engine?.approxBytes ?? null;
    return this.sources.models[target].sizeBytes;
  }

  /**
   * Démarre un téléchargement après confirmation explicite : `confirmedBytes` doit être la taille
   * affichée à l'utilisateur. Rend la main immédiatement ; la progression est émise par l'événement « status ».
   */
  install(target: WhisperTarget, confirmedBytes: unknown): void {
    if (!this.supported) throw new TranscriptionError('unsupported_platform', unsupportedPlatformMessage(this.platform, this.arch));
    const expected = this.expectedBytes(target);
    if (expected === null || confirmedBytes !== expected) throw new TranscriptionError('confirmation_required');
    if (this.installing) throw new TranscriptionError('busy');
    this.lastError = null;
    this.installAbort = new AbortController();
    this.installing = { target, phase: 'download', receivedBytes: 0, totalBytes: expected };
    this.emitStatus(true);
    const signal = this.installAbort.signal;
    this.installDone = (target === 'engine' ? this.installEngine(signal) : this.installModel(target, signal))
      .catch((err: unknown) => {
        const e = err instanceof TranscriptionError ? err : signal.aborted ? new TranscriptionError('cancelled', 'Téléchargement annulé.') : new TranscriptionError('download_failed');
        this.lastError = { target, code: e.code, message: e.message };
      })
      .finally(() => {
        this.installing = null;
        this.installAbort = null;
        this.emitStatus(true);
      });
  }

  cancelInstall(): boolean {
    if (!this.installAbort) return false;
    this.installAbort.abort();
    return true;
  }

  /** Attend la fin du téléchargement en cours (tests et arrêt propre). */
  waitInstall(): Promise<void> {
    return this.installDone;
  }

  async uninstall(target: WhisperTarget): Promise<void> {
    if (this.installing) throw new TranscriptionError('busy');
    if (target === 'engine') {
      await rm(join(this.root, 'engine'), { recursive: true, force: true });
      delete this.state.engine;
      await this.persist();
    } else {
      await rm(this.modelPath(target), { force: true });
    }
    this.emitStatus(true);
  }

  /** Vrai si le moteur et au moins un modèle sont prêts. */
  async isReady(): Promise<boolean> {
    return this.supported && (await this.engineInstalled()) && (await this.installedModels()).length > 0;
  }

  /** Transcrit un fichier audio ou vidéo local. Une seule transcription à la fois (calcul intensif). */
  transcribe(mediaPath: string, opts: TranscribeOptions): Promise<TranscribeResult> {
    const run = this.runChain.then(() => this.doTranscribe(mediaPath, opts));
    this.runChain = run.catch(() => undefined);
    return run;
  }

  // ---------- Interne ----------

  private modelPath(id: WhisperModelId): string {
    return join(this.root, 'models', this.sources.models[id].file);
  }

  private async installedModels(): Promise<WhisperModelId[]> {
    const out: WhisperModelId[] = [];
    for (const id of WHISPER_MODEL_IDS) {
      const info = await stat(this.modelPath(id)).catch(() => null);
      if (info?.isFile() && info.size === this.sources.models[id].sizeBytes) out.push(id);
    }
    return out;
  }

  private async engineInstalled(): Promise<boolean> {
    const e = this.state.engine;
    if (!e || !this.sources.engine || e.sha256 !== this.sources.engine.sha256) return false;
    return (await stat(join(this.root, 'engine', e.binary)).catch(() => null))?.isFile() ?? false;
  }

  private emitStatus(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastEmit < 300) return;
    this.lastEmit = now;
    void this.status().then((s) => this.emit('status', s));
  }

  private onProgress(received: number): void {
    if (!this.installing) return;
    this.installing.receivedBytes = received;
    this.emitStatus();
  }

  private setPhase(phase: InstallProgress['phase']): void {
    if (!this.installing) return;
    this.installing.phase = phase;
    this.emitStatus(true);
  }

  /** Télécharge vers un fichier .part en calculant l'empreinte au fil de l'eau. */
  private async download(url: string, dest: string, maxBytes: number, signal: AbortSignal): Promise<{ sha256: string; bytes: number }> {
    let res: Response;
    try {
      res = await fetch(url, { redirect: 'follow', signal });
    } catch (err) {
      if (signal.aborted) throw err;
      throw new TranscriptionError('download_failed');
    }
    if (!res.ok || !res.body) throw new TranscriptionError('download_failed', `${TRANSCRIPTION_MESSAGES.download_failed} (HTTP ${res.status})`);
    const hash = createHash('sha256');
    const out = createWriteStream(dest);
    let received = 0;
    try {
      for await (const chunk of Readable.fromWeb(res.body as unknown as WebReadableStream<Uint8Array>)) {
        const buf = chunk as Buffer;
        received += buf.length;
        if (received > maxBytes) throw new TranscriptionError('size_mismatch');
        hash.update(buf);
        if (!out.write(buf)) await once(out, 'drain');
        this.onProgress(received);
      }
      out.end();
      await once(out, 'close');
    } catch (err) {
      out.destroy();
      await rm(dest, { force: true });
      throw err;
    }
    return { sha256: hash.digest('hex'), bytes: received };
  }

  private async installModel(id: WhisperModelId, signal: AbortSignal): Promise<void> {
    const asset = this.sources.models[id];
    const target = this.modelPath(id);
    const part = `${target}.part`;
    await mkdir(dirname(target), { recursive: true });
    const { sha256, bytes } = await this.download(asset.url, part, asset.sizeBytes, signal);
    this.setPhase('verify');
    if (bytes !== asset.sizeBytes) {
      await rm(part, { force: true });
      throw new TranscriptionError('size_mismatch');
    }
    if (!sha256Matches(sha256, asset.sha256)) {
      await rm(part, { force: true });
      throw new TranscriptionError('checksum_mismatch');
    }
    await rename(part, target);
  }

  private async installEngine(signal: AbortSignal): Promise<void> {
    const asset = this.sources.engine;
    if (!asset) throw new TranscriptionError('unsupported_platform');
    const work = join(this.root, `.engine-${randomUUID()}`);
    const archive = join(work, asset.file);
    const extracted = join(work, 'x');
    await mkdir(extracted, { recursive: true });
    try {
      // Taille seulement approximative côté GitHub : marge de 25 % pour borner le téléchargement.
      const { sha256 } = await this.download(asset.url, archive, Math.ceil(asset.approxBytes * 1.25), signal);
      this.setPhase('verify');
      if (!sha256Matches(sha256, asset.sha256)) throw new TranscriptionError('checksum_mismatch');

      this.setPhase('extract');
      const tar = this.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
      // bsdtar (Windows) lit aussi les .zip ; GNU tar et bsdtar refusent les chemins en « .. ».
      const res = await collect(tar, ['-xf', archive, '-C', extracted]);
      if (res.code !== 0) throw new TranscriptionError('extract_failed');
      const files = await walk(extracted, 6);
      const binary = files.find((f) => basenameOf(f) === asset.binaryName);
      if (!binary) throw new TranscriptionError('extract_failed', `${TRANSCRIPTION_MESSAGES.extract_failed} (${asset.binaryName} absent de l'archive)`);
      const libDirs = [...new Set(files.filter((f) => SHARED_LIB.test(f)).map((f) => dirname(f)))];
      if (this.platform !== 'win32') await chmod(binary, 0o755);

      this.setPhase('check');
      const check = await collect(binary, ['--help'], libEnv(this.platform, [dirname(binary), ...libDirs]));
      if (check.code !== 0 && !/usage/i.test(check.output)) throw new TranscriptionError('engine_broken');

      const final = join(this.root, 'engine');
      await rm(final, { recursive: true, force: true });
      await rename(extracted, final);
      this.state.engine = {
        release: WHISPER_RELEASE,
        sha256: asset.sha256,
        binary: relative(extracted, binary),
        libDirs: libDirs.map((d) => relative(extracted, d)),
      };
      await this.persist();
    } finally {
      await rm(work, { recursive: true, force: true });
    }
  }

  private async persist(): Promise<void> {
    const file = join(this.root, 'state.json');
    await writeFile(`${file}.tmp`, JSON.stringify(this.state, null, 2), 'utf8');
    await rename(`${file}.tmp`, file);
  }

  private async doTranscribe(mediaPath: string, opts: TranscribeOptions): Promise<TranscribeResult> {
    if (!this.supported) throw new TranscriptionError('unsupported_platform', unsupportedPlatformMessage(this.platform, this.arch));
    const engine = this.state.engine;
    const model = selectWhisperModel(opts.preferredModel, await this.installedModels());
    if (!engine || !(await this.engineInstalled()) || !model) throw new TranscriptionError('not_installed');
    if (!(await stat(mediaPath).catch(() => null))?.isFile()) throw new TranscriptionError('missing_file');
    if (opts.signal?.aborted) throw new TranscriptionError('cancelled');

    const tmp = join(this.root, 'tmp', randomUUID());
    await mkdir(tmp, { recursive: true });
    const engineDir = join(this.root, 'engine');
    try {
      // 1. Audio WAV 16 kHz mono (ffmpeg, programme séparé).
      opts.onProgress?.(0, 'Extraction de l’audio');
      const wav = join(tmp, 'audio.wav');
      const ff = await this.run(this.deps.ffmpegPath ?? 'ffmpeg', buildAudioExtractArgs(mediaPath, wav), undefined, opts.signal, () => undefined);
      if (ff.cancelled) throw new TranscriptionError('cancelled');
      if (ff.code !== 0) throw new TranscriptionError('audio_failed');

      // 2. Reconnaissance vocale.
      opts.onProgress?.(5, 'Transcription locale');
      let detected: string | null = null;
      const outBase = join(tmp, 'out');
      const args = buildWhisperArgs({
        modelPath: this.modelPath(model),
        wavPath: wav,
        outputBase: outBase,
        language: opts.language,
        threads: whisperThreads(cpus().length),
      });
      const env = libEnv(this.platform, [dirname(join(engineDir, engine.binary)), ...engine.libDirs.map((d) => join(engineDir, d))]);
      const wh = await this.run(join(engineDir, engine.binary), args, env, opts.signal, (line) => {
        detected = detected ?? parseWhisperDetectedLanguage(line);
        const pct = parseWhisperProgress(line);
        if (pct !== null) opts.onProgress?.(5 + Math.round(pct * 0.94), `Transcription locale ${pct} %`);
      });
      if (wh.cancelled) throw new TranscriptionError('cancelled');
      if (wh.code !== 0) throw new TranscriptionError('whisper_failed');
      const srt = await readFile(`${outBase}.srt`, 'utf8').catch(() => null);
      if (srt === null) throw new TranscriptionError('whisper_failed');
      const cues = parseWhisperSrt(srt);
      if (!cues.length) throw new TranscriptionError('empty');
      return { cues, lang: detected ?? (opts.language === 'auto' ? 'détectée automatiquement' : opts.language), model };
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  }

  private run(binary: string, args: string[], env: NodeJS.ProcessEnv | undefined, signal: AbortSignal | undefined, onLine: (l: string) => void) {
    const handle = runProcess(binary, args, onLine, { env, splitCarriageReturn: true, missingMessage: 'Programme introuvable' });
    const onAbort = () => handle.cancel();
    signal?.addEventListener('abort', onAbort, { once: true });
    return handle.done.finally(() => signal?.removeEventListener('abort', onAbort));
  }
}

function basenameOf(p: string): string {
  return p.split(/[\\/]/).pop() ?? p;
}

/** Variables d'environnement pour trouver les bibliothèques partagées livrées avec le moteur. */
function libEnv(platform: string, dirs: string[]): NodeJS.ProcessEnv {
  const unique = [...new Set(dirs)];
  if (platform === 'win32') return { PATH: [...unique, process.env.PATH ?? ''].join(delimiter) };
  if (platform === 'darwin') return { DYLD_LIBRARY_PATH: [...unique, process.env.DYLD_LIBRARY_PATH ?? ''].filter(Boolean).join(delimiter) };
  return { LD_LIBRARY_PATH: [...unique, process.env.LD_LIBRARY_PATH ?? ''].filter(Boolean).join(delimiter) };
}

async function walk(dir: string, depth: number): Promise<string[]> {
  if (depth < 0) return [];
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full, depth - 1)));
    else if (entry.isFile() || entry.isSymbolicLink()) out.push(full);
  }
  return out;
}

async function collect(binary: string, args: string[], env?: NodeJS.ProcessEnv): Promise<{ code: number | null; output: string }> {
  let output = '';
  const handle = runProcess(binary, args, (l) => {
    if (output.length < 20_000) output += `${l}\n`;
  }, { env });
  const timer = setTimeout(() => handle.cancel(), 120_000);
  const { code } = await handle.done;
  clearTimeout(timer);
  return { code, output };
}

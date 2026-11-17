import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import {
  SUMMARY_MESSAGES,
  TRANSCRIPTION_MESSAGES,
  buildDownloadArgs,
  buildMergePrompt,
  buildSummaryMarkdown,
  buildSummaryPrompt,
  buildTranscript,
  classifyEngineError,
  cleanModelOutput,
  parseSubtitles,
  splitForSummary,
  summaryPathFor,
  transcriptToPlainText,
  whisperTranscriptNote,
  parseEngineLine,
  PRESETS,
  LIMITS,
  type MediaInfo,
  type Phase,
  type PresetId,
} from '@kayzen-flux/core';
import { runEngine, type RunHandle } from './engine.js';
import type { JsonStore, LibraryItem } from './store.js';
import { TranscriptionError, type WhisperManager } from './whisper.js';
import { SummaryError, type OllamaClient } from './ollama.js';

/** Taille des morceaux de transcription envoyés au modèle local (≈ 3 000 jetons). */
const SUMMARY_CHUNK_CHARS = 12_000;

export interface JobRequest {
  url: string;
  preset: PresetId;
  sponsorBlock: boolean;
  embedMetadata: boolean;
  playlist: boolean;
  subtitles: boolean;
  splitChapters?: boolean;
  normalizeAudio?: boolean;
  transcript?: boolean;
  /** Abonnement à l'origine de la tâche (téléchargement automatique). */
  subscriptionId?: string | null;
  info?: Pick<MediaInfo, 'title' | 'author' | 'thumbnail' | 'durationSec' | 'site' | 'entryCount'> | null;
}

export type JobKind = 'download' | 'transcription' | 'summary';

export interface Job {
  id: string;
  kind: JobKind;
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

interface Deps {
  binary: string;
  ffmpegPath?: string;
  allowLocal: boolean;
  store: JsonStore;
  dataDir: string;
  whisper?: WhisperManager;
  ollama?: OllamaClient;
}

/** File d'attente des téléchargements, exécutés localement en parallèle limité. */
export class JobQueue extends EventEmitter {
  private jobs = new Map<string, Job>();
  private handles = new Map<string, RunHandle>();
  private requests = new Map<string, JobRequest>();
  private pendingLibrary = new Map<string, Promise<void>[]>();
  /** Tâches locales (transcription, résumé) annulables. */
  private aborts = new Map<string, AbortController>();

  constructor(private readonly deps: Deps) {
    super();
  }

  list(): Job[] {
    return [...this.jobs.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  /** Valide la demande (lève une erreur si refusée) puis la met en file. */
  enqueue(req: JobRequest): Job {
    const settings = this.deps.store.getSettings();
    // Validation immédiate : URL, préréglage autorisé, options.
    buildDownloadArgs({
      url: req.url,
      preset: req.preset,
      outputDir: settings.downloadDir,
      allowLocal: this.deps.allowLocal,
      splitChapters: req.splitChapters,
      normalizeAudio: req.normalizeAudio,
      transcript: req.transcript,
    });
    const job: Job = {
      id: randomUUID(),
      kind: 'download',
      url: req.url,
      preset: req.preset,
      presetLabel: PRESETS[req.preset].label,
      title: req.info?.title ?? req.url,
      author: req.info?.author ?? null,
      thumbnail: req.info?.thumbnail ?? null,
      site: req.info?.site ?? '',
      playlist: req.playlist,
      phase: 'queued',
      label: 'En attente',
      percent: null,
      speed: null,
      eta: null,
      downloaded: null,
      total: null,
      playlistIndex: null,
      entryCount: req.info?.entryCount ?? 1,
      files: [],
      libraryIds: [],
      error: null,
      createdAt: new Date().toISOString(),
      finishedAt: null,
      options: [
        req.sponsorBlock && 'SponsorBlock',
        req.normalizeAudio && PRESETS[req.preset].kind === 'audio' && 'Volume normalisé',
        req.splitChapters && 'Chapitres',
        req.transcript && 'Transcription',
        req.subtitles && 'Sous-titres',
      ].filter((x): x is string => typeof x === 'string'),
      subscriptionId: req.subscriptionId ?? null,
      transcripts: [],
    };
    this.jobs.set(job.id, job);
    this.requests.set(job.id, req);
    this.emitJob(job);
    this.pump();
    return job;
  }

  cancel(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (job.phase === 'queued') {
      this.finish(job, 'cancelled', 'Annulé');
      return true;
    }
    const handle = this.handles.get(id);
    if (handle) {
      handle.cancel();
      return true;
    }
    const abort = this.aborts.get(id);
    if (abort) {
      abort.abort();
      return true;
    }
    return false;
  }

  remove(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || this.handles.has(id) || this.aborts.has(id) || job.phase === 'queued') return false;
    this.jobs.delete(id);
    this.requests.delete(id);
    this.emit('removed', id);
    return true;
  }

  private running(): number {
    return this.handles.size;
  }

  private pump(): void {
    const settings = this.deps.store.getSettings();
    const max = Math.min(settings.maxParallel, LIMITS.maxParallelJobs);
    // Ordre d'insertion = premier arrivé, premier servi.
    for (const job of this.jobs.values()) {
      if (this.running() >= max) return;
      if (job.phase === 'queued') void this.start(job);
    }
  }

  private async start(job: Job): Promise<void> {
    const req = this.requests.get(job.id);
    if (!req) return;
    const settings = this.deps.store.getSettings();
    job.phase = 'fetching';
    job.label = 'Connexion à la source';
    this.emitJob(job);

    let args: string[];
    try {
      await mkdir(settings.downloadDir, { recursive: true });
      args = buildDownloadArgs({
        url: req.url,
        preset: req.preset,
        outputDir: settings.downloadDir,
          filenameTemplate: settings.filenameTemplate,
        splitChapters: req.splitChapters,
        normalizeAudio: req.normalizeAudio,
        transcript: req.transcript,
        sponsorBlock: req.sponsorBlock,
        embedMetadata: req.embedMetadata,
        playlist: req.playlist,
        subtitles: req.subtitles,
        ffmpegLocation: this.deps.ffmpegPath,
        archiveFile: req.playlist ? join(this.deps.dataDir, 'playlist-archive.txt') : undefined,
        allowLocal: this.deps.allowLocal,
      });
    } catch (err) {
      this.finish(job, 'error', 'Échec', (err as Error).message);
      return;
    }

    let lastError: string | null = null;
    let lastEmit = 0;
    const handle = runEngine(this.deps.binary, args, (line) => {
      const ev = parseEngineLine(line);
      switch (ev.type) {
        case 'progress':
          job.phase = 'downloading';
          job.label = ev.status === 'finished' ? 'Téléchargement terminé' : 'Téléchargement';
          job.percent = ev.percent;
          job.speed = ev.speed;
          job.eta = ev.eta;
          job.downloaded = ev.downloaded;
          job.total = ev.total;
          job.playlistIndex = ev.playlistIndex;
          break;
        case 'phase':
          job.phase = 'processing';
          job.label = ev.label;
          break;
        case 'file': {
          job.files.push(ev.path);
          const pending = this.pendingLibrary.get(job.id) ?? [];
          pending.push(this.addToLibrary(job, req, ev.path));
          this.pendingLibrary.set(job.id, pending);
          break;
        }
        case 'meta':
          // Complète les informations quand la tâche a été créée sans aperçu (abonnements, extension).
          if (!job.playlist) {
            if (ev.title && job.title === job.url) job.title = ev.title;
            job.author = job.author ?? ev.author;
            job.thumbnail = job.thumbnail ?? ev.thumbnail;
            if (ev.site && !job.site) job.site = ev.site;
            req.info = { title: job.title, author: job.author, thumbnail: job.thumbnail, durationSec: req.info?.durationSec ?? ev.durationSec, site: job.site, entryCount: job.entryCount };
          }
          break;
        case 'error':
          lastError = ev.message;
          break;
        case 'log':
          return;
      }
      const now = Date.now();
      if (ev.type !== 'progress' || now - lastEmit > 250) {
        lastEmit = now;
        this.emitJob(job);
      }
    });
    this.handles.set(job.id, handle);
    const { code, cancelled } = await handle.done;
    this.handles.delete(job.id);

    if (cancelled) this.finish(job, 'cancelled', 'Annulé');
    else if (code === 0) {
      await Promise.all(this.pendingLibrary.get(job.id) ?? []);
      if (req.transcript) {
        job.phase = 'processing';
        job.label = 'Création de la transcription';
        this.emitJob(job);
        const abort = new AbortController();
        this.aborts.set(job.id, abort);
        try {
          await this.writeTranscripts(job, abort.signal);
        } finally {
          this.aborts.delete(job.id);
        }
      }
      // La tâche a pu être annulée pendant la transcription locale.
      if ((job.phase as Phase) !== 'cancelled') this.finish(job, 'done', job.transcripts.length || !req.transcript ? 'Terminé' : job.label);
    }
    else this.finish(job, 'error', 'Échec', classifyEngineError(lastError ?? '').message);
    this.pump();
  }

  private async addToLibrary(job: Job, req: JobRequest, path: string): Promise<void> {
    let size = 0;
    try {
      size = (await stat(path)).size;
    } catch {
      /* fichier déplacé : on garde l'entrée avec taille 0 */
    }
    const fileName = basename(path);
    const item: Omit<LibraryItem, 'id' | 'createdAt' | 'favorite'> = {
      title: req.playlist ? fileName.replace(/\.[^.]+$/, '') : job.title,
      author: job.author,
      site: job.site,
      preset: job.preset,
      filePath: path,
      fileName,
      sizeBytes: size,
      durationSec: req.playlist ? null : (req.info?.durationSec ?? null),
      thumbnail: req.playlist ? null : job.thumbnail,
      sourceUrl: job.url,
    };
    const saved = await this.deps.store.addItem(item);
    job.libraryIds.push(saved.id);
    this.emit('library', saved);
    this.emitJob(job);
  }

  /**
   * Convertit les sous-titres téléchargés en transcription Markdown (fr en priorité).
   * Sans sous-titres : reconnaissance vocale locale (whisper.cpp) si elle est installée.
   */
  private async writeTranscripts(job: Job, signal: AbortSignal): Promise<void> {
    const missing: number[] = [];
    for (const [i, file] of job.files.entries()) {
      const dir = dirname(file);
      const stem = basename(file, extname(file));
      let names: string[] = [];
      try {
        names = await readdir(dir);
      } catch {
        continue;
      }
      const subs = names
        .filter((n) => n.startsWith(`${stem}.`) && /\.(srt|vtt)$/i.test(n))
        .sort((a, b) => rank(a) - rank(b));
      const chosen = subs[0];
      if (!chosen) {
        missing.push(i);
        continue;
      }
      const lang = chosen.slice(stem.length + 1).replace(/\.(srt|vtt)$/i, '');
      try {
        const cues = parseSubtitles(await readFile(join(dir, chosen), 'utf8'));
        if (!cues.length) continue;
        const target = join(dir, `${stem}.transcription.md`);
        await writeFile(target, buildTranscript(cues, { title: job.title, source: job.url, lang }), 'utf8');
        job.transcripts.push(target);
        const libId = job.libraryIds[i];
        if (libId) {
          const updated = await this.deps.store.patchItem(libId, { transcriptPath: target });
          if (updated) this.emit('library', { ...updated });
        }
      } catch {
        /* sous-titres illisibles : on continue */
      }
    }
    if (!missing.length) return;
    const whisper = this.deps.whisper;
    if (!whisper || !(await whisper.isReady())) {
      if (!job.transcripts.length) {
        job.label = whisper?.supported
          ? 'Aucun sous-titre : installez la transcription locale (Paramètres) pour transcrire l’audio'
          : 'Aucun sous-titre disponible pour la transcription';
      }
      return;
    }
    for (const i of missing) {
      if (signal.aborted) break;
      try {
        await this.whisperTranscript(job, job.files[i]!, job.libraryIds[i], signal);
      } catch (err) {
        if (err instanceof TranscriptionError && err.code === 'cancelled') {
          this.finish(job, 'cancelled', 'Annulé');
          return;
        }
        job.label = err instanceof TranscriptionError ? err.message : TRANSCRIPTION_MESSAGES.whisper_failed;
      }
    }
  }

  /** Transcription par reconnaissance vocale locale, au même format Markdown que les sous-titres. */
  private async whisperTranscript(job: Job, file: string, libId: string | undefined, signal: AbortSignal): Promise<void> {
    const whisper = this.deps.whisper;
    if (!whisper) throw new TranscriptionError('not_installed');
    const settings = this.deps.store.getSettings();
    let lastEmit = 0;
    const result = await whisper.transcribe(file, {
      preferredModel: settings.whisperModel,
      language: settings.whisperLanguage,
      signal,
      onProgress: (pct, label) => {
        job.phase = 'processing';
        job.label = label;
        job.percent = pct;
        const now = Date.now();
        if (now - lastEmit > 250) {
          lastEmit = now;
          this.emitJob(job);
        }
      },
    });
    const target = join(dirname(file), `${basename(file, extname(file))}.transcription.md`);
    const title = job.kind === 'download' && job.playlist ? basename(file, extname(file)) : job.title;
    await writeFile(target, buildTranscript(result.cues, { title, source: job.url, lang: result.lang, note: whisperTranscriptNote(result.model) }), 'utf8');
    job.transcripts.push(target);
    if (libId) {
      const updated = await this.deps.store.patchItem(libId, { transcriptPath: target });
      if (updated) this.emit('library', { ...updated });
    }
  }

  /** Crée une tâche locale (transcription ou résumé) rattachée à un élément de la bibliothèque. */
  private localJob(kind: Exclude<JobKind, 'download'>, item: LibraryItem, option: string): Job {
    const job: Job = {
      id: randomUUID(),
      kind,
      url: item.sourceUrl,
      preset: item.preset,
      presetLabel: PRESETS[item.preset].label,
      title: item.title,
      author: item.author,
      thumbnail: item.thumbnail,
      site: item.site,
      playlist: false,
      phase: 'queued',
      label: 'En attente',
      percent: null,
      speed: null,
      eta: null,
      downloaded: null,
      total: null,
      playlistIndex: null,
      entryCount: 1,
      files: [item.filePath],
      libraryIds: [item.id],
      error: null,
      createdAt: new Date().toISOString(),
      finishedAt: null,
      options: [option],
      subscriptionId: null,
      transcripts: [],
    };
    this.jobs.set(job.id, job);
    this.emitJob(job);
    return job;
  }

  /** Transcrit localement un fichier déjà présent dans la bibliothèque. */
  async transcribeItem(item: LibraryItem): Promise<Job> {
    const whisper = this.deps.whisper;
    if (!whisper?.supported) throw new TranscriptionError('unsupported_platform');
    if (!(await whisper.isReady())) throw new TranscriptionError('not_installed');
    const job = this.localJob('transcription', item, 'Transcription locale');
    const abort = new AbortController();
    this.aborts.set(job.id, abort);
    void this.whisperTranscript(job, item.filePath, item.id, abort.signal)
      .then(() => this.finish(job, 'done', 'Transcription terminée'))
      .catch((err: unknown) => {
        if (err instanceof TranscriptionError && err.code === 'cancelled') this.finish(job, 'cancelled', 'Annulé');
        else this.finish(job, 'error', 'Échec', err instanceof TranscriptionError ? err.message : TRANSCRIPTION_MESSAGES.whisper_failed);
      })
      .finally(() => this.aborts.delete(job.id));
    return job;
  }

  /** Résume une transcription avec un modèle Ollama local ; le résultat est enregistré à côté de la transcription. */
  async summarizeItem(item: LibraryItem, model: string): Promise<Job> {
    const ollama = this.deps.ollama;
    if (!ollama) throw new SummaryError('unavailable');
    if (!item.transcriptPath) throw new SummaryError('no_transcript');
    const markdown = await readFile(item.transcriptPath, 'utf8').catch(() => null);
    if (markdown === null) throw new SummaryError('no_transcript', 'Transcription déplacée ou supprimée.');
    const status = await ollama.status();
    if (!status.available) throw new SummaryError('unavailable');
    if (!status.models.some((m) => m.name === model)) throw new SummaryError('model_missing');

    const job = this.localJob('summary', item, `Résumé · ${model}`);
    const abort = new AbortController();
    this.aborts.set(job.id, abort);
    const transcriptPath = item.transcriptPath;
    const run = async () => {
      const parts = splitForSummary(transcriptToPlainText(markdown), SUMMARY_CHUNK_CHARS);
      if (!parts.length || !parts.some((p) => p.trim())) throw new SummaryError('no_transcript');
      const steps = parts.length > 1 ? parts.length + 1 : 1;
      const progress = (done: number) => {
        job.phase = 'processing';
        job.percent = Math.round((done / steps) * 100);
        job.label = steps > 1 ? `Résumé local (étape ${Math.min(done + 1, steps)}/${steps})` : 'Résumé local en cours';
        this.emitJob(job);
      };
      progress(0);
      let summary: string;
      if (parts.length === 1) {
        summary = await ollama.generate(model, buildSummaryPrompt({ title: item.title, text: parts[0]! }), { signal: abort.signal });
      } else {
        const partials: string[] = [];
        for (const [i, text] of parts.entries()) {
          partials.push(cleanModelOutput(await ollama.generate(model, buildSummaryPrompt({ title: item.title, text, part: i + 1, total: parts.length }), { signal: abort.signal })));
          progress(i + 1);
        }
        summary = await ollama.generate(model, buildMergePrompt({ title: item.title, partials }), { signal: abort.signal });
      }
      if (!cleanModelOutput(summary)) throw new SummaryError('bad_response');
      const target = summaryPathFor(transcriptPath);
      await writeFile(target, buildSummaryMarkdown({ title: item.title, model, summary, source: item.sourceUrl }), 'utf8');
      const updated = await this.deps.store.patchItem(item.id, { summaryPath: target });
      if (updated) this.emit('library', { ...updated });
    };
    void run()
      .then(() => this.finish(job, 'done', 'Résumé terminé'))
      .catch((err: unknown) => {
        if (err instanceof SummaryError && err.code === 'cancelled') this.finish(job, 'cancelled', 'Annulé');
        else this.finish(job, 'error', 'Échec', err instanceof SummaryError ? err.message : SUMMARY_MESSAGES.bad_response);
      })
      .finally(() => this.aborts.delete(job.id));
    return job;
  }

  private finish(job: Job, phase: Phase, label: string, error: string | null = null): void {
    job.phase = phase;
    job.label = label;
    job.error = error;
    job.finishedAt = new Date().toISOString();
    if (phase === 'done') job.percent = 100;
    this.emitJob(job);
  }

  private emitJob(job: Job): void {
    if (job.phase === 'done' || job.phase === 'error' || job.phase === 'cancelled') this.pendingLibrary.delete(job.id);
    this.emit('job', { ...job });
  }
}

function rank(name: string): number {
  const n = name.toLowerCase();
  if (/\.fr[.-]/.test(n) || n.includes('.fr.')) return n.includes('orig') ? 0 : 1;
  if (/\.en[.-]/.test(n) || n.includes('.en.')) return 2;
  return 3;
}

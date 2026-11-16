import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdir, stat } from 'node:fs/promises';
import { basename, join } from 'node:path';
import {
  buildDownloadArgs,
  classifyEngineError,
  parseEngineLine,
  PRESETS,
  TIER_LIMITS,
  type MediaInfo,
  type Phase,
  type PresetId,
  type Tier,
} from '@kayzen-flux/core';
import { runEngine, type RunHandle } from './engine.js';
import type { JsonStore, LibraryItem } from './store.js';

export interface JobRequest {
  url: string;
  preset: PresetId;
  sponsorBlock: boolean;
  embedMetadata: boolean;
  playlist: boolean;
  subtitles: boolean;
  info?: Pick<MediaInfo, 'title' | 'author' | 'thumbnail' | 'durationSec' | 'site' | 'entryCount'> | null;
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

interface Deps {
  binary: string;
  ffmpegPath?: string;
  tier: Tier;
  allowLocal: boolean;
  store: JsonStore;
  dataDir: string;
}

/** File d'attente des téléchargements, exécutés localement en parallèle limité. */
export class JobQueue extends EventEmitter {
  private jobs = new Map<string, Job>();
  private handles = new Map<string, RunHandle>();
  private requests = new Map<string, JobRequest>();

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
      tier: this.deps.tier,
      allowLocal: this.deps.allowLocal,
    });
    const job: Job = {
      id: randomUUID(),
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
    return false;
  }

  remove(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || this.handles.has(id) || job.phase === 'queued') return false;
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
    const max = Math.min(settings.maxParallel, TIER_LIMITS[this.deps.tier].maxParallelJobs);
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
        tier: this.deps.tier,
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
        case 'file':
          job.files.push(ev.path);
          void this.addToLibrary(job, req, ev.path);
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
    else if (code === 0) this.finish(job, 'done', 'Terminé');
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

  private finish(job: Job, phase: Phase, label: string, error: string | null = null): void {
    job.phase = phase;
    job.label = label;
    job.error = error;
    job.finishedAt = new Date().toISOString();
    if (phase === 'done') job.percent = 100;
    this.emitJob(job);
  }

  private emitJob(job: Job): void {
    this.emit('job', { ...job });
  }
}

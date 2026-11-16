import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import {
  buildDownloadArgs,
  buildTranscript,
  classifyEngineError,
  parseSubtitles,
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
  splitChapters?: boolean;
  normalizeAudio?: boolean;
  transcript?: boolean;
  /** Abonnement à l'origine de la tâche (téléchargement automatique). */
  subscriptionId?: string | null;
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
  options: string[];
  subscriptionId: string | null;
  transcripts: string[];
}

interface Deps {
  binary: string;
  ffmpegPath?: string;
  getTier: () => Tier;
  allowLocal: boolean;
  store: JsonStore;
  dataDir: string;
}

/** File d'attente des téléchargements, exécutés localement en parallèle limité. */
export class JobQueue extends EventEmitter {
  private jobs = new Map<string, Job>();
  private handles = new Map<string, RunHandle>();
  private requests = new Map<string, JobRequest>();
  private pendingLibrary = new Map<string, Promise<void>[]>();

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
      tier: this.deps.getTier(),
      allowLocal: this.deps.allowLocal,
      splitChapters: req.splitChapters,
      normalizeAudio: req.normalizeAudio,
      transcript: req.transcript,
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
    const max = Math.min(settings.maxParallel, TIER_LIMITS[this.deps.getTier()].maxParallelJobs);
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
        tier: this.deps.getTier(),
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
        await this.writeTranscripts(job);
      }
      this.finish(job, 'done', 'Terminé');
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

  /** Convertit les sous-titres téléchargés en transcription Markdown (fr en priorité). */
  private async writeTranscripts(job: Job): Promise<void> {
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
      if (!chosen) continue;
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
    if (!job.transcripts.length) job.label = 'Aucun sous-titre disponible pour la transcription';
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

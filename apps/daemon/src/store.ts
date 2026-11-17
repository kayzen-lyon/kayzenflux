import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { isFilenameTemplateId, isPresetId, isWhisperLanguage, isWhisperModelId, type FilenameTemplateId, type PresetId, type WhisperModelId } from '@kayzen-flux/core';

export interface Settings {
  downloadDir: string;
  defaultPreset: PresetId;
  sponsorBlock: boolean;
  embedMetadata: boolean;
  subtitles: boolean;
  maxParallel: number;
  filenameTemplate: FilenameTemplateId;
  normalizeAudio: boolean;
  transcript: boolean;
  /**
   * Mise à jour automatique de l'application de bureau : `null` tant que l'utilisateur n'a pas
   * répondu (aucune vérification), puis son choix explicite.
   */
  autoUpdate: boolean | null;
  /** Modèle whisper.cpp préféré pour la transcription locale. */
  whisperModel: WhisperModelId;
  /** Langue parlée (« auto » = détection automatique). */
  whisperLanguage: string;
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

/** Stockage local en fichiers JSON (écriture atomique). Rien ne quitte l'appareil. */
export class JsonStore {
  private settings!: Settings;
  private library: LibraryItem[] = [];
  private writes = Promise.resolve();

  constructor(private readonly dir: string, private readonly defaults: Settings) {}

  async init(): Promise<void> {
    await mkdir(this.dir, { recursive: true });
    const saved = await this.readJson<Partial<Settings>>('settings.json', {});
    this.settings = sanitizeSettings({ ...this.defaults, ...saved }, this.defaults);
    const lib = await this.readJson<LibraryItem[]>('library.json', []);
    this.library = Array.isArray(lib) ? lib : [];
  }

  getSettings(): Settings {
    return { ...this.settings };
  }

  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    // Une valeur invalide conserve le réglage actuel (et non la valeur par défaut) :
    // un consentement déjà donné ou refusé n'est jamais effacé par une requête mal formée.
    this.settings = sanitizeSettings({ ...this.settings, ...patch }, this.settings);
    await this.persist('settings.json', this.settings);
    return this.getSettings();
  }

  listLibrary(): LibraryItem[] {
    return [...this.library].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  getItem(id: string): LibraryItem | undefined {
    return this.library.find((i) => i.id === id);
  }

  async addItem(item: Omit<LibraryItem, 'id' | 'createdAt' | 'favorite'>): Promise<LibraryItem> {
    const full: LibraryItem = { ...item, id: randomUUID(), createdAt: new Date().toISOString(), favorite: false };
    this.library = [full, ...this.library.filter((i) => i.filePath !== item.filePath)];
    await this.persist('library.json', this.library);
    return full;
  }

  async patchItem(id: string, patch: Pick<Partial<LibraryItem>, 'favorite' | 'transcriptPath' | 'summaryPath'>): Promise<LibraryItem | undefined> {
    const item = this.getItem(id);
    if (!item) return undefined;
    if (typeof patch.favorite === 'boolean') item.favorite = patch.favorite;
    if (typeof patch.transcriptPath === 'string') item.transcriptPath = patch.transcriptPath;
    if (typeof patch.summaryPath === 'string') item.summaryPath = patch.summaryPath;
    await this.persist('library.json', this.library);
    return item;
  }

  async removeItem(id: string): Promise<LibraryItem | undefined> {
    const item = this.getItem(id);
    if (!item) return undefined;
    this.library = this.library.filter((i) => i.id !== id);
    await this.persist('library.json', this.library);
    return item;
  }

  async clearLibrary(): Promise<void> {
    this.library = [];
    await this.persist('library.json', this.library);
  }

  async readJsonFile<T>(name: string, fallback: T): Promise<T> {
    return this.readJson(name, fallback);
  }

  writeJsonFile(name: string, data: unknown): Promise<void> {
    return this.persist(name, data);
  }

  private async readJson<T>(name: string, fallback: T): Promise<T> {
    try {
      return JSON.parse(await readFile(join(this.dir, name), 'utf8')) as T;
    } catch {
      return fallback;
    }
  }

  private persist(name: string, data: unknown): Promise<void> {
    const target = join(this.dir, name);
    const tmp = `${target}.${process.pid}.tmp`;
    this.writes = this.writes.then(async () => {
      await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await rename(tmp, target);
    });
    return this.writes;
  }
}

export function sanitizeSettings(input: Partial<Settings>, defaults: Settings): Settings {
  const dir = typeof input.downloadDir === 'string' && input.downloadDir.trim() && !input.downloadDir.trim().startsWith('-')
    ? input.downloadDir.trim()
    : defaults.downloadDir;
  const par = Number(input.maxParallel);
  return {
    downloadDir: dir,
    defaultPreset: isPresetId(input.defaultPreset) ? input.defaultPreset : defaults.defaultPreset,
    sponsorBlock: typeof input.sponsorBlock === 'boolean' ? input.sponsorBlock : defaults.sponsorBlock,
    embedMetadata: typeof input.embedMetadata === 'boolean' ? input.embedMetadata : defaults.embedMetadata,
    subtitles: typeof input.subtitles === 'boolean' ? input.subtitles : defaults.subtitles,
    maxParallel: Number.isInteger(par) && par >= 1 && par <= 10 ? par : defaults.maxParallel,
    filenameTemplate: isFilenameTemplateId(input.filenameTemplate) ? input.filenameTemplate : defaults.filenameTemplate,
    normalizeAudio: typeof input.normalizeAudio === 'boolean' ? input.normalizeAudio : defaults.normalizeAudio,
    transcript: typeof input.transcript === 'boolean' ? input.transcript : defaults.transcript,
    autoUpdate: typeof input.autoUpdate === 'boolean' || input.autoUpdate === null ? input.autoUpdate : defaults.autoUpdate,
    whisperModel: isWhisperModelId(input.whisperModel) ? input.whisperModel : defaults.whisperModel,
    whisperLanguage: isWhisperLanguage(input.whisperLanguage) ? input.whisperLanguage : defaults.whisperLanguage,
  };
}

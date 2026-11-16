import { randomUUID } from 'node:crypto';
import { buildFeedArgs, isPresetId, parseFeed, validateUrl, type PresetId, type Tier } from '@kayzen-flux/core';
import { capture, EngineError } from './engine.js';
import type { JobQueue } from './jobs.js';
import type { JsonStore } from './store.js';

/**
 * Abonnements (Premium) : surveille une chaîne, une playlist ou un flux RSS et
 * télécharge automatiquement les nouveautés, localement.
 */
export interface Subscription {
  id: string;
  url: string;
  title: string;
  preset: PresetId;
  intervalHours: number;
  enabled: boolean;
  seen: string[];
  lastCheck: string | null;
  lastError: string | null;
  lastNew: number;
  createdAt: string;
}

const FILE = 'subscriptions.json';
const MAX_SEEN = 500;
const INTERVALS = [1, 3, 6, 12, 24];

interface Deps {
  binary: string;
  store: JsonStore;
  queue: JobQueue;
  getTier: () => Tier;
  allowLocal: boolean;
  /** Pour les tests : intervalle de la boucle de vérification (ms). */
  tickMs?: number;
}

export class SubscriptionManager {
  private subs: Subscription[] = [];
  private timer: NodeJS.Timeout | null = null;
  private checking = new Set<string>();

  constructor(private readonly deps: Deps) {}

  async init(): Promise<void> {
    const saved = await this.deps.store.readJsonFile<Subscription[]>(FILE, []);
    this.subs = Array.isArray(saved) ? saved : [];
    this.timer = setInterval(() => void this.tick(), this.deps.tickMs ?? 5 * 60_000);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
  }

  list(): Subscription[] {
    return this.subs.map((s) => ({ ...s, seen: [] }));
  }

  private requirePremium(): void {
    if (this.deps.getTier() !== 'premium') throw new EngineError('premium', 'Les abonnements sont réservés à l’offre Premium.');
  }

  async add(input: { url: string; preset?: unknown; intervalHours?: unknown; downloadLatest?: unknown }): Promise<Subscription> {
    this.requirePremium();
    const check = validateUrl(input.url, { allowLocal: this.deps.allowLocal });
    if (!check.ok) throw new EngineError('invalid_url', check.reason);
    if (this.subs.some((s) => s.url === check.url)) throw new EngineError('exists', 'Vous êtes déjà abonné à cette adresse.');
    if (this.subs.length >= 100) throw new EngineError('limit', 'Limite de 100 abonnements atteinte.');

    const feed = await this.fetch(check.url);
    const latest = Math.max(0, Math.min(Number(input.downloadLatest) || 0, 10));
    const sub: Subscription = {
      id: randomUUID(),
      url: check.url,
      title: feed.title,
      preset: isPresetId(input.preset) ? input.preset : this.deps.store.getSettings().defaultPreset,
      intervalHours: INTERVALS.includes(Number(input.intervalHours)) ? Number(input.intervalHours) : 6,
      enabled: true,
      // Les entrées existantes sont marquées « vues », sauf les N plus récentes demandées.
      seen: feed.entries.slice(latest).map((e) => e.id),
      lastCheck: new Date().toISOString(),
      lastError: null,
      lastNew: 0,
      createdAt: new Date().toISOString(),
    };
    this.subs.push(sub);
    for (const entry of feed.entries.slice(0, latest).reverse()) this.enqueue(sub, entry.url, entry.title);
    sub.seen.push(...feed.entries.slice(0, latest).map((e) => e.id));
    sub.lastNew = latest ? Math.min(latest, feed.entries.length) : 0;
    await this.save();
    return { ...sub, seen: [] };
  }

  async update(id: string, patch: { enabled?: unknown; preset?: unknown; intervalHours?: unknown }): Promise<Subscription> {
    const sub = this.get(id);
    if (typeof patch.enabled === 'boolean') sub.enabled = patch.enabled;
    if (isPresetId(patch.preset)) sub.preset = patch.preset;
    if (INTERVALS.includes(Number(patch.intervalHours))) sub.intervalHours = Number(patch.intervalHours);
    await this.save();
    return { ...sub, seen: [] };
  }

  async remove(id: string): Promise<void> {
    this.get(id);
    this.subs = this.subs.filter((s) => s.id !== id);
    await this.save();
  }

  /** Vérifie un abonnement maintenant. Renvoie le nombre de nouveautés mises en file. */
  async checkNow(id: string): Promise<number> {
    this.requirePremium();
    return this.check(this.get(id));
  }

  private get(id: string): Subscription {
    const sub = this.subs.find((s) => s.id === id);
    if (!sub) throw new EngineError('not_found', 'Abonnement introuvable.');
    return sub;
  }

  private async tick(): Promise<void> {
    if (this.deps.getTier() !== 'premium') return;
    const now = Date.now();
    for (const sub of this.subs) {
      if (!sub.enabled) continue;
      const last = sub.lastCheck ? new Date(sub.lastCheck).getTime() : 0;
      if (now - last >= sub.intervalHours * 3_600_000) await this.check(sub).catch(() => undefined);
    }
  }

  private async check(sub: Subscription): Promise<number> {
    if (this.checking.has(sub.id)) return 0;
    this.checking.add(sub.id);
    try {
      const feed = await this.fetch(sub.url);
      const seen = new Set(sub.seen);
      const fresh = feed.entries.filter((e) => !seen.has(e.id));
      for (const entry of fresh.slice().reverse()) this.enqueue(sub, entry.url, entry.title);
      sub.seen = [...fresh.map((e) => e.id), ...sub.seen].slice(0, MAX_SEEN);
      sub.lastNew = fresh.length;
      sub.lastError = null;
      return fresh.length;
    } catch (err) {
      sub.lastError = (err as Error).message;
      throw err;
    } finally {
      sub.lastCheck = new Date().toISOString();
      this.checking.delete(sub.id);
      await this.save();
    }
  }

  private enqueue(sub: Subscription, url: string, title: string): void {
    const s = this.deps.store.getSettings();
    try {
      this.deps.queue.enqueue({
        url,
        preset: sub.preset,
        sponsorBlock: s.sponsorBlock,
        embedMetadata: s.embedMetadata,
        subtitles: s.subtitles,
        normalizeAudio: s.normalizeAudio,
        transcript: s.transcript,
        playlist: false,
        subscriptionId: sub.id,
        info: { title, author: sub.title, thumbnail: null, durationSec: null, site: '', entryCount: 1 },
      });
    } catch {
      /* entrée refusée (URL invalide) : ignorée */
    }
  }

  private async fetch(url: string): Promise<{ title: string; entries: Array<{ id: string; title: string; url: string }> }> {
    const res = await capture(this.deps.binary, buildFeedArgs(url, 15), 120_000);
    if (res.code !== 0) throw new EngineError('feed', 'Impossible de lire cette chaîne ou ce flux.');
    try {
      const feed = parseFeed(JSON.parse(res.stdout));
      // Ne jamais suivre de liens vers des adresses locales, sauf en mode test.
      feed.entries = feed.entries.filter((e) => validateUrl(e.url, { allowLocal: this.deps.allowLocal }).ok);
      return feed;
    } catch {
      throw new EngineError('feed', 'Réponse du flux illisible.');
    }
  }

  private save(): Promise<void> {
    return this.deps.store.writeJsonFile(FILE, this.subs);
  }
}

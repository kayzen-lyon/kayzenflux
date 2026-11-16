/** Code partagé, sans dépendance au navigateur (testable). */

export interface Settings {
  blockAds: boolean;
  sponsorBlock: boolean;
  hideShorts: boolean;
  sendButton: boolean;
  categories: string[];
}

export const DEFAULT_SETTINGS: Settings = {
  blockAds: true,
  sponsorBlock: true,
  hideShorts: false,
  sendButton: true,
  categories: ['sponsor', 'selfpromo', 'interaction'],
};

export const SPONSOR_CATEGORIES: Array<{ id: string; label: string }> = [
  { id: 'sponsor', label: 'Sponsors' },
  { id: 'selfpromo', label: 'Autopromotion' },
  { id: 'interaction', label: 'Rappels d’abonnement' },
  { id: 'intro', label: 'Génériques de début' },
  { id: 'outro', label: 'Génériques de fin' },
];

/** Clés de données publicitaires retirées des réponses du lecteur (même principe que les bloqueurs de pub). */
export const AD_KEYS = ['adPlacements', 'adSlots', 'playerAds', 'adBreakHeartbeatParams', 'adBreakParams'] as const;

/** Supprime récursivement (profondeur limitée) les clés publicitaires d'un objet JSON. Renvoie le nombre de clés retirées. */
export function pruneAds(obj: unknown, depth = 0): number {
  if (!obj || typeof obj !== 'object' || depth > 6) return 0;
  let removed = 0;
  const rec = obj as Record<string, unknown>;
  for (const key of AD_KEYS) {
    if (key in rec) {
      delete rec[key];
      removed++;
    }
  }
  for (const value of Object.values(rec)) {
    if (value && typeof value === 'object') removed += pruneAds(value, depth + 1);
  }
  return removed;
}

/** Identifiant de la vidéo affichée, ou null si la page n'est pas une vidéo. */
export function videoIdFromUrl(href: string): string | null {
  let u: URL;
  try {
    u = new URL(href);
  } catch {
    return null;
  }
  if (!/(^|\.)youtube\.com$/.test(u.hostname) && u.hostname !== 'youtu.be') return null;
  const id = u.hostname === 'youtu.be' ? u.pathname.slice(1) : u.pathname === '/watch' ? u.searchParams.get('v') : /^\/(shorts|live|embed)\/([\w-]{11})/.exec(u.pathname)?.[2] ?? null;
  return id && /^[\w-]{11}$/.test(id) ? id : null;
}

/** URL canonique et propre (sans paramètres de pistage) de la vidéo. */
export function cleanVideoUrl(href: string): string | null {
  const id = videoIdFromUrl(href);
  if (!id) return null;
  const host = new URL(href).hostname === 'music.youtube.com' ? 'music.youtube.com' : 'www.youtube.com';
  return `https://${host}/watch?v=${id}`;
}

/** Lien profond ouvrant l'application de bureau, avec l'adresse pré-remplie. */
export function deepLink(url: string): string {
  return `kayzenflux://add?url=${encodeURIComponent(url)}`;
}

export interface Segment {
  start: number;
  end: number;
  category: string;
  uuid: string;
}

/**
 * Filtre la réponse de l'API SponsorBlock (requête par préfixe de hachage,
 * pour ne pas révéler la vidéo regardée) et garde les segments de la vidéo.
 */
export function segmentsForVideo(response: unknown, videoId: string): Segment[] {
  if (!Array.isArray(response)) return [];
  const entry = response.find((r) => r && typeof r === 'object' && (r as { videoID?: string }).videoID === videoId) as
    | { segments?: Array<{ segment?: [number, number]; category?: string; UUID?: string; actionType?: string }> }
    | undefined;
  return (entry?.segments ?? [])
    .filter((s) => Array.isArray(s.segment) && s.segment.length === 2 && (s.actionType ?? 'skip') === 'skip')
    .map((s) => ({ start: Number(s.segment![0]), end: Number(s.segment![1]), category: String(s.category ?? 'sponsor'), uuid: String(s.UUID ?? '') }))
    .filter((s) => Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start)
    .sort((a, b) => a.start - b.start);
}

/** Segment dans lequel se trouve la lecture, s'il faut sauter. */
export function segmentAt(segments: Segment[], time: number): Segment | null {
  return segments.find((s) => time >= s.start && time < s.end - 0.3) ?? null;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

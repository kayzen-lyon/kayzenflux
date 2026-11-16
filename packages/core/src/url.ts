/**
 * Validation des URL soumises par l'utilisateur avant tout appel au moteur.
 * Objectif : n'accepter que des URL http(s) bien formées, sans identifiants,
 * et refuser les adresses locales/privées (sauf mode test explicite).
 */

export type UrlCheck =
  | { ok: true; url: string; host: string }
  | { ok: false; reason: string };

const MAX_URL_LENGTH = 2048;

const PRIVATE_HOST_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /\.localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^\[?::1\]?$/,
  /^\[?f[cd][0-9a-f]{2}:/i,
  /^\[?fe80:/i,
];

export function isPrivateHost(host: string): boolean {
  return PRIVATE_HOST_PATTERNS.some((re) => re.test(host));
}

export function validateUrl(input: string, opts: { allowLocal?: boolean } = {}): UrlCheck {
  const raw = (input ?? '').trim();
  if (!raw) return { ok: false, reason: 'URL vide.' };
  if (raw.length > MAX_URL_LENGTH) return { ok: false, reason: 'URL trop longue.' };
  if (raw.startsWith('-')) return { ok: false, reason: 'URL invalide.' };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, reason: "Ce texte n'est pas une URL valide." };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'Seules les adresses http et https sont acceptées.' };
  }
  if (parsed.username || parsed.password) {
    return { ok: false, reason: 'Les URL contenant des identifiants sont refusées.' };
  }
  const host = parsed.hostname;
  if (!host) return { ok: false, reason: 'Hôte manquant.' };
  if (!opts.allowLocal && isPrivateHost(host)) {
    return { ok: false, reason: 'Les adresses locales ou privées sont refusées.' };
  }
  return { ok: true, url: parsed.toString(), host };
}

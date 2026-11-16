/**
 * Lien profond envoyé par l'extension : kayzenflux://add?url=<url encodée>
 * Renvoie l'URL de la page à analyser, ou null si le lien est invalide.
 * L'application se contente de PRÉ-REMPLIR le convertisseur : l'utilisateur
 * choisit toujours le format et lance lui-même le téléchargement.
 */
export function parseDeepLink(raw: string): string | null {
  if (typeof raw !== 'string' || raw.length > 4096) return null;
  let link: URL;
  try {
    link = new URL(raw);
  } catch {
    return null;
  }
  if (link.protocol !== 'kayzenflux:') return null;
  const action = (link.hostname || link.pathname.replace(/^\/+/, '')).replace(/\/+$/, '');
  if (action !== 'add') return null;
  const target = link.searchParams.get('url');
  if (!target) return null;
  try {
    const u = new URL(target);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.username || u.password) return null;
    return u.toString();
  } catch {
    return null;
  }
}

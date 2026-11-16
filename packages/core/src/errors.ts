/** Traduit les messages d'erreur du moteur en messages clairs pour l'utilisateur. */

export type EngineErrorCode =
  | 'drm'
  | 'private'
  | 'unavailable'
  | 'geo'
  | 'age'
  | 'login'
  | 'unsupported'
  | 'network'
  | 'rate_limited'
  | 'ffmpeg'
  | 'unknown';

export interface FriendlyError {
  code: EngineErrorCode;
  message: string;
}

const RULES: Array<[RegExp, EngineErrorCode, string]> = [
  [/drm|widevine|playready|fairplay/i, 'drm', 'Ce contenu est protégé (DRM). KAYZEN Flux ne télécharge jamais de contenu chiffré.'],
  [/private video|is private/i, 'private', 'Cette vidéo est privée.'],
  [/sign in to confirm your age|age[- ]restricted|inappropriate for some users/i, 'age', 'Contenu soumis à une restriction d’âge : non pris en charge.'],
  [/not available in your country|geo.?restrict|blocked in your country/i, 'geo', 'Contenu indisponible dans votre pays.'],
  [/members[- ]only|join this channel|login required|requires (a )?login|sign in/i, 'login', 'Ce contenu nécessite un compte ou un abonnement : non pris en charge.'],
  [/unsupported url|no suitable (info)?extractor/i, 'unsupported', 'Ce site n’est pas pris en charge.'],
  [/http error 429|too many requests|rate.?limit/i, 'rate_limited', 'Le site limite temporairement les requêtes. Réessayez dans quelques minutes.'],
  [/video unavailable|has been removed|does not exist|404/i, 'unavailable', 'Ce contenu n’existe plus ou est indisponible.'],
  [/ffmpeg|ffprobe/i, 'ffmpeg', 'Le composant de conversion (ffmpeg) est absent ou a échoué.'],
  [/unable to download|timed out|connection|proxy|resolve host|network/i, 'network', 'Problème de connexion. Vérifiez votre accès à Internet.'],
];

export function classifyEngineError(message: string): FriendlyError {
  for (const [re, code, text] of RULES) {
    if (re.test(message)) return { code, message: text };
  }
  return { code: 'unknown', message: 'Le téléchargement a échoué. Mettez le moteur à jour puis réessayez.' };
}

/**
 * Script exécuté dans le contexte de la page (« MAIN world »), avant le lecteur.
 * Il retire les données publicitaires des réponses du lecteur vidéo, comme le
 * font les bloqueurs de publicité (principe « json-prune »).
 * Il ne lit, ne modifie ni n'envoie aucune autre donnée.
 */
import { pruneAds } from './shared.js';

(() => {
  if (document.documentElement.dataset.kzfDisabled === 'ads') return;
  const report = (n: number) => {
    if (n > 0) window.postMessage({ source: 'kayzen-flux', type: 'ads-pruned', count: n }, location.origin);
  };

  // 1. JSON.parse (réponses chargées dynamiquement)
  const nativeParse = JSON.parse;
  JSON.parse = function (this: unknown, text: string, reviver?: (this: unknown, key: string, value: unknown) => unknown) {
    const value = nativeParse.call(JSON, text, reviver as never);
    if (typeof text === 'string' && text.length > 200 && /"(adPlacements|playerAds|adSlots)"/.test(text)) report(pruneAds(value));
    return value;
  } as typeof JSON.parse;

  // 2. Response.json (fetch)
  const nativeJson = Response.prototype.json;
  Response.prototype.json = async function (this: Response) {
    const value = await nativeJson.call(this);
    if (/\/youtubei\/v1\/(player|next|browse|reel)/.test(this.url)) report(pruneAds(value));
    return value;
  };

  // 3. Variable initiale de la page
  for (const name of ['ytInitialPlayerResponse', 'ytInitialData']) {
    let current: unknown = (window as unknown as Record<string, unknown>)[name];
    if (current) report(pruneAds(current));
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        get: () => current,
        set: (v) => {
          report(pruneAds(v));
          current = v;
        },
      });
    } catch {
      /* propriété verrouillée : les autres protections prennent le relais */
    }
  }
})();

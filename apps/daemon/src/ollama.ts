import { request } from 'node:http';
import {
  OLLAMA_DEFAULT_URL,
  SUMMARY_MESSAGES,
  isLoopbackUrl,
  isOllamaModelName,
  parseOllamaTags,
  type OllamaModel,
  type SummaryErrorCode,
} from '@kayzen-flux/core';

export class SummaryError extends Error {
  constructor(public readonly code: SummaryErrorCode, message: string = SUMMARY_MESSAGES[code]) {
    super(message);
    this.name = 'SummaryError';
  }
}

export interface OllamaStatus {
  available: boolean;
  version: string | null;
  models: OllamaModel[];
}

const MAX_BODY = 8 * 1024 * 1024;

/**
 * Client minimal d'un serveur Ollama installé par l'utilisateur sur CET ordinateur.
 * Seules les adresses de la boucle locale sont acceptées : aucune API cloud, rien n'est envoyé sur Internet.
 * Ollama n'est pas redistribué par KAYZEN Flux.
 */
export class OllamaClient {
  private readonly base: URL;

  constructor(baseUrl: string = OLLAMA_DEFAULT_URL) {
    if (!isLoopbackUrl(baseUrl)) throw new SummaryError('unavailable', 'Seul un serveur Ollama local (127.0.0.1) est autorisé.');
    this.base = new URL(baseUrl);
  }

  /** Détection explicite : GET /api/version puis /api/tags, délai court. */
  async status(): Promise<OllamaStatus> {
    try {
      const version = await this.call('GET', '/api/version', undefined, 1500);
      const tags = await this.call('GET', '/api/tags', undefined, 3000);
      const v = (version.json ?? {}) as { version?: unknown };
      return { available: true, version: typeof v.version === 'string' ? v.version : null, models: parseOllamaTags(tags.json) };
    } catch {
      return { available: false, version: null, models: [] };
    }
  }

  /** Génère une réponse complète (sans flux) avec un modèle installé. */
  async generate(model: string, prompt: string, opts: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<string> {
    if (!isOllamaModelName(model)) throw new SummaryError('model_missing');
    const res = await this.call(
      'POST',
      '/api/generate',
      { model, prompt, stream: false, options: { temperature: 0.2, num_ctx: 8192 } },
      opts.timeoutMs ?? 15 * 60_000,
      opts.signal,
    );
    const body = (res.json ?? {}) as { response?: unknown; error?: unknown };
    if (res.status === 404 || (typeof body.error === 'string' && /not found/i.test(body.error))) throw new SummaryError('model_missing');
    if (res.status !== 200 || typeof body.response !== 'string') throw new SummaryError('bad_response');
    return body.response;
  }

  private call(method: 'GET' | 'POST', path: string, payload: unknown, timeoutMs: number, signal?: AbortSignal): Promise<{ status: number; json: unknown }> {
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(new SummaryError('cancelled'));
      const data = payload === undefined ? undefined : Buffer.from(JSON.stringify(payload));
      const req = request(
        {
          host: this.base.hostname.replace(/^\[|\]$/g, ''),
          port: Number(this.base.port || 80),
          path,
          method,
          headers: data ? { 'content-type': 'application/json', 'content-length': data.length } : {},
        },
        (res) => {
          const chunks: Buffer[] = [];
          let size = 0;
          res.on('data', (c: Buffer) => {
            size += c.length;
            if (size > MAX_BODY) req.destroy(new SummaryError('bad_response'));
            else chunks.push(c);
          });
          res.on('end', () => {
            let json: unknown = null;
            try {
              json = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            } catch {
              /* non JSON */
            }
            resolve({ status: res.statusCode ?? 0, json });
          });
          res.on('error', reject);
        },
      );
      const timer = setTimeout(() => req.destroy(new SummaryError('timeout')), timeoutMs);
      const onAbort = () => req.destroy(new SummaryError('cancelled'));
      signal?.addEventListener('abort', onAbort, { once: true });
      req.on('error', (err) => reject(err instanceof SummaryError ? err : new SummaryError('unavailable')));
      req.on('close', () => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
      });
      if (data) req.write(data);
      req.end();
    });
  }
}

import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, stat, unlink } from 'node:fs/promises';
import { dirname, extname, join, normalize, resolve, sep } from 'node:path';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PRESETS, PRESET_IDS, TIER_LIMITS, isPresetAllowed, isPresetId, validateUrl } from '@kayzen-flux/core';
import { loadConfig, type DaemonConfig } from './config.js';
import { EngineError, engineVersion, fetchInfo, ffmpegVersion, updateEngine } from './engine.js';
import { JobQueue } from './jobs.js';
import { JsonStore } from './store.js';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.opus': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.wav': 'audio/wav',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
};

class HttpError extends Error {
  constructor(public readonly status: number, message: string, public readonly code = 'error') {
    super(message);
  }
}

export interface DaemonHandle {
  server: Server;
  url: string;
  token: string;
  close: () => Promise<void>;
}

export async function startDaemon(config: DaemonConfig): Promise<DaemonHandle> {
  const token = randomBytes(24).toString('hex');
  const store = new JsonStore(config.dataDir, {
    downloadDir: config.defaultDownloadDir,
    defaultPreset: 'mp3-320',
    sponsorBlock: true,
    embedMetadata: true,
    subtitles: false,
    maxParallel: 2,
  });
  await store.init();
  const queue = new JobQueue({
    binary: config.ytdlpPath,
    ffmpegPath: config.ffmpegPath,
    tier: config.tier,
    allowLocal: config.allowLocalUrls,
    store,
    dataDir: config.dataDir,
  });

  const sseClients = new Set<ServerResponse>();
  const broadcast = (event: string, data: unknown) => {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of sseClients) res.write(payload);
  };
  queue.on('job', (job) => broadcast('job', job));
  queue.on('removed', (id) => broadcast('removed', { id }));
  queue.on('library', (item) => broadcast('library', item));

  const allowedHosts = new Set([`127.0.0.1:${config.port}`, `localhost:${config.port}`]);

  const checkToken = (req: IncomingMessage, url: URL) => {
    const given = String(req.headers['x-kayzen-token'] ?? url.searchParams.get('token') ?? '');
    const a = Buffer.from(given);
    const b = Buffer.from(token);
    if (a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401, 'Session invalide. Rechargez la page.', 'unauthorized');
  };

  const handler = async (req: IncomingMessage, res: ServerResponse) => {
    // Protection contre le « DNS rebinding » : seul l'hôte local exact est accepté.
    if (!allowedHosts.has(String(req.headers.host ?? ''))) throw new HttpError(403, 'Hôte refusé.', 'forbidden_host');
    const url = new URL(req.url ?? '/', `http://${req.headers.host}`);
    const path = url.pathname;
    setSecurityHeaders(res);

    if (path.startsWith('/api/')) {
      checkToken(req, url);
      if (req.method !== 'GET' && req.headers['content-type']?.split(';')[0] !== 'application/json' && req.method !== 'DELETE') {
        throw new HttpError(415, 'JSON attendu.');
      }
      return routeApi(req, res, url);
    }
    if (path.startsWith('/media/')) {
      checkToken(req, url);
      return serveMedia(req, res, decodeURIComponent(path.slice('/media/'.length)));
    }
    return serveUi(res, path);
  };

  const routeApi = async (req: IncomingMessage, res: ServerResponse, url: URL) => {
    const m = req.method ?? 'GET';
    const p = url.pathname;
    let match: RegExpExecArray | null;

    if (m === 'GET' && p === '/api/status') {
      const [ytdlp, ffmpeg] = await Promise.all([
        engineVersion(config.ytdlpPath),
        ffmpegVersion(config.ffmpegPath ?? 'ffmpeg'),
      ]);
      return json(res, 200, {
        app: config.appVersion,
        engine: ytdlp,
        ffmpeg,
        tier: config.tier,
        limits: TIER_LIMITS[config.tier],
        presets: PRESET_IDS.map((id) => ({ ...PRESETS[id], args: undefined, allowed: isPresetAllowed(id, config.tier) })),
      });
    }
    if (m === 'GET' && p === '/api/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      res.write(`event: snapshot\ndata: ${JSON.stringify({ jobs: queue.list() })}\n\n`);
      sseClients.add(res);
      const ping = setInterval(() => res.write(': ping\n\n'), 20_000);
      req.on('close', () => {
        clearInterval(ping);
        sseClients.delete(res);
      });
      return;
    }
    if (m === 'POST' && p === '/api/info') {
      const body = await readBody(req);
      const target = String(body.url ?? '');
      const check = validateUrl(target, { allowLocal: config.allowLocalUrls });
      if (!check.ok) throw new HttpError(400, check.reason, 'invalid_url');
      try {
        const info = await fetchInfo(config.ytdlpPath, check.url, { allowLocal: config.allowLocalUrls, playlist: body.playlist === true });
        return json(res, 200, info);
      } catch (err) {
        if (err instanceof EngineError) throw new HttpError(422, err.message, err.code);
        throw err;
      }
    }
    if (m === 'GET' && p === '/api/jobs') return json(res, 200, queue.list());
    if (m === 'POST' && p === '/api/jobs') {
      const body = await readBody(req);
      const settings = store.getSettings();
      const preset = isPresetId(body.preset) ? body.preset : settings.defaultPreset;
      try {
        const job = queue.enqueue({
          url: String(body.url ?? ''),
          preset,
          sponsorBlock: bool(body.sponsorBlock, settings.sponsorBlock),
          embedMetadata: bool(body.embedMetadata, settings.embedMetadata),
          subtitles: bool(body.subtitles, settings.subtitles),
          playlist: body.playlist === true,
          info: sanitizeInfo(body.info),
        });
        return json(res, 201, job);
      } catch (err) {
        throw new HttpError(400, (err as Error).message, 'rejected');
      }
    }
    if (m === 'POST' && (match = /^\/api\/jobs\/([\w-]+)\/cancel$/.exec(p))) {
      if (!queue.cancel(match[1]!)) throw new HttpError(404, 'Tâche introuvable ou déjà terminée.');
      return json(res, 200, { ok: true });
    }
    if (m === 'DELETE' && (match = /^\/api\/jobs\/([\w-]+)$/.exec(p))) {
      if (!queue.remove(match[1]!)) throw new HttpError(409, 'Tâche en cours : annulez-la d’abord.');
      return json(res, 200, { ok: true });
    }
    if (m === 'GET' && p === '/api/library') return json(res, 200, store.listLibrary());
    if (m === 'DELETE' && p === '/api/library') {
      await store.clearLibrary();
      return json(res, 200, { ok: true });
    }
    if (m === 'PATCH' && (match = /^\/api\/library\/([\w-]+)$/.exec(p))) {
      const body = await readBody(req);
      const item = await store.patchItem(match[1]!, { favorite: body.favorite === true });
      if (!item) throw new HttpError(404, 'Élément introuvable.');
      return json(res, 200, item);
    }
    if (m === 'DELETE' && (match = /^\/api\/library\/([\w-]+)$/.exec(p))) {
      const item = await store.removeItem(match[1]!);
      if (!item) throw new HttpError(404, 'Élément introuvable.');
      if (url.searchParams.get('deleteFile') === '1') await unlink(item.filePath).catch(() => undefined);
      return json(res, 200, { ok: true });
    }
    if (m === 'POST' && (match = /^\/api\/library\/([\w-]+)\/reveal$/.exec(p))) {
      const item = store.getItem(match[1]!);
      if (!item) throw new HttpError(404, 'Élément introuvable.');
      openFolder(dirname(item.filePath));
      return json(res, 200, { ok: true });
    }
    if (m === 'POST' && p === '/api/folder/open') {
      openFolder(store.getSettings().downloadDir);
      return json(res, 200, { ok: true });
    }
    if (m === 'GET' && p === '/api/settings') return json(res, 200, store.getSettings());
    if (m === 'PUT' && p === '/api/settings') {
      const body = await readBody(req);
      if (isPresetId(body.defaultPreset) && !isPresetAllowed(body.defaultPreset, config.tier)) {
        throw new HttpError(400, 'Ce format est réservé à l’offre Premium.');
      }
      return json(res, 200, await store.updateSettings(body));
    }
    if (m === 'POST' && p === '/api/engine/update') return json(res, 200, await updateEngine(config.ytdlpPath));
    throw new HttpError(404, 'Route inconnue.');
  };

  const serveMedia = async (req: IncomingMessage, res: ServerResponse, id: string) => {
    // On ne sert QUE des fichiers enregistrés dans la bibliothèque (aucun chemin arbitraire).
    const item = store.getItem(id);
    if (!item) throw new HttpError(404, 'Média introuvable.');
    const info = await stat(item.filePath).catch(() => null);
    if (!info?.isFile()) throw new HttpError(404, 'Fichier déplacé ou supprimé.');
    const type = MIME[extname(item.filePath).toLowerCase()] ?? 'application/octet-stream';
    const range = /^bytes=(\d*)-(\d*)$/.exec(String(req.headers.range ?? ''));
    if (range) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Math.min(Number(range[2]), info.size - 1) : info.size - 1;
      if (start > end || start >= info.size) {
        res.writeHead(416, { 'Content-Range': `bytes */${info.size}` });
        return res.end();
      }
      res.writeHead(206, {
        'Content-Type': type,
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${info.size}`,
        'Accept-Ranges': 'bytes',
      });
      return void createReadStream(item.filePath, { start, end }).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': type, 'Content-Length': info.size, 'Accept-Ranges': 'bytes' });
    createReadStream(item.filePath).pipe(res);
  };

  const uiRoot = resolve(config.uiDir);
  const serveUi = async (res: ServerResponse, path: string) => {
    const rel = normalize(decodeURIComponent(path)).replace(/^([/\\])+/, '');
    let file = resolve(uiRoot, rel || 'index.html');
    if (file !== uiRoot && !file.startsWith(uiRoot + sep)) throw new HttpError(403, 'Accès refusé.');
    let info = await stat(file).catch(() => null);
    if (!info?.isFile()) {
      file = join(uiRoot, 'index.html'); // routage côté client
      info = await stat(file).catch(() => null);
      if (!info) throw new HttpError(404, 'Interface non compilée : lancez « pnpm build ».');
    }
    if (file.endsWith('index.html')) {
      const html = (await readFile(file, 'utf8')).replace('__KAYZEN_TOKEN__', token);
      res.writeHead(200, { 'Content-Type': MIME['.html']!, 'Cache-Control': 'no-store' });
      return res.end(html);
    }
    res.writeHead(200, {
      'Content-Type': MIME[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': file.includes(`${sep}assets${sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    createReadStream(file).pipe(res);
  };

  const server = createServer((req, res) => {
    handler(req, res).catch((err: unknown) => {
      const status = err instanceof HttpError ? err.status : 500;
      const code = err instanceof HttpError ? err.code : 'internal';
      const message = err instanceof HttpError ? err.message : 'Erreur interne.';
      if (!(err instanceof HttpError)) console.error('[kayzen-flux]', err);
      if (!res.headersSent) json(res, status, { error: message, code });
      else res.end();
    });
  });

  await new Promise<void>((ok, ko) => {
    server.once('error', ko);
    server.listen(config.port, config.host, () => ok());
  });

  return {
    server,
    token,
    url: `http://127.0.0.1:${config.port}/`,
    close: () =>
      new Promise((ok) => {
        for (const c of sseClients) c.end();
        server.close(() => ok());
      }),
  };
}

function setSecurityHeaders(res: ServerResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; img-src 'self' https: data:; media-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'",
  );
}

function json(res: ServerResponse, status: number, data: unknown) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > 64 * 1024) throw new HttpError(413, 'Requête trop volumineuse.');
    chunks.push(chunk as Buffer);
  }
  if (!chunks.length) return {};
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    /* ignoré */
  }
  throw new HttpError(400, 'JSON invalide.');
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function str(v: unknown, max = 500): string | null {
  return typeof v === 'string' && v.length <= max ? v : null;
}

function sanitizeInfo(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const thumb = str(r.thumbnail, 2048);
  return {
    title: str(r.title) ?? 'Sans titre',
    author: str(r.author),
    thumbnail: thumb && /^https?:\/\//.test(thumb) ? thumb : null,
    durationSec: typeof r.durationSec === 'number' ? r.durationSec : null,
    site: str(r.site, 100) ?? '',
    entryCount: typeof r.entryCount === 'number' ? r.entryCount : 1,
  };
}

function openFolder(dir: string) {
  const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
  try {
    spawn(cmd, [dir], { shell: false, detached: true, stdio: 'ignore' }).on('error', () => undefined).unref();
  } catch {
    /* pas d'environnement graphique */
  }
}

// Lancement direct : `node dist/server.js`
const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const here = dirname(fileURLToPath(import.meta.url));
  const uiDir = process.env.KAYZEN_UI_DIR ?? resolve(here, '../../ui/dist');
  startDaemon(loadConfig(process.env, uiDir))
    .then((h) => {
      console.log(`\n  KAYZEN Flux est prêt : ${h.url}\n  (accessible uniquement depuis cet ordinateur)\n`);
    })
    .catch((err: NodeJS.ErrnoException) => {
      console.error(err.code === 'EADDRINUSE' ? 'Le port est déjà utilisé : KAYZEN Flux tourne peut-être déjà.' : err);
      process.exit(1);
    });
}

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { createReadStream, existsSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { startDaemon, type DaemonHandle } from '../src/server.js';
import { loadConfig } from '../src/config.js';

/**
 * Test de bout en bout réel : un fichier vidéo généré par ffmpeg est servi en
 * local, puis téléchargé et converti en MP3 par le vrai moteur yt-dlp.
 */
let media: Server;
let mediaUrl = '';
let daemon: DaemonHandle;
let base = '';
let root = '';
const PORT = 49000 + Math.floor(Math.random() * 500);

function call(method: string, path: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Promise<{ status: number; data: any; raw: string; headers: Record<string, unknown> }>((ok, ko) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = request(
      {
        host: '127.0.0.1',
        port: PORT,
        path,
        method,
        headers: {
          'x-kayzen-token': daemon.token,
          ...(payload ? { 'content-type': 'application/json' } : {}),
          ...headers,
        },
      },
      (res) => {
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let data: unknown = null;
          try {
            data = JSON.parse(raw);
          } catch {
            /* non JSON */
          }
          ok({ status: res.statusCode ?? 0, data, raw, headers: res.headers });
        });
      },
    );
    req.on('error', ko);
    if (payload) req.write(payload);
    req.end();
  });
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'kzf-'));
  const src = join(root, 'source');
  await mkdir(src);
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=2:size=320x240:rate=25', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2', '-shortest', '-c:v', 'libx264', '-c:a', 'aac', join(src, 'demo.mp4')]);
  media = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'video/mp4' });
    createReadStream(join(src, 'demo.mp4')).pipe(res);
  });
  await new Promise<void>((ok) => media.listen(0, '127.0.0.1', () => ok()));
  const addr = media.address();
  mediaUrl = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}/demo.mp4`;

  const ui = join(root, 'ui');
  await mkdir(ui);
  await writeFile(join(ui, 'index.html'), '<meta name="kayzen-token" content="__KAYZEN_TOKEN__">');
  daemon = await startDaemon(
    loadConfig(
      { KAYZEN_PORT: String(PORT), KAYZEN_DATA_DIR: join(root, 'data'), KAYZEN_DOWNLOAD_DIR: join(root, 'out'), KAYZEN_ALLOW_LOCAL: '1' },
      ui,
    ),
  );
  base = `http://127.0.0.1:${PORT}`;
}, 30_000);

afterAll(async () => {
  await daemon?.close();
  media?.close();
});

describe('sécurité du démon', () => {
  it('refuse un hôte différent (anti DNS rebinding)', async () => {
    const r = await call('GET', '/api/status', undefined, { host: 'evil.example:80' });
    expect(r.status).toBe(403);
  });
  it('refuse une requête API sans jeton', async () => {
    const r = await call('GET', '/api/status', undefined, { 'x-kayzen-token': 'mauvais' });
    expect(r.status).toBe(401);
  });
  it('refuse un POST non JSON (protection CSRF)', async () => {
    const r = await call('POST', '/api/jobs', undefined, { 'content-type': 'text/plain' });
    expect(r.status).toBe(415);
  });
  it("injecte le jeton dans l'interface et bloque la traversée de dossier", async () => {
    const page = await call('GET', '/');
    expect(page.raw).toContain(daemon.token);
    const trav = await call('GET', '/..%2F..%2Fetc%2Fpasswd');
    expect(trav.raw).not.toContain('root:');
  });
  it('accepte la 4K comme format par défaut sans licence (application gratuite)', async () => {
    const r = await call('PUT', '/api/settings', { defaultPreset: 'mp4-2160' });
    expect(r.status).toBe(200);
    expect(r.data.defaultPreset).toBe('mp4-2160');
    await call('PUT', '/api/settings', { defaultPreset: 'mp3-320' });
  });
  it('refuse une URL invalide', async () => {
    const r = await call('POST', '/api/info', { url: 'file:///etc/passwd' });
    expect(r.status).toBe(400);
  });
});

describe('téléchargement réel de bout en bout', () => {
  it('affiche le statut du moteur', async () => {
    const r = await call('GET', '/api/status');
    expect(r.status).toBe(200);
    expect(r.data.engine).toMatch(/^\d{4}\./);
    expect(r.data.ffmpeg).toBeTruthy();
    expect(r.data.limits.maxParallelJobs).toBe(6);
  });

  it('récupère les infos, convertit en MP3, alimente la bibliothèque et lit le média', async () => {
    const info = await call('POST', '/api/info', { url: mediaUrl });
    expect(info.status).toBe(200);
    expect(info.data.drm).toBe(false);

    const created = await call('POST', '/api/jobs', { url: mediaUrl, preset: 'mp3-320', sponsorBlock: false, embedMetadata: true, info: info.data });
    expect(created.status).toBe(201);
    const id = created.data.id;

    let job: any;
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 500));
      job = (await call('GET', '/api/jobs')).data.find((j: any) => j.id === id);
      if (['done', 'error', 'cancelled'].includes(job.phase) && job.libraryIds.length) break;
      if (job.phase === 'error') break;
    }
    expect(job.error).toBeNull();
    expect(job.phase).toBe('done');
    expect(job.files[0]).toMatch(/\.mp3$/);
    expect(existsSync(job.files[0])).toBe(true);

    const lib = await call('GET', '/api/library');
    expect(lib.data.length).toBe(1);
    expect(lib.data[0].sizeBytes).toBeGreaterThan(1000);

    const ranged = await call('GET', `/media/${lib.data[0].id}`, undefined, { range: 'bytes=0-99' });
    expect(ranged.status).toBe(206);
    expect(ranged.headers['content-range']).toMatch(/^bytes 0-99\//);
  }, 90_000);

  it('télécharge aussi en MP4 1080p un lien direct à la résolution inconnue', async () => {
    const created = await call('POST', '/api/jobs', { url: mediaUrl, preset: 'mp4-1080', sponsorBlock: false, embedMetadata: false });
    expect(created.status).toBe(201);
    let job: any;
    for (let i = 0; i < 120; i++) {
      await new Promise((r) => setTimeout(r, 500));
      job = (await call('GET', '/api/jobs')).data.find((j: any) => j.id === created.data.id);
      if (job.phase === 'error' || (job.phase === 'done' && job.libraryIds.length)) break;
    }
    expect(job.error).toBeNull();
    expect(job.files[0]).toMatch(/\.mp4$/);
  }, 90_000);

  it('enregistre les réglages en les validant', async () => {
    const r = await call('PUT', '/api/settings', { maxParallel: 99, sponsorBlock: false, defaultPreset: 'm4a' });
    expect(r.data.maxParallel).toBe(2);
    expect(r.data.sponsorBlock).toBe(false);
    expect(r.data.defaultPreset).toBe('m4a');
  });
});

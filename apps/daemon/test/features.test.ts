import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { startDaemon, type DaemonHandle } from '../src/server.js';
import { loadConfig } from '../src/config.js';

// ---------- Bout en bout : normalisation, transcription, abonnements (gratuits pour tous) ----------
let media: Server;
let daemon: DaemonHandle;
let root = '';
let feedXml = '';
const PORT = 49600 + Math.floor(Math.random() * 300);
let MEDIA = '';

function call(method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; data: any }>((ok, ko) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = request(
      { host: '127.0.0.1', port: PORT, path, method, headers: { 'x-kayzen-token': daemon.token, ...(payload ? { 'content-type': 'application/json' } : {}) } },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => ok({ status: res.statusCode ?? 0, data: raw ? JSON.parse(raw) : null }));
      },
    );
    req.on('error', ko);
    if (payload) req.write(payload);
    req.end();
  });
}

async function waitJobs(pred: (jobs: any[]) => boolean, ms = 60_000) {
  const end = Date.now() + ms;
  let jobs: any[] = [];
  while (Date.now() < end) {
    jobs = (await call('GET', '/api/jobs')).data;
    if (pred(jobs)) return jobs;
    await new Promise((r) => setTimeout(r, 400));
  }
  return jobs;
}

const item = (id: string, n: number) =>
  `<item><title>Épisode ${n}</title><guid>${id}</guid><link>${MEDIA}/demo.mp4?e=${n}</link><enclosure url="${MEDIA}/demo.mp4?e=${n}" type="video/mp4"/></item>`;

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'kzf-features-'));
  const src = join(root, 'src');
  await mkdir(src);
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'testsrc=duration=3:size=320x240:rate=25', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-shortest', '-c:v', 'libx264', '-c:a', 'aac', join(src, 'demo.mp4')]);
  await writeFile(join(src, 'demo.vtt'), 'WEBVTT\n\n00:00:00.500 --> 00:00:01.500\nBonjour et bienvenue\n\n00:00:01.500 --> 00:00:03.000\nCeci est un test de transcription\n');
  await writeFile(join(src, 'page.html'), '<html><head><title>Conférence démo</title></head><body><video><source src="demo.mp4" type="video/mp4"><track kind="subtitles" src="demo.vtt" srclang="fr"></video></body></html>');
  media = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0]!;
    if (path === '/feed.xml') {
      res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
      return res.end(feedXml);
    }
    const types: Record<string, string> = { '/demo.mp4': 'video/mp4', '/demo.vtt': 'text/vtt', '/page.html': 'text/html' };
    const type = types[path];
    if (!type) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': type });
    createReadStream(join(src, path.slice(1))).pipe(res);
  });
  await new Promise<void>((ok) => media.listen(0, '127.0.0.1', () => ok()));
  const addr = media.address();
  MEDIA = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
  feedXml = `<?xml version="1.0"?><rss version="2.0"><channel><title>Podcast démo</title>${item('ep2', 2)}${item('ep1', 1)}</channel></rss>`;

  const ui = join(root, 'ui');
  await mkdir(ui);
  await writeFile(join(ui, 'index.html'), 'ok');
  const config = loadConfig({ KAYZEN_PORT: String(PORT), KAYZEN_DATA_DIR: join(root, 'data'), KAYZEN_DOWNLOAD_DIR: join(root, 'out'), KAYZEN_ALLOW_LOCAL: '1' }, ui);
  daemon = await startDaemon({ ...config, subscriptionTickMs: 3_600_000 });
}, 30_000);

afterAll(async () => {
  await daemon?.close();
  media?.close();
});

describe('fonctions avancées gratuites (bout en bout)', () => {
  it('expose tout le catalogue sans licence ni offre', async () => {
    const status = await call('GET', '/api/status');
    expect(status.status).toBe(200);
    expect(status.data).not.toHaveProperty('tier');
    expect(status.data).not.toHaveProperty('license');
    expect(status.data).not.toHaveProperty('devLicenseKey');
    expect(status.data.limits).toEqual({ maxPlaylistItems: 5000, maxParallelJobs: 6 });
    expect(status.data.presets.every((p: { allowed: boolean; tier?: unknown }) => p.allowed && p.tier === undefined)).toBe(true);
  });

  it('ne connaît plus la route de licence', async () => {
    expect((await call('GET', '/api/license')).status).toBe(404);
    expect((await call('POST', '/api/license', { key: 'KZF1.a.b' })).status).toBe(404);
    expect((await call('DELETE', '/api/license')).status).toBe(404);
  });

  it('accepte les réglages autrefois réservés (FLAC, normalisation, transcription)', async () => {
    const r = await call('PUT', '/api/settings', { defaultPreset: 'flac', normalizeAudio: true, transcript: true });
    expect(r.status).toBe(200);
    expect(r.data).toMatchObject({ defaultPreset: 'flac', normalizeAudio: true, transcript: true });
    await call('PUT', '/api/settings', { defaultPreset: 'mp3-320', normalizeAudio: false, transcript: false });
  });

  it('normalise le volume d’un MP3', async () => {
    const created = await call('POST', '/api/jobs', { url: `${MEDIA}/demo.mp4?n=1`, preset: 'mp3-320', normalizeAudio: true, embedMetadata: false, sponsorBlock: false });
    expect(created.status).toBe(201);
    const jobs = await waitJobs((js) => ['done', 'error'].includes(js.find((j) => j.id === created.data.id)?.phase));
    const job = jobs.find((j) => j.id === created.data.id);
    expect(job.error).toBeNull();
    expect(job.options).toContain('Volume normalisé');
  }, 90_000);

  it('produit une transcription Markdown à partir des sous-titres', async () => {
    const created = await call('POST', '/api/jobs', { url: `${MEDIA}/page.html`, preset: 'm4a', transcript: true, embedMetadata: false, sponsorBlock: false });
    expect(created.status).toBe(201);
    const jobs = await waitJobs((js) => ['done', 'error'].includes(js.find((j) => j.id === created.data.id)?.phase));
    const job = jobs.find((j) => j.id === created.data.id);
    expect(job.error).toBeNull();
    expect(job.transcripts).toHaveLength(1);
    const md = await readFile(job.transcripts[0], 'utf8');
    expect(md).toContain('Bonjour et bienvenue Ceci est un test de transcription');
    const t = await call('GET', `/api/library/${job.libraryIds[0]}/transcript`);
    expect(t.data.markdown).toContain('# Conférence démo');
  }, 90_000);

  it('abonnement : télécharge le dernier épisode puis les nouveautés', async () => {
    const before = (await call('GET', '/api/jobs')).data.length;
    const sub = await call('POST', '/api/subscriptions', { url: `${MEDIA}/feed.xml`, preset: 'm4a', downloadLatest: 1 });
    expect(sub.status).toBe(201);
    expect(sub.data.title).toBe('Podcast démo');
    let jobs = await waitJobs((js) => js.length === before + 1);
    expect(jobs.filter((j) => j.subscriptionId === sub.data.id)).toHaveLength(1);

    // Rien de nouveau.
    expect((await call('POST', `/api/subscriptions/${sub.data.id}/check`, {})).data.found).toBe(0);

    // Un nouvel épisode paraît.
    feedXml = feedXml.replace('<title>Podcast démo</title>', `<title>Podcast démo</title>${item('ep3', 3)}`);
    expect((await call('POST', `/api/subscriptions/${sub.data.id}/check`, {})).data.found).toBe(1);
    jobs = await waitJobs((js) => js.filter((j) => j.subscriptionId === sub.data.id && j.phase === 'done').length === 2);
    expect(jobs.filter((j) => j.subscriptionId === sub.data.id && j.phase === 'done')).toHaveLength(2);

    expect((await call('DELETE', `/api/subscriptions/${sub.data.id}`)).status).toBe(200);
    expect((await call('GET', '/api/subscriptions')).data).toHaveLength(0);
  }, 120_000);
});

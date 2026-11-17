import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer, request, type Server } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { chmod, mkdir, mkdtemp, readFile, readdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { WHISPER_MODELS, type WhisperEngineAsset } from '@kayzen-flux/core';
import { startDaemon, type DaemonHandle } from '../src/server.js';
import { loadConfig } from '../src/config.js';
import { WhisperManager, TranscriptionError } from '../src/whisper.js';
import { OllamaClient, SummaryError } from '../src/ollama.js';

/**
 * Transcription locale et résumé local, de bout en bout, avec de FAUX binaires :
 *  - un faux whisper-cli (script Node) livré dans une vraie archive tar.gz servie en local ;
 *  - un faux modèle de 4 Kio ;
 *  - un faux serveur Ollama sur 127.0.0.1.
 * Aucun gros modèle n'est téléchargé. ffmpeg (réel) extrait l'audio.
 */
const FAKE_WHISPER = `#!/usr/bin/env node
const fs = require('fs');
const args = process.argv.slice(2);
if (args.includes('--help')) { console.error('usage: whisper-cli [options] file0.wav'); process.exit(0); }
// Simule une bibliothèque partagée livrée à côté du moteur.
if (!(process.env.LD_LIBRARY_PATH || '').includes('/lib')) { console.error('error while loading shared libraries: libwhisper.so.1'); process.exit(127); }
const get = (f) => args[args.indexOf(f) + 1];
const wav = fs.readFileSync(get('-f'));
if (wav.toString('latin1', 0, 4) !== 'RIFF') { console.error('not a wav'); process.exit(2); }
console.error('whisper_full_with_state: auto-detected language: fr (p = 0.97)');
const total = process.env.FAKE_WHISPER_SLOW ? 60 : 4;
let i = 0;
const tick = () => {
  i++;
  console.error('whisper_print_progress_callback: progress = ' + Math.round((i / total) * 100) + '%');
  if (i < total) return setTimeout(tick, process.env.FAKE_WHISPER_SLOW ? 200 : 5);
  fs.writeFileSync(get('-of') + '.srt', '1\\n00:00:00,000 --> 00:00:01,500\\n Bonjour, ceci est une transcription locale.\\n\\n2\\n00:00:01,500 --> 00:00:02,000\\n [BLANK_AUDIO]\\n\\n3\\n00:00:02,000 --> 00:00:03,000\\n Fin du test.\\n');
};
tick();
`;

let root = '';
let files: Server;
let filesUrl = '';
let ollamaServer: Server;
let ollamaUrl = '';
const ollamaPrompts: string[] = [];
let daemon: DaemonHandle;
let api = '';
const MODEL = randomBytes(4096);
const sha = (b: Buffer) => createHash('sha256').update(b).digest('hex');
let archive: Buffer;

function call(method: string, path: string, body?: unknown) {
  return new Promise<{ status: number; data: any }>((ok, ko) => {
    const u = new URL(path, api);
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = request(
      { host: u.hostname, port: u.port, path: u.pathname, method, headers: { 'x-kayzen-token': daemon.token, ...(payload ? { 'content-type': 'application/json' } : {}) } },
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

async function until<T>(fn: () => Promise<T>, pred: (v: T) => boolean, ms = 60_000): Promise<T> {
  const end = Date.now() + ms;
  let v = await fn();
  while (!pred(v) && Date.now() < end) {
    await new Promise((r) => setTimeout(r, 150));
    v = await fn();
  }
  return v;
}

const job = async (id: string) =>
  until(
    async () => ((await call('GET', '/api/jobs')).data as any[]).find((j) => j.id === id),
    (j) => ['done', 'error', 'cancelled'].includes(j?.phase),
  );

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'kzf-whisper-'));
  // Archive au format des releases officielles : binaire + bibliothèque partagée.
  const pkg = join(root, 'pkg');
  await mkdir(join(pkg, 'build', 'bin'), { recursive: true });
  await mkdir(join(pkg, 'build', 'lib'), { recursive: true });
  await writeFile(join(pkg, 'build', 'bin', 'whisper-cli'), FAKE_WHISPER);
  await chmod(join(pkg, 'build', 'bin', 'whisper-cli'), 0o755);
  await writeFile(join(pkg, 'build', 'lib', 'libwhisper.so.1'), 'fausse bibliothèque');
  execFileSync('tar', ['-czf', join(root, 'engine.tar.gz'), '-C', pkg, 'build']);
  archive = await readFile(join(root, 'engine.tar.gz'));

  const src = join(root, 'src');
  await mkdir(src);
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-c:a', 'aac', join(src, 'voix.m4a')]);
  const voice = await readFile(join(src, 'voix.m4a'));

  files = createServer((req, res) => {
    const path = (req.url ?? '/').split('?')[0];
    const body = path === '/engine.tar.gz' ? archive : path === '/ggml-base.bin' || path === '/ggml-small.bin' ? MODEL : path === '/voix.m4a' ? voice : null;
    if (!body) {
      res.writeHead(404);
      return res.end();
    }
    res.writeHead(200, { 'Content-Type': path === '/voix.m4a' ? 'audio/mp4' : 'application/octet-stream', 'Content-Length': body.length });
    res.end(body);
  });
  await new Promise<void>((ok) => files.listen(0, '127.0.0.1', () => ok()));
  filesUrl = `http://127.0.0.1:${(files.address() as { port: number }).port}`;

  ollamaServer = createServer((req, res) => {
    let raw = '';
    req.on('data', (c) => (raw += c));
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.url === '/api/version') return res.end(JSON.stringify({ version: '0.9.0' }));
      if (req.url === '/api/tags') return res.end(JSON.stringify({ models: [{ name: 'mistral:7b', size: 4_000_000_000, details: { parameter_size: '7B' } }, { name: 'nomic-embed-text:latest' }] }));
      if (req.url === '/api/generate') {
        const body = JSON.parse(raw) as { model: string; prompt: string; stream: boolean };
        ollamaPrompts.push(body.prompt);
        if (body.model !== 'mistral:7b') {
          res.statusCode = 404;
          return res.end(JSON.stringify({ error: `model "${body.model}" not found` }));
        }
        return res.end(JSON.stringify({ response: '<think>brouillon</think>## En bref\nUn test de transcription locale.\n## Points clés\n- [00:00] Bonjour', done: true }));
      }
      res.statusCode = 404;
      res.end('{}');
    });
  });
  await new Promise<void>((ok) => ollamaServer.listen(0, '127.0.0.1', () => ok()));
  ollamaUrl = `http://127.0.0.1:${(ollamaServer.address() as { port: number }).port}`;

  const engine: WhisperEngineAsset = {
    platform: 'linux-x64',
    file: 'engine.tar.gz',
    url: `${filesUrl}/engine.tar.gz`,
    sha256: sha(archive),
    approxBytes: archive.length,
    archive: 'tar.gz',
    binaryName: 'whisper-cli',
  };
  const ui = join(root, 'ui');
  await mkdir(ui);
  await writeFile(join(ui, 'index.html'), 'ok');
  const config = loadConfig({ KAYZEN_PORT: '0', KAYZEN_DATA_DIR: join(root, 'data'), KAYZEN_DOWNLOAD_DIR: join(root, 'out'), KAYZEN_ALLOW_LOCAL: '1' }, ui);
  daemon = await startDaemon({
    ...config,
    subscriptionTickMs: 3_600_000,
    ollamaUrl,
    whisperPlatform: { platform: 'linux', arch: 'x64' },
    whisperSources: {
      engine,
      models: {
        base: { ...WHISPER_MODELS.base, url: `${filesUrl}/ggml-base.bin`, sha256: sha(MODEL), sizeBytes: MODEL.length },
        // Empreinte volontairement fausse : le fichier doit être refusé puis supprimé.
        small: { ...WHISPER_MODELS.small, url: `${filesUrl}/ggml-small.bin`, sha256: 'f'.repeat(64), sizeBytes: MODEL.length },
      },
    },
  });
  api = daemon.url;
}, 60_000);

afterAll(async () => {
  delete process.env.FAKE_WHISPER_SLOW;
  await daemon?.close();
  files?.close();
  ollamaServer?.close();
});

const whisperIdle = () => until(() => call('GET', '/api/whisper').then((r) => r.data), (s) => s.installing === null);

describe('transcription locale : installation à la demande', () => {
  it('décrit l’état sans rien télécharger', async () => {
    const s = (await call('GET', '/api/whisper')).data;
    expect(s).toMatchObject({ supported: true, ready: false, installing: null, engine: { installed: false } });
    expect(s.models.map((m: any) => m.id)).toEqual(['base', 'small']);
  });

  it('est accessible à tous, sans licence', async () => {
    // Plus aucun 403 « premium » : l'élément inconnu donne simplement 404.
    expect((await call('POST', '/api/library/x/transcribe', {})).status).toBe(404);
    expect((await call('POST', '/api/library/x/summarize', { model: 'm' })).status).toBe(404);
  });

  it('exige la confirmation de la taille exacte annoncée', async () => {
    const r = await call('POST', '/api/whisper/install', { target: 'base' });
    expect(r.status).toBe(400);
    expect(r.data.code).toBe('confirmation_required');
    expect((await call('POST', '/api/whisper/install', { target: 'large', confirmedBytes: 1 })).status).toBe(400);
  });

  it('refuse et supprime un modèle dont l’empreinte SHA-256 ne correspond pas', async () => {
    expect((await call('POST', '/api/whisper/install', { target: 'small', confirmedBytes: MODEL.length })).status).toBe(202);
    const s = await whisperIdle();
    expect(s.lastError).toMatchObject({ target: 'small', code: 'checksum_mismatch' });
    expect(s.models.find((m: any) => m.id === 'small').installed).toBe(false);
    const left = await readdir(join(root, 'data', 'whisper', 'models'));
    expect(left).toEqual([]);
  });

  it('installe le moteur (archive vérifiée, extraite, testée) puis le modèle', async () => {
    expect((await call('POST', '/api/whisper/install', { target: 'engine', confirmedBytes: archive.length })).status).toBe(202);
    // Un seul téléchargement à la fois.
    const busy = await call('POST', '/api/whisper/install', { target: 'base', confirmedBytes: MODEL.length });
    expect([409, 202]).toContain(busy.status);
    let s = await whisperIdle();
    if (busy.status === 202) s = await whisperIdle();
    expect(s.lastError).toBeNull();
    expect(s.engine.installed).toBe(true);
    if (!s.ready) {
      expect((await call('POST', '/api/whisper/install', { target: 'base', confirmedBytes: MODEL.length })).status).toBe(202);
      s = await whisperIdle();
    }
    // Sous forte charge, l'état peut être lu juste avant la fin de l'installation du modèle :
    // on attend un état final (prêt ou erreur) plutôt que la seule fin d'activité.
    s = await until(() => call('GET', '/api/whisper').then((r) => r.data), (x) => x.installing === null && (x.ready || x.lastError !== null));
    expect(s).toMatchObject({ ready: true, lastError: null });
    expect(existsSync(join(root, 'data', 'whisper', 'models', 'ggml-base.bin'))).toBe(true);
  });
});

describe('transcription locale : utilisation', () => {
  let itemId = '';

  it('transcrit une vidéo sans sous-titres au même format Markdown', async () => {
    const created = await call('POST', '/api/jobs', { url: `${filesUrl}/voix.m4a`, preset: 'm4a', transcript: true, embedMetadata: false, sponsorBlock: false });
    expect(created.status).toBe(201);
    const j = await job(created.data.id);
    expect(j.error).toBeNull();
    expect(j.phase).toBe('done');
    expect(j.transcripts).toHaveLength(1);
    const md = await readFile(j.transcripts[0], 'utf8');
    expect(md).toMatch(/^# /);
    expect(md).toContain('Langue : fr');
    expect(md).toContain('> Transcription automatique générée sur cet ordinateur par whisper.cpp (modèle base)');
    expect(md).toContain('**[00:00]** Bonjour, ceci est une transcription locale. Fin du test.');
    expect(md).not.toContain('BLANK_AUDIO');
    itemId = j.libraryIds[0];
    // Aucun fichier temporaire ne reste.
    expect(await readdir(join(root, 'data', 'whisper', 'tmp')).catch(() => [])).toEqual([]);
  }, 90_000);

  it('transcrit à la demande un fichier de la bibliothèque', async () => {
    const r = await call('POST', `/api/library/${itemId}/transcribe`, {});
    expect(r.status).toBe(202);
    expect(r.data.kind).toBe('transcription');
    const j = await job(r.data.id);
    expect(j).toMatchObject({ phase: 'done', error: null, percent: 100 });
    expect((await call('GET', `/api/library/${itemId}/transcript`)).data.markdown).toContain('Fin du test.');
    expect((await call('POST', '/api/library/inconnu/transcribe', {})).status).toBe(404);
  }, 60_000);

  it('annule une transcription en cours', async () => {
    process.env.FAKE_WHISPER_SLOW = '1';
    const r = await call('POST', `/api/library/${itemId}/transcribe`, {});
    await until(async () => ((await call('GET', '/api/jobs')).data as any[]).find((j) => j.id === r.data.id), (j) => j?.phase === 'processing' && j.percent > 5);
    expect((await call('DELETE', `/api/jobs/${r.data.id}`)).status).toBe(409);
    expect((await call('POST', `/api/jobs/${r.data.id}/cancel`, {})).status).toBe(200);
    expect((await job(r.data.id)).phase).toBe('cancelled');
    delete process.env.FAKE_WHISPER_SLOW;
  }, 60_000);

  it('résume la transcription avec un modèle Ollama local', async () => {
    const st = (await call('GET', '/api/ollama')).data;
    expect(st).toMatchObject({ available: true, version: '0.9.0' });
    expect(st.models.map((m: any) => m.name)).toEqual(['mistral:7b']);

    const missing = await call('POST', `/api/library/${itemId}/summarize`, { model: 'llama3:70b' });
    expect(missing.status).toBe(400);
    expect(missing.data.code).toBe('model_missing');

    const r = await call('POST', `/api/library/${itemId}/summarize`, { model: 'mistral:7b' });
    expect(r.status).toBe(202);
    expect(r.data.kind).toBe('summary');
    const j = await job(r.data.id);
    expect(j).toMatchObject({ phase: 'done', error: null });
    const prompt = ollamaPrompts.at(-1)!;
    expect(prompt).toContain('Réponds uniquement en français');
    expect(prompt).toContain('[00:00] Bonjour, ceci est une transcription locale.');
    const s = (await call('GET', `/api/library/${itemId}/summary`)).data;
    expect(s.path).toMatch(/\.resume\.md$/);
    expect(s.markdown).toContain('Modèle : mistral:7b (Ollama, exécuté sur cet ordinateur)');
    expect(s.markdown).toContain('## En bref');
    expect(s.markdown).not.toContain('brouillon');
    const lib = (await call('GET', '/api/library')).data.find((i: any) => i.id === itemId);
    expect(lib.summaryPath).toBe(s.path);
  }, 60_000);

  it('désinstalle un modèle puis signale que la transcription n’est plus prête', async () => {
    expect((await call('DELETE', '/api/whisper/base')).data.ready).toBe(false);
    const r = await call('POST', `/api/library/${itemId}/transcribe`, {});
    expect(r.status).toBe(400);
    expect(r.data.code).toBe('not_installed');
    expect((await call('POST', '/api/whisper/cancel', {})).status).toBe(409);
  });
});

describe('composants isolés', () => {
  it('plate-forme sans binaire officiel : la fonction n’est pas proposée', async () => {
    const m = new WhisperManager({ dataDir: join(root, 'mac'), platform: 'darwin', arch: 'arm64' });
    await m.init();
    const s = await m.status();
    expect(s).toMatchObject({ supported: false, ready: false });
    expect(s.unsupportedReason).toMatch(/macOS/);
    expect(() => m.install('base', WHISPER_MODELS.base.sizeBytes)).toThrow(TranscriptionError);
    await expect(m.transcribe('/x.mp4', { preferredModel: 'base', language: 'auto' })).rejects.toMatchObject({ code: 'unsupported_platform' });
  });

  it('client Ollama : refuse toute adresse non locale et signale l’absence de serveur', async () => {
    expect(() => new OllamaClient('https://api.exemple.com')).toThrow(SummaryError);
    const closed = createServer();
    await new Promise<void>((ok) => closed.listen(0, '127.0.0.1', () => ok()));
    const port = (closed.address() as { port: number }).port;
    await new Promise<void>((ok) => closed.close(() => ok()));
    const c = new OllamaClient(`http://127.0.0.1:${port}`);
    expect(await c.status()).toEqual({ available: false, version: null, models: [] });
    await expect(c.generate('mistral:7b', 'x')).rejects.toMatchObject({ code: 'unavailable' });
    await expect(c.generate('-bad name', 'x')).rejects.toMatchObject({ code: 'model_missing' });
    const ac = new AbortController();
    ac.abort();
    await expect(new OllamaClient(ollamaUrl).generate('mistral:7b', 'x', { signal: ac.signal })).rejects.toMatchObject({ code: 'cancelled' });
  });
});

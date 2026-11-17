import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { request } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { UPDATE_UNAVAILABLE, type UpdateState } from '@kayzen-flux/core';
import { startDaemon, type DaemonHandle } from '../src/server.js';
import { loadConfig } from '../src/config.js';
import type { UpdateBridge } from '../src/updates.js';

/** Pont factice : enregistre les appels du démon. */
class FakeBridge implements UpdateBridge {
  consents: Array<boolean | null> = [];
  checks = 0;
  installs = 0;
  state: UpdateState = { ...UPDATE_UNAVAILABLE, status: 'idle', currentVersion: '1.0.0' };
  getState() {
    return this.state;
  }
  setConsent(c: boolean | null) {
    this.consents.push(c);
  }
  async checkNow() {
    this.checks++;
    this.state = { ...this.state, status: 'up-to-date' };
    return this.state;
  }
  install() {
    if (this.state.status !== 'downloaded') return false;
    this.installs++;
    return true;
  }
}

async function boot(root: string, port: number, bridge?: FakeBridge) {
  const ui = join(root, 'ui');
  await mkdir(ui, { recursive: true });
  await writeFile(join(ui, 'index.html'), '<meta name="kayzen-token" content="__KAYZEN_TOKEN__">');
  return startDaemon(
    loadConfig({ KAYZEN_PORT: String(port), KAYZEN_DATA_DIR: join(root, 'data'), KAYZEN_DOWNLOAD_DIR: join(root, 'out') }, ui),
    bridge ? { updater: bridge } : {},
  );
}

function call(d: DaemonHandle, method: string, path: string, body?: unknown, token = d.token) {
  const port = new URL(d.url).port;
  return new Promise<{ status: number; data: any }>((ok, ko) => {
    const payload = body === undefined ? undefined : JSON.stringify(body);
    const req = request(
      { host: '127.0.0.1', port, path, method, headers: { 'x-kayzen-token': token, ...(payload ? { 'content-type': 'application/json' } : {}) } },
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

describe('mise à jour automatique : routes du démon', () => {
  let root = '';
  let daemon: DaemonHandle;
  let solo: DaemonHandle;
  const bridge = new FakeBridge();

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'kzf-upd-'));
    daemon = await boot(join(root, 'a'), 0, bridge);
    solo = await boot(join(root, 'b'), 0);
  });
  afterAll(async () => {
    await daemon?.close();
    await solo?.close();
  });

  it('transmet au démarrage l’absence de réponse (aucune vérification par défaut)', async () => {
    expect(bridge.consents).toEqual([null]);
    expect((await call(daemon, 'GET', '/api/settings')).data.autoUpdate).toBeNull();
  });

  it('protège les routes par le jeton de session', async () => {
    expect((await call(daemon, 'GET', '/api/update', undefined, 'mauvais')).status).toBe(401);
    expect((await call(daemon, 'POST', '/api/update/check', {}, 'mauvais')).status).toBe(401);
    expect((await call(daemon, 'POST', '/api/update/install', {}, 'mauvais')).status).toBe(401);
    expect(bridge.checks).toBe(0);
  });

  it('enregistre le consentement et le transmet seulement s’il change', async () => {
    const yes = await call(daemon, 'PUT', '/api/settings', { autoUpdate: true });
    expect(yes.data.autoUpdate).toBe(true);
    await call(daemon, 'PUT', '/api/settings', { sponsorBlock: false });
    await call(daemon, 'PUT', '/api/settings', { autoUpdate: 'oui' }); // valeur invalide : ignorée
    const no = await call(daemon, 'PUT', '/api/settings', { autoUpdate: false });
    expect(no.data.autoUpdate).toBe(false);
    expect(bridge.consents).toEqual([null, true, false]);
    const saved = JSON.parse(await readFile(join(root, 'a', 'data', 'settings.json'), 'utf8'));
    expect(saved.autoUpdate).toBe(false);
  });

  it('expose l’état, vérifie à la demande et n’installe que si une version est prête', async () => {
    expect((await call(daemon, 'GET', '/api/update')).data.status).toBe('idle');
    const check = await call(daemon, 'POST', '/api/update/check', {});
    expect(check).toMatchObject({ status: 200, data: { status: 'up-to-date' } });
    expect((await call(daemon, 'POST', '/api/update/install', {})).status).toBe(409);
    bridge.state = { ...bridge.state, status: 'downloaded', version: '1.1.0' };
    expect((await call(daemon, 'POST', '/api/update/install', {})).status).toBe(200);
    expect(bridge.installs).toBe(1);
  });

  it('refuse la vérification pour une installation .deb', async () => {
    bridge.state = { ...bridge.state, status: 'manual' };
    expect((await call(daemon, 'POST', '/api/update/check', {})).status).toBe(409);
  });

  it('démon seul : mise à jour indisponible', async () => {
    expect((await call(solo, 'GET', '/api/update')).data).toEqual(UPDATE_UNAVAILABLE);
    expect((await call(solo, 'POST', '/api/update/check', {})).data.code).toBe('update_unavailable');
    expect((await call(solo, 'POST', '/api/update/install', {})).status).toBe(409);
  });
});

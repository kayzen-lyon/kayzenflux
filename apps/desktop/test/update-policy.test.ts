import { describe, expect, it, vi } from 'vitest';
import {
  ANONYMOUS_STAGING_ID,
  DOWNLOAD_PAGE_URL,
  UPDATE_INTERVAL_MS,
  UpdateScheduler,
  initialUpdateState,
  parseFeedUrl,
  redactLogMessage,
  reduceUpdateState,
  resolveUpdateSupport,
  type SupportInput,
} from '../src/update-policy.js';

describe('parseFeedUrl', () => {
  it('lit l’adresse du fournisseur generic', () => {
    const yml = 'provider: generic\nurl: https://flux.kayzen-lyon.com/updates/\nupdaterCacheDirName: kayzen-flux-updater\n';
    expect(parseFeedUrl(yml)).toBe('https://flux.kayzen-lyon.com/updates/');
    expect(parseFeedUrl("provider: 'generic'\nurl: 'https://exemple.fr/u'\n")).toBe('https://exemple.fr/u');
  });
  it.each([
    [null],
    [''],
    ['provider: github\nowner: x\n'],
    ['provider: generic\n'],
    ['provider: generic\nurl: http://exemple.fr/u\n'],
    ['provider: generic\nurl: https://moi:secret@exemple.fr/u\n'],
    ['provider: generic\nurl: ${env.KAYZEN_UPDATE_URL}\n'],
    ['provider: generic\nurl: pas une adresse\n'],
  ])('refuse %j', (yml) => {
    expect(parseFeedUrl(yml)).toBeNull();
  });
});

describe('resolveUpdateSupport', () => {
  const base: SupportInput = { isPackaged: true, platform: 'win32', appImage: undefined, feedUrl: 'https://exemple.fr/u/', disabledByEnv: false };
  it('active la mise à jour d’un build Windows/macOS configuré', () => {
    expect(resolveUpdateSupport(base)).toEqual({ mode: 'auto', feedUrl: 'https://exemple.fr/u/' });
    expect(resolveUpdateSupport({ ...base, platform: 'darwin' }).mode).toBe('auto');
  });
  it('aucun appel réseau en développement, sans adresse ou si désactivé', () => {
    expect(resolveUpdateSupport({ ...base, isPackaged: false }).mode).toBe('off');
    expect(resolveUpdateSupport({ ...base, feedUrl: null }).mode).toBe('off');
    expect(resolveUpdateSupport({ ...base, disabledByEnv: true }).mode).toBe('off');
    expect(resolveUpdateSupport({ ...base, platform: 'freebsd' }).mode).toBe('off');
  });
  it('Linux : seule l’AppImage se met à jour, le .deb renvoie vers la page de téléchargement', () => {
    expect(resolveUpdateSupport({ ...base, platform: 'linux', appImage: '/opt/kzf.AppImage' }).mode).toBe('auto');
    expect(resolveUpdateSupport({ ...base, platform: 'linux' }).mode).toBe('manual');
  });
});

describe('initialUpdateState', () => {
  it('reflète le mode', () => {
    expect(initialUpdateState({ mode: 'auto', feedUrl: 'https://x.fr/' }, '1.0.0')).toMatchObject({ status: 'idle', currentVersion: '1.0.0', message: null, downloadPage: null });
    expect(initialUpdateState({ mode: 'manual', reason: 'deb' }, '1.0.0')).toMatchObject({ status: 'manual', message: 'deb', downloadPage: DOWNLOAD_PAGE_URL });
    expect(initialUpdateState({ mode: 'off', reason: 'dev' }, '1.0.0')).toMatchObject({ status: 'unavailable', downloadPage: null });
  });
});

describe('reduceUpdateState', () => {
  const now = new Date('2026-11-17T10:00:00Z');
  const idle = initialUpdateState({ mode: 'auto', feedUrl: 'https://x.fr/' }, '1.0.0');

  it('suit le cycle vérification → téléchargement → prête', () => {
    let s = reduceUpdateState(idle, { type: 'checking' }, now);
    expect(s.status).toBe('checking');
    s = reduceUpdateState(s, { type: 'available', version: '1.1.0' }, now);
    expect(s).toMatchObject({ status: 'downloading', version: '1.1.0', percent: 0 });
    s = reduceUpdateState(s, { type: 'progress', percent: 42.6 }, now);
    expect(s.percent).toBe(43);
    s = reduceUpdateState(s, { type: 'progress', percent: 250 }, now);
    expect(s.percent).toBe(100);
    s = reduceUpdateState(s, { type: 'progress', percent: Number.NaN }, now);
    expect(s.percent).toBe(0);
    s = reduceUpdateState(s, { type: 'downloaded', version: '1.1.0' }, now);
    expect(s).toMatchObject({ status: 'downloaded', version: '1.1.0', percent: 100, lastCheck: now.toISOString() });
  });

  it('une mise à jour prête reste affichée malgré les vérifications suivantes', () => {
    const ready = reduceUpdateState(idle, { type: 'downloaded', version: '1.1.0' }, now);
    for (const e of [{ type: 'checking' }, { type: 'not-available' }, { type: 'error' }] as const) {
      expect(reduceUpdateState(ready, e, now)).toBe(ready);
    }
  });

  it('à jour, puis erreur sans détail technique', () => {
    expect(reduceUpdateState(idle, { type: 'not-available' }, now)).toMatchObject({ status: 'up-to-date', lastCheck: now.toISOString() });
    const err = reduceUpdateState(idle, { type: 'error' }, now);
    expect(err.status).toBe('error');
    expect(err.message).not.toMatch(/https?:/);
  });

  it('ignore une version mal formée', () => {
    expect(reduceUpdateState(idle, { type: 'available', version: '<script>' }, now).version).toBeNull();
  });

  it('ne change rien quand la mise à jour est indisponible ou manuelle', () => {
    const off = initialUpdateState({ mode: 'off', reason: 'dev' }, '1.0.0');
    const manual = initialUpdateState({ mode: 'manual', reason: 'deb' }, '1.0.0');
    expect(reduceUpdateState(off, { type: 'checking' }, now)).toBe(off);
    expect(reduceUpdateState(manual, { type: 'downloaded', version: '2.0.0' }, now)).toBe(manual);
  });
});

function fakeTimers() {
  const intervals = new Map<number, { fn: () => void; ms: number }>();
  let next = 1;
  return {
    intervals,
    timers: {
      setInterval: (fn: () => void, ms: number) => {
        const id = next++;
        intervals.set(id, { fn, ms });
        return id;
      },
      clearInterval: (h: unknown) => void intervals.delete(h as number),
    },
    tick: () => intervals.forEach(({ fn }) => fn()),
  };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('UpdateScheduler', () => {
  it('ne vérifie rien sans consentement (pas de réponse ou refus)', async () => {
    const check = vi.fn(async () => undefined);
    const t = fakeTimers();
    const s = new UpdateScheduler(check, t.timers);
    s.setConsent(null);
    s.setConsent(false);
    await flush();
    expect(check).not.toHaveBeenCalled();
    expect(t.intervals.size).toBe(0);
    expect(s.running).toBe(false);
  });

  it('accepté : vérifie tout de suite puis toutes les 6 h', async () => {
    const check = vi.fn(async () => undefined);
    const t = fakeTimers();
    const s = new UpdateScheduler(check, t.timers);
    s.setConsent(true);
    await flush();
    expect(check).toHaveBeenCalledTimes(1);
    expect([...t.intervals.values()][0]?.ms).toBe(UPDATE_INTERVAL_MS);
    expect(UPDATE_INTERVAL_MS).toBe(6 * 3600 * 1000);
    t.tick();
    await flush();
    expect(check).toHaveBeenCalledTimes(2);
    // Un second « oui » ne relance pas de vérification ni de deuxième minuterie.
    s.setConsent(true);
    await flush();
    expect(check).toHaveBeenCalledTimes(2);
    expect(t.intervals.size).toBe(1);
    expect(s.consentGiven).toBe(true);
  });

  it('retrait du consentement : la minuterie s’arrête', async () => {
    const check = vi.fn(async () => undefined);
    const t = fakeTimers();
    const s = new UpdateScheduler(check, t.timers);
    s.setConsent(true);
    s.setConsent(false);
    expect(t.intervals.size).toBe(0);
    expect(s.running).toBe(false);
  });

  it('vérification manuelle permise sans consentement, sans doublon', async () => {
    let release: () => void = () => undefined;
    const check = vi.fn(() => new Promise<void>((r) => (release = r)));
    const s = new UpdateScheduler(check, fakeTimers().timers);
    const first = s.checkNow();
    expect(await s.checkNow()).toBe(false); // déjà en cours
    release();
    expect(await first).toBe(true);
    expect(check).toHaveBeenCalledTimes(1);
    expect(s.running).toBe(false);
  });

  it('une erreur de vérification n’interrompt pas la planification', async () => {
    const check = vi.fn(async () => {
      throw new Error('réseau');
    });
    const t = fakeTimers();
    const s = new UpdateScheduler(check, t.timers);
    s.setConsent(true);
    await flush();
    t.tick();
    await flush();
    expect(check).toHaveBeenCalledTimes(2);
    expect(await s.checkNow()).toBe(true);
  });
});

describe('redactLogMessage', () => {
  it('retire adresses, identifiants et chemins', () => {
    const out = redactLogMessage(
      `Cannot download https://flux.kayzen-lyon.com/updates/latest.yml user id: 3f2b8c1e-1d2a-4b5c-9d8e-0f1a2b3c4d5e in /home/tarek/.cache/kayzen-flux-updater/pending C:\\Users\\Tarek\\AppData\\x.exe`,
    );
    expect(out).not.toMatch(/kayzen-lyon|3f2b8c1e|tarek|Tarek/);
    expect(out).toContain('[url]');
    expect(out).toContain('[id]');
    expect(out).toContain('[chemin]');
    expect(redactLogMessage(new Error('x'.repeat(1000))).length).toBe(300);
  });
  it('l’identifiant anonyme est commun à tous', () => {
    expect(ANONYMOUS_STAGING_ID).toMatch(/^0{8}-/);
  });
});

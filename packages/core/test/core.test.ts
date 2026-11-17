import { describe, expect, it } from 'vitest';
import {
  ArgsError,
  buildDownloadArgs,
  buildInfoArgs,
  classifyEngineError,
  detectDrm,
  LIMITS,
  PRESET_IDS,
  isPresetId,
  parseEngineLine,
  parseInfoJson,
  validateUrl,
  PROGRESS_PREFIX,
} from '../src/index.js';

describe('validateUrl', () => {
  it('accepte une URL https publique', () => {
    expect(validateUrl('https://example.com/watch?v=1')).toMatchObject({ ok: true, host: 'example.com' });
  });
  it.each([
    ['', 'vide'],
    ['ftp://example.com/a', 'protocole'],
    ['file:///etc/passwd', 'fichier'],
    ['https://user:pass@example.com', 'identifiants'],
    ['http://127.0.0.1:8080/a.mp4', 'local'],
    ['http://192.168.1.10/a', 'privé'],
    ['http://localhost/a', 'localhost'],
    ['--exec rm', 'option'],
    ['pas une url', 'texte'],
  ])('refuse %s (%s)', (input) => {
    expect(validateUrl(input).ok).toBe(false);
  });
  it('accepte une adresse locale en mode test explicite', () => {
    expect(validateUrl('http://127.0.0.1:8080/a.mp4', { allowLocal: true }).ok).toBe(true);
  });
});

describe('buildDownloadArgs', () => {
  const base = { url: 'https://example.com/v/1', outputDir: '/tmp/out' };

  it("place toujours l'URL après « -- »", () => {
    const args = buildDownloadArgs({ ...base, preset: 'mp3-320' });
    expect(args.at(-2)).toBe('--');
    expect(args.at(-1)).toBe('https://example.com/v/1');
    expect(args).toContain('--no-playlist');
    expect(args).toContain('--ignore-config');
  });

  it('accepte tous les formats, y compris FLAC et 4K', () => {
    for (const preset of PRESET_IDS) expect(() => buildDownloadArgs({ ...base, preset })).not.toThrow();
  });

  it('plafonne la playlist à la limite technique commune', () => {
    const big = buildDownloadArgs({ ...base, preset: 'm4a', playlist: true, playlistLimit: 100000 });
    expect(big[big.indexOf('--playlist-items') + 1]).toBe(`1:${LIMITS.maxPlaylistItems}`);
    const small = buildDownloadArgs({ ...base, preset: 'm4a', playlist: true, playlistLimit: 500 });
    expect(small[small.indexOf('--playlist-items') + 1]).toBe('1:500');
    const all = buildDownloadArgs({ ...base, preset: 'm4a', playlist: true });
    expect(all[all.indexOf('--playlist-items') + 1]).toBe('1:5000');
  });

  it('ajoute SponsorBlock, métadonnées et sous-titres sur demande', () => {
    const args = buildDownloadArgs({ ...base, preset: 'mp4-1080', sponsorBlock: true, embedMetadata: true, subtitles: true });
    expect(args).toContain('--sponsorblock-remove');
    expect(args).toContain('--embed-metadata');
    expect(args).toContain('--embed-subs');
  });

  it('refuse une URL invalide ou un dossier de sortie suspect', () => {
    expect(() => buildDownloadArgs({ ...base, preset: 'm4a', url: 'http://10.0.0.1/x' })).toThrow(ArgsError);
    expect(() => buildDownloadArgs({ ...base, preset: 'm4a', outputDir: '--exec' })).toThrow(ArgsError);
  });

  it("n'utilise jamais d'option de contournement (cookies, DRM, exec)", () => {
    const args = buildDownloadArgs({ ...base, preset: 'mp4-1080', playlist: true }).join(' ');
    expect(args).not.toMatch(/--cookies|--allow-unplayable|--exec|--username|--password/);
  });

  it("construit l'aperçu sans téléchargement", () => {
    expect(buildInfoArgs('https://example.com/v')).toEqual(
      expect.arrayContaining(['-J', '--no-playlist', '--', 'https://example.com/v']),
    );
  });
});

describe('LIMITS', () => {
  it("reprend les valeurs de l'ancienne offre Premium pour tout le monde", () => {
    expect(LIMITS).toEqual({ maxPlaylistItems: 5000, maxParallelJobs: 6 });
  });
  it('reconnaît les identifiants de préréglage', () => {
    expect(isPresetId('flac')).toBe(true);
    expect(isPresetId('mp4-9999')).toBe(false);
    expect(isPresetId(42)).toBe(false);
  });
});

describe('parseInfoJson', () => {
  it('normalise une vidéo', () => {
    const info = parseInfoJson(
      JSON.stringify({
        id: 'abc',
        title: '  Démo  ',
        uploader: 'Chaîne',
        duration: 125,
        extractor_key: 'Vimeo',
        license: 'Creative Commons Attribution license (reuse allowed)',
        formats: [
          { format_id: '1', height: 1080, vcodec: 'avc1', acodec: 'none' },
          { format_id: '2', vcodec: 'none', acodec: 'opus', abr: 129.5 },
        ],
      }),
    );
    expect(info).toMatchObject({
      id: 'abc',
      title: 'Démo',
      author: 'Chaîne',
      maxHeight: 1080,
      bestAudioKbps: 130,
      hasVideo: true,
      hasAudio: true,
      drm: false,
      isPlaylist: false,
      isCreativeCommons: true,
    });
  });

  it('considère un lien direct .mp4 aux codecs inconnus comme vidéo + audio', () => {
    const info = parseInfoJson(JSON.stringify({ id: 'd', formats: [{ ext: 'mp4', vcodec: null, acodec: null }] }));
    expect(info.hasVideo).toBe(true);
    expect(info.hasAudio).toBe(true);
  });

  it('reconnaît un média uniquement audio', () => {
    const info = parseInfoJson(JSON.stringify({ id: 'a', formats: [{ ext: 'mp3', vcodec: 'none', acodec: 'mp3' }] }));
    expect(info.hasVideo).toBe(false);
  });

  it('détecte une playlist', () => {
    const info = parseInfoJson(JSON.stringify({ id: 'pl', _type: 'playlist', title: 'Ma liste', entries: [{ id: 'a' }, { id: 'b' }, null] }));
    expect(info.isPlaylist).toBe(true);
    expect(info.entryCount).toBe(2);
  });

  it('rejette un JSON invalide', () => {
    expect(() => parseInfoJson('{')).toThrow();
    expect(() => parseInfoJson('{"title":"sans id"}')).toThrow();
  });
});

describe('detectDrm', () => {
  it('signale un média entièrement chiffré', () => {
    expect(detectDrm({ formats: [{ has_drm: true }, { has_drm: true }] })).toBe(true);
    expect(detectDrm({ has_drm: true, formats: [] })).toBe(true);
  });
  it('accepte un média dont certains formats sont libres', () => {
    expect(detectDrm({ formats: [{ has_drm: true }, { has_drm: false }] })).toBe(false);
    expect(detectDrm({ formats: [] })).toBe(false);
  });
});

describe('parseEngineLine', () => {
  it('lit une ligne de progression', () => {
    const ev = parseEngineLine(`${PROGRESS_PREFIX}downloading|500|1000|NA|2048.5|3|NA`);
    expect(ev).toEqual({
      type: 'progress',
      status: 'downloading',
      downloaded: 500,
      total: 1000,
      speed: 2048.5,
      eta: 3,
      playlistIndex: null,
      percent: 50,
    });
  });
  it('utilise la taille estimée si la taille exacte manque', () => {
    const ev = parseEngineLine(`${PROGRESS_PREFIX}downloading|250|NA|1000|NA|NA|2`);
    expect(ev).toMatchObject({ total: 1000, percent: 25, playlistIndex: 2 });
  });
  it('lit les métadonnées émises avant le téléchargement', () => {
    const ev = parseEngineLine('KZM|{"title": "Titre | spécial", "uploader": null, "channel": "Chaîne", "thumbnail": "https://i/x.jpg", "duration": 12.5, "extractor_key": "Vimeo"}');
    expect(ev).toEqual({ type: 'meta', title: 'Titre | spécial', author: 'Chaîne', thumbnail: 'https://i/x.jpg', durationSec: 12.5, site: 'Vimeo' });
    expect(parseEngineLine('KZM|{invalide').type).toBe('log');
  });

  it('reconnaît fichier, erreur et phases', () => {
    expect(parseEngineLine('KZF|/tmp/a.mp3')).toEqual({ type: 'file', path: '/tmp/a.mp3' });
    expect(parseEngineLine('ERROR: [x] Private video')).toEqual({ type: 'error', message: '[x] Private video' });
    expect(parseEngineLine('[ExtractAudio] Destination: a.mp3')).toMatchObject({ type: 'phase', label: 'Conversion audio' });
    expect(parseEngineLine('[info] autre')).toEqual({ type: 'log', line: '[info] autre' });
  });
});

describe('classifyEngineError', () => {
  it.each([
    ['This video is DRM protected', 'drm'],
    ['Private video. Sign in if you have been granted access', 'private'],
    ['Sign in to confirm your age', 'age'],
    ['Unsupported URL: https://x', 'unsupported'],
    ['HTTP Error 429: Too Many Requests', 'rate_limited'],
    ["Sign in to confirm you're not a bot. This helps protect our community", 'rate_limited'],
    ['This video is available to members only. Join this channel', 'login'],
    ['Video unavailable', 'unavailable'],
    ['quelque chose d’inconnu', 'unknown'],
  ])('%s → %s', (msg, code) => {
    expect(classifyEngineError(msg).code).toBe(code);
  });
});

import { describe, expect, it } from 'vitest';
import { ArgsError, buildDownloadArgs, buildFeedArgs, buildTranscript, parseFeed, parseSubtitles } from '../src/index.js';

const base = { url: 'https://example.com/v/1', outputDir: '/tmp/out' };

describe('options Premium', () => {
  it('sont refusées en offre gratuite', () => {
    for (const opt of ['splitChapters', 'normalizeAudio', 'transcript'] as const) {
      expect(() => buildDownloadArgs({ ...base, tier: 'free', preset: 'mp3-320', [opt]: true })).toThrow(ArgsError);
    }
  });

  it('normalise le volume pour l’audio uniquement', () => {
    const audio = buildDownloadArgs({ ...base, tier: 'premium', preset: 'mp3-320', normalizeAudio: true });
    expect(audio).toContain('--postprocessor-args');
    expect(audio.join(' ')).toContain('loudnorm');
    const video = buildDownloadArgs({ ...base, tier: 'premium', preset: 'mp4-1080', normalizeAudio: true });
    expect(video).not.toContain('--postprocessor-args');
  });

  it('découpe par chapitres dans un sous-dossier', () => {
    const args = buildDownloadArgs({ ...base, tier: 'premium', preset: 'm4a', splitChapters: true });
    expect(args).toContain('--split-chapters');
    expect(args.find((a) => a.startsWith('chapter:'))).toMatch(/chapitres\//);
  });

  it('garde les sous-titres sur le disque quand une transcription est demandée', () => {
    const args = buildDownloadArgs({ ...base, tier: 'premium', preset: 'mp4-1080', subtitles: true, transcript: true });
    expect(args).toContain('--write-auto-subs');
    expect(args).not.toContain('--embed-subs');
  });

  it('applique un modèle de nom de la liste fermée', () => {
    const args = buildDownloadArgs({ ...base, tier: 'free', preset: 'm4a', filenameTemplate: 'author-title' });
    expect(args[args.indexOf('-o') + 1]).toMatch(/^%\(uploader/);
    const fallback = buildDownloadArgs({ ...base, tier: 'free', preset: 'm4a', filenameTemplate: '../../etc' as never });
    expect(fallback[fallback.indexOf('-o') + 1]).toBe('%(title).150B [%(id)s].%(ext)s');
  });
});

describe('transcription', () => {
  const vtt = `WEBVTT
Kind: captions

00:00:01.000 --> 00:00:03.000
Bonjour <c>à</c> tous

00:00:03.000 --> 00:00:05.000
Bonjour à tous
et bienvenue

00:00:40.500 --> 00:00:42.000
Deuxième partie &amp; fin
`;
  it('nettoie les balises, retire les répétitions des sous-titres automatiques', () => {
    const cues = parseSubtitles(vtt);
    expect(cues.map((c) => c.text)).toEqual(['Bonjour à tous', 'et bienvenue', 'Deuxième partie & fin']);
    expect(cues[2]!.start).toBeCloseTo(40.5);
  });

  it('lit aussi le SRT', () => {
    const cues = parseSubtitles('1\n00:00:00,000 --> 00:00:01,500\nLigne un\n\n2\n00:01:02,000 --> 00:01:03,000\nLigne deux\n');
    expect(cues).toEqual([{ start: 0, text: 'Ligne un' }, { start: 62, text: 'Ligne deux' }]);
  });

  it('produit un Markdown horodaté par paragraphes', () => {
    const md = buildTranscript(parseSubtitles(vtt), { title: 'Démo', source: 'https://x', lang: 'fr' });
    expect(md).toContain('# Démo');
    expect(md).toContain('**[00:01]** Bonjour à tous et bienvenue');
    expect(md).toContain('**[00:40]** Deuxième partie & fin');
  });
});

describe('abonnements', () => {
  it('limite le nombre d’entrées lues et place l’URL après --', () => {
    const args = buildFeedArgs('https://example.com/chaine', 500);
    expect(args).toContain('1:50');
    expect(args.slice(-2)).toEqual(['--', 'https://example.com/chaine']);
  });
  it('extrait les entrées valides d’un flux', () => {
    const feed = parseFeed({
      title: 'Ma chaîne',
      entries: [
        { id: 'a', title: 'A', url: 'https://example.com/a' },
        { id: 'b', title: 'B', webpage_url: 'https://example.com/b' },
        { id: 'c', url: 'javascript:alert(1)' },
        null,
      ],
    });
    expect(feed.title).toBe('Ma chaîne');
    expect(feed.entries.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

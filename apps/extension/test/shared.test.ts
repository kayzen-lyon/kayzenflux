import { describe, expect, it } from 'vitest';
import { cleanVideoUrl, deepLink, pruneAds, segmentAt, segmentsForVideo, videoIdFromUrl } from '../src/shared.js';

describe('pruneAds', () => {
  it('retire les données publicitaires, y compris imbriquées, sans toucher au reste', () => {
    const data = { videoDetails: { title: 'x' }, adPlacements: [1], playerAds: [2], playerResponse: { adSlots: [3], streamingData: { formats: [] } } };
    expect(pruneAds(data)).toBe(3);
    expect(data).toEqual({ videoDetails: { title: 'x' }, playerResponse: { streamingData: { formats: [] } } });
  });
  it('ignore les valeurs non objet', () => {
    expect(pruneAds(null)).toBe(0);
    expect(pruneAds('texte')).toBe(0);
  });
});

describe('adresses vidéo', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=abc&si=track', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=x', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/feed/subscriptions', null],
    ['https://example.com/watch?v=dQw4w9WgXcQ', null],
  ])('%s → %s', (url, id) => expect(videoIdFromUrl(url)).toBe(id));

  it('nettoie les paramètres de pistage', () => {
    expect(cleanVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc&pp=xyz')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(cleanVideoUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ&feature=share')).toBe('https://music.youtube.com/watch?v=dQw4w9WgXcQ');
  });

  it('construit le lien profond attendu par l’application', () => {
    expect(deepLink('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('kayzenflux://add?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DdQw4w9WgXcQ');
  });
});

describe('SponsorBlock', () => {
  const api = [
    { videoID: 'autreVideo1', segments: [{ segment: [0, 10], category: 'sponsor', UUID: 'z' }] },
    {
      videoID: 'dQw4w9WgXcQ',
      segments: [
        { segment: [60, 90], category: 'selfpromo', UUID: 'b', actionType: 'skip' },
        { segment: [10, 25.5], category: 'sponsor', UUID: 'a' },
        { segment: [100, 100], category: 'sponsor', UUID: 'vide' },
        { segment: [120, 130], category: 'sponsor', UUID: 'muet', actionType: 'mute' },
      ],
    },
  ];
  it('garde uniquement les segments « à sauter » de la vidéo, triés', () => {
    expect(segmentsForVideo(api, 'dQw4w9WgXcQ').map((s) => s.uuid)).toEqual(['a', 'b']);
    expect(segmentsForVideo('erreur', 'dQw4w9WgXcQ')).toEqual([]);
  });
  it('trouve le segment en cours', () => {
    const segs = segmentsForVideo(api, 'dQw4w9WgXcQ');
    expect(segmentAt(segs, 12)?.uuid).toBe('a');
    expect(segmentAt(segs, 25.4)).toBeNull();
    expect(segmentAt(segs, 40)).toBeNull();
  });
});

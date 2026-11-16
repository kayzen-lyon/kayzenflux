import { describe, expect, it } from 'vitest';
import { parseDeepLink } from '../src/deeplink.js';

describe('parseDeepLink', () => {
  it('extrait l’URL à analyser', () => {
    expect(parseDeepLink('kayzenflux://add?url=' + encodeURIComponent('https://example.com/watch?v=1&t=3'))).toBe('https://example.com/watch?v=1&t=3');
    expect(parseDeepLink('kayzenflux:///add?url=https%3A%2F%2Fexample.com%2Fa')).toBe('https://example.com/a');
  });
  it.each([
    'https://example.com',
    'kayzenflux://delete?url=https%3A%2F%2Fexample.com',
    'kayzenflux://add',
    'kayzenflux://add?url=javascript%3Aalert(1)',
    'kayzenflux://add?url=file%3A%2F%2F%2Fetc%2Fpasswd',
    'kayzenflux://add?url=https%3A%2F%2Fuser%3Apass%40example.com',
    'nimporte quoi',
  ])('refuse %s', (raw) => {
    expect(parseDeepLink(raw)).toBeNull();
  });
});

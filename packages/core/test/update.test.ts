import { describe, expect, it } from 'vitest';
import { UPDATE_UNAVAILABLE } from '../src/index.js';

describe('UPDATE_UNAVAILABLE', () => {
  it('décrit une mise à jour indisponible sans aucune donnée', () => {
    expect(UPDATE_UNAVAILABLE.status).toBe('unavailable');
    expect(Object.entries(UPDATE_UNAVAILABLE).filter(([k]) => k !== 'status').every(([, v]) => v === null)).toBe(true);
  });
});

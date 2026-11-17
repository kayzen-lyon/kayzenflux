import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const popup = readFileSync(new URL('../static/popup.html', import.meta.url), 'utf8');

describe('fenêtre de l’extension', () => {
  it('attribue les données SponsorBlock comme l’exige la licence CC BY-NC-SA 4.0', () => {
    expect(popup).toContain('https://sponsor.ajay.app');
    expect(popup).toContain('Ajay Ramachandran et contributeurs');
    expect(popup).toContain('https://creativecommons.org/licenses/by-nc-sa/4.0/');
    expect(popup).toMatch(/non commerciales/);
  });
  it('renvoie vers le code source MIT et ne parle d’aucune offre payante', () => {
    expect(popup).toContain('https://github.com/kayzen-lyon/kayzenflux');
    expect(popup).not.toMatch(/premium|licence payante|acheter/i);
  });
});

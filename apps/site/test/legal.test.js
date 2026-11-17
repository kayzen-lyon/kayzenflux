import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const pub = join(import.meta.dirname, '..', 'public');
const PAGES = ['mentions-legales.html', 'cgu.html', 'confidentialite.html'];
const read = (f) => readFileSync(join(pub, f), 'utf8');

describe('pages légales (application gratuite, licence MIT)', () => {
  it('ne contiennent plus aucune mention de vente, de paiement ou de licence payante', () => {
    for (const page of PAGES) {
      const html = read(page);
      expect(html, page).not.toMatch(/stripe|resend|premium|\/cgv|clé de licence|e-mail de licence|achat d.une licence/i);
    }
  });

  it('gardent l’avertissement « modèle à faire valider »', () => {
    for (const page of PAGES) expect(read(page), page).toContain('MODÈLE À FAIRE VALIDER');
  });

  it('mentionnent la licence MIT dans les CGU et les mentions légales', () => {
    expect(read('cgu.html')).toMatch(/licence MIT/);
    expect(read('mentions-legales.html')).toMatch(/licence MIT/);
  });

  it('les pages de vente ont été retirées et aucune fonction serveur de paiement ne subsiste', () => {
    expect(existsSync(join(pub, 'cgv.html'))).toBe(false);
    expect(existsSync(join(pub, 'merci.html'))).toBe(false);
    expect(existsSync(join(pub, '..', 'api', 'stripe-webhook.js'))).toBe(false);
  });
});

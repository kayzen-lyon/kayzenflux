import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Garde-fous des gabarits partagés : aplats (ni dégradé, ni halo, ni verre) et pied de page.
const pub = join(import.meta.dirname, '..', 'public');
const read = (f) => readFileSync(join(pub, f), 'utf8');
const pages = readdirSync(pub).filter((f) => f.endsWith('.html'));
const css = read('assets/style.css');

describe('aplats : ni dégradé de fond, ni halo, ni effet verre', () => {
  it('les bandes marine sont des aplats', () => {
    const bands = css.match(/--band-bg:[^;]+;/g) ?? [];
    expect(bands.length).toBeGreaterThanOrEqual(2);
    for (const band of bands) expect(band).not.toMatch(/gradient/);
  });
  it('aucun halo ni flou d’arrière-plan', () => {
    expect(css).not.toMatch(/closest-side/);
    expect(css).not.toMatch(/backdrop-filter/);
    expect(css).not.toMatch(/linear-gradient\(\s*(?:\d+deg|to |180deg)/);
  });
});

describe('pied de page : contact en grand et marque en filigrane', () => {
  it.each(pages)('%s', (page) => {
    const html = read(page);
    expect(html).toMatch(/<a class="im-foot-mail" href="mailto:contact@kayzen-lyon\.fr">contact@kayzen-lyon\.fr<\/a>/);
    expect(html).toMatch(/<a class="im-foot-tel" href="tel:\+33487776861">04 87 77 68 61<\/a>/);
    expect(html).toMatch(/<div class="im-foot-mark" aria-hidden="true" data-mark="KAYZEN Flux"><\/div>/);
    // Le contenu existant du pied de page reste en place.
    expect(html).toMatch(/class="foot-contact"/);
    expect(html).toMatch(/SIRET 493 857 262 00098/);
  });
});

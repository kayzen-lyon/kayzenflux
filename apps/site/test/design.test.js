import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Garde-fous du design repris de kayzen-lyon.com (docs/DESIGN-KAYZEN.md).
const pub = join(import.meta.dirname, '..', 'public');
const read = (f) => readFileSync(join(pub, f), 'utf8');
const pages = readdirSync(pub).filter((f) => f.endsWith('.html'));

describe('design KAYZEN : jetons et polices', () => {
  const css = read('assets/style.css');
  it('reprend la palette exacte de l’agence', () => {
    for (const c of ['#B7481F', '#1F2937', '#F3BD49', '#F2F5F7', '#586474', '#E0E5EB', '#1F3B61', '#132944']) {
      expect(css).toContain(c);
    }
  });
  it('utilise Outfit et Plus Jakarta Sans servies localement', () => {
    expect(css).toMatch(/font-family: 'Outfit'; src: url\('outfit\.woff2'\)/);
    expect(css).toMatch(/font-family: 'Plus Jakarta Sans'; src: url\('jakarta\.woff2'\)/);
    expect(css).not.toMatch(/url\(['"]?https?:/);
  });
  it('déclare un thème sombre et les classes du menu d’accessibilité', () => {
    for (const sel of ['html.dark', 'html.a11y-text-1', 'html.a11y-text-2', 'html.high-contrast', 'html.reduce-motion', 'html.readable-font']) {
      expect(css).toContain(sel);
    }
  });
});

describe('pages : en-tête, pied de page et widgets communs', () => {
  it.each(pages)('%s : thème, retour en haut, accessibilité, vCard, CTA KAYZEN', (page) => {
    const html = read(page);
    expect(html).toMatch(/<script src="\/assets\/theme-init\.js"><\/script>/);
    expect(html).toMatch(/<script src="\/assets\/site\.js" defer><\/script>/);
    expect(html).toMatch(/data-theme-toggle/);
    expect(html).toMatch(/data-scroll-top/);
    expect(html).toMatch(/data-scroll-ring/);
    expect(html).toMatch(/aria-controls="a11y-panel"/);
    expect(html).toMatch(/src="\/assets\/qr-vcard\.svg" alt="[^"]+"/);
    expect(html).toMatch(/href="\/kayzen-lyon\.vcf" download/);
    expect(html).toMatch(/href="https:\/\/www\.kayzen-lyon\.com"/);
    expect(html).toMatch(/Confiez vos projets à KAYZEN Lyon/);
  });

  it.each(pages)('%s : aucun style ni script inline (CSP stricte)', (page) => {
    const html = read(page);
    expect(html).not.toMatch(/\sstyle="/);
    expect(html).not.toMatch(/<style\b/);
    expect(html).not.toMatch(/\son[a-z]+="/);
    // Seul script sans src autorisé : les données structurées JSON-LD (non exécutées).
    const inline = html.match(/<script(?![^>]*\bsrc=)[^>]*>/g) ?? [];
    for (const tag of inline) expect(tag).toMatch(/type="application\/ld\+json"/);
  });

  it('la page d’accueil garde les liens de téléchargement et propose le CTA création de logiciels', () => {
    const html = read('index.html');
    expect((html.match(/data-link="downloads\./g) ?? []).length).toBe(8);
    expect(html).toMatch(/Confiez vos projets à KAYZEN Lyon pour la création de logiciels/);
    expect(html).toMatch(/mailto:contact@kayzen-lyon\.fr/);
    expect(html).toMatch(/application\/ld\+json/);
  });
});

describe('carte de visite vCard', () => {
  const vcf = read('kayzen-lyon.vcf');
  it('contient les coordonnées KAYZEN — Tarek BELHADJ', () => {
    expect(vcf).toMatch(/^BEGIN:VCARD\r\nVERSION:3\.0\r\n/);
    expect(vcf).toContain('FN:KAYZEN — Tarek BELHADJ');
    expect(vcf).toContain('TEL;TYPE=WORK,VOICE:+33487776861');
    expect(vcf).toContain('EMAIL;TYPE=WORK:contact@kayzen-lyon.fr');
    expect(vcf).toContain('URL:https://www.kayzen-lyon.com');
    expect(vcf).toContain('ADR;TYPE=WORK:;;6 rue Pierre Termier;Lyon;;69009;France');
    expect(vcf.trimEnd().endsWith('END:VCARD')).toBe(true);
  });
  it('a un QR code SVG statique, sans ressource externe', () => {
    expect(existsSync(join(pub, 'assets', 'qr-vcard.svg'))).toBe(true);
    const svg = read('assets/qr-vcard.svg');
    expect(svg).toMatch(/^<svg [^>]*viewBox="0 0 \d+ \d+"/);
    expect(svg).not.toMatch(/https?:\/\/(?!www\.w3\.org)/);
  });
});

describe('scripts du site : préférences locales, aucun appel réseau', () => {
  const js = read('assets/site.js') + read('assets/theme-init.js');
  it('mémorise thème et accessibilité dans localStorage avec try/catch', () => {
    expect(js).toMatch(/kayzen-flux-theme/);
    expect(js).toMatch(/kayzen-flux-a11y/);
    expect(js).toMatch(/prefers-color-scheme: dark/);
    expect((js.match(/try \{/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
  it('n’effectue aucune requête ni mesure d’audience', () => {
    expect(js).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|navigator\.sendBeacon/);
    expect(js).not.toMatch(/\.style\.|setAttribute\('style'/);
  });
});

import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Garde-fous de conformité issus de l'audit docs/CONFORMITE-UE.md (skill eu-web-compliance).
const site = join(import.meta.dirname, '..');
const pub = join(site, 'public');
const read = (f) => readFileSync(join(pub, f), 'utf8');
const pages = readdirSync(pub).filter((f) => f.endsWith('.html'));
const vercel = JSON.parse(readFileSync(join(site, 'vercel.json'), 'utf8'));
const globalHeaders = Object.fromEntries(
  vercel.headers.filter((r) => r.source === '/(.*)').flatMap((r) => r.headers).map((h) => [h.key, h.value]),
);

describe('en-têtes de sécurité (vercel.json) [ANSSI WEB, OWASP A02]', () => {
  it('déclare la base d’en-têtes du skill', () => {
    expect(globalHeaders['X-Frame-Options']).toBe('DENY');
    expect(globalHeaders['Cross-Origin-Opener-Policy']).toBe('same-origin');
    expect(globalHeaders['Cross-Origin-Resource-Policy']).toBe('same-origin');
    expect(globalHeaders['X-Content-Type-Options']).toBe('nosniff');
    expect(globalHeaders['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(globalHeaders['Strict-Transport-Security']).toMatch(/includeSubDomains/);
  });

  it('garde une CSP stricte, sans inline ni objet', () => {
    const csp = globalHeaders['Content-Security-Policy'];
    expect(csp).toMatch(/object-src 'none'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
  });

  it('reste hébergé dans la région UE fra1', () => {
    expect(vercel.regions).toEqual(['fra1']);
  });
});

describe('pages : accessibilité de base et absence de traceurs', () => {
  it.each(pages)('%s : langue, lien d’évitement, main#contenu, liens légaux', (page) => {
    const html = read(page);
    expect(html).toMatch(/<html lang="fr">/);
    expect(html).toMatch(/class="skip" href="#contenu"/);
    expect(html).toMatch(/<main[^>]*id="contenu"/);
    expect(html).toMatch(/href="\/mentions-legales"/);
    expect(html).toMatch(/href="\/confidentialite"/);
  });

  it.each(pages)('%s : aucun script ni ressource tierce', (page) => {
    const html = read(page);
    expect(html).not.toMatch(/<script[^>]+src="https?:/);
    expect(html).not.toMatch(/<link[^>]+href="https?:\/\/(?!flux\.kayzen-lyon\.com)[^"]*"[^>]*rel="stylesheet"/);
    expect(html).not.toMatch(/googletagmanager|gtag\(|matomo|plausible|hotjar|fonts\.googleapis/);
  });

  it('les images ont toutes un attribut alt', () => {
    for (const page of pages) {
      const imgs = read(page).match(/<img\b[^>]*>/g) ?? [];
      for (const img of imgs) expect(img, `${page} ${img}`).toMatch(/\salt="/);
    }
  });

  it('l’en-tête collant ne masque pas le focus [WCAG 2.4.11]', () => {
    expect(read('assets/style.css')).toMatch(/scroll-padding-top:\s*\d+px/);
  });
});

describe('mentions légales [LCEN art. 1-1]', () => {
  const html = read('mentions-legales.html');
  it('identifient éditeur, directeur de la publication et hébergeurs avec téléphone', () => {
    expect(html).toMatch(/Tarek BELHADJ, entrepreneur individuel/);
    expect(html).toMatch(/SIRET<\/dt><dd>493 857 262 00098/);
    expect(html).toMatch(/Directeur de la publication/);
    expect(html).not.toMatch(/à compléter/);
    expect(html).toMatch(/IONOS SARL, 7 place de la Gare, 57200 Sarreguemines/);
    expect(html).toMatch(/09 70 80 89 11/);
    expect(html).toMatch(/Vercel Inc\., 440 N Barranca Avenue/);
  });
  it('renvoient vers la politique de confidentialité', () => {
    expect(html).toMatch(/<a href="\/confidentialite">politique de confidentialité<\/a>/);
  });
});

describe('politique de confidentialité [RGPD art. 13]', () => {
  it('indique la base légale des journaux et les garanties de transfert de Vercel', () => {
    const html = read('confidentialite.html');
    expect(html).not.toMatch(/\[[^\]]*(compléter|confirmer)/);
    expect(html).toMatch(/article 6\.1\.f du RGPD/);
    expect(html).toMatch(/Data Privacy Framework/);
    expect(html).toMatch(/clauses contractuelles types/);
  });
});

describe('indexation par les moteurs de recherche', () => {
  it('autorise l\'indexation et publie robots.txt et sitemap.xml', () => {
    const cfg = readFileSync(join(__dirname, '..', 'vercel.json'), 'utf8');
    expect(cfg).not.toMatch(/noindex/);
    const robots = read('robots.txt');
    expect(robots).toMatch(/Sitemap: https:\/\/flux\.kayzen-lyon\.com\/sitemap\.xml/);
    expect(read('sitemap.xml')).toMatch(/<loc>https:\/\/flux\.kayzen-lyon\.com\/<\/loc>/);
  });
});

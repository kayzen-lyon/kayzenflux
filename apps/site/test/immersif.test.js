import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Garde-fous de la mise en scène « immersive » (mur, scène fixe, pied de page) :
// aplats uniquement, aucun contenu perdu, CSP respectée, aperçu jamais publié.
const pub = join(import.meta.dirname, '..', 'public');
const read = (f) => readFileSync(join(pub, f), 'utf8');
const pages = readdirSync(pub).filter((f) => f.endsWith('.html'));
const home = read('index.html');

describe('accueil : premier écran avec mur', () => {
  it('garde le titre, le chapô et les deux boutons, avec de vraies espaces dans le titre', () => {
    expect(home).toMatch(/<h1 id="titre">Vos vidéos et vos sons, <span class="accent">convertis chez vous\.<\/span><\/h1>/);
    expect(home).toMatch(/<a class="btn btn-primary" href="#telecharger">Télécharger gratuitement<\/a>/);
    expect(home).toMatch(/<a class="btn btn-ghost" href="https:\/\/github\.com\/kayzen-lyon\/kayzenflux">Voir le code source<\/a>/);
    expect(home).toMatch(/Windows, macOS et Linux, APK Android\./);
  });
  it('le mur est décoratif et monté par le script (aucune image dans le HTML)', () => {
    expect(home).toMatch(/<div class="im-wall" data-wall aria-hidden="true"><\/div>/);
    expect(home).toMatch(/<script src="\/assets\/immersif\.js" defer><\/script>/);
  });
  it('les vignettes du mur existent et restent légères (moins de 20 Ko)', () => {
    const js = read('assets/immersif.js');
    const names = js.match(/var WALL = \[([^\]]+)\]/)[1].match(/[a-z]+/g);
    expect(names.length).toBeGreaterThanOrEqual(3);
    for (const name of names) {
      const file = join(pub, 'assets', 'wall', `${name}.webp`);
      expect(existsSync(file), name).toBe(true);
      expect(readFileSync(file).length).toBeLessThan(20000);
    }
  });
});

describe('accueil : scène fixe, sans perte de contenu', () => {
  it('présente trois écrans, chacun avec sa capture décrite', () => {
    expect((home.match(/data-scene-item="/g) ?? []).length).toBe(3);
    for (const capture of ['capture-convertisseur', 'capture-bibliotheque', 'capture-abonnements']) {
      const imgs = home.match(new RegExp(`<img[^>]*src="/assets/${capture}\\.webp"[^>]*>`, 'g')) ?? [];
      expect(imgs.length, capture).toBe(2); // scène (bureau) + vignette (mobile)
      for (const img of imgs) expect(img).toMatch(/\salt="[^"]{20,}"/);
    }
  });
  it('garde les six fonctions et tout le contenu de la bibliothèque', () => {
    for (const title of ['Aucune publicité', 'Rien ne sort de chez vous', 'Des formats propres', 'Segments sponsorisés coupés', 'Transcription et résumé locaux', 'Playlists et abonnements']) {
      expect(home).toContain(`<h3>${title}</h3>`);
    }
    expect(home).toMatch(/id="bibliotheque"/);
    expect(home).toMatch(/id="titre-bibliotheque">Tout ce que vous avez récupéré, au même endroit\./);
    expect(home).toContain('La bibliothèque est stockée sur cet ordinateur uniquement et se lit hors connexion.');
    for (const item of ['Recherche, favoris, filtres audio ou vidéo', 'Lecteur intégré avec vitesse de lecture et mini-fenêtre', 'Export de l\'historique en un clic, suppression quand vous voulez']) {
      expect(home).toContain(`<li>${item}</li>`);
    }
  });
  it('garde les ancres du menu et du pied de page', () => {
    for (const id of ['fonctions', 'extension', 'comparatif', 'libre', 'telecharger', 'faq', 'kayzen']) {
      expect(home).toMatch(new RegExp(`<section id="${id}"`));
    }
  });
});

describe('script immersif : compatible CSP, défilement natif', () => {
  const js = read('assets/immersif.js');
  it('n’écrit aucun style inline et n’effectue aucune requête', () => {
    expect(js).not.toMatch(/\.style\.|setAttribute\('style'|innerHTML/);
    expect(js).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon|WebSocket/);
  });
  it('n’intercepte ni la molette ni le défilement', () => {
    expect(js).not.toMatch(/wheel|preventDefault|scrollTo\(/);
    expect(js).toMatch(/addEventListener\('scroll', onScroll, \{ passive: true \}\)/);
  });
});

describe('aperçu de travail', () => {
  it('n’est pas dans le dossier publié', () => {
    expect(existsSync(join(pub, 'apercu'))).toBe(false);
    for (const page of pages) expect(read(page)).not.toMatch(/\/apercu\//);
  });
});

describe('scène fixe : lisibilité', () => {
  it('n’atténue pas le texte des écrans non affichés (contraste WCAG 1.4.3)', () => {
    const css = read('assets/style.css');
    for (const rule of css.match(/\.im-item[^{]*\{[^}]*\}/g) ?? []) expect(rule).not.toMatch(/opacity/);
  });
});

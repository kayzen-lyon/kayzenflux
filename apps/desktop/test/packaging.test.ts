import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * L'icône de fenêtre est chargée à l'exécution depuis `build/icon.png`
 * (voir src/main.ts) : elle doit donc être embarquée dans le paquet.
 */
describe('electron-builder.yml', () => {
  const config = readFileSync(join(__dirname, '..', 'electron-builder.yml'), 'utf8');
  const filesBlock = config.split(/^files:\s*$/m)[1]?.split(/^\S/m)[0] ?? '';

  it('embarque l’icône de fenêtre utilisée par main.ts', () => {
    const main = readFileSync(join(__dirname, '..', 'src', 'main.ts'), 'utf8');
    expect(main).toContain("'../build/icon.png'");
    expect(filesBlock).toMatch(/^\s*-\s*build\/icon\.png\s*$/m);
  });
});

describe('outils embarqués par plateforme', () => {
  const config = readFileSync(join(__dirname, '..', 'electron-builder.yml'), 'utf8');

  it('ne dépend pas de la plateforme de la machine de construction', () => {
    expect(config).not.toMatch(/sidecars\/\$\{platform\}/);
  });

  it.each([
    ['linux', 'sidecars/linux-${arch}'],
    ['win', 'sidecars/win32-${arch}'],
    ['mac', 'sidecars/darwin-${arch}'],
  ])('la section %s embarque %s', (section, folder) => {
    const block = config.split(new RegExp(`^${section}:\\s*$`, 'm'))[1]?.split(/^\S/m)[0] ?? '';
    expect(block).toContain(`from: ${folder}`);
    expect(block).toMatch(/to: bin/);
  });
});

describe('mise à jour automatique', () => {
  const config = readFileSync(join(__dirname, '..', 'electron-builder.yml'), 'utf8');
  const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')) as { scripts: Record<string, string> };

  it('publie via un fournisseur generic en https, à l’adresse par défaut documentée', async () => {
    const { DEFAULT_UPDATE_URL, parseFeedUrl } = await import('../src/update-policy.js');
    const block = config.split(/^publish:\s*$/m)[1]?.split(/^\S/m)[0] ?? '';
    const yml = block.replace(/^\s+/gm, '');
    expect(parseFeedUrl(yml)).toBe(DEFAULT_UPDATE_URL);
  });

  it('produit le zip macOS requis par electron-updater', () => {
    const mac = config.split(/^mac:\s*$/m)[1]?.split(/^\S/m)[0] ?? '';
    expect(mac).toMatch(/target: \[dmg, zip\]/);
  });

  it('ne publie jamais automatiquement depuis les scripts de distribution', () => {
    for (const name of ['dist:linux', 'dist:win', 'dist:mac']) expect(pkg.scripts[name]).toMatch(/--publish never$/);
  });
});

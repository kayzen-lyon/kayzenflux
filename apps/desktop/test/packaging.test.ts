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

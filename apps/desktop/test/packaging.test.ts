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

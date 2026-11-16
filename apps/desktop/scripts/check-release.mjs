#!/usr/bin/env node
/** Bloque un build de distribution si la clé de licence de DÉVELOPPEMENT est encore embarquée. */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../daemon/src/license-key.ts'), 'utf8');
if (/LICENSE_KEY_IS_DEV = true/.test(src) && process.env.KAYZEN_ALLOW_DEV_KEY !== '1') {
  console.error('\n✗ Clé de licence de développement détectée.\n  Lancez « node tools/license.mjs keygen » à la racine avant de distribuer l’application.\n  (Pour un build de test uniquement : KAYZEN_ALLOW_DEV_KEY=1)\n');
  process.exit(1);
}
console.log(/LICENSE_KEY_IS_DEV = true/.test(src) ? '⚠ Build de TEST avec la clé de développement (ne pas distribuer).' : '✓ Clé de licence de production.');

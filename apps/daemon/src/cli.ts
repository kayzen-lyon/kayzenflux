import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from './config.js';
import { startDaemon } from './server.js';

// Lancement autonome : `node apps/daemon/dist/server.js` (sans l'application de bureau).
const here = dirname(fileURLToPath(import.meta.url));
const uiDir = process.env.KAYZEN_UI_DIR ?? resolve(here, '../../ui/dist');
startDaemon(loadConfig(process.env, uiDir))
  .then((h) => {
    console.log(`\n  KAYZEN Flux est prêt : ${h.url}\n  (accessible uniquement depuis cet ordinateur)\n`);
  })
  .catch((err: NodeJS.ErrnoException) => {
    console.error(err.code === 'EADDRINUSE' ? 'Le port est déjà utilisé : KAYZEN Flux tourne peut-être déjà.' : err);
    process.exit(1);
  });

/*
 * Serveur de DÉVELOPPEMENT de l'aperçu « site immersif ».
 *   node apps/site/apercu/serve.mjs   →   http://127.0.0.1:4178/apercu/
 * Sert le vrai site (public/) à la racine et ce dossier sous /apercu/, avec
 * les en-têtes de production de vercel.json (CSP comprise) pour vérifier que
 * l'aperçu les respecte. N'écoute que sur 127.0.0.1. Jamais déployé.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { extname, join, resolve, sep } from 'node:path';

const here = import.meta.dirname;
const publicDir = resolve(here, '..', 'public');
const previewDir = resolve(here);
const PORT = Number(process.env.PORT) || 4178;

const vercel = JSON.parse(readFileSync(resolve(here, '..', 'vercel.json'), 'utf8'));
const headers = Object.fromEntries(
  vercel.headers.filter((rule) => rule.source === '/(.*)').flatMap((rule) => rule.headers).map((h) => [h.key, h.value]),
);

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.vcf': 'text/vcard; charset=utf-8',
};

/** Chemin de fichier à servir, ou null si la requête sort du dossier autorisé. */
function locate(pathname) {
  const inPreview = pathname === '/apercu' || pathname.startsWith('/apercu/');
  const root = inPreview ? previewDir : publicDir;
  let rel = inPreview ? pathname.slice('/apercu'.length) : pathname;
  if (rel === '' || rel.endsWith('/')) rel += 'index.html';
  else if (extname(rel) === '') rel += '.html'; // « cleanUrls » de Vercel
  const file = resolve(join(root, rel));
  return file === root || file.startsWith(root + sep) ? file : null;
}

createServer(async (req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  } catch {
    res.writeHead(400, headers).end('Requête invalide');
    return;
  }
  const file = locate(pathname);
  try {
    if (!file) throw new Error('hors dossier');
    const body = await readFile(file);
    res.writeHead(200, { ...headers, 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404, { ...headers, 'Content-Type': 'text/plain; charset=utf-8' }).end('Introuvable');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Aperçu immersif : http://127.0.0.1:${PORT}/apercu/   (site actuel : http://127.0.0.1:${PORT}/)`);
});

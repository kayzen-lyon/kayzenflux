#!/usr/bin/env node
/**
 * Construit l'extension pour Chromium (Chrome, Edge, Brave, Opera) et Firefox.
 *   node scripts/build.mjs          → dist/chromium, dist/firefox
 *   node scripts/build.mjs --zip    → + release/*.zip prêts pour les stores
 */
import { build } from 'esbuild';
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const MATCHES = ['https://www.youtube.com/*', 'https://m.youtube.com/*', 'https://music.youtube.com/*'];

const base = {
  manifest_version: 3,
  name: 'KAYZEN Flux — Lecture sans pub',
  short_name: 'KAYZEN Flux',
  version,
  description: 'Lecture vidéo sans publicité, saut des segments sponsorisés et envoi vers l’application KAYZEN Flux. Aucune collecte de données.',
  homepage_url: 'https://flux.kayzen-lyon.com',
  icons: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png', 48: 'icons/icon-48.png', 128: 'icons/icon-128.png' },
  action: { default_popup: 'popup.html', default_title: 'KAYZEN Flux', default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' } },
  permissions: ['storage', 'scripting', 'declarativeNetRequest', 'contextMenus', 'activeTab'],
  host_permissions: [...MATCHES, 'https://sponsor.ajay.app/*'],
  content_scripts: [{ matches: MATCHES, js: ['content.js'], css: ['content.css'], run_at: 'document_start' }],
  declarative_net_request: { rule_resources: [{ id: 'ads', enabled: true, path: 'rules.json' }] },
};

const targets = {
  chromium: { ...base, background: { service_worker: 'background.js', type: 'module' }, minimum_chrome_version: '111' },
  firefox: {
    ...base,
    background: { scripts: ['background.js'], type: 'module' },
    browser_specific_settings: { gecko: { id: 'flux@kayzen-lyon.com', strict_min_version: '128.0', data_collection_permissions: { required: ['none'] } } },
  },
};

rmSync(join(root, 'dist'), { recursive: true, force: true });
for (const [name, manifest] of Object.entries(targets)) {
  const out = join(root, 'dist', name);
  mkdirSync(out, { recursive: true });
  // Script d'arrière-plan (module ES).
  await build({ entryPoints: [join(root, 'src', 'background.ts')], bundle: true, format: 'esm', target: ['chrome111', 'firefox128'], outfile: join(out, 'background.js'), logLevel: 'warning' });
  // Les scripts de contenu ne sont pas des modules : on les emballe en IIFE.
  for (const n of ['content', 'inject', 'popup']) {
    await build({ entryPoints: [join(root, 'src', `${n}.ts`)], bundle: true, format: 'iife', target: ['chrome111', 'firefox128'], outfile: join(out, `${n}.js`), logLevel: 'warning' });
  }
  cpSync(join(root, 'static'), out, { recursive: true });
  writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`✓ ${name} → ${out}`);
}

if (process.argv.includes('--zip')) {
  const rel = join(root, 'release');
  mkdirSync(rel, { recursive: true });
  for (const name of Object.keys(targets)) {
    const file = join(rel, `kayzen-flux-extension-${name}-${version}.zip`);
    rmSync(file, { force: true });
    execFileSync('zip', ['-qr', file, '.'], { cwd: join(root, 'dist', name) });
    console.log(`✓ ${file}`);
  }
}

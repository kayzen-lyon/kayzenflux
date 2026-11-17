#!/usr/bin/env node
/**
 * Télécharge les binaires embarqués (« sidecars ») pour une plateforme, vérifie
 * leur empreinte SHA-256 publiée par l'éditeur, puis écrit un manifeste
 * d'intégrité que l'application revérifie au démarrage.
 *
 *   node scripts/fetch-sidecars.mjs linux-x64 | win-x64 | mac-arm64 | mac-x64
 *
 * Sources officielles :
 *   yt-dlp  https://github.com/yt-dlp/yt-dlp/releases (Unlicense)
 *   ffmpeg  https://github.com/yt-dlp/FFmpeg-Builds (Linux/Windows) — https://github.com/eugeneware/ffmpeg-static (macOS)
 *   deno    https://github.com/denoland/deno/releases (MIT)
 */
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync, readFileSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';

const here = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2] ?? `${process.platform === 'win32' ? 'win' : process.platform === 'darwin' ? 'mac' : 'linux'}-${process.arch}`;
const PLATFORMS = {
  'linux-x64': {
    ytdlp: ['yt-dlp_linux', 'yt-dlp'],
    ffmpeg: { kind: 'tar', file: 'ffmpeg-master-latest-linux64-gpl.tar.xz' },
    deno: 'deno-x86_64-unknown-linux-gnu.zip',
    exe: '',
  },
  'win-x64': {
    ytdlp: ['yt-dlp.exe', 'yt-dlp.exe'],
    ffmpeg: { kind: 'zip', file: 'ffmpeg-master-latest-win64-gpl.zip' },
    deno: 'deno-x86_64-pc-windows-msvc.zip',
    exe: '.exe',
  },
  'mac-arm64': {
    ytdlp: ['yt-dlp_macos', 'yt-dlp'],
    ffmpeg: { kind: 'static', arch: 'arm64' },
    deno: 'deno-aarch64-apple-darwin.zip',
    exe: '',
  },
  'mac-x64': {
    ytdlp: ['yt-dlp_macos', 'yt-dlp'],
    ffmpeg: { kind: 'static', arch: 'x64' },
    deno: 'deno-x86_64-apple-darwin.zip',
    exe: '',
  },
};
const conf = PLATFORMS[target];
if (!conf) {
  console.error(`Plateforme inconnue : ${target}. Choix : ${Object.keys(PLATFORMS).join(', ')}`);
  process.exit(1);
}

// Nom de dossier = ${platform}-${arch} au sens d'electron-builder (linux, win32, darwin).
const out = resolve(here, '..', 'sidecars', target.replace('win-', 'win32-').replace('mac-', 'darwin-'));
const tmp = resolve(here, '..', 'sidecars', `.tmp-${target}`);
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });
mkdirSync(out, { recursive: true });

async function get(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${res.status} pour ${url}`);
  return Buffer.from(await res.arrayBuffer());
}
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
function expectHash(buf, expected, name) {
  const got = sha256(buf);
  if (!expected) throw new Error(`Empreinte publiée introuvable pour ${name}`);
  if (got !== expected.toLowerCase()) throw new Error(`Empreinte SHA-256 invalide pour ${name} : ${got} ≠ ${expected}`);
  console.log(`  ✓ ${name} (sha256 ${got.slice(0, 16)}…)`);
}
// Sous Windows, on force le tar du système (bsdtar, lit les .zip) : le tar GNU de Git Bash prend « D: » pour un hôte distant.
const TAR = process.platform === 'win32' ? join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
const sumsLookup = (text, name) => text.split('\n').map((l) => l.trim().split(/\s+\*?/)).find((p) => p[1] === name)?.[0];

console.log(`Sidecars pour ${target} → ${out}`);

// 1. yt-dlp (binaire autonome officiel)
{
  const base = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
  const [asset, name] = conf.ytdlp;
  const sums = (await get(base + 'SHA2-256SUMS')).toString('utf8');
  const bin = await get(base + asset);
  expectHash(bin, sumsLookup(sums, asset), asset);
  writeFileSync(join(out, name), bin);
}

// 2. ffmpeg + ffprobe
if (conf.ffmpeg.kind === 'static') {
  const base = 'https://github.com/eugeneware/ffmpeg-static/releases/download/b6.0/';
  for (const tool of ['ffmpeg', 'ffprobe']) {
    const asset = `${tool}-darwin-${conf.ffmpeg.arch}.gz`;
    const gz = await get(base + asset);
    // ffmpeg-static ne publie pas de fichier d'empreintes : on enregistre celle du binaire reçu.
    const bin = gunzipSync(gz);
    console.log(`  • ${asset} (sha256 ${sha256(bin).slice(0, 16)}… — à épingler après vérification manuelle)`);
    writeFileSync(join(out, tool), bin);
  }
} else {
  const base = 'https://github.com/yt-dlp/FFmpeg-Builds/releases/download/latest/';
  const sums = (await get(base + 'checksums.sha256')).toString('utf8');
  const archive = await get(base + conf.ffmpeg.file);
  expectHash(archive, sumsLookup(sums, conf.ffmpeg.file), conf.ffmpeg.file);
  const file = join(tmp, conf.ffmpeg.file);
  writeFileSync(file, archive);
  if (conf.ffmpeg.kind === 'tar') execFileSync(TAR, ['-xJf', file, '-C', tmp]);
  else execFileSync(process.platform === 'win32' ? TAR : 'unzip', process.platform === 'win32' ? ['-xf', file, '-C', tmp] : ['-q', file, '-d', tmp]);
  const dir = readdirSync(tmp).map((d) => join(tmp, d)).find((d) => statSync(d).isDirectory());
  for (const tool of ['ffmpeg', 'ffprobe']) copyFileSync(join(dir, 'bin', tool + conf.exe), join(out, tool + conf.exe));
  copyFileSync(join(dir, 'LICENSE.txt'), join(out, 'FFMPEG-LICENSE.txt'));
}

// 3. Deno (moteur JavaScript recommandé par yt-dlp)
{
  const base = 'https://github.com/denoland/deno/releases/latest/download/';
  const zip = await get(base + conf.deno);
  const sumText = (await get(base + conf.deno + '.sha256sum')).toString('utf8');
  expectHash(zip, (/[a-f0-9]{64}/i.exec(sumText) ?? [])[0], conf.deno); // format Unix ou tableau PowerShell selon la plateforme
  const file = join(tmp, conf.deno);
  writeFileSync(file, zip);
  execFileSync(process.platform === 'win32' ? TAR : 'unzip', process.platform === 'win32' ? ['-xf', file, '-C', tmp] : ['-q', '-o', file, '-d', tmp]);
  renameSync(join(tmp, 'deno' + conf.exe), join(out, 'deno' + conf.exe));
}

// 4. Droits d'exécution + manifeste d'intégrité
const manifest = { platform: target, generatedAt: new Date().toISOString(), files: {} };
for (const name of readdirSync(out)) {
  if (name === 'manifest.json') continue;
  const p = join(out, name);
  if (!name.endsWith('.txt')) try { chmodSync(p, 0o755); } catch {}
  manifest.files[name] = sha256(readFileSync(p));
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2));
rmSync(tmp, { recursive: true, force: true });
console.log(`Manifeste écrit : ${Object.keys(manifest.files).join(', ')}`);
if (!existsSync(join(out, 'yt-dlp' + conf.exe))) process.exit(1);

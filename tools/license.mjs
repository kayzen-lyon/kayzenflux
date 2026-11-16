#!/usr/bin/env node
/**
 * Outil éditeur KAYZEN Flux — gestion des licences Premium (Ed25519).
 *
 *   node tools/license.mjs keygen                 crée la paire de clés de PRODUCTION
 *                                                 (keys/private.pem, à garder secret) et
 *                                                 écrit la clé publique dans l'application
 *   node tools/license.mjs issue <email> [--name "Nom"] [--days 365] [--key keys/private.pem]
 *                                                 émet une licence (sans --days : à vie)
 *   node tools/license.mjs verify <licence>       vérifie une licence avec la clé publique embarquée
 */
import { generateKeyPairSync, createPrivateKey, createPublicKey, sign, verify, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync, chmodSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pubFile = join(root, 'apps/daemon/src/license-key.ts');
const [cmd, ...rest] = process.argv.slice(2);
const opt = (name, def) => {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : def;
};

function writePublicKey(pem, isDev) {
  writeFileSync(
    pubFile,
    `/**\n * Clé PUBLIQUE de vérification des licences (générée par tools/license.mjs).\n * ${isDev ? 'ATTENTION : clé de DÉVELOPPEMENT. Lancer « node tools/license.mjs keygen » avant toute publication.' : 'Clé de production.'}\n */\nexport const LICENSE_PUBLIC_KEY_PEM = \`${pem.trim()}\`;\nexport const LICENSE_KEY_IS_DEV = ${isDev};\n`,
  );
}

if (cmd === 'keygen' || cmd === 'keygen-dev') {
  const isDev = cmd === 'keygen-dev';
  const dir = join(root, isDev ? 'tools/dev-keys' : 'keys');
  const target = join(dir, 'private.pem');
  if (!isDev && existsSync(target) && !rest.includes('--force')) {
    console.error(`Une clé existe déjà (${target}). Ajoutez --force pour la remplacer (toutes les licences émises deviendront invalides).`);
    process.exit(1);
  }
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  mkdirSync(dir, { recursive: true });
  writeFileSync(target, privateKey.export({ type: 'pkcs8', format: 'pem' }));
  try { chmodSync(target, 0o600); } catch {}
  writePublicKey(publicKey.export({ type: 'spki', format: 'pem' }).toString(), isDev);
  console.log(`Clé privée : ${target}${isDev ? '' : '  ← À SAUVEGARDER HORS LIGNE, NE JAMAIS LA PARTAGER'}`);
  console.log(`Clé publique écrite dans ${pubFile}`);
} else if (cmd === 'issue') {
  const email = rest[0];
  if (!email || !email.includes('@')) {
    console.error('Usage : node tools/license.mjs issue <email> [--name "Nom"] [--days 365] [--key keys/private.pem]');
    process.exit(1);
  }
  const keyPath = resolve(opt('key', existsSync(join(root, 'keys/private.pem')) ? join(root, 'keys/private.pem') : join(root, 'tools/dev-keys/private.pem')));
  const days = opt('days');
  const payload = {
    v: 1,
    id: randomUUID(),
    email,
    ...(opt('name') ? { name: opt('name') } : {}),
    plan: 'premium',
    issuedAt: new Date().toISOString(),
    expiresAt: days ? new Date(Date.now() + Number(days) * 86400000).toISOString() : null,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(null, Buffer.from(`KZF1.${body}`), createPrivateKey(readFileSync(keyPath))).toString('base64url');
  console.log(`KZF1.${body}.${sig}`);
} else if (cmd === 'verify') {
  const src = readFileSync(pubFile, 'utf8');
  const pem = /`([\s\S]+?)`/.exec(src)[1];
  const [p, body, sig] = (rest[0] ?? '').split('.');
  const ok = p === 'KZF1' && verify(null, Buffer.from(`KZF1.${body}`), createPublicKey(pem), Buffer.from(sig ?? '', 'base64url'));
  console.log(ok ? `Valide : ${Buffer.from(body, 'base64url').toString('utf8')}` : 'INVALIDE');
  process.exit(ok ? 0 : 1);
} else {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(2, 12).join('\n'));
}

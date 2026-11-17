#!/usr/bin/env node
/**
 * Vérifie la configuration d'envoi des licences (étape 4 du guide) en envoyant
 * une VRAIE licence de test à votre adresse, exactement comme après un achat.
 *
 *   RESEND_API_KEY=re_xxx MAIL_FROM="KAYZEN Flux <licences@kayzen-lyon.fr>" \
 *     node tools/test-mail.mjs votre@adresse.fr [--key keys/private.pem]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { issueLicense, licenseEmail } from '../apps/site/api/stripe-webhook.js';

const to = process.argv[2];
const i = process.argv.indexOf('--key');
const keyPath = resolve(i > 0 ? process.argv[i + 1] : 'keys/private.pem');
if (!to?.includes('@') || !process.env.RESEND_API_KEY || !process.env.MAIL_FROM) {
  console.error('Usage : RESEND_API_KEY=… MAIL_FROM="KAYZEN Flux <licences@kayzen-lyon.fr>" node tools/test-mail.mjs votre@adresse.fr');
  process.exit(1);
}
const { key, payload } = issueLicense({ email: to, name: 'Test', plan: 'monthly', privateKeyPem: readFileSync(keyPath, 'utf8') });
const mail = licenseEmail({ key, payload, plan: 'monthly' });
const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ from: process.env.MAIL_FROM, to: [to], reply_to: 'contact@kayzen-lyon.fr', subject: `[TEST] ${mail.subject}`, text: mail.text, html: mail.html }),
});
const body = await res.text();
if (res.ok) console.log(`✓ E-mail envoyé à ${to} (licence de test valable 35 jours). Réponse Resend : ${body}`);
else {
  console.error(`✗ Échec (${res.status}) : ${body}`);
  console.error('  Vérifiez la clé API et que le domaine de MAIL_FROM est bien « Verified » dans Resend.');
  process.exit(1);
}

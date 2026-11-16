/**
 * Webhook Stripe → émission et envoi automatiques de la licence KAYZEN Flux.
 * Fonction Vercel (runtime Node). Variables d'environnement requises :
 *   STRIPE_WEBHOOK_SECRET        secret de signature du webhook (whsec_…)
 *   KAYZEN_LICENSE_PRIVATE_KEY   contenu de keys/private.pem (clé PRIVÉE de production)
 *   RESEND_API_KEY               clé API Resend (envoi de l'e-mail)
 *   MAIL_FROM                    ex. « KAYZEN Flux <licences@kayzen-lyon.fr> » (domaine vérifié chez Resend)
 * Facultatif :
 *   PLAN_BY_AMOUNT               ex. {"399":"monthly","2900":"yearly","5900":"lifetime"} (montants en centimes)
 *
 * Événements à activer dans Stripe : checkout.session.completed, invoice.paid
 */
import { createHmac, createPrivateKey, randomUUID, sign, timingSafeEqual } from 'node:crypto';

const DEFAULT_PLANS = { 399: 'monthly', 2900: 'yearly', 5900: 'lifetime' };
const DURATION_DAYS = { monthly: 35, yearly: 370, lifetime: null };
const PLAN_LABEL = { monthly: 'Premium mensuel', yearly: 'Premium annuel', lifetime: 'Premium à vie' };

/** Vérifie l'en-tête Stripe-Signature (HMAC-SHA256, tolérance 5 minutes). */
export function verifyStripeSignature(rawBody, header, secret, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header || !secret) return false;
  const parts = Object.fromEntries(
    header.split(',').map((kv) => {
      const i = kv.indexOf('=');
      return [kv.slice(0, i).trim(), kv.slice(i + 1).trim()];
    }),
  );
  const t = Number(parts.t);
  if (!Number.isFinite(t) || Math.abs(nowSec - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${t}.${rawBody}`).digest('hex');
  const candidates = header
    .split(',')
    .filter((kv) => kv.trim().startsWith('v1='))
    .map((kv) => kv.trim().slice(3));
  return candidates.some((sig) => sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected)));
}

export function issueLicense({ email, name, plan, privateKeyPem, now = new Date() }) {
  const days = DURATION_DAYS[plan];
  const payload = {
    v: 1,
    id: randomUUID(),
    email,
    ...(name ? { name } : {}),
    plan: 'premium',
    issuedAt: now.toISOString(),
    expiresAt: days === null ? null : new Date(now.getTime() + days * 86_400_000).toISOString(),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = sign(null, Buffer.from(`KZF1.${body}`), createPrivateKey(privateKeyPem)).toString('base64url');
  return { key: `KZF1.${body}.${sig}`, payload };
}

function planFor(amount, env) {
  let map = DEFAULT_PLANS;
  try {
    if (env.PLAN_BY_AMOUNT) map = JSON.parse(env.PLAN_BY_AMOUNT);
  } catch {
    /* configuration invalide : valeurs par défaut */
  }
  return map[String(amount)] ?? null;
}

/** Extrait (e-mail, nom, offre) d'un événement Stripe, ou null s'il n'appelle pas de licence. */
export function licenseRequestFromEvent(event, env = {}) {
  const obj = event?.data?.object ?? {};
  if (event?.type === 'checkout.session.completed') {
    if (obj.payment_status !== 'paid' && obj.payment_status !== 'no_payment_required') return null;
    const email = obj.customer_details?.email ?? obj.customer_email;
    const plan = obj.metadata?.plan ?? planFor(obj.amount_total, env);
    return email && plan ? { email, name: obj.customer_details?.name ?? null, plan } : null;
  }
  // Renouvellement d'abonnement : nouvelle clé avec la nouvelle échéance.
  if (event?.type === 'invoice.paid' && obj.billing_reason === 'subscription_cycle') {
    const email = obj.customer_email;
    const plan = planFor(obj.amount_paid, env);
    return email && plan && plan !== 'lifetime' ? { email, name: obj.customer_name ?? null, plan } : null;
  }
  return null;
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function licenseEmail({ key, payload, plan }) {
  const until = payload.expiresAt ? `valable jusqu'au ${new Date(payload.expiresAt).toLocaleDateString('fr-FR')} (renouvelée automatiquement avec votre abonnement)` : 'valable à vie';
  const text = `Bonjour${payload.name ? ` ${payload.name}` : ''},

Merci pour votre achat de KAYZEN Flux ${PLAN_LABEL[plan]}.

Votre clé de licence (${until}) :

${key}

Pour l'activer : ouvrez KAYZEN Flux > Moteur & Paramètres > Clé de licence, collez la clé puis cliquez sur « Activer Premium ».

Une question ? Répondez simplement à cet e-mail.

KAYZEN — Lyon
https://flux.kayzen-lyon.com`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:560px;color:#1f2937">
<h1 style="font-size:22px">Merci pour votre achat !</h1>
<p>Votre licence <strong>KAYZEN Flux ${PLAN_LABEL[plan]}</strong> est ${escapeHtml(until)}.</p>
<p style="background:#f2f5f7;border-radius:12px;padding:14px;font-family:monospace;font-size:12px;word-break:break-all">${escapeHtml(key)}</p>
<p>Pour l'activer : <strong>Moteur &amp; Paramètres &gt; Clé de licence</strong>, collez la clé puis cliquez sur « Activer Premium ».</p>
<p style="color:#586474;font-size:13px">KAYZEN — Lyon · Une question ? Répondez à cet e-mail.</p></div>`;
  return { subject: `Votre licence KAYZEN Flux ${PLAN_LABEL[plan]}`, text, html };
}

export async function handleStripeWebhook(request, env = process.env, fetchImpl = fetch) {
  const raw = await request.text();
  if (!verifyStripeSignature(raw, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET)) {
    return new Response('Signature invalide', { status: 400 });
  }
  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response('JSON invalide', { status: 400 });
  }
  const req = licenseRequestFromEvent(event, env);
  if (!req) return Response.json({ received: true, ignored: event.type });
  if (!env.KAYZEN_LICENSE_PRIVATE_KEY || !env.RESEND_API_KEY || !env.MAIL_FROM) {
    console.error('[licence] Configuration incomplète : clé privée, RESEND_API_KEY ou MAIL_FROM manquant.');
    return new Response('Configuration incomplète', { status: 500 }); // Stripe réessaiera
  }
  const { key, payload } = issueLicense({ ...req, privateKeyPem: env.KAYZEN_LICENSE_PRIVATE_KEY.replace(/\\n/g, '\n') });
  const mail = licenseEmail({ key, payload, plan: req.plan });
  const res = await fetchImpl('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.MAIL_FROM, to: [req.email], reply_to: 'contact@kayzen-lyon.fr', subject: mail.subject, text: mail.text, html: mail.html }),
  });
  if (!res.ok) {
    console.error('[licence] Échec de l’envoi :', res.status);
    return new Response('Envoi impossible', { status: 502 });
  }
  console.log(`[licence] ${payload.id} envoyée (${req.plan})`);
  return Response.json({ received: true, licenseId: payload.id });
}

export async function POST(request) {
  return handleStripeWebhook(request);
}

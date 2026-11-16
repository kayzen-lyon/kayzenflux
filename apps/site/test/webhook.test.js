import { describe, expect, it, vi } from 'vitest';
import { createHmac, generateKeyPairSync, verify } from 'node:crypto';
import { handleStripeWebhook, licenseRequestFromEvent, verifyStripeSignature } from '../api/stripe-webhook.js';

const SECRET = 'whsec_test';
const { privateKey, publicKey } = generateKeyPairSync('ed25519');
const ENV = {
  STRIPE_WEBHOOK_SECRET: SECRET,
  KAYZEN_LICENSE_PRIVATE_KEY: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
  RESEND_API_KEY: 're_test',
  MAIL_FROM: 'KAYZEN Flux <licences@kayzen-lyon.fr>',
};

function signed(body, t = Math.floor(Date.now() / 1000), secret = SECRET) {
  const raw = JSON.stringify(body);
  const sig = createHmac('sha256', secret).update(`${t}.${raw}`).digest('hex');
  return new Request('https://flux.kayzen-lyon.com/api/stripe-webhook', { method: 'POST', body: raw, headers: { 'stripe-signature': `t=${t},v1=${sig}` } });
}

const checkout = (amount, extra = {}) => ({
  type: 'checkout.session.completed',
  data: { object: { payment_status: 'paid', amount_total: amount, customer_details: { email: 'client@exemple.fr', name: 'Client Test' }, ...extra } },
});

describe('signature Stripe', () => {
  it('accepte une signature valide et refuse le reste', () => {
    const t = 1_800_000_000;
    const sig = createHmac('sha256', SECRET).update(`${t}.{}`).digest('hex');
    expect(verifyStripeSignature('{}', `t=${t},v1=${sig}`, SECRET, t)).toBe(true);
    expect(verifyStripeSignature('{"x":1}', `t=${t},v1=${sig}`, SECRET, t)).toBe(false);
    expect(verifyStripeSignature('{}', `t=${t},v1=${sig}`, SECRET, t + 1000)).toBe(false);
    expect(verifyStripeSignature('{}', `t=${t},v1=${sig}`, 'autre', t)).toBe(false);
    expect(verifyStripeSignature('{}', null, SECRET, t)).toBe(false);
  });
});

describe('événements', () => {
  it('reconnaît les offres par montant', () => {
    expect(licenseRequestFromEvent(checkout(399))?.plan).toBe('monthly');
    expect(licenseRequestFromEvent(checkout(5900))?.plan).toBe('lifetime');
    expect(licenseRequestFromEvent(checkout(1234))).toBeNull();
    expect(licenseRequestFromEvent(checkout(399, { payment_status: 'unpaid' }))).toBeNull();
    expect(licenseRequestFromEvent({ type: 'invoice.paid', data: { object: { billing_reason: 'subscription_cycle', customer_email: 'a@b.fr', amount_paid: 2900 } } })?.plan).toBe('yearly');
    expect(licenseRequestFromEvent({ type: 'invoice.paid', data: { object: { billing_reason: 'subscription_create', customer_email: 'a@b.fr', amount_paid: 2900 } } })).toBeNull();
  });
});

describe('webhook complet', () => {
  it('refuse une signature invalide', async () => {
    const res = await handleStripeWebhook(signed(checkout(2900), undefined, 'mauvais'), ENV, vi.fn());
    expect(res.status).toBe(400);
  });

  it('émet une licence valide et l’envoie par e-mail', async () => {
    const send = vi.fn(async () => new Response('{}', { status: 200 }));
    const res = await handleStripeWebhook(signed(checkout(2900)), ENV, send);
    expect(res.status).toBe(200);
    const mail = JSON.parse(send.mock.calls[0][1].body);
    expect(mail.to).toEqual(['client@exemple.fr']);
    const key = /KZF1\.[\w-]+\.[\w-]+/.exec(mail.text)[0];
    const [, body, sig] = key.split('.');
    expect(verify(null, Buffer.from(`KZF1.${body}`), publicKey, Buffer.from(sig, 'base64url'))).toBe(true);
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    expect(payload).toMatchObject({ email: 'client@exemple.fr', plan: 'premium', name: 'Client Test' });
    expect(new Date(payload.expiresAt).getTime()).toBeGreaterThan(Date.now() + 360 * 86_400_000);
  });

  it('ignore les événements sans licence et signale une configuration incomplète', async () => {
    expect((await (await handleStripeWebhook(signed({ type: 'customer.created', data: { object: {} } }), ENV, vi.fn())).json()).ignored).toBe('customer.created');
    const res = await handleStripeWebhook(signed(checkout(399)), { STRIPE_WEBHOOK_SECRET: SECRET }, vi.fn());
    expect(res.status).toBe(500);
  });
});

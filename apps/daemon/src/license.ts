import { createPublicKey, verify, type KeyObject } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Tier } from '@kayzen-flux/core';
import { LICENSE_PUBLIC_KEY_PEM } from './license-key.js';

/**
 * Licences Premium signées Ed25519, vérifiées hors ligne.
 * Format : KZF1.<payload base64url>.<signature base64url>
 * La clé privée n'est JAMAIS dans l'application : elle reste chez l'éditeur
 * (voir tools/license.mjs).
 */
export interface LicensePayload {
  v: 1;
  id: string;
  email: string;
  name?: string;
  plan: 'premium';
  issuedAt: string;
  /** null = licence à vie. */
  expiresAt: string | null;
}

export type LicenseCheck =
  | { valid: true; payload: LicensePayload }
  | { valid: false; reason: string };

const PREFIX = 'KZF1';

export function verifyLicense(key: string, publicKey: KeyObject | string = LICENSE_PUBLIC_KEY_PEM, now = new Date()): LicenseCheck {
  const clean = (key ?? '').replace(/\s+/g, '');
  const parts = clean.split('.');
  if (parts.length !== 3 || parts[0] !== PREFIX) return { valid: false, reason: 'Format de licence invalide.' };
  const [, body, sig] = parts as [string, string, string];
  let ok = false;
  try {
    const pub = typeof publicKey === 'string' ? createPublicKey(publicKey) : publicKey;
    ok = verify(null, Buffer.from(`${PREFIX}.${body}`), pub, Buffer.from(sig, 'base64url'));
  } catch {
    ok = false;
  }
  if (!ok) return { valid: false, reason: 'Signature de licence invalide.' };
  let payload: LicensePayload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as LicensePayload;
  } catch {
    return { valid: false, reason: 'Licence illisible.' };
  }
  if (payload.v !== 1 || payload.plan !== 'premium' || typeof payload.email !== 'string') {
    return { valid: false, reason: 'Licence non reconnue.' };
  }
  if (payload.expiresAt && new Date(payload.expiresAt).getTime() < now.getTime()) {
    return { valid: false, reason: `Licence expirée le ${new Date(payload.expiresAt).toLocaleDateString('fr-FR')}.` };
  }
  return { valid: true, payload };
}

export interface LicenseState {
  tier: Tier;
  source: 'license' | 'env' | 'none';
  email: string | null;
  name: string | null;
  expiresAt: string | null;
  error: string | null;
}

/** Garde la licence active (fichier license.json dans le dossier de données). */
export class LicenseManager {
  private state: LicenseState = { tier: 'free', source: 'none', email: null, name: null, expiresAt: null, error: null };

  constructor(
    private readonly dataDir: string,
    private readonly envTier: Tier | null,
    private readonly publicKey: string = LICENSE_PUBLIC_KEY_PEM,
  ) {}

  get tier(): Tier {
    return this.state.tier;
  }

  getState(): LicenseState {
    return { ...this.state };
  }

  async init(): Promise<void> {
    if (this.envTier === 'premium') {
      this.state = { tier: 'premium', source: 'env', email: null, name: 'Mode développement', expiresAt: null, error: null };
      return;
    }
    try {
      const saved = JSON.parse(await readFile(this.file(), 'utf8')) as { key?: string };
      if (saved.key) this.apply(saved.key);
    } catch {
      /* aucune licence */
    }
  }

  async activate(key: string): Promise<LicenseState> {
    const res = this.apply(key);
    if (!res.valid) throw new Error(res.reason);
    await mkdir(this.dataDir, { recursive: true });
    await writeFile(this.file(), JSON.stringify({ key: key.replace(/\s+/g, '') }), { encoding: 'utf8', mode: 0o600 });
    return this.getState();
  }

  async deactivate(): Promise<LicenseState> {
    await rm(this.file(), { force: true });
    this.state = { tier: this.envTier ?? 'free', source: this.envTier ? 'env' : 'none', email: null, name: null, expiresAt: null, error: null };
    return this.getState();
  }

  private apply(key: string): LicenseCheck {
    const res = verifyLicense(key, this.publicKey);
    if (res.valid) {
      this.state = {
        tier: 'premium',
        source: 'license',
        email: res.payload.email,
        name: res.payload.name ?? null,
        expiresAt: res.payload.expiresAt,
        error: null,
      };
    } else {
      this.state = { ...this.state, tier: 'free', source: 'none', error: res.reason };
    }
    return res;
  }

  private file(): string {
    return join(this.dataDir, 'license.json');
  }
}

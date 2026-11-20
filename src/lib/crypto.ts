/**
 * Chiffrement de bout en bout. Tout part du secret du foyer (32 octets), partagé
 * par le code d'invitation. On en dérive :
 * - householdId : identifiant du foyer côté serveur ;
 * - token       : mot de passe du foyer auprès du serveur (le serveur n'en garde qu'un hash) ;
 * - encKey      : clé AES-GCM qui chiffre chaque enregistrement ;
 * - ridKey      : clé HMAC qui calcule l'identifiant opaque de chaque enregistrement.
 * Le serveur ne voit donc ni n° de commande, ni prénom, ni qui cache quoi à qui.
 */

const te = new TextEncoder();
const td = new TextDecoder();
// Ne jamais changer : les clés de tous les foyers existants en dépendent (ancien nom du projet).
const SALT = te.encode('cache-cadeau/v1');
export const INVITE_PREFIX = 'PSST-';

export function b64u(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64u(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function randomId(bytes = 9): string {
  return b64u(crypto.getRandomValues(new Uint8Array(bytes)));
}

export function newSecret(): string {
  return b64u(crypto.getRandomValues(new Uint8Array(32)));
}

export function inviteCode(secret: string): string {
  return INVITE_PREFIX + secret;
}

/** Accepte le code avec ou sans préfixe (PSST- ou l'ancien CC1-), espaces et retours à la ligne compris. */
export function parseInviteCode(code: string): string | null {
  const s = code.replace(/\s+/g, '').replace(/^(PSST|CC1)-/i, '');
  if (!/^[A-Za-z0-9_-]{43}$/.test(s)) return null;
  return fromB64u(s).length === 32 ? s : null;
}

export interface HouseholdKeys {
  householdId: string;
  token: string;
  encKey: CryptoKey;
  ridKey: CryptoKey;
}

export async function deriveKeys(secret: string): Promise<HouseholdKeys> {
  const ikm = await crypto.subtle.importKey('raw', fromB64u(secret), 'HKDF', false, [
    'deriveBits',
    'deriveKey',
  ]);
  const params = (info: string): HkdfParams => ({
    name: 'HKDF',
    hash: 'SHA-256',
    salt: SALT,
    info: te.encode(info),
  });
  const bits = async (info: string, n: number) =>
    new Uint8Array(await crypto.subtle.deriveBits(params(info), ikm, n * 8));
  return {
    householdId: b64u(await bits('household-id', 16)),
    token: b64u(await bits('auth-token', 32)),
    encKey: await crypto.subtle.deriveKey(params('record-enc'), ikm, { name: 'AES-GCM', length: 256 }, false, [
      'encrypt',
      'decrypt',
    ]),
    ridKey: await crypto.subtle.deriveKey(
      params('record-id'),
      ikm,
      { name: 'HMAC', hash: 'SHA-256', length: 256 },
      false,
      ['sign'],
    ),
  };
}

/** Identifiant opaque et stable d'un enregistrement (`m:<id>` ou `h:<orderId>`). */
export async function recordId(keys: HouseholdKeys, key: string): Promise<string> {
  return b64u(new Uint8Array(await crypto.subtle.sign('HMAC', keys.ridKey, te.encode(key))));
}

/** Chiffre un objet. L'identifiant d'enregistrement sert de données associées : le serveur ne peut pas intervertir deux blobs. */
export async function seal(keys: HouseholdKeys, rid: string, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: te.encode(rid) },
      keys.encKey,
      te.encode(JSON.stringify(value)),
    ),
  );
  const out = new Uint8Array(iv.length + ct.length);
  out.set(iv);
  out.set(ct, iv.length);
  return b64u(out);
}

export async function unseal<T = unknown>(keys: HouseholdKeys, rid: string, blob: string): Promise<T> {
  const raw = fromB64u(blob);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: raw.slice(0, 12), additionalData: te.encode(rid) },
    keys.encKey,
    raw.slice(12),
  );
  return JSON.parse(td.decode(pt)) as T;
}

// Signed, stateless session cookie for SlimeGit's own login (separate from
// the admin app's express-session store). Uses Web Crypto (available in both
// the Edge middleware runtime and Node route handlers) instead of node:crypto
// so the same verify function works in middleware.ts unmodified.

export interface SessionUser {
  sub: string;
  email?: string;
  name?: string;
  /** Active account (personal or business) - see lib/accounts.ts. */
  accountId?: string;
}

const encoder = new TextEncoder();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function hmacKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(requireEnv("SESSION_SECRET")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let str = "";
  for (const b of arr) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const str = atob(padded);
  const arr = new Uint8Array(new ArrayBuffer(str.length));
  for (let i = 0; i < str.length; i++) arr[i] = str.charCodeAt(i);
  return arr;
}

/** Signs an arbitrary JSON-serializable payload into a `payload.signature` cookie value. */
export async function sign(payload: unknown): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const key = await hmacKey();
  const mac = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${toBase64Url(mac)}`;
}

/** Verifies and decodes a cookie value produced by `sign()`. Returns null on any tamper/expiry issue. */
export async function verify<T>(value: string | undefined): Promise<T | null> {
  if (!value) return null;
  const [body, mac] = value.split(".");
  if (!body || !mac) return null;
  try {
    const key = await hmacKey();
    const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(mac), encoder.encode(body));
    if (!valid) return null;
    return JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as T;
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = "slimegit_session";
export const OIDC_COOKIE = "slimegit_oidc";

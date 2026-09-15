// OpenBao token exchange for the internal git daemon.
//
// Same contract as pages/src/lib/{bao,pufftoken}.ts: the daemon's admin
// credential lives at secret/puffbase/git and callers mint per-key
// "pufftoken" daemon tokens, cached back in OpenBao. No static daemon token
// lives in this process.
import { readFile } from "fs/promises";
import { randomBytes } from "crypto";

export class BaoError extends Error {}

const BAO_ADDR = (process.env.BAO_ADDR || "http://100.82.31.92:8200").replace(/\/$/, "");

let tokenCache: { value: string; at: number } | undefined;

async function baoToken(): Promise<string> {
  if (tokenCache && Date.now() - tokenCache.at < 60_000) return tokenCache.value;
  let value = process.env.BAO_TOKEN?.trim();
  if (!value && process.env.BAO_TOKEN_FILE) {
    value = (await readFile(process.env.BAO_TOKEN_FILE, "utf8")).trim();
  }
  if (!value) throw new BaoError("no OpenBao token configured (BAO_TOKEN / BAO_TOKEN_FILE)");
  tokenCache = { value, at: Date.now() };
  return value;
}

async function baoFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BAO_ADDR}/v1/${path}`, {
    ...init,
    headers: {
      "X-Vault-Token": await baoToken(),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!res.ok) throw new BaoError(`OpenBao request failed (${res.status}): ${path}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

async function baoRead(path: string): Promise<Record<string, unknown>> {
  const r = await baoFetch<{ data: { data: Record<string, unknown> } }>(`secret/data/${path}`);
  return r.data.data;
}

async function baoWrite(path: string, data: Record<string, unknown>): Promise<void> {
  await baoFetch(`secret/data/${path}`, { method: "POST", body: JSON.stringify({ data }) });
}

type DaemonCred = { token: string; user: string; url: string };
let credCache: { cred: DaemonCred; at: number } | undefined;
const mintInflight = new Map<string, Promise<string>>();

async function daemonCred(): Promise<DaemonCred> {
  if (credCache && Date.now() - credCache.at < 5 * 60_000) return credCache.cred;
  const data = await baoRead("puffbase/git");
  const cred = { token: String(data.token ?? ""), user: String(data.user ?? ""), url: String(data.url ?? "") };
  if (!cred.token || !cred.user || !cred.url) {
    throw new BaoError("puffbase/git is missing token/user/url fields");
  }
  credCache = { cred, at: Date.now() };
  return cred;
}

/** The daemon pufftoken for a key (account id / "admin"). Minted through the
 *  daemon's admin API on first use, cached in OpenBao afterwards. */
export async function puffToken(key: string): Promise<string> {
  const safe = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!safe) throw new BaoError("pufftoken key required");
  const path = `puffbase/tokens/${safe}`;
  try {
    const hit = await baoRead(path);
    if (typeof hit.token === "string" && hit.token) return hit.token;
  } catch {
    // not minted yet
  }
  const existing = mintInflight.get(safe);
  if (existing) return existing;
  const mint = (async () => {
    const cred = await daemonCred();
    const username = `acct-${safe.slice(0, 10)}`;
    const password = randomBytes(24).toString("base64url");
    const admin = { Authorization: `token ${cred.token}`, "Content-Type": "application/json" };
    const mkUser = await fetch(`${cred.url}/api/v1/admin/users`, {
      method: "POST",
      headers: admin,
      body: JSON.stringify({
        username,
        email: `${username}@puffbase.internal`,
        password,
        must_change_password: false,
        visibility: "private",
      }),
    });
    if (!mkUser.ok && mkUser.status !== 422) {
      throw new BaoError(`daemon user create failed (${mkUser.status}) for ${username}`);
    }
    if (mkUser.status === 422) {
      const reset = await fetch(`${cred.url}/api/v1/admin/users/${username}`, {
        method: "PATCH",
        headers: admin,
        body: JSON.stringify({ password, login_name: username }),
      });
      if (!reset.ok) throw new BaoError(`daemon user password reset failed (${reset.status}) for ${username}`);
    }
    const basic = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`;
    let res = await fetch(`${cred.url}/api/v1/users/${username}/tokens`, {
      method: "POST",
      headers: { Authorization: basic, "Content-Type": "application/json" },
      body: JSON.stringify({ name: "pufftoken", scopes: ["write:repository", "write:user"] }),
    });
    if (!res.ok) {
      res = await fetch(`${cred.url}/api/v1/users/${username}/tokens`, {
        method: "POST",
        headers: { Authorization: basic, "Content-Type": "application/json" },
        body: JSON.stringify({ name: `pufftoken-${Date.now().toString(36)}`, scopes: ["write:repository", "write:user"] }),
      });
    }
    if (!res.ok) throw new BaoError(`pufftoken mint failed (${res.status}) for ${username}`);
    const { sha1 } = (await res.json()) as { sha1: string };
    await baoWrite(path, { token: sha1, user: username, createdAt: new Date().toISOString() });
    return sha1;
  })();
  mintInflight.set(safe, mint);
  try {
    return await mint;
  } finally {
    mintInflight.delete(safe);
  }
}

export async function daemonUrl(): Promise<string> {
  return (await daemonCred()).url.replace(/\/$/, "");
}

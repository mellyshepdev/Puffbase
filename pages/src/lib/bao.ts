// OpenBao client - the puffbase secrets broker.
//
// The fleet's pattern (locator/bao.py): services carry a scoped broker token,
// never raw secret values. The git daemon credential lives at
// secret/puffbase/git and every per-account "pufftoken" we mint is cached back
// under secret/puffbase/tokens/<key>. User access tokens live under
// secret/puffbase/pat/<sha256>.
//
// FAIL-LOUD: a sealed vault, expired token or missing path throws BaoError -
// callers must fail the request rather than run without credentials.
import { readFile } from "fs/promises";

export class BaoError extends Error {}

const BAO_ADDR = (process.env.BAO_ADDR || "http://100.82.31.92:8200").replace(/\/$/, "");
const KV = "secret";

let tokenCache: { value: string; at: number } | undefined;

async function baoToken(): Promise<string> {
  // Token file can be rotated under us - re-read it every minute.
  if (tokenCache && Date.now() - tokenCache.at < 60_000) return tokenCache.value;
  let value = process.env.BAO_TOKEN?.trim();
  if (!value && process.env.BAO_TOKEN_FILE) {
    value = (await readFile(process.env.BAO_TOKEN_FILE, "utf8")).trim();
  }
  if (!value) throw new BaoError("no OpenBao token configured (BAO_TOKEN / BAO_TOKEN_FILE)");
  tokenCache = { value, at: Date.now() };
  return value;
}

async function baoFetch<T>(path: string, init?: RequestInit & { method?: string }): Promise<T> {
  const res = await fetch(`${BAO_ADDR}/v1/${path}`, {
    ...init,
    headers: {
      "X-Vault-Token": await baoToken(),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (res.status === 404) throw new BaoError(`not found: ${path}`);
  if (!res.ok) throw new BaoError(`OpenBao request failed (${res.status}): ${path}`);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

type KvRead = { data: { data: Record<string, unknown> } };

/** Read a KV v2 secret. Throws BaoError on miss - callers decide whether a
 *  miss means "create it" (catch) or "fail the request" (propagate). */
export async function baoRead(path: string): Promise<Record<string, unknown>> {
  const r = await baoFetch<KvRead>(`${KV}/data/${path}`);
  return r.data.data;
}

export async function baoWrite(path: string, data: Record<string, unknown>): Promise<void> {
  await baoFetch(`${KV}/data/${path}`, { method: "POST", body: JSON.stringify({ data }) });
}

/** Full delete (all versions) via metadata. */
export async function baoDelete(path: string): Promise<void> {
  await baoFetch(`${KV}/metadata/${path}`, { method: "DELETE" });
}

/** List key names under a KV v2 prefix. Empty array on a missing prefix. */
export async function baoList(prefix: string): Promise<string[]> {
  try {
    const r = await baoFetch<{ data: { keys: string[] } }>(
      `${KV}/metadata/${prefix.replace(/\/$/, "")}?list=true`,
    );
    return r.data.keys ?? [];
  } catch {
    return [];
  }
}

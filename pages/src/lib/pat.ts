// User-facing pufftokens (personal access tokens).
//
// Generated as `pft_<random>` and NEVER stored in the database - the record
// lives in OpenBao at secret/puffbase/pat/<sha256(token)>, so the vault is the
// token store and the plaintext only exists in the one response that created
// it. Verification is a hash lookup, not a decrypt.
import { createHash, randomBytes } from "crypto";
import { baoRead, baoWrite, baoDelete, baoList, BaoError } from "@/lib/bao";

export const PAT_PREFIX = "pft_";

export const FINE_GRAINED_SCOPES = [
  "repos:read",
  "repos:write",
  "issues:read",
  "issues:write",
  "pipelines:read",
  "pipelines:write",
  "deployments:read",
  "deployments:write",
  "docs:read",
  "docs:write",
  "groups:read",
  "groups:write",
  "integrations:read",
  "integrations:write",
] as const;

export type PatRecord = {
  accountId: string;
  userSub: string;
  name: string;
  kind: "classic" | "fine-grained";
  scopes: string[];
  prefix: string;
  createdAt: string;
};

const patPath = (hash: string) => `puffbase/pat/${hash}`;

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Mint a new pufftoken. Returns the plaintext ONCE - only the sha256 and
 *  metadata are persisted. */
export async function createPat(
  accountId: string,
  userSub: string,
  name: string,
  kind: "classic" | "fine-grained",
  scopes: string[],
): Promise<{ token: string; record: PatRecord }> {
  const token = PAT_PREFIX + randomBytes(30).toString("base64url");
  const record: PatRecord = {
    accountId,
    userSub,
    name: name.trim().slice(0, 80),
    kind,
    scopes: kind === "classic" ? ["*"] : scopes.filter((s) => (FINE_GRAINED_SCOPES as readonly string[]).includes(s)),
    prefix: token.slice(0, 12),
    createdAt: new Date().toISOString(),
  };
  await baoWrite(patPath(hashToken(token)), record as unknown as Record<string, unknown>);
  return { token, record };
}

/** Every token belonging to an account - metadata only, never the value. */
export async function listPats(accountId: string): Promise<(PatRecord & { id: string })[]> {
  const keys = await baoList("puffbase/pat");
  const out: (PatRecord & { id: string })[] = [];
  for (const key of keys) {
    try {
      const data = (await baoRead(patPath(key))) as unknown as PatRecord;
      if (data.accountId === accountId) out.push({ ...data, id: key });
    } catch {
      // a key mid-delete is fine to skip
    }
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Revoke by stored id (the sha256 hash). Owner-checked. */
export async function revokePat(accountId: string, id: string): Promise<boolean> {
  if (!/^[0-9a-f]{64}$/i.test(id)) return false;
  try {
    const data = (await baoRead(patPath(id))) as unknown as PatRecord;
    if (data.accountId !== accountId) return false;
  } catch {
    return false;
  }
  await baoDelete(patPath(id));
  return true;
}

/** The token exchange: trade a presented pufftoken for its record.
 *  Returns null on anything invalid - callers turn that into a 401. */
export async function verifyPat(token: string): Promise<PatRecord | null> {
  if (!token.startsWith(PAT_PREFIX)) return null;
  try {
    const data = (await baoRead(patPath(hashToken(token)))) as unknown as PatRecord;
    return data.accountId ? data : null;
  } catch (e) {
    if (e instanceof BaoError) return null;
    throw e;
  }
}

export function hasScope(scopes: string[], needed: string): boolean {
  return scopes.includes("*") || scopes.includes(needed);
}

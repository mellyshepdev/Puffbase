// Pufftokens - per-account credentials for the internal git daemon, minted
// through the OpenBao token exchange.
//
// The exchange: our scoped broker token reads the daemon's admin credential
// from secret/puffbase/git. On first use per account we create a daemon user
// `acct-<key10>` (admin API needs write:admin), then mint that user's
// "pufftoken" via its own basic auth - the daemon no longer hands out admin
// mint rights over the API. The minted token is cached back in OpenBao at
// secret/puffbase/tokens/<key>.
//
// Every account's repos live under ITS daemon user - real isolation at the
// daemon layer, not just a name prefix. No static daemon token in env.
import { randomBytes } from "crypto";
import { baoRead, baoWrite, BaoError } from "@/lib/bao";

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

function daemonUserFor(key: string): string {
  return `acct-${key.replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 10)}`;
}

function mintWith(username: string, password: string, name: string) {
  return daemonCred().then((cred) =>
    fetch(`${cred.url}/api/v1/users/${username}/tokens`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, scopes: ["write:repository", "write:user"] }),
    }),
  );
}

/** The daemon pufftoken for an account/user key. First call provisions the
 *  account's daemon user + token; afterwards the cached OpenBao record wins. */
export async function puffToken(key: string): Promise<string> {
  const safe = key.replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (!safe) throw new BaoError("pufftoken key required");
  const path = `puffbase/tokens/${safe}`;

  try {
    const hit = await baoRead(path);
    if (typeof hit.token === "string" && hit.token) return hit.token;
  } catch {
    // not minted yet - fall through
  }

  const existing = mintInflight.get(safe);
  if (existing) return existing;

  const mint = (async () => {
    const cred = await daemonCred();
    const username = daemonUserFor(safe);
    const password = randomBytes(24).toString("base64url");
    const admin = { Authorization: `token ${cred.token}`, "Content-Type": "application/json" };

    // Idempotent: 422 "already exists" just means the user is already there.
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

    // If the user already existed we don't know its password - reset it via
    // the admin API so the basic-auth mint below always works.
    if (mkUser.status === 422) {
      const reset = await fetch(`${cred.url}/api/v1/admin/users/${username}`, {
        method: "PATCH",
        headers: admin,
        body: JSON.stringify({ password, login_name: username }),
      });
      if (!reset.ok) throw new BaoError(`daemon user password reset failed (${reset.status}) for ${username}`);
    }

    // If Bao lost the record but the daemon still holds a "pufftoken" for
    // this user, the name conflicts - fall back to a timestamped name.
    let res = await mintWith(username, password, "pufftoken");
    if (!res.ok) res = await mintWith(username, password, `pufftoken-${Date.now().toString(36)}`);
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

/** The daemon base URL - from the same OpenBao record as the admin cred,
 *  so the whole exchange config lives in the vault. */
export async function daemonUrl(): Promise<string> {
  return (await daemonCred()).url.replace(/\/$/, "");
}

// ---------------------------------------------------------------------------
// Thin client for the real, self-hosted Gitea instance this dashboard runs
// alongside (`puffbase-gitea`, same `puffnet` docker network as this app).
// Reads GITEA_URL/GITEA_TOKEN from env - no admin password is embedded here;
// the token is a scoped access token generated once via Gitea's own API.
// ---------------------------------------------------------------------------

export type GiteaRepo = {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  htmlUrl: string;
  defaultBranch: string;
  updatedAt: string;
  starsCount: number;
  forksCount: number;
};

type GiteaRepoResponse = {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  default_branch: string;
  updated_at: string;
  stars_count: number;
  forks_count: number;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required to reach Gitea`);
  return value;
}

/** Gitea's own html_url in API responses reflects whatever Host it saw on
 *  the *request that hit it* - since this server calls it over the internal
 *  puffnet network (GITEA_URL=http://gitea:3000), links come back pointing
 *  at that internal hostname, unusable from a browser. GITEA_PUBLIC_URL (the
 *  real public address, e.g. https://git.prime-quality.online) swaps that
 *  prefix back out before a repo ever reaches the client. Falls back to
 *  GITEA_URL unchanged if GITEA_PUBLIC_URL isn't set. */
function toPublicUrl(internalUrl: string): string {
  const publicBase = process.env.GITEA_PUBLIC_URL;
  if (!publicBase) return internalUrl;
  const internalBase = requireEnv("GITEA_URL");
  return internalUrl.startsWith(internalBase)
    ? publicBase.replace(/\/$/, "") + internalUrl.slice(internalBase.length)
    : internalUrl;
}

async function giteaFetch<T>(path: string): Promise<T> {
  const baseUrl = requireEnv("GITEA_URL");
  const token = requireEnv("GITEA_TOKEN");
  const res = await fetch(`${baseUrl}${path}`, {
    headers: { Authorization: `token ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Gitea request failed (${res.status}): ${path}`);
  }
  return res.json() as Promise<T>;
}

function toRepo(r: GiteaRepoResponse): GiteaRepo {
  return {
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    description: r.description,
    private: r.private,
    htmlUrl: toPublicUrl(r.html_url),
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at,
    starsCount: r.stars_count,
    forksCount: r.forks_count,
  };
}

/** Every repo the token's user can see. Legitimately empty on a fresh
 *  instance - that's not an error, just nothing pushed yet. */
export async function listRepos(): Promise<GiteaRepo[]> {
  const data = await giteaFetch<{ ok: boolean; data: GiteaRepoResponse[] }>(
    "/api/v1/repos/search?limit=50",
  );
  return (data.data ?? []).map(toRepo);
}

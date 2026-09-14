// ---------------------------------------------------------------------------
// Linear issue sync — reads issues via the GraphQL API with a personal API
// key (LINEAR_API_KEY, lin_api_...). Server-to-server read only, so no OAuth
// client id/secret is involved; that pair is only needed for "Sign in with
// Linear" which is a different feature. With no key set the route answers
// `configured: false` instead of erroring — the dashboard can show a
// "paste a key to enable" state rather than a broken page.
// ---------------------------------------------------------------------------

export type LinearIssue = {
  id: string;
  identifier: string;   // e.g. "BSCO-12"
  title: string;
  state: string;
  priority: number;
  url: string;
  updatedAt: string;
  team: string;
};

export function linearConfigured(): boolean {
  return Boolean(process.env.LINEAR_API_KEY);
}

export async function listLinearIssues(first = 50): Promise<LinearIssue[]> {
  const key = process.env.LINEAR_API_KEY;
  if (!key) throw new Error("LINEAR_API_KEY is not set");

  const res = await fetch("https://api.linear.app/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: key },
    body: JSON.stringify({
      query: `{
        issues(first: ${Math.min(first, 100)}, orderBy: updatedAt) {
          nodes {
            id identifier title priority url updatedAt
            state { name }
            team { name }
          }
        }
      }`,
    }),
  });
  if (!res.ok) throw new Error(`Linear API ${res.status}`);
  const body = await res.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);

  return (body.data?.issues?.nodes ?? []).map((n: any) => ({
    id: n.id,
    identifier: n.identifier,
    title: n.title,
    state: n.state?.name ?? "",
    priority: n.priority,
    url: n.url,
    updatedAt: n.updatedAt,
    team: n.team?.name ?? "",
  }));
}

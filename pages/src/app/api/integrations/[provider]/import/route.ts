import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { integrations, repositories } from "@/db/schema";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { decryptToken } from "@/lib/secrets";
import { migrateRepo } from "@/lib/repostore";
import { PROVIDERS, type Provider } from "@/lib/providers";

// POST /api/integrations/[provider]/import { name, cloneUrl, description, private }
// Clones the remote repo into the account's repo space and registers it in
// the dashboard's repositories table.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const provider = (await params).provider as Provider;
  if (provider !== "github" && provider !== "gitlab") {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").toLowerCase().replace(/[^a-z0-9-_.]+/g, "-").replace(/^-+|-+$/g, "");
  const cloneUrl = String(body.cloneUrl ?? "");
  if (!name || !cloneUrl) {
    return NextResponse.json({ error: "name and cloneUrl required" }, { status: 400 });
  }

  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.accountId, ctx.account.id), eq(integrations.provider, provider)));
  if (!row) {
    return NextResponse.json({ error: `${provider} not connected` }, { status: 400 });
  }

  try {
    const meta = await migrateRepo(ctx.account.id, name, cloneUrl, {
      service: provider,
      authToken: decryptToken(row.tokenEnc),
      description: String(body.description ?? ""),
    });
    const [created] = await db
      .insert(repositories)
      .values({
        name,
        description: String(body.description ?? ""),
        language: body.language ?? null,
        visibility: "private",
        defaultBranch: meta.defaultBranch || "main",
        lastCommitMessage: `Imported from ${provider}`,
        accountId: ctx.account.id,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { currentAccount } from "@/lib/accounts";
import { decryptToken } from "@/lib/secrets";
import { listRemoteRepos, PROVIDERS, type Provider } from "@/lib/providers";

// GET /api/integrations/[provider]/repos - live repo list from the provider
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ provider: string }> },
) {
  const ctx = await currentAccount();
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const provider = (await params).provider as Provider;
  if (!PROVIDERS.includes(provider) || (provider !== "github" && provider !== "gitlab")) {
    return NextResponse.json({ error: "unknown provider" }, { status: 404 });
  }

  const [row] = await db
    .select()
    .from(integrations)
    .where(and(eq(integrations.accountId, ctx.account.id), eq(integrations.provider, provider)));
  if (!row) {
    return NextResponse.json({ error: `${provider} not connected` }, { status: 400 });
  }

  try {
    const repos = await listRemoteRepos(provider, decryptToken(row.tokenEnc));
    return NextResponse.json({ repos });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

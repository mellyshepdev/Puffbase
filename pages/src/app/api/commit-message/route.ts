import { NextRequest, NextResponse } from "next/server";
import { requestAccount } from "@/lib/accounts";

// POST /api/commit-message { path, before, after } - drafts a commit message
// for an in-editor save. Pro-gated: free accounts write their own.
//
// No model endpoint is wired into this deployment yet, so the draft is a
// diff-stat summary. When a model (mastra/agent runtime) is available, swap
// the heuristic for a generation call - the route shape stays the same.
export async function POST(req: NextRequest) {
  const ctx = await requestAccount(req);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!ctx.account.plan || ctx.account.plan === "free") {
    return NextResponse.json({ error: "Auto commit messages are a Pro feature" }, { status: 403 });
  }

  const { path, before, after } = await req.json().catch(() => ({}));
  if (typeof path !== "string" || typeof after !== "string") {
    return NextResponse.json({ error: "path and after required" }, { status: 400 });
  }

  const name = path.split("/").pop() || path;
  const oldContent = typeof before === "string" ? before : "";
  if (!oldContent) return NextResponse.json({ message: `Add ${name}` });

  // count changed lines by trimming the common prefix/suffix
  const a = oldContent.split("\n");
  const b = after.split("\n");
  let lo = 0;
  while (lo < a.length && lo < b.length && a[lo] === b[lo]) lo++;
  let hiA = a.length, hiB = b.length;
  while (hiA > lo && hiB > lo && a[hiA - 1] === b[hiB - 1]) { hiA--; hiB--; }
  const removed = hiA - lo, added = hiB - lo;

  const message =
    added === 0 && removed === 0 ? `Update ${name}` :
    removed === 0 ? `Update ${name}: add ${added} line${added === 1 ? "" : "s"}` :
    added === 0 ? `Update ${name}: remove ${removed} line${removed === 1 ? "" : "s"}` :
    `Update ${name} (+${added} -${removed})`;

  return NextResponse.json({ message });
}

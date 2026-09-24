import { createHmac } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { repoWebhooks } from "@/db/schema";

export const WEBHOOK_EVENTS = ["push", "issues", "pipelines", "deployments"] as const;

/** Fire every enabled webhook subscribed to `event` for repo `repoId`.
 *  Fire-and-forget — callers don't await delivery. */
export async function fireWebhooks(repoId: number, event: string, payload: Record<string, unknown>) {
  const rows = await db
    .select()
    .from(repoWebhooks)
    .where(and(eq(repoWebhooks.repoId, repoId), eq(repoWebhooks.enabled, true)));
  const body = JSON.stringify({ event, ...payload, sentAt: new Date().toISOString() });
  for (const w of rows) {
    if (w.events.length && !w.events.includes(event)) continue;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Puffbase-Event": event,
    };
    if (w.secret) {
      headers["X-Puffbase-Signature"] =
        "sha256=" + createHmac("sha256", w.secret).update(body).digest("hex");
    }
    fetch(w.url, { method: "POST", headers, body, signal: AbortSignal.timeout(8000) }).catch(() => {});
  }
}

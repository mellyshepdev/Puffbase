// Operator notification fan-out: every configured channel gets the event.
// All channels optional - unset webhooks are skipped silently.
//
// Env:
//   NOTIFY_SLACK_WEBHOOK    Slack incoming-webhook URL
//   NOTIFY_DISCORD_WEBHOOK  Discord channel webhook URL
//   NOTIFY_MATRIX_HOMESERVER + NOTIFY_MATRIX_ROOM + NOTIFY_MATRIX_TOKEN
//   NOTIFY_REECH_URL        Reech hook endpoint (plain POST {text})

const SLACK = process.env.NOTIFY_SLACK_WEBHOOK ?? "";
const DISCORD = process.env.NOTIFY_DISCORD_WEBHOOK ?? "";
const MATRIX_HS = (process.env.NOTIFY_MATRIX_HOMESERVER ?? "").replace(/\/$/, "");
const MATRIX_ROOM = process.env.NOTIFY_MATRIX_ROOM ?? "";
const MATRIX_TOKEN = process.env.NOTIFY_MATRIX_TOKEN ?? "";
const REECH = process.env.NOTIFY_REECH_URL ?? "";

export function notifyChannels(): string[] {
  return [
    SLACK && "slack",
    DISCORD && "discord",
    MATRIX_HS && MATRIX_ROOM && MATRIX_TOKEN && "matrix",
    REECH && "reech",
  ].filter(Boolean) as string[];
}

async function post(url: string, body: unknown): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`notify ${res.status}`);
}

/** Fire-and-forget safe: logs failures, never throws into request paths. */
export async function notify(text: string): Promise<void> {
  const jobs: Promise<void>[] = [];
  if (SLACK) jobs.push(post(SLACK, { text }));
  if (DISCORD) jobs.push(post(DISCORD, { content: text }));
  if (MATRIX_HS && MATRIX_ROOM && MATRIX_TOKEN) {
    jobs.push(
      post(
        `${MATRIX_HS}/_matrix/client/v3/rooms/${encodeURIComponent(MATRIX_ROOM)}/send/m.room.message?access_token=${MATRIX_TOKEN}`,
        { msgtype: "m.text", body: text },
      ),
    );
  }
  if (REECH) jobs.push(post(REECH, { text }));
  const results = await Promise.allSettled(jobs);
  for (const r of results) {
    if (r.status === "rejected") console.error("[notify]", r.reason);
  }
}

// Operator alerts — fire-and-forget POST {text} to the fleet relay
// (matrix-relay /notify-owner). Text prefixed "PUFFBASE ALERT" escalates
// to the owner's email/SMS via reech; anything else stays in the Matrix
// alerts room only. Config: NOTIFY_REECH_URL (empty = alerts off).
const HOOK = process.env.NOTIFY_REECH_URL ?? "";

export async function notify(text: string): Promise<void> {
  if (!HOOK) return;
  try {
    await fetch(HOOK, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(8_000),
    });
  } catch (e) {
    console.error("[notify]", e);
  }
}

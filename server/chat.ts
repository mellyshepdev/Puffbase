import type { Express } from "express";

/* Same-origin proxy to site-chat (the chat bubble brain that also serves
 * theofficialblacksheepco.com - message -> Chatwoot record -> Rasa -> LLM).
 *
 * The console's session user IS the verified identity, so the proxy asserts
 * it with the shared internal token instead of making signed-in users re-do
 * the guest OTP gate. site-chat mints a chat_token on the first exchange and
 * the widget stores it, so the conversation survives session expiry.
 * Requests without a session user simply carry no assertion and site-chat's
 * own guest gate answers them. */
const SITE_CHAT_URL = (process.env.SITE_CHAT_URL ?? "http://100.123.158.58:8220").replace(/\/$/, "");
const INTERNAL_TOKEN = process.env.PUFFBASE_INTERNAL_TOKEN ?? "";
const CHAT_TIMEOUT_MS = 240_000; // the model fallback chain can take minutes

export function registerChatProxy(app: Express) {
  app.post(["/api/chat", "/api/chat/*"], async (req, res) => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "x-forwarded-for": req.ip ?? "",
      };
      const user = req.session?.user;
      if (user?.sub && INTERNAL_TOKEN) {
        headers["x-puffbase-internal"] = INTERNAL_TOKEN;
        headers["x-puffbase-sub"] = user.sub;
        if (user.email) headers["x-puffbase-email"] = user.email;
        if (user.name) headers["x-puffbase-name"] = user.name;
      }
      const upstream = await fetch(`${SITE_CHAT_URL}${req.path}`, {
        method: "POST",
        headers,
        body: JSON.stringify(req.body ?? {}),
        signal: AbortSignal.timeout(CHAT_TIMEOUT_MS),
      });
      const data = await upstream.json().catch(() => ({}));
      res.status(upstream.status).json(data);
    } catch {
      res.status(502).json({
        reply: "Chat is unreachable right now - try again in a moment.",
        sources: [],
      });
    }
  });
}

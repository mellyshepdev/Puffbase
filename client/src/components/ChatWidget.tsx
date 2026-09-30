import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X } from "lucide-react";

/* The homepage chat bubble, ported as a console component: same site-chat
 * backend (Chatwoot -> Rasa -> LLM) reached same-origin through the express
 * proxy. Instead of the bottom-right popover window, starting the chat opens
 * a right-side drawer panel. Signed-in console users skip the guest gate -
 * the server asserts their identity - but the gate UI stays as a fallback in
 * case the assertion is ever missing. */

type Msg = { role: "user" | "assistant"; content: string };

const TOKEN_KEY = "pb_chat_token";
const SESSION_KEY = "pb_chat_session";
const WELCOME =
  "Hey — I'm the Puffbase assistant. Questions about the console, deployments, or your sites? Ask away.";

function sessionId() {
  let s = localStorage.getItem(SESSION_KEY);
  if (!s) {
    s = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, s);
  }
  return s;
}

async function post(path: string, body: unknown) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [gated, setGated] = useState(false);
  const [gateName, setGateName] = useState("");
  const [gateContact, setGateContact] = useState("");
  const [gateCode, setGateCode] = useState("");
  const [gatePending, setGatePending] = useState("");
  const [gateError, setGateError] = useState("");
  const chatToken = useRef(localStorage.getItem(TOKEN_KEY) || "");
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: WELCOME }]);
    }
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [open, messages]);

  function storeToken(tok: string) {
    chatToken.current = tok;
    localStorage.setItem(TOKEN_KEY, tok);
  }

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || typing) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setTyping(true);
    try {
      const { res, data } = await post("/api/chat", {
        message: msg,
        history: history.slice(-6),
        session_id: sessionId(),
        chat_token: chatToken.current || undefined,
      });
      if (data.chat_token) storeToken(data.chat_token);
      if (res.status === 401 && data.gate) {
        chatToken.current = "";
        localStorage.removeItem(TOKEN_KEY);
        setGated(true);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: data.reply || "I need to know who you are first." },
        ]);
        return;
      }
      const reply =
        data.reply ||
        (res.ok ? "…" : "The assistant is unreachable right now - try again in a moment.");
      setHistory((h) => [...h, { role: "user", content: msg }, { role: "assistant", content: reply }]);
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "Couldn't reach the assistant - try again in a moment." },
      ]);
    } finally {
      setTyping(false);
    }
  }

  async function gateStart() {
    const name = gateName.trim();
    const contact = gateContact.trim();
    if (!name) return setGateError("Tell me your name first.");
    if (!contact) return setGateError("An email or phone number is required.");
    setGateError("");
    try {
      const { res, data } = await post("/api/chat/gate/start", {
        name,
        contact,
        method: contact.includes("@") ? "email" : "phone",
      });
      if (!res.ok) return setGateError(data.error || "Could not verify that - try again.");
      if (data.chat_token) {
        storeToken(data.chat_token);
        setGated(false);
        setMessages((m) => [...m, { role: "assistant", content: `Thanks ${name.split(" ")[0]} — you're verified. What can I help you with?` }]);
        return;
      }
      setGatePending(data.pending);
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `I just emailed a 6-digit code to ${contact}. Type it below.` },
      ]);
    } catch {
      setGateError("Could not reach the verification service - try again in a moment.");
    }
  }

  async function gateVerify() {
    if (!gatePending || !gateCode.trim()) return setGateError("Enter the code from the email.");
    setGateError("");
    try {
      const { res, data } = await post("/api/chat/gate/verify", {
        pending: gatePending,
        code: gateCode.trim(),
      });
      if (!res.ok) return setGateError(data.error || "That code did not work - try again.");
      if (data.chat_token) {
        storeToken(data.chat_token);
        setGated(false);
        setMessages((m) => [
          ...m,
          { role: "assistant", content: "You're verified. What can I help you with?" },
        ]);
      }
    } catch {
      setGateError("Could not reach the verification service - try again in a moment.");
    }
  }

  return (
    <>
      {/* launcher */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open chat"
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full border border-primary/40 bg-gradient-to-r from-primary via-purple-600 to-zinc-900 px-4 py-2 text-xs font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-transform hover:scale-105 ${
          open ? "pointer-events-none opacity-0" : ""
        }`}
      >
        <MessageCircle className="h-4 w-4" />
        Chat with us
      </button>

      {/* right-side panel */}
      <div
        className={`fixed inset-y-0 right-0 z-50 flex w-[380px] max-w-[92vw] flex-col border-l border-border bg-background/95 shadow-2xl shadow-black/60 backdrop-blur-xl transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-700 text-[11px] font-bold text-primary-foreground">
              PB
            </div>
            <div>
              <p className="text-xs font-semibold">Puffbase Assistant</p>
              <p className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Online
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close chat"
            className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3 text-xs">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 leading-relaxed ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "border border-border bg-card text-card-foreground"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {typing && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-border bg-card px-3 py-2 text-muted-foreground">
                <span className="animate-pulse">…</span>
              </div>
            </div>
          )}
        </div>

        {gated ? (
          <div className="space-y-2 border-t border-border bg-card/80 px-4 py-3 text-xs">
            <p className="text-muted-foreground">Before we chat, let me know who I'm talking to.</p>
            <input
              value={gateName}
              onChange={(e) => setGateName(e.target.value)}
              placeholder="Your name"
              maxLength={80}
              className="w-full rounded-xl border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              value={gateContact}
              onChange={(e) => setGateContact(e.target.value)}
              placeholder="Email or phone number"
              maxLength={200}
              onKeyDown={(e) => e.key === "Enter" && gateStart()}
              className="w-full rounded-xl border border-border bg-background px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={gateStart}
              className="w-full rounded-xl border border-border bg-secondary py-1.5 font-semibold hover:bg-secondary/80"
            >
              Continue
            </button>
            {gatePending && (
              <div className="space-y-2">
                <input
                  value={gateCode}
                  onChange={(e) => setGateCode(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  maxLength={8}
                  onKeyDown={(e) => e.key === "Enter" && gateVerify()}
                  className="w-full rounded-xl border border-border bg-background px-3 py-1.5 text-center tracking-widest focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={gateVerify}
                  className="w-full rounded-xl bg-primary py-1.5 font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Verify code
                </button>
              </div>
            )}
            {gateError && <p className="text-[11px] text-destructive">{gateError}</p>}
          </div>
        ) : (
          <div className="flex items-end gap-2 border-t border-border px-3 py-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              rows={1}
              placeholder="Ask anything..."
              className="flex-1 resize-none rounded-2xl border border-border bg-background px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={() => send(input)}
              disabled={!input.trim() || typing}
              aria-label="Send"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </>
  );
}

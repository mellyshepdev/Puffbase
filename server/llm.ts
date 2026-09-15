// Provider-agnostic LLM client for the site builder.
//
// LLM_PROVIDER=openai  -> OpenAI-compatible /v1/chat/completions (llama-server,
//                         Together, OpenRouter, Azure OpenAI, local model pool)
// LLM_PROVIDER=anthropic -> /v1/messages API
//
// Env:
//   LLM_BASE_URL   e.g. http://llm:8080/v1  or  https://api.together.xyz/v1
//   LLM_API_KEY    bearer key (empty allowed for local llama-server)
//   LLM_MODEL      e.g. qwen2.5-coder-7b / claude-sonnet-4-5 / meta-llama/*
//   LLM_PROVIDER   openai (default) | anthropic
//   LLM_TIMEOUT_MS default 300000 - local CPU inference is slow

const BASE_URL = (process.env.LLM_BASE_URL ?? "http://localhost:8080/v1").replace(/\/$/, "");
const API_KEY = process.env.LLM_API_KEY ?? "";
const MODEL = process.env.LLM_MODEL ?? "local-model";
const PROVIDER = process.env.LLM_PROVIDER ?? "openai";
const TIMEOUT = Number(process.env.LLM_TIMEOUT_MS ?? 300_000);

export function llmConfigured(): boolean {
  return PROVIDER === "anthropic" ? !!API_KEY : !!BASE_URL;
}

export function llmModel(): string {
  return MODEL;
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chatOpenAI(messages: ChatMessage[]): Promise<string> {
  const resp = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(API_KEY ? { Authorization: `Bearer ${API_KEY}` } : {}),
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.4 }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`LLM ${resp.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("LLM returned empty completion");
  return content;
}

async function chatAnthropic(messages: ChatMessage[]): Promise<string> {
  const system = messages.find((m) => m.role === "system")?.content ?? "";
  const turns = messages.filter((m) => m.role !== "system");
  const resp = await fetch(`${BASE_URL.replace(/\/v1$/, "")}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 16000,
      system,
      messages: turns,
    }),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    throw new Error(`Anthropic ${resp.status}: ${detail.slice(0, 300)}`);
  }
  const data = (await resp.json()) as {
    content?: { type: string; text?: string }[];
  };
  const text = data.content?.find((c) => c.type === "text")?.text;
  if (!text) throw new Error("Anthropic returned empty completion");
  return text;
}

export async function chat(messages: ChatMessage[]): Promise<string> {
  if (PROVIDER === "anthropic") return chatAnthropic(messages);
  return chatOpenAI(messages);
}

/** Models sometimes wrap output in ```html fences - strip them so the stored
 *  artifact is a clean document. */
export function extractHtml(raw: string): string {
  const fenced = raw.match(/```(?:html)?\s*([\s\S]*?)```/);
  let body = fenced ? fenced[1] : raw;
  const docStart = body.indexOf("<!DOCTYPE");
  const htmlStart = body.indexOf("<html");
  const start =
    docStart >= 0 ? docStart : htmlStart >= 0 ? htmlStart : -1;
  if (start >= 0) body = body.slice(start);
  return body.trim();
}

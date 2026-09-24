// Site-builder engine: survey answers -> prompt -> LLM -> single-file site.
// Revisions keep the full conversation so "change the hero color" style
// requests have the previous artifact + instruction history to work from.
//
// When CREW_URL is set, generation and revision run through the crew service
// (crew/ - CrewAI multi-agent pipeline: plan -> copy -> design -> build ->
// review). If the crew is down or fails, we fall back to the single-shot
// chat() path below - same pattern as the website's chat fallback chain.
import { chat, extractHtml } from "./llm";

const CREW_URL = (process.env.CREW_URL ?? "").replace(/\/$/, "");
const CREW_TIMEOUT_MS = Number(process.env.CREW_TIMEOUT_MS ?? 3_600_000);

export function crewConfigured(): boolean {
  return !!CREW_URL;
}

/** Browser-facing URL for a builder project page. The customer UI lives on
 *  the user dashboard (BUILDER_UI_URL=https://dash.puff-base.com/builder);
 *  unset falls back to the hash-routed console page on APP_URL. Used for
 *  Stripe Checkout return URLs and notification email links. */
export function builderProjectUrl(projectId: number, query = ""): string {
  const dash = (process.env.BUILDER_UI_URL ?? "").replace(/\/$/, "");
  const app = (process.env.APP_URL ?? "").replace(/\/$/, "");
  const base = dash
    ? `${dash}/${projectId}`
    : `${app}/#/builder/${projectId}`;
  return query ? `${base}?${query}` : base;
}

/** Submit a job to the crew service and poll until it finishes. The crew
 *  takes minutes on CPU inference, so this is a job API rather than one long
 *  request - a proxy blip mid-generation only costs one poll cycle. */
async function crewJob(path: string, body: unknown): Promise<string> {
  const create = await fetch(`${CREW_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  });
  if (!create.ok) throw new Error(`crew submit ${create.status}`);
  const { job_id } = (await create.json()) as { job_id: string };

  const deadline = Date.now() + CREW_TIMEOUT_MS;
  for (;;) {
    if (Date.now() > deadline) throw new Error("crew job timed out");
    await new Promise((r) => setTimeout(r, 8_000));
    const resp = await fetch(`${CREW_URL}/jobs/${job_id}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!resp.ok) throw new Error(`crew poll ${resp.status}`);
    const st = (await resp.json()) as {
      status: string;
      html?: string;
      error?: string;
    };
    if (st.status === "done" && st.html) return st.html;
    if (st.status === "failed") throw new Error(st.error ?? "crew failed");
  }
}

const SYSTEM_PROMPT = `You are a world-class web designer and front-end engineer
building single-file marketing sites for small businesses.

Hard rules:
- Output ONE complete HTML document and nothing else. No markdown fences, no
  commentary before or after.
- All CSS lives in a <style> tag in <head>. All JS in a <script> tag before
  </body>. No external stylesheets, no external fonts, no external images -
  use inline SVG, gradients, and system font stacks for visuals.
- Modern, dark, premium aesthetic unless the brief says otherwise. Generous
  whitespace, real copy (never lorem ipsum), responsive at 375px and 1440px.
- Semantic HTML5, accessible contrast, aria labels on interactive elements.
- Subtle motion only: CSS transitions/keyframes, no heavy animation libraries.`;

function surveyDigest(survey: Record<string, string>): string {
  return Object.entries(survey)
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `- ${k}: ${v.trim()}`)
    .join("\n");
}

export function buildGenerationPrompt(
  name: string,
  survey: Record<string, string>,
): string {
  const digest = surveyDigest(survey);
  return `Build the landing page for "${name}".

Intake survey:
${digest || "- (no survey answers provided - infer a tasteful default)"}

Deliver the complete single-file site now.`;
}

export function buildRevisionPrompt(
  name: string,
  survey: Record<string, string>,
  currentHtml: string,
  instruction: string,
): { user: string; assistant: string } {
  return {
    assistant: currentHtml,
    user: `Here is a change request for the "${name}" site.

Change request: ${instruction}

Survey context (unchanged):
${surveyDigest(survey)}

Return the complete updated HTML document - the whole file, not a diff.`,
  };
}

export async function generateSite(
  name: string,
  survey: Record<string, string>,
): Promise<string> {
  if (CREW_URL) {
    try {
      return await crewJob("/jobs/generate", { name, survey });
    } catch (error) {
      console.error("[builder] crew generation failed, falling back:", error);
    }
  }
  const raw = await chat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: buildGenerationPrompt(name, survey) },
  ]);
  const html = extractHtml(raw);
  if (!html.toLowerCase().includes("<html")) {
    throw new Error("LLM did not return an HTML document");
  }
  return html;
}

export async function reviseSite(
  name: string,
  survey: Record<string, string>,
  currentHtml: string,
  instruction: string,
): Promise<string> {
  if (CREW_URL) {
    try {
      return await crewJob("/jobs/revise", {
        name,
        survey,
        html: currentHtml,
        instruction,
      });
    } catch (error) {
      console.error("[builder] crew revision failed, falling back:", error);
    }
  }
  const { assistant, user } = buildRevisionPrompt(
    name,
    survey,
    currentHtml,
    instruction,
  );
  const raw = await chat([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "assistant", content: assistant },
    { role: "user", content: user },
  ]);
  const html = extractHtml(raw);
  if (!html.toLowerCase().includes("<html")) {
    throw new Error("LLM did not return an HTML document");
  }
  return html;
}

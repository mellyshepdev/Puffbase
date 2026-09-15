// Site-builder engine: survey answers -> prompt -> LLM -> single-file site.
// Revisions keep the full conversation so "change the hero color" style
// requests have the previous artifact + instruction history to work from.
import { chat, extractHtml } from "./llm";

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

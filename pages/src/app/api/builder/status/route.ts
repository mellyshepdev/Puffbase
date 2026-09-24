import { proxyBuilder } from "@/lib/builder";

// GET /api/builder/status - backend capability flags (llm, crew, stripe, lago)
export async function GET() {
  return proxyBuilder("/status");
}

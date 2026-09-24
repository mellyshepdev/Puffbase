import { proxyBuilder } from "@/lib/builder";

// GET /api/builder/projects/[id]/preview - generated HTML for the iframe
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxyBuilder(`/projects/${(await params).id}/preview`);
}

import { proxyBuilder } from "@/lib/builder";

// POST /api/builder/projects/[id]/confirm-card - verify setup session, start generation
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxyBuilder(`/projects/${(await params).id}/confirm-card`, {
    method: "POST",
    body: await request.text(),
  });
}

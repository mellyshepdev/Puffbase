import { proxyBuilder } from "@/lib/builder";

// POST /api/builder/projects/[id]/revise - apply a change instruction
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxyBuilder(`/projects/${(await params).id}/revise`, {
    method: "POST",
    body: await request.text(),
  });
}

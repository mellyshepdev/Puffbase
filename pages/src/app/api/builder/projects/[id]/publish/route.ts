import { proxyBuilder } from "@/lib/builder";

// POST /api/builder/projects/[id]/publish - register edge route, go live
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxyBuilder(`/projects/${(await params).id}/publish`, {
    method: "POST",
  });
}

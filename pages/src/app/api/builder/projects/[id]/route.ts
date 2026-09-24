import { proxyBuilder } from "@/lib/builder";

// GET /api/builder/projects/[id] - project detail + revision list
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxyBuilder(`/projects/${(await params).id}`);
}

// DELETE /api/builder/projects/[id] - delete project + withdraw public route
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxyBuilder(`/projects/${(await params).id}`, { method: "DELETE" });
}

import { proxyBuilder } from "@/lib/builder";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const days = new URL(req.url).searchParams.get("days");
  return proxyBuilder(`/projects/${(await params).id}/visits${days ? `?days=${encodeURIComponent(days)}` : ""}`);
}

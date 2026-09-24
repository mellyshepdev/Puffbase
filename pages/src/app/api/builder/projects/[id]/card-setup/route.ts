import { proxyBuilder } from "@/lib/builder";

// POST /api/builder/projects/[id]/card-setup - hosted Stripe Checkout URL
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return proxyBuilder(`/projects/${(await params).id}/card-setup`, {
    method: "POST",
  });
}

import { proxyBuilder } from "@/lib/builder";

// GET /api/builder/projects - the signed-in user's builder projects
export async function GET() {
  return proxyBuilder("/projects");
}

// POST /api/builder/projects - create from the intake survey
export async function POST(request: Request) {
  return proxyBuilder("/projects", {
    method: "POST",
    body: await request.text(),
  });
}

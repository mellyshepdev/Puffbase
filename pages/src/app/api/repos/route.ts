import { db } from "@/db";
import { repositories } from "@/db/schema";
import { like, or, and, eq, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { requestAccount } from "@/lib/accounts";
import { hasScope } from "@/lib/pat";
import { createRepo, deleteRepo, migrateRepo, repoWrite } from "@/lib/repostore";

// GET /api/repos - the active account's repositories
export async function GET(request: NextRequest) {
  const ctx = await requestAccount(request);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:read")) return NextResponse.json({ error: "pufftoken lacks the repos:read scope" }, { status: 403 });
  const search = request.nextUrl.searchParams.get("search") || "";
  const fav = request.nextUrl.searchParams.get("fav") === "1";

  try {
    const scope = and(
      eq(repositories.accountId, ctx.account.id),
      ...(fav ? [eq(repositories.isFavorite, true)] : []),
      ...(search
        ? [or(
            like(repositories.name, `%${search}%`),
            like(repositories.description, `%${search}%`),
            like(repositories.language, `%${search}%`),
          )!]
        : []),
    );
    const results = await db
      .select()
      .from(repositories)
      .where(scope);
    results.sort((a, b) => (b.updatedAt?.getTime() ?? 0) - (a.updatedAt?.getTime() ?? 0));
    return NextResponse.json(results);
  } catch (error) {
    console.error("Error fetching repos:", error);
    return NextResponse.json({ error: "Failed to fetch repos" }, { status: 500 });
  }
}

// Starter file sets for "create from template". Written through the contents
// API after the repo exists, so they land as real commits on main.
const TEMPLATES: Record<string, { label: string; language: string; files: Record<string, string> }> = {
  "node-app": {
    label: "Node.js app",
    language: "JavaScript",
    files: {
      "package.json": JSON.stringify({ name: "app", version: "0.1.0", private: true, scripts: { start: "node index.js", test: "node --test" }, dependencies: {} }, null, 2) + "\n",
      "index.js": "console.log('hello from puffbase');\n",
      ".gitignore": "node_modules/\n.env\n",
    },
  },
  "python-app": {
    label: "Python app",
    language: "Python",
    files: {
      "main.py": "def main():\n    print('hello from puffbase')\n\nif __name__ == '__main__':\n    main()\n",
      "requirements.txt": "",
      ".gitignore": "__pycache__/\n*.pyc\n.env\nvenv/\n",
    },
  },
  "static-site": {
    label: "Static site",
    language: "HTML",
    files: {
      "index.html": "<!doctype html>\n<html><head><meta charset='utf-8'><title>Site</title></head><body><h1>Hello from Puffbase</h1></body></html>\n",
      "style.css": "body { font-family: system-ui, sans-serif; margin: 2rem; }\n",
    },
  },
};

function pipelineYaml(sast: boolean, secretScan: boolean): string {
  return [
    "# Puffbase pipeline - runs on every push to main",
    "stages:",
    "  - build",
    "  - test",
    ...(sast ? ["  - sast"] : []),
    ...(secretScan ? ["  - secret-detection"] : []),
    "  - deploy",
    "",
    "build:",
    "  stage: build",
    "  run: echo 'building…'",
    "",
    "test:",
    "  stage: test",
    "  run: echo 'testing…'",
    ...(sast ? ["", "sast:", "  stage: sast", "  run: puffbase-sast scan ."] : []),
    ...(secretScan ? ["", "secret-detection:", "  stage: secret-detection", "  run: puffbase-secrets scan ."] : []),
    "",
    "deploy:",
    "  stage: deploy",
    "  run: echo 'deploying…'",
    "",
  ].join("\n");
}

// POST /api/repos { name, description?, language?, visibility?, source?,
//   cloneUrl?, service?, authToken?, template?, readme?, ci?, sast?,
//   secretScan? } - real repo in the account's space on the internal store +
// a dashboard row.
export async function POST(request: NextRequest) {
  const ctx = await requestAccount(request);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-_.]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const description = String(body.description ?? "");
  const visibility = body.visibility === "public" ? "public" : "private";
  const source = ["blank", "template", "import"].includes(body.source) ? body.source : "blank";
  const readme = body.readme !== false;
  const ci = body.ci === true;
  const sast = body.sast === true;
  const secretScan = body.secretScan === true;

  try {
    let meta;
    let language = body.language ?? null;
    let initialMessage = "Initial commit";

    if (source === "import") {
      const cloneUrl = String(body.cloneUrl ?? "").trim();
      if (!/^https?:\/\/\S+$/.test(cloneUrl)) {
        return NextResponse.json({ error: "a valid clone URL is required to import" }, { status: 400 });
      }
      const service = body.service === "gitlab" ? "gitlab" : "github";
      meta = await migrateRepo(ctx.account.id, name, cloneUrl, {
        service,
        authToken: body.authToken ? String(body.authToken) : undefined,
        description,
      });
      initialMessage = "Imported project";
    } else {
      const gitignore = /^[A-Za-z0-9+_. -]{1,60}$/.test(String(body.gitignore ?? "")) ? String(body.gitignore) : undefined;
      meta = await createRepo(ctx.account.id, name, description, { readme, gitignore });
      if (source === "template") {
        const tpl = TEMPLATES[String(body.template ?? "")] ?? TEMPLATES["node-app"];
        language = language ?? tpl.language;
        for (const [path, content] of Object.entries(tpl.files)) {
          await repoWrite(ctx.account.id, name, path, { content });
        }
        initialMessage = `Started from ${tpl.label} template`;
      }
      if (ci || sast || secretScan) {
        await repoWrite(ctx.account.id, name, ".puffbase/pipeline.yml", {
          content: pipelineYaml(sast, secretScan),
        });
      }
    }

    const [created] = await db
      .insert(repositories)
      .values({
        name,
        description,
        language,
        visibility,
        defaultBranch: meta.defaultBranch || "main",
        lastCommitMessage: initialMessage,
        accountId: ctx.account.id,
        ciEnabled: ci,
        sastEnabled: sast,
        secretScanEnabled: secretScan,
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating repo:", error);
    return NextResponse.json({ error: String(error) }, { status: 400 });
  }
}

// DELETE /api/repos?id=… - removes the store repo and the dashboard row.
// repositories.id is crdb int8 (overflows JS numbers) so compare as text.
export async function DELETE(request: NextRequest) {
  const ctx = await requestAccount(request);
  if (!ctx) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!hasScope(ctx.scopes, "repos:write")) return NextResponse.json({ error: "pufftoken lacks the repos:write scope" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id") ?? "";

  const [row] = await db
    .select()
    .from(repositories)
    .where(sql`${repositories.id}::text = ${id}`);
  if (!row || row.accountId !== ctx.account.id) {
    return NextResponse.json({ error: "Repo not found" }, { status: 404 });
  }

  try {
    await deleteRepo(ctx.account.id, row.name);
  } catch (e) {
    console.error("store delete failed, removing row anyway:", e);
  }
  await db.delete(repositories).where(sql`${repositories.id}::text = ${id}`);
  return NextResponse.json({ ok: true });
}

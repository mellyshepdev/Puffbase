/* Public repo browser — the puffbase face of the depot. Everything a visitor
 * sees on git.puff-base.com renders here; the engine itself only answers
 * protocol/API paths, so no upstream UI is ever exposed. */

import type { Express, Request, Response } from "express";
import {
  listRepos,
  getRepo,
  repoTree,
  readRepoFile,
  repoBranches,
  repoCommits,
  renderMarkdown,
  type RepoTreeEntry,
} from "./depot";

const GIT_HOSTS = new Set(
  (process.env.DEPOT_BROWSE_HOSTS ??
    "git.puff-base.com,git.prime-quality.online")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean),
);

/* ---------------------------------- shell --------------------------------- */

const CSS = `
:root{--purple:#6d36e8;--purple-dark:#32146f;--purple-light:#f2edff;--purple-soft:#faf8ff;--slime:#b1f150;--white:#fff;--ink:#191523;--muted:#716b7c;--line:#e9e4f2;--radius:18px}
*{box-sizing:border-box;margin:0;padding:0}
body{color:var(--ink);background:var(--purple-soft);font-family:Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.6}
a{color:var(--purple);text-decoration:none}
a:hover{color:var(--purple-dark);text-decoration:underline}
code,pre,.mono{font-family:ui-monospace,"SF Mono","Cascadia Code",Menlo,Consolas,monospace}
.wrap{width:min(calc(100% - 32px),1100px);margin-inline:auto}
.topbar{background:var(--white);border-bottom:1px solid var(--line);position:sticky;top:0;z-index:10}
.topbar .wrap{display:flex;align-items:center;gap:14px;padding:12px 0}
.brand{display:flex;align-items:center;gap:9px;font-weight:800;font-size:1.05rem;color:var(--purple-dark)}
.brand .dot{width:10px;height:10px;background:var(--slime);border:2px solid var(--purple-dark);border-radius:50%}
.topbar nav{margin-left:auto;display:flex;gap:18px;font-size:.85rem;font-weight:600}
.topbar nav a{color:var(--muted)}
.topbar nav a:hover{color:var(--purple-dark)}
.crumbs{padding:22px 0 8px;font-size:.9rem;color:var(--muted);display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.crumbs .repo{font-weight:800;color:var(--ink);font-size:1.25rem}
.crumbs .sep{color:var(--line)}
.pill{display:inline-block;padding:2px 10px;border-radius:999px;font-size:.72rem;font-weight:700;letter-spacing:.03em;text-transform:uppercase;background:var(--purple-light);color:var(--purple-dark);border:1px solid #e2d8ff}
.card{background:var(--white);border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;margin:14px 0 26px}
.card-head{display:flex;align-items:center;gap:10px;padding:12px 18px;border-bottom:1px solid var(--line);background:var(--purple-soft);font-size:.85rem;font-weight:700;color:var(--purple-dark)}
table.tree{width:100%;border-collapse:collapse;font-size:.92rem}
table.tree td{padding:9px 18px;border-bottom:1px solid var(--line)}
table.tree tr:last-child td{border-bottom:0}
table.tree tr:hover td{background:var(--purple-soft)}
.icon{display:inline-block;width:20px;text-align:center}
.size,.age{color:var(--muted);font-size:.82rem;text-align:right;white-space:nowrap}
.fileview{padding:0;font-size:.84rem;line-height:1.55}
.fileview .ln{display:flex}
.fileview .no{flex:0 0 52px;text-align:right;padding:0 14px;color:var(--muted);background:var(--purple-soft);user-select:none;border-right:1px solid var(--line)}
.fileview .code{flex:1;padding:0 16px;white-space:pre;overflow-x:auto}
.md{padding:22px 26px;font-size:.95rem}
.md img{max-width:100%}
.md pre{background:var(--ink);color:#e8e2f5;padding:14px 18px;border-radius:10px;overflow-x:auto;font-size:.85rem}
.md code{background:var(--purple-light);padding:2px 6px;border-radius:6px;font-size:.85em}
.md pre code{background:none;padding:0}
.md h1,.md h2,.md h3{margin:18px 0 8px;color:var(--purple-dark)}
.md table{border-collapse:collapse}.md td,.md th{border:1px solid var(--line);padding:6px 12px}
ul.commits{list-style:none}
ul.commits li{padding:12px 18px;border-bottom:1px solid var(--line);display:flex;gap:14px;align-items:baseline}
ul.commits li:last-child{border-bottom:0}
.sha{font-size:.78rem;color:var(--muted)}
.msg{font-weight:600}
.meta{display:flex;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:.85rem;margin:4px 0 10px}
.clone{display:flex;align-items:center;gap:10px;background:var(--ink);border-radius:12px;padding:10px 16px;margin:10px 0 0;color:#d8f2ff;font-size:.82rem}
.clone code{flex:1;overflow-x:auto;white-space:nowrap}
.repolist{list-style:none}
.repolist li{padding:16px 20px;border-bottom:1px solid var(--line)}
.repolist li:last-child{border-bottom:0}
.repolist .name{font-weight:800;font-size:1.02rem}
.repolist .desc{color:var(--muted);font-size:.87rem;margin-top:2px}
.empty{padding:34px;text-align:center;color:var(--muted)}
footer{border-top:1px solid var(--line);margin-top:34px;padding:20px 0;text-align:center;color:var(--muted);font-size:.8rem;background:var(--white)}
select.ref{border:1px solid var(--line);border-radius:8px;padding:5px 10px;font:inherit;font-size:.82rem;background:var(--white);color:var(--ink)}
`;

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

function page(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} · Puffbase</title>
<link rel="icon" href="/favicon.png">
<style>${CSS}</style></head><body>
<div class="topbar"><div class="wrap">
  <a class="brand" href="/"><span class="dot"></span>Puffbase<span style="color:var(--muted);font-weight:600;font-size:.75rem">depot</span></a>
  <nav><a href="https://puff-base.com">puff-base.com</a><a href="https://dash.puff-base.com">dashboard</a><a href="https://admin.puff-base.com">console</a></nav>
</div></div>
<div class="wrap">${body}</div>
<footer>Hosted on Puffbase depot · <a href="https://puff-base.com">puff-base.com</a></footer>
</body></html>`;
}

function fmtSize(n: number | undefined): string {
  if (n == null) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1048576).toFixed(1)} MB`;
}

function fmtAge(iso: string | undefined): string {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000);
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

function notFound(res: Response, what = "Repository") {
  res
    .status(404)
    .send(
      page(
        "Not found",
        `<div class="card"><div class="empty"><h2>${esc(what)} not found</h2><p>It doesn't exist, or it's private.</p><p style="margin-top:14px"><a href="/">Browse public repositories →</a></p></div></div>`,
      ),
    );
}

/* ------------------------------- tree shaping ------------------------------ */

/** Reduce the depot's recursive tree to the direct children of `prefix`. */
function dirEntries(tree: RepoTreeEntry[], prefix: string) {
  const seen = new Map<string, RepoTreeEntry>();
  const pre = prefix ? `${prefix}/` : "";
  for (const e of tree) {
    if (prefix && !e.path.startsWith(pre)) continue;
    const rest = prefix ? e.path.slice(pre.length) : e.path;
    const head = rest.split("/")[0];
    if (!head) continue;
    const isDir = rest.includes("/") || e.type === "dir";
    const key = `${isDir ? "d" : "f"}:${head}`;
    if (!seen.has(key)) {
      seen.set(key, {
        path: pre + head,
        type: isDir ? "dir" : "file",
        size: isDir ? 0 : e.size,
      });
    }
  }
  return [...seen.values()].sort(
    (a, b) => Number(b.type === "dir") - Number(a.type === "dir") || a.path.localeCompare(b.path),
  );
}

function treeTable(owner: string, repo: string, ref: string, prefix: string, entries: RepoTreeEntry[]): string {
  const rows = entries
    .map((e) => {
      const isDir = e.type === "dir";
      const href = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${isDir ? "tree" : "blob"}/${encodeURIComponent(ref)}/${e.path
        .split("/")
        .map(encodeURIComponent)
        .join("/")}`;
      return `<tr><td><span class="icon">${isDir ? "📁" : "📄"}</span><a href="${href}">${esc(e.path.split("/").pop()!)}</a></td><td class="size">${isDir ? "" : fmtSize(e.size)}</td></tr>`;
    })
    .join("");
  const up = prefix
    ? `<tr><td><span class="icon">↩</span><a href="/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/tree/${encodeURIComponent(ref)}/${prefix
        .split("/")
        .slice(0, -1)
        .map(encodeURIComponent)
        .join("/")}">..</a></td><td></td></tr>`
    : "";
  return `<table class="tree">${up}${rows || `<tr><td class="empty">Empty directory</td></tr>`}</table>`;
}

const README_NAMES = ["readme.md", "readme.txt", "readme", "readme.markdown"];

/* --------------------------------- routes ---------------------------------- */

export function registerRepoPages(app: Express) {
  const gitOnly = (req: Request, res: Response, next: () => void) => {
    if (!GIT_HOSTS.has(req.hostname.toLowerCase())) return next();
    // Only the repo space belongs to us on the git host - single-segment
    // paths (/favicon.png, /healthz, assets) fall through to the app.
    const segs = req.path.split("/").filter(Boolean).length;
    if (segs === 1) return next();
    void handle(req, res).catch((err) => {
      console.error("[repo-pages]", err);
      if (!res.headersSent)
        res
          .status(500)
          .send(page("Error", `<div class="card"><div class="empty"><h2>Something broke</h2><p>The depot didn't answer cleanly. Try again in a moment.</p></div></div>`));
    });
  };
  app.use(gitOnly);
}

async function handle(req: Request, res: Response) {
  const parts = req.path.split("/").filter(Boolean).map(decodeURIComponent);
  const [owner, repo, section, ref, ...rest] = parts;
  const filePath = rest.join("/");

  // GET / → public explore
  if (parts.length === 0) {
    const repos = (await listRepos()).filter((r) => !r.private);
    const items = repos
      .map(
        (r) => `<li>
          <a class="name" href="/${esc(r.fullName)}">${esc(r.fullName)}</a>
          ${r.description ? `<div class="desc">${esc(r.description)}</div>` : ""}
          <div class="meta"><span>★ ${r.starsCount}</span><span>⑂ ${r.forksCount}</span><span>updated ${fmtAge(r.updatedAt)}</span></div>
        </li>`,
      )
      .join("");
    res.send(
      page(
        "Repositories",
        `<div class="crumbs"><span class="repo">Depot</span><span class="pill">${repos.length} public repos</span></div>
         <div class="card"><ul class="repolist">${items || `<li class="empty">No public repositories yet.</li>`}</ul></div>`,
      ),
    );
    return;
  }

  if (!owner || !repo) return notFound(res);
  if (parts.length === 1) return notFound(res, "Owner");

  const info = await getRepo(owner, repo);
  if (!info) return notFound(res);
  if (info.private) {
    res.status(404).send(
      page(
        "Private repository",
        `<div class="card"><div class="empty"><h2>${esc(owner)}/${esc(repo)}</h2><p>This repository is private.</p><p style="margin-top:14px">Clone over SSH or sign in through the <a href="https://dash.puff-base.com">dashboard</a>.</p></div></div>`,
      ),
    );
    return;
  }

  const branch = ref || info.defaultBranch;
  const base = `/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const crumbs = `<div class="crumbs">
    <a href="/">${esc(owner)}</a><span class="sep">/</span>
    <a class="repo" href="${base}">${esc(repo)}</a>
    ${info.description ? `<span style="color:var(--muted)">— ${esc(info.description)}</span>` : ""}
  </div>`;

  const head = (label: string) =>
    `<div class="card-head">${label}
      <span style="margin-left:auto;display:flex;gap:10px;align-items:center">
        <a href="${base}/commits/${encodeURIComponent(branch)}">commits</a>
        <a href="${base}/branches">branches</a>
      </span></div>`;

  const cloneBox = `<div class="clone"><span>clone</span><code>git clone https://git.puff-base.com/${esc(owner)}/${esc(repo)}.git</code><code style="flex:0 0 auto">ssh: git@git.puff-base.com:2222/${esc(owner)}/${esc(repo)}.git</code></div>`;

  switch (section ?? "") {
    case "": {
      const tree = await repoTree(owner, repo, info.defaultBranch);
      const entries = dirEntries(tree, "");
      const readme = tree.find((e) =>
        README_NAMES.includes(e.path.toLowerCase()),
      );
      let readmeHtml = "";
      if (readme) {
        const f = await readRepoFile(owner, repo, readme.path, info.defaultBranch);
        readmeHtml = readme.path.toLowerCase().endsWith(".txt")
          ? `<div class="md"><pre style="white-space:pre-wrap;font-family:inherit">${esc(f.content)}</pre></div>`
          : `<div class="md">${await renderMarkdown(f.content, `${owner}/${repo}`)}</div>`;
      }
      res.send(
        page(
          `${owner}/${repo}`,
          `${crumbs}
           <div class="meta"><span>★ ${info.starsCount}</span><span>⑂ ${info.forksCount}</span><span>default <code>${esc(info.defaultBranch)}</code></span><span>updated ${fmtAge(info.updatedAt)}</span></div>
           ${cloneBox}
           <div class="card">${head(`<code>${esc(branch)}</code>`)}${treeTable(owner, repo, branch, "", entries)}</div>
           ${readmeHtml ? `<div class="card">${head("README")}${readmeHtml}</div>` : ""}`,
        ),
      );
      return;
    }

    case "tree": {
      if (!ref) return res.redirect(`${base}/tree/${encodeURIComponent(info.defaultBranch)}`);
      const tree = await repoTree(owner, repo, ref);
      const entries = dirEntries(tree, filePath);
      res.send(
        page(
          `${owner}/${repo}/${filePath || ""}`,
          `${crumbs}
           <div class="card">${head(`<code>${esc(ref)}</code> /${esc(filePath)}`)}${treeTable(owner, repo, ref, filePath, entries)}</div>`,
        ),
      );
      return;
    }

    case "blob": {
      if (!ref || !filePath) return notFound(res, "File");
      const f = await readRepoFile(owner, repo, filePath, ref).catch(() => null);
      if (!f) return notFound(res, "File");
      const isMd = /\.(md|markdown)$/i.test(f.name);
      const lines = f.content.split("\n");
      const body = isMd
        ? `<div class="md">${await renderMarkdown(f.content, `${owner}/${repo}`)}</div><details style="padding:0 18px 14px"><summary style="cursor:pointer;color:var(--muted);font-size:.8rem">raw</summary><div class="fileview">${lines
            .map((l, i) => `<div class="ln"><span class="no">${i + 1}</span><span class="code">${esc(l)}</span></div>`)
            .join("")}</div></details>`
        : `<div class="fileview">${lines
            .map((l, i) => `<div class="ln"><span class="no">${i + 1}</span><span class="code">${esc(l)}</span></div>`)
            .join("")}</div>`;
      res.send(
        page(
          `${repo}/${filePath}`,
          `${crumbs}
           <div class="card">${head(`<code>${esc(ref)}</code> /${esc(filePath)} <span class="size">${fmtSize(f.size)}</span>`)}${body}</div>`,
        ),
      );
      return;
    }

    case "commits": {
      const commits = await repoCommits(owner, repo, ref || info.defaultBranch);
      const items = commits
        .map(
          (c) => `<li><span class="sha mono">${esc(c.sha.slice(0, 8))}</span><span class="msg">${esc(c.message.split("\n")[0])}</span><span class="age">${esc(c.author)} · ${fmtAge(c.date)}</span></li>`,
        )
        .join("");
      res.send(
        page(
          `${repo} commits`,
          `${crumbs}
           <div class="card">${head(`commits on <code>${esc(ref || info.defaultBranch)}</code>`)}<ul class="commits">${items || `<li class="empty">No commits yet.</li>`}</ul></div>`,
        ),
      );
      return;
    }

    case "branches": {
      const branches = await repoBranches(owner, repo);
      const items = branches
        .map(
          (b) => `<li><span class="msg mono">${esc(b)}</span>${b === info.defaultBranch ? ` <span class="pill">default</span>` : ""}<span class="age" style="margin-left:auto"><a href="${base}/tree/${encodeURIComponent(b)}">browse →</a></span></li>`,
        )
        .join("");
      res.send(
        page(
          `${repo} branches`,
          `${crumbs}
           <div class="card">${head("branches")}<ul class="commits">${items}</ul></div>`,
        ),
      );
      return;
    }

    default:
      return notFound(res, "Page");
  }
}

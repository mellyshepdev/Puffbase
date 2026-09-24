# Puffbase

A React + Vite + Express + Tailwind/shadcn "PaaS dashboard" concept app (purple "ooze" visual theme), reconstructed from source files an AI coding agent had scattered across Google Drive (uploaded 2026-07-30, no zip/archive under 10MB was retrievable, so this was rebuilt file-by-file from Drive's folder tree at `Quick Share/puffbase`).

## What's here

Full source, complete and building cleanly:

- Full server: `server/index.ts`, `server/routes.ts`, `server/storage.ts`, `server/vite.ts`, `server/static.ts`
- Full schema: `shared/schema.ts` (Drizzle ORM, SQLite)
- Build tooling: `script/build.ts`, `tools/decheck.py`, root configs (`vite.config.ts`, `tailwind.config.ts`, `drizzle.config.ts`, `tsconfig.json`, `components.json`, `package.json`)
- Client shell: `client/index.html`, `client/src/main.tsx`, `client/src/App.tsx`, `client/src/index.css`
- Custom app components: `Sidebar.tsx`, `Header.tsx`, `OozeOverlay.tsx`, `PuffbaseLogo.tsx`, `ThemeProvider.tsx`, `kit.tsx`
- `client/src/lib/` (utils, queryClient, mock/data layer) and `client/src/hooks/` (use-toast, use-mobile)
- `client/src/pages/` — all five dashboard pages (Overview, Deployments, Services, Analytics, Settings) plus not-found
- `client/src/components/ui/` — all ~47 shadcn/ui "new-york" style primitives (generated via `npx shadcn@latest add ...`, per `components.json`)
- `client/src/assets/` — the four ooze webp images the UI actually imports (`ooze-drip-top`, `ooze-drip-alt`, `ooze-drip-rail`, `ooze-sidebar`)
- `Dockerfile` / `.dockerignore` / `fly.toml` — production deploy config (Fly.io, app `bsco-puffbase`)

## Running it

```
npm install
npm run dev      # local dev server (Vite middleware + Express API)
npm run build    # production build: client -> dist/public, server -> dist/index.cjs
npm start        # NODE_ENV=production node dist/index.cjs
```

Data is a self-seeding SQLite file (`data.db`, gitignored) — no external services or env vars required to run.

## Deploying

Deployed on Fly.io as `bsco-puffbase` (`flyctl deploy --remote-only` from this directory). The Dockerfile is a 4-stage build: full deps for building, `npm run build`, production-only deps (rebuilt for the target platform so `better-sqlite3`'s native binary matches), then a slim runtime image running `node dist/index.cjs`.

## Getting started (using the platform)

The live dashboard is the Next.js app under `pages/` — sign in at `https://dash.puff-base.com` (Keycloak SSO, `puffbase-customers` realm).

### 1. Create or import a repo

- **New repo:** Dashboard → **New** → pick a source. *Blank* creates an empty repo; *Import* copies a repo — history and all branches — from an HTTPS clone URL.
- Once created, the repo's **Code** button shows both clone URLs:

```
HTTPS: https://git.puff-base.com/puffadmin/<repo>.git
SSH:   git@git.puff-base.com:puffadmin/<repo>.git
```

### 2. Set up git access

- **SSH (recommended):** Settings → **SSH keys** → paste your public key (`~/.ssh/id_ed25519.pub`). Then `git clone git@git.puff-base.com:puffadmin/<repo>.git`.
- **HTTPS:** use a fine-grained access token as the password (see step 4).

### 3. Push code

```
git clone https://git.puff-base.com/puffadmin/<repo>.git
cd <repo>
# make changes
git add -A && git commit -m "first commit"
git push
```

You can also create/edit files directly in the browser via the built-in **editor** on any repo page.

### 4. Access tokens (for git over HTTPS, API, CI)

Settings → **Developer tokens** → mint a *fine-grained* token. Scopes are actually enforced — a token with only `repos:read` can't push, and tokens can't mint more tokens. Pick the read/write scopes you need for: repos, issues, pipelines, deployments, groups, integrations, docs.

### 5. Repo settings

Inside any repo, the **Repo settings** menu (top of the left sidebar) has: General, Visibility, **Collaborations** (add business partners with read/write/admin roles), **Webhooks** (signed `X-Puffbase-Signature` HMAC deliveries on repo events), **Integrations**, **Deploy keys** (SSH read or read/write deploy access), Mirroring, and Danger zone.

### 6. Business workspaces

The top-right account menu switches between your personal account and business workspaces — repos, tokens, and integrations are scoped to whichever workspace is active.

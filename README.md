# Puffbase

A self-hosted code-hosting + PaaS dashboard — Git hosting, workspaces,
tokens, webhooks and deploys behind Keycloak SSO, wrapped in a purple
"ooze" visual theme.

## Description

Puffbase gives each customer a place to create and manage git repositories,
collaborators, SSH/deploy keys, access tokens and integrations without
touching GitHub. The live product is the Next.js dashboard at
`dash.puff-base.com` with git over SSH/HTTPS at `git.puff-base.com`, backed
by the `puffbase-customers` Keycloak realm.

This repository holds two apps:

| Path | What it is |
| --- | --- |
| `pages/` | **The production platform** — Next.js app (PostgreSQL) behind `dash.puff-base.com`: repos, issues, workspaces, tokens, webhooks, editor, mirroring. |
| repo root | **The original concept dashboard** — React + Vite + Express + Tailwind/shadcn, SQLite (Drizzle). Reconstructed file-by-file from a Google Drive backup (2026-07-30; no archive was retrievable, so this was rebuilt from the folder tree at `Quick Share/puffbase`). Deploys to Fly.io as `bsco-puffbase`. |

## Features

- Repo create/blank/import (full history from an HTTPS clone URL)
- Clone over SSH (`git@git.puff-base.com`) or HTTPS with fine-grained tokens
- In-browser file editor on every repo page
- Per-scoped developer tokens — enforced scopes, no token mints tokens
- Collaborators with read/write/admin roles, business workspaces
- Signed webhooks (`X-Puffbase-Signature` HMAC), deploy keys, mirroring
- Keycloak SSO (`puffbase-customers` realm)

## Requirements

- Node 18+ / npm (both apps)
- PostgreSQL for `pages/` (production platform)
- SQLite only for the root concept dashboard — self-seeds, no external services

## Running the concept dashboard (repo root)

```sh
npm install
npm run dev      # Vite middleware + Express API
npm run build    # client -> dist/public, server -> dist/index.cjs
npm start        # NODE_ENV=production node dist/index.cjs
npm run check    # tsc
```

## Running the platform (`pages/`)

```sh
cd pages
npm install
npm run dev        # or: build / start / lint / typecheck
```

## Deploying

- Concept dashboard: Fly.io app `bsco-puffbase` — `flyctl deploy --remote-only`.
  The Dockerfile is a 4-stage build (deps → `npm run build` → production deps
  rebuilt for target so `better-sqlite3`'s native binary matches → slim
  `node dist/index.cjs` runtime).
- Platform: `pages/` builds and deploys as its own Next.js service.

## Using the platform

Sign in at `https://dash.puff-base.com` (Keycloak SSO, `puffbase-customers`).

1. **Create or import a repo** — Dashboard → New → *Blank* or *Import*.
   The repo's **Code** button shows both clone URLs:

   ```
   HTTPS: https://git.puff-base.com/puffadmin/<repo>.git
   SSH:   git@git.puff-base.com:puffadmin/<repo>.git
   ```

2. **Git access** — Settings → SSH keys (recommended) or a fine-grained
   developer token as the HTTPS password.

3. **Push** — `git clone`, commit, `git push` as usual.

4. **Tokens** — Settings → Developer tokens. Scopes are enforced
   (repos/issues/pipelines/deployments/groups/integrations/docs).

5. **Repo settings** — General, Visibility, Collaborations, Webhooks,
   Integrations, Deploy keys, Mirroring, Danger zone — in the sidebar menu
   on any repo page.

6. **Workspaces** — the top-right account menu switches between your
   personal account and business workspaces; repos, tokens and integrations
   are scoped to the active one.

## Project status

Active. The root app is kept building cleanly as the reference concept UI;
`pages/` is where the shipped product lives.

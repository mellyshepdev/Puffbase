# SlimeGit — Puffbase user dashboard

**This is live production code.** It serves the customer-facing dashboard at
https://app.prime-quality.online — do not remove it when cleaning up the
admin console (that lives in `client/` + `server/`).

## What it is

A standalone Next.js app — the user-facing dashboard where customers see
their repos, pipelines, issues, deployments, and status. Purple + slime
green theme. It is NOT the admin console:

| URL | App | Realm/client |
| --- | --- | --- |
| `puffbase.prime-quality.online/` | landing page (`client/public/landing.html`) | — |
| `puffbase.prime-quality.online/console` | admin dashboard (`client/`) | `puffbase` / `puffbase` |
| **`app.prime-quality.online`** | **this app** | `puffbase-customers` / `slimegit` |
| `puff.dashboard.prime-quality.online` | editor surface — same app, `/` rewrites to `/editor` | `puffbase-customers` / `slimegit` |
| `git.prime-quality.online` | Gitea forge (git host) | `blacksheep` via OIDC |

Auth: Keycloak OIDC, `puffbase-customers` realm, `slimegit` client.
Middleware gates every route — unauthenticated requests bounce to
`/api/auth/login` → Keycloak → `/api/auth/callback`. The login
`redirect_uri` is built from the request host (`requestBase()` in
`src/lib/oidc.ts`) because the session cookie is host-only — both
hostnames are registered as valid redirect URIs on the `slimegit` client.

## Editor

`/editor` (also `puff.dashboard.prime-quality.online`) is the customer
code/document editor — backed by `src/lib/gitstore.ts`, the same per-user
document space the admin console's Documents page uses (private repo per
document, every save is a commit). API: `/api/editor*` (list/create docs,
tree, read/write/delete files).

## Run it

    cp .env.example .env   # fill in secrets
    npm install
    npm run build
    npx next start -H 100.99.131.20 -p 3500

In production it runs under docker compose — see
`~/server/puffbase/docker-compose.yml` service `userdash`
(`restart: always`, bound to `100.99.131.20:3500`).

`dashboard2/` is the earlier variant kept for reference — the merged app
in `src/` is what runs.

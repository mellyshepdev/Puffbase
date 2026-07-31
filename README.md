# Puffbase

A React + Vite + Express + Tailwind/shadcn "PaaS dashboard" concept app (purple "ooze" visual theme), reconstructed from source files an AI coding agent had scattered across Google Drive (uploaded 2026-07-30, no zip/archive under 10MB was retrievable, so this was rebuilt file-by-file from Drive's folder tree at `Quick Share/puffbase`).

## What's here

- Full server: `server/index.ts`, `server/routes.ts`, `server/storage.ts`, `server/vite.ts`, `server/static.ts`
- Full schema: `shared/schema.ts` (Drizzle ORM, SQLite)
- Build tooling: `script/build.ts`, `tools/decheck.py`, root configs (`vite.config.ts`, `tailwind.config.ts`, `drizzle.config.ts`, `tsconfig.json`, `components.json`, `package.json`)
- Client shell: `client/index.html`, `client/src/main.tsx`, `client/src/App.tsx`, `client/src/index.css`
- Custom app components: `Sidebar.tsx`, `Header.tsx`, `OozeOverlay.tsx`, `PuffbaseLogo.tsx`, `ThemeProvider.tsx`, `kit.tsx`
- `client/src/lib/` (utils, queryClient, mock/data layer) and `client/src/hooks/` (use-toast, use-mobile)
- `client/src/pages/not-found.tsx`

## What's NOT here (and why)

- **`client/src/pages/{Overview,Deployments,Services,Analytics,Settings}.tsx`** — the five main dashboard pages. These exist in the source Drive folder but weren't transcribed into this repo due to time constraints during the initial import. Re-fetch them from the same Drive folder tree (`puffbase/client/src/pages/`) or regenerate against `FRONTEND_SPEC.md`-equivalent requirements (routes: `/`, `/deployments`, `/services`, `/analytics`, `/settings`; see `App.tsx` for the expected component shape).
- **`client/src/components/ui/*`** — the ~47 shadcn/ui "new-york" style primitives referenced throughout (button, card, sidebar, dialog, etc. — see `components.json`). These are stock shadcn components, not custom Puffbase code. Regenerate with the shadcn CLI rather than hand-copying:
  ```
  npx shadcn@latest add button card input label separator avatar badge \
    dropdown-menu tooltip sidebar tabs skeleton table select textarea \
    toast toaster dialog alert alert-dialog accordion checkbox switch \
    progress popover scroll-area slider radio-group navigation-menu \
    menubar hover-card form drawer context-menu command collapsible \
    chart carousel calendar breadcrumb aspect-ratio toggle toggle-group \
    resizable pagination input-otp
  ```
  (`components.json` already points the CLI at the right paths/aliases.)
- `client/src/assets/*` (ooze-*.png/webp) and `PuffbaseLogo.tsx`'s referenced images — pull these from the same Drive folder (`puffbase/client/src/assets/`) into `client/src/assets/`.
- `package-lock.json` — regenerate with `npm install` once the above is filled in.

## Not runnable yet

Because of the gaps above, `npm install && npm run dev` will fail until the missing pages, ui/ primitives, and assets are added back. This repo is a source-control checkpoint, not a deployed or verified build.

# Beslissing 089: Remotion-workspace (`apps/video`) buiten de Turborepo-build-graph

**Status:** Geaccepteerd
**Datum:** 2026-08-07
**Gerelateerde code:** `apps/video/*`, `pnpm-workspace.yaml`

## Context

Voor marketingclips (homepage) zetten we een Remotion-workspace op die de Playwright-opname uit
`tests/playwright/capture/recordings/` monteert. Remotion trekt een zware dependency-boom mee
(eigen headless Chrome, ffmpeg, esbuild) die niets met de twee Next-apps te maken heeft. Als
`apps/video` een gewoon workspace-lid zou zijn, zou het meegaan in `pnpm install`, `turbo run build`,
`dev --parallel` en de Vercel-deploys — trager, en risico dat een render-only dependency in een
productie-build lekt.

pnpm/Turbo leiden de task-graph af uit het workspace-lidmaatschap; Turbo heeft geen aparte
include/exclude-lijst. De enige schone manier om `apps/video` eruit te houden is het **uit de
pnpm-workspace te sluiten**.

## Beslissing

`apps/video` is een **standalone** Remotion-project met een eigen `node_modules` en eigen install
(`npm install` in de map), **uitgesloten** uit de workspace via `- '!apps/video'` in
`pnpm-workspace.yaml`. Het heeft geen `build`-script dat turbo draait en verschijnt niet in de
turbo-scope. De bronopname wordt niet dubbel gecommit: `public/` is gitignored en een `copy-source`
pre-hook kopieert de canonieke `core-flow.webm` uit `tests/playwright/capture/recordings/` vóór
`studio`/`render`/`still`.

## Rationale

- De render-toolchain (Chrome, ffmpeg, esbuild) hoort niet in de app-install of -deploy.
- `!`-exclusie is de enige gegarandeerde loskoppeling (Turbo volgt de pnpm-workspace).
- Reproduceerbaar zonder duplicatie: één canonieke opname in `tests/`, gekopieerd bij render.

## Consequenties

- `pnpm install` / `turbo run build` / Vercel raken `apps/video` nooit (geverifieerd: turbo-scope = 3 packages, Tasks: 2).
- Wie de clip wil bouwen: `cd apps/video && npm install && npm run render` (of `npm run studio`).
- Gerenderde deliverables (`out/home-clip.mp4` + poster) worden wél gecommit, ter review; `node_modules`/`public`/`package-lock` niet.
- Draait op zijn eigen `package-lock.json` (npm), losgekoppeld van de pnpm-lockfile van de monorepo.

# Beslissing 047: Turborepo als build-orchestrator

**Status:** Geaccepteerd  
**Datum:** 2026-05-05  
**Gerelateerde code:** `turbo.json`, `package.json` (root scripts)

## Context

Na de monorepo-split (ADR-045) bestaan er twee Next.js apps (`apps/marketing`, `apps/app`) en één shared package (`packages/shared`). Bouwen via individuele pnpm filters (`pnpm --filter @indxr/marketing build`) werkt, maar mist twee structurele voordelen:

1. **Build caching** — elke `pnpm build` herbouwt altijd alles, ook als niets veranderd is
2. **Schaalbaarheid** — bij meer packages en langere builds wordt het onpraktisch

## Beslissing

Turborepo introduceren als build-orchestrator via `turbo.json` in de repo root.

Canonieke commands worden:

```bash
pnpm build          # turbo run build (beide apps, met caching)
pnpm dev            # turbo run dev --parallel (beide apps)
pnpm lint           # turbo run lint
pnpm typecheck      # turbo run typecheck
```

Bestaande pnpm filter-commands blijven beschikbaar voor specifieke gevallen:

```bash
pnpm build:marketing   # pnpm --filter @indxr/marketing build
pnpm build:app         # pnpm --filter @indxr/app build
pnpm dev:marketing     # pnpm --filter @indxr/marketing dev
pnpm dev:app           # pnpm --filter @indxr/app dev
```

## Rationale

- **Intelligent caching** — Turborepo slaat build-output op per package + hash van inputs (bestanden + env vars). Ongewijzigde packages zijn in milliseconden "gebouwd" (cache replay)
- **Vercel Remote Caching** — gratis bij Vercel Pro; gedeelde cache tussen lokale dev en Vercel CI/CD. Auto-detectie via `turbo.json` aanwezig in repo root — geen extra Vercel dashboard config nodig
- **Parallelle builds** — beide apps bouwen tegelijkertijd (al het geval bij pnpm, maar Turborepo coördineert ook de dependency-volgorde via `dependsOn: ["^build"]`)
- **Minimale invasiviteit** — geen changes in apps zelf, alleen root-niveau config

## Geverifieerde performance

Gemeten op 2026-05-05:

| Situatie | Tijd |
|---|---|
| Cold build (geen cache) | 51.3s |
| Warm build (FULL TURBO) | 63ms |
| Partial invalidation (1 app gewijzigd) | 29s (alleen gewijzigde app herbouwt) |

## Consequenties

- `turbo run build/dev/lint/typecheck` zijn de canonieke commands (via `pnpm build/dev/lint/typecheck`)
- Bestaande `pnpm build:marketing/app` werken ongewijzigd voor specifieke gevallen
- `.turbo/` en `apps/*/.turbo/` staan in `.gitignore`
- Vercel detecteert `turbo.json` automatisch en schakelt Turborepo in voor builds
- `packages/shared` heeft geen eigen `build` script — Turborepo's `dependsOn: ["^build"]` is dus no-op voor shared (Next.js compileert shared via `transpilePackages`)

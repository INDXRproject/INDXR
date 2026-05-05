# Beslissing 046: Monorepo Import Aliases — @/* lokaal, @indxr/shared/* expliciet

**Status:** Geaccepteerd  
**Datum:** 2026-05-05  
**Gerelateerde code:** `apps/marketing/tsconfig.json`, `apps/app/tsconfig.json`, `packages/shared/package.json`

## Context

Na de monorepo-split (migration-002, 2026-05-05) gebruikten beide apps een tsconfig fallback-paths configuratie:

```json
"@/*": ["./src/*", "../../packages/shared/src/*"]
```

Dit betekende dat `@/lib/utils` eerst in de lokale `src/` werd gezocht, en bij niet-vinden automatisch in `packages/shared/src/`. Functioneel werkte dit, maar creëerde een **silent shadow risico**: een per ongeluk lokaal toegevoegd bestand met dezelfde naam als een shared bestand overschreef stilletjes de shared versie zonder build-fout of waarschuwing.

Voorbeeld: als iemand `apps/app/src/lib/utils.ts` aanmaakt, worden alle `@/lib/utils` imports in apps/app opeens naar die lokale versie gerouteerd — inclusief componenten die de shared versie verwachten.

## Beslissing

Twee aparte aliassen in beide apps' tsconfig:

```json
"paths": {
  "@/*": ["./src/*"],
  "@indxr/shared/*": ["../../packages/shared/src/*"]
}
```

- **`@/*`** resolveert uitsluitend naar de lokale `apps/*/src/`. Shadow is onmogelijk: als een bestand niet lokaal bestaat, faalt de build direct.
- **`@indxr/shared/*`** resolveert expliciet naar `packages/shared/src/`. Import-bron is zichtbaar in de code.

Alle shared imports in beide apps zijn omgezet van `@/X` naar `@indxr/shared/X` (100 bestanden, Fase A1b, 2026-05-05).

## Rationale

- **Shadow-risico geëlimineerd:** lokale bestanden kunnen shared bestanden niet meer stilletjes overschrijven.
- **Expliciete bron-zichtbaarheid:** `@indxr/shared/components/ui/button` vs `@/components/dashboard/X` — op het eerste gezicht duidelijk waar de import vandaan komt.
- **Naamconsistentie:** `@indxr/shared` matcht het `"name"` veld in `packages/shared/package.json`. Één naam voor het package in package.json, tsconfig én imports.
- **Toekomstbestendig:** bij een tweede shared package (bijv. `@indxr/api-types`) past hetzelfde scope-patroon naadloos.
- **Build-time verificatie:** een verkeerde alias faalt direct bij `pnpm build`, niet pas in productie.

## Consequenties

- Alle imports naar shared bestanden moeten het `@indxr/shared/*` prefix gebruiken.
- Nieuwe shared bestanden: imports in apps bijwerken naar `@indxr/shared/X`.
- Nieuwe lokale bestanden: imports als `@/X` — geen actie voor shared nodig.
- `packages/shared/src/` bestanden gebruiken nog steeds relatieve imports intern (geen @/-alias in shared zelf).

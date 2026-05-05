# Beslissing 045: Migratie naar twee Vercel projecten (monorepo)

**Status:** Geaccepteerd (implementatie pending — aparte sessie)  
**Datum:** 2026-05-05  
**Gerelateerde code:** `src/middleware.ts`, `src/lib/cross-host-links.ts`, `src/app/(app)/`

---

## Context

ADR-034 besloot tot `app.indxr.ai` als app-subdomain. De initiële implementatie (Werksessie C) realiseerde dit via één Next.js project met hostname-aware middleware die 308-redirects uitvoerde tussen `indxr.ai` en `app.indxr.ai`.

Deze aanpak veroorzaakte een persistente bug-klasse: **TypeError "Error in input stream"** in Firefox en Chrome. Oorzaak: Next.js RSC (React Server Components) prefetch-requests volgen cross-origin 308-redirects, maar de RSC stream-parser verwacht dat de response van hetzelfde origin komt. Een cross-origin redirect produceert geen geldig RSC payload → parser crash.

Vier rondes symptoom-fixes waren nodig (C.2.2, C.2.6, C.2.7, Server Action redirect-aanpak) voordat de bug definitief gesloten werd. De middleware-aanpak is een architectural mismatch met Next.js's RSC-architectuur.

Aanvullende observatie: Linear, Vercel en Notion (de voorbeelden in ADR-034 rationale) gebruiken subpaths op één domain, *niet* echte subdomain-splits met aparte deployments. Echte subdomain-splits (Slack-patroon) vereisen aparte deployments per host.

---

## Beslissing

Migreer van één Next.js project naar **twee aparte Vercel projecten** in een pnpm monorepo:

```
INDXR.AI V2/
├── apps/
│   ├── marketing/   → Vercel project: indxr.ai
│   └── app/         → Vercel project: app.indxr.ai
└── packages/
    └── shared/      → gedeelde UI-componenten, utils, types
```

Elk Vercel project deployt onafhankelijk. Middleware hostname-routing wordt verwijderd. Elk project heeft alleen routes die bij zijn host horen.

---

## Rationale

- **RSC-compatibility**: geen cross-origin redirects meer, geen RSC stream-parser crashes
- **Eenvoudigere middleware**: elk project heeft standaard Next.js middleware zonder hostname-detectie
- **Juist moment**: pre-launch, geen actieve gebruikers, eenmalige migratie
- **Werkwijze in lijn met Vercel's eigen aanbeveling** voor subdomain-splits
- Werksessie C-werk blijft nuttig: route groups (`(app)/`), `cross-host-links.ts` helpers, cookie domain-configuratie, Server Action redirect-patroon

---

## Consequenties

- **Eenmalige migratiekosten**: ~1 werkdag (bestandsstructuur, twee Vercel projecten aanmaken, env vars dupliceren, pnpm workspace config)
- **Twee Vercel projecten te managen**: elk heeft eigen env vars, deploy-logs, preview URLs — meer overhead maar elk project is eenvoudiger
- **`NEXT_PUBLIC_APP_URL` / `NEXT_PUBLIC_MARKETING_URL`** blijven nodig voor cross-host links in elke app
- **Middleware hostname-routing** (`src/middleware.ts`) wordt verwijderd; vervangen door eenvoudige auth-guards per project
- **C.2.1 (manifest CORS)** en **C.2.4 (Python CORS)** worden tijdens migratie opgelost als side-effect
- **Herzien wanneer**: pnpm monorepo-overhead te hoog blijkt (dan: aparte git repos per project)

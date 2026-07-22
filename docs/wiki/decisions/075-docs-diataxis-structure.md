# Beslissing 075: Docs-structuur volgens Diátaxis — ingedeeld naar wat de lezer komt doen

**Status:** Geaccepteerd
**Datum:** 2026-07-22
**Gerelateerde code:** `apps/marketing/src/lib/docs-config.ts`, `apps/marketing/src/app/docs/**`, `apps/marketing/src/app/sitemap.ts`, `apps/marketing/next.config.ts`, `apps/marketing/src/app/docs/page.tsx`, `packages/shared/src/components/Footer.tsx`

## Context

Na ADR-074 waren de docs ingedeeld op onderwerp ("Using INDXR / Exports / Account"). Dat groepeert
naar *waar iets over gaat*, niet naar *wat de lezer komt doen*. Een lezer die een transcript wil
maken en een lezer die de exacte SRT-velden opzoekt hebben andere behoeften; een onderwerp-indeling
bedient geen van beide goed. Bovendien ontbraken pagina's voor twee kernacties (losse video, uploads)
en waren er redirect-lagen van drie eerdere herstructureringen — ballast, want we zijn niet live,
nooit bij Search Console ingediend, en er zijn geen externe inkomende links.

## Beslissing

Vier categorieën volgens **Diátaxis**, ingedeeld naar de intentie van de lezer (leren / doen /
opzoeken / account):

- **Getting started** (leren) — Quickstart · How INDXR works · FAQ
- **Guides** (doen) — Single video · Playlists · Audio & video uploads · Library · Summaries
- **Reference** (opzoeken) — Export formats (+6 formaten) · Accuracy and languages · Limits
- **Account** — Credits · Billing and invoices · Settings

URL's weerspiegelen de categorie: `/docs/quickstart`, `/docs/guides/*`, `/docs/reference/*`,
`/docs/account/*`, plus `/docs/how-indxr-works` (map werd één pagina). Twee nieuwe pagina's:
`guides/single-video` en `guides/uploads`.

**Redirects tot twee regels teruggebracht:** alle redirects uit eigen herstructureringen zijn
verwijderd. Alleen de cross-host-regel (`/account/credits` → app-account) en `/faq → /docs/faq`
(korte URL die mensen intypen) blijven. Interne links wijzen direct naar de echte route; er zijn
géén redirects toegevoegd voor deze verhuizing.

**Schrijfstijl per categorie** vastgelegd in writing-standard §C11b: elke pagina opent toegankelijk
(eerste zin = wat het is in gewone taal, dan 2–4 zinnen wanneer/waarom, dan pas details); guides
beschrijven wat de lezer doet in volgorde (genummerde stappen), reference beschrijft wat iets is
(velden/waarden/grenzen) mét dezelfde opwarming.

## Rationale

- **Intentie-indeling bedient de lezer.** Diátaxis scheidt tutorials/how-to (doen) van reference
  (opzoeken) omdat die fundamenteel verschillende leesmodi zijn. Een taakgerichte lezer wil stappen;
  een opzoeker wil een tabel. Eén onderwerp-map dwingt beide in dezelfde vorm.
- **Twee ontbrekende kernacties toegevoegd** (single-video, uploads) omdat ze de eerste dingen zijn
  die een gebruiker doet en er geen doelpagina voor was.
- **Redirect-ballast weg kan veilig** omdat er geen externe bron naar de oude paden linkt (pre-launch,
  geen Search Console, geen backlinks). De 2026-07-23-les (redirect-graaf altijd als geheel herzien)
  blijft gelden — hier is de veiligste vorm van "geen ketens" simpelweg geen redirects.

## Consequenties

- Redirects-tabel bevat exact twee regels; geen enkele oude docs-URL blijft bereikbaar (bewust — ze
  waren nooit publiek).
- Elke interne verwijzing (breadcrumbs, RelatedTopicsList, hub, sitemap.ts, footer, inline links,
  JSON-LD `url:`) wijst naar de nieuwe route; geverifieerd met repo-grep + live crawl.
- Bestaande spec-pagina's kregen een toegankelijker opening (schrijfstijl §C11b); de export-formats-
  hub is herschreven van tabel-met-"Notes" naar per-formaat een alinea (wat/wanneer/valkuil) + tabel.
- `principles.md §6`, `sitemap.md`, `content-sitemap.md`, `docs-page-contract.md` bijgewerkt; ADR-074
  blijft als voorganger staan (deze ADR verfijnt de indeling, niet de paginaset).

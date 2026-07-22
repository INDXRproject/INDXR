# Beslissing 074: Docs-structuur — vier categorieën in gebruiksvolgorde

**Status:** Geaccepteerd  
**Datum:** 2026-07-22  
**Gerelateerde code:** `apps/marketing/src/lib/docs-config.ts`, `apps/marketing/src/app/docs/**`, `apps/marketing/src/app/sitemap.ts`, `apps/marketing/next.config.ts`, `apps/marketing/src/components/docs/{DocsCategorySection,FeaturedDocsGrid}.tsx`, `apps/marketing/src/app/articles/page.tsx`

## Context

De docs-categorieën uit ADR-072/073 ("Getting started / How INDXR works / Account & data") volgden
geen logica en misten pagina's voor echte gebruikersvragen (playlists, bibliotheek, instellingen,
billing los van credits). De hub en `/articles` waren kale linklijsten, onbruikbaar zonder
voorkennis. `data-handling` dupliceerde `/privacy`.

## Beslissing

Vier categorieën die de **gebruiksvolgorde** volgen:

- **Start here** — Quickstart · FAQ
- **Using INDXR** — Overview · Accuracy and languages · Playlists* · Your library* · Summaries
- **Exports** — Export formats (hub) · TXT · Markdown · CSV · SRT · VTT · JSON & RAG JSON
- **Account** — Credits* · Billing and invoices* · Settings* · Limits

(* = nieuw of gesplitst.)

Concreet:
- **Nieuw (skeleton):** `/docs/using-indxr/playlists`, `/docs/using-indxr/your-library`,
  `/docs/account/settings` — breadcrumb + H1 + `DefinitionLeadOpening` + `RelatedTopicsList`; copy
  volgt in de schrijfronde.
- **Gesplitst:** `credits-and-billing` → `/docs/account/credits` (kosten, reserve-model, refunds) +
  `/docs/account/billing` (kopen, facturen, VAT-scope). Bestaande tekst verplaatst, niet herschreven.
- **Verwijderd:** `data-handling` → 308 naar `/privacy`; één korte FAQ-vraag ("What happens to my
  audio and transcripts?") met link naar `/privacy` vervangt de vindbaarheid.
- **RAG-presets:** de JSON-pagina documenteert de instelbare chunkgrootte — **30/60/90/120s,
  standaard 60** (uit de code: `RagExportView.tsx`/`DeveloperExportsCard.tsx` `CHUNK_OPTIONS`), niet
  de eerder aangenomen 30/60/120.
- **Overzichtspagina's:** `/docs`-hub kreeg de header-offset-fix (`pt-16`) en één regel uitleg per
  pagina; `/articles` kreeg per artikel één regel uit de eigen metadata-description.

**URL-stabiliteit:** bestaande pagina's (overview, accuracy, summaries, limits, export-formats/\*)
houden hun URL. De sidebar-categorie ≠ URL-prefix — de categorie groepeert, de URL blijft waar hij
was. Alleen split/nieuw/verwijderd verandert van pad. Dit minimaliseert redirect-churn (les
2026-07-23: elke herstructurering die URL's verplaatst moet de hele redirect-graaf herzien).

## Rationale

- Gebruiksvolgorde is de natuurlijke leesvolgorde: eerst starten, dan gebruiken, dan exporteren, dan
  account-zaken.
- Credits (wat kost wat) en Billing (kopen/facturen) zijn verschillende vragen op verschillende
  momenten → aparte pagina's.
- `data-handling` was een placeholder-dubbeling; `/privacy` beantwoordt de vraag al in gewone taal.
- URL-stabiliteit boven cosmetische padconsistentie: zes bestaande export-URL's verplaatsen zou ~21
  bestaande redirects moeten herrichten (ketenrisico) zonder gebruikerswaarde.

## Consequenties

- Twee nieuwe 308's (`credits-and-billing` → Credits, `data-handling` → `/privacy`); drie bestaande
  credits-redirects her-getarget naar `/docs/account/credits` en `/docs/privacy-handling` → `/privacy`
  (geen 2-hop-ketens). Redirect-graaf blijft: 0 loops, 0 ketens >1 hop.
- `principles.md §6` gemarkeerd als vervangen; `sitemap.md` bijgewerkt; `INDXR-SITEMAP.md` en
  `sitemap-audit-2026-05.md` gearchiveerd.
- Nieuwe skeleton-pagina's dragen nog geen finale copy — zichtbaar maar minimaal tot de schrijfronde.
- `writing-standard §C` uitgebreid: answer-first per H2-sectie, specifieke koppen, sidebar-label-
  conventie, regelbreedte `max-w-2xl` definitief.

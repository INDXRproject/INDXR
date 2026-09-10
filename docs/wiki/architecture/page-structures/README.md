# Page structures

Centrale documentatie voor de structuur, componenten, en beslissingen per page-type.
Bron van waarheid voor wat er op elke pagina staat — separaat van de implementatie zelf.

## Batch 1 — Marketing + free tool + pricing + reference docs

- [homepage.md](homepage.md) — `/`
- [free-tool.md](free-tool.md) — `/transcribe`
- [pricing.md](pricing.md) — `/pricing`
- [docs-hub.md](docs-hub.md) — `/docs` (hub)
- [reference-doc.md](reference-doc.md) — reference doc template
- [tutorial-doc.md](tutorial-doc.md) — tutorial doc template

## App (dashboard)

- [dashboard-transcribe.md](dashboard-transcribe.md) — `/dashboard/transcribe` (app-variant van de Transcribe-tool, ADR-079)

## Layout-conventies (marketing shell)

Vastgelegd 2026-09-10 na een layout-fix op de standalone contentpagina's.

- **Header** (`packages/shared/src/components/Header.tsx`) is `position: fixed`, hoogte `h-16` (4rem = 64px).
  Omdat hij out-of-flow is, moet elke pagina zelf top-ruimte reserveren of hij verdwijnt onder de header.
- **Sticky footer:** de root-`<body>` (`apps/marketing/src/app/layout.tsx`) is `min-h-screen flex flex-col`
  en `<main>` heeft `flex-1`. Zo staat de footer altijd onderaan, ook op korte pagina's. Vóór 2026-09-10
  was `flex-1` inert (body was geen flex-column) → op korte pagina's (bv. About) zweefde de footer omhoog.
- **Top-spacing standalone contentpagina's** (About, Compare/`/alternatives/*`, Privacy, Terms, Contact):
  `pt-28` (7rem = 112px) op de pagina-container. Dat = 64px header-clearance + 48px lucht, zodat de eerste
  content op 112px vanaf de top staat — gelijk aan `/articles` en `/pricing` (die via PageHeader/Hero al
  op ~112px zaten). NIET `py-16` gebruiken: 64px == exact de headerhoogte → H1 plakt tegen de navbar.
- **Docs** clearen de header apart in `DocsShell` (`pt-16` + eigen inner-padding); **artikelen** via de
  hero in `ArticleTemplate`. Die shells zijn hun eigen bron — niet nog eens een globale offset opleggen.

## Batch 2-4 — volgt later

Wordt aangevuld naarmate batches afgerond zijn.

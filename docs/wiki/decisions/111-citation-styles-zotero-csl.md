# Beslissing 111: Citatiestijlen + CSL-JSON als bron (Zotero fase 1)

**Status:** Geaccepteerd
**Datum:** 2026-11-13
**Gerelateerde code:** `packages/shared/src/lib/{citation,citationStyles,citekey,csl-styles}.ts`, `backend/{citation,mcp_server}.py`, `backend/csl_styles/`, `apps/app/src/app/api/{transcripts/[id]/citation,collections/[id]/citation,account/citation-style}/route.ts`, `apps/app/src/components/library/SourceCard.tsx`, `packages/shared/src/utils/formatTranscript.ts`, `supabase/migrations/20261113222514_profiles_citation_style.sql`

## Context

Tot nu toe had INDXR precies één citatievorm: een hand-geschreven APA-7-regel (`buildCitation` in
`SourceCard.tsx`, met een losse Python-poort in `mcp_server.py`). Geen BibTeX/RIS/CSL-JSON (grep
= 0 vóór deze beslissing). Onderzoekers/studenten die in Zotero werken willen MLA/Chicago/Harvard
naast APA, en een manier om een bron met één klik in Zotero te krijgen (fase 2, geblokkeerd op een
Zotero-OAuth-app-registratie door Khidr — zie "Vervolg").

## Beslissing

- **CSL-JSON is de ene bron van waarheid** per transcript (`buildCslJson()` in
  `packages/shared/src/lib/citation.ts`, Python-poort `citation.py::build_csl_json()`). YouTube-
  bron (`video_id` aanwezig) → CSL-type `motion_picture` (Zotero "Video Recording"); upload (geen
  `video_id`) → CSL-type `song` (Zotero "Audio Recording" — CSL heeft geen generieke
  "recording"-type, en `song` is het dichtstbijzijnde dat de roadmap zelf noemt).
- **citeproc-js (frontend) / citeproc-py (backend) renderen de ECHTE officiële CSL-stijlen** —
  niet een eigen imitatie per stijl. De vier `.csl`-bestanden zijn 1-op-1 kopieën van
  `citation-style-language/styles` (GitHub), gekozen op exacte editie:
  - APA 7th edition → `apa.csl`
  - MLA Handbook 9th edition (in-text citations) → `mla.csl`
  - Chicago Manual of Style 18th edition (author-date) → `chicago.csl`
  - Cite Them Right 12th edition (author-date/Harvard) → `harvard.csl`

  Plus `locales-en-US.xml` (van `citation-style-language/locales`). Omdat de backend-Docker-build
  alleen `backend/` als context heeft (geen toegang tot `packages/shared/`), staat een tweede kopie
  in `backend/csl_styles/` — bewust duplicatie, geen symlink (Docker COPY volgt geen symlinks naar
  buiten de build-context).
- **De CSL/locale-XML is geïnlined als TS-stringconstanten** (`csl-styles/data.ts`, eenmalig
  gegenereerd uit de `.csl`/`.xml`-originelen) in plaats van via `fs.readFileSync` op runtime
  gelezen — anders moet Next.js' `outputFileTracingIncludes` deze niet-geïmporteerde bestanden
  expliciet meenemen in de serverless-bundel, en dat is makkelijk te vergeten bij een toekomstige
  wijziging. Nadeel: ~340KB aan stringdata in de module; aanvaardbaar omdat de module alleen
  server-side draait (zie volgende punt).
- **`citation.ts` (citeproc-js + CSL-data, ~340KB) is server-only.** Een losse, piepkleine sibling
  `citationStyles.ts` (alleen het `CitationStyle`-type + de 4-stijlenlijst) en `citekey.ts` (pure
  stringlogica, geen citeproc) zijn WEL client-safe — `SourceCard.tsx` (de stijl-dropdown) en
  `formatTranscript.ts` (citekey in de markdown-frontmatter, draait client-side bij export)
  importeren alleen die twee. Geverifieerd: `grep -r "citeproc_commonjs\|APA Style 7th"
  apps/app/.next/static/chunks/` geeft 0 hits na een productie-build — de zware module lekt niet
  naar de client-bundel.
- **`SourceCard` haalt de gerenderde citatie op via een API-route** (`GET
  /api/transcripts/[id]/citation?style=`), niet client-side — dat is precies waarom de
  server/client-scheiding hierboven nodig was. Een instant, ongewijzigde `buildCitation()`-fallback
  (de oude hand-geschreven APA-regel) blijft als eerste render tonen tot de citeproc-respons
  binnen is, zodat het Cite-vak nooit leeg is.
- **Stijlkeuze onthouden per account**: `profiles.citation_style` (migratie
  `20261113222514`, CHECK-constraint net als `rag_chunk_size`), bijgewerkt via `PATCH
  /api/account/citation-style`.
- **Exports**: `.ris` en `.bib` (BibLaTeX `@video`/`@audio` — officiële BibLaTeX-entry-types sinds
  versie 3.7, begrepen door Pandoc en de Obsidian Citations-plugin; niet `@misc`, dat het
  type-signaal weggooit) en CSL-JSON, per transcript (`/api/transcripts/[id]/citation?format=`) en
  per collectie (`/api/collections/[id]/citation?format=`, één bestand met alle transcripten,
  citekeys gedisambigueerd bij botsing).
- **Markdown-export krijgt een `citekey`-veld** in de YAML-frontmatter (`buildCitekey()` in
  `citekey.ts`, `kanaaljaartitelwoord`, deterministisch uit titel/kanaal/datum — geen opzoeklaag
  nodig voor `[@citekey]` in Obsidian/Pandoc).
- **Zotero Connector-metatags** op de transcriptpagina (`generateMetadata()` in
  `dashboard/library/[id]/page.tsx`): `citation_title`, `citation_author`,
  `citation_online_date`, `citation_public_url` — Zotero's "Exposing your metadata"-schema, leest
  deze rechtstreeks uit de `<head>` van een ingelogde pagina, geen publieke indexering nodig.
- **MCP `get_source` kreeg een optionele `style`-parameter** (default `apa`); het bestaande
  `citation_apa7`-veld blijft (nu via citeproc-py, niet de oude hand-poort) voor bestaande callers,
  een nieuw `citation`-veld geeft de gevraagde stijl.

## Rationale

citeproc-js/citeproc-py tegen de ECHTE CSL-bestanden is strikt beter dan zelf vier stijlen
imiteren: de output is per definitie "zoals de officiële stijlgids het wil", en een toekomstige
CSL-stijl-update (van upstream) is een bestandsvervanging, geen code-herschrijving. De
server/client-scheiding (drie losse bestanden i.p.v. één) is de directe consequentie van
citeproc-js' omvang — zonder die scheiding zou elke pagina met een Cite-knop 340KB extra JS naar de
browser sturen voor een functie die évengoed server-side kan.

## Consequenties

- **APA-output verandert zichtbaar** t.o.v. de oude hand-regel: `[Video]` → `[Video recording]`
  (CSL's generieke term voor `motion_picture`, de oude tekst was zelf ook maar een keuze — geen
  officiële APA-bron zegt letterlijk "[Video]"). Dit is bewust geen regressie: de nieuwe tekst komt
  uit de daadwerkelijke APA-7-CSL-stijl, de oude kwam uit een eigen aanname.
- citeproc-js (frontend) en citeproc-py (backend) zijn TWEE verschillende engines die dezelfde
  officiële `.csl`-bestanden interpreteren — kleine interpunctieverschillen tussen de twee zijn
  normaal (bv. MLA: `?` vs `?.`) en zijn GEEN bug, zolang beide de officiële stijl volgen. De
  gedeelde test (`citation.test.ts` + `test_citation.py`) checkt daarom alleen APA exact (de
  `get_source`-default) en voor de andere drie stijlen alleen "rendert niet-leeg".
- **Niet onafhankelijk verifieerbaar vanuit deze sessie:** de roadmap vroeg om een import in een
  echte Zotero-desktop-app (screenshot) en een Obsidian-vault + Pandoc-rendering van `[@citekey]`
  — beide vereisen een GUI-applicatie die niet beschikbaar is in deze headless Claude
  Code-omgeving. Wat wél geverifieerd is: CSL-JSON-structuur (`type`/`author`/`issued`/`URL`/
  `publisher` conform de CSL-1.0.2-spec), RIS-syntax (`TY`/`AU`/`TI`/`PY`/`UR`/`ER`-tags conform de
  RIS-spec), BibLaTeX-syntax (`@video{key, ...}` parseert als geldige BibTeX-entry), en dat de
  CSL-rendering overeenkomt met hand-geverifieerde referentiezinnen per stijlgids. Khidr kan de
  Zotero-desktop-/Obsidian-check zelf met een echte export-download doen.
- Fase 2 ("Send to Zotero", Zotero OAuth + Web API v3) is NIET gebouwd in deze ronde — geblokkeerd
  op een besluit van Khidr (welke Zotero-OAuth-app-gegevens hij registreert). Zie
  `docs/wiki/NU.md` → "Ligt bij Khidr".

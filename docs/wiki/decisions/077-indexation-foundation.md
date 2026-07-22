# Beslissing 077: Indexatie-fundament — self-canonicals, robots-crawlerbeleid, artikelbanner

**Status:** Geaccepteerd
**Datum:** 2026-07-23
**Gerelateerde code:** `apps/marketing/src/app/**/page.tsx` (canonicals), `apps/marketing/public/robots.txt`, `apps/marketing/src/components/content/ArticleBanner.tsx` + de 3 content-templates

## Context

Vóór launch moest het indexatie-fundament staan: één canonieke domeinvorm, self-referencing
canonicals, een bewust crawlerbeleid, en een echte 404. Daarnaast verschilde de visuele kop van
artikelen per pagina. De site was nog nooit bij een zoekmachine ingediend, dus dit is het moment
om het goed te zetten vóór indexering begint.

## Beslissing

1. **Self-referencing canonical op elke publieke pagina.** `metadataBase = https://indxr.ai` (de
   canonieke apex-vorm); elke pagina zet `alternates.canonical` op zijn eigen route. Bron van de
   publieke routeset = `sitemap.ts`. Client-pagina's (contact/login/signup) dragen hun canonical
   via een minimale `layout.tsx`.
2. **robots.txt met expliciet crawlerbeleid.** AI-fetch/search-crawlers (OAI-SearchBot,
   ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User) **toegestaan** —
   geblokkeerd = onzichtbaar in die assistent. AI-trainings-crawlers (GPTBot, ClaudeBot,
   anthropic-ai, Google-Extended, CCBot) **toegestaan bij bewuste keuze** (publieke content;
   aanwezigheid in trainingscorpora helpt assistenten INDXR correct te beschrijven). Meta-ExternalAgent
   blijft geblokkeerd. Elke keuze staat als comment in het bestand.
3. **Artikelbanner als SVG-component**, niet als afbeeldingsbestand. Rustig honeycomb-veld +
   zachte hoek-wash + titel als tekst, geen logo. Per-categorie-accent uit de OKLCH-tokens
   (Troubleshooting `--warning`, Export Formats `--accent`, Workflows `--success`, Deep Dives
   `--violet`) → licht/donker automatisch.

## Rationale

- **Wrong canonical > geen canonical:** een globale canonical in de root-layout zou elke pagina naar
  de homepage laten wijzen (Next.js resolvet een relatieve canonical tegen `metadataBase`, niet tegen
  het pad). Daarom per-pagina, gevoed uit de sitemap-routeset — deterministisch en juist.
- **Crawlerbeleid is een keuze, geen default:** het `Claude-SearchBot`-token stond fout gespeld
  (`ClaudeSearchBot`) en viel door naar `*`; nu correct. CCBot stond op Disallow terwijl het beleid
  "training toestaan" is — omgezet, met de afweging in een comment zodat het herzienbaar blijft.
- **Banner als SVG uit tokens** houdt licht/donker gratis correct en vermijdt losse assetbestanden
  die uiteenlopen; per-categorie-accent geeft geleding zonder nieuwe kleuren (Geen Israf).

## Consequenties

- 49 sitemap-routes geven live 200, geen redirect-hops; canonical + robots + 404 live geverifieerd.
- Nieuwe publieke pagina's moeten hun eigen `alternates.canonical` zetten (patroon staat er nu).
- Nieuwe AI-crawler-tokens moeten bewust aan robots.txt toegevoegd worden; het bestand documenteert
  de policy.
- De banner is opt-in per template via een `category`-prop; zonder prop valt hij terug op de kale H1
  (geen regressie).

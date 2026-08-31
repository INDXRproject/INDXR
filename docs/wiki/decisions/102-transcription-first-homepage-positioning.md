# Beslissing 102: Homepage-positionering transcriptie-first (weg van "YouTube Transcript Extractor")

**Status:** Geaccepteerd
**Datum:** 2026-08-31
**Gerelateerde code:** `apps/marketing/src/app/layout.tsx` (default title/description), `apps/marketing/src/app/page.tsx` (title tag, meta description, H1, hero sub, Organization + SoftwareApplication JSON-LD), `docs/wiki/business/positioning.md`

## Context

De Google-SERP toonde voor de homepage **"INDXR.AI - YouTube Transcript Extractor"** — de site-brede
default-title uit `layout.tsx`, want de homepage zette geen eigen title. Drie problemen:

1. **De YouTube-transcript-kop is een gratis-markt.** Keyword-meting (zie
   [keyword-demand-2026-08.md](../business/keyword-demand-2026-08.md)): `youtube transcript` heeft
   competition-index 3–9 en de hele top-10 heeft "Free" in de title. Op die term staan wij het product
   gratis weg te geven; het is geen commercieel anker.
2. **Message-mismatch met de live Ads-campagne.** De campagne ([google-ads-campagne.md](../business/google-ads-campagne.md),
   [ADR-101](101-optimise-on-activation-not-purchase.md)) biedt op **audio/video-bestandsformaat-upload-termen**
   en landt op `/articles/audio-to-text` + `/articles/video-to-text`. Landing page experience telt mee in
   Ad Rank; een homepage die "YouTube transcript extractor" uitstraalt terwijl de advertentie "transcribe
   your M4A/WAV/MKV" belooft, verlaagt de kwaliteitsscore en kost CPC.
3. **Merkverwarring in Google's AI Overview.** Google verwarde het merk met het niet-gerelateerde
   open-source project `github.com/bahdotsh/indxr`. Er was geen Organization/SoftwareApplication-schema op
   de homepage om te zeggen wie/wat "INDXR.AI" is.

## Beslissing

De **homepage draagt het betaalde transcriptieproduct** (audio + video + YouTube), niet de
YouTube-transcript-extractor-framing.

1. **Title tag** (`page.tsx`, override op de layout-default): `INDXR.AI — Accurate transcripts from audio,
   video and YouTube`. De site-brede default in `layout.tsx` is meegetrokken zodat geen enkele pagina nog
   op "YouTube Transcript Extractor" terugvalt.
2. **Meta description / H1 / hero sub:** transcriptie-first (upload een opname of plak een link → schoon
   transcript met sprekerlabels, klaar om te bewerken/doorzoeken/exporteren).
3. **Gratis caption-extractie blijft op de pagina**, maar **niet als primaire belofte** — verplaatst van de
   "Try it"-sectie (hoog) naar de "What it costs"-sectie (lager). Geen nieuwe secties, geen layout-refactor.
4. **Structured data:** één **Organization**- én één **SoftwareApplication**-schema (twee verschillende
   `@type`s, geen dubbele van hetzelfde type), beide `name: "INDXR.AI"` met een transcriptie-beschrijving,
   tegen de AI-Overview-verwarring.
5. **`/youtube-*`-artikelen blijven bestaan** (live onder `/articles/youtube-*`) als long-tail-funnel; ze
   dragen **niet** de merkpositionering.

## Rationale

- **Message match verlaagt CPC.** De homepage en de campagne-landingspagina's spreken nu dezelfde taal
  (accurate transcripten uit uploads), wat de landing page experience en daarmee Ad Rank ten goede komt.
- **Niet ankeren op een gratis-markt.** De YouTube-transcript-kop levert klikken die we sowieso niet willen
  kopen (gratis-intentie) en die het merk verkeerd definiëren. Long-tail YouTube-intentie wordt bediend
  door de artikelen, niet door de merk-title.
- **Schema is de goedkoopste correctie van de AI-Overview-verwarring** — een expliciet
  Organization/SoftwareApplication-signaal met de juiste naam en beschrijving.

## Consequenties

- De `/youtube-*`-routes en `/articles/*` blijven **ongewijzigd** — ze targeten hun eigen zoekintentie
  correct en vallen buiten deze taak.
- Pricing, credit-logica en checkout zijn **niet geraakt** (geen financiële route).
- **Vervolgtaak (apart):** de final URLs van de live campagne (`/articles/audio-to-text` +
  `/articles/video-to-text`) moeten hetzelfde transcriptie-first-anker gaan dragen als de homepage —
  dezelfde message-match-logica. Nog niet gedaan in deze taak.
- Merknaam-conventie bevestigd: op user-facing marketing-pagina's altijd **"INDXR.AI"** of **"INDXR"**,
  nooit kleine-letter "indxr" als losse merknaam.

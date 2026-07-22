# Docs page-contract — /docs

**Opgesteld:** 2026-07-22 · **Aard:** read-only denkwerk (niets geïmplementeerd) · **Doel:** één paginacontract voor `/docs`, zodat de schrijfronde de pagina's in één keer kan schrijven zonder overlap. Elke pagina krijgt een scherpe grens: wat ze **bezit**, wat ze **niet herhaalt**, en waar ze **naartoe linkt**.

**Grondslag:** [business/content-sitemap.md](../business/content-sitemap.md) (rolverdeling docs↔artikel + groei-regel), [content/product-truth.md](./product-truth.md) (code-geverifieerde feiten), [architecture/page-structures/reference-doc.md](../architecture/page-structures/reference-doc.md) + [docs-hub.md](../architecture/page-structures/docs-hub.md).

**Kernregel (uit de sitemap):** DOCS-pagina = **kale referentie-spec** (exacte velden, één codevoorbeeld, kort). ARTIKEL = **het verhaal + use-case = de bron**; de docs-spec wordt eruit gedestilleerd, niet andersom. Eigen pagina **alleen** bij (a) aparte zoekintentie (SEO) óf (b) aparte gebruikerstaak (docs). Anders: sectie op een bestaande pagina.

---

## DEEL 1 — Huidige staat (routes winnen van de sitemap)

18 route-bestanden onder `apps/marketing/src/app/docs/**` (`page.tsx`), sidebar uit `apps/marketing/src/lib/docs-config.ts`. Status uit de code (placeholder = bevat `[Placeholder — content coming soon]` / `Guides coming soon` / `[KHIDR: …]`).

| # | Route | Status (code) | Artikel-tegenhanger |
|---|-------|---------------|---------------------|
| 1 | `/docs` (hub) | live | — |
| 2 | `/docs/getting-started` | live | — |
| 3 | `/docs/how-indxr-works/overview` | **live (ADR-072)** | — |
| 4 | `/docs/how-indxr-works/accuracy` ("Accuracy and languages") | live (skeleton+merge, ADR-072) | `youtube-transcript-non-english` (taal-routing) |
| 5 | `/docs/how-indxr-works/export-formats` (hub) | placeholder | `/articles` (categorie Export Formats) |
| 6 | `…/export-formats/txt` | placeholder | `youtube-to-text` |
| 7 | `…/export-formats/markdown` | placeholder | `youtube-transcript-markdown` (+ `-obsidian`) |
| 8 | `…/export-formats/csv` | placeholder | `youtube-transcript-csv` |
| 9 | `…/export-formats/srt` | placeholder | `youtube-srt-download` |
| 10 | `…/export-formats/vtt` | placeholder | `youtube-srt-download` (gedeeld) |
| 11 | `…/export-formats/json` | placeholder | `youtube-transcript-json` + `youtube-transcript-for-rag` |
| 12 | `…/summaries` | live (skeleton, ADR-072) | — (geen) |
| 13 | `…/limits` | placeholder (thin) | — (geen) |
| 14 | `/docs/account-and-data/credits-and-billing` | live (2 `KHIDR`-stubs) | `/pricing` (niet /articles) |
| 15 | `/docs/account-and-data/data-handling` | placeholder | — (privacy-facts) |
| 16 | `/docs/help/how-to` | placeholder ("Guides coming soon") | `/articles` (Workflows) |
| 17 | `/docs/help/troubleshooting` | placeholder (bundelhub) | 5 Troubleshooting-artikelen |
| 18 | `/docs/help/faq` | **live** (volle FAQ, 4 built-in labels) | — |

**Afwijkingen sitemap ↔ werkelijkheid (routes winnen):**
- De sitemap-boom (regel 32-37) noemt nog de **oude 15-pagina-structuur** (`credits · api · languages · accuracy/{auto-captions,ai-transcription}`). Die routes bestaan **niet meer** (ADR-072, 308-redirects in `next.config.ts:26-30`). De sitemap-**tabel** (regel 85-101) is wél al bijgewerkt; de boom bovenin niet. → boom in content-sitemap corrigeren.
- **Redirect-ketens (pre-existing, buiten scope, melden):** `next.config.ts:62-64` bevat oude bare-slug-redirects, o.a. `/docs/accuracy/auto-captions → /docs/how-indxr-works/accuracy/auto-captions` — dat **doel is zelf verwijderd** en 308't dóór naar `…/accuracy`. Twee-staps-redirect; opruimen bij de schrijfronde (rechtstreeks naar het eindpunt laten wijzen).
- `credits-and-billing` staat in de sitemap als "live (2 stubs)"; de placeholder-grep markeert 'm als placeholder door de `KHIDR`-stubs. Beide kloppen: romp is er, twee secties zijn stub.

---

## DEEL 2 — Toets elke pagina aan de eigen regel

Regel: **eigen pagina alleen bij aparte zoekintentie (SEO) óf aparte gebruikerstaak (docs).** Oordeel per pagina met de gevonden overlap.

| Pagina | Oordeel | Onderbouwing (overlap, niet smaak) |
|--------|---------|-------------------------------------|
| `/docs` (hub) | **HOUDEN** | Navigatie/discovery; geen inhoudsclaims. CollectionPage. |
| `getting-started` | **HOUDEN** | Aparte taak: "eerste transcript in 3 min" (tutorial-flow). Geen andere pagina bezit de stap-voor-stap. |
| `overview` | **HOUDEN** | Aparte taak: de kaart ("hoe werkt dit"). Bezit het captions-vs-transcriptie-verhaal; geen format/credit-detail. |
| `accuracy` | **HOUDEN** | Aparte taak: "hoe accuraat / welke talen". Docs-only; het artikel `non-english` draagt alleen het taal-routing-verhaal, niet de WER-tabel. |
| `export-formats` (hub) | **HOUDEN als pure index** | Mag géén derde inhoudsplek worden: alleen overzichtstabel + doorverwijzing (rolverdeling regel 196/210). Zonder die discipline dupliceert het de 6 spec-pagina's. |
| `export-formats/{txt,markdown,csv,srt,vtt,json}` | **HOUDEN (6×)** | Elk format = **aparte spec** (andere velden/timestamp-vorm) én aparte zoekintentie ("srt format", "csv columns"). SRT vs VTT zijn genoeg verschillend (`,mmm` vs `.mmm`, `WEBVTT`-header) om apart te blijven; ze **delen** wél het bron-artikel. Voorwaarde: elke pagina blijft kaal (velden + 1 voorbeeld), anders → sectie op de hub. |
| `summaries` | **HOUDEN** | Aparte taak (3-credit summary). Nieuw, geen andere houder. |
| `limits` | **HOUDEN** | Aparte taak: "wat zijn de grenzen". Absorbeert `api` al (ADR-072). Geen artikel bezit de harde getallen. |
| `credits-and-billing` | **HOUDEN** | Aparte taak: billing-detail. Draagt het credit-mechanisme; `/pricing` draagt de pakketten (geen dubbeling: prijzen renderen uit `pricing.ts` op beide). |
| `data-handling` | **HOUDEN** | Aparte taak: retentie/dataverwerking. Bron = `privacy-facts.md` + code (24u audio-delete, EU-host). Overlap met `/privacy` = juridische tekst daar, feitenspec hier. |
| **`help/how-to`** | **SCHRAPPEN → 308 `/articles`** ✓ | Dupliceert de **Workflows**-categorie op `/articles` (bulk/playlist/audio-to-text/obsidian). "Guides coming soon" = leeg. Geen unieke inhoud. |
| **`help/troubleshooting`** | **SCHRAPPEN → 308 `/articles`** ✓ | Pure index; de 5 Troubleshooting-artikelen dragen de inhoud en de `/articles`-index categoriseert ze al. Hub = redundant met `/articles`. |
| **`help/faq`** | **VERPLAATSEN → `/docs/faq`** ✓ | Map met één pagina is overbodig. Nieuwe rol: kort antwoord + link naar de doc die het onderwerp bezit — geen unieke informatie. |

**Uitvoerings-toets op de reeds-beslist-lijst (afwijkingen/nuances, zie ook eindrapport):**
1. **`troubleshooting` schrappen** raakt twee passages in `content-sitemap.md` die een troubleshooting-**hub** veronderstellen: de rolverdeling (regel 211) en de groei-regel (regel 246: "doorlink vanuit de troubleshooting-hub"). Die doorlink-target moet **`/articles`** worden. → content-sitemap bijwerken in dezelfde ronde.
2. **`faq` is nú volledig gebouwd** (echte Q&A). "Verplaatsen" is niet enkel een route-wijziging: de **rolwijziging** (volle FAQ → korte antwoorden + link) is een **herverdeling van inhoud** naar de bezittende docs. Risico: unieke antwoorden verdwijnen. Twee antwoorden hebben **nu geen andere houder** en moeten er een krijgen vóór de FAQ afslankt: (a) **"Waarom kan ik niet kopen vanuit mijn land" (VAT-scope)** → onderbrengen bij `credits-and-billing`; (b) **"Waarom soms bijna instant" (dedup)** → onderbrengen bij `limits` of `overview`. Het taal-Q&A ("verkeerde caption-taal") wordt door **`accuracy`** bezeten.
3. **De hele `Help`-sectie in de sidebar verdwijnt** (how-to+troubleshooting weg, faq eruit) → `docs-config.ts` herstructureren: `faq` wordt top-level (of onder "Getting started"/eigen losse entry). 308 nodig: `/docs/help/faq → /docs/faq`, plus `/docs/help/how-to` en `/docs/help/troubleshooting → /articles`.

Geen fundamentele **oneens** met de drie beslissingen — ze snijden hout; de bovenstaande 3 zijn uitvoerings-consequenties.

**Eindset na DEEL 2 = 16 routes:** hub · getting-started · overview · accuracy · export-formats(+txt/markdown/csv/srt/vtt/json) · summaries · limits · credits-and-billing · data-handling · faq (op `/docs/faq`).

---

## DEEL 3 — Het paginacontract

Per pagina: **BEZIT** · **HERHAALT NIET** · **LINKT** · **BRON** · **FIGUUR-SLOTS** (plek + bijschrift + alt) · **SCHEMA** · **BRONMATERIAAL** · **type** (SPEC = uit code, CC schrijft · ARGUMENT = positie/vergelijking, Claude schrijft).

### /docs (hub) — *structureel*
- **BEZIT:** navigatie naar de 4 categorieën; 4 featured cards; één intro-zin per categorie.
- **HERHAALT NIET:** geen productclaims/credits/formaten — die staan op de doelpagina's.
- **LINKT:** alle docs-secties; top-navbar draagt `/articles`.
- **BRON:** eigen code.
- **FIGUUR-SLOTS:** geen (navigatie).
- **SCHEMA:** `CollectionPage`.
- **BRONMATERIAAL:** `docs-config.ts`, `FeaturedDocsGrid.tsx`, `DocsCategorySection.tsx`. **NB:** `FeaturedDocsGrid` verwees eerder naar het verwijderde `…/credits` — is al gecorrigeerd naar `credits-and-billing` (ADR-072); bij faq-move ook de card/category-lijst nalopen.
- **Type:** structureel.

### /docs/getting-started
- **BEZIT:** de exacte eerste-keer-flow (plak URL → transcript → export); anoniem vs account; "eerste transcript in ~3 min".
- **HERHAALT NIET:** format-details (→ export-formats), credit-tarieven (→ credits-and-billing), accuraatheid (→ accuracy).
- **LINKT:** `overview` (waarom/hoe), `export-formats` (wat eruit komt), `credits-and-billing` (kosten).
- **BRON:** eigen code.
- **FIGUUR-SLOTS:** (1) *na stap 1* — screenshot van de plak-URL-tab met een teruggekomen transcript. **Bijschrift:** "Paste a YouTube URL and the transcript appears — no account needed for captioned videos." **Alt:** "INDXR transcribe tab with a YouTube URL pasted and the resulting transcript shown below." (2) *bij de export-stap* — het export-dropdown-menu. **Bijschrift:** "Export the transcript in any of seven formats." **Alt:** "Export dropdown listing TXT, Markdown, CSV, SRT, VTT, JSON and RAG JSON."
- **SCHEMA:** `HowTo` (stappen).
- **BRONMATERIAAL:** free-tool-flow `packages/shared/src/components/free-tool/{VideoTab,PlaylistTab,AudioTab}.tsx`; anon-gating `packages/shared/src/components/TranscriptCard.tsx` (`requireAuth`, TXT-vrij). Getallen (welcome 25) uit `pricing.ts` `FREE_TIER`.
- **Type:** SPEC (flow uit de UI-componenten).

### /docs/how-indxr-works/overview — *al geschreven (ADR-072)*
- **BEZIT:** de kaart — captions-vs-transcriptie-keuze, account-verschil, wat-eruit-komt op hoog niveau, library, summaries, credits (één alinea elk).
- **HERHAALT NIET:** exacte format-velden (→ per-format specs), WER/talen (→ accuracy), harde limieten (→ limits), billing-detail (→ credits-and-billing).
- **LINKT:** alle how-indxr-works-siblings (het is de nav-spil).
- **BRON:** eigen code (getallen uit `pricing.ts`/`models.ts`).
- **FIGUUR-SLOTS:** (1) *bij "Captions or transcription"* — side-by-side auto-caption vs AI-transcript van hetzelfde fragment. **Bijschrift:** "Same clip: raw auto-captions (left) versus AI transcription with punctuation and sentences (right)." **Alt:** "Two-column comparison; left shows short unpunctuated caption lines, right shows punctuated sentences."
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** al geschreven; getallen `pricing.ts`, model `models.ts`.
- **Type:** ARGUMENT (positioneert de keuze) — al gedaan.

### /docs/how-indxr-works/accuracy ("Accuracy and languages")
- **BEZIT:** hoe accuraat elke methode is; WER-tier-indeling per taal (≤10/10-25/25-50/>50%); 18 talen (Universal-3.5 Pro) / 99 (Universal-2); captions = bron-afhankelijk.
- **HERHAALT NIET:** het `tlang=en`-verhaal en de per-taal-routing-anekdote (→ artikel `youtube-transcript-non-english`); credit-kosten.
- **LINKT:** artikel `youtube-transcript-non-english` (het taal-verhaal); `overview`; `limits`.
- **BRON:** **extern — AssemblyAI** (WER-tiers + taal-tellingen): https://www.assemblyai.com/docs/supported-languages. Model-naam = eigen code (`models.ts`).
- **FIGUUR-SLOTS:** geen strikt nodig; optioneel een compacte WER-tier-tabel (tekst, geen afbeelding).
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `packages/shared/src/lib/models.ts` (`transcriptionModelName()`, chain); AssemblyAI-docs voor 18/99 + WER. Artikel `non-english` voor het verhaal.
- **Type:** ARGUMENT (interpreteert accuraatheid + vergelijkt methoden) — Claude schrijft.

### /docs/how-indxr-works/export-formats (hub)
- **BEZIT:** overzichtstabel van de 7 formaten (naam · anoniem-of-account · gratis-of-credits · "waarvoor") + doorverwijzing naar de 6 spec-pagina's en de Export-Formats-artikelen.
- **HERHAALT NIET:** de velden/timestamp-vorm per format (→ de spec-pagina's). **Geen derde inhoudsplek.**
- **LINKT:** de 6 format-specs; `/articles` (categorie Export Formats); `credits-and-billing` (RAG-kost).
- **BRON:** eigen code.
- **FIGUUR-SLOTS:** (1) het export-dropdown/-dialoog. **Bijschrift:** "Every transcript exports to these formats from one menu." **Alt:** "Export menu showing the seven output formats."
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `packages/shared/src/utils/formatTranscript.ts` (de 7 formaten), `pricing.ts` `CREDIT_COSTS` (RAG 1/10min), anon-gating `TranscriptCard.tsx`.
- **Type:** SPEC (index uit code).

### /docs/how-indxr-works/export-formats/txt
- **BEZIT:** de twee TXT-varianten (met/zonder timestamps), `[HH:MM:SS]`-vorm, paragraaf-modus, "enige anoniem-beschikbare format".
- **HERHAALT NIET:** waarom-plain-text / no-account-hoek (→ artikel `youtube-to-text`).
- **LINKT:** artikel `youtube-to-text`; hub `export-formats`.
- **BRON:** eigen code.
- **FIGUUR-SLOTS:** (1) TXT-output met vs zonder timestamps naast elkaar. **Bijschrift:** "Plain text, with and without timestamps." **Alt:** "Two text samples; one with [HH:MM:SS] prefixes, one continuous prose."
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `formatTranscript.ts` → `generateTxt` (regel 247), `createParagraphMode` (51), `formatHHMMSS` (42). Artikel `youtube-to-text` (verhaal).
- **Type:** SPEC.

### /docs/how-indxr-works/export-formats/markdown
- **BEZIT:** exacte YAML-frontmatter-keys (titel/URL/datum/duur), timestamps-variant, paragraaf-split-regel (>5s).
- **HERHAALT NIET:** Obsidian/Notion-use-case-verhaal (→ artikelen `youtube-transcript-markdown` + `youtube-transcript-obsidian`).
- **LINKT:** artikel `youtube-transcript-markdown` (+ `-obsidian` als workflow); hub.
- **BRON:** eigen code.
- **FIGUUR-SLOTS:** (1) Markdown-frontmatter + body gerenderd in Obsidian. **Bijschrift:** "Exported Markdown with YAML frontmatter, rendered in Obsidian." **Alt:** "Markdown note showing a YAML frontmatter block above the transcript body in Obsidian."
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `formatTranscript.ts` → `generateMarkdown` (407), `buildYamlFrontmatter` (474). Artikelen markdown/obsidian.
- **Type:** SPEC.

### /docs/how-indxr-works/export-formats/csv
- **BEZIT:** exacte kolomnamen (`segment_index,start,end,duration,text,word_count`), UTF-8 BOM, dat video-metadata NIET in de CSV zit.
- **HERHAALT NIET:** pandas/Sheets/Voyant-use-case (→ artikel `youtube-transcript-csv`).
- **LINKT:** artikel `youtube-transcript-csv`; hub.
- **BRON:** eigen code.
- **FIGUUR-SLOTS:** (1) de CSV geopend in een spreadsheet. **Bijschrift:** "CSV output with one row per segment, opened in a spreadsheet." **Alt:** "Spreadsheet showing columns segment_index, start, end, duration, text, word_count."
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `formatTranscript.ts` → `generateCsv` (202). Artikel `youtube-transcript-csv`.
- **Type:** SPEC.

### /docs/how-indxr-works/export-formats/srt
- **BEZIT:** `HH:MM:SS,mmm`-timestamp, index-nummering, resegmentatie-regel (3–7s, ≤42 chars/regel).
- **HERHAALT NIET:** resegmentatie-verhaal + editor-compatibiliteit (→ artikel `youtube-srt-download`).
- **LINKT:** artikel `youtube-srt-download`; sibling `vtt`; hub.
- **BRON:** eigen code (format) + **extern** voor de regel-lengte-standaard (BBC/Netflix/EBU 3264) — alleen als de pagina die norm noemt.
- **FIGUUR-SLOTS:** (1) SRT-blok. **Bijschrift:** "SRT output: numbered cues with comma-millisecond timestamps." **Alt:** "SRT subtitle file with cue numbers and HH:MM:SS,mmm timestamps."
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `formatTranscript.ts` → `generateSrt` (167), `formatSrtTimestamp` (24), `resegmentTranscript` (92). Artikel `youtube-srt-download`.
- **Type:** SPEC.

### /docs/how-indxr-works/export-formats/vtt
- **BEZIT:** `WEBVTT`-header, `HH:MM:SS.mmm` (punt, niet komma), zelfde resegmentatie.
- **HERHAALT NIET:** het resegmentatie-verhaal (gedeeld met SRT → artikel `youtube-srt-download`).
- **LINKT:** artikel `youtube-srt-download` (dekt SRT **én** VTT); sibling `srt`; hub.
- **BRON:** eigen code.
- **FIGUUR-SLOTS:** (1) VTT-blok met `WEBVTT`-header. **Bijschrift:** "WebVTT output with the WEBVTT header and dot-millisecond timestamps." **Alt:** "VTT file starting with WEBVTT and cues using HH:MM:SS.mmm."
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `formatTranscript.ts` → `generateVtt` (181), `formatVttTimestamp` (33), `resegmentTranscript` (92). Artikel `youtube-srt-download`.
- **Type:** SPEC.

### /docs/how-indxr-works/export-formats/json
- **BEZIT:** twee dingen die alleen hier samenkomen — (a) **standaard-JSON**-schema (segmenten + metadata-wrapper, gratis) en (b) **RAG-JSON**-schema (chunks 90–120s, sentence-snap, `deep_link` per chunk, overlap, 1cr/10min).
- **HERHAALT NIET:** de RAG-pipeline-use-cases + chunking-onderzoek (→ artikelen `youtube-transcript-json`, `youtube-transcript-for-rag`, en de deep-dives `chunk-…-for-rag`/`…-vector-database`).
- **LINKT:** artikelen `youtube-transcript-json` (standaard) + `youtube-transcript-for-rag` (RAG) + de twee deep-dives; `credits-and-billing` (RAG-kost).
- **BRON:** eigen code (schema) + **extern** (vector-DB-namen: LangChain/Pinecone/Chroma/Weaviate/Qdrant) — alleen als merk-compat genoemd wordt.
- **FIGUUR-SLOTS:** (1) een RAG-JSON-chunk-object met velden gemarkeerd. **Bijschrift:** "One RAG JSON chunk: text, time range, token estimate and a deep_link back to the video." **Alt:** "JSON object for a single chunk showing text, start, end, token_count and deep_link fields."
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `formatTranscript.ts` → `buildRagJson` (516), `buildRagChunks` (283); RAG-kost `pricing.ts` `CREDIT_COSTS.RAG_JSON_PER_10MIN`. Artikelen json/for-rag/deep-dives.
- **Type:** SPEC.

### /docs/how-indxr-works/summaries
- **BEZIT:** 3-credit-flat summary (ongeacht lengte), summary-vorm (overzicht + action points), opgeslagen bij het transcript, bewerkbaar met **origineel behouden**.
- **HERHAALT NIET:** algemene credit-uitleg (→ credits-and-billing); accuraatheid (→ accuracy).
- **LINKT:** `credits-and-billing`; `overview`.
- **BRON:** eigen code (model + prijs).
- **FIGUUR-SLOTS:** (1) de AI-Summary-tab met de 3-credit-bevestiging. **Bijschrift:** "Summarize any transcript for a flat 3 credits; the original is kept alongside your edits." **Alt:** "AI Summary tab showing a generated summary with action points and a confirm-3-credits prompt."
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `apps/app/src/components/library/AiSummaryView.tsx` (action_points regel 23, `edited_html`/origineel 27+89, `ai_summary`-persist 95); prijs `pricing.ts` `CREDIT_COSTS.AI_SUMMARY`; model `backend/main.py` `SUMMARY_MODEL_PRIMARY` (gemini-2.5-flash, ADR-068). **Geen artikel** (zie DEEL 4 — gat).
- **Type:** SPEC.

### /docs/how-indxr-works/limits
- **BEZIT:** de harde getallen — AI-transcriptie **≤10 uur**, playlist **≤500/job**, **3** gelijktijdige jobs, upload **500MB** + geaccepteerde formaten, rate limits (anon **10/24u**, gratis **50/1u**), captions **geen duur-cap**, **geen publieke REST API**.
- **HERHAALT NIET:** credit-tarieven (→ credits-and-billing); accuraatheid (→ accuracy).
- **LINKT:** `credits-and-billing`; artikelen `bulk-`/`playlist-` (playlist-cap-context).
- **BRON:** **extern** (AssemblyAI 10u/5GB-plafond) + eigen code (afdwinging).
- **FIGUUR-SLOTS:** geen (tabel van getallen volstaat).
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `backend/main.py` (`MAX_TRANSCRIPTION_SECONDS` r.775, `MAX_PLAYLIST_VIDEOS` r.780, `MAX_CONCURRENT_JOBS` r.769); `packages/shared/src/lib/ratelimit.ts` (anon r.33, free r.34); `backend/audio_utils.py` (`SUPPORTED_FORMATS`, `MAX_FILE_SIZE_MB=500`). Absorbeert het oude `api`-feit (geen REST API).
- **Type:** SPEC.

### /docs/account-and-data/credits-and-billing
- **BEZIT:** hoe credits werken (1cr=1min, caption 0, summary 3, RAG 1/10min, playlist 3-gratis-dan-1), reserve-/refund-mechanisme, **auto-refund bij mislukte AI-operatie**, "nooit verlopen", one-time packages (verwijst naar `/pricing`), **welke landen niet kunnen kopen (VAT-scope)** — nieuw thuis voor het FAQ-antwoord (DEEL 2 nuance).
- **HERHAALT NIET:** de pakket-**kaarten/prijzen** (die bezit `/pricing`; hier alleen mechanisme + link).
- **LINKT:** `/pricing`; `limits`; `summaries`.
- **BRON:** eigen code.
- **FIGUUR-SLOTS:** (1) het credits-saldo + koop-CTA op de billing-pagina. **Bijschrift:** "Your credit balance and top-up options." **Alt:** "Billing page showing the current credit balance and buy-credits buttons." (optioneel)
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `pricing.ts` (`PACKAGES`, `CREDIT_COSTS`, `FREE_TIER`); `backend/credit_manager.py` (`calculate_credit_cost`, reserve/settle/refund). VAT-scope: `docs/wiki/decisions/062-market-scope-and-country-guard.md` + `business/tax-jurisdictions.md`.
- **Type:** SPEC (met 2 huidige `KHIDR`-stubs in te vullen).

### /docs/account-and-data/data-handling
- **BEZIT:** dataverwerking/retentie — **audio verwijderd binnen 24u**, EU-hosting (Supabase eu-west-1), transcripts in library, wat na account-delete achterblijft.
- **HERHAALT NIET:** de juridische GDPR-tekst (→ `/privacy`); dat is beleid, dit is de feitenspec.
- **LINKT:** `/privacy`; `limits`.
- **BRON:** eigen code + `business/privacy-facts.md`.
- **FIGUUR-SLOTS:** geen.
- **SCHEMA:** `TechArticle`.
- **BRONMATERIAAL:** `business/privacy-facts.md` (PostHog-host, delete-cascade-matrix, wat achterblijft); audio-delete-pad in `backend/`. Deels ARGUMENT (privacy-houding) maar overwegend SPEC.
- **Type:** SPEC (met privacy-facts als bron).

### /docs/faq (verplaatst van /docs/help/faq)
- **BEZIT:** **korte antwoorden + link naar de bezittende doc.** Géén unieke informatie (na de rolwijziging). `FAQPage`-schema blijft de waarde (rich result).
- **HERHAALT NIET:** de volledige uitleg — elk antwoord wijst naar de doc/artikel die het onderwerp bezit (overview/accuracy/export-formats/limits/credits-and-billing/de artikelen).
- **LINKT:** naar elke bezittende doc per vraag.
- **BRON:** eigen code.
- **FIGUUR-SLOTS:** geen.
- **SCHEMA:** **`FAQPage`**.
- **BRONMATERIAAL:** de huidige FAQ-vragen (code) → per vraag de owning-doc bepalen. **Let op DEEL 2-nuance:** twee antwoorden (VAT-scope, dedup-"instant") krijgen eerst een houder in credits-and-billing resp. limits/overview.
- **Type:** SPEC (routing-pagina; korte antwoorden uit de bestaande FAQ).

---

## DEEL 4 — Wat ontbreekt

### 4.1 Docs zonder artikel (met zoekintentie) & omgekeerd
- **`summaries` heeft geen artikel, terwijl "summarize youtube video" hoge zoekintentie heeft.** Dit is de duidelijkste **artikel-leemte**: een Workflows/Export-artikel "Summarize a YouTube video" dat de docs-spec als bron voedt. Sterk aanbevolen (past in de bestaande buckets, geen ADR-038-audience-hub).
- **`accuracy` heeft geen artikel**, maar "how accurate is youtube transcription / AssemblyAI WER" heeft zoekintentie. Kandidaat-artikel (Deep Dive): "How accurate is AI YouTube transcription". Optioneel; accuracy-docs kan voorlopig de zoekintentie zelf dragen.
- **Omgekeerd (artikel zonder docs-spec, terecht):** de Deep Dives (`chunk-…-for-rag`, `…-vector-database`, `channel-knowledge-base`) zijn **arguments/topics**, geen specs — géén docs-tegenhanger nodig. `data-handling`/`limits`/`summaries` zijn docs-only zonder artikel — waarvan alleen `summaries` een zoekintentie-gat is.

### 4.2 Pagina afleidbaar uit FAQ/support?
- **Refund-/terugbetaalbeleid — gezaghebbende versie.** Content-sitemap markeert dit als **launch-blocker**: het enige statement ("7 dagen als ≤5 credits gebruikt") ligt begraven in de `/pricing`-FAQ, nergens juridisch bekrachtigd. Hoort thuis in **`/terms`** (beleid) met een korte spiegel in **`credits-and-billing`**. Vereist een **besluit**, niet enkel copy.
- **VAT-scope ("waarom kan ik niet kopen vanuit mijn land").** Nu alleen in de FAQ; na de FAQ-afslanking heeft het **geen houder** → onderbrengen bij `credits-and-billing` (zie DEEL 2). Geen aparte pagina nodig.
- **"Hoe lang duurt het / waarom soms instant (dedup)."** Afleidbaar uit de FAQ; onderbrengen bij `limits` (of `overview`), geen eigen pagina.
- **Geen nieuwe eigen pagina nodig** buiten de bovenstaande onderbrengingen — de bestaande scaffolds dekken de taken.

### 4.3 Reference-doc-template: ontbrekende bron- en figuur-conventie
De template (`page-structures/reference-doc.md`) noemt `AnchorHeading`, `InPageTOC`, `DefinitionLeadOpening`, `RelatedTopicsList`, maar **geen bron-sectie** en **geen figuur-conventie**. Voorstel:

**(a) `SourcesBlock` (nieuw component, onderaan de pagina, boven/naast RelatedTopicsList):**
- Doel: externe feiten verantwoorden + de code-bron vastleggen.
- Vorm: kopje "Sources", een lijst met (i) **externe** links (bijv. AssemblyAI-docs) en (ii) één regel **"Verified against `<code-pad>`"** voor SPEC-pagina's (gedempt, klein). Analoog aan `RelatedTopicsList` maar met externe URL's toegestaan + een "verified-against"-regel.
- Regel: **elke externe feitelijke claim** (taal-telling, WER-tier, subtitle-standaard, vector-DB-compat) heeft een gelinkte bron; **elke SPEC-pagina** noemt de `formatTranscript.ts`/`pricing.ts`/`main.py`-bron waaruit ze gedestilleerd is.

**(b) `DocsFigure` (nieuw component, figuur-conventie):**
- Vorm: `<figure>` met `<img>` (verplichte `alt`) + `<figcaption>`; `max-width:100%`, lazy-load, subtiele border/radius; caption gedempt.
- Regel: **een figuur mag alleen wat tekst niet kan** — gerenderde output (CSV in spreadsheet, Markdown in Obsidian, RAG-chunk), of een UI-state (export-menu, 3-credit-confirm). **Nooit decoratief.**
- Naamgeving assets: `/public/docs-figures/<page-slug>-<slot>.webp`; caption + alt **verplicht** en apart (caption = zichtbaar, alt = schermlezer, niet identiek).
- Contract-koppeling: de **FIGUUR-SLOTS** hierboven leveren per pagina de plek + het bijschrift + de alt-tekst; de schrijfronde maakt alleen de afbeelding.
- **Statusnoot:** neem beide op in de "Componentenlijst" + "Sectie-volgorde" van `reference-doc.md` (Sectie 7.5 Figuren binnen de body; Sectie 8.5 Sources vóór RelatedTopicsList).

### 4.4 llms.txt — VERWIJDERD (2026-07-23)
De drie `llms.txt`-bestanden zijn **verwijderd** (ADR-039 herzien na externe verificatie: geen bewezen AI-citation lever; Google steunt het niet (Mueller ≈ meta-keywords); enige echte afnemer = coding-agents met API-docs en INDXR heeft **geen publieke API**; de bestanden stonden bovendien op oude 5-tier-prijzen en logen over het product). Niet opnieuw toevoegen. Zie [content/writing-standard.md §A5](./writing-standard.md).
- **Consistentie-eis:** na consolidatie moeten de 3 paden byte-identiek zijn (of via één build-stap gevuld), zodat ze niet opnieuw uiteenlopen.

---

## Samenvatting voor de schrijfronde
- **16 routes** (na DEEL 2). Schrap `help/how-to` + `help/troubleshooting` (308 → `/articles`), verplaats `help/faq` → `/docs/faq`; `Help`-sidebarsectie verdwijnt.
- Elke pagina heeft nu een **BEZIT/HERHAALT-NIET-grens** + **BRONMATERIAAL** (exacte functie/bestand voor SPEC-pagina's) → geen giswerk, geen overlap.
- **SPEC-pagina's** (CC schrijft uit code): alle export-formats + hub, summaries, limits, credits-and-billing, data-handling, getting-started, faq. **ARGUMENT-pagina's** (Claude): overview (klaar), accuracy.
- **Vóór de schrijfronde beslissen:** refund-beleid (launch-blocker); VAT-scope + dedup-antwoord een houder geven; `SourcesBlock` + `DocsFigure` aan de template toevoegen. *(llms.txt is verwijderd — ADR-039, zie §4.4.)*

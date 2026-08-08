# Content-audit — 2026-08-02

> **📌 Momentopname (2026-08-02).** De artikelstructuur is op **2026-08-08** geconsolideerd (18 → 10 artikelen; de route-set en de oude `/articles/*`-slugs die dit document noemt zijn achterhaald, elk verdwenen slug 308 → eindpunt). Actuele artikelset: [../business/content-sitemap.md](../business/content-sitemap.md).

**Aard:** read-only audit van alle user-facing content (marketing + docs + articles). Geen code/tekst gewijzigd. Dit bestand is de enige output; Khidr trekt hieruit fix-batches.

**Bron van waarheid (in volgorde):** (1) broncode + productie-DB — `packages/shared/src/lib/pricing.ts` is single source of truth voor prijzen/credits/pakketten; (2) `docs/wiki/content/product-truth.md`; (3) de ADR's. Bij conflict wint de code; het conflict wordt dan als losse bevinding genoteerd.

**Route-set (uit `apps/marketing/src/app/sitemap.ts`, gekruist met `docs-config.ts` + on-disk `page.tsx`):** 9 marketing + 22 docs + 19 articles = **50 sitemap-routes**, plus 3 niet-geïndexeerde utility-pagina's (`/forgot-password`, `/onboarding`, `/suspended`). Redirect-laag is minimaal: alleen `/faq → /docs/faq` en `/account/credits → app/dashboard/account` (rest zijn PostHog-proxy-rewrites).

**Severity-legenda (Register 1):**
- **BLOCKER** = aantoonbaar onjuiste claim, live
- **FOUT** = feitelijk mis maar cosmetisch / laag-risico
- **DRIFT** = klopte ooit, achterhaald door een latere ADR
- **STIJL** = schending INDXR-schrijfrichtlijnen (Title Case i.p.v. sentence case, AI-generieke prose, ontbrekende answer-first opening per H2)

**Werkwijze:** marketing-core (9) + utility (3) handmatig geauditeerd door de hoofd-audit; docs (22) + articles (19) via 4 parallelle read-only agents met een gedeeld truth-brief; alle BLOCKER-bevindingen en de gefabriceerde-schema-claim zijn daarna handmatig tegen de broncode geverifieerd (`formatTranscript.ts`, `pricing.ts`, `next.config.ts`, `InvoiceButton.tsx`, ADR-076).

---

## Vooraf: bekende-verdachten-sweep (globaal gegrepd)

| Verdachte | Live hits in rendered content? |
|-----------|-------------------------------|
| `99.4%` | **0** — schoon |
| `800+ minutes` | **0** — schoon |
| `67 languages` | **0** — schoon |
| `8 formats` | **0** — schoon |
| `Universal-3 Pro` (plain) | **0** — schoon (nu "Universal-3.5 Pro", via `models.ts`-helper) |
| `Universal-2` als hoofdmodel | **0** in prose — alleen correct als "breder model, 99 talen" op de accuracy-pagina |
| `30-second chunks` als default | **0** — RAG-default = 60s (`RAG_CHUNK_DEFAULT`), presets 30/60/90/120 |
| quickstart "in 3 minutes" | **0** — schoon |
| placeholder-testimonials / lorem | **0** — er zijn geen testimonial-secties |
| `DeepSeek` in rendered content | **0** — schoon (oude AI-summary-provider, nu Gemini via EU-gateway) |
| `[KHIDR]`-markers | **3** — in `/about` (2 lege secties), `/onboarding` (niet-zichtbaar), `/suspended` (ontbrekende contactlink) |
| publieke API belofte | **0** valse belofte — `/docs/reference/limits` + `/docs/faq` zeggen expliciet "no public REST API" |
| captions vooraf gecheckt op beschikbaarheid | **1 live valse claim** — `/articles/youtube-playlist-transcript` (BLOCKER, zie R1) |

Conclusie sweep: de grove feitfouten uit eerdere content-rondes (99.4%, 800+, 67 talen, DeepSeek, "3 minutes") zijn **volledig opgeruimd**. De resterende bevindingen zijn fijnmaziger: één valse precheck-claim, kapotte links, een gefabriceerd RAG-schema in twee dev-artikelen, een refund-tegenspraak, on-demand-vs-automatisch factuur-copy, en systematische Title-Case-koppen.

---

## REGISTER 1 — Feitelijke defecten (gesorteerd op severity)

### BLOCKER

| # | Route | Exacte tekst (bestand:regel) | Wat er onwaar aan is | Bewijs (bron) | Sev |
|---|-------|------------------------------|----------------------|---------------|-----|
| 1 | `/about` | Lege `<p>` onder H2 **"What we do"** (`about/page.tsx:36-38`) en H2 **"Who builds INDXR.AI"** (`:40-43`); `{/* [KHIDR: vul aan …] */}`-comments op `:31,:37,:42` | Twee zichtbare H2-secties op een publieke, in de footer gelinkte pagina renderen **zonder enige inhoud** — kop met leegte eronder. Onaf. | Directe read `about/page.tsx` | **BLOCKER** |
| 2 | `/pricing` (FAQ) ↔ `/terms` | `/pricing`: *"We offer refunds within 7 days if you haven't used more than 5 credits."* (`pricing/page.tsx:47`) — vs `/terms` §7: *"If you haven't used any of the credits in a purchase, you can request a full refund within 14 days. Once you use any credit … that purchase becomes non-refundable"* (`terms/page.tsx:95-104`) | Twee live publieke pagina's geven **tegenstrijdig refund-beleid** (7 dagen / ≤5 credits gebruikt vs 14 dagen / géén credit gebruikt). De ToS is de gezaghebbende tekst; de pricing-FAQ belooft iets anders. Juridisch/geld-risico. | Beide bestanden; ToS is authoritative | **BLOCKER** |
| 3 | `/articles/youtube-playlist-transcript` | *"The pre-extraction screen shows each video with two indicators: **whether auto-captions are available**, and whether a transcript already exists in your library."* (`page.tsx:77-78`); versterkt door *"For videos without captions, you toggle AI Transcription individually"* (`:84`) | INDXR doet **geen** per-video caption-beschikbaarheidscheck vóór extractie. De route `check-playlist-availability` is verwijderd (ADR-076: "controleerde niets"); het reviewscherm is een keuze-/kostenscherm. De "unavailable"-teller komt uit de playlist-fetch (privé/verwijderd), niet uit een captions-check. | ADR-076; product-truth §6.3; geen source-caller van `check-playlist-availability` | **BLOCKER** |
| 4 | `/articles/youtube-transcript-for-rag` | `<Link href="/blog/chunk-youtube-transcripts-for-rag">` (`page.tsx:393`) | `/blog/*` bestaat niet en heeft geen redirect → **404**. Juiste route is `/articles/chunk-youtube-transcripts-for-rag`. | Geen `apps/marketing/src/app/blog`-dir; `next.config.ts` redirect alleen `/faq` + `/account/credits` | **BLOCKER** |
| 5 | `/articles/youtube-channel-knowledge-base` | `<Link href="/blog/chunk-youtube-transcripts-for-rag">` (`page.tsx:336`) | Zelfde kapotte `/blog/`-link → **404**. | Idem | **BLOCKER** |
| 6 | `/articles/youtube-channel-knowledge-base` | JSON-voorbeeld met top-level `{ "video": { … "source_url" … }, "chunks": […] }` (`page.tsx:171-195`) + Python `data['video']['title']` (`:258`) | **Gefabriceerd schema.** De echte RAG-JSON is `{ "metadata": {…}, "chunks": [] }` — er is geen `video`-wrapper en geen `source_url`-veld. Het code-voorbeeld **KeyErrort** tegen een echte INDXR-export. Dev-facing. | `formatTranscript.ts:694-711` (`{ metadata, chunks }`, metadata-keys) | **BLOCKER** |
| 7 | `/articles/youtube-transcripts-vector-database` | `/blog/chunk-youtube-transcripts-for-rag` op `page.tsx:186` **en** `:434` | Zelfde kapotte `/blog/`-link → **404** (twee keer). | Idem #4 | **BLOCKER** |
| 8 | `/articles/youtube-transcripts-vector-database` | JSON-velden `is_auto_generated`, `chunking_config.strategy: "time_based_sentence_snap"`, `target_duration_seconds` (`page.tsx:146-181`) + Python `data.get("video")`, `is_auto_generated`, `source_url` (`:206-215`) | **Gefabriceerd schema.** Echte keys: `metadata`-wrapper, `chunk_size_seconds` (niet `target_duration_seconds`), `overlap_strategy` (niet `strategy`), `extraction_method` (niet `is_auto_generated`). De code produceert stil verkeerde metadata / mist velden. | `formatTranscript.ts:699-709` | **BLOCKER** |

### FOUT

| # | Route | Exacte tekst (bestand:regel) | Wat er onwaar aan is | Bewijs | Sev |
|---|-------|------------------------------|----------------------|--------|-----|
| 9 | `/pricing` (FAQ) | *"Stripe automatically generates an invoice for every purchase, **emailed to you after payment**."* (`pricing/page.tsx:55`) | Facturen zijn **on-demand**: de gebruiker klikt per aankoop-rij "Request invoice" (`InvoiceButton.tsx`), de route `api/stripe/invoice` genereert 'm dan (ADR-053). Er wordt **niets automatisch gemaild**; Stripe stuurt hooguit een betaalbewijs, geen factuur. | `InvoiceButton.tsx:6-8,27-40`; `webhook/route.ts:250`; ADR-053 | FOUT |
| 10 | `/pricing` | `VatLine`: *"Stripe issues a proper invoice on **every purchase**"* (`components/pricing/VatLine.tsx:6`) | Zelfde: on-demand, door INDXR gegenereerd op verzoek, niet automatisch door Stripe per aankoop. | Idem #9 | FOUT |
| 11 | `/docs/account/billing` | *"Every purchase gets a VAT invoice **from Stripe**"* (`billing/page.tsx:60`) | Milder maar zelfde onnauwkeurigheid: de factuur is on-demand op de Account-pagina op te vragen, niet automatisch door Stripe uitgegeven. (De zin "your invoices … live on your Account page" is wél correct.) | Idem #9 | FOUT (laag) |
| 12 | `/pricing` | `AlwaysFreeBlock`: *"single-video YouTube caption extraction (**unlimited for registered users**)"* (`components/pricing/AlwaysFreeBlock.tsx:8`) | Niet onbeperkt voor gratis-ingelogden: **50/uur** rate-limit. Alleen **premium** (ooit gekocht) omzeilt de limiter — en zelfs dan geldt de 3-gelijktijdige-jobs-cap. "Registered" ≠ "premium". | product-truth §6.6; `ratelimit.ts:34,57-67` | FOUT |
| 13 | `/transcribe` (FAQ) | *"up to 99 languages with automatic detection, powered by {Universal-3.5 Pro}"* (`transcribe/page.tsx:37`) | De **99** komt van Universal-2, niet van Universal-3.5 Pro (die dekt 18 native). De zin hangt "99" onder de verkeerde modelnaam. | product-truth §4/§6.5; `models.ts` | FOUT |
| 14 | `/articles/audio-to-text` | Body: *"Languages: **99 languages** with automatic detection"* direct onder de Universal-3.5-Pro-naam (`page.tsx:108-114`) | Zelfde conflatie: 99 = Universal-2-bereik, 18 = Universal-3.5 Pro. De keten kán 99 halen, maar de kop-model dekt er 18. | product-truth §4 | FOUT (DRIFT-achtig) |
| 15 | `/articles/youtube-to-text` | *"AssemblyAI … achieves **95%+ accuracy on clean audio**"* (`page.tsx:38`) | Eén accuracy-percentage over alles is verboden; INDXR gebruikt WER-banden (≤10 / 10–25 / 25–50 / >50). | product-truth §6.5 | FOUT |
| 16 | `/articles/youtube-to-text` | Model nergens genoemd; alleen *"one of the most accurate speech-to-text models available"* (`page.tsx:186-188`) | Enige artikel dat de verplichte modelnaam **"Universal-3.5 Pro"** niet toont (gebruikt de `transcriptionModelName()`-helper niet). | `models.ts`; alle andere artikelen gebruiken de helper | FOUT (laag) |
| 17 | `/articles/youtube-transcript-json` | RAG-kostentabel *"31–60 min → 6 credits"* en *"61–120 min → 12 credits"* (`page.tsx:348-349`) | Overrekent de onderkant van elke range: 31 min = ⌈1860/600⌉ = **4** cr (niet 6); 61 min = ⌈3660/600⌉ = **7** cr (niet 12). De formule is per-video, geen platte range. | `pricing.ts` RAG `⌈dur/600⌉`; product-truth §2 | FOUT |
| 18 | `/articles/youtube-channel-knowledge-base` | *"Each video's RAG JSON file contains **90–120 second** chunks"* (`page.tsx:57,167`) | De default chunk-grootte is **60s** (Balanced); 90/120 zijn niet-default presets. Gepresenteerd als "wat je krijgt". | `formatTranscript.ts:675` (`chunkSize = 60`) | FOUT |
| 19 | `/articles/youtube-transcripts-vector-database` | *"Each chunk is **90–120 seconds** of speech"* (`page.tsx:184`); stap "90–120 second chunks" (`:57`); voorbeeld `target_duration_seconds: 120` | Zelfde: default is 60s. | `formatTranscript.ts:675` | FOUT |
| 20 | `/articles/youtube-transcript-json` | *"Roughly **20%** of YouTube videos have no auto-generated captions"* (`page.tsx:205`) | Verzonnen, onverifieerbaar cijfer; geen bron in code of truth-brief. | Geen bron | FOUT [UNSURE] |
| 21 | `/articles/youtube-playlist-transcript` | *"**amber** for existing YouTube caption transcripts, **violet** for existing AI transcriptions"* (`page.tsx:79`) | Library-badgekleuren zijn **sky** (captions) en **indigo** (AI-transcriptie); violet is juist AI-**summary**. Kleuren fout (naast de valse precheck-context, #3). | LESSONS 2026-07-04 badge-hue-systeem; ADR-080 | FOUT |
| 22 | `/docs/account/credits` | `<a href="/dashboard/account">Account page</a>` (`credits/page.tsx:96`) | Op de **marketing**-host lost dit op naar `marketing/dashboard/account` → **404** (geen route, geen redirect). De zusterlink `:88` gebruikt wél correct `appHref("/dashboard/account")`. | Geen dashboard-route in marketing; `cross-host-links.ts` bestaat hiervoor | FOUT (kapotte link) |
| 23 | `/docs/account/credits` | *"Every account gets **100 MB** of library storage"* (`:93`) + *"100 credits adds a permanent 100 MB"* (`:101-102`) | Base is **100 MiB** (niet MB); pagina noemt de **max 500 MB**-cap (ADR-078) niet, en dit 100/500-getal kan verward worden met de 500 MB **per-bestand-uploadcap**. | product-truth §5; ADR-078; `migrations/20260723140000` | FOUT |
| 24 | `/docs/reference/limits` | *"Signed in — 50 per hour"* (`limits/page.tsx:87`) | Onnauwkeurig: 50/1u geldt alleen voor **gratis** ingelogde users; wie ooit kocht **bypasst** de limiter volledig. Noemt ook niet dat alles uit staat zonder Upstash-env-vars. | product-truth §6.6/§6.7 | DRIFT |
| 25 | `/articles/audio-to-text` | Formats-tabel *"MP3, MP4, WAV, M4A, OGG, FLAC, WEBM"* als volledige set (`page.tsx:82-90`) | Onvolledig: echte set = **9** formaten (mist `.mpeg` + `.mpga`). Gepresenteerd als de complete lijst. | product-truth §6.1 | FOUT (laag) |
| 26 | `/pricing`, `/articles/youtube-srt-download` (`:175`), `/articles/youtube-transcript-json` (`:24`), `/articles/youtube-members-only-transcript` (`:100`), `/articles/youtube-age-restricted-transcript` (`:125`), `/articles/youtube-transcript-not-available` (`:335`) | Herhaalde 7-item-uploadlijst *"MP3, MP4, WAV, M4A, OGG, FLAC, WEBM up to 500MB"* (o.a. `pricing/page.tsx:39`) | Systematisch dezelfde onvolledige lijst (7 van 9; mist `.mpeg`/`.mpga`) op ≥6 pagina's. Elk laag-risico, maar consistent op te lossen. | product-truth §6.1 | FOUT (laag, systemisch) |
| 27 | `/` (homepage) | Hero-subhead *"Export as TXT, Markdown, SRT, JSON, or RAG-optimized format."* (`page.tsx:30`) | Noemt 5 van 7 formaten (mist CSV + VTT). Elders (o.a. `/transcribe:111`) staat de volledige 7. Illustratief, maar inconsistent-onvolledig. | product-truth §3 | FOUT (laag) |
| 28 | `/docs/guides/single-video` | *"INDXR reads the captions YouTube already has … usually in a couple of **seconds**"* (`single-video/page.tsx:46-47`) | Zet een concreet getal op caption-snelheid; die is **niet gemeten** (`usage_logs` heeft geen productie-mediaan; alleen cache-hit is instant). | product-truth §6.4 | FOUT |
| 29 | `/suspended` | *"If you have questions, please get in touch with us."* + `{/* KHIDR: voeg contact email / link toe */}` (`suspended/page.tsx:16-18`) | Vraagt de (geschorste) user contact op te nemen maar geeft **geen** e-mail of link. Placeholder nooit ingevuld. | Directe read | FOUT |
| 30 | `/articles/youtube-transcript-not-available` (`:145-154,320-329`), `/articles/youtube-age-restricted-transcript` (`:160-162`), `/articles/audio-to-text` (`:120-121`) | Herhaald *"roughly **4–5% word error rate** on clean English audio"* | Eén-percentage-patroon i.p.v. WER-banden. **[UNSURE]**: expliciet English-scoped + gerefereerd aan AssemblyAI-benchmarks → verdedigbaar, maar wijkt af van de per-taal-band-richtlijn. | product-truth §6.5 | FOUT [UNSURE] |

### STIJL

| # | Route(s) | Bevinding | Bewijs | Sev |
|---|----------|-----------|--------|-----|
| 31 | 16 van 18 artikelen (alle behalve `youtube-transcript-not-available`) | **Title-Case H2's/koppen** i.p.v. sentence case: bv. "Why Age Restriction Blocks Transcript Extraction", "How Bulk Extraction Works", "What You Actually Get", "Two Export Variants", "How Many Tokens Is 30 Seconds of Speech". Systemisch. | writing-standard §C; voorbeelden per artikel in de agent-runs | STIJL |
| 32 | `/transcribe` | H1 **"Free YouTube Transcript Generator"** — Title Case (`transcribe/page.tsx:108`) | writing-standard (sentence case) | STIJL |
| 33 | `/docs/*` (alle 22) | Meta-`<title>`-tags in Title Case ("Export Formats — …", "Accuracy and Languages", "Billing and Invoices"). On-page H1/H2 zijn wél sentence case → inconsistent. | writing-standard; on-page koppen correct | STIJL (laag, meta-only) |
| 34 | `/articles` (hub) | Kaart-labels in Title Case (`articles/page.tsx:19-42`) | writing-standard | STIJL (laag, nav) |

---

## REGISTER 2 — Ontbrekende visuals (gesorteerd op route)

**Legenda asset-type:** 🎬 = **Remotion-opname** (bewegend) · 📷 = product-screenshot (stil) · 🖼️ = editorial still · ⬡ = docs-hexagon-figuur · 📊 = diagram/chart.

| Route | Positie in pagina | Asset-type | Wat het moet tonen | Status nu |
|-------|-------------------|-----------|--------------------|-----------|
| `/` | How-it-works blok 1 (`page.tsx:64`, `RemotionLoop`) | 🎬 **Remotion** | De drie input-types die door-cyclen (single-URL / playlist / audio-upload) | Statische lijst in `RemotionLoop` (placeholder-voor-animatie; comment zegt "A future iteration may animate") |
| `/` | How-it-works blok 2 (`:73`, `MacbookMockupFrame` "Playlist job — 47 videos") | 📷 screenshot | Echte playlist-job-UI met per-video-voortgang | Handgecodeerde nep-mock in skeleton-frame (`MacbookMockupFrame` = "Skeleton component — visual polish in Claude Design rondje") |
| `/` | How-it-works blok 3 (`:89`, "Export — Markdown") | 📷 screenshot | Echte Markdown-export (frontmatter + timestamps) | Handgecodeerde nep-mock in skeleton-frame |
| `/` | How-it-works blok 4 (`:110`, "SRT export preview") | 📷 screenshot | Echte SRT-preview / in een player | Handgecodeerde nep-mock in skeleton-frame |
| `/` | How-it-works blok 5 (`:129`, "RAG JSON export") | 📷 screenshot | Echte RAG-JSON-output | Handgecodeerde nep-mock in skeleton-frame |
| `/` | Differentiator-strip (`DifferentiatorStrip.tsx:10-24`) | 📷/⬡ icons | Consistente icon-set i.p.v. emoji (🔌💳🎁) | Emoji-placeholders (skeleton-component) |
| `/docs/quickstart` | Na H2 "3. Check the cost, then confirm" (`quickstart/page.tsx:130`) | 📷 `DocsFigure` | Het Check-resultaat: 22-min video = 22 cr tegen saldo, met Confirm/Cancel | `DocsFigure` **zonder `src`** → rendert `null` (onzichtbaar gepland gat) |
| `/docs/quickstart` | Na H2 "5. Export it" (`:158`) | 📷 `DocsFigure` | Open export-menu met TXT/MD/SRT/VTT/CSV/JSON/RAG in 4 groepen | `DocsFigure` **zonder `src`** → niets |
| `/docs/reference/export-formats/markdown` | Na de output-code (`markdown/page.tsx:98`) | 📷 `DocsFigure` | Geëxporteerde `.md` gerenderd in Obsidian (frontmatter-properties) | `DocsFigure` **zonder `src`** → niets |
| `/docs/reference/export-formats/csv` | Na CSV-code (`csv/page.tsx:87`) | 📷 | De CSV geopend in een spreadsheet (Excel/Sheets) — precies het patroon dat de `DocsFigure`-doc-comment noemt | **Geen slot aanwezig** |
| `/docs/reference/export-formats/srt` | Na SRT-code (`srt/page.tsx:78`) | 📷 | De `.srt` als subtitle-track op een video | **Geen slot aanwezig** |
| `/docs/reference/export-formats/vtt` | Na VTT-code (`vtt/page.tsx:72`) | 📷 | De `.vtt` in een HTML5 `<track>`-player | **Geen slot aanwezig** |
| `/docs/reference/export-formats/json` | Na RAG-code (`json/page.tsx:167`) | 📷/📊 | Een gerenderde RAG-chunk (deep-link + token-schatting) of in een vector-DB | **Geen slot aanwezig** |
| `/docs/guides/single-video` | "Paste a link and extract" | 📷 | Single-video-tab met AI-toggle + Check/Extract-states | **Geen slot** [UNSURE of patroon dit vereist] |
| `/docs/guides/playlists` | "Run a playlist job" / "What a playlist costs" | 📷 | Het per-video reviewscherm (captions-vs-AI keuze, gereserveerd totaal) — meest visuele state in de docs | **Geen slot** (nu prose-only) |
| `/docs/guides/uploads` | "What you can upload" | 📷 | De ingelogde uploader met size/length-limieten + kostenraming | **Geen slot** [UNSURE] |
| `/docs/guides/library` | een van de 4 H2's | 📷 | Library-lijst met original/edited-toggle, collectie-filter of bulk-state | **Geen slot** [UNSURE] |
| `/docs/guides/summaries` | een van de H2's | 📷 | De AI-summary-view (key points) naast het transcript | **Geen slot** [UNSURE] |
| `/docs/how-indxr-works` | conceptuele pagina | ⬡/📊 | Optioneel flow-diagram video→(captions \| audio-transcribe)→transcript→export | **Geen slot** (prose-only waarschijnlijk acceptabel) |
| `/docs` (hub) | kaart-media | ⬡ | Seeded `HexField`-tegel per kaart | **Aanwezig** (`page.tsx:66`) — geen gat |
| `/articles/*` (alle 19) | ArticleHero 21:9-band + 16:9-kaart + OG | 🖼️ editorial still | Decoratieve object-fotografie per artikel | **Alle aanwezig** — geverifieerd op schijf onder `public/editorial/<slug>-{800,1440}.{avif,webp,jpg}` + `-og.jpg`. Geen lege hero-slots. |
| `/articles/youtube-age-restricted-transcript` | body (beschrijft "Age-Restricted Video error card", `:95`) | 📷 | Screenshot van de errorkaart | **Geen body-figuur** (kandidaat-gat) |
| `/articles/youtube-members-only-transcript` | body (beschrijft "Members-Only Video" card, `:140`) | 📷 | Screenshot van de errorkaart | **Geen body-figuur** (kandidaat-gat) |
| `/articles/bulk-youtube-transcript`, `/articles/youtube-playlist-transcript` | body (beschrijft selectie-/reviewscherm) | 📷 | Screenshot van het selectie-/reviewscherm | **Geen body-figuur** (kandidaat-gat) |
| `/articles/youtube-transcript-for-rag`, `youtube-transcripts-vector-database`, `youtube-channel-knowledge-base`, `youtube-transcript-json`, `chunk-youtube-transcripts-for-rag` | body (RAG-schema/pipeline) | 📷/📊 | Een gerenderde RAG-chunk, een vector-DB-/search-result-view of een pipeline-diagram — nu alles als `<pre>`-codeblok of `<table>` | **Geen beeld-figuur** (kandidaat; niet verplicht) |

**Kernpunt Register 2:** de **editorial hero-laag is compleet** (alle 19 artikelen hebben echte stills; geen placeholders). De echte productie-gaten zijn:
- **1 Remotion-opname** (homepage input-cyclus) — het enige bewegende gat.
- **4 homepage product-screenshots** (nu nep-mocks in `MacbookMockupFrame`-skeletons met zichtbare frame-chrome).
- **3 `DocsFigure`-zonder-`src`** (quickstart ×2, markdown) — onzichtbaar maar gepland.
- **≥6 docs-pagina's zonder figuur-slot** waar het export-format-/guide-patroon om een gerenderde-output-screenshot vraagt (csv/srt/vtt/json + guides).
- Kandidaat body-screenshots in de UI-beschrijvende artikelen (error-cards, selectie-scherm) — nice-to-have, geen verplichting.

---

## Telling per severity

| Severity | Aantal bevindingen |
|----------|--------------------|
| **BLOCKER** | **8** (#1–#8) |
| **FOUT** | **21** (#9–#30; waarvan #20 & #30 gemarkeerd [UNSURE]) |
| **DRIFT** | **1** (#24) |
| **STIJL** | **4** (#31–#34, waarvan #31 & #33/#34 systemisch over vele pagina's) |
| **Register 2 (visuals)** | 1 Remotion-slot + 4 homepage-screenshots + 3 lege `DocsFigure` + ≥6 docs zonder slot + kandidaat article-body-figuren |

**Positief geverifieerd schoon** (geen bevinding): prijzen/credits overal uit `pricing.ts` (Try €5/100 · Starter €15/400 · Plus €25/1.000 · Power €60/3.000); 1 cr/min transcriptie · 3 cr summary · RAG 1 cr/10 min · caption 0 cr; welcome-credits 25; "credits never expire" consistent; **geen** "eerste 3 RAG gratis"-claim (overal correct "re-download van een al-geëxporteerd transcript is gratis"); RAG-presets 30/60/90/120 (default 60, Quote/Balanced/Precise/Context); modelnaam overal "AssemblyAI Universal-3.5 Pro" via `models.ts` mét eerlijke taal-router-frasering; **geen** DeepSeek; WER-banden correct op de accuracy-pagina; geen publieke-API-belofte; privacy-policy (cookieless/EU/IP-loos/geen replay) klopt ná de 2026-07-18/19 fixes (privacy-facts.md-addenda); playlist gratis-slots (eerste 3 caption-video's, whisper nooit gratis) correct; on-demand-invoice-**flow** in de billing-doc grotendeels correct (alleen "automatisch/emailed"-framing fout, #9-#11).

## Niet-verifieerbare bronnen / open punten

1. **Age-/members-only "detect before extraction"-claims** (`youtube-age-restricted-transcript`, `youtube-members-only-transcript`, `youtube-transcript-not-available`): de precieze backend-flow (pre-emptieve detectie + genoemde error-cards + 0 credits) is **niet** binnen deze read-only audit tegen de backend bevestigd. Aanbevolen: verifieer tegen `backend/main.py` extract-flow vóór als "waar" behandelen. Niet als onwaar gemarkeerd.
2. **"4–5% WER on English"** (#30): berust op externe AssemblyAI-benchmarks; niet uit eigen code herleidbaar. English-scoped → verdedigbaar, maar buiten de per-taal-band-richtlijn.
3. **"20% of YouTube videos have no captions"** (#20) en **"Obsidian Web Clipper broke twice in early 2026 (thread 111550)"** (`youtube-transcript-markdown:40,74`): externe/statistische claims, niet uit de repo te verifiëren.
4. **Betaalmethoden** (`pricing/page.tsx:59`: "iDEAL, Bancontact, …"): afhankelijk van live Stripe-config; niet uit code te bevestigen.
5. **KvK 98828762 / bedrijfsadres** (`terms`/`privacy`): staat nergens in de codebase (grep = 0 hits, zie privacy-facts.md `:110`); niet onafhankelijk uit code geverifieerd.
6. **StatsFromTesting "200+ transcription runs, median ~5%"**: correct nagerekend (n=216, mediaan 0,0536), maar de steekproef is grotendeels **intern testverkeer** — het component erkent dit in-code; framing "From our own runs" is eerlijk. Geen bevinding, wel transparant vermeld.
7. **CLAUDE.md-drift (niet user-facing, terzijde):** de CLAUDE.md-routestabel noemt nog `/api/check-playlist-availability`, maar die route is door **ADR-076 verwijderd**; en product-truth §5 zegt dat storage-enforcement "niet gebouwd" is terwijl **ADR-078** het wél afdwingt. Beide zijn wiki/docs-drift, geen content-defect — hier alleen genoteerd zodat een fixer niet op de verouderde CLAUDE.md-tekst leunt.

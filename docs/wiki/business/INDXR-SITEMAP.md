# INDXR.AI — Master Sitemap & Content Plan

*Versie 1.0 — 2026-04-15*  
*Synthese van: SEO-onderzoek, SERP-analyse, competitor gaps, GEO/AI-SEO principes, strategische beslissingen uit sessie*

> **⚠️ Post-refactor update (2026-04-30):**  
> - `/faq` → 301 permanent redirect naar `/docs/faq`  
> - `/how-it-works` → 301 permanent redirect naar `/`  
> - Nieuwe routes: `/docs/*`, `/dashboard/messages`  
> Zie `docs/wiki/architecture/sitemap.md` voor de actuele routestructuur.

---

## Sitemap-structuur

```
indxr.ai/
│
├── KERNPAGINA'S
│   ├── /                                    (landing page)
│   ├── /how-it-works                        (product uitleg)
│   ├── /pricing                             (credits & tiers)
│   └── /faq                                 (uitgebreide FAQ)
│
├── SEO: TOOL-PAGINA'S (primaire traffic)
│   ├── /youtube-transcript-generator
│   ├── /youtube-to-text
│   ├── /bulk-youtube-transcript
│   ├── /youtube-playlist-transcript
│   ├── /youtube-transcript-downloader
│   ├── /youtube-srt-download
│   ├── /audio-to-text
│   └── /youtube-transcript-without-extension
│
├── SEO: FEATURE-PAGINA'S (format + workflow)
│   ├── /youtube-transcript-markdown         ← NIEUW, P0
│   ├── /youtube-transcript-json             ← NIEUW, P0
│   ├── /youtube-transcript-for-rag          ← NIEUW, P0
│   ├── /youtube-transcript-obsidian         ← NIEUW, P1
│   └── /youtube-transcript-csv              ← NIEUW, P1
│
├── SEO: PROBLEEMOPLOSSING (hoogste conversie-intentie)
│   ├── /youtube-transcript-not-available    ← NIEUW, P0
│   ├── /youtube-members-only-transcript     ← NIEUW, P1
│   └── /youtube-age-restricted-transcript   ← NIEUW, P1
│
├── SEO: VERGELIJKINGSPAGINA'S
│   ├── /alternative/downsub                 ← BESTAAND, herschrijven P0
│   ├── /alternative/notegpt                 ← BESTAAND, herschrijven P1
│   ├── /alternative/turboscribe             ← NIEUW, P1
│   ├── /alternative/tactiq                  ← BESTAAND, herschrijven P2
│   └── /alternative/happyscribe             ← NIEUW, P2
│
├── BLOG / TUTORIALS
│   ├── /blog/chunk-youtube-transcripts-for-rag
│   ├── /blog/youtube-transcripts-vector-database
│   ├── /blog/youtube-transcript-obsidian-workflow
│   └── /blog/youtube-channel-knowledge-base
│
├── TECHNISCH / CRAWLERS
│   ├── /llms.txt
│   ├── /sitemap.xml
│   └── /robots.txt
│
└── POST-LAUNCH (internationaal)
    ├── /id/transkripsi-youtube              (Indonesisch)
    ├── /tr/youtube-transkript               (Turks)
    └── /pt/transcricao-youtube              (Braziliaans Portugees)
```

---

## SECTIE 1 — Kernpagina's

---

### `/` — Landing Page

**Prioriteit:** P0 — eerste indruk, hoogste traffic
**Herschrijven:** Volledig. Huidige copy is placeholder.

**Doel:** Bezoeker direct laten begrijpen wat INDXR.AI doet, het laten proberen, en doorsturen naar registratie.

**Structuur (scrollend):**

**Hero:**
- Headline: krachtig, direct, geen buzzwords. Richting: *"YouTube transcripts. Clean, formatted, ready for anything."*
- Subtekst: één zin die de breedte dekt — video's met en zonder captions, export in elk format, bibliotheek.
- CTA: de tool zelf — URL-invoerbalk met drie tabs (Single Video / Playlist / Audio Upload) direct in de hero. Geen "Get Started" knop die doorklikt naar een andere pagina.
- Visueel: Linear-stijl dark hero met laptop/MacBook mockup waarop de INDXR.AI interface te zien is.

**Hoe het werkt (scrollend, 4 blokken):**
1. Paste a YouTube URL — captions in seconds, free, no account needed
2. No captions? AI transcription with 99%+ accuracy — 1 credit per minute
3. Playlist & bulk — extract entire courses, channels, or playlists in one click
4. Export anywhere — Markdown, JSON, SRT, CSV, RAG-ready — your transcript, your format

**Voor wie (4 persona's, één regel elk):**
- Researchers & journalists — cite, quote, analyze video content
- Content creators — repurpose your videos into blogs, newsletters, threads
- Developers & AI builders — RAG-ready JSON for your pipeline, no coding required
- Students — turn lecture playlists into searchable study guides

**Feature highlights (4-5, met visueel):**
- Playlist batch extraction
- RAG-optimized JSON export
- AI summary + action points
- Library with rich-text editor
- 8 export formats

**Social proof:** Statistieken (X transcripts extracted, tested up to 214-minute videos) — geen reviews die er nog niet zijn.

**Pricing sectie:** 3 primaire tiers, use-case framing (geen "500 credits" maar "transcribe ~8 hours of audio"). Stille links voor Starter en Power.

**FAQ (5 vragen):** Korte antwoorden, FAQPage schema.

**Schema markup:** SoftwareApplication + Organization + FAQPage + WebApplication

---

### `/how-it-works` — How INDXR.AI Works

**Prioriteit:** P0
**Doel:** Uitleggen voor twijfelende bezoekers, LLM-crawlers, en zoekmachines. Vertrouwen opbouwen via transparantie over technologie.

**Structuur:**

**Intro:** Eén paragraaf — wat INDXR.AI doet en voor wie.

**Stap 1 — Paste a URL**
YouTube video-URL of playlist-URL. We halen direct metadata op: titel, duur, beschikbaarheid captions, geschatte kosten. Geen verrassingen.

**Stap 2 — Auto-captions or AI transcription**
- Auto-captions: gratis, seconden, werkt voor ~80% van video's
- AI transcription: AssemblyAI Universal-3 Pro, 99%+ accuracy, 1 credit per minute
- Audio upload: eigen audiobestand, tot 500MB, zelfde AI-pipeline
- Eerlijk vermeld: members-only en age-restricted video's worden herkend en duidelijk gecommuniceerd

**Stap 3 — Choose your export**
Per format kort uitgelegd:
- TXT plain / TXT with timestamps — lezen, kopiëren, delen
- Markdown — Obsidian, Notion, blogs — met YAML frontmatter
- SRT / VTT — video editors, LMS-platforms
- CSV — spreadsheet analyse, onderzoek
- JSON — developers, data pipelines
- JSON RAG-optimized — AI pipelines, vector databases, LangChain — beschikbaar via toggle

**Stap 4 — Library & AI features**
- Opslaan in bibliotheek, hergebruiken, bewerken in rich-text editor
- AI summary + action points (3 credits)
- Credits verlopen nooit

**Credits uitgelegd:** Transparante tabel. Vergelijking met concurrenten.

**Technische noten (voor vertrouwen):** AssemblyAI Universal-3 Pro, yt-dlp, waarom de accuratesse hoog is.

**Schema markup:** HowTo + FAQPage

---

### `/pricing` — Pricing

**Prioriteit:** P0
**Herschrijven:** Volledig. Nieuwe tier-structuur, use-case framing.

**Structuur:**

**Headline:** *"Pay once. Use when you need it. Credits never expire."*

**Drie primaire tiers (kaarten):**

| Basic | Plus ★ | Pro |
|---|---|---|
| €6.99 | €13.99 | €27.99 |
| 500 credits | 1.200 credits | 2.800 credits |
| ~8h AI transcription | ~20h AI transcription | ~46h AI transcription |
| or 500 playlist videos | or 1.200 playlist videos | or 2.800 playlist videos |

Stille links: "Need fewer credits? Try for €2.99 (150cr)" en "Processing larger volumes? Power — €54.99 (6.000cr)"

**Credit calculator blok:** "How much will I need?" — simpele omrekentabel:
- 1-hour video with AI transcription = 60 credits
- 20-video playlist with auto-captions = 17 credits (first 3 free)
- AI summary = 3 credits
- RAG JSON export = 1 credit per 15 min

**Vergelijking met concurrenten:** Tabel. "10x cheaper than Rev.com. 3x cheaper than TurboScribe."

**FAQ (4 vragen):** Do credits expire? What's a credit? Can I get a refund? What if I run out mid-playlist?

**Schema markup:** Offer + FAQPage

---

### `/faq` — FAQ

**Prioriteit:** P1
**Doel:** Lange-staart vragen afvangen, FAQPage-schema voor Google rich results en LLM-citaties.

**Secties:**
1. Getting started (5 vragen)
2. Credits & pricing (6 vragen)
3. Transcription quality (5 vragen)
4. Export formats (6 vragen)
5. Playlists & bulk (4 vragen)
6. Privacy & data (3 vragen)
7. Technical issues — link naar /youtube-transcript-not-available, /youtube-members-only-transcript

**Schema markup:** FAQPage (alle vragen)

---

## SECTIE 2 — SEO Tool-pagina's

*Bestaande pagina's die verbeterd worden. Elke pagina: tool direct beschikbaar, SEO-content eronder.*

---

### `/youtube-transcript-generator`

**H1:** Free YouTube Transcript Generator — No Extension, No Login
**Meta:** Extract YouTube transcripts instantly. Free auto-captions, AI transcription for videos without subtitles. Download as TXT, Markdown, SRT, JSON, or CSV.
**Target keywords:** youtube transcript generator, youtube transcript extractor, free youtube transcript
**Inhoud:** Primaire landingspagina voor het hoofd-keyword. Tool boven de fold. Eronder: wat is een YouTube-transcript, hoe gebruik je de generator, welke formaten, FAQ (5 vragen).
**Schema:** SoftwareApplication + FAQPage

---

### `/youtube-to-text`

**H1:** Convert YouTube Videos to Text — Free, Instant
**Meta:** Turn any YouTube video into readable text. Free for videos with captions. AI transcription for the rest.
**Target keywords:** youtube to text, youtube video to text, convert youtube to text
**Inhoud:** Tool. Uitleg wanneer gratis vs AI. FAQ.
**Schema:** SoftwareApplication + FAQPage

---

### `/bulk-youtube-transcript`

**H1:** Bulk YouTube Transcript Downloader — Extract Entire Playlists
**Meta:** Download transcripts from entire YouTube playlists at once. First 3 videos free, then 1 credit per video.
**Target keywords:** bulk youtube transcript, youtube playlist transcript download, batch youtube transcript
**Inhoud:** Tool (Playlist-tab). Hoe het werkt voor batch. Credit-uitleg. FAQ.
**Schema:** SoftwareApplication + FAQPage

---

### `/youtube-playlist-transcript`

**H1:** YouTube Playlist Transcript — Extract All Videos at Once
**Target keywords:** youtube playlist transcript, download youtube playlist transcript
**Inhoud:** Variant op bulk, meer gericht op "één playlist" use case. Tool. FAQ.

---

### `/youtube-transcript-downloader`

**H1:** Download YouTube Transcripts — 8 Formats, One Click
**Target keywords:** youtube transcript downloader, download youtube transcript
**Inhoud:** Nadruk op de breedte van exportformaten. Tool. Format-uitleg. FAQ.

---

### `/youtube-srt-download`

**H1:** Download YouTube Subtitles as SRT or VTT — Free
**Target keywords:** youtube srt download, youtube subtitle download srt, download youtube captions srt
**Inhoud:** Tool. Uitleg SRT vs VTT use cases (video editors, LMS). Welke editors werken ermee. FAQ.

---

### `/audio-to-text`

**H1:** Audio File to Text — Upload Any Audio, Get a Transcript
**Target keywords:** audio to text, audio file transcription online, mp3 to text
**Inhoud:** Tool (Audio Upload tab). Ondersteunde formaten (MP3/MP4/WAV/M4A/OGG/FLAC/WEBM, tot 500MB). AssemblyAI kwaliteit. FAQ.

---

### `/youtube-transcript-without-extension`

**H1:** Get YouTube Transcripts Without a Chrome Extension
**Target keywords:** youtube transcript without extension, youtube transcript no extension, youtube transcript website
**Inhoud:** Uitleggen waarom extensions breken (YouTube DOM-changes, 2026 break-incidents). INDXR.AI werkt in elke browser. Tool. FAQ.

---

## SECTIE 3 — Feature-pagina's (NIEUW — hoogste differentiatie)

---

### `/youtube-transcript-markdown` — P0

**H1:** YouTube Transcript to Markdown — Ready for Obsidian, Notion & Your Blog
**Meta:** Export YouTube transcripts as clean Markdown with YAML frontmatter. Works with Obsidian Dataview, Notion databases, and any Markdown editor.
**Target keywords:** youtube transcript obsidian, youtube transcript markdown, youtube transcript to notion, youtube transcript markdown download
**Inhoud (1500-2000 woorden):**
- Waarom Markdown voor transcripten (Obsidian plugins kapot in 2026, fragiele extensions)
- Wat INDXR.AI's Markdown export bevat: YAML frontmatter (title, source URL, channel, duration, language, type: youtube, created, tags), schone koptekst-structuur, timestamp-varianten
- Obsidian workflow stap-voor-stap: URL → export → drag naar vault → Dataview queries
- Notion workflow: export → import als page met properties
- Blog/newsletter workflow: export → paste in editor, klaar
- Code-blok: voorbeeld YAML frontmatter output
- FAQ (5 vragen over Obsidian/Notion-integratie)
**Schema:** SoftwareApplication + HowTo + FAQPage

---

### `/youtube-transcript-json` — P0

**H1:** YouTube Transcript JSON Export — Structured Data for Developers
**Meta:** Download YouTube transcripts as structured JSON with metadata wrapper. Compatible with the youtube-transcript-api format. Also available: RAG-optimized chunked JSON.
**Target keywords:** youtube transcript json, youtube transcript download json, youtube transcript structured data, youtube transcript api json
**Inhoud (1500 woorden):**
- Huidige JSON-standaard uitleggen (youtube-transcript-api formaat, `start` niet `offset`)
- INDXR.AI's verbeterde JSON: metadata wrapper (video_id, title, channel, url, duration, language, is_auto_generated), segments met `start` + `end` + `text`
- RAG-optimized variant: uitleg wat het verschil is, wanneer je welke gebruikt
- Code-blok: voorbeeld JSON output (beide varianten)
- Use cases: developer integraties, data pipelines, programmatic analysis
- FAQ (4 vragen)
**Schema:** SoftwareApplication + FAQPage

---

### `/youtube-transcript-for-rag` — P0

**H1:** YouTube Transcripts for RAG Pipelines — Chunked, Metadata-Rich, Ready to Embed
**Meta:** Export YouTube transcripts as RAG-optimized JSON. 90-120 second chunks, sentence-boundary snapping, timestamps, chapter metadata. Works with LangChain, LlamaIndex, Pinecone, ChromaDB.
**Target keywords:** youtube transcript for rag, rag pipeline youtube, youtube transcript chunking, youtube transcript langchain, youtube transcript vector database
**Inhoud (2000-2500 woorden):**
- Het probleem: waarom ruwe YouTube-transcripten niet RAG-ready zijn (geen chunking, geen metadata, timestamps verloren)
- Wat "RAG-ready" betekent: chunk size (256-512 tokens sweet spot, backed by Vectara NAACL 2025), overlap, sentence boundaries, metadata per chunk
- INDXR.AI's RAG JSON export: schema-uitleg, voorbeeld output, deep_link per chunk
- Hoe te gebruiken met LangChain (code snippet)
- Hoe te gebruiken met LlamaIndex (code snippet)
- Hoe te laden in Pinecone / ChromaDB (code snippet)
- Vergelijking: INDXR.AI vs handmatige pipeline (50+ regels code die dit vervangt)
- FAQ (5 vragen)
**Schema:** SoftwareApplication + HowTo + FAQPage

---

### `/youtube-transcript-obsidian` — P1

**H1:** Import YouTube Transcripts into Obsidian — With YAML Frontmatter
**Meta:** The reliable way to get YouTube transcripts into Obsidian. No broken plugins, no Chrome extensions. Clean Markdown with frontmatter, Dataview-compatible.
**Target keywords:** youtube transcript obsidian, obsidian youtube transcript, youtube transcript obsidian plugin alternative
**Inhoud (1200 woorden):**
- Probleemschets: Obsidian Web Clipper brak twee keer in 2026, YTranscript plugin onbetrouwbaar
- INDXR.AI als betrouwbare alternatief: geen extensie, werkt altijd
- Stap-voor-stap Obsidian workflow met screenshots/beschrijving
- Dataview-query voorbeelden op basis van YAML-properties
- "Open in Obsidian" URI-tip
- FAQ (4 vragen)
**Schema:** HowTo + FAQPage

---

### `/youtube-transcript-csv` — P1

**H1:** Download YouTube Transcript as CSV — Spreadsheet-Ready
**Meta:** Export YouTube transcripts as CSV with segment index, start time, end time, text, and word count. UTF-8 BOM for Excel compatibility.
**Target keywords:** youtube transcript csv, youtube transcript spreadsheet, download youtube transcript csv
**Inhoud (800 woorden):**
- Use cases: onderzoek, computational text analysis, data science
- Kolom-uitleg: segment_index, start_time, end_time, text, word_count (+ video_id/title voor playlists)
- Hoe te openen in Excel, Google Sheets, Python/pandas
- FAQ (3 vragen)
**Schema:** SoftwareApplication + FAQPage

---

## SECTIE 4 — Probleemoplossing (NIEUW — hoogste conversie-intentie)

---

### `/youtube-transcript-not-available` — P0

**H1:** YouTube Transcript Not Available? Here's Why — and How to Fix It
**Meta:** YouTube transcripts missing or disabled? We explain every reason transcripts don't appear and show you how to get the text anyway — even without auto-captions.
**Target keywords:** youtube transcript not available, youtube transcript not working, youtube transcript missing, why is youtube transcript not showing, youtube transcript disabled
**Inhoud (2000 woorden):**

*Begin direct met een definitief antwoord in de eerste 25 woorden — voor featured snippet + AI Overview.*

Reden 1: Video heeft geen auto-captions (creator heeft ze uitgeschakeld of YouTube heeft ze nog niet gegenereerd)
→ Oplossing: AI transcription via INDXR.AI — 1 credit per minuut, 99%+ accuracy

Reden 2: Video is te nieuw (YouTube genereert captions asynchroon, kan uren duren)
→ Oplossing: wacht, of gebruik AI transcription direct

Reden 3: Video is members-only
→ Oplossing: zie /youtube-members-only-transcript

Reden 4: Video is age-restricted
→ Oplossing: zie /youtube-age-restricted-transcript

Reden 5: Video is in een taal zonder auto-caption support
→ Oplossing: AI transcription, AssemblyAI ondersteunt 99+ talen

Reden 6: Creator heeft transcripts uitgeschakeld (via YouTube Studio)
→ Oplossing: AI transcription van de audio — dit omzeilt de caption-instelling

Reden 7: Technische YouTube-bug of tijdelijke storing
→ Oplossing: wacht of gebruik INDXR.AI als bypass

- FAQ-sectie (6 vragen, kort en direct)
- Interne links naar /youtube-members-only-transcript en /youtube-age-restricted-transcript
**Schema:** FAQPage + HowTo + Article

---

### `/youtube-members-only-transcript` — P1

**H1:** How to Get Transcripts from Members-Only YouTube Videos
**Meta:** Members-only videos are restricted by design. Here's what's actually possible — and what isn't — when it comes to transcribing YouTube membership content.
**Target keywords:** youtube members only transcript, members only video transcript, youtube channel membership transcript
**Inhoud (1000 woorden):**
- Eerlijk uitleggen: members-only video's zijn intentioneel afgeschermd
- Wat WEL kan: als je zelf member bent en de video kunt afspelen → Audio Upload tab in INDXR.AI: download audio via andere weg, upload, transcribeer
- Wat NIET kan: directe URL-extractie van locked content (INDXR.AI toont duidelijke error)
- Waarom INDXR.AI een betere error geeft dan concurrenten (die simpelweg falen zonder uitleg)
- FAQ (3 vragen)
**Schema:** FAQPage + Article

---

### `/youtube-age-restricted-transcript` — P1

**H1:** YouTube Age-Restricted Video Transcript — What's Possible
**Meta:** Age-restricted YouTube videos can't be transcribed directly. Here's why, and what workarounds exist.
**Target keywords:** youtube age restricted transcript, age restricted youtube captions, transcribe age restricted youtube video
**Inhoud (800 woorden):**
- Uitleggen hoe age-restriction werkt (YouTube vereist ingelogde sessie)
- Wat INDXR.AI doet: herkent het, geeft duidelijke foutmelding — geen stille failures
- Workaround: als je ingelogd bent op YouTube en de video kunt zien → Audio Upload
- FAQ (3 vragen)
**Schema:** FAQPage + Article

---

## SECTIE 5 — Vergelijkingspagina's

---

### `/alternative/downsub` — P0

**H1:** INDXR.AI vs DownSub — The Smarter Alternative
**Meta:** DownSub downloads subtitles. INDXR.AI extracts transcripts, transcribes audio with AI, exports in 8 formats, and stores everything in a searchable library. Here's the difference.
**Target keywords:** downsub alternative, downsub not working, alternative to downsub, sites like downsub
**Inhoud (1200 woorden):**
- Wat DownSub doet goed: snel, simpel, gratis subtitle download
- Waar DownSub tekortschiet: alleen SRT/VTT/TXT, geen AI transcription voor videos zonder captions, geen library, geen Markdown/JSON/CSV, advertentie-zwaar UI, geen account/history
- Feature-vergelijkingstabel
- Voor wie INDXR.AI beter is (met concrete use cases)
- Pricing vergelijking
- FAQ (3 vragen)
**Schema:** FAQPage + Article

---

### `/alternative/notegpt` — P1

**H1:** INDXR.AI vs NoteGPT — A Focused Alternative
**Meta:** NoteGPT summarizes videos. INDXR.AI gives you the actual transcript — clean, exported, stored, and ready for your workflow.
**Target keywords:** notegpt alternative, alternatives to notegpt, notegpt vs
**Inhoud (1200 woorden):**
- NoteGPT sterk in: summaries, free tier, grote gebruikersbasis
- NoteGPT zwak in: geen playlist batch, geen RAG JSON, geen Markdown/Obsidian export, walled garden (data niet portable), subscription-model
- Feature-vergelijkingstabel
- Pricing vergelijking
- FAQ (3 vragen)
**Schema:** FAQPage + Article

---

### `/alternative/turboscribe` — P1

**H1:** INDXR.AI vs TurboScribe — Different Tools for Different Jobs
**Meta:** TurboScribe transcribes audio files. INDXR.AI is built specifically for YouTube — with auto-captions, AI fallback, playlist batch, and RAG-ready export.
**Target keywords:** turboscribe alternative, turboscribe vs, turboscribe alternatives 2026
**Inhoud:** Feature-vergelijking, pricing (TurboScribe $10/mo unlimited vs INDXR.AI credits), voor wie wat beter werkt. FAQ.

---

### `/alternative/tactiq` — P2

**H1:** INDXR.AI vs Tactiq — YouTube Transcripts vs Meeting Transcripts
**Target keywords:** tactiq alternative, tactiq youtube transcript
**Inhoud:** Tactiq is primair een meeting-tool (Google Meet, Zoom). INDXR.AI is YouTube-first. Verschillende use cases, eerlijke vergelijking.

---

### `/alternative/happyscribe` — P2

**H1:** INDXR.AI vs HappyScribe — A More Affordable YouTube Alternative
**Target keywords:** happyscribe alternative, happyscribe vs
**Inhoud:** HappyScribe €0.20/min vs INDXR.AI €0.009-0.012/min. Feature-vergelijking.

---

## SECTIE 6 — Blog / Tutorials

*Technische diepgang voor developer-doelgroep en topical authority.*

---

### `/blog/chunk-youtube-transcripts-for-rag`

**H1:** How to Chunk YouTube Transcripts for RAG (and Why 30 Seconds Is Wrong)
**Target keywords:** youtube transcript chunking, chunk youtube transcripts, rag chunk size youtube
**Inhoud (2000-2500 woorden):**
- Waarom chunk-grootte meer impact heeft dan embedding-model keuze (Vectara NAACL 2025)
- Token-tabel: 30s = ~100 tokens (te klein), 60s = ~200 (minimum), 90s = ~300 (goed), 120s = ~400 (optimaal)
- Fixed-time vs semantic chunking voor transcripten
- Sentence-boundary snapping uitleggen
- Overlap: 15% sweet spot (NVIDIA benchmark)
- Code-voorbeeld: INDXR.AI output → ChromaDB
- FAQ (5 vragen)

---

### `/blog/youtube-transcripts-vector-database`

**H1:** YouTube Transcripts to Vector Database: A Complete Python Pipeline
**Target keywords:** youtube transcript vector database, youtube transcript pinecone, youtube transcript chromadb
**Inhoud (2500 woorden):**
- Architectuur: YouTube → INDXR.AI → embeddings → vector DB → LLM
- Stap-voor-stap Python pipeline
- Code voor Pinecone, ChromaDB, Weaviate
- Semantic search voorbeeld
- Bron-citaties met deep links in LLM-responses

---

### `/blog/youtube-transcript-obsidian-workflow`

**H1:** The Complete Obsidian Workflow for YouTube Transcripts (2026)
**Target keywords:** obsidian youtube transcript workflow, youtube transcript obsidian dataview
**Inhoud (1500 woorden):**
- Waarom de standaard Obsidian-plugins onbetrouwbaar zijn geworden
- INDXR.AI als stabiele basis
- Volledige workflow met Dataview-queries
- Vault-organisatie tips

---

### `/blog/youtube-channel-knowledge-base`

**H1:** Turn Any YouTube Channel Into a Searchable AI Knowledge Base
**Target keywords:** youtube channel knowledge base, youtube channel rag, process youtube channel ai
**Inhoud (2000 woorden):**
- Use case: cursusreeks doorzoekbaar maken
- Playlist-workaround voor channel-extractie
- Batch-extractie + RAG JSON + vector DB
- Semantic search UI bouwen

---

## SECTIE 7 — Technische bestanden

---

### `/llms.txt`

**Doel:** LLMs informeren over wat INDXR.AI is, doet, en welke pagina's bestaan. Geen enkele concurrent in de transcript-niche heeft dit. Kost 1 uur implementatie.

**Formaat:** Markdown, gestructureerd, beknopt. Standaard conform llms.txt-spec (Cloudflare, Vercel, Stripe gebruiken dit formaat).

**Inhoud:**

```markdown
# INDXR.AI

INDXR.AI is a YouTube transcript extraction tool. It extracts captions from YouTube videos 
and playlists, transcribes audio with AI when captions aren't available, and exports 
transcripts in 8 formats including RAG-optimized JSON for AI pipelines.

## What INDXR.AI does

- Extracts YouTube auto-captions instantly (free, no account required for single videos)
- AI transcription via AssemblyAI Universal-3 Pro for videos without captions (1 credit/minute)
- Playlist batch extraction (first 3 videos free, 1 credit/video after)
- Audio file upload transcription (up to 500MB)
- AI summary + action points (3 credits)
- Export formats: TXT, TXT with timestamps, Markdown (with YAML frontmatter), 
  SRT, VTT, CSV, JSON, JSON RAG-optimized
- Library with rich-text editor, collections, search

## Pricing

Credits-based, no subscription. Credits never expire.
- Basic: €6.99 / 500 credits
- Plus: €13.99 / 1,200 credits (most popular)  
- Pro: €27.99 / 2,800 credits
- 25 free credits on signup. Free caption extraction (single videos, anonymous).

## RAG JSON Export

INDXR.AI exports YouTube transcripts as RAG-optimized JSON with 90-120 second chunks,
sentence-boundary snapping, timestamps per chunk, chapter metadata, and a deep_link
field per chunk (youtu.be/ID?t=N). Compatible with LangChain, LlamaIndex, Pinecone, 
ChromaDB, Weaviate, and Qdrant.

## Key pages

- /how-it-works — complete product explanation
- /pricing — credit packages and calculator
- /youtube-transcript-for-rag — RAG pipeline documentation
- /youtube-transcript-markdown — Obsidian and Notion workflow
- /youtube-transcript-not-available — troubleshooting guide
- /faq — all common questions
- /blog/chunk-youtube-transcripts-for-rag — chunking research and best practices

## What INDXR.AI does NOT do

- Does not provide a public REST API (web UI only)
- Does not transcribe members-only videos via URL (audio upload workaround exists)
- Does not extract from private YouTube videos
- Credits are required for AI transcription (auto-captions remain free)
```

---

### `/robots.txt`

**Doel:** Zoekmachines en AI-crawlers correct sturen. Zero-cost, directe impact op AI-citaties.

**Inhoud:**

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /transcribe/
Disallow: /library/

# Allow all major AI crawlers explicitly
User-agent: ClaudeBot
Allow: /

User-agent: ClaudeSearchBot
Allow: /

User-agent: Claude-User
Allow: /

User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Googlebot
Allow: /

User-agent: Bingbot
Allow: /

# Block extractive scrapers with zero referral value
User-agent: CCBot
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

Sitemap: https://indxr.ai/sitemap.xml
```

---

### `/sitemap.xml`

Al dynamisch gegenereerd via Next.js `sitemap.ts`. Uitbreiden met gesegmenteerde structuur:

- `sitemap-pages.xml` — kernpagina's + tool-pagina's
- `sitemap-features.xml` — feature-pagina's + probleemoplossing
- `sitemap-comparisons.xml` — vergelijkingspagina's
- `sitemap-blog.xml` — blog/tutorials

**Submit aan:** Google Search Console + Bing Webmaster Tools (Bing = ChatGPT web search index).

---

## SECTIE 8 — Post-launch: Internationale pagina's

*Niet voor launch, maar nu al plannen zodat de URL-structuur correct is.*

| Slug | Taal | Markt | Concurrentie | Prioriteit |
|---|---|---|---|---|
| `/id/transkripsi-youtube` | Indonesisch | 139M YT-users | Laag — auto-vertaal domineert | Post-launch P1 |
| `/tr/youtube-transkript` | Turks | 60M internet users | Gemiddeld (Transkriptor.com lokaal) | Post-launch P2 |
| `/pt/transcricao-youtube` | Braziliaans Portugees | 200M+ PT-speakers | Gemiddeld-hoog (VEED, Tactiq lokaal) | Post-launch P3 |

**Betalingsbereidheid-noot:** Indonesië en Turkije hebben lagere gemiddelde koopkracht dan EU/US. Maar: organisch traffic zonder acquisitiekosten = positieve ROI zelfs bij lagere conversie. Credits-model past hier goed — geen €10-20/mnd abonnement, maar €2-7 incidentele aankopen.

---

## SECTIE 9 — Schema Markup per pagina-type

| Pagina-type | Schema-types |
|---|---|
| Homepage | SoftwareApplication + Organization + FAQPage + WebApplication |
| Tool-pagina's | SoftwareApplication + FAQPage |
| Feature-pagina's | SoftwareApplication + HowTo + FAQPage |
| Probleemoplossing | Article + FAQPage + HowTo |
| Vergelijkingspagina's | Article + FAQPage |
| Blog/tutorials | Article + HowTo + FAQPage |
| Pricing | Offer + FAQPage |
| FAQ-pagina | FAQPage |

**Implementatie:** Herbruikbare `<JsonLd>` React server component. Per pagina-type één template, gevuld met paginaspecifieke data.

---

## SECTIE 10 — Prioriteitsvolgorde voor implementatie

### Fase 1 — Schrijven (dit gesprek)
1. Landing page copy
2. How It Works copy
3. `/youtube-transcript-not-available` — volledig artikel
4. `/youtube-transcript-markdown` — volledig artikel
5. `/youtube-transcript-for-rag` — volledig artikel
6. `/alternative/downsub` — volledig artikel
7. `/alternative/notegpt` — volledig artikel

### Fase 2 — Schrijven (vervolgsessies)
8. `/youtube-transcript-json` — volledig artikel
9. `/youtube-transcript-obsidian` — volledig artikel
10. `/blog/chunk-youtube-transcripts-for-rag` — volledig artikel
11. Resterende vergelijkingspagina's
12. Overige feature-pagina's

### Fase 3 — Claude Code implementeert
- Content bestanden → Next.js pagina's
- Schema markup component bouwen
- `llms.txt` + `robots.txt` deployen
- Sitemap segmenteren + indienen bij Google + Bing
- Bestaande SEO-pagina's updaten met nieuwe copy

---

## Waarom deze sitemap optimaal is

**1. Alle zoekintentieklassen gedekt:**
- Informatief ("how to get youtube transcript") → tool-pagina's
- Probleem-bewust ("transcript not available") → probleemoplossing
- Format-specifiek ("json", "markdown", "csv") → feature-pagina's
- Workflow-gedreven ("for rag", "obsidian") → feature + blog
- Vergelijkend ("downsub alternative") → alternative-pagina's

**2. Inspeelt op bewezen competitor-gaps:**
- Geen enkele concurrent heeft error-state pagina's → INDXR.AI pakt dit
- Geen enkele concurrent heeft Markdown/JSON/RAG feature-pagina's → INDXR.AI pakt dit
- Geen enkele concurrent heeft llms.txt → INDXR.AI eerste in de niche

**3. GEO/AI-SEO principes verwerkt in structuur:**
- Elke pagina heeft FAQ-sectie → FAQPage schema → AI Overview / People Also Ask
- llms.txt geeft LLMs directe product-context
- robots.txt laat alle AI-crawlers toe
- Bing sitemap-indiening → ChatGPT web search index

**4. Interne linkstructuur:**
- Probleemoplossing-pagina's linken naar feature-pagina's
- Feature-pagina's linken naar blog-tutorials
- Blog-tutorials linken terug naar product
- Pricing linkt naar How It Works
- FAQ linkt naar probleemoplossing-pagina's

**5. Conversie-logica:**
- Hoogste traffic (head keywords) → tool direct beschikbaar
- Hoogste intentie (probleemoplossing) → directe uitleg + CTA naar AI transcription
- Developer-doelgroep (RAG, JSON, LangChain) → technische diepgang + code snippets
- Vergelijkingsbezoeker (downsub alternative) → eerlijke vergelijking + zachte CTA

---

*Volgende stap: onderzoek + schrijven per artikel, één of twee tegelijk, volledig uitgeschreven met bronverwijzingen.*

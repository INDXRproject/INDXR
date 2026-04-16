# INBOX — Strategische update voor Claude Code
*Aangemaakt: 2026-04-16 | Verwerk dit volledig voordat je nieuwe taken oppakt*

---

## Wat dit document is

Dit is de output van een uitgebreide strategische sessie in Claude Desktop. Het bevat:
1. Definitieve beslissingen over pricing, features en UX
2. Een complete sitemap voor de website
3. Een writing framework voor alle content
4. Drie volledig uitgeschreven SEO-artikelen klaar voor implementatie
5. Technische bestanden (llms.txt, robots.txt)
6. Instructies voor jou om alles te verwerken

**Verwerk sectie voor sectie. Begin met de wiki-updates (kennis), dan de technische bestanden, dan de content-implementatie.**

---

## SECTIE 1 — Beslissingen om te documenteren in de wiki

### 1A. Pricing herstructurering (update wiki/business/pricing.md en ADR-012)

De pricing-structuur wijzigt van 5 gelijkwaardige tiers naar een 3+2 model:

**3 prominente tiers (volledige kaarten op pricing-pagina):**
- Basic: €6.99 / 500 credits / €0.014 per credit
- Plus ★: €13.99 / 1.200 credits / €0.012 per credit (Most Popular badge)
- Pro: €27.99 / 2.800 credits / €0.010 per credit

**2 stille tiers (subtiele links onder de kaarten):**
- Starter: €2.99 / 150 credits — "Need fewer credits?"
- Power: €54.99 / 6.000 credits — "Processing larger volumes?"

**Rationale:** Keuzeparalyse reduceren. Geen prijsvechter zijn. Kleine prijsstijging gerechtvaardigd door premium features (RAG JSON, verbeterde exports). Try verdwijnt als primaire optie maar blijft beschikbaar. Welkomstcredits blijven 25.

### 1B. RAG JSON Export (update wiki/decisions/015-rag-json-export.md)

**Status:** Geaccepteerd — implementatie gepland

**UX-beslissing:** RAG JSON is een toggle-optie op elke extractiemethode, niet een apart tabblad.
- Single Video tab: toggle "Export as RAG-ready JSON" onder de "Generate with AI" toggle
- Playlist tab: per-video toggle naast de bestaande AI Transcription toggle, plus een globale "Export all as RAG JSON" optie
- Audio Upload tab: toggle onder de dropzone
- Library: bestaande transcripts kunnen worden geëxporteerd als RAG JSON (alleen export-kosten, geen herextractie)

**Pricing:** 1 credit per 15 minuten video (naar boven afgerond, minimum 1 credit)
- 0–15 min: 1 credit
- 16–30 min: 2 credits
- 31–60 min: 4 credits
- 61–120 min: 8 credits
- Eerste 3 RAG exports: gratis

**Kwaliteitswaarschuwing in UI:** Wanneer RAG JSON wordt ingeschakeld op een auto-caption transcript, toon een inline waarschuwing: "For best RAG quality, enable AI Transcription. Auto-captions lack punctuation, which reduces chunk coherence." Gebruiker mag toch doorgaan.

**Schema (definitief):**
```json
{
  "version": "1.0",
  "video": {
    "video_id": "...",
    "title": "...",
    "channel": "...",
    "source_url": "...",
    "duration": 3612,
    "language": "en",
    "is_auto_generated": false,
    "transcript_source": "assemblyai"
  },
  "chunking_config": {
    "strategy": "time_based_sentence_snap",
    "target_duration_seconds": 120,
    "overlap_seconds": 18,
    "total_chunks": 31
  },
  "chunks": [
    {
      "chunk_id": "{video_id}_chunk_000",
      "chunk_index": 0,
      "text": "...",
      "start_time": 0.0,
      "end_time": 118.4,
      "start_time_formatted": "00:00:00",
      "end_time_formatted": "00:01:58",
      "deep_link": "https://youtu.be/{video_id}?t=0",
      "token_count_estimate": 312,
      "chapter_title": "Introduction",
      "metadata": {
        "video_id": "...",
        "title": "...",
        "channel": "...",
        "chunk_index": 0,
        "total_chunks": 31,
        "start_time": 0.0,
        "end_time": 118.4,
        "chapter_title": "Introduction",
        "language": "en"
      }
    }
  ]
}
```

**Chunk-groottes configureerbaar:** 30s, 60s, 90s, 120s (default). Overlap altijd 15% van chunk-duur.

### 1C. Export-optimalisaties (update wiki/roadmap/backlog.md en wiki/roadmap/priorities.md)

De volgende export-verbeteringen zijn besloten en moeten in backlog/priorities:

**JSON standaard export (hoge prioriteit):**
- Hernoem `offset` → `start` (compatibiliteit met youtube-transcript-api standaard)
- Voeg `end` toe per segment (= start + duration)
- Voeg metadata wrapper toe: `{video: {video_id, title, channel, url, duration, language, is_auto_generated}, segments: [...]}`

**Markdown export:**
- Voeg YAML frontmatter toe aan beide Markdown-varianten (plain + timestamps)
- Fields: title, source, channel, duration (seconden), language, type: youtube, created, tags

**CSV export:**
- Voeg kolommen toe: segment_index, end_time (= start + duration), word_count
- Voor playlist-exports: video_id en video_title als eerste kolommen
- UTF-8 BOM voor Excel-compatibiliteit

**SRT/VTT export:**
- Resegmentatie: combineer 2-5 seconden micro-segmenten tot 3-7 seconden blokken
- Max 42 karakters per regel, max 2 regels
- UTF-8 BOM

**TXT export:**
- Voor AssemblyAI-transcripten: optionele "Clean" mode met filler-word removal (um, uh, hmm, er, erm)

### 1D. has_ever_purchased blocker (bevestiging — staat al in priorities.md)

Geen wijziging aan de beslissing. Wel toevoegen aan wiki: dit is een hard blocker voor launch. Stripe webhook moet `has_ever_purchased = true` opslaan bij succesvolle betaling.

### 1E. Anonieme gebruikers — gating-beslissing (bevestigen in ADR-014)

Definitieve beslissing: geen extra gating.
- Anoniem: TXT plain + TXT timestamps + kopiëren. Rate-limited op 10/dag.
- Alle andere exportformaten (Markdown, CSV, SRT, VTT, JSON, RAG JSON): vereisen ingelogd account (ook gratis account).
- Geen email-gate voor het tonen of downloaden van TXT.

---

## SECTIE 2 — Nieuwe bestanden aanmaken in de wiki

### 2A. Maak wiki/business/seo-content-plan.md aan

Inhoud: de volledige sitemap die in deze sessie is uitgewerkt. Zie het INDXR-SITEMAP.md bestand dat beschikbaar is gesteld (of vraag Khidr om het pad). Kernelementen:

**32 pagina's totaal, 8 categorieën:**
- Kernpagina's: /, /how-it-works, /pricing, /faq
- SEO tool-pagina's: 8 bestaande pagina's (verbeteren)
- Feature-pagina's: 5 nieuwe pagina's (markdown, json, for-rag, obsidian, csv)
- Probleemoplossing: 3 nieuwe pagina's (not-available, members-only, age-restricted)
- Vergelijkingspagina's: 5 pagina's (downsub P0, notegpt P1, turboscribe P1, tactiq P2, happyscribe P2)
- Blog/tutorials: 4 pagina's
- Technisch: llms.txt, robots.txt, sitemap.xml

**Prioriteitsvolgorde voor implementatie:**
1. /youtube-transcript-not-available (P0 — hoogste conversie-intentie)
2. /youtube-transcript-markdown (P0 — near-zero concurrentie)
3. /youtube-transcript-for-rag (P0 — emerging keyword, nul commerciële concurrent)
4. /alternative/downsub (P0 — 2.6M bezoeken/mnd doelwit)
5. Landing page herschrijven
6. /how-it-works (nieuw)
7. Overige feature-pagina's en vergelijkingspagina's

### 2B. Maak wiki/business/writing-framework.md aan

Dit framework geldt voor alle INDXR.AI content. Kernregels:

**Toon:** Senior engineer aan peer, technisch precies, definitieve taal (geen "may/might/could"), max 3 productmeldingen per artikel, product pas na waardecreatie.

**Pagina-anatomie:**
- Tool-landingspagina: 800-1.200 woorden
- Tutorial/how-to: 1.500-2.500 woorden
- Probleemoplossing: 1.200-2.000 woorden
- Vergelijkingspagina: 1.000-1.500 woorden

**Verplichte elementen elke pagina:** Antwoord in eerste 25 woorden, H2's als vragen, vergelijkingstabel waar relevant, FAQ-sectie (min 4 vragen), min 2 interne links, min 1 statistiek per 300 woorden.

**Verboden:** "In today's digital landscape...", superlatieven zonder bewijs, FAQ-antwoorden die verwijzen naar "see above", meer dan 3 productmeldingen.

**Schema per pagina-type:**
- Tool-pagina: SoftwareApplication + FAQPage
- Feature-pagina: SoftwareApplication + HowTo + FAQPage
- Probleemoplossing: Article + FAQPage + HowTo
- Vergelijkingspagina: Article + FAQPage
- Blog/tutorial: Article + HowTo + FAQPage

---

## SECTIE 3 — Technische bestanden aanmaken

### 3A. Maak /llms.txt aan in de root van de Next.js public folder

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
- Starter: €2.99 / 150 credits
- Basic: €6.99 / 500 credits
- Plus: €13.99 / 1,200 credits (most popular)
- Pro: €27.99 / 2,800 credits
- Power: €54.99 / 6,000 credits
- 25 free credits on signup. Free caption extraction (single videos, anonymous).

## RAG JSON Export

INDXR.AI exports YouTube transcripts as RAG-optimized JSON with 90-120 second chunks,
sentence-boundary snapping, timestamps per chunk, chapter metadata, and a deep_link
field per chunk (youtu.be/ID?t=N). Compatible with LangChain, LlamaIndex, Pinecone,
ChromaDB, Weaviate, and Qdrant. Cost: 1 credit per 15 minutes.

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

### 3B. Update robots.txt

```
User-agent: *
Allow: /
Disallow: /api/
Disallow: /dashboard/
Disallow: /admin/
Disallow: /transcribe/
Disallow: /library/

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

User-agent: CCBot
Disallow: /

User-agent: Meta-ExternalAgent
Disallow: /

Sitemap: https://indxr.ai/sitemap.xml
```

### 3C. Update sitemap.ts

Voeg gesegmenteerde sitemaps toe:
- sitemap-pages.xml: kernpagina's + tool-pagina's
- sitemap-features.xml: feature-pagina's + probleemoplossing
- sitemap-comparisons.xml: alternative-pagina's
- sitemap-blog.xml: blog/tutorials

Dien sitemap in bij zowel Google Search Console als Bing Webmaster Tools.

---

## SECTIE 4 — Content-bestanden implementeren

Khidr zal de volgende Markdown-bestanden aanleveren (of ze zijn beschikbaar als downloads uit de Claude Desktop-sessie). Implementeer ze als Next.js-pagina's op de bijbehorende slugs:

### 4A. ARTIKEL-youtube-transcript-not-available.md → /youtube-transcript-not-available

Volledig artikel ~1.900 woorden. Bevat:
- YAML-like header met meta title, meta description, schema, internal links
- Artikel-body in Engels, publiceerklaar
- FAQ-sectie met 8 vragen

**Implementatie:**
- Maak `src/app/youtube-transcript-not-available/page.tsx` aan
- Gebruik bestaand SEO-landing-page patroon (zie /youtube-transcript-generator als referentie)
- Voeg toe: Article + FAQPage + HowTo schema markup
- Verwerk interne links naar /youtube-transcript-generator, /audio-to-text, /youtube-members-only-transcript, /youtube-age-restricted-transcript

### 4B. ARTIKEL-youtube-transcript-markdown.md → /youtube-transcript-markdown

Volledig artikel ~1.700 woorden. Bevat YAML frontmatter codeblok, Obsidian Dataview queries, Notion import workflow.

**Implementatie:**
- Maak `src/app/youtube-transcript-markdown/page.tsx` aan
- Schema: SoftwareApplication + HowTo + FAQPage
- Interne links: /youtube-transcript-obsidian, /how-it-works, /pricing

### 4C. ARTIKEL-youtube-transcript-for-rag.md → /youtube-transcript-for-rag

Volledig artikel ~2.200 woorden. Bevat JSON schema, Python code snippets voor LangChain/LlamaIndex/Pinecone.

**Implementatie:**
- Maak `src/app/youtube-transcript-for-rag/page.tsx` aan
- Schema: SoftwareApplication + HowTo + FAQPage
- Interne links: /youtube-transcript-json, /blog/chunk-youtube-transcripts-for-rag, /pricing

---

## SECTIE 5 — Schema markup component

Maak een herbruikbare `<JsonLd>` server component in `src/components/seo/JsonLd.tsx`:

```typescript
// Accepts een array van schema-objecten, rendert als <script type="application/ld+json">
// Gebruik op elke pagina met page-specifieke data
```

Templates per pagina-type:
- SoftwareApplication: voor tool- en feature-pagina's
- Article + dateModified: voor blog, probleemoplossing, vergelijking
- FAQPage: elke pagina met FAQ-sectie
- HowTo: tutorials en feature-pagina's
- Organization: homepage

---

## SECTIE 6 — Wiki-bestanden bijwerken

Na verwerking van bovenstaande, update de volgende bestaande wiki-bestanden:

- **wiki/business/pricing.md**: Nieuwe tier-structuur (zie 1A)
- **wiki/decisions/012-pricing-tiers.md**: Status → geaccepteerd, nieuwe bedragen
- **wiki/decisions/015-rag-json-export.md**: Definitieve spec (zie 1B)
- **wiki/roadmap/priorities.md**: SEO-artikelen en content-pagina's toevoegen aan PRE-LAUNCH sectie
- **wiki/roadmap/backlog.md**: Export-optimalisaties als concrete taken toevoegen (zie 1C)
- **wiki/business/marketing.md**: SEO-content-plan link toevoegen, llms.txt en robots.txt documenteren
- **STATUS.md**: Export formats sectie updaten met nieuwe formats en RAG JSON

---

## SECTIE 7 — Volgorde van uitvoering

Verwerk in deze volgorde:

1. **Wiki-updates** (Sectie 1 + 2): Kennis vastleggen voordat je bouwt
2. **Technische bestanden** (Sectie 3): llms.txt, robots.txt, sitemap
3. **Schema markup component** (Sectie 5): Bouwsteen die alle content-pagina's nodig hebben
4. **Content-pagina's** (Sectie 4): Drie artikelen implementeren
5. **Wiki afronden** (Sectie 6): STATUS en ROADMAP bijwerken

---

## NOTITIES VOOR KHIDR

Na verwerking door Claude Code:
- Controleer de drie geïmplementeerde artikel-pagina's op indxr.ai
- Stel Google Search Console in en dien sitemap in
- Dien sitemap ook in bij Bing Webmaster Tools (ChatGPT gebruikt Bing-index)
- Volgende batch artikelen plannen: /youtube-transcript-json, /alternative/downsub, landing page herschrijven

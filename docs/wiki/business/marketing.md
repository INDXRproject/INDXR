# Marketing & Groei

## SEO (Phase I — gepland Q2 2025)

### URL Structuur

De applicatie heeft meerdere `/youtube-*` landing pages, elk gericht op een specifiek zoekterm-cluster:

| Route | Target zoekterm |
|-------|----------------|
| `/youtube-transcript-extractor` | "youtube transcript extractor" |
| `/youtube-to-text` | "youtube to text" |
| `/youtube-captions-download` | "youtube captions download" |
| `/youtube-transcript-json-api` | "youtube transcript json api" / "youtube transcript for rag" *(gepland)* |
| `/youtube-transcript-for-ai` | "youtube transcript for chatgpt" / "youtube transcript for llm" *(gepland)* |
| *(andere routes in src/app/)* | Long-tail varianten |

**Strategie:** Elke pagina heeft unieke content, meta-tags, en structured data. De free-tool component werkt op deze pagina's zonder login (rate-limited op IP: 10 extractions/dag).

### Content SEO

- FAQ secties per landing page
- Voorbeelden met echte YouTube transcripten
- Structured data (Schema.org: SoftwareApplication, HowTo, Article, FAQPage, Organization)
- Sitemap automatisch via Next.js

**SEO content pages (gebouwd 2026-04-16):**

| Route | Template | Auteur |
|-------|----------|--------|
| `/youtube-transcript-not-available` | ArticleTemplate | indxr-editorial |
| `/youtube-members-only-transcript` | ArticleTemplate | indxr-editorial |
| `/youtube-age-restricted-transcript` | ArticleTemplate | indxr-editorial |
| `/youtube-transcript-markdown` | ToolPageTemplate | sarah-lindqvist |
| `/youtube-transcript-obsidian` | ToolPageTemplate | sarah-lindqvist |
| `/youtube-transcript-csv` | ToolPageTemplate | alex-mercer |
| `/youtube-srt-download` | ToolPageTemplate | indxr-editorial |
| `/youtube-transcript-json` | ToolPageTemplate | alex-mercer |
| `/youtube-transcript-for-rag` | ToolPageTemplate | alex-mercer |

**SEO content infrastructure (gebouwd 2026-04-16):**

| Component | Locatie | Doel |
|---|---|---|
| `JsonLd` server component | `src/components/seo/JsonLd.tsx` | Rendert `<script type="application/ld+json">` per pagina |
| Authors config | `src/lib/authors.ts` | Alex Mercer (RAG/dev), Sarah Lindqvist (PKM), INDXR Editorial |
| `AuthorCard` component | `src/components/content/AuthorCard.tsx` | Toont auteur + publicatiedatums op contentpagina's |
| `ArticleTemplate` | `src/components/content/templates/` | Layout voor blogs, vergelijkingen, troubleshooting — schema: Article + FAQPage |
| `ToolPageTemplate` | idem | Layout voor tool-pagina's — schema: SoftwareApplication + FAQPage |
| `TutorialTemplate` | idem | Layout voor tutorials — schema: Article + HowTo + FAQPage |
| `HeroImage` component | `src/components/HeroImage.tsx` | Light/dark hero image slot op homepage — swap via Image-to-Image na redesign |

**SEO content pages (gebouwd 2026-04-16, batch 2):**

| Route | Template | Auteur |
|-------|----------|--------|
| `/alternative/downsub` | ArticleTemplate | indxr-editorial |
| `/alternative/notegpt` | ArticleTemplate | indxr-editorial |
| `/alternative/turboscribe` | ArticleTemplate | indxr-editorial |
| `/alternative/tactiq` | ArticleTemplate | indxr-editorial |
| `/alternative/happyscribe` | ArticleTemplate | indxr-editorial |
| `/youtube-to-text` | ToolPageTemplate | indxr-editorial |
| `/youtube-playlist-transcript` | ToolPageTemplate | indxr-editorial |
| `/bulk-youtube-transcript` | ToolPageTemplate | indxr-editorial |
| `/audio-to-text` | ToolPageTemplate | indxr-editorial |
| `/youtube-transcript-without-extension` | ArticleTemplate | indxr-editorial |
| `/how-it-works` | ArticleTemplate | indxr-editorial |
| `/blog/chunk-youtube-transcripts-for-rag` | TutorialTemplate | alex-mercer |

Zie `docs/wiki/business/seo-content-plan.md` voor de volledige sitemap (32 pagina's, 8 categorieën) en implementatievolgorde.

**Datum-conventie voor contentpagina's:** zie `docs/DEVELOPMENT.md` → Design System → Content dates.

### SEO Blogposts (gepland)

- "How to Build a YouTube Knowledge Base with INDXR.AI + LangChain" *(aan te maken na RAG-export implementatie — zie [ADR-015](../decisions/015-rag-json-export.md))*
- "YouTube Transcript JSON Format for Vector Databases — Complete Guide" *(idem)*

---

## Conversie Funnel

### Anonieme gebruiker

```
Anonieme bezoeker (SEO / social / referral)
  → Gebruikt free tool (captions extractie, 10/dag)
  → Ziet playlist-preview met volledige metadata + credit-kostenberekening
  → Ziet "3 gratis video's" label + "Maak gratis account + 25 credits" CTA
  → Registreert
  → Gebruikt 25 welcome credits (kleine playlist of AI-transcriptie)
  → Tweede taak triggert eerste credit-aankoop (Try = €2.49)
```

### Conversion prompt voorbeeld (21-video playlist, anoniem)

> "3 video's gratis. 18 resterende = 18 credits.
> Maak nu een gratis account en krijg 25 credits — genoeg voor deze volledige playlist.
> [Gratis account aanmaken]"

**Aanpak:** Toon alles (metadata, titels, duur, credit-kosten, welke video's AI-transcriptie nodig hebben) maar blokkeer de extractie-knop voor anonieme gebruikers. Maximum FOMO — de gebruiker ziet exact wat ze zouden krijgen.

Zie [ADR-013](../decisions/013-welcome-credits-freemium.md) en [ADR-010](../decisions/010-playlist-pricing.md).

---

## Marketing Copy Anchors

Gevalideerde messaging-angles voor de pricing-pagina en website:

| Angle | Copy | Waarom het werkt |
|-------|------|-----------------|
| Tijdsbesparing | "Extract een 50-video playlist in 60 seconden. Handmatig? Dat is 3+ uur kopiëren." | Kwantificeert de waardepropositie |
| Per-unit framing | "Elk transcript kost minder dan €0.02." | Klein-eenheid framing verhoogt betalingsbereidheid (Gourville-onderzoek: +73%) |
| Loss framing | "Stop met uren verspillen aan transcripten één voor één kopiëren." | Verliesaversie werkt sterker dan gain framing |
| Anchoring | "Een VA zou €50+ rekenen voor hetzelfde werk." | Prijsankering tegen dure alternatieven |
| No-subscription | "Koop credits eenmalig. Gebruik wanneer je wil. Ze verlopen nooit." | Adresseert klacht #1 (subscription fatigue) |
| Nauwkeurigheid | "YouTube auto-captions: 60% nauwkeurig. Onze AI-transcriptie: 99%." | Differentieert AI-transcriptie van gratis caption-extractie |
| No-extension | "Werkt in elke browser. Geen Chrome-extensie nodig. Plak een URL, krijg een transcript." | Adresseert klacht #4 (extension dependency) |

---

## Channel Transcriptie — FAQ & SEO

### Waarom geen directe "heel kanaal transcriberen" functie?

INDXR.AI ondersteunt momenteel geen directe kanaalextractie (één klik → heel YouTube-kanaal). Dit is een architectuurbeslissing:

- Sommige kanalen hebben 2.000+ video's
- Batch-verwerking op die schaal vereist een queue-systeem (Redis/BullMQ of Supabase Realtime) en prioriteitsmanagement
- De huidige polling-architectuur (ADR-008) is niet ontworpen voor jobs van meerdere uren
- Geteste maximum voor playlists: ~100 video's per job

**Workaround voor gebruikers (te communiceren als FAQ en SEO-content):**
> "INDXR.AI ondersteunt geen directe kanaalextractie, maar je kunt eenvoudig een publieke playlist maken van je kanaalselectie in YouTube en die playlist-URL in INDXR.AI invoeren. Verwerk in batches van maximaal 100 video's voor de beste prestaties."

**SEO-kansen:**
- FAQ-pagina: "Can INDXR.AI transcribe a whole YouTube channel?"
- Blog: "How to Transcribe a YouTube Channel — Step-by-Step Workaround"
- Intern link naar playlist-feature

**Wanneer directe kanaalextractie implementeren:**
- Na implementatie van async job queue
- Prioriteit: post-launch (zie `wiki/roadmap/backlog.md`)

---

## Analytics Setup

**PostHog** voor product analytics (niet Google Analytics):

Frontend events (automatisch):
- Paginaweergaven, navigatie
- Feature-gebruik (button clicks, tab switches)
- User identify bij login

Backend events (handmatig getracked):
- `credits_purchased` — bij Stripe webhook
- `credits_deducted` — per verbruik
- `summarization_completed` — per samenvatting

**Post-launch:** Google Analytics / Search Console instellen voor SEO-monitoring. Google Ads campagne voor US-markt, longtail keywords (zie roadmap backlog).

---

## Toekomstige Groeikanalen

- **Notion/Obsidian integraties** — export direct naar knowledge management tools
- **Zapier integratie** — automatisering voor power users
- **Referral program** — 5 credits referrer + 5 credits referee (abuse-preventie nog niet uitgewerkt)
- **Channel extractie** — directe kanaal-transcriptie (vereist queue-architectuur)
- **Google Ads (US)** — longtail keyword campagne post-launch

---

## Kosten-structuur (bij schaal)

| Component | Kosten |
|-----------|--------|
| Vercel (frontend) | Gratis tier → Pro bij schaal |
| Railway (backend) | ~$5–20/maand voor basis |
| Supabase | Gratis tier → Pro bij schaal |
| Upstash Redis | Pay-per-use (laag) |
| AssemblyAI | $0.21/uur audio ($0.0035/min) |
| DeepSeek API | Per token (erg laag, ~€0.001/samenvatting) |
| IPRoyal proxy | ~$2.50/GB (schaalprijs) |
| Stripe | 1.4% + €0.25 per transactie (EU) |

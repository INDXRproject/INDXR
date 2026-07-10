# Marketing & Groei

> **Structuur-update 2026-05-03:** URL-architectuur is herzien. SEO-content verhuist van top-level routes naar `/articles/[slug]` (Werksessie B). Comparison pages (`/alternative/*`) worden verwijderd. Zie [ADR-033](../decisions/033-three-layer-site-architecture.md) t/m [ADR-039](../decisions/039-llms-txt-low-priority.md) voor de rationale. Dit document beschrijft de SEO-strategie en marketing-principes — niet de URL-structuur (zie `docs/wiki/architecture/sitemap.md`).

---

## SEO-strategie

### Aanpak

INDXR.AI richt zich op problem-aware zoekintentie: mensen die een specifiek YouTube-transcript-probleem hebben en een oplossing zoeken. De content-strategie focust op:

- **Long-tail keywords** per specifiek probleem of format (`youtube transcript to markdown`, `bulk youtube transcript`, `youtube members-only transcript`)
- **Problem-first framing**: pagina's beginnen met het probleem dat de gebruiker ervaart, niet met product-features
- **Structured data**: `SoftwareApplication`, `FAQPage`, `Article`, `HowTo` schemas op alle content-pagina's

### Content-infrastructuur (gebouwd)

| Component | Locatie | Doel |
|-----------|---------|------|
| `JsonLd` server component | `src/components/seo/JsonLd.tsx` | Injecteert JSON-LD schemas in `<head>` |
| `AuthorCard` | `src/components/content/AuthorCard.tsx` | Byline + publicatiedatums op alle contentpagina's |
| `ArticleTemplate` | `src/components/content/templates/` | Blog, vergelijkingen, troubleshooting — schema: Article + FAQPage |
| `ToolPageTemplate` | idem | Tool-landingspagina's — schema: SoftwareApplication + FAQPage |
| `TutorialTemplate` | idem | Stap-voor-stap tutorials — schema: Article + HowTo + FAQPage |
| Authors config | `src/lib/authors.ts` | Één auteur: INDXR Editorial |

### Huidige content-pagina's

**Transcriptie-troubleshooting (top-level, worden `/articles/*` in Werksessie B):**

| Route | Template |
|-------|----------|
| `/youtube-transcript-not-available` | ToolPageTemplate |
| `/youtube-members-only-transcript` | ArticleTemplate |
| `/youtube-age-restricted-transcript` | ArticleTemplate |
| `/youtube-transcript-non-english` | ToolPageTemplate |
| `/youtube-transcript-without-extension` | ArticleTemplate |

**Format + workflow (top-level, worden `/articles/*` in Werksessie B):**

| Route | Template |
|-------|----------|
| `/youtube-to-text` | ToolPageTemplate |
| `/youtube-transcript-markdown` | ToolPageTemplate |
| `/youtube-transcript-obsidian` | ToolPageTemplate |
| `/youtube-transcript-csv` | ToolPageTemplate |
| `/youtube-srt-download` | ToolPageTemplate |
| `/youtube-transcript-json` | ToolPageTemplate |
| `/youtube-transcript-for-rag` | ToolPageTemplate |
| `/youtube-playlist-transcript` | ToolPageTemplate |
| `/bulk-youtube-transcript` | ToolPageTemplate |
| `/audio-to-text` | ToolPageTemplate |

**Blog-artikelen (onder `/blog/*`, worden `/articles/*` in Werksessie B):**

| Route | Template |
|-------|----------|
| `/blog/chunk-youtube-transcripts-for-rag` | ArticleTemplate |
| `/blog/youtube-channel-knowledge-base` | ArticleTemplate |
| `/blog/youtube-transcripts-vector-database` | ArticleTemplate |

**Comparison pages — worden VERWIJDERD (zie [ADR-037](../decisions/037-no-comparison-pages.md)):**  
`/alternative/downsub`, `/alternative/notegpt`, `/alternative/turboscribe`, `/alternative/tactiq`, `/alternative/happyscribe`

---

## Conversie Funnel

### Anonieme gebruiker

```
Anonieme bezoeker (SEO / social / referral)
  → Gebruikt free tool (caption-extractie, gratis)
  → Ziet playlist-preview met metadata + credit-kostenberekening
  → Ziet "3 gratis video's" label + "Maak gratis account + 25 credits" CTA
  → Registreert
  → Gebruikt 25 welcome credits (kleine playlist of AI-transcriptie)
  → Tweede taak triggert eerste credit-aankoop (Test = €3,49)
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
| Per-unit framing | "Elk transcript kost minder dan €0.02." | Klein-eenheid framing verhoogt betalingsbereidheid |
| Loss framing | "Stop met uren verspillen aan transcripten één voor één kopiëren." | Verliesaversie werkt sterker dan gain framing |
| Anchoring | "Een VA zou €50+ rekenen voor hetzelfde werk." | Prijsankering tegen dure alternatieven |
| No-subscription | "Koop credits eenmalig. Gebruik wanneer je wil. Ze verlopen nooit." | Adresseert subscription fatigue |
| Nauwkeurigheid | "YouTube auto-captions: 60% nauwkeurig. Onze AI-transcriptie: 99%." | Differentieert AI-transcriptie van gratis caption-extractie |
| No-extension | "Werkt in elke browser. Geen Chrome-extensie nodig. Plak een URL, krijg een transcript." | Adresseert extension-dependency klacht |

---

## Channel Transcriptie — FAQ & SEO

### Waarom geen directe "heel kanaal transcriberen" functie?

INDXR.AI ondersteunt geen directe kanaalextractie (één klik → heel YouTube-kanaal). Dit is een architectuurbeslissing:

- Sommige kanalen hebben 2.000+ video's
- Batch-verwerking op die schaal vereist een queue-systeem en prioriteitsmanagement
- Geteste maximum voor playlists: ~100 video's per job

**Workaround voor gebruikers (te communiceren als FAQ en SEO-content):**
> "INDXR.AI ondersteunt geen directe kanaalextractie, maar je kunt eenvoudig een publieke playlist maken van je kanaalselectie in YouTube en die playlist-URL in INDXR.AI invoeren. Verwerk in batches van maximaal 100 video's voor de beste prestaties."

**SEO-kansen:**
- FAQ-pagina: "Can INDXR.AI transcribe a whole YouTube channel?"
- Article: "How to Transcribe a YouTube Channel — Step-by-Step Workaround"
- Intern link naar playlist-feature

**Wanneer directe kanaalextractie implementeren:** post-launch, na evaluatie van ARQ job queue capaciteit (zie backlog).

---

## Analytics Setup

**PostHog** voor product analytics:

Frontend events (automatisch):
- Paginaweergaven, navigatie
- Feature-gebruik (button clicks, tab switches)
- User identify bij login

Backend events (handmatig getracked):
- `credits_purchased` — bij Stripe webhook
- `credits_deducted` — per verbruik
- `summarization_completed` — per samenvatting

**Post-launch:** Google Search Console instellen voor SEO-monitoring.

---

## Toekomstige Groeikanalen

- **Audience hubs** — `/for/researchers`, `/for/educators` etc. (post-launch, op basis van PostHog-data — zie [ADR-038](../decisions/038-no-audience-hubs.md))
- **Notion/Obsidian integraties** — export direct naar knowledge management tools
- **Zapier integratie** — automatisering voor power users
- **Referral program** — 5 credits referrer + 5 credits referee
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
| DeepSeek API | Per token (~€0.001/samenvatting) |
| Decodo proxy | Residentieel, sticky sessions — zie [ADR-017](../decisions/017-proxy-provider-decodo.md) |
| Stripe | 1.4% + €0.25 per transactie (EU) |

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

### Differentiator: originele caption-taal (native-anchored) — hoge-intentie/lage-concurrentie hoek

**Kans (geverifieerd 2026-07-12):** "YouTube geeft de verkeerde caption-taal" is een al jaren bestaand, breed gefrustreerd probleem dat Google niet oplost — YouTube's default-caption-picker kiest onbetrouwbaar tussen de (vaak tientallen) tracks op een video: origineel + machine- + community-vertalingen. Mensen zoeken hier actief op. Bestaande tools/concurrenten lossen het **niet** op: `youtubetotranscript.com` geeft voor `Bm1RhjcdJek` (Napoleon, Engelse audio) óók **Albanees** — een menselijke community-vertaling. INDXR's **native-anchored extractie** (zie [ai-pipeline.md](../architecture/ai-pipeline.md) — ankert op `info['language']` + de `-orig`-ASR-marker, nooit een `tlang=`-vertaling) levert nu wél de originele taal, met AI-transcriptie in de echte audiotaal als vangnet. → onderscheidend, hoge-intentie, lage-concurrentie.

**Keyword-cluster:** `youtube transcript wrong language`, `get original language transcript youtube`, `youtube captions showing wrong language`, `youtube transcript showing translation not original`, `youtube auto captions wrong language`.

**TAAK (blocked op tooling):** check deze keyword-cluster in **Google Search Console** zodra GSC live is (impressions/positie/CTR). INDXR kan GSC-data **niet** publiek/programmatisch opvragen — dit vereist geverifieerde domein-toegang (Khidr, via de GSC-property van `indxr.ai`). Pas ná GSC-data beslissen hoeveel content-gewicht deze hoek krijgt.

**Al gedaan (2026-07-12):** Q&A toegevoegd op de FAQ-pagina (`apps/marketing/src/app/docs/help/faq/page.tsx`, categorie "YouTube Transcripts") — draagt FAQPage-schema. Bestaand artikel `/youtube-transcript-non-english` is een kandidaat om met deze "wrong language vs original"-hoek te verbreden. Long-form SEO-artikel staat in [backlog.md](../roadmap/backlog.md#acquisitie--marketing) (Fase-3 SEO).

---

### SRT als funnel-haak (noteren voor latere SEO/copy-fase — niet nu bouwen)

**Kans:** YouTube auto-captions halen slechts **60–70% nauwkeurigheid** — ~1 op de 3 woorden fout, oplopend tot **~67% fout op vakjargon** en **~45% fout op eigennamen**. INDXR's **AI-transcriptie (~99%)** levert een directe, nauwkeurige **SRT-export**.

**Positionering:** frame **"accurate 99%-SRT inbegrepen"** als reden om via INDXR te transcriberen — **geen aparte prijslijn**. SRT is meerwaarde bij het betaalde AI-transcriptieproduct (de pay-funnel): auto-caption-SRT is gratis maar onnauwkeurig; wie een bruikbare, publiceerbare SRT wil, transcribeert met AI (1 cr/min).

**Onderbouwing voor copy:** **WCAG-AA vereist ≥99% accuracy** op prerecorded content — auto-captions halen dat bij lange na niet; INDXR's AI-transcriptie wel. Dit is een harde, citeerbare accessibility-grond.

**Status:** copy/SEO-notitie voor Fase-3 — niet nu bouwen. Sluit aan op de "Nauwkeurigheid"-copy-anchor hieronder.

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

## Betaalde zoekcampagne (Ads) — richtlijnen

Afgeleid uit de keyword-meting van 2026-08-02 (bron + cijfers: [keyword-demand-2026-08.md](keyword-demand-2026-08.md)). Nog niet live; dit zijn de vastgelegde keuzes vóór de campagne draait.

- **Geo-targeting = US + CA + AU**, expliciet **zónder VK** en zonder de andere geblokkeerde landen (ADR-062: `GB/CH/KR/TR/IN/BR/UY/OM/RS`). India is de grootste zoekmarkt maar kan niet afrekenen → niet targeten. ~44% van de meetbare wereldvraag is structureel niet-converteerbaar.
- **Niet bieden op de kop** (`youtube transcript` e.d.): de top-10 is een gratis-markt (tien concurrenten met "Free" in de title) tegen ~€1,30/klik. Gratis caption-extractie is onze funnel, maar die haal je **organisch** binnen.
- **Niet bieden op concurrentmerken** (notegpt/tactiq/turboscribe/downsub/…): legaal maar het onderschept wie expliciet om een ánder product vroeg — botst met ihsaan + [ADR-037](../decisions/037-no-comparison-pages.md). Merken gaan juist als **negatief** in de campagne.
- **Verplichte negatieven:**
  - Merken: `notegpt`, `tactiq`, `turboscribe`, `downsub`, `youtubetranscript`, `youtubetotranscript`, `ytscribe`, `kome`, `transcript.io`.
  - Ondertitel-piraterijbuurt (uit de `srt`/`subtitle`-seed): `subscene`, `opensubtitles`, `yify`, `yts`, `movie`, `series`.
  - `api` — wij hebben geen publieke API (zelfde grond als [ADR-039](../decisions/039-llms-txt-low-priority.md)).
- **Waar de vraag wél zit:** het `video to text`-cluster (~19k+ impressies, groter dan de hele YouTube-transcript-staart) → het terrein van `/articles/audio-to-text` (betaald AI-transcriptieproduct). Prioriteitskandidaat.
- **Long-tail workflow-termen** (playlist/bulk/rag/srt/markdown/obsidian/csv/json) waren in Bing **niet meetbaar** (meetgrens, geen afwezige vraag) → valideren via Google Keyword Planner + het search terms report zodra de campagne draait, niet vanuit deze meting concluderen.
- **Niet-Engelse vraag** (Spaans 17k, Indonesisch, JP/CN) raakt de native-anchored differentiator, maar de site is Engels-only en het gros komt uit (deels geblokkeerd) Latijns-Amerika → **kans, geen actie zonder omzetdata**.

---

## Toekomstige Groeikanalen

- **Audience hubs** — `/for/researchers`, `/for/educators` etc. (post-launch, op basis van PostHog-data — zie [ADR-038](../decisions/038-no-audience-hubs.md))
- **Notion/Obsidian integraties** — export direct naar knowledge management tools
- **Zapier integratie** — automatisering voor power users
- **Referral program** — 5 credits referrer + 5 credits referee
- **Channel extractie** — directe kanaal-transcriptie (vereist queue-architectuur)
- **Google Ads (US + CA + AU)** — longtail keyword campagne post-launch; richtlijnen + negatieven in [§ Betaalde zoekcampagne](#betaalde-zoekcampagne-ads--richtlijnen) (geo/kop/merk/negatieven uit de keyword-meting 2026-08-02)

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

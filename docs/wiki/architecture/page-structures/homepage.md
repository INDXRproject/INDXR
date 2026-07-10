# Homepage page-structure (`/`)

**Bron van waarheid voor structuur, componenten, en beslissingen voor de homepage.**
**Bijgewerkt:** 2026-05-04 (Batch 1, page-type 1)
**Status:** Strategie vastgesteld — skeleton geïmplementeerd

---

## Doel

Brand + conversion. Niet keyword SEO. Visitor moet binnen 5 seconden weten wat INDXR is en of het voor hen relevant is. Daarna naar /transcribe (free tool) of /signup bewegen.

---

## Sectie-volgorde

### Sectie 1 — Header

**Logged-out variant:**
```
[Logo INDXR.AI]    Pricing  Docs  Articles  [Try it free]      ☀  Log in  [Sign up]
```

**Logged-in variant:**
```
[Logo INDXR.AI]    Pricing  Docs  Articles  [Try it free]      ☀  [Go to app]
```

- Logo → `/`
- Pricing → `/pricing`
- Docs → `/docs` (hub bestaat)
- Articles → `/articles` (hub bestaat)
- Try it free → `/transcribe` (zelfde voor beide variants)
- Theme toggle: light/dark/system
- Log in → `/login` (logged-out only)
- Sign up → `/signup` (logged-out only, accent button)
- Go to app → `/dashboard` (logged-in only, accent button; later `app.indxr.ai/` na Werksessie C)
- Sticky on scroll

Mobile: pass later (Werksessie mobile-pass na alle Batch 1-4 pages).

### Sectie 2 — Hero

- H1 outcome-led (huidig "Extract. Export. Index. Every video.")
- Subhead in één zin
- Primary CTA: `[Start Transcribing →]` → `/transcribe`
- Secondary CTA: `[View Pricing]` → `/pricing`
- Visual proof: hero image dag/nacht/system met laptop/Macbook + INDXR dashboard screenshot
- Micro-trust onder CTAs: "No account needed — free for captioned videos. Sign up for credits, exports & library access."

Copy schrijven we later.

### Sectie 3 — How it works (5 blocks)

Eerste block dekt input-flexibiliteit, tweede toont scope, dan drie blocks over output kwaliteit per audience.

**Block 1 — Input: any video, any audio**
- Single videos, playlists, audio files
- Mockup: tabbed interface of Remotion mini-loop door alle drie

**Block 2 — Scope: from one to thousands**
- 1 video tot 100+ playlist tot uren audio
- Mockup: playlist preview met credit-cost calculator of bulk progress overview

**Block 3 — Output: actually readable**
- Paragraphed text, timestamped, Markdown export voor Obsidian/Notion, CSV
- Mockup: side-by-side raw caption vs INDXR clean export, of library detail-view met format pills
- Audience: knowledge workers, researchers, journalists

**Block 4 — Output: subtitles for creators**
- SRT en VTT exports
- Mockup: SRT preview of YouTube Studio caption upload screen
- Audience: content creators

**Block 5 — Output: build with it**
- RAG-optimized JSON, deep-linked chunks, metadata-rich
- Mockup: JSON preview met chunked structure of LangChain code snippet
- Audience: developers, RAG builders

### Sectie 4 — Differentiators

Compact strip onder How it works. Drie korte punten met icon.

- No browser extension
- No subscription — credits never expire
- Free tier that's actually useful

### Sectie 5 — Stats from testing

- Eén grote stat: "Tested on 800+ minutes of academic and conversational audio. 99.4% accuracy with AI transcription on benchmark data."
- Drie kleinere trust-points: "EU-hosted (Supabase eu-west-1)", "Audio deleted after transcription", "Stripe-secured payments"
- Optioneel mini-line: "Real testimonials will appear here as users share their experience."

### Sectie 6 — Pricing teaser

> "Pay only for what you use. Credits never expire. Starting at €3,49 — no subscription."
> [See pricing →] → `/pricing`

### Sectie 7 — Closing CTA (signup-pull)

- Headline: "Start organizing your transcripts and exports into a clean library."
- One-liner: "Auto-captions stay free for single videos. Sign up to unlock playlists, AI transcription, and your personal library."
- Primary CTA: `[Sign up free]` → `/signup`
- Secondary: "Or try without an account →" → `/transcribe`

Andere visuele context dan hero (donker/accent block).

### Sectie 8 — Footer

Bestaande Footer-component uit Werksessie B. Geen wijziging.

---

## Componentenlijst

### Bestaand (mogelijk aanpassing nodig)

| Component | Aanpassing |
|-----------|------------|
| Header | 4e nav item Articles toegevoegd, "Start free" → "Sign up", logged-in variant met "Go to app" |
| Footer | Geen wijziging |
| Theme toggle | Verifiëren dat light/dark/system werkt |
| Button | CTA varianten (primary, secondary, ghost) |
| Card | Basis voor blocks |

### Nieuw (skeletons aangemaakt in Batch 1 / page-type 1)

| Component | Pad | Doel | Hergebruik |
|-----------|-----|------|------------|
| HeroImage | `src/components/marketing/HeroImage.tsx` | Theme-aware day/night/system image swap | Mogelijk articles |
| HowItWorksBlock | `src/components/marketing/HowItWorksBlock.tsx` | Heading + copy + mockup frame | 5× op homepage |
| MacbookMockupFrame | `src/components/marketing/MacbookMockupFrame.tsx` | Wraps screenshot/video voor desktop | Homepage, mogelijk articles |
| RemotionLoop | `src/components/marketing/RemotionLoop.tsx` | Wrapper voor block 1 input-cycle (placeholder nu) | Homepage |
| DifferentiatorStrip | `src/components/marketing/DifferentiatorStrip.tsx` | 3 korte punten met icon, compact horizontaal | Homepage |
| StatsFromTesting | `src/components/marketing/StatsFromTesting.tsx` | Pre-launch proof — één grote stat + drie trust-points | Homepage, /transcribe, /pricing |
| TestimonialPlaceholder | `src/components/marketing/TestimonialPlaceholder.tsx` | "testimonials coming" mini-blok | Homepage, /pricing |
| PricingTeaserBlock | `src/components/marketing/PricingTeaserBlock.tsx` | One-liner + entry price + link | Homepage, mogelijk /transcribe |
| ClosingCTASection | `src/components/marketing/ClosingCTASection.tsx` | Full-width signup-pull | Homepage, mogelijk variants |

---

## Beslissingen

### Logged-in user op marketing — "Go to app"
Industry-standaard (Linear, Vercel, Supabase): logged-in user op marketing-site krijgt header rechts vervangen door "Go to app" → `/dashboard` (later `app.indxr.ai/` na Werksessie C). Geen Log in / Sign up meer (zinloos). Marketing content blijft toegankelijk.

### Audience-recognition via Block 3/4/5
Drie audiences (knowledge workers, content creators, developers) worden natuurlijk aangesproken zonder /for-X/ hubs. Past bij ADR-040 (audience-aware article pattern, mix). Block 3 = readable output, Block 4 = subtitles, Block 5 = data/RAG.

### Differentiators als aparte strip
Niet geïntegreerd in How it works. Onze positionering (geen extension, no subscription, eerlijk free tier) verdient eigen visuele plek.

### Social proof na How it works (niet onder hero)
Pre-launch hebben we geen logos of testimonials. "Stats from testing" is eerlijk alternatief. Plaatsing na How it works is sterker dan direct onder hero — first-time visitor moet eerst snappen wat het is.

### Closing CTA = signup-pull (niet repeat hero)
Standaard pattern is closing CTA = repeat hero CTA. Wij doen signup-pull omdat lezer aan einde van scroll de volle propositie heeft gezien — sterker conversie-moment dan hero.

### Fake testimonials verwijderd
De huidige homepage bevatte drie gefabriceerde testimonials (M. van der Berg, S. Okafor, T. Lindqvist). Verwijderd conform ADR-044 en ihsan-principe: geen hallucinated trust-signalen. Vervangen door TestimonialPlaceholder + StatsFromTesting.

---

## Mobile

Pass later (Werksessie mobile-pass na alle Batch 1-4 pages). Niet hier.

---

## Status

- [x] Wiki documentatie (deze file)
- [x] Skeleton implementatie (componenten als lege schillen + page-structuur)
- [ ] Claude Design rondje (visual polish, na alle Batch 1 pages)
- [ ] Content writing (placeholders → echte copy)
- [ ] Hero images via Leonardo.ai (parallel)
- [ ] Mobile pass

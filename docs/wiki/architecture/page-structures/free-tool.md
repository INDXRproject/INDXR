# Free tool page-structure (`/transcribe`)

**Bron van waarheid voor structuur, componenten, en beslissingen voor /transcribe.**
**Bijgewerkt:** 2026-05-04 (Batch 1, page-type 2)
**Status:** Strategie vastgesteld — skeleton geïmplementeerd

---

## Doel

Hybrid: marketing landing + working tool. Visitor landt anonymous, gebruikt tool zonder signup voor primary use case (single video → transcript → copy/download TXT). Conversie naar account gebeurt **alleen** wanneer visitor een feature probeert die buiten de free tier valt — niet bij entry.

---

## Sectie-volgorde

### Sectie 1 — Header

Zelfde als homepage. Geen wijziging.

### Sectie 2 — Hero + tool (boven de fold)

- H1 — descriptief ("Free YouTube Transcript Generator" werkt)
- Subhead — wat het doet, korte versie
- **Tool zelf**: drie tabs (Single Video / Playlist / Audio Upload) + URL input + Extract button + result preview area
- **MicroTrustRow direct onder tool**: korte signals
  - "No signup needed for single videos"
  - "No browser extension"
  - "Works with any YouTube URL"

Geen aparte CTA hier — Extract button is de primary action.

Tabs blijven zichtbaar voor anonymous users — eerlijke transparantie. Single werkt direct, Playlist/Audio leiden tot friction-cards.

### Sectie 3 — Friction-conversion (gated tab states)

Geen aparte page-section — dit is de **state van de tool zelf** wanneer een anonymous user op een gated tab klikt. Drie cases:

**3a — Playlist tab (anonymous):**
Visitor mag playlist URL plakken en "Fetch playlist" klikken (playlist info ophalen is geen credit-actie). Wanneer visitor probeert te extracten zonder account: inline FrictionConversionCard getoond via `onAuthRequired` callback:
> "Get the full playlist"
> Sign up free — 25 credits included, no credit card needed. Extract any playlist, not just 3 videos.
> [Sign up free →] [Or extract a single video]

Geplande upgrade (content-schrijf sessie): toon eerste 3 videos als "Free", rest als "Sign up to extract" (vereist PlaylistTab/PlaylistManager aanpassing).

**3b — Audio tab klik (anonymous):**
Geen file picker — direct FrictionConversionCard getoond zodra tab actief is:
> "Audio file transcription"
> Upload MP3, WAV, M4A, or other audio. AI transcription via AssemblyAI — 99.4% accuracy on benchmark data. 1 credit per minute. Audio is not stored after transcription.
> Sign up free for 25 credits — no credit card needed.
> [Sign up free →] [Or paste a YouTube URL]

**3c — Format export klik (anonymous, na succesvolle single video extract):**
TXT export werkt direct (copy + download). Andere formats triggeren FrictionConversionCard inline. Vereist aanpassing van TranscriptCard component — zie INBOX.md (gedocumenteerd, niet gebouwd in deze sessie).

Primary use case (paste → extract → copy or download TXT) wordt **nooit** onderbroken.

### Sectie 4 — Pricing teaser

Hergebruik van homepage component (PricingTeaserBlock). Korte pull naar /pricing.

### Sectie 5 — FAQ (6 vragen)

FAQAccordion met placeholder antwoorden (Khidr schrijft content later):

1. What's the difference between auto-captions and AI transcription?
2. Why would I sign up if the tool is free?
3. What if my video doesn't have captions?
4. Can I extract a full playlist without an account?
5. What languages are supported?
6. What export formats can I get?

### Sectie 6 — Closing CTA

ClosingCTASection met `/transcribe`-specifieke copy via props:
- Headline: "Ready for more than single videos?"
- One-liner: "Sign up free — 25 credits included, no credit card needed. Unlock playlists, AI transcription, and your library."
- Primary: [Sign up free] → /signup
- Secondary: "Or keep using the free tool above" → /transcribe (scroll-top)

### Sectie 7 — Footer

Bestaande Footer-component. Geen wijziging.

---

## Componentenlijst

### Bestaand (hergebruikt)

| Component | Aanpassing |
|-----------|------------|
| Header | Geen |
| Footer | Geen |
| VideoTab | Ongewijzigd — format-export gating deferred (zie priorities.md) |
| PlaylistTab | `onAuthRequired` callback gewijzigd: toont inline FrictionConversionCard i.p.v. AuthModal |
| AudioTab | Ongewijzigd — alleen getoond voor logged-in users; anonymous ziet FrictionConversionCard |
| PricingTeaserBlock | Hergebruik vanaf homepage |
| ClosingCTASection | Props uitgebreid voor copy-override |

### Nieuw (aangemaakt in Batch 1 / page-type 2)

| Component | Pad | Doel | Hergebruik |
|-----------|-----|------|------------|
| MicroTrustRow | `src/components/marketing/MicroTrustRow.tsx` | 3-4 inline trust signals | /transcribe, eventueel /pricing |
| FrictionConversionCard | `src/components/marketing/FrictionConversionCard.tsx` | Inline card voor gated features | /transcribe (3 variants) |
| FAQAccordion | `src/components/marketing/FAQAccordion.tsx` | Accordion Q&A, items-prop | /transcribe, /pricing, articles |

---

## Open issues

- **Format-export gating (case 3c):** Vereist aanpassing van TranscriptCard component om format-knoppen per auth-state te conditioneren. Niet gebouwd in skeleton-sessie. Zie `docs/wiki/roadmap/priorities.md` → "Polish / deferred UI".
- **Playlist eerste-3-free UI:** Visueel onderscheid "Free" vs "Sign up to extract" per video in de lijst vereist aanpassing van PlaylistManager. Zie `docs/wiki/roadmap/priorities.md` → "Polish / deferred UI".

---

## Beslissingen

### Tabs zichtbaar houden voor anonymous
Drie tabs blijven zichtbaar (Single werkend, Playlist/Audio gated). Research best-practice + transparency. Visitor begrijpt direct de scope.

### Friendly friction, niet dead-end
Bij gated tab/feature: vriendelijke uitleg wat de feature doet + concrete value (25 credits, no card) + escape route. AuthModal vervangen door inline FrictionConversionCard — geen modal-interrupt.

### Primary use case nooit onderbreken
Single video → extract → copy/download TXT werkt zonder enige interruptie. Geen "create account" prompts.

### Geen aparte "How it works" sectie
Tool legt zichzelf uit. Homepage heeft uitgebreide "How it works".

### Bestaande SEO-tekst vervangen door FAQAccordion
De lange prose SEO-tekst onder de tool (H2-secties met stappenplan, vergelijkingstabel, etc.) is vervangen door een gefocuste FAQAccordion met 6 vragen. De prose-content bevatte goede informatie maar is te lang als pagina-structuur. Bij content-writing sessie: FAQ-antwoorden uitschrijven met links naar /docs/*.

---

## Anatomie (ADR-079, 2026-07-26)

De losse drie-layout-opzet hierboven is vervangen door één gedeelde **`TranscribeWorkbench`**
(`packages/shared/src/components/transcribe/`), die beide apps renderen. Vaste anatomie:

```
kaart (max-w-[640px], gecentreerd, dichte --surface)
├─ header : ModeStrip — segmented control (Radix Tabs), custom hexagon-iconen,
│           actief = --surface + hairline + --fg-strong + --accent icoon (géén massief amber)
├─ body   : de actieve modus (VideoTab / PlaylistTab / AudioTab) — invoer + actieknop
│           actieknop = vol --accent enabled / --surface-sunken + --fg-muted disabled;
│           labels Extract / Fetch playlist / Transcribe; laden = "Extracting…" + ring-spinner
└─ footer : bron-/kostenregel binnen de tab-body
            · video   : SourceChoice (Auto-captions [Free] / AI transcription 1 cr/min)
            · playlist: "First 3 free · then 1 credit/video · AI 1 credit/min" + info-popover
            · audio   : "1 credit per minute · minimum 1 credit"
```

- **URL-state:** `?mode=video|playlist|audio` via `history.replaceState` (niet `router.replace`);
  default/onbekend ⇒ video, geen redirect. Marketing-canonical blijft kaal (ADR-077).
- **Onder de kaart:** idle-state — ingelogd `RecentTranscripts` (laatste 3, nul ⇒ niets),
  uitgelogd `MicroTrustRow`; verdwijnt zodra een job start. Stille docs-link. Geen dashed box,
  geen toasts. Lopende job = `JobProgressCard`; klaar = resultaatkaart in dezelfde slot
  (beide op de gedeelde `ResultCardShell`).
- **Gating uitgelogd:** AI-cel (video), playlist en audio tonen de `FrictionConversionCard`;
  single-video captions blijven onderbroken-vrij.
- Kop: app = H1 "Transcribe" + subregel (geen "DASHBOARD"-eyebrow); marketing behoudt zijn SEO-H1.

---

## Mobile

- **Kaart:** `max-w-[640px]`, gecentreerd, actieknop full-width onder de input, alle targets ≥44px.
- **App-navigatie:** bottom tab bar is primair (§4); geen sidebar-trigger/hamburger <md.
  Account/Settings/Sign out achter de avatar rechtsboven in een rechts-in-schuivende `Sheet`.
- **Marketing-navigatie:** hamburger → full-screen `Sheet` met 44px-rijen
  (Pricing/Docs/Articles · scheiding · Log in · Sign up full-width · theme-toggle).

---

## Status

- [x] Wiki documentatie (deze file)
- [x] Skeleton implementatie (componenten + page-structuur)
- [x] Gedeelde workbench-anatomie (ADR-079)
- [x] Mobile pass (bottom tab bar + avatar/hamburger sheets)
- [ ] Content writing (FAQ-antwoorden + kopij)
- [ ] Format-export gating (3c) — deferred
- [ ] Playlist eerste-3-free UI (FOMO-preview) — deferred; tot dan toont anonieme playlist meteen de conversiekaart (zie "Marketing-app gating per modus × auth")

---

## Marketing-app gating per modus × auth (2026-08-31)

De gedeelde `TranscribeWorkbench` (ADR-079) staat op zowel de marketing-app als de app. De bijbehorende
API-routes staan **niet** in beide apps: `/api/playlist/info` en `/api/transcribe/preflight` bestaan
alléén in `apps/app`. Op marketing 404'de dat → de frontend parste de Next.js HTML-foutpagina als JSON →
rauwe `SyntaxError` ("Unexpected token '<'") zichtbaar in de UI (publiek, op Ads-verkeer). Fix: gaten
worden op **tab-activatie** afgevangen, zonder netwerkcall. Bron: `FreeToolEmbed.tsx`.

| Modus | Uitgelogd (marketing) | Ingelogd (marketing) |
|---|---|---|
| **Video** | Werkt, ononderbroken (VideoTab) — **ongewijzigd** | Werkt, transcript landt in library — **ongewijzigd** |
| **Playlist** | `FrictionConversionCard` (signup) op tab-activatie, **geen** netwerkcall | Doorverwijskaart → `app.indxr.ai/transcribe?mode=playlist` |
| **Upload** | `FrictionConversionCard` (signup) — **ongewijzigd, geverifieerd goed** | Doorverwijskaart → `app.indxr.ai/transcribe?mode=audio` |

- **Anonieme playlist-preview is teruggedraaid.** De eerdere strategie mountte `PlaylistTab` voor anonieme
  bezoekers (met een `onAuthRequired`-friction ná een actie); dat was de bron van de 404/SyntaxError. Tot
  de **deferred FOMO-UI** (eerste 3 video's "Free", rest "Sign up to extract") daadwerkelijk gebouwd is,
  toont de playlist-tab voor anonieme bezoekers meteen de conversiekaart — geen preview, geen call.
- **Doorverwijskaart (ingelogd):** hergebruikt `FrictionConversionCard` met andere props (cross-host
  `<a>` via `appHref`), geen nieuw component. De kaart verschijnt **bij tab-activatie, niet na een actie**:
  een `File`-object overleeft de origin-grens niet, dus wie eerst een bestand kiest en dán wordt
  doorgestuurd zou het opnieuw moeten zoeken.

### Bevindingen bij deze fix (nagegaan, geen aanname)

- **De Ads-landingspagina's waren nooit geraakt.** `/articles/audio-to-text` en `/articles/video-to-text`
  (de live Ads-final-URLs) dragen `ToolPageTemplate` — content, FAQ, figuren, JSON-LD — **geen**
  `TranscribeWorkbench` en **geen** upload-widget. Nagegaan in de bron; ze vielen dus buiten de 404-bug.
- **De 404's veroorzaakten geen credit-reserveringen.** Het 404 valt op het Next.js-routingniveau in
  `apps/marketing`, vóór FastAPI; reserveringen worden pas in de Python-backend gemaakt
  (`reserve_credits`/`deduct_credits_atomic`). DB-controle (2026-08-31): geen reserverings-/settlement-rijen
  rond de pogingen; testsaldi intact. Zie ADR-080 follow-up.

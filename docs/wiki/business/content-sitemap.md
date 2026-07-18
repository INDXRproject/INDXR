# Content-sitemap — INDXR.AI

**Doel:** de kaart van *alle user-facing content* vóór we etappe B (GDPR) en C (waarheids-pagina) schrijven.
**Aangemaakt:** 2026-07-18 · **Scope:** `apps/marketing` (indxr.ai) + user-facing kant van `apps/app` (app.indxr.ai)
**Methode:** de bestaande content-audit (`architecture/sitemap.md`, 2026-05-03) als basis, aangescherpt tegen de *daadwerkelijke* routes in `apps/`. Waar audit en routes verschillen: de routes winnen — verschillen staan in [§ Discrepanties](#discrepanties-audit-vs-werkelijkheid).

> **Twee lagen.** [Laag 1 = wat er IS](#laag-1--de-kaart) (feit). [Laag 2 = mijn oordeel](#laag-2--kritische-blik) (mening). Strikt gescheiden.
> **Waarheidsbron voor prijzen/credits:** `packages/shared/src/lib/pricing.ts`. Er is géén `src/lib/pricing.ts`. Euro-bedragen in content worden *dynamisch* uit die file gerenderd (gaan niet stale); credit-*aantallen*, format-tellingen, taal-tellingen en model-namen zijn hardcoded proza (dát zijn de truth-check-doelen voor etappe C).

**Status-legenda:**
`live` = echte, substantiële content · `placeholder` = scaffold/stub (lege body, `[Placeholder — content coming soon]` of `[KHIDR: vul aan]`) · `stale-vermoed` = interne inconsistentie of verouderd · ⚠ = functie kapot (pagina rendert, maar doet niet wat ze belooft).

---

## Laag 1 — de kaart

### Groep 1 — Landing & conversie (`indxr.ai/`)

| Pagina | Route | Doel (1 zin) | Belangrijkste claims | Status |
|---|---|---|---|---|
| Homepage | `/` | Pitch: extract → export → index voor video's, playlists, audio. | "Extract. Export. Index. Every video."; single URL / playlist / audio in één interface; formaten TXT·MD·SRT·VTT·JSON·RAG-JSON·CSV; "no account needed — free for captioned videos"; **99.4% accuracy, 800+ min getest**; "200-video playlist overnight"; EU-hosted (Supabase eu-west-1); audio verwijderd na transcriptie; geen extensie / geen abonnement / credits verlopen nooit; teaser "Starting at €5.00". Testimonials = **expliciete placeholder** (ADR-044, geen nep-quotes). | live |
| Pricing | `/pricing` | Pay-per-use pakketten + credit-kostentabel + FAQ. | Tiers (uit `pricing.ts`): **Try €5/100 · Starter €15/400 · Plus €25/1.000 (Recommended) · Power €60/3.000**; VAT inclusief, geen abonnement, credits verlopen nooit; credit-kosten: AI-transcriptie 1cr/min, playlist 1cr/video na 3 gratis, AI-summary 3cr, RAG-JSON 1cr/10min, single-caption 0cr; **25 welcome credits**; audio-upload MP3/MP4/WAV/M4A/OGG/FLAC/WEBM tot **500MB**; **refund binnen 7 dagen als ≤5 credits gebruikt**. Laatste **3 FAQ-antwoorden = `[placeholder — Khidr]` stubs** (VAT, facturen, betaalmethoden). | live (FAQ deels placeholder) |

### Groep 2 — Vrije tool (funnel-ingang)

| Pagina | Route | Doel (1 zin) | Belangrijkste claims | Status |
|---|---|---|---|---|
| Free tool | `/transcribe` | Gratis 3-tab tool (video/playlist/audio) met conversie-gating. | "Free YouTube Transcript Generator"; single-video werkt voor iedereen (auto-save alleen ingelogd); playlist + audio → **gratis account vereist** (25 credits, geen kaart); audio 1cr/min, "99.4% accuracy", "deleted after transcription"; formaten TXT (gratis/anoniem) vs rest (account); **67 talen auto-captions / 99+ AI (AssemblyAI Universal-3)**. FAQ-antwoorden = **`[placeholder — Khidr]` stubs**. | live (FAQ placeholder) |

### Groep 3 — Product-documentatie (`indxr.ai/docs/*`)

Alle doc-routes renderen via `DocsShell` (sidebar uit `apps/marketing/src/lib/docs-config.ts`). **Bijna alle `how-indxr-works/*`-pagina's zijn scaffolds**: één substantiële lead-zin + letterlijk `[Placeholder — content coming soon]`. De claim leeft in die lead-zin en in de SEO-metadata/JSON-LD. Alleen `getting-started`, `credits-and-billing` en `faq` zijn volledig uitgebouwd.

| Pagina | Route | Doel (1 zin) | Belangrijkste claims | Status |
|---|---|---|---|---|
| Docs hub | `/docs` | Navigatiehub naar alle doc-categorieën. | Geen eigen productclaims; category-intro's. | live |
| Getting started | `/docs/getting-started` | Quickstart naar eerste transcript. | Geen account voor single-video; captions "2–3 sec"; anoniem = Copy/TXT gratis; "Sign up to unlock MD/CSV/SRT/VTT/JSON"; geen captions → AI 1cr/min + account; **"Sign up for 25 free credits"**. | live |
| Overview | `/docs/how-indxr-works/overview` | High-level pipeline-uitleg. | Auto-captions waar beschikbaar, anders AssemblyAI; **"six formats"** (⚠ botst met export-formats "seven"). | placeholder |
| Credits | `/docs/how-indxr-works/credits` | Credit-eenheid uitleggen. | Captions 0cr; **AI 1cr/min (min 1); AI-summary 3cr**; "credits never expire". | placeholder |
| Accuracy (hub) | `/docs/how-indxr-works/accuracy` | Nauwkeurigheid twee methoden. | Auto-captions vs AI; **"AssemblyAI Universal-3, 99.4% word accuracy op clean English"**. | placeholder |
| Accuracy — auto-captions | `…/accuracy/auto-captions` | Caption-nauwkeurigheid. | Verbatim van creator/YouTube-ASR; hangt af van bron, niet INDXR. | placeholder |
| Accuracy — AI | `…/accuracy/ai-transcription` | AI-nauwkeurigheid. | Universal-3, "99.4% word-level", varieert per audio/taal. | placeholder |
| Export formats (hub) | `…/export-formats` | Overzicht formaten. | **"seven formats"** (2 TXT-varianten apart geteld) → botst met overview. | placeholder |
| Export — txt | `…/export-formats/txt` | TXT-spec. | `[HH:MM:SS]`; "TXT is the only format available to anonymous users". | placeholder |
| Export — markdown | `…/export-formats/markdown` | Markdown-spec. | YAML-frontmatter (titel/URL/datum/duur); Obsidian/Notion/Logseq. | placeholder |
| Export — csv | `…/export-formats/csv` | CSV-spec. | Kolommen start/end/text; Excel/Sheets. | placeholder |
| Export — srt | `…/export-formats/srt` | SRT-spec. | `HH:MM:SS,mmm`; VLC/YouTube/Resolve. | placeholder |
| Export — vtt | `…/export-formats/vtt` | VTT-spec. | `WEBVTT`-header; HTML5/Mux/Cloudflare Stream. | placeholder |
| Export — json | `…/export-formats/json` | RAG-JSON-spec. | **90–120s chunks**, sentence-snap, `deep_link` per chunk; LangChain/LlamaIndex/Pinecone/Chroma/Weaviate/Qdrant. | placeholder |
| Languages | `…/languages` | Ondersteunde talen. | Captions "any language met YouTube auto-captions"; AI "99+ languages"; auto-detect. | placeholder |
| Limits | `…/limits` | Rate/size/duur-limieten. | **Geen enkel concreet getal** — alleen kwalitatief ("rate-limited", "file-size limit"). Captions "no video-length limit". | placeholder (thin) |
| API | `…/api` | API-beschikbaarheid. | **"INDXR does not currently offer a public REST API"** — alleen web-interface. | placeholder |
| Credits & billing | `/docs/account-and-data/credits-and-billing` | Credits + billing in detail. | Captions 0cr; AI 1cr/min; summary 3cr; one-time packages (verwijst naar /pricing); nooit verlopen; **auto-refund bij mislukte AI-operatie**. Twee `KHIDR:` TODO-secties. | live (2 stubs) |
| Data handling | `/docs/account-and-data/data-handling` | Data-retentie/verwerking. | On-demand; **"uploaded audio deleted within 24 hours"**; transcripts in library. | placeholder |
| How-to hub | `/docs/help/how-to` | How-to gidsen. | "Guides coming soon." | placeholder |
| Troubleshooting hub | `/docs/help/troubleshooting` | Probleemoplossing. | "Troubleshooting guides coming soon." | placeholder |

#### FAQ — apart & gecategoriseerd (`/docs/help/faq`, status: live)

Volledig uitgebouwd. In de code gegroepeerd als 4 built-in labels (*General · YouTube Transcripts · Pricing & Credits · Technical*). Hier hergegroepeerd naar thema:

- **Hoe-werkt-het / algemeen:** Wat is INDXR.AI en waarvoor? · Werkt het zonder Chrome-extensie? · Hoe download ik een transcript als tekstbestand? · Transcript van video zónder captions? · Hele playlist in één keer? · SRT-download? · Welke exportformaten? · Hoe lang duurt extractie? · Waarom soms bijna instant? (dedup)
- **Pricing:** Wat kost het om een video te transcriberen? · Waarom kan ik niet kopen vanuit mijn land? (VAT-scope)
- **Credits:** Verlopen mijn credits? · Hoe werkt het creditsysteem?
- **Account:** Heb ik een account nodig?
- **Privacy / rechten / data:** Mag ik transcripts commercieel gebruiken?
- **Troubleshooting / taal:** Waarom krijg ik soms captions in de verkeerde taal — en hoe haalt INDXR het origineel?

*Feiten in FAQ-antwoorden:* captions 0cr / AI 1cr-min / summary 3cr; credits verlopen nooit; captions 1–3s, AI ~1–2 min per 10 min audio; VAT NL + EU One Stop Shop, UK & Zwitserland geblokkeerd tot lokale registratie; commercieel gebruik toegestaan (rechten bij creator).

### Groep 4 — Funnel-content / SEO-artikelen (`indxr.ai/articles/*`)

18 artikelen + index. Drie gedeelde templates (`ToolPageTemplate` / `TutorialTemplate` / `ArticleTemplate`). Euro-bedragen dynamisch uit `pricing.ts` → **geen placeholders, geen stale pagina's gevonden**. Terugkerende claims: AI = AssemblyAI Universal-3 Pro @ 1cr/min; captions gratis; 500MB-cap; 7 audioformaten; RAG-JSON 1cr/10min (eerste 3 gratis); summary 3cr; credits verlopen nooit. Interne links naar bare slugs / `/how-it-works` / `/blog/*` zijn **niet kapot** — `next.config` 301-redirects vangen ze.

| Route (`/articles/…`) | Categorie (index) | Product-specifieke claims (truth-check-doelen) | Status |
|---|---|---|---|
| `youtube-transcript-not-available` | Troubleshooting | 67 talen captions / 99+ AI; AssemblyAI "94.1% English, 9.97% WER vs 24.73% Amazon"; live-captions EN-only + 1000+ subs; detecteert age/members-only. | live |
| `youtube-age-restricted-transcript` | Troubleshooting | Detecteert age-gate vóór extractie, error-card, **0 credits**; bypasst gate NIET; workaround = audio-upload; `is_auto_generated:false`. | live |
| `youtube-members-only-transcript` | Troubleshooting | Weigert members-only URL, error-card, 0cr; workaround = audio-upload; "first audio upload uses welcome credits". | live |
| `youtube-transcript-non-english` | Troubleshooting | YouTube CDN forceert `tlang=en` (niet override-baar); **model-routing: Universal-2 voor non-EN, Universal-3 Pro alleen EN/ES/DE/FR/PT/IT** (⚠ botst met "Universal-3 Pro" elders). | live |
| `youtube-transcript-without-extension` | Troubleshooting | **"8 export formats"** (⚠ botst); geen extensie ("post-launch roadmap"); yt-dlp + interne API; 67/99+ talen. | live |
| `youtube-to-text` | Export Formats | **"Free account includes 25 credits"** (2×); **"six export formats, nine export options"** (⚠ botst met "8"); 67 talen; "95%+ accuracy". | live |
| `youtube-transcript-markdown` | Export Formats | YAML-frontmatter velden; frontmatter-customisatie NIET in UI; paragraaf-split >5s; Obsidian Web Clipper "brak 2× begin 2026". | live |
| `youtube-transcript-csv` | Export Formats | Kolommen segment_index/start/end/duration/text/word_count; UTF-8 BOM; video-metadata NIET in CSV. | live |
| `youtube-srt-download` | Export Formats | Resegment 3–7s, ≤42 chars/regel (BBC/Netflix/EBU 3264); "~20% van YouTube-video's heeft geen auto-captions". | live |
| `youtube-transcript-json` | Export Formats | Standaard-JSON gratis; RAG-JSON 1cr/10min (eerste 3 gratis); **claim: YouTube geeft "always English translation regardless of original".** | live |
| `youtube-transcript-for-rag` | Export Formats ("RAG-Optimized JSON") | RAG-JSON workflow; chunk-presets; 1cr/10min. | live |
| `bulk-youtube-transcript` | Workflows | 3 captions gratis, dan 1cr/video; getest 19 vids/783 min/18m53s; batch ≤100; "playlists tot **5.000 video's**". | live |
| `youtube-playlist-transcript` | Workflows | Idem 3-gratis; failed retry na 30s; batch ≤100; **geen channel-URL's**; dedup-badges (amber=captions, violet=AI). | live |
| `audio-to-text` | Workflows | 500MB (~8u); "94–96%+ clean audio"; 99+ talen; summary 3cr; SRT/VTT 3–7s/42 chars. | live |
| `youtube-transcript-obsidian` | Workflows | Markdown/frontmatter; summary 3cr; "19 lectures/13 hours" ZIP; youtube-transcript-api geblokt op cloud-IP's, INDXR = yt-dlp+residential proxy. | live |
| `chunk-youtube-transcripts-for-rag` | Deep Dives | RAG 30/60/90/120s presets, 15% overlap, sentence-snap (AI) vs segment-snap (captions). | live (grotendeels topic) |
| `youtube-channel-knowledge-base` | Deep Dives | **Alleen playlist-URL's, geen channel-URL's**; "up to 500 videos"; dedup gratis; voorbeeld 50×30min = 1.650 credits. | live |
| `youtube-transcripts-vector-database` | Deep Dives | RAG via Playlist-tab-toggle; chunks 90–120s (~300–400 tokens); embedding-kosten zijn OpenAI's, niet INDXR's. | live (grotendeels topic) |
| `articles` (index) | — | Groepeert de 18 artikelen in 4 categorieën (Troubleshooting 5 · Export Formats 6 · Workflows 4 · Deep Dives 3). | live |

### Groep 5 — Support & vertrouwen

| Pagina | Route | Doel (1 zin) | Belangrijkste claims | Status |
|---|---|---|---|---|
| About | `/about` | Bedrijf/product-omschrijving. | Intro echt (captions/playlists/AI-fallback/multi-format); **"What we do" en "Who builds" secties leeg** (`[KHIDR: vul aan]`). | placeholder (deels) |
| Contact | `/contact` | Support-formulier (Help vs Feedback). | Twee kaarten; "we read and respond to everything"; reply in dashboard Messages. **⚠ Formulier submit werkt niet** — `handleSubmit` = fake 800ms delay, marketing-`/api/support` niet geïmplementeerd (terwijl app wél `/api/support/submit` heeft). | live UI / ⚠ kapotte backend |
| Privacy | `/privacy` | GDPR-privacyverklaring. | **7 kopjes, alle bodies leeg** (`[KHIDR: vul aan]`); "Last updated: —". Geen echte GDPR-tekst. | placeholder |
| Terms | `/terms` | Terms of Service. | **7 kopjes, alle bodies leeg** (incl. Refund policy); "Last updated: —". Geen echte terms. | placeholder |
| Suspended | `/suspended` | "Account paused"-melding. | "Your account is paused"; `noindex`; **contact-email = `[KHIDR]` TODO**. | live (minimal) |

### Groep 6 — Auth flows (blijven op marketing-domain, ADR-036)

| Pagina | Route | Doel | Belangrijkste claims | Status |
|---|---|---|---|---|
| Login | `/login` | E-mail/wachtwoord + OAuth. | Google OAuth actief; **Apple OAuth disabled** ("coming soon"); forgot-password-link. | live |
| Signup | `/signup` | Accountaanmaak. | Google + e-mail/wachtwoord; wachtwoord ≥8 tekens; **e-mailverificatie vereist**; koppelt /terms + /privacy. | live |
| Forgot password | `/forgot-password` | Wachtwoord-reset. | E-mail → resetlink → bevestigingsview. | live |
| Onboarding | `/onboarding` | Post-signup profielsetup. | **"25 welcome credits" (3×)**; 3-stappen checklist; username 3–20 tekens; role-dropdown (student/personal/academic/creator/marketing/developer/other). | live |
| Auth callback | `/auth/callback` | Supabase OAuth/PKCE-callback. | Geen content (functioneel). | live |

### Groep 7 — App-copy (`app.indxr.ai/*`, auth vereist)

> **Credit-kosten-bron in app:** identiek `@indxr/shared/lib/pricing`. AI 1cr/min · captions 0 · playlist 3-gratis-dan-1 · summary 3 · RAG 1/10min (3 gratis) · welcome 25.

| Pagina | Route | Doel | Belangrijkste user-facing copy / states | Status |
|---|---|---|---|---|
| Home | `/dashboard` | Hub: saldo, transcribe-CTA, recente activiteit. | "Credits remaining" + "1 credit = 1 minute of AI transcription"; empty-states "No messages yet." / "No transcripts yet…". Dev-comment `KHIDR: schrijf final copy` (niet zichtbaar). | live |
| Transcribe | `/dashboard/transcribe` | 3-tab extractie-UI. | Tabs Single/Playlist/Audio; kosten-copy in shared tab-componenten; AudioTab "1 credit per minute… Minimum 1"; "Not enough credits — need X have Y". **⚠ stale:** `AudioTab.tsx:442` nog Nederlands ("We konden dit bestand niet verwerken…"). | live (1 NL-string) |
| Library | `/dashboard/library` | Transcript-lijst + zoek + collecties. | "Library · N transcripts"; errors "Failed to load/delete/rename library". Geen kosten-copy. | live |
| Transcript viewer | `/dashboard/library/[id]` | Tabbed viewer (Original/Edited/Developer-RAG/AI Summary). | **AI-summary: "costs 3 credits… proceed?"** + regenerate-overwrite-waarschuwing; **RAG-export "Cost: N credits", `max(1, ceil(duur/600))`**; guards bij te weinig credits. | live |
| Billing | `/dashboard/billing` | Credits kopen + historie. | "Pay as you go. No subscriptions, no hidden fees."; `PricingTiers` uit pricing.ts; auto-checkout op `?checkout=`. | live |
| Billing success | `/dashboard/billing/success` | Post-checkout-bevestiging. | Pollt webhook-rij (2s×10); "Payment successful — N credits added / New balance"; pending-fallback "credits will appear within a minute". | live |
| Billing cancel | `/dashboard/billing/cancel` | Checkout afgebroken. | "Payment Cancelled — No charges were made to your card." | live |
| Account | `/dashboard/account` | Profiel + transactie/betaal-historie. | ProfileSettings, PurchaseHistory (facturen), TransactionHistory (ledger, laatste 20), SentryFeedback. Geen kosten-claims. | live |
| Settings | `/dashboard/settings` | Voorkeuren + developer-exports. | "Manage your security preferences"; **"Custom themes coming soon"** (placeholder-regel); toggles thema/e-mails/pagina-grootte; DeveloperExports (RAG chunk 30/60/120, default 60). | live (1 placeholder) |
| Messages | `/dashboard/messages` | Inbox + Support-tabs. | **Echte Supabase-data** (messages/support_tickets); empty "No messages — we'll write when something matters."; ticket-reply-flow; labels "You"/"INDXR Support". | live (echte data) |
| Support | `/dashboard/support` | Redirect → `messages?tab=support`. | Form = `SupportClient` (Feedback/Billing/Bug); "Ticket submitted…"; **rate-limit 5/uur**; subject≤200, body≤5000. | live |
| Unsubscribe | `/unsubscribe` | E-mail opt-out (publiek, signed token). | "Stop receiving marketing & announcement emails…"; "won't affect replies to support tickets"; expired → `support@indxr.ai`. | live |

**Admin (`/admin/*`, `ADMIN_EMAIL`-gated, interne tooling — geen user-facing content):** `/admin` (overview) · `/admin/announcements` (broadcast) · `/admin/credits` (ledger + CSV) · `/admin/finance` · `/admin/growth` · `/admin/operations` · `/admin/paid-users` · `/admin/support` · `/admin/transcripts` + `/admin/transcripts/[id]` · `/admin/users`.

---

## Laag 2 — kritische blik

> Vanaf hier is dit **mijn oordeel**, niet de kaart. Niets is gebouwd/verwijderd — alleen gesignaleerd.

### 1. Ontbrekende pagina's

| Ontbrekend | Wie zoekt het | Waarom het ontbreken schaadt |
|---|---|---|
| **Refund-/terugbetaalbeleid (echt)** | Koper vóór aankoop; support | Het enige refund-statement ("7 dagen als ≤5 credits gebruikt") staat begraven in de **/pricing-FAQ**; de `/terms`-sectie "Refund policy" is **leeg**. Er is dus geen gezaghebbende, juridische versie. Bij een dispuut/chargeback sta je zwak. **Blokkeert launch.** |
| **Echte privacy- & terms-content** | Elke bezoeker; Stripe/Google-review; AVG | `/privacy` en `/terms` zijn 7 lege kopjes. Signup linkt er wél naar ("I agree to Terms & Privacy") → je vraagt akkoord op een lege pagina. Dit is precies etappe B/C-terrein. **Blokkeert launch.** |
| **Status-/uptime-pagina** | Developers, RAG-gebruikers, betalende power-users | Er is geen monitoring/statuspagina (`known-issues.md`: geen Sentry/uptime-alerts). Wie een pipeline op INDXR bouwt, wil zien of het platform up is; het ontbreken leest als "hobbyproject". Post-launch prio. |
| **Eén canonieke "wat kost het / hoe werken credits"-pagina in /docs** | Koper die vanuit search in /docs landt | `/docs/how-indxr-works/credits` is een **placeholder**; de echte uitleg staat verspreid over /pricing + /docs/account-and-data/credits-and-billing + 18 artikelen. Wie via Google op de docs-stub landt, ziet "coming soon". |
| **"Welke video's werken wel/niet"-supporthub** | Gebruiker met een mislukte extractie | De info bestaat (age-restricted, members-only, no-captions, non-English artikelen) maar er is **geen enkele canonieke troubleshooting-pagina** — `/docs/help/troubleshooting` is leeg. Nu moet de gebruiker het juiste SEO-artikel raden. |
| **Use-case-landingspagina's** (per doelgroep) | Onderzoeker / creator / developer via ads/search | Bewust uitgesteld (**ADR-038, geen audience hubs pre-launch**). Bewuste keuze — hier alleen als bekende leemte genoteerd, niet als fout. |
| **Changelog** | Terugkerende gebruikers | Bewust niet-pre-launch (beslissing 2026-04-30). Bewuste keuze; genoteerd. |

### 2. Schrapbaar / dood / dubbel / verwarrend

| Item | Waarom weg/aanpassen kan | Redirect nodig? |
|---|---|---|
| **`/contact`-formulier (kapotte submit)** | Rendert een volledig formulier dat **niets verstuurt** (fake 800ms delay; marketing-`/api/support` bestaat niet). Ondertussen heeft de app een werkende `/api/support/submit`. Óf koppelen aan die endpoint, óf de pagina eerlijk maken ("mail ons op…"). Nu belooft ze "we respond to everything" terwijl niets aankomt. | Nee — repareren, niet verwijderen |
| **~15 placeholder-docs geïndexeerd in sitemap.xml** | Alle `how-indxr-works/*` (op credits/api na de lead-zin), `data-handling`, `overview`, `help/how-to`, `help/troubleshooting` hebben `[Placeholder — content coming soon]`-bodies **maar wél volledige SEO-metadata en staan in `sitemap.xml`**. Google indexeert thin content → soft-404/kwaliteitsrisico. Óf vullen, óf `noindex` tot gevuld, óf uit `sitemap.ts` halen. | `noindex` of uit sitemap tot gevuld |
| **Dubbele credits-pagina** | `/docs/how-indxr-works/credits` (placeholder) en `/docs/account-and-data/credits-and-billing` (live) dekken hetzelfde onderwerp; de eerste is leeg. Verwarrend in de sidebar. | Overweeg merge → 308 van de lege naar de volle |
| **`/about` halfleeg** | "What we do" + "Who builds" zijn `[KHIDR]`-stubs; alleen de intro is echt. Half-lege over-pagina schaadt vertrouwen meer dan geen. | Nee — vullen |
| **`/suspended` contact-email = TODO** | Een gesuspendeerde gebruiker krijgt "get in touch" zonder werkend adres. | Nee — invullen |
| **Format-telling & model-naam drift** | "six formats" (overview) vs "seven" (export-hub) vs "8 export formats" (without-extension) vs "six formats, nine options" (youtube-to-text); "Universal-3 Pro" overal vs "Universal-2 voor non-EN" (non-english). Geen pagina om te schrappen, maar **één gedeelde constante** nodig (zie groei-regel). | Nee — bronconsolidatie |

### 3. Groei-regel — waar hoort een nieuwe pagina thuis

**Laag bepaalt thuis:**
- **`indxr.ai/` (marketing)** — conversie. Alleen home, pricing, en de vrije tool. Nieuwe conversie-hoek? Sectie op de homepage, geen nieuwe route.
- **`indxr.ai/docs/*`** — evergreen *producttruth* (hoe werkt het, wat kost het, limieten, formaten). Eén onderwerp = één doc-pagina, maar **alleen als het een aparte gebruikerstaak is**. Anders sectie op een bestaande doc.
- **`indxr.ai/articles/*`** — SEO-acquisitie. Nieuwe pagina **alleen als ze een aparte zoekintentie (keyword) target**. Overlapt ze met een bestaand artikel? Uitbreiden, niet dupliceren. Categoriseer in één van de 4 bestaande buckets (Troubleshooting / Export Formats / Workflows / Deep Dives); een 5e bucket vereist een bewuste beslissing.
- **`app.indxr.ai/*`** — geauthenticeerde UX-copy. Geen SEO; empty/error/success-states horen hier, niet op marketing.
- **Support & vertrouwen** (about/privacy/terms/refund/contact/status) — juridisch/vertrouwen. Deze **moeten echt zijn vóór launch**; een lege scaffold hier is schadelijker dan afwezigheid.

**Eigen pagina vs sectie:**
- Eigen pagina alléén bij (a) een aparte zoekintentie (SEO) óf (b) een aparte gebruikerstaak (docs). Zo niet → sectie op een bestaande pagina.
- **Vul geen nieuwe pagina aan waar al een lege scaffold staat** — vul de scaffold (voorkomt de huidige placeholder-wildgroei).

**Single-source-regel (hard):**
- Elke feitelijke claim — prijs, credit-aantal, limiet, taal-telling, format-telling, model-naam, accuracy-cijfer — moet uit een **gedeelde constante** renderen, nooit hardcoded proza. Euro-bedragen doen dit al (`pricing.ts`-helpers). **Credit-aantallen, format-tellingen, taal-tellingen (67/99+), model-namen (Universal-2/3) en accuracy-cijfers doen dit NIET** en driften al aantoonbaar. Nieuwe pagina's die zulke feiten noemen: importeer ze, hardcode ze niet. Dit is de bouwsteen voor de waarheids-pagina (etappe C).

---

## Discrepanties (audit vs. werkelijkheid)

De basis-audit `architecture/sitemap.md` (2026-05-03) week op deze punten af van de huidige routes; de **routes winnen**:

1. **Laag 3 is al verhuisd.** `sitemap.md` zegt "`/dashboard/*` en `/admin/*` tijdelijk op indxr.ai, subdomain = Werksessie C". Werkelijkheid: alles staat nu in **`apps/app`** (app.indxr.ai). De migratie is gebeurd.
2. **Footer klopt niet meer.** `sitemap.md`: 4 kolommen (Product · Export Formats · Learn · Legal). Werkelijkheid (`packages/shared/Footer.tsx`): **2 kolommen** (Export Formats · Learn) + een bottom-strip (© · Pricing · Docs · About · Privacy · Terms · Contact). Geen "Product"-kolom.
3. **Admin veel groter.** `sitemap.md` noemt 6 admin-routes; werkelijkheid heeft er **11** (o.a. finance, growth, operations, announcements, paid-users, support).
4. **Messages = echte data.** `sitemap.md`: "Messages (mock data — backend pending)". Werkelijkheid: **echte Supabase-data** (`messages` + `support_tickets`).
5. **Nieuwe routes niet in de audit:** `/unsubscribe`, `/dashboard/support` (redirect), `/dashboard/settings`, `/dashboard/account`, `/articles/youtube-transcript-non-english`.
6. **18 artikelen** (niet "18 SEO-pagina's verhuisd" ambigu) — alle 18 gecategoriseerd in de index; geen orphan.

---

## Bronnen
- Routes: `apps/marketing/src/app/**`, `apps/app/src/app/**` (find `page.tsx`/`route.ts`, 2026-07-18).
- Prijzen/credits: `packages/shared/src/lib/pricing.ts` (waarheidsbron).
- Nav/footer/sitemap: `packages/shared/src/components/{Header,Footer}.tsx`, `apps/marketing/src/app/sitemap.ts`.
- Basis-audit: `architecture/sitemap.md`, `architecture/sitemap-audit-2026-05.md`.

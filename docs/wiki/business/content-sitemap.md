# Content-sitemap — INDXR.AI

**Doel:** de kaart van *alle user-facing content* vóór we etappe B (GDPR) en C (waarheids-pagina) schrijven.
**Aangemaakt:** 2026-07-18 · **Bijgewerkt:** 2026-08-03 · **Scope:** `apps/marketing` (indxr.ai) + user-facing kant van `apps/app` (app.indxr.ai)

> **CORRECTIES 2026-08-03** (de 07-18-snapshot beschreef inmiddels-verdwenen claims — geverifieerd tegen code, niet aannames). De genoemde entries hieronder zijn bijgewerkt: **`99.4% accuracy` bestaat NERGENS meer** in de content (grep = 0); **`67 talen`-caption-claim weg** (grep = 0); **`200-video overnight` weg** → echte cap 500/job; **privacy + terms zijn nu ECHTE juridische documenten** (`LEGAL_VERSION` 2026-08-02, Last updated privacy 08-02 / terms 07-20), geen lege bodies meer; **refund = 14-daags herroepingsrecht (ToS §7, gezaghebbend)**, niet "7 dagen/≤5 credits" — die tegenstrijdigheid is rechtgetrokken op /pricing (zie [[product-truth]] §refundbeleid); **pricing- en free-tool-FAQ's zijn géén `[placeholder — Khidr]`-stubs meer** (factuur=on-demand, betaalmethoden zonder opsomming, landenbeperking zichtbaar); **homepage-codevoorbeelden zijn nu echte generator-output** (geen `source_url`); **/login Apple-"coming soon"-knop verwijderd**; **/transcribe H1 sentence case**, taalclaim via `transcriptionRouterPhrase()` (99+ dekking, kopmodel 18). **Volatiele tellingen (formaten/credits/talen/opslag) horen uit een gedeelde bron te renderen** — verifieer tegen `pricing.ts` / `exportFormats.ts` / `storage.ts` / [[product-truth]], niet tegen dit document. Entries buiten de bovenstaande lijst zijn NIET her-geauditeerd sinds 07-18.
**Methode:** de bestaande content-audit (`architecture/sitemap.md`, 2026-05-03) als basis, aangescherpt tegen de *daadwerkelijke* routes in `apps/`. Waar audit en routes verschillen: de routes winnen — verschillen staan in [§ Discrepanties](#discrepanties-audit-vs-werkelijkheid).

> **Twee lagen.** [Laag 1 = wat er IS](#laag-1--de-kaart) (feit). [Laag 2 = mijn oordeel](#laag-2--kritische-blik) (mening). Strikt gescheiden.
> **Waarheidsbron voor prijzen/credits:** `packages/shared/src/lib/pricing.ts`. Er is géén `src/lib/pricing.ts`. Euro-bedragen in content worden *dynamisch* uit die file gerenderd (gaan niet stale); credit-*aantallen*, format-tellingen, taal-tellingen en model-namen zijn hardcoded proza (dát zijn de truth-check-doelen voor etappe C).

**Status-legenda:**
`live` = echte, substantiële content · `placeholder` = scaffold/stub (lege body, `[Placeholder — content coming soon]` of `[KHIDR: vul aan]`) · `stale-vermoed` = interne inconsistentie of verouderd · ⚠ = functie kapot (pagina rendert, maar doet niet wat ze belooft).

---

## Boom — welke route hoort bij welke groep

*Scanbaar in één blik. De tabellen in [Laag 1](#laag-1--de-kaart) dragen het detail (doel/claims/status).*

```
indxr.ai/  ── marketing (publiek)
│
├─ 1 Landing & conversie
│    /                                homepage
│    /pricing                         pakketten + credit-kostentabel + FAQ
│
├─ 2 Vrije tool (funnel-ingang)
│    /transcribe                      3-tab gratis tool (video/playlist/audio)
│
├─ 3 Product-documentatie  /docs/*     (DocsShell — kale referentie-specs)
│    /docs                            hub (Diátaxis, 4 categorieën, ADR-075)
│    Getting started: quickstart · how-indxr-works · faq
│    Guides:          guides/single-video* · guides/playlists · guides/uploads*
│                     · guides/library · guides/summaries
│    Reference:       reference/export-formats/ (+ txt·markdown·csv·srt·vtt·json)
│                     · reference/accuracy · reference/limits
│    Account:         account/credits · account/billing · account/settings
│    (* = nieuw, ADR-075. URL's weerspiegelen de categorie; redirects teruggebracht tot 2 regels.)
│
├─ 4 Funnel-content / SEO  /articles/*  (het verhaal + use-case = de bron)
│    /articles                        index (4 categorieën)
│    ├─ Troubleshooting   not-available (+age-restricted +members-only geabsorbeerd) · non-english · without-extension
│    ├─ Formats           transcript-export-formats (hub: TXT·Markdown·CSV·SRT/VTT·JSON·RAG-JSON)
│    ├─ Workflows         playlist- (+bulk geabsorbeerd) · audio-to-text · -obsidian
│    └─ AI & RAG        chunk-…-for-rag · channel-knowledge-base · transcripts-vector-database
│
├─ 5 Support & vertrouwen
│    /about · /contact · /privacy · /terms · /suspended
│
└─ 6 Auth flows  (blijven op marketing-domain, ADR-036)
     /login · /signup · /forgot-password · /onboarding · /auth/callback

app.indxr.ai/  ── app (auth vereist)
│
├─ 7 Dashboard (user-facing app-copy)
│    /dashboard                       home (saldo, CTA, activiteit)
│    /dashboard/transcribe            3-tab extractie
│    /dashboard/library  (+ /[id]     transcript-viewer)
│    /dashboard/billing  (+ /success · /cancel)
│    /dashboard/account · /dashboard/settings
│    /dashboard/messages · /dashboard/support(→ messages?tab=support)
│    /unsubscribe                     publiek, signed token
│
└─  Admin  /admin/*                   intern, 11 routes (geen user-facing content)
```

---

## Laag 1 — de kaart

### Groep 1 — Landing & conversie (`indxr.ai/`)

| Pagina | Route | Doel (1 zin) | Belangrijkste claims | Status |
|---|---|---|---|---|
| Homepage | `/` | Pitch: extract → export → index voor video's, playlists, audio. | "Extract. Export. Index. Every video."; single URL / playlist / audio in één interface; formaten TXT·MD·SRT·VTT·JSON·RAG-JSON·CSV; "no account needed — free for captioned videos" + eerlijke anon-limiet (10 caption-extracties/dag); playlist-cap **500/job** (niet "200 overnight"); StatsFromTesting "~5% median" (eigen runs, ADR-044); **homepage-codevoorbeelden = echte generator-output** (geen `source_url`); EU-hosted (Supabase eu-west-1); audio verwijderd na transcriptie; geen extensie / geen abonnement / credits verlopen nooit; teaser "Starting at €5.00". Testimonials = **expliciete placeholder** (ADR-044, geen nep-quotes). | live |
| Pricing | `/pricing` | Pay-per-use pakketten + credit-kostentabel + FAQ. | Tiers (uit `pricing.ts`): **Try €5/100 · Starter €15/400 · Plus €25/1.000 (Recommended) · Power €60/3.000**; VAT inclusief, geen abonnement, credits verlopen nooit; credit-kosten: AI-transcriptie 1cr/min, playlist 1cr/video na 3 gratis, AI-summary 3cr, RAG-JSON 1cr/10min, single-caption 0cr; **25 welcome credits**; audio-upload 9 formaten tot **500MB** (uit `uploadFormats`); **refund = 14-daags herroepingsrecht (ToS §7)**; opslag-bijkoop staat nu in de kostentabel; landenbeperking zichtbaar vóór de kassa. FAQ's ingevuld (factuur on-demand, betaalmethoden zonder opsomming) — **géén placeholders meer**. | live |

### Groep 2 — Vrije tool (funnel-ingang)

| Pagina | Route | Doel (1 zin) | Belangrijkste claims | Status |
|---|---|---|---|---|
| Free tool | `/transcribe` | Gratis 3-tab tool (video/playlist/audio) met conversie-gating. | H1 "Free YouTube transcript generator" (sentence case); `meta-keywords`-tag verwijderd; single-video werkt voor iedereen (auto-save alleen ingelogd); playlist + audio → **gratis account vereist** (25 credits, geen kaart); audio 1cr/min, "deleted after transcription"; formaten TXT (gratis/anoniem) vs rest (account), lijst uit `exportFormats`; taalclaim via `transcriptionRouterPhrase()` (99+ dekking, kopmodel Universal-3.5 Pro voor z'n 18 talen). FAQ's ingevuld — **geen placeholders**. | live |

### Groep 3 — Product-documentatie (`indxr.ai/docs/*`)

Alle doc-routes renderen via `DocsShell` (sidebar uit `apps/marketing/src/lib/docs-config.ts`). De sidebar volgt **Diátaxis** (ADR-075): **Getting started (leren) / Guides (doen) / Reference (opzoeken) / Account** — URL's weerspiegelen de categorie. ADR-075 verhuisde de pagina's (quickstart, `guides/*`, `reference/*`, `how-indxr-works` als één pagina) en voegde twee guides toe (`single-video`, `uploads`). Volledig geschreven: `quickstart`, `how-indxr-works`, `faq`, de 5 guides, `account/settings`, de export-format-specs + herschreven hub. `account/credits`/`billing` dragen nog `KHIDR`-stubs; `reference/accuracy`/`limits` zijn dun. **Redirects teruggebracht tot 2 regels** (pre-launch, geen externe links — ADR-075); interne links wijzen direct naar de echte route.

| Pagina | Route | Doel (1 zin) | Belangrijkste claims | Status |
|---|---|---|---|---|
| Docs hub | `/docs` | Navigatiehub naar alle doc-categorieën. | Geen eigen productclaims; category-intro's. | live |
| Getting started | `/docs/quickstart` | Quickstart naar eerste transcript. | Geen account voor single-video; captions "2–3 sec"; anoniem = Copy/TXT gratis; "Sign up to unlock MD/CSV/SRT/VTT/JSON"; geen captions → AI 1cr/min + account; **"Sign up for 25 free credits"**. | live |
| Overview | `/docs/how-indxr-works` | High-level pipeline-uitleg. | **VOLLEDIG geschreven** (ADR-072): captions-of-transcriptie, account-verschil, 7 formaten (6 gratis), library, summaries, credits — getallen uit `pricing.ts`. "Seven formats. Six of them free" (clash met export-formats opgelost). | live |
| Accuracy and languages | `/docs/reference/accuracy` | Nauwkeurigheid + talen (samengevoegd, ADR-072: absorbeert auto-captions + ai-transcription + languages). | Auto-captions (bron-afhankelijk) vs AI (`transcriptionModelName()`, ~99.4% clean English); 18 talen U3.5 Pro / 99 U2; **WER-tiers ≤10/10-25/25-50/>50%** (bron: AssemblyAI). | live (skeleton+merge) |
| Export formats (hub) | `…/export-formats` | Overzicht formaten. | **"seven formats"** (2 TXT-varianten apart geteld) → botst met overview. | placeholder |
| Export — txt | `…/export-formats/txt` | TXT-spec. | `[HH:MM:SS]`; "TXT is the only format available to anonymous users". | placeholder |
| Export — markdown | `…/export-formats/markdown` | Markdown-spec. | YAML-frontmatter (titel/URL/datum/duur); Obsidian/Notion/Logseq. | placeholder |
| Export — csv | `…/export-formats/csv` | CSV-spec. | Kolommen start/end/text; Excel/Sheets. | placeholder |
| Export — srt | `…/export-formats/srt` | SRT-spec. | `HH:MM:SS,mmm`; VLC/YouTube/Resolve. | placeholder |
| Export — vtt | `…/export-formats/vtt` | VTT-spec. | `WEBVTT`-header; HTML5/Mux/Cloudflare Stream. | placeholder |
| Export — json | `…/export-formats/json` | RAG-JSON-spec. | **90–120s chunks**, sentence-snap, `deep_link` per chunk; LangChain/LlamaIndex/Pinecone/Chroma/Weaviate/Qdrant. | placeholder |
| Summaries | `…/summaries` | AI-samenvatting (ADR-072, nieuw). | 3 credits flat (uit `pricing.ts`), ongeacht lengte; opgeslagen bij transcript; bewerkbaar met origineel behouden. | live (skeleton) |
| Limits | `…/limits` | Rate/size/duur-limieten (absorbeert `api`, ADR-072). | Nu wél concrete getallen (ADR-071): AI-transcriptie ≤10u, playlist ≤500/job, rate limits; captions geen duur-cap; geen publieke REST API. | placeholder (thin) |
| Credits | `/docs/account/credits` | Credit-kosten, reserve-model, refunds (gesplitst uit credits-and-billing, ADR-074). | Captions 0cr; AI 1cr/min; summary 3cr; nooit verlopen; **auto-refund bij mislukte AI-operatie**. `KHIDR:` TODO-secties. | live (stub) |
| Billing and invoices | `/docs/account/billing` | Kopen, facturen, aankoophistorie, VAT-scope (gesplitst, ADR-074; bevat het VAT-antwoord uit de FAQ). | One-time packages (verwijst naar /pricing); VAT NL+OSS, UK/CH aparte registratie. `KHIDR:` TODO. | live (stub) |
| Playlists | `/docs/guides/playlists` | Playlist-job (nieuw, ADR-074). | Per-video keuze; eerste 3 captions gratis; credits vooraf gereserveerd, ongebruikt terug; draait door na tab-sluit; ≤500/job. | live (skeleton) |
| Your library | `/docs/guides/library` | Bibliotheek (nieuw, ADR-074). | Transcripten bewaard; bewerkbaar met origineel behouden; collecties; zoeken; verwijderen. | live (skeleton) |
| Settings | `/docs/account/settings` | Voorkeuren (nieuw, ADR-074). | RAG-chunkgrootte 30/60/90/120s (standaard 60); e-mailvoorkeuren; account verwijderen → /privacy. | live (skeleton) |
| ~~Data handling~~ | *verwijderd (ADR-074)* | Dubbeling met `/privacy`. | 308 → `/privacy`; FAQ-vraag "What happens to my audio and transcripts?" + link. | verwijderd |
| ~~How-to hub~~ | *verwijderd (ADR-073)* | — | 308 → `/articles` (Workflows dekt dit). | verwijderd |
| ~~Troubleshooting hub~~ | *verwijderd (ADR-073)* | — | 308 → `/articles` (de 5 artikelen + `/articles`-index dragen dit). | verwijderd |

#### FAQ — apart & gecategoriseerd (`/docs/faq`, top-level sinds ADR-073, status: live)

Volledig uitgebouwd. In de code gegroepeerd als 4 built-in labels (*General · YouTube Transcripts · Pricing & Credits · Technical*). Hier hergegroepeerd naar thema:

- **Hoe-werkt-het / algemeen:** Wat is INDXR.AI en waarvoor? · Werkt het zonder Chrome-extensie? · Hoe download ik een transcript als tekstbestand? · Transcript van video zónder captions? · Hele playlist in één keer? · SRT-download? · Welke exportformaten? · Hoe lang duurt extractie? · Waarom soms bijna instant? (dedup)
- **Pricing:** Wat kost het om een video te transcriberen? · Waarom kan ik niet kopen vanuit mijn land? (VAT-scope)
- **Credits:** Verlopen mijn credits? · Hoe werkt het creditsysteem?
- **Account:** Heb ik een account nodig?
- **Privacy / rechten / data:** Mag ik transcripts commercieel gebruiken?
- **Troubleshooting / taal:** Waarom krijg ik soms captions in de verkeerde taal — en hoe haalt INDXR het origineel?

*Feiten in FAQ-antwoorden:* captions 0cr / AI 1cr-min / summary 3cr; credits verlopen nooit; captions 1–3s, AI ~1–2 min per 10 min audio; VAT NL + EU One Stop Shop, UK & Zwitserland geblokkeerd tot lokale registratie; commercieel gebruik toegestaan (rechten bij creator).

### Groep 4 — Funnel-content / SEO-artikelen (`indxr.ai/articles/*`)

10 artikelen + index (was 18; **9 samengevoegd op 2026-08-07** — zie [keyword-demand-2026-08.md](keyword-demand-2026-08.md) § "Artikeloordeel"). Drie gedeelde templates (`ToolPageTemplate` / `TutorialTemplate` / `ArticleTemplate`). Euro-bedragen dynamisch uit `pricing.ts` → **geen placeholders, geen stale pagina's gevonden**. Terugkerende claims: AI = AssemblyAI Universal-3 Pro @ 1cr/min; captions gratis; 500MB-cap; 7 audioformaten; RAG-JSON 1cr/10min (eerste 3 gratis); summary 3cr; credits verlopen nooit. De 9 verdwenen slugs krijgen elk één 308 → eindpunt in `apps/marketing/next.config.ts` (geen ketens); interne links wijzen rechtstreeks naar het eindpunt.

**Consolidatie (2026-08-07):** Bulk → Playlist · Age-restricted + Members-only → Not-available (als secties) · 6× Formats (TXT/Markdown/CSV/SRT/JSON/RAG-JSON) → één hub `transcript-export-formats`. Structuurtaak: inhoud verhuisd zoals-hij-was + ontdubbeld; tekstuele kwaliteit = latere ronde.

| Route (`/articles/…`) | Categorie (index) | Product-specifieke claims (truth-check-doelen) | Status |
|---|---|---|---|
| `youtube-transcript-not-available` | Troubleshooting | 67 talen captions / 99+ AI; AssemblyAI "94.1% English, 9.97% WER vs 24.73% Amazon"; live-captions EN-only + 1000+ subs; **absorbeert age-restricted + members-only als secties** (audio-upload-workaround, error-cards, 0 credits). | live |
| `youtube-transcript-non-english` | Troubleshooting | YouTube CDN forceert `tlang=en` (niet override-baar); **model-routing: Universal-2 voor non-EN, Universal-3 Pro alleen EN/ES/DE/FR/PT/IT** (⚠ botst met "Universal-3 Pro" elders). | live |
| `youtube-transcript-without-extension` | Troubleshooting | **"8 export formats"** (⚠ botst); geen extensie ("post-launch roadmap"); yt-dlp + interne API; 67/99+ talen. | live |
| `transcript-export-formats` | Formats (hub) | **Samenvoeging van 6 format-artikelen** (TXT·Markdown·CSV·SRT/VTT·JSON·RAG-JSON), elk als sectie. "six export formats, nine export options"; UTF-8 BOM; resegment 3–7s/≤42 chars; RAG-JSON 1cr/10min; frontmatter-velden. ⚠ oude "8 vs 9"-telling-botsing blijft (latere kwaliteitsronde). | live (nieuw) |
| `youtube-playlist-transcript` | Workflows | 3-gratis; failed retry na 30s; batch ≤500; **geen channel-URL's**; dedup-badges (amber=captions, violet=AI); **absorbeert bulk** (use-cases-sectie). | live |
| `audio-to-text` | Workflows | 500MB (~8u); "94–96%+ clean audio"; 99+ talen; summary 3cr; SRT/VTT 3–7s/42 chars. | live |
| `youtube-transcript-obsidian` | Workflows | Markdown/frontmatter; summary 3cr; "19 lectures/13 hours" ZIP; youtube-transcript-api geblokt op cloud-IP's, INDXR = yt-dlp+residential proxy. | live |
| `chunk-youtube-transcripts-for-rag` | AI & RAG | RAG 30/60/90/120s presets, 15% overlap, sentence-snap (AI) vs segment-snap (captions). | live (grotendeels topic) |
| `youtube-channel-knowledge-base` | AI & RAG | **Alleen playlist-URL's, geen channel-URL's**; "up to 500 videos"; dedup gratis; voorbeeld 50×30min = 1.650 credits. | live |
| `youtube-transcripts-vector-database` | AI & RAG | RAG via Playlist-tab-toggle; chunks 90–120s (~300–400 tokens); embedding-kosten zijn OpenAI's, niet INDXR's. | live (grotendeels topic) |
| `articles` (index) | — | Groepeert de 18 artikelen in 4 categorieën (Troubleshooting 5 · Formats 6 · Workflows 4 · AI & RAG 3). | live |

### Groep 5 — Support & vertrouwen

| Pagina | Route | Doel (1 zin) | Belangrijkste claims | Status |
|---|---|---|---|---|
| About | `/about` | Bedrijf/product-omschrijving. | Intro echt (captions/playlists/AI-fallback/multi-format); **"What we do" en "Who builds" secties leeg** (`[KHIDR: vul aan]`). | placeholder (deels) |
| Contact | `/contact` | Support-formulier (Help vs Feedback). | Twee kaarten; "we read and respond to everything"; reply in dashboard Messages. **⚠ Formulier submit werkt niet** — `handleSubmit` = fake 800ms delay, marketing-`/api/support` niet geïmplementeerd (terwijl app wél `/api/support/submit` heeft). | live UI / ⚠ kapotte backend |
| Privacy | `/privacy` | GDPR-privacyverklaring. | Echte GDPR-tekst; "Last updated: 2026-08-02" (`LEGAL_VERSION`); no-cookie-speler-disclosure. Geen lege bodies meer. | live |
| Terms | `/terms` | Terms of Service. | Echte terms incl. **§7 Refunds — 14-daags herroepingsrecht, gezaghebbend** (ADR-069); "Last updated: 2026-07-20". | live |
| Suspended | `/suspended` | "Account paused"-melding. | "Your account is paused"; `noindex`; **contact-email = `[KHIDR]` TODO**. | live (minimal) |

### Groep 6 — Auth flows (blijven op marketing-domain, ADR-036)

| Pagina | Route | Doel | Belangrijkste claims | Status |
|---|---|---|---|---|
| Login | `/login` | E-mail/wachtwoord + OAuth. | Google OAuth actief (Apple-"coming soon"-knop **verwijderd** 2026-08-03 — kwam niet); forgot-password-link. | live |
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

## Docs ↔ artikel — rolverdeling

**Beslist (optie 1): docs en artikelen zijn gescheiden, kruisgelinkt — geen duplicate content.** Voor elk onderwerp dat op beide lagen bestaat:

- **DOCS-pagina = kale referentie-spec.** Exacte kolomnamen/velden, formaat, één codevoorbeeld. Kort. Voor bestaande gebruikers die "de exacte spec" zoeken.
- **ARTIKEL = het verhaal + use-case + conversie.** Voor nieuwe bezoekers via search. **Dit is de bron** — de docs-spec wordt eruit *gedestilleerd*, niet andersom.
- **Ze linken naar elkaar:** docs → artikel voor "waarom/wanneer", artikel → docs voor "de exacte spec".
- **De hub (`export-formats`) verwijst alleen** — overzicht + doorverwijstabel, géén derde plek met dezelfde inhoud.

> Doel van deze tabel: bij het schrijven (etappe C→F) mag de docs-pagina **niet per ongeluk een tweede artikel worden**. Kolom "DOCS draagt" = kaal; kolom "ARTIKEL draagt (bron)" = verhaal.

| Onderwerp | DOCS-pagina (spec) — draagt | ARTIKEL (bron) — draagt |
|---|---|---|
| **Plain text / TXT** | `…/export-formats/txt` — TXT-varianten (met/zonder timestamps), `[HH:MM:SS]`-format, "anoniem-only" | `transcript-export-formats` § Plain text — waarom plain text, wat-je-krijgt |
| **Markdown** | `…/export-formats/markdown` — exacte YAML-frontmatter-keys, paragraaf-split-regel | `transcript-export-formats` § Markdown · (`youtube-transcript-obsidian` = workflow-variant) |
| **CSV** | `…/export-formats/csv` — kolomnamen (`segment_index,start,end,duration,text,word_count`), UTF-8 BOM | `transcript-export-formats` § CSV — pandas/Sheets/Voyant use-case |
| **SRT** | `…/export-formats/srt` — `HH:MM:SS,mmm`, index-nummering | `transcript-export-formats` § SRT/VTT — resegmentatie (3–7s/42chars), editor-compat |
| **VTT** | `…/export-formats/vtt` — `WEBVTT`-header, `HH:MM:SS.mmm` | `transcript-export-formats` § SRT/VTT (dekt SRT **én** VTT) |
| **JSON (standaard)** | `…/export-formats/json` — standaard-JSON schema-velden (metadata-wrapper) | `transcript-export-formats` § JSON — use-cases, velden-uitleg |
| **RAG-JSON** | `…/export-formats/json` (RAG-deel) — chunk-schema (90–120s, `deep_link`, overlap) | `transcript-export-formats` § RAG-JSON + `chunk-…-for-rag` / `…-vector-database` (deep dives) |
| **Talen** | `…/languages` — 67 captions / 99+ AI, auto-detect (kaal) | `youtube-transcript-non-english` — `tlang=en`-verhaal, model-routing |
| **Formaten-overzicht** | `…/export-formats` (hub) — **alleen** overzichtstabel + doorverwijzing | `/articles` (categorie *Formats*) — de losse verhalen |
| **Troubleshooting** | *(geen docs-hub meer — ADR-073)* de **`/articles`-index** (categorie Troubleshooting) is de index | `not-available` (bevat age-restricted + members-only-secties) · `non-english` · `without-extension` |

*Onderwerpen zónder artikel-tegenhanger (docs-only, blijven kaal):* `accuracy` (Accuracy and languages), `limits`, `summaries`, `guides/playlists`, `guides/library`, `account/settings`. *Data-retentie:* geen aparte docs-pagina meer — `/privacy` draagt dit (ADR-074). *Credits:* `/pricing` + `/docs/account/credits` dragen dit — de dubbele `…/how-indxr-works/credits` is **verwijderd** (308 → `account/credits`).

---

## Laag 2 — kritische blik

> Vanaf hier is dit **mijn oordeel**, niet de kaart. Niets is gebouwd/verwijderd — alleen gesignaleerd. Lege placeholder-bodies staan hier **niet** los uitgelicht: die lopen we sowieso pagina-voor-pagina langs in etappe C→F, de status-kolom in Laag 1 volstaat. Wat hier staat zijn de *echte gaten* + het ene *kapotte-functie*-item.

### 1. Ontbrekende pagina's (echte gaten)

| Ontbrekend | Wie zoekt het | Waarom het ontbreken schaadt |
|---|---|---|
| ~~**Refund-/terugbetaalbeleid — een gezaghebbende versie**~~ ✅ OPGELOST 2026-08-03 | Koper vóór aankoop; support; Stripe-dispuut | Beleid is nu beslist én juridisch bekrachtigd: **ToS §7 = 14-daags herroepingsrecht, refund alleen als géén credit van die aankoop verbruikt is** (ADR-069). De tegenstrijdige "/pricing 7-dagen/≤5-credits"-FAQ is naar die versie getrokken; /terms is gezaghebbend. Eén regel in [[product-truth]] zodat het niet opnieuw uiteenloopt. |

*Privacy- en terms-bódies zijn inmiddels **echte juridische documenten** (`LEGAL_VERSION` 2026-08-02) — niet meer leeg, niet meer launch-blocker.*

### 2. Kapotte functie (technisch fix-item, geen content-kwestie)

| Item | Wat er mis is | Actie |
|---|---|---|
| **`/contact`-formulier verstuurt niets** | Rendert een volledig formulier maar `handleSubmit` = **fake 800ms delay**; marketing-`/api/support` **bestaat niet**. Ondertussen heeft de app een werkende `/api/support/submit`. De pagina belooft "we read and respond to everything" terwijl niets aankomt. | Koppel aan het bestaande app-endpoint, óf maak de pagina eerlijk ("mail ons op…"). Geen redirect — **repareren**. |

### 3. Groei-regel — waar hoort een nieuwe pagina thuis

**Laag bepaalt thuis:**
- **`indxr.ai/` (marketing)** — conversie. Alleen home, pricing, vrije tool. Nieuwe conversie-hoek? Sectie op de homepage, geen nieuwe route.
- **`indxr.ai/docs/*`** — evergreen *producttruth*, **kale referentie-spec**. Eén onderwerp = één doc-pagina, alleen bij een aparte gebruikerstaak. Anders sectie op een bestaande doc.
- **`indxr.ai/articles/*`** — SEO-acquisitie, **het verhaal (= de bron)**. Nieuwe pagina alleen bij een aparte zoekintentie (keyword). Overlap met bestaand artikel → uitbreiden, niet dupliceren. Categoriseer in één van de 4 buckets (Troubleshooting / Formats / Workflows / AI & RAG); een 5e bucket = bewuste beslissing.
- **`app.indxr.ai/*`** — geauthenticeerde UX-copy. Geen SEO; empty/error/success-states horen hier, niet op marketing.
- **Support & vertrouwen** (about/privacy/terms/refund/contact) — juridisch/vertrouwen; **moeten echt zijn vóór launch**.

**De nu-beslissingen (zodat toekomstige pagina's automatisch in het stramien vallen):**
- **Nieuw format of onderwerp** → een **docs-spec (kaal)** + een **artikel (verhaal)**, kruisgelinkt; **het artikel is de bron**, de spec wordt eruit gedestilleerd. Nooit twee artikelen. Zie [Docs ↔ artikel](#docs--artikel--rolverdeling).
- **Nieuwe troubleshooting** → een **artikel**, gecategoriseerd onder Troubleshooting op de **`/articles`-index** (die is de index; de oude docs-hub `/docs/help/troubleshooting` is verwijderd → 308 `/articles`, ADR-073). Het artikel draagt.
- **Formaten-/troubleshooting-hub** blijft *overzicht + doorverwijzing* — nooit een derde inhoudsplek.
- **Status, changelog, use-case-landings** → **post-launch / bewust niet-nu** (zie hieronder), niet in de pre-launch-map aanplakken.

**Eigen pagina vs sectie:** eigen pagina alléén bij (a) aparte zoekintentie (SEO) óf (b) aparte gebruikerstaak (docs). Zo niet → sectie. Vul een bestaande lege scaffold i.p.v. een nieuwe pagina ernaast te zetten.

**Single-source-regel (hard):** elke feitelijke claim — prijs, credit-aantal, limiet, taal-telling, format-telling, model-naam, accuracy-cijfer — moet uit een **gedeelde constante** renderen, nooit hardcoded proza. Euro-bedragen doen dit al (`pricing.ts`-helpers). **Credit-aantallen, format-tellingen, taal-tellingen (67/99+), model-namen (Universal-2/3) en accuracy-cijfers doen dit NIET** en driften al aantoonbaar (6 vs 7 vs 8 formats; Universal-3 Pro vs Universal-2). Nieuwe pagina's die zulke feiten noemen: importeer ze. Dit is de bouwsteen voor de waarheids-pagina (etappe C).

---

## Post-launch / bewust niet-nu

Apart gehouden van de pre-launch-map. Geen leemtes — keuzes.

| Pagina | Waarom niet nu | Vorm later |
|---|---|---|
| **Status-/uptime-pagina** | Post-launch. Hoort **niet in /docs** maar wordt eigen top-level (`/status` of subdomein), gevoed door monitoring-taak 1.14 — **BetterStack levert een gehoste statuspagina**. Bij downtime een app-topbar-banner die erheen linkt. | Eigen `/status` / subdomein + topbar-banner |
| **Changelog** | Post-launch, en eerder een **app-/release-notes**-ding dan marketing (beslissing 2026-04-30). | App-release-notes |
| **Use-case-landings per doelgroep** | Bewust niet pre-launch (**ADR-038, geen audience hubs**) én de doelgroepen zijn moeilijk scherp te onderscheiden — geen leemte, een keuze. Post-launch op basis van PostHog-data. | `/articles/*` of eigen hub, data-gedreven |

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

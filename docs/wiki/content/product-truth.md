# Product-truth — wat INDXR.AI dóét en kost

**Opgesteld:** 2026-07-20 · **Aard:** read-only inventarisatie (geen code gewijzigd) · **Doel:** één bron van waarheid met de **harde, code-geverifieerde feiten** over het live product, als grondslag voor het herschrijven van alle user-facing content (overview, landing, pricing, FAQ, docs, artikelen).

**Regel:** elk feit hieronder heeft een `bestand:regel`-bron. Verzin niets. Als content afwijkt van dit document, wint dit document (= de code). Bij twijfel: her-verifieer tegen de bron-file, niet tegen een eerdere content-versie.

Verwante kaarten: [content-sitemap.md](../business/content-sitemap.md) (alle pagina's), [pricing-source-of-truth.md](../architecture/pricing-source-of-truth.md), [business/pricing.md](../business/pricing.md).

---

## 1. Pricing — bron: `packages/shared/src/lib/pricing.ts`

Eén single source of truth: `PACKAGES` (`pricing.ts:35-92`). Alle prijzen **BTW-inclusief** (ADR-058, ronde prijzen — bewuste keuze, geen `,99`-charmeprijzen).

| Tier | Prijs (incl. BTW) | Credits | €/credit | UI-rol | Bron |
|------|-------------------|---------|----------|--------|------|
| **Try** | €5 | 100 | €0,0500 | Instap (kleine strip onder de 3 kaarten) | `pricing.ts:37-49` |
| **Starter** | €15 | 400 | €0,0375 | Hoofdkaart links | `pricing.ts:50-63` |
| **Plus** ★ | €25 | 1.000 | €0,0250 | **Anker**, center-stage, badge "Recommended" | `pricing.ts:64-77` |
| **Power** | €60 | 3.000 | €0,0200 | Hoofdkaart rechts | `pricing.ts:78-91` |

- **`mostPopular`** = Plus (`pricing.ts:72`) → toont badge **"Recommended"** (`PricingTiers.tsx:85-91`).
- **Credits verlopen nooit** — expliciet in élke tier-`description` ("Credits never expire.", bv. `pricing.ts:43`).
- **Ankertier voor euro-voorbeelden in content = Plus** (`ANCHOR_TIER_ID = "plus"`, `pricing.ts:146`). Alle "at Plus pricing"-voorbeelden komen hier vandaan.
- Er zijn **4 tiers**, geen "Basic"/"Pro"/"Test" — die bestaan niet meer (ADR-052/058). Instaptier heet **Try** (niet "Test").

### Welcome-credits & free-tier — bron: `pricing.ts:107-112`
- **Welcome-credits = 25** (`FREE_TIER.WELCOME_CREDITS = 25`, `pricing.ts:109`). Toegekend ná e-mailverificatie (zie LOG 2026-07-20).
- **Playlist eerste 3 video's gratis** (`FREE_TIER.PLAYLIST_FREE_VIDEOS = 3`, `pricing.ts:110`).
- `FREE_TIER.RAG_FREE_EXPORTS = 3` (`pricing.ts:111`) — **DODE CONSTANTE**, nergens gelezen (zie §2, RAG). Content mag hier **niet** naar verwijzen.

### UI-parity: billing-UI vs `pricing.ts` — GEEN afwijking in de draaiende UI
Zowel de marketing-`/pricing`-pagina als de app-`/dashboard/billing`-pagina renderen via hetzelfde gedeelde component `PricingTiers` (`packages/shared/src/components/pricing/PricingTiers.tsx`), dat volledig uit `PACKAGES` leest — geen hardcoded prijzen/credits.
- App-billing: `apps/app/src/components/dashboard/billing/BillingPurchaseGrid.tsx:109` gebruikt `PricingTiers`.
- Checkout leidt de prijs **server-side** af: `apps/app/src/app/api/stripe/checkout/route.ts:82` `unit_amount = Math.round(pkg.priceEur * 100)` en `route.ts:92` `credits: pkg.credits.toString()` in de Stripe-metadata. Client-prijs wordt nooit vertrouwd.
- Credit-cost-tabel op `/pricing` is eveneens afgeleid: `apps/marketing/src/components/pricing/CreditCostTable.tsx:7` importeert `CREDIT_COSTS`/`costInTier`.

**Conclusie:** de zichtbare pricing-UI is 1-op-1 in sync met `pricing.ts`.

### ⚠️ Waar de docs WÉL afwijken (te corrigeren, geen UI-bug)
- **`docs/wiki/architecture/pricing-source-of-truth.md:63`** toont nog de **oude ADR-052-getallen** (Try €3,49/100, Plus €24,99/1.300, Power €49,99/3.100). Dat is **stale** t.o.v. de live ADR-058-getallen hierboven. `docs/wiki/business/pricing.md` (herzien 2026-07-14) is wél correct.
- `docs/wiki/roadmap/priorities.md:404` beschrijft de live getallen correct (€5→100, €15→400, €25→1.000, €60→3.000) maar markeert de **webhook-grant per tier als nog niet end-to-end geverifieerd sinds 14-07-2026** — relevant vóór launch, niet voor content.

---

## 2. Creditmodel — wat kost wat (code-geverifieerd)

Constanten: `pricing.ts:98-105` (`CREDIT_COSTS`). Formule-basis: **1 credit = 1 minuut** (`backend/credit_manager.py:71,84`).

| Actie | Kost | Formule / regel | Aftrek-mechanisme | Bron |
|-------|------|-----------------|-------------------|------|
| **Caption-extractie, losse video** | **0 (gratis)** | endpoint raakt credits nooit aan | — | `backend/main.py:293`, `:472-473` |
| **AI-transcriptie** | **1 cr/min** | `math.ceil(duration/60)`, min 1 | reserve→settle (live) | `credit_manager.py:84,87`; `transcription_pipeline.py:381,660` |
| **AI-summary** | **3 cr** (vast) | balansgate `< 3` | `deduct_credits_atomic` | `backend/main.py:1108-1119` |
| **Playlist — caption-video** | **1 cr** (0 als index<3 en geen retry) | `is_free = video_index < 3 and not is_retry` | `update_playlist_video_progress` (`p_amount`) | `backend/worker.py:431,341` |
| **Playlist — whisper-video** | **1 cr/min**, **géén** gratis-korting | `ceil(dur/60)`, min 1 | reserve→settle | `backend/main.py:1291-1294` |
| **RAG-JSON export (chunked)** | **1 cr / 10 min** | `Math.max(1, Math.ceil(duration/600))` | `deduct_credits_atomic` (`product_type:'rag'`) | `packages/shared/src/actions/rag-export.ts:32,105` |
| **Export TXT / MD / SRT / VTT / CSV / plain-JSON** | **0 (gratis)** | download-only, geen server-call | — | `apps/app/src/components/library/TranscriptViewer.tsx:500-529` |

**Belangrijk voor content:**
- **Caption-extractie is altijd gratis** (`SINGLE_VIDEO_AUTO_CAPTIONS = 0`, `pricing.ts:104`). Zelfs voor ingelogde users wordt alleen een usage-log geschreven, geen credit afgetrokken.
- **Plain-JSON download is gratis**; alleen de **chunked RAG-JSON** kost credits. Content moet dit onderscheid maken (`TranscriptViewer.tsx:511-523` gratis vs `:558-578` betaald).
- **De "eerste 3 RAG-exports gratis"-claim is ONWAAR.** Er is geen account-brede gratis-teller. De échte gratis-regel is **per-transcript re-download**: de eerste export van een transcript kost credits, daarna zijn alle 4 chunk-presets van datzelfde transcript gratis her-downloadbaar — en dat gratis-pad wordt **client-side** afgehandeld (de server-action wordt simpelweg niet aangeroepen). UI-copy: `TranscriptViewer.tsx:1207` "After this first export, all four chunk presets are free to re-download." De server-action controleert géén bestaande `rag_exports` en rekent altijd af bij aanroep (`rag-export.ts:91-92`).
- **Whisper-video's in een playlist krijgen de gratis-3-korting NIET** — de gratis-3 geldt alleen voor caption-video's; een whisper-video op een index-0..2-plek verbruikt wél een gratis-slot maar wordt per minuut gerekend (`backend/main.py:1291-1294`).

### Reserve-/hold-model (ADR-050) — bron: `credit_manager.py:14-20`, `:242-331`
Standaard **AAN**: `RESERVATION_ENABLED` default `"true"` (`credit_manager.py:20`).

- **Reserveren bij start** = de geschatte kost wordt vooraf van het saldo gehaald (`kind='reservation'`).
  - Losse whisper-job: reserveert `estimated_cost = calculate_credit_cost(duration)` (`backend/main.py:885`, reserve-call `:960-963`).
  - Playlist: reserveert de som over alle betaalde video's — `_compute_playlist_reservation` (`backend/main.py:1285-1308`): per whisper-video `ceil(dur/60)`, per betaalde caption-video (retry óf index≥3) `+1`; reserve-call `main.py:1358-1364`.
  - Onvoldoende saldo → job/playlist-rij verwijderd, **402** teruggegeven (`main.py:964-975`, `:1365-1375`).
- **Settlen tijdens verbruik** = per video de echte consumptie geregistreerd, **balans-neutraal** (`kind='settlement'`, `credit_manager.py:279-308`).
- **Refund aan het eind** = `credits_reserved − Σ(settlements)` (`credit_manager.py:311-331`). Playlist-completion refund: `worker.py:547-548`; na retry-pass: `worker.py:663-664`; watchdog/crash-recovery vangnetten: `worker.py:800,848,910-912,996`.

**Content-implicatie:** de user ziet zijn saldo **direct dalen met de reservering** bij het starten van een playlist/AI-transcriptie, en het **onbenutte deel komt terug** bij afronding. Beschrijf dit eerlijk ("we reserveren vooraf en boeken het verschil terug") i.p.v. "je betaalt achteraf".

### Gratis vs. ingelogd — export-gating (bron: `packages/shared/src/components/TranscriptCard.tsx`)
- **Anoniem = alleen TXT** (plain `:130` + timestamps `:135`, geen auth-gate).
- **MD, JSON, CSV, SRT, VTT, RAG** → `requireAuth()` (`TranscriptCard.tsx:122-128,143,152,161`); copy `:418` "Sign up or log in to export as CSV, SRT, VTT, JSON, or Markdown".
- **RAG is bovendien credit-gated** ook voor ingelogde users (eerste export, zie boven).

---

## 3. Features die live zijn (BUILT — met hoofdbron)

| Feature | Status | Hoofdbron |
|---------|--------|-----------|
| Caption-extractie, **native-anchored** (`-orig`-track) | LIVE | `backend/youtube_utils.py:174-181,337,368-392`; `backend/language_utils.py:18` |
| AI-transcriptie (AssemblyAI, EU) | LIVE | `backend/assemblyai_client.py`; `backend/transcription_pipeline.py`; route `apps/app/src/app/api/transcribe/whisper/route.ts` |
| AI-summary (EU LLM Gateway) | LIVE | `apps/app/src/components/library/AiSummaryView.tsx`; `backend/main.py:1086-1246` |
| Playlist batch-extractie | LIVE | `apps/app/src/app/api/playlist/*`; `backend/worker.py` |
| Tiptap-editor (bewerkbaar transcript, opgeslagen in `transcripts.edited_content`) | LIVE | `apps/app/src/components/library/TranscriptViewer.tsx:27-31,613,635` |
| Library + Collections | LIVE (collections desktop-only, zie §5) | `apps/app/src/app/dashboard/library/page.tsx`; `apps/app/src/components/app-sidebar.tsx` |
| Export-formaten | LIVE | `packages/shared/src/utils/formatTranscript.ts` |

### Native-anchored caption-taal (belangrijk differentiator, klopt in code)
YouTube's auto-vertaalde tracks worden vermeden door tracks te kiezen waarvan de sleutel op **`-orig`** eindigt (bv. `ja-orig`) — die dragen nooit een `tlang=`-machinevertaling. yt-dlp-config `subtitleslangs: ['.*-orig', 'en']` (`youtube_utils.py:337`), `-orig`-detectie/prioriteit `:368-392`. Content mag claimen: **"we halen de originele caption-taal op, niet YouTube's automatische vertaling"** — dit is code-waar.

### Export-formaten (exact, alle LIVE) — bron: `packages/shared/src/utils/formatTranscript.ts`
| Formaat | Generator | Regel |
|---------|-----------|-------|
| TXT (plain / paragraph) | `generateTxt(t,false)` / `createParagraphMode` | `:247,:51` |
| TXT (timestamps) | `generateTxt(t,true)` | `:247` |
| Markdown (`.md`, incl. YAML-frontmatter + timestamps-variant) | `generateMarkdown` | `:407` (frontmatter `:474`) |
| SRT | `generateSrt` (re-segmenteert via `:92`) | `:167` |
| VTT | `generateVtt` | `:181` |
| CSV (`# metadata`-header + BOM) | `generateCsv` | `:202` |
| JSON (segmenten + metadata, **gratis**) | inline `JSON.stringify` | `TranscriptViewer.tsx:511-523` |
| **RAG-JSON** (chunked, deep-links, overlap, **betaald**) | `buildRagJson` / `buildRagChunks` | `:516,:283` |

**Geen** ZIP/bulk multi-file format-export voor users (de "bulk" in de app = playlist-batch + een admin-credits-CSV, niet user-facing).

---

## 4. Modelnamen — huidige waarheid + centralisatie-voorbereiding

### Live modellen (ground truth uit code) — bijgewerkt 2026-07-22 (ADR-070)
- **Transcriptie (`speech_models` naar AssemblyAI):** chain **`["universal-3-5-pro", "universal-3-pro", "universal-2"]`** — `backend/assemblyai_client.py:19`. EU-endpoint `https://api.eu.assemblyai.com` (`:9`). Het feitelijk gedraaide model wordt teruggelezen via `speech_model_used` en opgeslagen in `transcription_jobs.assemblyai_model` (`:32`). Geen `nano`/`best`/`slam-1`.
- **`speech_models` is een TAAL-ROUTER, geen error-fallback.** AssemblyAI kiest het beste gevraagde model dat de gedetecteerde taal native dekt. Empirisch geverifieerd 2026-07-22 tegen de EU-endpoint met de Railway-key: **Engels → `universal-3-5-pro`, Arabisch → `universal-3-5-pro`** (Universal-3.5 Pro dekt Arabisch native — anders dan Universal-3 Pro, dat native maar 6 talen doet — EN/ES/PT/FR/DE/IT — en Arabisch naar Universal-2 stuurde). Talen die 3.5/3 Pro niet native dekken gaan naar Universal-2 (99 talen).
- **AssemblyAI model-ids gebruiken streepjes:** `universal-3-5-pro` (NIET `universal-3.5-pro` — dat geeft een API-fout). Ids: `universal-2`, `universal-3-pro`, `universal-3-5-pro`.
- **Per-model COR-tarief (ADR-070):** Universal-2 = **$0,15/uur**; Universal-3 Pro & Universal-3.5 Pro = **$0,21/uur**. GEEN EU-premie op speech-to-text (EU-prijs = US-prijs — anders dan de LLM Gateway, die 10% in-region-premie heeft). Tarieven in `cost_config` (USD opgeslagen, `usd_eur_rate` bij query); COR wordt **per run** berekend op basis van het vastgelegde effectieve model (`transcription_jobs.assemblyai_model`), nooit scope-gemiddeld. Legacy runs zonder model (pre-capture, NULL) → gedocumenteerde fallback $0,21/uur. Rate-helper: `public.assemblyai_stt_eur_per_min(model)`; gebruikt in `_geld_scope`. Zie [ADR-070](../decisions/070-per-model-stt-cor.md).
- **AI-summary:** primair **`gemini-2.5-flash`**, fallback **`claude-haiku-4-5-20251001`**, via de **AssemblyAI EU LLM Gateway** `https://llm-gateway.eu.assemblyai.com/v1/chat/completions` — `backend/main.py:1088-1090`. **DeepSeek (`deepseek-chat`) is de OUDE provider** (ADR-068) en wordt **niet meer aangeroepen**; alleen nog in comments/docs.
- **Backend-anker (code):** `backend/master_cache.py:34` `CURRENT_PRODUCTION_AI_MODEL = "assemblyai_universal_3"` — dichtstbijzijnde bestaande "centrale" constante, maar **content is er niet aan gekoppeld**.

### ⚠️ Stale in content — te centraliseren/corrigeren
1. **AI-summary-model: ALLE user-facing content zegt nog "DeepSeek V3"** — dat is fout; live is Gemini Flash via de EU-gateway. Plekken:
   - `docs/content/ARTIKEL-alternative-notegpt.md:85,92`; `docs/content/ARTIKEL-how-it-works.md:82`; `docs/DEVELOPMENT.md:35,208,293`; `docs/content/ARCHITECTURE.md:175,181,282,366,385`.
   - (`apps/marketing/src/app/privacy/page.tsx:121` noemt alleen "AssemblyAI", geen modelnaam — die is correct/veilig.)
2. **Transcriptie-model — inconsistente versienaam.** Meeste content zegt "AssemblyAI Universal-3 Pro" (correct), maar sommige plekken zeggen plain **"Universal-3"** of nog **"Universal-2"**:
   - Plain "Universal-3": `apps/marketing/src/app/docs/how-indxr-works/accuracy/page.tsx:11,19,36`; `.../accuracy/ai-transcription/page.tsx:11,19,36`; `.../languages/page.tsx:11,19,36`; `apps/marketing/src/app/transcribe/page.tsx:38`; alle drie `llms.txt:8` (`apps/marketing/public/`, `apps/app/public/`, `public/`).
   - "Universal-2": `apps/marketing/src/app/articles/youtube-transcript-non-english/page.tsx:34,106,184`; `docs/content/ARCHITECTURE.md:140,142`.
3. **Correcte "Universal-3 Pro"-plekken** (rendered `.tsx`, ter referentie voor consistentie): `articles/audio-to-text/page.tsx:10,24,36,42,51,102,113`; `articles/youtube-transcript-json/page.tsx:28,42,170`; `articles/youtube-transcript-markdown/page.tsx:16`; `articles/youtube-transcript-obsidian/page.tsx:27`; `articles/youtube-age-restricted-transcript/page.tsx:24,123,154`; `articles/youtube-members-only-transcript/page.tsx:95`; `articles/youtube-srt-download/page.tsx:162`; `articles/youtube-transcript-without-extension/page.tsx:107`; `articles/chunk-youtube-transcripts-for-rag/page.tsx:69`; `articles/youtube-transcript-not-available/page.tsx:31,49`; `articles/youtube-transcript-non-english/page.tsx:38,113,185`. (Plus de `docs/content/ARTIKEL-*.md`-spiegels — zie de losse inventaris in de commit-samenvatting.)

### Aanbeveling voor de herschrijf (centralisatie)
Content moet verwijzen naar **"ons hoogste-kwaliteit model"** met de versienaam op **één** centrale plek (bv. een content-constante die de huidige naam levert — nu **Universal-3.5 Pro**, sinds ADR-070 — analoog aan hoe `pricing.ts` alle prijzen levert). Dan:
- één wijziging bij een model-upgrade i.p.v. ~30 losse edits;
- geen "Universal-2"/"Universal-3"/"Universal-3 Pro"-drift meer;
- de AI-summary-modelnaam idem centraal (nu overal fout op "DeepSeek").

---

## 5. Live vs. NIET-live (expliciet gemarkeerd)

**BUILT / LIVE:**
- Alle 4 pricing-tiers + welcome-credits (25) + playlist-eerste-3-gratis.
- Alle 7 export-formaten + anoniem-TXT-only-gating.
- Caption-extractie (native-anchored), AI-transcriptie (chain `universal-3-5-pro`→`universal-3-pro`→`universal-2`, taal-router), AI-summary (`gemini-2.5-flash` via EU-gateway), playlist-batch, Tiptap-editor, library, collections (desktop-CRUD).
- Reserve-/hold-creditmodel (default aan).
- **Storage-indicator = 500 MB** — maar **alléén weergave** (zie hieronder).

**PLANNED / NIET in code (niet als feature noemen):**
- **Betaalde storage-uitbreiding (+100 MB / 100 cr, cap 500 MB): NIET gebouwd.** Geen enkele code-match. De enige "+100"-referentie is welkomst-credit-marketingcopy (`pricing.ts:43`). → alleen als "planned".
- **Handhaving van de 500 MB-cap: NIET gebouwd.** De cap is een **afgeleide weergave** uit `character_count` (`app-sidebar.tsx:165-169`, `MAX_MB = 500` op `:168`), geen echte byte-meter en **geen server-side quota-block** — extractie/opslaan wordt nergens geblokkeerd bij overschrijding. Content mag de 500 MB dus **niet** als harde limiet claimen; het is een indicator.
- **Mobiele collections-UI: NIET gebouwd** (zie §5-UX hieronder).
- **User-facing ZIP/bulk format-export: NIET gebouwd.**

### UX-observaties relevant voor de redesign (code-bevestigd)
- **Credits-teller staat driedubbel**, alle uit dezelfde bron `useAuth().credits`: topbar (`apps/app/src/components/AppTopbar.tsx:64-71`), sidebar-footer "Credits coin" (`app-sidebar.tsx:664-679`), en Home (`apps/app/src/components/dashboard/HomeCreditsBalance.tsx:13`).
- **Storage-indicator: alleen in de sidebar** (`app-sidebar.tsx:616-625`) — niet in de topbar, en op mobiel onbereikbaar (sidebar is `hidden md:flex`, `apps/app/src/app/dashboard/layout.tsx:40-43`).
- **Collections: CRUD zit volledig in de desktop-sidebar** (`app-sidebar.tsx:198-292`). De Library-pagina leest alleen `?collection=` uit de URL en toont een filter-chip (`library/page.tsx:36,79,237-248`) — **geen eigen collection-kiezer/aanmaker**. De mobiele bottom-nav heeft 4 tabs (Home/Transcribe/Library/Messages, `MobileTabBar.tsx:17-22`) — **geen Collections**. Op mobiel is een collectie alleen bereikbaar als de URL al `?collection=` draagt.

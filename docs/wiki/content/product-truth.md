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

### Refundbeleid — bron: `/terms` §7 (gezaghebbend, ADR-069)
**Eén canonieke regel, zodat het niet opnieuw uiteenloopt:** 14-daags herroepingsrecht — een aankoop is volledig terugbetaalbaar binnen 14 dagen **zolang er géén credit van die aankoop is verbruikt**; zodra je één credit gebruikt (een transcript genereert) is die aankoop niet-terugbetaalbaar, maar credits verlopen nooit dus de waarde blijft van jou. Mislukte AI-operaties → credits automatisch terug (operationeel, los van dit venster). **Elke content-plek moet exact dit zeggen** — géén "7 dagen / ≤5 credits" (die tegenstrijdige /pricing-FAQ is op 2026-08-03 rechtgetrokken); `/terms` §7 blijft de gezaghebbende tekst.

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

**Exporteermenu — exacte inhoud + groepering** (geverifieerd 2026-08-02 tegen `packages/shared/src/components/TranscriptCard.tsx:354-427`, voor de format-batch). Vier groepen via `DropdownMenuLabel`, **9 items over 7 formaten**:
- **Text:** `TXT — plain text`, `TXT — with timestamps`, `Markdown`, `Markdown — with timestamps`
- **Subtitles:** `SRT`, `VTT`
- **Data:** `CSV`, `JSON`
- **Developer:** `RAG JSON` (uitgelogd: label wordt `Sign in to export`)

Dus "seven formats, nine downloads" klopt (TXT×2, Markdown×2, + SRT/VTT/CSV/JSON/RAG). Alles gratis behalve RAG JSON (1 cr/10 min); opnieuw downloaden van een reeds geëxporteerd transcript is altijd gratis.

**Bulk ZIP-export bestaat WÉL** (gecorrigeerd 2026-07-23 — deze regel zei eerder "geen"; dat klopte niet tegen de code). In de **library** kun je meerdere transcripten selecteren en als **ZIP met één bestand per transcript** downloaden:
- Vrije formaten (TXT/TXT-ts/MD/MD-ts/CSV/SRT/VTT/JSON) → `handleBatchDownload` (`apps/app/src/components/library/TranscriptList.tsx:469-499`, `BatchFormat`-type `:469`).
- **RAG-JSON-bulk-ZIP** (betaald, per transcript afgerekend via `bulkDeductRagExportCreditsAction`) → `handleBulkRagExecute` (`TranscriptList.tsx:403-467`).

Wat er **niet** is: een server-side **merged-single-file** export (één samengevoegd CSV/JSON over alle video's). Elk transcript blijft een apart bestand ín de ZIP. De ZIP komt uit de **library-multiselect**, niet uit een "playlist results page".

---

## 4. Modelnamen — huidige waarheid + centralisatie-voorbereiding

### Live modellen (ground truth uit code) — bijgewerkt 2026-07-22 (ADR-070)
- **Transcriptie (`speech_models` naar AssemblyAI):** chain **`["universal-3-5-pro", "universal-2"]`** met `language_detection=True` — `backend/assemblyai_client.py:24-28` (ADR-071; `universal-3-pro` verwijderd — onbereikbaar want zijn 6 native talen ⊂ de 18 van 3.5 Pro). EU-endpoint `https://api.eu.assemblyai.com` (`:9`). Het feitelijk gedraaide model wordt teruggelezen via `speech_model_used` en opgeslagen in `transcription_jobs.assemblyai_model`. Geen `nano`/`best`/`slam-1`.
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

### Centralisatie — GEDAAN (2026-07-22)
De modelnamen leven nu op **één** centrale plek, analoog aan `pricing.ts`:

**`packages/shared/src/lib/models.ts`** (import: `@indxr/shared/lib/models`) —
- `TRANSCRIPTION_MODEL` (`displayName: "Universal-3.5 Pro"`, `vendor: "AssemblyAI"`, `chain`) + helpers `transcriptionModelName()` → `"AssemblyAI Universal-3.5 Pro"` en `transcriptionRouterPhrase()` (eerlijke taal-router-frasering).
- `SUMMARY_MODEL` (`displayName: "Gemini 2.5 Flash"`, `gateway: "AssemblyAI EU LLM Gateway"`) + `summaryModelName()` / `summaryGenericPhrase()` ("our AI summarization, processed in the EU").

**Alle `.tsx`-content** (marketing-pagina's, articles, docs) put uit deze constante — geen hardcoded modelstrings meer. **De `docs/content/ARTIKEL-*.md`-mirrors zijn afgebouwd (2026-08-03).** Een `.md` waarvan een gerenderde `.tsx`-pagina bestaat was een niet-gerenderde tweede waarheid (drift-bron) → verwijderd (git bewaart de historie). De 6 wees-drafts zonder route (`ARTIKEL-alternative-*`, `ARTIKEL-youtube-transcript-generator`) zijn óók weg (ADR-037 + campagnebesluit, zie priorities.md). **Wat nog staat, bewust:** `ARCHITECTURE.md` (echte docs, geen page-mirror) + **6 mirrors waarvan de gerenderde pagina de inhoud NIET volledig dekt** (`ARTIKEL-{blog-chunk-youtube-transcripts-for-rag, youtube-transcript-csv, youtube-transcript-for-rag, youtube-transcript-json, youtube-transcript-not-available}.md` + `PRICING-PAGE.md`) — die dragen elk nog een sectie/FAQ die niet op de `.tsx` staat, dus laten staan tot iemand die content port of bewust dropt. **Voor die 6: de sync-met-`models.ts`-regel geldt nog** (ze bevatten modelnamen letterlijk); voor de rest is de regel vervallen. Volledige gap-lijst in [priorities.md » Pre-launch SEO content](../roadmap/priorities.md). *(De `llms.txt`-bestanden zijn verwijderd — ADR-039, 2026-07-23.)*

Bij een model-upgrade: wijzig `models.ts` (en de statische mirrors), niet ~30 losse `.tsx`-plekken. Naamregel: **punt in proza** ("Universal-3.5 Pro"), **streepjes in code/ids** ("universal-3-5-pro"). Eerlijke claim: we kiezen automatisch het beste model voor de taal — geen "één model doet alle 99 talen op topkwaliteit" (alleen EN + AR geverifieerd).

---

## 5. Live vs. NIET-live (expliciet gemarkeerd)

**BUILT / LIVE:**
- Alle 4 pricing-tiers + welcome-credits (25) + playlist-eerste-3-gratis.
- Alle 7 export-formaten + anoniem-TXT-only-gating.
- Caption-extractie (native-anchored), AI-transcriptie (chain `universal-3-5-pro`→`universal-2`, taal-router, ADR-071), AI-summary (`gemini-2.5-flash` via EU-gateway), playlist-batch, Tiptap-editor, library, collections (desktop-CRUD).
- Reserve-/hold-creditmodel (default aan).
- **Storage-indicator = 500 MB** — maar **alléén weergave** (zie hieronder).

**PLANNED / NIET in code (niet als feature noemen):**
- ~~**Betaalde storage-uitbreiding / handhaving: NIET gebouwd.**~~ **ACHTERHAALD — WÉL gebouwd (ADR-078, geverifieerd 2026-08-03).** Reële staat: **basis 100 MiB/account** (`user_credits.library_bytes_cap`), uitbreidbaar tot **max 500 MB** door **100 credits = +100 MiB permanent** (`purchase_library_space`). **Handhaving is echt en server-side**: een nieuw transcript wordt geblokkeerd zodra de bibliotheek vol is (`library_storage_is_full` → 413 `storage_full`, géén credits kwijt; grandfather-safe — bestaande transcripten blijven). Documentatie: de bijkoop-kant staat op `/docs/account/credits`; de **cap + handhaving staan nog nergens in de rendered docs** (docs-gat, zie `roadmap/priorities.md`).
- **Uploader-label onvolledig (UI-onwaarheid, gerapporteerd):** het drop-zone-label toont **7 formaten** ("Supported: MP3, MP4, WAV, M4A, OGG, FLAC, WEBM", `AudioTab.tsx:593`) terwijl de echte accept **9** is (mist `.mpeg`/`.mpga` — §6.1) en de uploads-guide correct "nine formats" zegt. Label undercount t.o.v. de code + de guide.
- **Mobiele collections-UI: NIET gebouwd** (zie §5-UX hieronder).
- **User-facing ZIP/bulk format-export: NIET gebouwd.**

### UX-observaties relevant voor de redesign (code-bevestigd)
- **Credits-teller staat driedubbel**, alle uit dezelfde bron `useAuth().credits`: topbar (`apps/app/src/components/AppTopbar.tsx:64-71`), sidebar-footer "Credits coin" (`app-sidebar.tsx:664-679`), en Home (`apps/app/src/components/dashboard/HomeCreditsBalance.tsx:13`).
- **Storage-indicator: alleen in de sidebar** (`app-sidebar.tsx:616-625`) — niet in de topbar, en op mobiel onbereikbaar (sidebar is `hidden md:flex`, `apps/app/src/app/dashboard/layout.tsx:40-43`).
- **Collections: CRUD zit volledig in de desktop-sidebar** (`app-sidebar.tsx:198-292`). De Library-pagina leest alleen `?collection=` uit de URL en toont een filter-chip (`library/page.tsx:36,79,237-248`) — **geen eigen collection-kiezer/aanmaker**. De mobiele bottom-nav heeft 4 tabs (Home/Transcribe/Library/Messages, `MobileTabBar.tsx:17-22`) — **geen Collections**. Op mobiel is een collectie alleen bereikbaar als de URL al `?collection=` draagt.

---

## 6. Inputs & limieten — geverifieerd (2026-07-22)

Harde input-/limietfeiten uit de **code + eigen DB-meting**, als grondslag voor de docs-pagina's *overview* + *limits* (die staan nu op content-claims — het auditobject). Per feit de bron; waar de code niets afdwingt of niets meet, staat dat expliciet.

### 6.1 Audio-upload — accepteert & cap
- **Client `accept`-attribuut:** `.mp3,.wav,.m4a,.ogg,.flac,.mp4,.mpeg,.mpga,.webm` (`packages/shared/src/components/free-tool/AudioTab.tsx:521`). Client-side extensie-check op dezelfde lijst (`AudioTab.tsx:263-270`) — **alleen bestandsnaam-extensie, geen MIME/content-type**. UI-label: "max 500MB" (`AudioTab.tsx:567`).
- **Server-side validatie:** `SUPPORTED_FORMATS = {.mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm,.ogg,.flac,.mov,.flv,.avi,.mkv}` (13 stuks, `backend/audio_utils.py`), afgedwongen in `validate_audio_file` — **op extensie** (`os.path.splitext`). **Content-gat gedicht (ADR-097, 2026-08-12):** het upload-endpoint (`backend/main.py`) draait nu vóór elke reservering `has_usable_audio` (ffprobe audio-stream-check op de inhoud) → een bestand zonder audiotrack (bv. tekstbestand hernoemd naar `.mp3`, of een videofile zonder audio) wordt met **HTTP 422 `no_audio`** geweigerd zónder reservering/refund. Bewust ruim: extensie hoeft **niet** overeen te komen met de gedetecteerde container (mp4/m4a/mov delen een familie, matroska dekt mkv/webm) — alleen "geen audio" leidt tot weigering.
- **Preflight-route** (`apps/app/src/app/api/transcribe/preflight/route.ts:12-14`) doet **alleen** auth + suspended + rate-limit, **geen** type/size-check.
- **Video vs audio (ADR-097):** alle video-containers worden geaccepteerd. **MOV en FLV** staan op AssemblyAI's eigen lijst → **rauw doorgestuurd**. **AVI en MKV** staan er niet op → de backend **extraheert zelf de audio** (mono Opus via ffmpeg, `compress_audio_if_needed(force=True)`) vóór submit, gestuurd door de **gedetecteerde container** (`get_audio_container`, content niet extensie; matroska→mkv/webm-splitsing via extensie-hint). De code behandelt alles verder als "audio" voor AssemblyAI; er is geen audio-only-beperking.
- **Max bestandsgrootte = 500 MB**, op drie plekken: client (`AudioTab.tsx:273-278`), backend-endpoint → **HTTP 413** (`main.py:864-869`), en `MAX_FILE_SIZE_MB=500`/`MAX_FILE_SIZE_BYTES` (`audio_utils.py:19-20`, opnieuw afgedwongen `:328-330`).
- **Vercel 4,5MB-limiet omzeild:** de browser POST het bestand **direct naar Railway** via XHR naar `NEXT_PUBLIC_AUDIO_UPLOAD_URL` (`AudioTab.tsx:349,355,363`) — de Vercel-`/api/transcribe/whisper`-route wordt alleen voor het YouTube-pad gebruikt. Dus de 500 MB is een **eigen check** (client + Railway), niet de Vercel-body-limiet.
- **(niet een cap):** >25 MB → audio wordt naar 12 kbps mono gecomprimeerd vóór AssemblyAI (`transcription_pipeline.py:534`, `audio_utils.py:347/362/377`) — downstream-compressie, geen weigering.

### 6.2 Duur (video/audio) — AI-transcriptie **10 uur** (afgedwongen, ADR-071)
- **AI-transcriptie: max 10 uur** (`MAX_TRANSCRIPTION_SECONDS=36000`, `main.py`). Boven 10u → **422 `duration_exceeds_max`**, **vóór** de credit-reservering (YouTube via metadata-duur; upload via server-side probe). Reden: AssemblyAI's harde plafond is 10u audio (+ 5 GB — gedekt door de 500 MB-upload-cap). Een user raakt hier nooit credits aan kwijt (check zit vóór `reserve_credits`).
- **Caption-extractie: geen duur-cap** (bewust — `youtube_client.py:85` leest duur alleen als metadata).

### 6.3 Playlist — max video's & channel-URL's (afgedwongen, ADR-071)
- **Harde cap = 500 video's/job**, nu **afgedwongen op de extract-route** (`MAX_PLAYLIST_VIDEOS=500`): backend **422 `too_many_videos`** vóór job-rij + reservering (`main.py`), + Next.js Zod `.max(500)` (`apps/app/src/app/api/playlist/extract/route.ts`) als snelle client-gate. (Voorheen bat 500 alleen bij enumeratie — `youtube_client.py:30`, `main.py` yt-dlp `'1-500'` — terwijl indienen onbegrensd was.)
- **Waarschuwing (niet-blokkerend) vanaf 50 geselecteerde video's** (`PlaylistManager`): "duurt ~M min; je kunt de tab sluiten". Drempel op basis van gemeten ~10,6 s/video (JRE-run, §DEEL 0-meting: 462 video's → 81,4 min). Default-selectie blijft 10.
- **Concurrency-cap = 3 gelijktijdige jobs** per user (`MAX_CONCURRENT_JOBS=3`, `main.py`) — aparte cap.
- **Channel-URL's: expliciet gedetecteerd** (ADR-071). `validateYouTubeUrl` (`packages/shared/src/utils/youtube.ts`) kent nu type **`CHANNEL`** (`/@handle`, `/channel/`, `/c/`, `/user/`) → de UI toont een bruikbare melding die naar playlists wijst. Geen credits, geen job (client-side).

### 6.4 Verwerkingsduur — gemeten (eigen DB)
Bron: `transcription_jobs` (`processing_time_seconds`), **216 echte AI-transcriptie-runs**, `status='complete' AND cache_hit=false`, 2026-04-13 → 2026-07-20. (Steekproef is grotendeels intern testverkeer, maar dit zijn echte latency-metingen.)

| Audio-duur | n | Mediaan verwerkingstijd | IQR (p25–p75) | Min–Max | Mediaan-ratio (verwerking ÷ audio) |
|-----------|---|-------------------------|---------------|---------|-----------------------------------|
| <5 min | 16 | **24 s** | 18–28 s | 7–38 s | ~0,10 |
| 5–15 min | 45 | **33 s** | 26–50 s | 11–139 s | ~0,06 |
| 15–30 min | 63 | **65 s** | 44–102 s | 14–399 s | ~0,05 |
| 30–60 min | 68 | **100 s** | 65–178 s | 42–589 s | ~0,05 |
| 60+ min | 24 | **278 s** | 110–475 s | 27–653 s | ~0,04 |

- **Vuistregel:** AI-transcriptie kost ~**4–10% van de audio-lengte** (mediaan) — bv. een uur video ≈ **1,5–3 min** verwerking, met een lange staart (uitschieters tot ~11 min bij lange video's).
- **Cache-hit (dedup, master-cache):** effectief **instant** (0 verwerkingstijd) — bekende video's worden niet opnieuw getranscribeerd.
- **Caption-extractie: NIET gemeten.** `usage_logs` heeft **geen** latency-/processing-kolom (alleen `created_at`, `extraction_type`, `success`, `proxy_bytes`, …). Caption-extractie is synchroon (geen job-rij met start/eind). → **Er is geen code-/DB-bron voor een gemeten caption-mediaan.** (Anekdotisch is captions "instant/enkele seconden" want geen audio-download+model-run, maar dat is **niet gemeten** — niet als cijfer claimen.)

### 6.5 Talen — gedocumenteerde getallen (AssemblyAI), niet zelf-geteld
Er is **geen taallijst/telling in onze code** (`backend/language_utils.py` normaliseert alleen codes via `langcodes`); gebruik daarom **AssemblyAI's gedocumenteerde getallen** als bron. Bron: https://www.assemblyai.com/docs/supported-languages
- **AI-transcriptie:** **Universal-3.5 Pro dekt 18 talen**; **Universal-2 dekt 99 talen** (de router kiest per gedetecteerde taal het beste model, ADR-070/071). Claim dus niet "één model doet 99 talen op topkwaliteit".
- **Accuracy** volgens AssemblyAI's WER-indeling per taal: **≤10%** (uitstekend) / **10–25%** (goed) / **25–50%** (redelijk) / **>50%** (beperkt). Gebruik deze tiers op de accuracy-pagina i.p.v. één percentage over alle talen.
- **Captions:** "**elke taal waarvoor YouTube captions levert**" — het eerdere getal **67 heeft geen grondslag en is geschrapt**.
- Wat wél code-waar is: native-anchored caption-selectie via `-orig`-tracks (§3).

### 6.6 Anoniem vs. ingelogd — afgedwongen door code
- **Export-formaten** (`packages/shared/src/components/TranscriptCard.tsx`): anoniem = **alleen TXT** (plain `:130`, timestamps `:135`) + kopiëren (`:101`). Achter login: Markdown (`:143`), MD+timestamps (`:152`), JSON (`:161`), CSV (`:191`), SRT (`:199`), VTT (`:205`), RAG (`:220`) — via `requireAuth()` (`:122-128`). **Let op: dit is een client-side gate** (bestanden worden in de browser gegenereerd) — geen server-afdwinging van formaat.
- **Playlist:** **login vereist**, hard **401** server-side (`api/playlist/extract/route.ts:31-38`) + friction-card frontend. Anoniem kan geen playlist draaien.
- **Upload:** **login vereist**, frontend-blok (`AudioTab.tsx:219-231,327`) + preflight **401** (`api/transcribe/preflight/route.ts:18-25`).
- **Library/opslag:** opslaan is **login-only** (anonieme resultaten worden niet bewaard; card zegt "Sign up free to save it", `TranscriptCard.tsx:250-254`). De **500 MB-storage-indicator is display-only** (`app-sidebar.tsx:165-169,621-625`) — **geen** blokkering bij overschrijding (§5).
- **Caption-extractie:** auth **optioneel** (`api/extract/route.ts:20-21`) — anoniem mag, mits binnen de rate-limit.
- **Is caption-extractie "onbeperkt" voor ingelogden?** **Nee voor gratis users:** 50/uur (free-tier rate-limit). **Premium** (heeft ooit credits gekocht) **omzeilt de rate-limiter** (`ratelimit.ts:57-67`) maar valt onder de **3-gelijktijdige-jobs**-cap. Dus "onbeperkt" klopt alleen ruwweg voor betalende users, en zelfs dan met een concurrency-plafond.

### 6.7 Rate limits (Upstash sliding window) — echte waarden
Bron: `packages/shared/src/lib/ratelimit.ts:32-37`.

| Tier | Limiet | Venster | Sleutel | Bron |
|------|--------|---------|---------|------|
| anonymous | **10** req | **24 h** | per IP | `ratelimit.ts:33` |
| free (ingelogd, geen aankoop) | **50** req | **1 h** | per userId | `ratelimit.ts:34` |
| login (auth-actie) | 10 req | 15 m | — | `ratelimit.ts:35` |
| signup (auth-actie) | 5 req | 1 h | — | `ratelimit.ts:36` |
| **premium** (ooit gekocht) | **bypass** (`remaining 999999`) | — | — | `ratelimit.ts:57-67` |

- **`checkRateLimit()` kiest op identiteit, niet op actie:** dezelfde free/anon-bucket geldt gedeeld over alle beschermde routes — caption-extract (`api/extract/route.ts:47`, marketing idem), preflight (`:49`), whisper (`:44`), playlist-extract (`:60`). **Geen aparte summarize-/upload-limiter.**
- **login/signup-limiters** worden apart gebruikt in auth-acties (`packages/shared/src/actions/auth-actions.ts:41,114,166,258`).
- **No-op fallback:** zonder `UPSTASH_REDIS_REST_URL` + `_TOKEN` zijn **alle** limiters uitgeschakeld (`noopLimiter` → altijd success, `ratelimit.ts:7-18`). Alleen bindend als beide env-vars gezet zijn.

### 6.8 Data-retentie & privacy van audio — INDXR-servers + AssemblyAI (geverifieerd 2026-08-08; AssemblyAI-account-instellingen gecorrigeerd 2026-08-09)

Onderbouwt de pagina-claim (`apps/marketing/src/app/articles/audio-to-text/page.tsx:37`): *"The audio file is processed and then discarded. Only the resulting transcript text is stored in your library. INDXR.AI does not retain uploaded audio files after transcription is complete."*

**INDXR-servers (ons eigen pad) — klopt sinds de fix van 2026-08-08:**
- Een geüpload bestand wordt één keer naar een temp-bestand geschreven (`backend/main.py`, `tempfile.NamedTemporaryFile(delete=False, prefix="indxr_upload_", suffix=…)`) om de duur te proben vóór reserve, en na verwerking **altijd** verwijderd via het pipeline-`finally` — het temp-pad wordt nu bij pipeline-entry in `temp_files` geregistreerd (`backend/transcription_pipeline.py`, in `do_assemblyai_transcription`), dus verwijdering gebeurt bij success, bij elke error én ongeacht compressie.
- **Startup-sweep** voor weesbestanden na een harde herstart (Railway restart mid-job): `_sweep_orphan_upload_tmps()` in de FastAPI-`lifespan` (`backend/main.py`) verwijdert alle `indxr_upload_*` in de temp-dir bij boot. De prefix houdt de sweep strikt bij ons eigen materiaal.
- Alleen de **transcripttekst** wordt bewaard (tabel `transcripts`); het audiobestand niet.
- ⚠️ **Was eerder onwaar** op het geslaagde upload-pad zonder compressie (bestanden <25 MB): daar belandde het temp-bestand nooit in `temp_files` en bleef het staan. Empirisch bevestigd (echte AssemblyAI-run: bestand overleefde) en daarna gefixt + opnieuw bewezen (bestand weg).

**AssemblyAI (wat de provider zelf met de audio doet) — standaard async productie, ons account:**
- Wij draaien **standaard async** op het **EU-endpoint** (`https://api.eu.assemblyai.com`, `backend/assemblyai_client.py:9`) — EU data-residency.
- **Model-improvement / training: AFGEMELD.** In het AssemblyAI-dashboard onder **Data Controls** staat het model-improvement-programma op **opted out** → AssemblyAI gebruikt onze audio/transcripten **niet** om zijn AI/ML-modellen te trainen. AssemblyAI's default (zonder afmelding) is wél training; opt-out kan alleen op **betaalde** accounts (Data Controls) en is **forward-looking only** — geen retroactieve toepassing op materiaal dat vóór de afmelddatum is verwerkt (daarover doen we geen claim). **Geverifieerd op een dashboard-schermafdruk (Data Controls), 2026-08-09.**
- **Retentie: op het MINIMUM.** De data-retentie staat in Data Controls ingesteld op **1 dag** — de laagste waarde die AssemblyAI aanbiedt (geverifieerd op dezelfde schermafdruk, 2026-08-09). Ter referentie: de algemene productie-SLA zónder eigen instelling is geüploade audio verwijderd binnen 24–48 u en transcript-artefacten vanaf 72 u (instelbare TTL zo laag als 1 u); onze 1-daagse instelling is dus strenger dan de default.
- **Geen BAA ondertekend.** Zero-data-retention biedt AssemblyAI formeel alleen voor **Streaming** (mét training-opt-out) of de **LLM Gateway mét BAA**; ons async-transcriptiepad valt daar technisch niet onder, maar de bovenstaande account-instellingen (training-opt-out + 1-daagse retentie) gelden er wél voor.
- ⚠️ **Correctie 2026-08-09:** de vorige versie van deze paragraaf stelde ten onrechte dat er "geen zero-data-retention-configuratie / geen retentie-flag / default productie-retentie" gold. Dat was onjuist: het account is afgemeld voor training én staat op 1-daagse retentie. Bron = dashboard, niet code (onze call zet geen flag; de instelling is account-niveau in Data Controls).

Bronnen: dashboard-schermafdruk **Data Controls** (2026-08-09, afgemeld + 1-dag) · https://www.assemblyai.com/docs/faq/how-to-opt-out-of-data-sharing-for-our-model-improvement-program · https://support.assemblyai.com/articles/2240096256-does-assemblyai-offer-zero-data-retention (docs geraadpleegd 2026-08-09; retentie-SLA 2026-08-08)

### Opgelost sinds ADR-071 (waren eerder "geen code-antwoord")
1. **Caption-verwerkingsduur** — nu gemeten via `usage_logs.duration_ms` (server-side, cache-hit én miss). Nog geen productie-mediaan (verzamelt vanaf deploy); AI-transcriptie-mediaan staat in §6.4.
2. **Max AI-transcriptie-duur** — nu afgedwongen op **10 uur** (§6.2). Captions bewust ongelimiteerd.
3. **Playlist-max op de extract-route** — nu afgedwongen op **500/job** (§6.3).
4. **Channel-URL's** — nu expliciet gedetecteerd (§6.3).

### Blijft zonder code-antwoord
- **Talen-telling** — komt niet uit onze code; gebruik AssemblyAI's gedocumenteerde 18/99 (§6.5).
- **Per-fase AI-job-timing / gecategoriseerde faalredenen / export-formaat-per-download** — bewust niet gebouwd (ADR-071, proportionaliteit; export-logging zou een extra request per download kosten).

---

## 7. Docs-structuur (how-indxr-works) — ADR-072 (2026-07-22)

De `/docs/how-indxr-works`-sectie is **15 → 11 pagina's**: `credits` weg (301 → `/docs/account-and-data/credits-and-billing`), `accuracy/auto-captions` + `accuracy/ai-transcription` + `languages` samengevoegd in **`accuracy` ("Accuracy and languages")**, `api` op in `limits`, nieuwe **`summaries`**. De 11: overview · accuracy · export-formats (+txt/markdown/csv/srt/vtt/json) · summaries · limits.

- **Overview** (`/docs/how-indxr-works/overview`) is nu volledig geschreven; volatiele getallen (welcome-credits, 1cr/min, 3cr summary, 1cr/10min RAG, gratis-3) renderen uit `pricing.ts` (`CREDIT_COSTS`/`FREE_TIER`) via de nieuwe `AnchorHeading`-component (anchor op élke H2/H3).
- **DocsShell-header** gerepareerd: de fixed marketing-header (`h-16`) kreeg geen offset → overlap met sidebar-titel + breadcrumb; fix = `pt-16` + sidebar `top-16`, en de **dubbele breadcrumb** (shell rende er zelf één náást de per-pagina `DocsBreadcrumb`) is opgeheven (shell-breadcrumb weg, per-pagina blijft — draagt JSON-LD). `/articles`-nav toegevoegd.
- Elke verwijderde route heeft een **301** in `next.config.ts`.

---

## 8. Fixture-video voor docs-screenshots + Remotion (vastgelegd 2026-08-02)

Eén vaste voorbeeldvideo voor álle documentatie-screenshots en Remotion-opnames, zodat de docs/Remotion-batch niet opnieuw hoeft te zoeken. **Live geverifieerd via yt-dlp door de Decodo-proxy (2026-08-02).**

**Video:** `kBdfcR-8hEY` — https://www.youtube.com/watch?v=kBdfcR-8hEY
- **Titel (verbatim):** *Justice: What's The Right Thing To Do? Episode 01 "THE MORAL SIDE OF MURDER"* — kanaal **Harvard University**.
- **Captions:** JA — **1 door-mensen-gemaakte** manuele track (`en`) **plus** auto-captions (`en-orig` native ASR + 313 vertaal-tracks). Extraheerbaar (cascade stap 1 `youtube-transcript-api` slaagt).
- **Duur:** **3296 s** → AI-transcriptiekosten = `ceil(3296/60)` = **55 credits** (pricing.ts, 1 cr/min).
- **Licentieveld (verbatim, geen oordeel):** yt-dlp `license` = **`None`** (geen expliciete Creative-Commons-markering; standaard YouTube-licentie niet uit te sluiten — letterlijk `None` gerapporteerd).

**Playlist:** `PL30C13C91CFFEFEA6` — https://www.youtube.com/playlist?list=PL30C13C91CFFEFEA6
- **Titel:** *Justice with Michael Sandel*.
- **Aantal video's:** **19**. **Totale duur:** **46 243 s (~12 u 50 m)**. (0 entries met ontbrekende duur.)

Gebruik deze getallen voor de playlist-reviewscreenshot. Video's zonder captions of niet-extraheerbaar: niet zelf vervangen — terugrapporteren. (Hier N.v.t.: de video heeft captions en is extraheerbaar.)

**Echte homepage-codevoorbeelden (herkomst, reproduceerbaar — 2026-08-03).** De Markdown/SRT/RAG-JSON-fragmenten op de homepage (`apps/marketing/src/lib/homeExportSamples.ts`) zijn GEEN handwerk: ze komen verbatim uit de echte generators in `packages/shared/src/utils/formatTranscript.ts`, gedraaid op de opgeslagen transcript-jsonb van deze fixture (1142 caption-segmenten). Reproductie: (1) een node-script logt in als `account1` (`@supabase/supabase-js`, url+anon uit `apps/app/.env.local`, password uit `tests/test_accounts.json`), haalt `transcripts.transcript` voor `video_id=kBdfcR-8hEY` en schrijft die naar een file; (2) een tweede script (gedraaid vanuit `packages/shared` zodat `sbd` resolt, met `node --experimental-strip-types` op Node 24) roept `generateMarkdown(t, title, true, {videoId, channel:"Harvard University", language:"en", durationSeconds:3282, extractionMethod:"youtube_captions", includeYamlFrontmatter:true})`, `generateSrt(t, {extractionMethod:"youtube_captions"})` en `buildRagJson(t, {…})` aan. De RAG-output heeft **`deep_link`/`chunk_id`/`token_count_estimate`/`total_chunks:60`** — er is **geen `source_url`-veld** (dat was het gefabriceerde schema dat we overal opruimden). Fragmenten enkel ingekort met `…`, nooit velden/waarden verzonnen.

**Echte AI-samenvatting op deze fixture (gemeten, 2026-08-24).** Eén door het live product gegenereerde AI-samenvatting (ADR-090) van de Justice-fixture is vastgelegd als bron voor het samenvatten-artikel — inclusief de cijfers die `backend/e2e_summary_measure.py` wél berekent maar nooit wegschreef: duur 54:42, transcript 6987 woorden, **2 hoofdstukken**, 1794 samenvattingswoorden (ratio 0,257 ≈ 1:3,9), doorlooptijd ~35 s, **5 credits** (`calculate_summary_cost(3282)`), `gemini-2.5-flash` twee-staps, schema v2. Volledige cijfers + het verbatim voorbeeldfragment (overview + hoofdstuk 1) staan in [content/summary-example-justice.md](summary-example-justice.md); de `summary-overview`/`summary-chapter`-captures lezen deze samenvatting (mag niet worden opgeruimd — zie [screenshot-machine.md](screenshot-machine.md)).

**Capture-account seeding (prod-DB, bewust).** `account1` (`f136104d-…`) draagt in de **live** DB 5 handmatig geseede publieke transcripten (Feynman/MIT/Stanford/CS50/consciousness-podcast) naast de fixture, zodat de `library-list`-screenshot als archief leest. Opzet, mag blijven — zie [screenshot-machine.md](screenshot-machine.md#library-account-geseed).

**Marketing-clip + exportdemo's (herkomst — 2026-08-07).** De homepage-conversieronde vervangt stills door beweging. De kernflow-opname (`tests/playwright/capture/recordings/core-flow.webm`) is een **gestubde, deterministische** Playwright-opname (nul credits); de gemonteerde clip staat in `apps/video/` (Remotion, buiten de build-graph — [ADR-089](../decisions/089-remotion-workspace-outside-build-graph.md)). De drie exportblok-demo's (`apps/video/export-demos/`) draaien op de **echte** fixture-export (SRT/VTT/MD + 60-chunk RAG JSON), opnieuw gegenereerd uit de opgeslagen transcript via dezelfde generators — **niets nagemaakt**. **Regel (marketing, [ADR-088](../decisions/088-youtube-ui-in-marketing.md)):** YouTube's interface (pagina/speler/logo) komt **niet** in beeld in marketingmateriaal — dat vereist voorafgaande goedkeuring; opnames beginnen bij ons eigen invoerveld. Nominatieve tekst ("transcribe YouTube videos") blijft toegestaan.

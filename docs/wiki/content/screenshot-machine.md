# Docs-screenshot capture machine (Playwright)

**Aangemaakt:** 2026-08-02 · **Beeldstandaard herzien:** 2026-08-03 · **Video-opname toegevoegd:** 2026-08-07
**Beeld (stills):** spec `tests/playwright/capture/quickstart-capture.spec.ts` · config `playwright.capture.config.ts` · assets `apps/marketing/public/docs/screenshots/*.png`
**Video (bewegend):** spec `tests/playwright/capture/core-flow-video.spec.ts` · config `playwright.video.config.ts` · helpers `tests/playwright/capture/video-helpers.ts` · output `tests/playwright/capture/recordings/*.webm`

Eén Playwright-spec die géén gedrag test maar de docs-beelden vastlegt. Hij is **tegelijk een routecheck**: hij stuurt de echte UI aan op ARIA-rollen + exacte zichtbare tekst, dus een hernoemde knop of verplaatste control laat de bijbehorende capture **omvallen**. Dat is de bedoeling — de capture die faalt is het regressiesignaal. Sinds 2026-08-07 heeft de machine een **tweede tak**: bewegende opnames (`recordVideo`) voor marketing, met een eigen standaard hieronder.

## Video-opnamestandaard (2026-08-07) — geldt voor ELKE bewegende opname

De reden: de homepage zag eruit als documentatie (drie codeblokken + één losse still). Een product laat je het zien in beweging. De beeldstandaard (frameShot, hieronder) legt een statische kloon vast; een opname legt de **echte, levende** pagina vast terwijl een handeling zich voltrekt. Wat een opname leesbaar maakt en een still niet nodig had, staat in `video-helpers.ts` en is verplicht:

- **Zichtbare cursor.** Playwright tekent er geen; `installCursor()` injecteert een pijl (+ klik-pulsering) op `<html>` die de echte muispositie volgt. Leeft buiten de React-tree, dus SPA-navigaties wissen 'm niet.
- **Menselijk tempo.** De muis reist in stappen (`page.mouse.move(..., { steps })`) i.p.v. te springen; typen gaat met per-toets-vertraging (`pressSequentially({ delay })`). Eén tempo-tabel `TEMPO` bepaalt de feel van élke opname.
- **Bewuste pauzes** (`beat()`) op de momenten die ertoe doen — leeg veld, kostenkaart, resultaat — zodat de kijker kan volgen.
- **Deterministisch, altijd.** Geen `Math.random`/echte-tijd-jitter (twee runs moeten identiek zijn): elke vertraging is een vaste constante. De **backend is gestubd** (`page.route`) zodat de opname geen credits verbrandt en dezelfde fasen speelt; de job-fasen (downloading→transcribing→saving→complete) worden gedreven op **wall-clock sinds de eerste poll** (robuust tegen meerdere pollers + de polling-backoff), niet op call-count.
- **Vast venster + thema + sessie**, net als de beeldstandaard: viewport 1280×720, `colorScheme:'light'`, consent gezet, gedeelde `account1`-sessie uit `capture-state.json` (dezelfde `global-setup.ts`), fixture-video `kBdfcR-8hEY`. De opname toont **echte fixture-titel + duur** (54:56 → 55 credits) en **echte** fixture-captions als transcript (verbatim uit `homeExportSamples.ts`).
- **Eén WebB per run**, weggeschreven via een **eigen context** (`browser.newContext({ recordVideo })`) zodat de spec `context.close()` + `video.saveAs(<stabiel pad>)` controleert; Playwright's tijdelijke random-naam-bestand wordt daarna verwijderd. Output: `recordings/core-flow.webm` (overschreven per run).
- **Juridisch (FASE 0 / [ADR-088](../decisions/088-youtube-ui-in-marketing.md)):** de youtube.com-pagina komt **niet** in beeld. De opname begint in ons eigen invoerveld waar de link geplakt wordt; alleen ons product is te zien.

**Draaien (één commando, tegen de live app — stubs onderscheppen vóór het netwerk):**
```bash
BASE_URL=https://app.indxr.ai NODE_PATH=node_modules/.pnpm/node_modules \
  node node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/cli.js \
  test --config=playwright.video.config.ts
```
De twee configs delen `global-setup.ts` maar hebben een gescheiden `testMatch`, dus de beeldmachine en de videomachine raken elkaar niet, en de 9 functionele specs (andere testDir) evenmin.

### Van opname naar clip — `apps/video/` (Remotion)

De ruwe WebM is grondstof; de montage gebeurt in de **standalone Remotion-workspace** `apps/video/`, bewust **buiten** de Turborepo-build-graph ([ADR-089](../decisions/089-remotion-workspace-outside-build-graph.md)) — eigen `node_modules`, eigen install, raakt de app-builds/deploys nooit.

```bash
cd apps/video
npm install            # eenmalig, standalone (niet via pnpm root)
npm run render         # → out/home-clip.mp4  (compositie HomeClip: crop + tempo + tekst-overlays)
npm run still          # → out/home-clip-poster.png  (stilstaand frame voor no-autoplay)
npm run studio         # interactieve Remotion-preview
```

De `copy-source` pre-hook kopieert de canonieke opname uit `recordings/` naar `public/` (gitignored — niet dubbel gecommit). Tokens/fonts komen uit onze eigen `tokens.ts` (OKLCH, licht) + IBM Plex — geen externe template.

### Exportblok-demo's — `apps/video/export-demos/`

De drie homepage-exportblokken (Markdown/SRT/RAG) als **beeld van het bestand in gebruik**, op de **echte** fixture-export (`fixture/justice.{srt,vtt,md,rag.json}`, 60-chunk RAG): `srt-demo.html` (ondertitels over een neutrale speler — géén YouTube-frame, [ADR-088](../decisions/088-youtube-ui-in-marketing.md)) en `rag-demo.html` (query → chunk mét tijdstempel), elk geschoten via `capture-{srt,rag}.mjs` (light+dark). Markdown → Obsidian heeft **geen** webversie; de exacte één-screenshot-instructie staat in `export-demos/README.md`.

## Opnamestandaard (2026-08-03) — geldt voor ELKE opname

De reden voor deze standaard: eerder waren de docs-beelden een systeemfout (dubbele randen, geen dark mode, wild uiteenlopende formaten, een horizontaal scrollend diagram). De helper `frameShot()` dwingt nu één norm af, zodat een latere batch niet opnieuw scheve beelden maakt:

- **Eén vaste framebreedte** voor álle captures: `FRAME_W = 1000` px. Een smaller onderwerp wordt **gecentreerd**; het frame is altijd even breed. Zo verschillen figuren op één pagina nooit wild in breedte.
- **Ademruimte** rondom het onderwerp: `PAD = 28` px — nooit strak op de kaartrand.
- **Achtergrond = de échte pagina-achtergrond van het actieve thema** (`var(--bg)`), nooit transparant.
- **Eén frame-border** (`1px var(--border)` + radius) op de PNG. **DocsFigure tekent GEEN eigen border** — anders krijg je de dubbele omtreklijn terug. De PNG brengt z'n eigen frame mee.
- **Hoogte volgt de inhoud, met een maximum.** Is een onderwerp onevenredig hoog, schiet het compacter (smallere selectie / minder rijen) i.p.v. clampen — beelden in één pagina mogen niet belachelijk van elkaar verschillen.
- **Elke opname twee keer, licht én donker**, in **één run**: `frameShot()` schiet licht, flipt `data-theme` op `<html>` (pure CSS-restyle, geen reload) en schiet donker → `<naam>-light.png` + `<naam>-dark.png`.

**Techniek:** `frameShot()` zet een **kloon** van het onderwerp in een fixed-width, gepadde, één-keer-omrande wrapper op `var(--bg)`; de kloon is statisch, dus het thema flippen herstyle­t zowel de frame-vars als de token/Tailwind-classes van de kloon zonder reflow-risico voor de echte React-tree.

**DocsFigure** (`apps/marketing/src/components/docs/DocsFigure.tsx`) leidt `-light`/`-dark` af uit de bestaande `src` (`foo.png` → `foo-light.png` + `foo-dark.png`) en wisselt puur via CSS op `[data-theme]` (twee `<img>`, `dark:hidden` / `hidden dark:block`) — geen JS, geen flits bij het laden. Bestaande `src`-aanroepen blijven werken.

## Draaien

Aparte config + testDir, dus **de 9 functionele specs worden niet geraakt** (`playwright test` met de default-config = `testDir: tests/playwright/specs`; deze machine = `testDir: tests/playwright/capture`).

In deze pnpm-monorepo staat `@playwright/test` niet in de root-`node_modules` (gehoist naar `node_modules/.pnpm/node_modules`). Draai met `NODE_PATH` gezet:

```bash
# Één commando → ALLE gerenderde assets in BEIDE thema's (tegen de LIVE app, zie "Waarom live"):
BASE_URL=https://app.indxr.ai NODE_PATH=node_modules/.pnpm/node_modules \
  node node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/cli.js \
  test --config=playwright.capture.config.ts

# Optioneel: de VOLLEDIGE ErrorCard-galerij (alle codes, ook dual-theme) i.p.v. alleen de 4 gerenderde:
CAPTURE_GALLERY=1 BASE_URL=https://app.indxr.ai NODE_PATH=... node ... test --config=...
```

Runtime: de default-set (20 assets) draait in **~1 min** tegen `app.indxr.ai`.

**Sessie (storageState):** één gedeelde login. `global-setup.ts` mint de Supabase-sessie van `account1` (uit `tests/test_accounts.json`) één keer + zet consent + thema=light, en schrijft dat naar `capture-state.json` (**gitignored** — bevat een sessietoken). Elke test hergebruikt die state; geen login per test (dat haalde de timeout). Viewport 1280×800 @2x. Fixture: video `kBdfcR-8hEY`, playlist `PL30C13C91CFFEFEA6` (zie [product-truth §8](product-truth.md)).

**Library-account geseed — BEWUST, in de PRODUCTIE-DB (2026-08-03):** `library-list` toont een archief, dus het capture-account **`account1`** (`user_id f136104d-2e0a-43ec-aeea-f9e1ed122eb2`, "auto-captions tester" uit `tests/test_accounts.json`) heeft in de **live Supabase-DB** meerdere **schone, publieke** transcripten staan: naast de Justice-fixture 5 handmatig geseede rijen (Feynman/Royal Institution, MIT 6.006, Stanford "Opportunities in AI", CS50, "The Nature of Consciousness"-podcast — colleges/talks, géén testrommel, géén persoonsgegevens) + (2026-08-09) één **geseede diarisatie-rij** "Designing for Deep Work: An Interview" (2 sprekers, `speaker_names` {A:"Sarah Chen",B:"Dr. Miguel Ferro"}, schone fictieve interviewtekst) puur zodat de `transcript-speakers`-capture sprekerlabels kan tonen. **Dit is opzet en mag blijven staan** — `account1` is en blijft het testaccount; deze rijen zijn er puur zodat de library-lijst als archief leest. Niet "opruimen" als vreemde data. Loopt de lijst leeg of vervuild, seed opnieuw via de DB (INSERT-statement staat in de LOG-entry 2026-08-03) — titels moeten er echt uitzien.

**Video-to-text seed — BEWUST, ECHTE transcriptie in de PRODUCTIE-DB (2026-08-13):** de vier `/articles/video-to-text`-captures draaien op een **echte** AI-transcriptie van de test-MP4 `docs/wiki/testing/What Brought Dave Chappelle Back - PowerfulJRE (360p).mp4` (319 s, 7,39 MB, h264+aac), door het live product geüpload als `account1` (job `c9137c1b-c1c5-4b2f-be01-538bd2e03a67`, transcript `31a38dee-6524-4a36-a2e6-78d2d5098c68`, 6 credits, model `universal-3-5-pro`, **2 sprekers A/B**, `speaker_names {}` → toont "Speaker A/B"). De titel = de bestandsnaam (upload-pad zet géén titel → `audio_title=filename`, `main.py`). **Deze library-rij mag NIET worden opgeruimd** — net als de geseede "Designing for Deep Work"-interviewrij hierboven voedt hij de `video-transcript-speakers`- en `video-subtitles-srt`-captures. Loopt hij weg, draai de seed opnieuw (upload dezelfde MP4 via de Upload-tab en transcribeer; ~6 credits). Dit is tevens de **eerste rij van de meetlaag** (ADR-096) voor een geüpload videobestand — `compress_ms` is NULL want een MP4 <25 MB gaat rauw naar AssemblyAI (geen lokale extractie); `transcribe_ms≈18,7 s`, RTF `0,0596`, `transcript_confidence 0,965`, `language_confidence 0,999`, `cost_eur ≈ €0,0188`.

**AI-summary seed — BEWUST, ECHTE samenvatting in de PRODUCTIE-DB (2026-08-24):** de twee `summary-*`-captures lezen een **echte**, door het live product gegenereerde AI-samenvatting (ADR-090) op de **Justice-fixture** (transcript `0798fa30-8056-4343-9e02-c50d93c00e4a`, `kBdfcR-8hEY`). Regenereren via `POST /api/ai/summarize` als `account1` (job `153894f1-2ac0-44f3-bcbb-5b56814a13b8`, 5 credits, `gemini-2.5-flash` twee-staps, schema v2, **2 hoofdstukken**, 1794 samenvattingswoorden, doorlooptijd ~35 s). De Justice-rij heeft een videoId → de sectie-tijdstempels zijn de **klikbare amber Play-knop** (met videoId) i.p.v. de statische klok. **Deze samenvatting mag NIET worden opgeruimd** — laat het transcript én zijn `ai_summary` staan (zoals het "Designing for Deep Work"-interview). Verdwijnt hij, klik "Regenerate summary" op die rij (~5 credits); model-uitvoer is niet-deterministisch, dus hoofdstukindeling/tekst kunnen licht verschillen. Volledige cijfers + het verbatim voorbeeldfragment (overview + hoofdstuk 1): [content/summary-example-justice.md](summary-example-justice.md).

**Dedup-valkuil:** gestubde captures gebruiken een **dummy video-id** (`STUBCARD001`) i.p.v. de fixture, anders onderschept de "you already have this transcript"-dedup-prompt de Extract-klik. De stub negeert tóch welke video het is.

**Waarom live:** de lokale app-server kan de extractie-backend niet bereiken (`/api/extract` → 503, lokale env-gap), dus live-captures draaien tegen `app.indxr.ai`; de gestubde captures (`page.route`) draaien overal.

**`sharp` niet geïnstalleerd → PNG-only** (geen `.webp`).

## Assets (40 dual-theme = 20 onderwerpen × licht/donker) — LIVE vs GESTUBD

Het onderscheid mag niet verdwijnen: **een gestubde kaart bewijst dat de frontend die state rendert, NIET dat de backend die code in die situatie stuurt.** Dit zijn precies de assets die de docs-pagina's renderen (quickstart, how-indxr-works, de drie guides); ongebruikte captures worden niet meer geschoten.

**Homepage (2026-08-03):** de landing (`/`) hergebruikt `playlist-review` in blok 2 (via `DocsFigure`, dual-theme). De homepage-blokken 3/4/5 zijn **géén** screenshots maar **echte export-output** in een `CodeSample`-codeblok (exports zijn bestanden, geen UI) — herkomst in [product-truth §8](product-truth.md). Er zijn dus geen nieuwe assets bijgekomen; de set blijft 20 dual-theme.

| Type | Onderwerpen (elk `-light` + `-dark`) |
|------|------|
| **LIVE** (echte UI / echt backend) | `method-choice` (chooser, client-side), `uploader-empty` (Upload-tab leeg, pure UI), `playlist-review` (alleen fetch, job **nooit** gestart), `library-list` (geseed account, meerdere rijen), `transcript-speakers` (transcriptlezer mét sprekerlabels — geseede diarisatie-rij, zie seed-noot) |
| **LIVE — video-to-text (2026-08-13)** | `video-upload-mp4` (Upload-tab met de test-MP4 toegevoegd → groen geaccepteerd, tab-strip Video/Playlist/**Upload** in beeld; `setInputFiles`, client-side, géén kosten), `video-cost-card` (kostenpaneel: bestandsnaam · ~5 min · AI transcription · **Total 6 credits**, vóór de start), `video-transcript-speakers` (reading-pane van het **echte** Chappelle-transcript, `Speaker A/B`-labels + tijdstempels; hoogte geclipt tot één scherm), `video-subtitles-srt` (het **echte** geëxporteerde `.srt`-bestand als resultaat — genummerde cues, `HH:MM:SS,mmm`-timing, in-budget `Speaker A:`-prefix; het exportmenu zelf blijft te hoog/smal, dus het resultaat i.p.v. het menu). #1/#2 zetten de repo-MP4 client-side (reproduceerbaar, geen credits); #3/#4 lezen de geseede transcriptie (zie Video-to-text-seed-noot) |
| **LIVE — AI summary (2026-08-24)** | `summary-overview` (de `AiSummaryView`-kaart: "AI Summary"-kop + Copy/Export, de overkoepelende samenvatting en het eerste hoofdstuk met amber `▶`-tijdstempel eronder; via `topShot` geclipt tot één scherm), `summary-chapter` (één hoofdstuk — kop, klikbare tijdstempel, uitgewerkte notities). Beide lezen de **echte** gegenereerde samenvatting op de Justice-fixture (`?tab=summary`, zie AI-summary-seed-noot). **`topShot`** (naast `frameShot`): voor React-gerenderde kaarten die te hoog zijn — een op de kaart gezette `maxHeight` wordt door een re-render weggevaagd (i.t.t. de imperatieve Tiptap-`.ProseMirror`), dus `topShot` bouwt hetzelfde gecentreerde frame op de viewport-oorsprong en gebruikt `page.screenshot({clip})` (vaste viewport-regio) — de hoogte klopt gegarandeerd, de onderrand is een schone afsnede |
| **LIVE — playlist run (2026-08-24, OPT-IN `CAPTURE_PLAYLIST_RUN=1`)** | de drie schermen van een **echte** playlist-extractie, die de machine miste: `playlist-url-input` (het invoerveld + de kostenvoet "First 3 caption videos free · then 1 credit/video · AI 1 credit/min", vóór fetch — geen kosten), `playlist-progress` (de draaiende kaart: kop "Extracting playlist" + teller `N / M · mm:ss` + voortgangsbalk + per-video-rijen met ✓/✗/○ en Auto/AI-badges), `playlist-complete` (de afronding-bon: `CostBreakdown` met "Charged", per-methode-segmenten + refund-regel, **plus de per-code `ErrorCard`s uit de gedeelde copy-map** — ADR-080). **Gated** want het geeft een echt betaald job op `account1` (intern) uit; niet in de default-set. De vastgelegde PNG's komen uit één representatieve run (job `9fbf8ce8`, 10 video's, 1 AI, 3 failures → toont het `proxy_error`- en `no_captions`-vangnet). Fixture: TED-Ed uploads (`UUsooa4yRKGN_zEE8iknghZA`, korte captioned video's). Draai los: `CAPTURE_PLAYLIST_RUN=1 … -g "playlist-run"` |
| **GESTUBD metadata** | `cost-card-ai` (metadata gestubd → deterministische creditkosten, daarna **Cancel** — nooit bevestigd) |
| **GESTUBD** (`page.route`) | `progress-downloading`, en de 4 ErrorCards die de docs tonen: `error-no_captions`, `error-youtube_restricted`, `error-bot_detection`, `error-storage_full` |

**Vervangen/verwijderd t.o.v. de oude set (46 single-theme):** `export-menu` → **DocsTable** uit de `EXPORT_MENU`-descriptor op quickstart (het menu viel te hoog/smal uit); `library-row` → `library-list`; de ongebruikte `captions-result`/`ai-result`/`progress-transcribing` + de ~31 niet-gerenderde ErrorCards zijn uit de default-set (de volledige galerij blijft opvraagbaar via `CAPTURE_GALLERY=1`). De drie voortgangs-/AI-stills waren ooit bronmateriaal voor een latere **Remotion-clip** (roadmap); `apps/video/` is bewust niet gebouwd.

## ErrorCard-galerij (opt-in, `CAPTURE_GALLERY=1`)

De volledige kaart↔code-kruisdekking (`errorCopy.ts` ↔ backend-`error_type`) is een coverage-tool, geen docs-content. Hij draait alleen met `CAPTURE_GALLERY=1` (dan dual-theme voor álle codes in `ALL_ERROR_CODES`). Referentie voor de dekking:

- **`invalid_request`** (backend/main.py, malformed/missing-field 400) → eigen kaart.
- **`watchdog_permanent_failure`** (worker.py, job definitief opgegeven) → eigen kaart die expliciet zegt dat de gereserveerde credits zijn teruggeboekt (worker.py boekt de refund EERST, claimt pas dáárna `status=error`).
- **`no_speech_detected`** — NIET dood: `VideoTab.tsx` checkt deze string als message-pad, onderscheiden van `no_speech`.
- De download-classifier-codes (`partial_write`/`proxy_error`/`ytdlp_parse`/`server_error`/`connection_error`) hebben elk een kaart. `error-zzz_unknown_fallback` bewijst het generieke-fallback-pad voor onbekende toekomstige codes.

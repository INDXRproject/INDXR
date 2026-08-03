# Docs-screenshot capture machine (Playwright)

**Aangemaakt:** 2026-08-02 · **Standaard herzien:** 2026-08-03 · **Spec:** `tests/playwright/capture/quickstart-capture.spec.ts` · **Config:** `playwright.capture.config.ts` · **Assets:** `apps/marketing/public/docs/screenshots/*.png`

Eén Playwright-spec die géén gedrag test maar de docs-beelden vastlegt. Hij is **tegelijk een routecheck**: hij stuurt de echte UI aan op ARIA-rollen + exacte zichtbare tekst, dus een hernoemde knop of verplaatste control laat de bijbehorende capture **omvallen**. Dat is de bedoeling — de capture die faalt is het regressiesignaal.

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

**Library-account geseed — BEWUST, in de PRODUCTIE-DB (2026-08-03):** `library-list` toont een archief, dus het capture-account **`account1`** (`user_id f136104d-2e0a-43ec-aeea-f9e1ed122eb2`, "auto-captions tester" uit `tests/test_accounts.json`) heeft in de **live Supabase-DB** meerdere **schone, publieke** transcripten staan: naast de Justice-fixture 5 handmatig geseede rijen (Feynman/Royal Institution, MIT 6.006, Stanford "Opportunities in AI", CS50, "The Nature of Consciousness"-podcast — colleges/talks, géén testrommel, géén persoonsgegevens). **Dit is opzet en mag blijven staan** — `account1` is en blijft het testaccount; deze rijen zijn er puur zodat de library-lijst als archief leest. Niet "opruimen" als vreemde data. Loopt de lijst leeg of vervuild, seed opnieuw via de DB (INSERT-statement staat in de LOG-entry 2026-08-03) — titels moeten er echt uitzien.

**Dedup-valkuil:** gestubde captures gebruiken een **dummy video-id** (`STUBCARD001`) i.p.v. de fixture, anders onderschept de "you already have this transcript"-dedup-prompt de Extract-klik. De stub negeert tóch welke video het is.

**Waarom live:** de lokale app-server kan de extractie-backend niet bereiken (`/api/extract` → 503, lokale env-gap), dus live-captures draaien tegen `app.indxr.ai`; de gestubde captures (`page.route`) draaien overal.

**`sharp` niet geïnstalleerd → PNG-only** (geen `.webp`).

## Assets (20 dual-theme = 10 onderwerpen × licht/donker) — LIVE vs GESTUBD

Het onderscheid mag niet verdwijnen: **een gestubde kaart bewijst dat de frontend die state rendert, NIET dat de backend die code in die situatie stuurt.** Dit zijn precies de assets die de docs-pagina's renderen (quickstart, how-indxr-works, de drie guides); ongebruikte captures worden niet meer geschoten.

| Type | Onderwerpen (elk `-light` + `-dark`) |
|------|------|
| **LIVE** (echte UI / echt backend) | `method-choice` (chooser, client-side), `uploader-empty` (Audio-tab, pure UI), `playlist-review` (alleen fetch, job **nooit** gestart), `library-list` (geseed account, meerdere rijen) |
| **GESTUBD metadata** | `cost-card-ai` (metadata gestubd → deterministische creditkosten, daarna **Cancel** — nooit bevestigd) |
| **GESTUBD** (`page.route`) | `progress-downloading`, en de 4 ErrorCards die de docs tonen: `error-no_captions`, `error-youtube_restricted`, `error-bot_detection`, `error-storage_full` |

**Vervangen/verwijderd t.o.v. de oude set (46 single-theme):** `export-menu` → **DocsTable** uit de `EXPORT_MENU`-descriptor op quickstart (het menu viel te hoog/smal uit); `library-row` → `library-list`; de ongebruikte `captions-result`/`ai-result`/`progress-transcribing` + de ~31 niet-gerenderde ErrorCards zijn uit de default-set (de volledige galerij blijft opvraagbaar via `CAPTURE_GALLERY=1`). De drie voortgangs-/AI-stills waren ooit bronmateriaal voor een latere **Remotion-clip** (roadmap); `apps/video/` is bewust niet gebouwd.

## ErrorCard-galerij (opt-in, `CAPTURE_GALLERY=1`)

De volledige kaart↔code-kruisdekking (`errorCopy.ts` ↔ backend-`error_type`) is een coverage-tool, geen docs-content. Hij draait alleen met `CAPTURE_GALLERY=1` (dan dual-theme voor álle codes in `ALL_ERROR_CODES`). Referentie voor de dekking:

- **`invalid_request`** (backend/main.py, malformed/missing-field 400) → eigen kaart.
- **`watchdog_permanent_failure`** (worker.py, job definitief opgegeven) → eigen kaart die expliciet zegt dat de gereserveerde credits zijn teruggeboekt (worker.py boekt de refund EERST, claimt pas dáárna `status=error`).
- **`no_speech_detected`** — NIET dood: `VideoTab.tsx` checkt deze string als message-pad, onderscheiden van `no_speech`.
- De download-classifier-codes (`partial_write`/`proxy_error`/`ytdlp_parse`/`server_error`/`connection_error`) hebben elk een kaart. `error-zzz_unknown_fallback` bewijst het generieke-fallback-pad voor onbekende toekomstige codes.

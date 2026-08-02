# Docs-screenshot capture machine (Playwright)

**Aangemaakt:** 2026-08-02 · **Spec:** `tests/playwright/capture/quickstart-capture.spec.ts` · **Config:** `playwright.capture.config.ts` · **Assets:** `apps/marketing/public/docs/screenshots/*.png`

Eén Playwright-spec die géén gedrag test maar de docs-beelden vastlegt. Hij is **tegelijk een routecheck**: hij stuurt de echte UI aan op ARIA-rollen + exacte zichtbare tekst, dus een hernoemde knop of verplaatste control laat de bijbehorende capture **omvallen**. Dat is de bedoeling — de capture die faalt is het regressiesignaal.

## Draaien

Aparte config + testDir, dus **de 9 functionele specs worden niet geraakt** (`playwright test` met de default-config = `testDir: tests/playwright/specs`; deze machine = `testDir: tests/playwright/capture`; geverifieerd: 0 capture-tests in de default-set).

In deze pnpm-monorepo staat `@playwright/test` niet in de root-`node_modules`; hij is gehoist naar `node_modules/.pnpm/node_modules`. Draai daarom met `NODE_PATH` gezet:

```bash
# Volledige set tegen de LIVE app (zie "Waarom live" hieronder):
BASE_URL=https://app.indxr.ai NODE_PATH=node_modules/.pnpm/node_modules \
  node node_modules/.pnpm/@playwright+test@1.59.1/node_modules/@playwright/test/cli.js \
  test --config=playwright.capture.config.ts

# Alleen de gestubde/UI-captures (snel, mag lokaal):  ... -g "errorcard|progress|ai-result|method-choice"
```

**Vereist:** het vaste capture-account `test1@indxr-test.com` ingelogd (cookie-injectie via `tests/playwright/helpers/auth.ts`) met **saldo admin-side op 500** gezet, zodat elk beeld hetzelfde saldo toont. Licht thema, viewport 1280×800 @2x, consent vooraf op *accepted* (geen banner in beeld). Fixture: video `kBdfcR-8hEY`, playlist `PL30C13C91CFFEFEA6` (zie [product-truth §8](product-truth.md)).

**Waarom live:** de lokale app-server kan de extractie-backend niet bereiken (`/api/extract` → 503, lokale env-gap — gerapporteerd, niet gefixt), dus de captures die het echte backend nodig hebben draaien tegen `app.indxr.ai`. De gestubde captures (`page.route`) draaien overal.

**`sharp` is niet geïnstalleerd → PNG-only** (geen `.webp`), zoals bedoeld in de opdracht.

## Assets (43) — LIVE vs GESTUBD

Het onderscheid mag niet verdwijnen: **een gestubde kaart bewijst dat de frontend die state rendert, NIET dat de backend die code in die situatie stuurt.**

| Type | Assets |
|------|--------|
| **LIVE** (echt backend) | `method-choice`, `cost-card-ai` (echte metadata 3296 s → 55 cr, daarna **Cancel** — nooit bevestigd), `captions-result`, `export-menu`, `library-row`, `playlist-review` (alleen fetch, job **nooit** gestart) |
| **GESTUBD** (`page.route`) | `progress-downloading`, `progress-transcribing`, `ai-result`, en **elke ErrorCard** uit de copy-map: `error-<code>.png` voor 33 codes + `error-zzz_unknown_fallback` (de onbekende-code-fallback) |

De drie voortgangs-/AI-stills (`progress-downloading`, `progress-transcribing`, `ai-result`) zijn tevens het bronmateriaal voor de latere **Remotion-clip** (zie roadmap). `apps/video/` is in deze opdracht bewust **niet** gebouwd.

## ErrorCard-codes: kaart↔code-dekking (gerapporteerd, niet gefixt)

Kruisvergelijking van de frontend-copy-map (`errorCopy.ts`) met de backend-`error_type`-waarden:

- **Backend-code zónder eigen kaart** (valt terug op de generieke "Something went wrong"-fallback): **`invalid_request`**, **`watchdog_permanent_failure`**. Beide renderen wel iets (de fallback), maar missen een gerichte kaart. (`test` = testwaarde, negeren.)
- **Kaart met onzekere backend-herkomst:** `no_speech_detected` lijkt een dubbel/alias van `no_speech` (backend stuurt `no_speech`) — controleren of hij ooit apart aankomt. `partial_write`/`proxy_error`/`ytdlp_parse`/`server_error`/`connection_error` zijn return-waarden van de download-classifier (`transcription_pipeline._classify_download_error`) en worden door een simpele `error_type=`-grep niet gevangen — vermoedelijk wél geëmit via het job-pad, maar niet bevestigd. `channel_url` wordt **frontend-side** gezet (niet door de backend), dus geen dode kaart.

Actie voor Khidr: overweeg gerichte kaarten voor `invalid_request` + `watchdog_permanent_failure`, en verifieer of `no_speech_detected` nog nodig is.

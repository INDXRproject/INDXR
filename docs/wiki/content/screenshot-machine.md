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

**Sessie (storageState, 2026-08-03):** één gedeelde login. `global-setup.ts` mint de Supabase-sessie van `test1@indxr-test.com` één keer + zet consent=accepted + thema=light, en schrijft dat naar `capture-state.json` (gitignored — bevat een sessietoken). Elke test hergebruikt die state; **geen login per test meer** (dat was de reden dat een volledige live-run de timeout haalde). **Runtime:** lokale gestubde/UI-batch **41 assets in ~162 s**, live-backend-batch **5 in ~37 s**. Vereist: `test1` met **saldo admin-side op 500**. Licht thema, viewport 1280×800 @2x. Fixture: video `kBdfcR-8hEY`, playlist `PL30C13C91CFFEFEA6` (zie [product-truth §8](product-truth.md)).

**Dedup-valkuil:** gestubde captures gebruiken een **dummy video-id** (`STUBCARD001`) i.p.v. de fixture, anders onderschept de "you already have this transcript"-dedup-prompt de Extract-klik zodra `test1` de fixture al in z'n bibliotheek heeft. De stub negeert tóch welke video het is. Voor de live-captures wordt `test1` schoongemaakt zodat `captions-result` het transcript vers aanmaakt (→ `library-row`).

**Waarom live:** de lokale app-server kan de extractie-backend niet bereiken (`/api/extract` → 503, lokale env-gap — gerapporteerd, niet gefixt), dus de live-backend-captures draaien tegen `app.indxr.ai`; de gestubde captures (`page.route`) draaien overal. Eén-commando-volledige-run = tegen `app.indxr.ai` (dan zitten óók de nieuwe ErrorCards erin).

**`sharp` is niet geïnstalleerd → PNG-only** (geen `.webp`), zoals bedoeld in de opdracht.

## Assets (46) — LIVE vs GESTUBD

Het onderscheid mag niet verdwijnen: **een gestubde kaart bewijst dat de frontend die state rendert, NIET dat de backend die code in die situatie stuurt.**

| Type | Assets |
|------|--------|
| **LIVE** (echt backend / echte UI) | `method-choice`, `cost-card-ai` (echte metadata 3296 s → 55 cr, daarna **Cancel** — nooit bevestigd), `captions-result`, `export-menu`, `library-row`, `playlist-review` (alleen fetch, job **nooit** gestart), `uploader-empty` (Audio-tab, formaten + 500 MB in beeld — pure UI) |
| **GESTUBD** (`page.route`) | `progress-downloading`, `progress-transcribing`, `ai-result`, en **elke ErrorCard** uit de copy-map: `error-<code>.png` voor 35 codes (incl. de 2026-08-03 toegevoegde `invalid_request` + `watchdog_permanent_failure`) + `error-zzz_unknown_fallback` (de onbekende-code-fallback). `error-storage_full` dekt óók de uploads-guide. |

De drie voortgangs-/AI-stills (`progress-downloading`, `progress-transcribing`, `ai-result`) zijn tevens het bronmateriaal voor de latere **Remotion-clip** (zie roadmap). `apps/video/` is in deze opdracht bewust **niet** gebouwd.

## ErrorCard-codes: kaart↔code-dekking — gesloten (2026-08-03)

Kruisvergelijking van de frontend-copy-map (`errorCopy.ts`) met de backend-`error_type`/`code`-waarden, nu sluitend in beide richtingen:

- **`invalid_request`** (backend/main.py:850-886, malformed/missing-field 400) → kreeg een eigen kaart. Was voorheen fallback.
- **`watchdog_permanent_failure`** (worker.py:835, job definitief opgegeven na crash-recovery) → kreeg een eigen kaart die **expliciet zegt dat de gereserveerde credits zijn teruggeboekt**. Code-geverifieerd: worker.py:800-838 boekt de refund EERST en claimt pas dáárna `status=error`; een gefaalde refund laat de job op `interrupted` staan voor de volgende cyclus, dus de gebruiker ziet deze code nooit met credits nog vast.
- **`no_speech_detected`** — **NIET** dood: `VideoTab.tsx:219,910` checken deze string als een message-pad, onderscheiden van `job.error_type === 'no_speech'`. Blijft.
- **`test`** = testwaarde, geen kaart nodig. `channel_url` wordt frontend-side gezet (geen dode kaart). De download-classifier-codes (`partial_write`/`proxy_error`/`ytdlp_parse`/`server_error`/`connection_error`) hebben allemaal een kaart.

Geen backend-code valt nog op de generieke fallback (die blijft als vangnet voor onbekende toekomstige codes — `error-zzz_unknown_fallback` bewijst dat pad).

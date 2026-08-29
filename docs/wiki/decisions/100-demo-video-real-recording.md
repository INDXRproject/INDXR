# Beslissing 100: Landings-demovideo als échte schermopname, niet als Remotion-simulatie

**Status:** Geaccepteerd
**Datum:** 2026-08-29
**Gerelateerde code:** `tests/playwright/capture/home-clip-video.spec.ts`, `playwright.homeclip.config.ts`, `tests/playwright/capture/home-clip-assemble.md`, `tests/playwright/capture/video-helpers.ts`, `apps/marketing/public/video/home-clip-{light,dark}.mp4`, `apps/video/` (Remotion-compositie verwijderd)

## Context

De landings-demovideo (`/video/home-clip-{light,dark}.mp4`) was een **Remotion-compositie**
(`apps/video/src/HomeClip.tsx`): een camera pande/zoomde over **volledige-viewport-stills** van de app,
met een **geïnjecteerde nep-cursor** wiens doelcoördinaten fracties van de compositie waren. Bij de
overstap van uitgesneden crops naar volledige-viewport-stills zijn die fracties **hergebruikt** in plaats
van opnieuw gemeten — waardoor kliks overal verkeerd vielen, de zoom ongepast draaide en het successcherm
op de verkeerde knop eindigde. De simulatie kon structureel niet waarheidsgetrouw blijven: elke keer dat
de stills of de layout wijzigden, moesten de cursor-fracties met de hand opnieuw worden geijkt.

Er bestond al een **echte** opnametak (ADR-088 / `core-flow-video.spec.ts`): `recordVideo` op een eigen
context, `installCursor()` (zichtbare cursor die de echte muis volgt), `clickLikeHuman`/`typeLikeHuman`
die op de **live bounding box** van elk element sturen, deterministische stubs, `CAPTURE_THEME` voor beide
thema's. Die legde de eerste vier momenten al waarheidsgetrouw vast.

## Beslissing

De Remotion-gesimuleerde demo wordt **volledig vervangen** door **één doorlopende echte Playwright-
schermopname** (`home-clip-video.spec.ts` + `playwright.homeclip.config.ts`), gebouwd op dezelfde bewezen
core-flow-infra. Het hele scenario (plakken → AI kiezen → laden → succes → naar bibliotheek → Justice-rij
openen → sprekers hernoemen met zichtbaar effect → Timestamps → Export op hetzelfde transcript) wordt in
één run opgenomen, beide thema's, **zonder enige zoom** — elk scherm vol in beeld.

Merk-intro/outro (bestaand logo op de effen thema-`--bg`) en twee trims (de account-laadsplash aan het
begin weg, het bibliotheek-laadmoment gecapt op ≤0,5 s) worden **met ffmpeg** om de opname gemonteerd,
gestuurd door recording-klok-marks (`home-clip{,-dark}.timings.json`). De montage is gedocumenteerd in
`home-clip-assemble.md`. De Remotion-compositie (`HomeClip.tsx`, `Root.tsx`, `tokens.ts`, `index.ts`,
`remotion.config.ts`, `tsconfig.json`) en de bijbehorende render/still/studio/copy-source-scripts zijn
**verwijderd**; `apps/video/` host nog uitsluitend de `export-demos/`.

## Rationale

- **Kan niet meer driften.** Echte navigatie + echte kliks op de gemeten bounding box maken de
  hergebruikte-fractie-bug structureel onmogelijk; er is geen aparte cursor-klok meer om te ijken.
- **Zelfde medium als core-flow.webm**, dat al bewezen en juridisch afgetikt is (ADR-088: geen
  youtube.com in beeld). Alleen uitgebreid van 4 naar het volledige scenario.
- **Eenvoudiger pijplijn.** Geen Remotion-render (zware headless-Chrome/ffmpeg/esbuild-boom) meer voor de
  demo; alleen de opname + een ffmpeg-montagestap.
- **Geen zoom.** De gebruiker wilde elk scherm vol in beeld; een opname heeft van nature geen camera-
  transform, dus die verdween hoe dan ook.

## Consequenties

- De geshipte demo-mp4 komt uit de **opname + ffmpeg**, niet uit Remotion. De Remotion-render-scripts en
  -compositie bestaan niet meer.
- **ADR-089** (Remotion-workspace buiten de build-graph) geldt voor de demo niet meer; `apps/video/` blijft
  bestaan, maar enkel voor de `export-demos/` (die Playwright-core direct gebruiken, geen Remotion).
- `core-flow-video.spec.ts` + `playwright.video.config.ts` blijven als kortere **referentie-opname**
  (echt, niet gesimuleerd) — nu demo-ongebruikt.
- Reproduceerbaarheid: opnemen (`playwright.homeclip.config.ts`, beide thema's) → `home-clip-assemble.md`
  (merkkaders + ffmpeg-trims op de `timings.json`-marks) → `apps/marketing/public/video/`.
- De demo blijft thema-bewust (twee mp4's, CSS-geswitcht in `HomeClipVideo.tsx`), click-to-play, geen
  autoplay — ongewijzigd t.o.v. de Remotion-versie.

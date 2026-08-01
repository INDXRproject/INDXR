# Beslissing 085: Transcriptpagina-herontwerp (`/dashboard/library/[id]`)

**Status:** Geaccepteerd (gefaseerd; leescanvas + tabs + video + stale-notice geleverd, header/toolbar-
laag resterend)
**Datum:** 2026-08-01
**Gerelateerde code:** `packages/shared/src/utils/formatTranscript.ts` (`buildReadingParagraphs`),
`apps/app/src/components/library/{TranscriptViewer,TranscriptTabs,NocookieYouTubePlayer,AiSummaryView}.tsx`,
`apps/app/src/app/dashboard/library/[id]/page.tsx`, `apps/app/src/app/dashboard/transcribe/page.tsx`,
migratie `20260801120000_edited_content_updated_at`, `apps/marketing/src/app/privacy/page.tsx`

## Context

De detailpagina las slecht: werkbalk boven de titel, een videovlak dat ruimte reserveerde, en vooral
`transcriptToJSON` dat **één ondertitelsegment per paragraaf** rendert — 4.596 woorden als een gedicht
met rafelrand. Richting: `docs/wiki/design/mockups/transcript-redesign-mockup.html` (richting, geen spec).

## De vier onderzoeksvragen (met bewijs)

1. **Alinea-drempel — data-gedreven, configureerbaar, getest.** Gemeten op echte transcripten: gaps
   zijn ~0 voor beide bronnen (onbruikbaar als breekpunt); captions eindigen 38% op een zin, AI slechts
   0,6% (punctuatie mid-segment). Daarom `buildReadingParagraphs`: captions breken op een zinsgrens ná
   `minBreakSec` (22s); AI op een harde `maxParaSec` (32s); een **`maxChars=500`-guardrail** bindt de
   lengte los van spreektempo (voorkwam AI-muren tot 149 woorden). `READING_PARAGRAPH_CONFIG` is
   geëxporteerd/tunebaar; **unit-test** (`buildReadingParagraphs.test.ts`, 8 checks, vaste fixtures) pint
   elk gedrag. **Gemeten resultaat op 3 echte transcripten:** captions median 51 woorden (max 115); AI
   82/91 median (max 117) — alles onder het 140-plafond.
2. **Timestamps + privacy → nocookie + in-app seek.** De oude embed was cookieful
   (`youtube.com/embed`, geen consent-gate). Nu `NocookieYouTubePlayer`: IFrame Player API met
   `host=youtube-nocookie.com`, **lazy** geladen — niets van YouTube (en geen cookie) tot de gebruiker
   de video opent, geen cookie tot playback. Tijdstempels sturen `player.seekTo()`. **Geverifieerd:** dit
   was de enige cookieful YouTube-`<iframe>` in de repo → repo-breed consistent. Privacyverklaring
   uitgebreid met een accurate disclosure.
3. **Verouderde-samenvatting → echte kolom.** `ai_summary.generated_at` bestond (100%); `edited_content`
   had geen timestamp en `updated_at` is vervuild. Nieuwe kolom `edited_content_updated_at`, gezet in
   **élk** edited_content-schrijfpad (save→`now()`, transcribe-reset→`null`). `AiSummaryView` toont de
   melding wanneer `generated_at < edited_content_updated_at`. Geen verzonnen data; bestaande edits
   (bleken echte edits) blijven, tonen geen melding tot een volgende save.
4. **RAG-presets → gratis client-side.** `buildRagJson` is 100% client-side, `rag_exports` bevat alleen
   markerrijen; ná één betaalde export is elke chunklengte een gratis directe download (geen server, geen
   wachttijd, geen voortgangsstaat). De Developer-tab bevestigt dat.

## Beslissingen

- **Conditionele tabs + content-fallback** (`[id]/page.tsx` + `TranscriptTabs`): tabs verschijnen alleen
  als hun inhoud bestaat; een `?tab` waarvan de inhoud weg is valt terug op Transcript (geen dood tabblad
  meer). Labels: Transcript/Edited/Summary/Edited summary/Developer (max 5), URL-`?tab`-ids stabiel.
- **Mobiele view-selector** i.p.v. een tabrij (5 tabs passen niet op 360px): één knop → bottom-sheet.
- **Leesbare alinea's** via `buildReadingParagraphs` als Tiptap-seed; leescanvas 68ch.
- **Video reserveert geen ruimte tenzij geopend**; nocookie + in-app seek (zie vraag 2).
- **Export houdt expliciete "Edited TXT/MD"**: de bewerkte versie is Tiptap-HTML zonder segment-timings,
  dus SRT/VTT/CSV/JSON kunnen niet uit de edited-versie — export-volgt-tab zou die formaten stil laten
  vallen. Daarom niet gedaan.
- **NIET gebouwd:** gewijzigde-alinea-diffmarkering (vereist een doorlopende Tiptap-diff, breekt bij
  samenvoegen) en een modelnaam/generatiedatum-regel bij de samenvatting (ruis).

## Consequenties

- `transcriptToJSON` seedt nu merged paragraphs; het origineel rendert altijd merged (consistent, oud én
  nieuw); nieuwe edits seeden merged → geen poem-vs-merged-divergentie. De 2 legacy edited-rijen zijn
  echte edits en blijven ongewijzigd.
- Nieuwe kolom `edited_content_updated_at` moet meebewegen met **elk** toekomstig edited_content-schrijfpad
  (anders stille melding + dode kolom).
- **Resterend (header/toolbar-laag):** de visuele kop-herschikking (breadcrumb → titel → feitenregel met
  badges+duur/woorden/datum → tabs+toolbar op één rij), de toolbar-herindeling (Copy als eigen knop,
  Find-als-knop, Display-menu, `⋯` met transcript-acties), de Edit-routing (vanaf Transcript direct naar
  de Edited-tab in editmodus i.p.v. edit-op-origineel), en de mobiele toolbar-overflow-fix zijn nog te
  doen. `library-source-map.md §8` bij te werken zodra die laag landt.

## Verificatie

`buildReadingParagraphs`: unit-test 8/8 + meting op 3 echte transcripten (word-bands). Migratie
`20260801120000` toegepast + geregistreerd. `pnpm build` groen (2/2) per fase. Deploys groen
(`42e0306`/`eb18771`/`a505f00`). Interactieve prod-verificatie (tab-fallback, video-seek, stale-notice,
mobiele view-selector, RTL) via de herbruikbare `tests/playwright/prod-check.sh`.

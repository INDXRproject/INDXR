# Beslissing 081: Playlist gratis-slots per-methode (geen doorschuif) + één regel-bron

**Status:** Geaccepteerd
**Datum:** 2026-07-27
**Gerelateerde code:** `backend/credit_manager.py` (`playlist_free_ids`), `backend/main.py` (`_compute_playlist_reservation`), `backend/worker.py` (`process_playlist_video` :431, `process_playlist_retries` :692), `packages/shared/src/lib/pricing.ts` (`playlistFreeIds`, `FREE_TIER.PLAYLIST_FREE_VIDEOS`), `test-fixtures/playlist_free_slots.json`, `backend/test_playlist_free_slots.py`

## Context

De playlist "eerste 3 gratis"-tier was **positioneel**: `is_free = video_index < 3 and not is_retry`. Gevolg: een AI-video (whisper) op positie 0–2 **verbrandde een gratis slot** zonder korting, waardoor een latere caption-video wél belast werd. Dezelfde selectie kostte dus **meer of minder afhankelijk van waar de AI-video's in de playlist stonden** — wie dat doorhad betaalde minder dan wie het niet wist. Bovendien stond de regel in **zes logica-kopieën** (reservering + twee settlement-passes in Python, drie frontend-sites in TS); drift tussen reservering en settlement is een echt-geld-bug.

## Beslissing

Job-niveau vs. unit-niveau: de gratis-tier werkt op **unit-niveau** (per getranscribeerde video); een "gratis slot" is één unit, geen job.

1. **Per-methode:** de 3 gratis slots gaan naar de **eerste 3 CAPTION-video's op playlist-positie**, **vooraf bepaald** uit `(video_ids, whisper_ids)`. AI/whisper-video's kosten **nooit** een slot → het bedrag is **volgorde-onafhankelijk**.
2. **Geen doorschuif:** faalt een gratis caption-video, dan **vervalt** het slot — het schuift NIET door naar de volgende caption. Omdat de gratis-set vooraf bepaald is, geldt **reservering == settlement** triviaal (geen conservatief-reserveren-met-terugvloeien nodig), en het matcht het bestaande "slot is statisch"-gedrag.
3. **Retries erven nooit een vers slot:** `is_retry` → lege gratis-set (ongewijzigd t.o.v. de oude regel; met test die dit vastlegt).
4. **Eén bron van waarheid:** de regel leeft in precies twee helpers — `credit_manager.playlist_free_ids` (Python) en `pricing.playlistFreeIds` (TS) — gesynchroniseerd via de gedeelde fixture `test-fixtures/playlist_free_slots.json`, geladen door zowel de Python-test als (frontend) `receiptAggregation.test.ts`, zodat CI faalt bij divergentie.

## Rationale

- **Eerlijker + eerlijk label:** het bedrag hangt niet meer af van de plek van AI-video's; "eerste 3 gratis" klopt dan **letterlijk** (de eerste 3 caption-video's), zonder popover die uitlegt wanneer het níét zo is.
- **Nooit duurder:** per-methode geeft altijd ≥ evenveel gratis captions als positioneel → **altijd goedkoper of gelijk, nooit duurder**. Bewezen op 8 fixture-scenario's én op een echte gemengde playlist (`7446e9f4`, AI op positie 0): positioneel 88 credits → per-methode 87 (1 goedkoper; whisper-kost identiek, alleen de gratis-caption-telling verschuift).
- **Reconcilieert triviaal:** vooraf bepaalde gratis-set → reservering en settlement gebruiken dezelfde helper → kunnen niet uiteenlopen. **Doorschuiven is bewust NIET gekozen:** dat is runtime-afhankelijk (welke gratis video faalt), dus de reservering zou de gratis-set niet vooraf kennen → conservatief reserveren + verschil bij settlement terugvloeien; meer complexiteit voor marginale winst op een rand-case, en minder aantoonbaar reconcilierend.

## Consequenties

- **Twee stappen:** Stap 1 (consolidatie, commit `14a4173`) bracht de 6 kopieën terug naar 2 helpers, bewezen **no-op** (gedrag ongewijzigd, positioneel). Stap 2 (deze ADR) is de gedragswijziging naar per-methode, bewezen nooit-duurder + reconcilierend.
- **Historisch ongewijzigd:** forward-only; al-afgerekende playlists worden niet herrekend.
- **Copy gelijktrekken:** `pricing.ts`-copy ("first 3 videos") + de betreffende marketingpagina's → "first 3 **caption** videos"; de uitleg-popover in de playlist-modus (frontend-sessie) die het positionele gedrag uitlegde wordt **overbodig en moet weg**, niet blijven staan.
- **Frontend-hand-off:** de drie TS-sites (`PlaylistAvailabilitySummary`, `receiptAggregation`, `PlaylistManager`) roepen `playlistFreeIds` aan i.p.v. eigen inline-kopieën; de method-blinde "Free"-badge (`PlaylistManager.tsx:729`) is dan meteen correct.
- **Toekomstige wijziging:** de gratis-tier verander je nu op precies twee plekken (de twee helpers) + de fixture — nooit meer verspreid.

## Follow-up — frontend uitgevoerd (2026-07-27)

De drie TS-sites en de method-blinde badge roepen nu `playlistFreeIds` aan; de inline positionele kopieën zijn weg:
- `PlaylistAvailabilitySummary.tsx`: `captionCredits` + `freeVideoIds` via `playlistFreeIds`; ook de per-rij `paidCaption` (was `… && idx >= 3`) is nu `!isAi && !free` (positioneel `>= 3` was redundant én misleidend — `free` is al per-methode; `extractableIndex` daardoor verweesd en verwijderd).
- `receiptAggregation.ts`: `freeIds` via `playlistFreeIds(anchor.video_ids, anchor.use_whisper_ids)` i.p.v. `slice(0,3).filter(!whisper)`.
- `PlaylistManager.tsx`: de pre-extractie "Free"-badge (was `idx < 3`) via een `selectionFreeIds`-memo op `playlistFreeIds`; de positionele uitleg-popover is verwijderd; copy "first 3 **caption** videos" in de one-liner + de footer-notice.
- `receiptAggregation.test.ts`: laadt `test-fixtures/playlist_free_slots.json` en assert `playlistFreeIds` == `expected_free` voor alle 8 cases (naast de Python-test) → CI faalt bij TS/Python-divergentie.

**Implementatiedetail (build):** `receiptAggregation.ts` wordt zowel gebundeld (Next) als door de node-`--experimental-strip-types`-unittest geladen. Node's ESM-loader vereist een expliciete extensie voor een runtime-import, dus de import is `../lib/pricing.ts`; om die `.ts`-extensie door de bundler-typecheck te laten, staat `allowImportingTsExtensions: true` in de drie tsconfigs (mag omdat `noEmit: true` overal aanstaat). De andere `.tsx`-sites importeren extensieloos (bundler-norm).

**Verificatie:** `pnpm build` groen (beide apps). TS-test 5/5 groen, Python-test ALL_PASS — beide tegen dezelfde fixture. Bevestigingsscherm en afrondingsbon rekenen nu allebei via `playlistFreeIds`, dus tonen hetzelfde bedrag; de "mixed AI front"-case (`[a,b,c,d,e]`, AI op `a,b`) geeft in beide `free={c,d,e}`, precies waar oud (positioneel: alleen `c` gratis) en nieuw uiteenliepen.

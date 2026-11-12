# Beslissing 109: Spelling hints (AssemblyAI keyterms_prompt)

**Status:** Geaccepteerd
**Datum:** 2026-11-11
**Gerelateerde code:** `backend/{spelling_hints,assemblyai_client,transcription_pipeline,worker,main}.py`, `packages/shared/src/lib/spellingHints.ts`, `packages/shared/src/components/transcribe/SpellingHintsField.tsx`, `packages/shared/src/hooks/useRecentSpellingHints.ts`, `supabase/migrations/20261111193952_keyterms_spelling_hints.sql`

## Context

AI-transcripten spellen namen en vaktermen regelmatig fout — eigennamen, vakjargon, en voor ons
publiek specifiek filosofie-/geschiedenisnamen en Latijn/Grieks/Duits/Arabisch. AssemblyAI biedt
`keyterms_prompt` op async STT: tot 1000 termen op Universal-3.5 Pro / 200 op Universal-2, max 6
woorden per term, +$0,05/uur. AssemblyAI's eigen documentatie waarschuwt dat lange lijsten
averechts werken (een term kan een correct herkend woord overschrijven; bijna-homofonen botsen) —
klein en specifiek per opname is het ontwerp, niet alleen UI-voorkeur.

## Beslissing

- **Eén optioneel veld, alleen bij AI-transcriptie** ("+ Spelling hints", ingeklapt), max 50 termen
  × 6 woorden, in alle vier AI-transcriptie-paden (single video, upload, playlist — één lijst voor
  de hele job, en de anonieme snelle balie).
- **Master-cache wordt overgeslagen (lezen EN schrijven) zodra er hints zijn.** Geen cache-key-
  schema-wijziging nodig; een gehinte run is sowieso request-specifiek, dus hergebruik is zeldzaam.
  Een gehinte en een ongehinte run van dezelfde video delen dus nooit een cache-entry.
- **Kosten-add-on volgt exact het diarisatie-patroon (ADR-091):** `cost_config` rate-kolom → EUR/min
  helper-functie (SECURITY DEFINER, REVOKE anon/authenticated, GRANT service_role) →
  `transcription_jobs`-kolom → gevouwen in `job_cor_eur()` en `_geld_scope()` op dezelfde twee
  plekken als de diarisatie-add-on, additief (beide add-ons kunnen samen aanstaan).
- **Gebruikte termen = de vlag**, geen apart boolean. `transcription_jobs.keyterms text[]` /
  `transcripts.keyterms text[]` / `quick_quotes.keyterms text[]` zijn NULL/leeg = geen add-on, niet-
  leeg = add-on + het daadwerkelijke record voor UI/export.
- **Geen nieuwe tabel voor "recent gebruikte lijsten."** De laatste 3 distincte lijsten worden
  rechtstreeks uit de eigen `transcription_jobs`-rijen van de gebruiker gelezen (RLS staat dit al toe,
  ADR-104) — klein en intuïtief houden, geen beheerscherm.

## Rationale

Het diarisatie-patroon (cost_config-kolom + EUR/min-helper + job_cor_eur-param + twee
`_geld_scope`-plekken) is inmiddels de bewezen vorm voor een AssemblyAI-add-on-kost — een tweede
toepassing bevestigt dat het generaliseert zonder wijziging. Cache-overslaan in plaats van een
genormaliseerde cache-key (sorteren/lowercase/hash) is de eenvoudigste optie die het probleem
daadwerkelijk oplost: hints zijn per-request-specifiek, dus de cache-hit-kans was al laag.

## Consequenties

- `job_cor_eur()`'s signatuur is uitgebreid met een 5e parameter (`p_keyterms boolean`) — het oude
  4-argument-overload is gedropt; `compute_and_store_job_cost` is de enige caller en is in dezelfde
  migratie meegenomen.
- Playlist-retries delen de spelling-hints-lijst van de oorspronkelijke run (lifted state in
  `PlaylistTab`), omdat een retry een NIEUWE `playlist_extraction_jobs`-rij aanmaakt.
- `/api/playlist/extract` se Zod-schema moest `spelling_hints` expliciet declareren (safeParse strip
  anders onbekende velden vóór ze de backend bereiken) — zelfde patroon als `is_retry`.

## Vervolg — live test 2026-11-11, 3 bugs gevonden + gefixt

Echte test (3 video's, 16–19 min, met/zonder hints + een herhaalrun op `contact@indxr.ai`) — resultaten
in `docs/marketing/examples/spelling-hints.md`. Bracht drie bugs aan het licht, alle drie gefixt in
dezelfde sessie:

1. **Dedup/idempotency nam keyterms niet mee in de sleutel.** De legacy tijd-gebaseerde video-dedup
   (`main.py`, alleen zonder idempotency-sleutel) en de idempotency-`request_hash` (met sleutel) waren
   allebei gekeyed op user+video(/bestand) zonder keyterms — een hinted request voor een al lopende
   ongehinte video werd stil als dezelfde handeling behandeld ("already being processed", hints weg).
   Fix: nieuwe `keyterms_signature()` (backend `spelling_hints.py` + TS-mirror `spellingHints.ts`,
   sorteer+lowercase+join, zodat volgorde niet telt) in (a) de `request_hash()`-aanroepen voor single/
   upload/playlist, (b) de legacy dedup-query (vergelijkt nu een klein kandidatenvenster i.p.v.
   `limit(1)` tegen de signature), en (c) de CLIENT-side idempotency-key action-string (`VideoTab`,
   `AudioTab`, `PlaylistTab`) — zodat een andere hint-set altijd een structureel nieuwe sleutel munt
   i.p.v. te botsen op een nog-niet-opgeruimde sessionStorage-sleutel van de vorige aanvraag.
2. **Re-extract-with-AI/foutkaart-upsell/playlist-retry sloegen het hints-veld over.** Deze paden
   riepen `handleWhisperUpsell`/`onRetryAll` direct aan zonder confirm-stap, dus er was geen plek voor
   het veld. Fix: een inline confirm-box (`SpellingHintsField` + Confirm/Cancel) vóór elke van deze
   triggers (`VideoTab`: de post-caption-upsell-regel, de ErrorCard `onUseAi`, en de bot_detection-note-
   link delen nu één `showReextractConfirm`-state; `PlaylistManager`: het veld toont inline in het
   al-bestaande retry-confirm-blok, wanneer er AI-video's tussen de retryable videos zitten).
3. **"Leave site?" bleef actief na een geslaagde Re-extract-with-AI-job.** `_handleWhisperError` zette
   `isReextracting` terug op `false`, maar het succespad `_handleWhisperComplete` deed dat nooit — de
   `isReextracting`-gated `beforeunload`-guard bleef dus voor de rest van de sessie gewapend. Fix: één
   ontbrekende `setIsReextracting(false)` in `_handleWhisperComplete`.

**Géén bug in de COR/kosten-kant.** De oorspronkelijke hypothese ("keyterms wordt stilletjes NULL
gemaakt door een latere update, COR mist de add-on") is **niet bevestigd** — live SQL op de 9 echte
testjobs toonde dat `transcription_jobs.keyterms` correct bewaard blijft en `cost_eur` voor elke
"met hints"-job exact overeenkomt met `job_cor_eur(...)` berekend MET de add-on-vlag (en zonder add-on
voor de "zonder hints"-baselines). Geen recompute nodig. Het gerapporteerde "chips verdwijnen"-
symptoom was een losse frontend-bug: `useRecentSpellingHints` fetchte eenmalig bij mount, dus binnen
één paginasessie (VideoTab/AudioTab remounten niet tussen opeenvolgende runs) werden net-gebruikte
hints nooit chips voor de VOLGENDE run. Fix: de hook retourneert nu ook `recordUsed(terms)`, dat de
lijst optimistisch bijwerkt op het moment van indienen (geen DB-refetch, geen timing-race).

## Vervolg 2 — live test 2026-11-12, parser + suggestie-filter + dedup-statusweergave

Zie ADR-110 voor de yt-dlp/download-robuustheidsbugs uit dezelfde testronde (apart domein). Drie
kleinere, spelling-hints-specifieke bugs:

- **Splitter zag alleen ","**: `الموطأ، الإمام مالك، ابن عبد البر` (Arabische komma's) en
  `Zubaidah\nBarmakids\nKhurasan; Raqqa` (newline/puntkomma) gaven 0 resp. 1 term i.p.v. 3 resp. 4.
  Fix: `backend/spelling_hints.py` en `packages/shared/src/lib/spellingHints.ts` splitsen nu allebei
  op `[,،;؛、，\n]+`, gedeelde fixture `test-fixtures/spelling_hints_split.json` +
  `check-playlist-invariants.sh`-sectie houdt ze gesynchroniseerd. De redesignde pill-input (vorige
  sessie) had zijn EIGEN, ongesplitste paste-pad (`addTerm` nam de hele plak-tekst als één term) —
  `addTerms`/`onPaste` gebruiken nu dezelfde `splitSpellingTerms()`.
- **Titelsuggesties pakten generieke vakwoorden**: "Taster Lecture", "Antimicrobial Resistance" werden
  als eigennamen voorgesteld. `TITLE_STOPWORDS` uitgebreid met academisch/cursus-vocabulaire (lecture,
  introduction, session, resistance, syndrome, …) — "liever geen suggestie dan een nutteloze."
- **Dedup-statusweergave**: een `deduplicated:true`-respons hangt aan een BESTAANDE job wiens status
  al terminaal (`complete`/`error`) kan zijn tegen de tijd dat de nieuwe aanvraag aankomt (precies het
  temp-file-race-scenario, ADR-110). De rauwe status werd blind in `whisperStatus` gezet —
  `JobProgressCard`'s `STATUS_LABEL` kent geen `'error'`-sleutel → lege/kapotte kaart. Fix:
  `normalizeDedupStatus()` valt terug op `'pending'` voor elke niet-live status; `useJobStatus`'s
  eigen poll/realtime lost de echte eindstatus daarna gewoon op.

**UI-redesign (zelfde sessie, poster-stijl):** mono-caps rij-label "Spelling hints" + "Optional · no
extra cost" in het kostenblok, ingeklapt naar één uitlegregel + een outline-knop "Add names & terms",
termen als verwijderbare pills i.p.v. los komma-tekst, een deterministische (geen LLM)
titel/kanaal-extractie (`suggestTermsFromTitle`) die eigennamen als klikbare "From the title"-chips
voorstelt, en een inline (geen toast) skip-melding bij een te-lang term of het 50-limiet.


# Beslissing 050: Credit-reservering (reserve-and-hold) voor alle transcriptie-jobs

**Status:** Geaccepteerd — code gebouwd (reserve+settle+refund), achter `CREDIT_RESERVATION_ENABLED` (OFF); activering apart ná prod-verificatie
**Datum:** 2026-07-06
**Gerelateerde code:** `backend/credit_manager.py`, `backend/transcription_pipeline.py`, `backend/worker.py` (watchdog), RPC's `reserve_credits` / `settle_credits` / `refund_credits` / `update_playlist_video_progress` / `deduct_credits_atomic` / `add_credits`, tabellen `credit_transactions` / `transcription_jobs` / `playlist_extraction_jobs`

> **Implementatiestatus (2026-07-06):** Dit ADR legt het door Khidr goedgekeurde ontwerp vast uit de 2a-designsessie. **Alle drie de gedrags-fasen zijn nu gebouwd én in de prod-DB toegepast** (M1/M2-fundering + watchdog-CAS in fase 1; `reserve_credits` in gedrags-fase 1; `settle_credits`/`refund_credits` + de reservation-aware pipeline/worker + caption-settle in gedrags-fase 2 — migraties `20260706205451/205619/205835/205918` staan in `schema_migrations`). **Het nieuwe gedrag is echter INACTIEF in productie:** de feature-flag `CREDIT_RESERVATION_ENABLED` staat default OFF, waardoor nieuwe jobs niet reserveren (`credits_reserved=0`) en overal de byte-identieke oude directe aftrek loopt (rollback-veilige `else`-tak). De code brancht per-job op `credits_reserved > 0`, niet op de flag, zodat er geen dubbel/nul-aftrek-window ontstaat bij activering. Activering is een aparte 1-regel-follow-up (flag → true) ná prod-verificatie. Bewezen met `backend/test_settle_refund.py` (29/29: whisper/playlist partial+full-fail/mixed/idempotentie/reconciliatie/watchdog/flag-flip) + de fase-1 concurrency-regressie (14/14). Tot de flag AAN gaat is de overspend-race in productie bewust nog NIET gesloten.

## Context

De huidige credit-aftrek gebeurt **per video, live tijdens verwerking**, niet vooraf gereserveerd:

- **Whisper standalone:** `deduct_credits_atomic` trekt af op het moment dat de transcriptie klaar is (`credits_deducted`-vlag, best-effort try/except — zwakke idempotentie).
- **Playlist captions:** `update_playlist_video_progress` trekt per video 1 credit af op `success` (`v_already_done`-check, DB-transactioneel — sterke idempotentie).

Twee structurele problemen die vóór launch dicht moeten (financieel-kritiek):

1. **Race bij concurrent jobs — geen reservering.** Een gebruiker met 50 credits kan twee jobs van elk 40 credits tegelijk starten; beide zien 50 beschikbaar bij start en trekken pas achteraf af → de gebruiker kan méér verbruiken dan zijn saldo. Bij een 200-video **caption**-playlist geldt hetzelfde: ~197 credits die nergens vooraf gereserveerd worden. Captions zijn dus expliciet in scope — dezelfde race.
2. **Asymmetrische idempotentie.** Whisper-settlement leunt op een best-effort vlag; caption-settlement is DB-transactioneel. Bij een crash/retry kan whisper dubbel of niet afrekenen.

`user_credits.credits` is de gezaghebbende, gematerialiseerde balans (ADR-009, onderhouden door 4 RPC's onder `FOR UPDATE`). `credit_transactions` is een audit-log, geen balans-bron (zie CLAUDE.md, fase-1 sign-fix `ee4c9ca`). Elk reserverings-mechanisme moet op `user_credits.credits` opereren en het log consistent houden.

## Beslissing

**Reserve-and-hold** voor álle transcriptie-jobs.

1. **Model — reserveren als echte deductie.** Bij job-start wordt het volledige geschatte bedrag afgetrokken van `user_credits.credits` als een échte deductie (`kind='reservation'`). Gereserveerde credits zijn daarmee onbeschikbaar voor andere concurrent jobs — de race sluit omdat de balans direct daalt. **Geen** live per-video-aftrek meer tijdens verwerking. Bij afronding: `refund = gereserveerd − werkelijk verbruik`, teruggeboekt als `kind='refund'`.

2. **Reikwijdte — alle jobs.** Whisper én captions, standalone én playlist. Captions expliciet meegenomen (200-video caption-playlist = ~197 anders-ongereserveerde credits, zelfde race).

3. **Duur-0 / onbekende duur.** Niet vooraf reserveren; afrekenen op het verwerkingsmoment zodra de echte duur bekend is. Veilig gemaakt door de nieuwe DB-idempotentie (`UNIQUE(job_id, kind)`).

4. **Werkelijke duur > gereserveerd.** Het verschil best-effort bijboeken (`kind='settlement'`). Bij ontoereikend saldo: cappen + loggen, **de transcriptie niet laten falen**. Transparant tonen aan de gebruiker (Ihsaan + anti-bill-shock, industrie-best-practice): een leesbare transactie zoals *"YouTube-duur week af, +N credits verrekend"*.

5. **Idempotentie — whisper naar caption-niveau.** Whisper-settlement DB-transactioneel idempotent via een **partiële UNIQUE-index** op `credit_transactions(job_id, kind)` waar `kind ∈ {reservation, settlement, refund}`. Dit vervangt de zwakke `credits_deducted`-vlag door dezelfde harde garantie die captions al hebben via `v_already_done`.

6. **Watchdog — atomaire claim + playlist-refund.** De watchdog-claim wordt atomair (CAS): Pass 1 `WHERE watchdog_attempts=0`, Pass 2 `WHERE status='interrupted'`, verwerken alleen bij `rows_affected=1` — voorkomt dubbele recovery bij overlappende cron-runs. Pass 2 wordt uitgebreid zodat óók **playlist-reserveringen** worden vrijgegeven/gerefund bij crash. Nu sluit Pass 2 playlists expliciet uit — dit is het zwaarste risicopunt: een gecrashte playlist houdt zijn hele reservering vast zonder herstel.

7. **`kind`-enum + `job_id`/`playlist_id` op `credit_transactions`.** Enabler voor reserverings-zichtbaarheid, refund-UI én de admin granted-vs-purchased-analyse. Lost tegelijk de onleesbaarheid op (nu tonen debits als "-1 -1 -1" zonder herkenbare context).

8. **Refund-UI — aparte latere fase.** Datacontract per job/playlist: *gereserveerd → verbruikt → teruggestort*, met leesbare redenen in plaats van UUID's.

## Rationale

- **Reserveren = de enige race-vrije aanpak.** Zolang de balans pas achteraf daalt, kan geen enkele check bij job-start concurrent overspend voorkomen. Alleen een echte deductie-bij-start maakt gereserveerde credits onbeschikbaar. Dit is het standaardpatroon bij prepaid-metered systemen (cloud-credits, prepaid telefonie): *authorize/hold → capture → release*.
- **Captions meenemen is niet optioneel.** Het weglaten laat de grootste concrete race open (grote caption-playlists), terwijl caption-verwerking juist het goedkoopste-per-video maar hoogste-volume pad is.
- **Best-effort bij duur-afwijking beschermt de gebruiker, niet de kas.** Een transcriptie die al gedraaid heeft mag niet alsnog falen op een credit-tekort — dat zou verbruikte compute weggooien én bill-shock geven. Cappen + transparant loggen is het minst schadelijk.
- **`UNIQUE(job_id, kind)` is de juiste idempotentie-primitief.** Het maakt "reserveer één keer, reken één keer af, refund één keer" een DB-invariant in plaats van applicatie-logica — dezelfde klasse garantie als de bestaande caption-`v_already_done`, maar generiek.
- **Watchdog-CAS is nu al veilig te bouwen** (verandert geen bedrag, alleen claim-veiligheid); de playlist-refund-uitbreiding verandert wél gedrag en wacht daarom op review.

## Consequenties

**Gebouwd in deze sessie (additief, geen gedragswijziging):**
- **M1** (`transcription_jobs` + `playlist_extraction_jobs`): kolommen `credits_reserved` + `credits_refunded` (default 0, nullable) — dragers voor het latere reserverings-bedrag, nu ongebruikt.
- **M2** (`credit_transactions`): kolommen `kind` (`reservation|settlement|refund|purchase|grant|bonus`) + `job_id` + `playlist_id`; partiële `UNIQUE(job_id, kind) WHERE job_id IS NOT NULL`; bestaande rijen `kind`-backfilled uit `reason`/`metadata`.
- **Watchdog-CAS:** de bestaande claim is atomair gemaakt (conditional `UPDATE`, verwerken bij `rows_affected=1`).

**Gebouwd in de gedrags-fasen (code klaar + in prod-DB, INACTIEF want flag OFF):**
- **`reserve_credits`** (gedrags-fase 1, `20260706200207`): insert-first onder `FOR UPDATE`, idempotent via partiële UNIQUE, saldocheck, `credits_reserved` op de job/playlist-rij.
- **`settle_credits`** (M5, `20260706205619`): **balans-neutrale** settlement-registratie per succesvolle video (`kind='settlement'`, `ON CONFLICT (job_id,kind) DO NOTHING`) — som-bron voor de refund, muteert `user_credits` NIET.
- **`refund_credits`** (M6, `20260706205835`): één netto-post `reserved − Σsettlements` onder `FOR UPDATE`; positief=credit, negatief=best-effort debit gecapt op saldo (`LEAST`) + `RAISE WARNING`, nooit `EXCEPTION` (§4); insert-first idempotent; leesbare reason ("bijbetaald" bij negatief) + structured metadata (datacontract refund-UI).
- **Caption-draw-down** (M7, `20260706205918`): `update_playlist_video_progress` brancht op `credits_reserved > 0` → settlement i.p.v. aftrek; de `else`-tak is byte-identiek aan de oude aftrek (`20260706172045`).
- **Pipeline/worker**: `reservation_mode`/`playlist_id` doorgegeven; pre-transcribe-aftrek geskipt in reservation-mode; settle-on-success (incl. cache-hit op werkelijke gecachte duur); refund-hooks op whisper-completion, playlist-completion en beide retry-completion-transities; **watchdog Pass 2** job-refund + nieuwe **Pass 2b** playlist-refund (terminal-only `watchdog_attempts>=1`).
- **M4** (`20260706205451`): `(playlist_id,kind)` UNIQUE herbouwd met `WHERE ... AND kind <> 'settlement'` (settlements zijn meervoudig per playlist).
- **Reconciliatie-invariant aangescherpt**: nieuwe settlements (`job_id`/`playlist_id` NOT NULL) zijn balans-neutraal en worden UITGESLOTEN uit `balans == Σ(credit) − Σ(debit)`; legacy-settlements (fase-1-backfill, NULL-ref) blijven balans-affecterend tot de launch-reset (taak 1.26), waarna dit vereenvoudigt tot `WHERE kind <> 'settlement'`. Admin-metric "Credits Consumed" = `SUM WHERE kind='settlement'` (niet `SUM type='debit'`).

**Wacht op aparte fase:**
- **Flag-activering** (`CREDIT_RESERVATION_ENABLED` → true): 1-regel-follow-up ná prod-verificatie — dán pas reserveren nieuwe jobs en sluit de overspend-race live.
- **Refund-UI** (frontend): datacontract (settlement/refund-rijen + `credits_reserved/refunded`) staat klaar; weergave gereserveerd→verbruikt→teruggestort is nog niet gebouwd.

**Invariant die bewaard moet blijven:** `user_credits.credits` is de balans-bron; reservering, settlement en refund muteren die kolom onder rijlock. `credit_transactions` reconcilieert (`SUM(credit) − SUM(debit)`) naar die balans — de fase-1 sign-fix (`ee4c9ca`) herstelde die reconciliatie-invariant en die moet intact blijven.

# Beslissing 050: Credit-reservering (reserve-and-hold) voor alle transcriptie-jobs

**Status:** Geaccepteerd (ontwerp) — gefaseerde implementatie, gedrag nog niet in productie
**Datum:** 2026-07-06
**Gerelateerde code:** `backend/credit_manager.py`, `backend/worker.py` (watchdog), RPC's `deduct_credits_atomic` / `update_playlist_video_progress` / `add_credits`, tabellen `credit_transactions` / `transcription_jobs` / `playlist_extraction_jobs`

> **Implementatiestatus (2026-07-06):** Dit ADR legt het door Khidr goedgekeurde ontwerp vast uit de 2a-designsessie. Alléén de additieve, niet-gedrags-fundering is gebouwd (schema-migraties M1/M2, watchdog-CAS — zie ADR-consequenties + `priorities.md` 1.22). De reserve/settle/refund-gedrags-RPC's, het uit-het-hete-pad halen van de per-video-aftrek, en de watchdog-playlist-refund-uitbreiding zijn **nog niet geïmplementeerd of in productie getest** — die vereisen Khidr's live review + een testregime. Dit ADR is dus een ontwerp-registratie, geen bewijs van productie-gedrag.

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

**Wacht op volgende sessie (verandert live credit-gedrag — vereist Khidr's review + testregime):**
- Reserve/settle/refund-RPC's die op `user_credits.credits` opereren onder `FOR UPDATE`.
- Backend-refactor: per-video-aftrek uit het hete pad halen; job-start reserveert, afronding settelt/refund.
- Watchdog Pass 2 uitbreiden met playlist-reservering-refund.
- Refund-UI (aparte fase, datacontract gereserveerd→verbruikt→teruggestort).

**Invariant die bewaard moet blijven:** `user_credits.credits` is de balans-bron; reservering, settlement en refund muteren die kolom onder rijlock. `credit_transactions` reconcilieert (`SUM(credit) − SUM(debit)`) naar die balans — de fase-1 sign-fix (`ee4c9ca`) herstelde die reconciliatie-invariant en die moet intact blijven.

# Live-verificatie: credit/playlist-spoor end-to-end (2026-07-09)

**Status:** ✅ BEVESTIGD — geen afwijking. Credit/playlist-spoor **launch-ready**.
**Type:** eerste volledige **end-to-end live-verificatie** van het credit/playlist-spoor met een **nagerekende ledger** (i.p.v. alleen unit-test).
**Verifieerder:** read-only backend-verificatie tegen productie (Supabase `uivlvwcplcaixkzuiwsv`), geen mutatie.
**Gerelateerd:** [ADR-050](../decisions/050-credit-reservation-model.md) (reserve→settle→refund ledger), [ADR-051](../decisions/051-stuck-running-playlist-recovery.md) (stuck-playlist recovery + net-final receipt + transition-aware teller + classificatie).

## De testrun

| | |
|---|---|
| Playlist | "Tadabbur of Quran Juz 1-30 by Ustaz Nouman Ali Khan" |
| Collection_id | `99d73063-74fc-4056-a81e-b9528fa6d3a7` |
| User | T (`7a280a22`) |
| Samenstelling | 30 video's — **eerste 10 AI-transcriptie (whisper)**, resterende **20 auto-captions** |
| Verloop | 3 jobs over meerdere retry-rondes → uiteindelijk **alle 30 geslaagd** |
| UI-receipt eind | "76 credits · 8:41 · alle 30 geslaagd" |

**De 3 jobs in de collectie:**

| job_id | is_retry | video's | completed | failed | reserved | settled | refunded |
|---|---|---|---|---|---|---|---|
| `3658e3f4` (origineel) | false | 30 (10 whisper) | 26 | 4 | 76 | 72 (26 rows) | 4 |
| `37db1dde` (retry) | true | 4 | 3 | 1 | 4 | 3 | 1 |
| `78539236` (retry) | true | 1 | 1 | 0 | 1 | 1 | 0 |

## Wat is end-to-end getest (en de uitkomst)

### 1. Ledger-consistentie — ✅ BEVESTIGD
Uit `credit_transactions` (authoritatief), over alle 3 jobs:
- **Σreserved 81 = Σsettled 76 + Σrefunded 5** — exact. Per job: `76=72+4`, `4=3+1`, `1=1+0`.
- Netto verbruikt = Σsettled = **76**. Eindsaldo user T = **94**; begon ~170 → `170 − 94 = 76` = netto verbruikt. Sluit tot op de credit.
- Geen dubbele charge, geen dubbele/gemiste refund over de rondes (1 refund-rij per job, idempotent).

### 2. Receipt-netto klopt met de ledger — ✅ BEVESTIGD
Per-video settlements gesplitst: **10 whisper = 56 credits** (per minuut) + **20 captions = 20 credits** (1/stuk) = **76**.
Free-tier-detail: de eerste 3 video's (idx 0–2) zijn whisper → betalen vol (whisper negeert de gratis-3), dus géén gratis captions in deze playlist. Netto-charge 76 = receipt "76 credits · 30 transcribed · 0 skipped". Charged liep **72 → 75 → 76** over de rondes (72 origineel, +3 job2, +1 job3).

### 3. Policy-S over de retries — ✅ BEVESTIGD
Retry-jobs (`is_retry=true`) pasten de gratis-3 **niet** opnieuw toe:
- job2 reserveerde **4** voor 4 video's (= 4×1, géén gratis-3; anders was 't 1 geweest). `reserve 4 = settle 3 + refund 1`.
- job3 reserveerde **1** voor 1 video (niet 0). `reserve 1 = settle 1 + refund 0`.
De geretryde video's (alle idx≥3 captions) werden dus **belast**, niet gratis. reserve==settle+refund per retry-job.

### 4. Teller-consistentie (transition-aware fix) — ✅ BEVESTIGD
Per job `completed + failed = distinct video_results = total_videos`: job1 `26+4=30`, job2 `3+1=4`, job3 `1+0=1`. `vr_success`/`vr_error` matchen `completed`/`failed` exact. **Geen phantom-count** (contrast: de eerder gevonden `failed=7`-overcount). Live-bewijs van de transition-aware RPC-fix.

### 5. Classificatie + retrybaarheid — ✅ BEVESTIGD
De 4 fails in job1 (`0qAhT7MV0Fg`, `3xOK85qRQ_o`, `iLvV_1JT2Ik`, `v_zrDh9Ny8g`) zijn allemaal **`bot_detection`** → retrybaar geclassificeerd → kregen terecht een Retry-knop.
De door Sentry gemelde bot-detectie op **`3xOK85qRQ_o`** is correct afgehandeld: `bot_detection` in job1 **én** job2 (beide keren niet gesetteld, gerefund), pas in job3 success → **precies één keer gesetteld**. Correct: niet gesetteld terwijl gefaald, gerefund per ronde, retrybaar, één charge bij succes.
Geen stuck playlist (alle 3 jobs `status='complete'`), geen watchdog-reap nodig.
*NB:* de rauwe worker-logs van deze run (12:16–12:27 UTC) waren uit de Railway rolling-buffer gerold en niet meer opvraagbaar; de **DB `video_results`** (de gepersisteerde worker-output) is de authoritatieve bron en toont een schone run.

### 6. Elke video precies één keer definitief gesetteld — ✅ BEVESTIGD
**30 settlement-rijen, 30 distinct video_ids**, som 76 — geen enkele video dubbel gesetteld over de rondes. De 4 in job1 gefaalde video's settelden pas bij hun uiteindelijke succes (3 in job2, `3xOK85qRQ_o` in job3). De collection-scoped aggregatie telt per video de FINALE settlement.

## Wat hiermee LIVE-geverifieerd is (i.p.v. alleen unit-getest)

- **ADR-050** reserve→settle→refund ledger — balans-neutrale settlement, één netto end-of-run refund per job, idempotent — nu **over meerdere retry-rondes** met een tot-op-de-credit nagerekende ledger (`Σreserved = Σsettled + Σrefunded`, eindsaldo = netto verbruikt). Dit is de **eerste volledige e2e live-verificatie** van het spoor met een handmatig gereconcilieerde ledger.
- **Policy-S** (retry belast de gratis-3 niet opnieuw) — live-geverifieerd op de retry-jobs.
- **ADR-051**: net-final receipt (churn-vrij: 76/30/0), transition-aware failed-teller (geen phantom), bot_detection-classificatie + retrybaarheid via Retry-all, en geen stuck playlist (alle jobs terminaal).

**Conclusie:** het credit/playlist-spoor is niet alleen gebouwd maar ook end-to-end getest met een nagerekende ledger. Launch-ready.

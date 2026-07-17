# Nachtelijke jobs (crons)

Feitelijke beschrijving van wat er 's nachts draait. Twee onafhankelijke crons, beide om **02:00 UTC**, op twee verschillende systemen. Bedoeld om te lezen zonder de code te openen. Geverifieerd tegen de live database + broncode op 2026-07-17.

| Job | Systeem | Schedule | Wat |
|-----|---------|----------|-----|
| `snapshot_finance_day()` | pg_cron (Supabase Postgres) | `0 2 * * *` (cron.timezone = GMT → **02:00 UTC**) | Bevriest de MEASURED-cijfers van de zojuist voltooide dag in `finance_daily_snapshot` (de Trend-bron). |
| `fetch_service_metrics(ctx)` | ARQ (Railway worker-service) | `cron(hour={2}, minute={0})` → **02:00 UTC** (worker-container draait in UTC) | Haalt het DeepSeek-saldo (Operations) + Decodo's gefactureerde dagverkeer (`decodo_daily_usage`, reconciliatie-bron) op. |

Beide vuren dus tegelijk om 02:00 UTC, maar raken elkaar niet (aparte systemen, aparte tabellen).

---

## A1 — `snapshot_finance_day()` (pg_cron)

**Registratie (uit `cron.job`):** jobnaam `finance-daily-snapshot`, schedule `0 2 * * *`, command `SELECT public.snapshot_finance_day();` (zonder argument), `active = true`. `cron.timezone = GMT`, dus 02:00 **UTC**. Empirisch bevestigd via `cron.job_run_details`: gedraaid 02:00:00 UTC op 15/16/17 juli, telkens `succeeded`, `"1 row"`.

**Welk moment / welke tijdzone:** 02:00 UTC dagelijks.

**Welke dag schrijft hij weg:** de **zojuist voltooide dag**, bepaald in **Europe/Amsterdam**-tijd:
```
d := COALESCE(p_day, (now() AT TIME ZONE 'Europe/Amsterdam')::date - 1);   -- geen arg → gisteren (Amsterdam)
from_utc := d::timestamp       AT TIME ZONE 'Europe/Amsterdam';            -- daggrens DST-aware
to_utc   := (d + 1)::timestamp AT TIME ZONE 'Europe/Amsterdam';
```
Om 02:00 UTC (= 03:00 CET / 04:00 CEST) is de Amsterdamse datum al de nieuwe dag, dus `-1` = de volledige vorige Amsterdam-kalenderdag `[d 00:00, d+1 00:00)` Amsterdam. Het is **één dag**, geen glijdend venster. Met een expliciet `p_day`-argument kan elke dag herberekend worden (handmatige backfill).

**Welke velden komen in de rij, en waarvandaan** (één rij per scope `external`/`internal`, PK `(snapshot_date, scope)`):
- Kern uit `_geld_scope(v_internal, from_utc, to_utc)` voor die dag: `cash_in`, `vat`, `revenue_delivered`, `cor_ai_transcription/caption/ai_summary/rag/storage`, `cor_against_revenue` (voor `net`), `storage_bytes`, `opex_funnel_loggedin`, `opex_goodwill`, `credits_sold`, `credits_consumed`, `deferred_balance`, `proxy_fail_bytes`.
- `stripe_fee`: `Σ DISTINCT ON(stripe_session_id) metadata->>'stripe_fee'` uit `credit_transactions` (verkoop die dag).
- `opex_funnel_anon`: `Σ daily_cost_counters.caption_proxy_bytes WHERE day = d` × decodo-tarief (alleen external).
- `opex_proxy_overhead`: `(proxy_fail_bytes + Σ proxy_usage_log.bytes van die dag) / 1e9 × decodo-tarief` (external).
- Radar-fee (in `net`): billable screens (geslaagde `credit_transactions` + gescreende `payment_attempts`) × `radar_eur_per_screen`, alleen ná `radar_free_until`.
- `outstanding_free_credits`: **cumulatief** `< to_utc` (grants − verbruik, ondergrens 0) — een stand, niet een dag-flow.
- `net_profit_measured` = `revenue_delivered − cor_against_revenue − (goodwill + funnel_ll + funnel_anon + radar_fee + proxy_overhead)`. **Let op:** entered-OPEX zit hier NIET in — de snapshot is measured-only; de Finance-tab legt entered als live-overlay eroverheen (ADR-064).
- Schrijft daarnaast per nacht `daily_library_bytes` (day, user_id, `library_bytes` stand-nu) voor elke externe user (`ON CONFLICT DO UPDATE`) — de per-user opslag-serie voor storage-COR.

**Als hij een nacht niet draait (sinds 2026-07-17: zelf-herstellend):** de pg_cron roept nu `snapshot_finance_catchup(7)` aan i.p.v. `snapshot_finance_day()` direct. Die vult **elke ontbrekende dag** tussen de reeks-start en gisteren die < 2 scope-rijen heeft, meest-recente eerst, **max 7 per run** (N=7: één run blijft ruim binnen een seconde, en een uitval > 7 dagen is een groot incident dat handmatige aandacht verdient i.p.v. een stille weken-inhaal die de volgende nacht overlapt). Idempotent (`ON CONFLICT DO UPDATE`), dus inhalen is gratis. **Grens:** nooit vóór de bestaande reeks-start (`MIN(snapshot_date)` = 16 juli, bewuste schone start ADR-064) — alleen voorwaartse gaten. Handmatige backfill van een specifieke dag blijft `SELECT snapshot_finance_day('YYYY-MM-DD')`. De live Finance-statement had sowieso geen last van gaten (herberekent elke periode via `admin_finance_summary`).

**Als hij twee keer draait voor dezelfde dag:** **idempotent** — `INSERT ... ON CONFLICT (snapshot_date, scope) DO UPDATE SET <alle velden>=EXCLUDED..., created_at=now()`. Overschrijft met herberekende waarden, geen dubbele rij, geen dubbeltelling. Twee runs met dezelfde inputs geven dezelfde rij.

---

## A2 — `fetch_service_metrics(ctx)` (ARQ, Railway worker)

**Registratie (`backend/worker.py`, `WorkerSettings.cron_jobs`):**
```
cron(fetch_service_metrics, hour={2}, minute={0})
```
Draait om 02:00 in de tijdzone van het worker-proces = **UTC** op Railway (empirisch bevestigd: `service_metrics.last_attempt_at` = 02:00:00 UTC op 17 juli). Naast de 2-minuten-watchdog-cron in dezelfde `WorkerSettings`. Best-effort per dienst: een fout bij de ene dienst blokkeert de andere niet.

**DeepSeek-tak:** `GET https://api.deepseek.com/user/balance` (Bearer `DEEPSEEK_API_KEY`) → prepaid-saldo → `record_service_fetch('deepseek', ok, balance, currency)` → Operations "External services"-kaart. Faalt de call → alleen `last_attempt_at`/`last_error` (laatst-goede saldo blijft staan). Eén run/dag volstaat: het prepaid-saldo gaat ~een jaar mee.

**Decodo-tak — welk venster (watermark, sinds 2026-07-17):** géén vast N-daags venster meer, maar een **high-water-mark**. De worker hervat vanaf de laatste dag die we al hebben, minus 1 dag lookback (`backend/worker.py`):
```
watermark  = MAX(day) uit decodo_daily_usage   (leeg → business_start_date uit finance_settings)
start_day  = watermark − 1 dag                 (lookback, gecapt op 90 dagen span)
startDate  = start_day 00:00:00 ;  endDate = now   (Y-m-d H:i:s)
→ schrijf een rij voor ELKE dag in [start_day, vandaag] INCLUSIEF, upsert on_conflict="day",
  0 bytes als Decodo die dag niets teruggaf.
```
De watermark schuift impliciet mee met `MAX(day)` — geen aparte kolom. **Lookback = 1 dag**, met gemeten onderbouwing: de Decodo-registratie-delay is ~1 s en er is geen revisie binnen 3 u (sectie B), dus 1 dag is ruime slack en de day-keyed upsert maakt de overlap gratis. De 90-dagen-cap begrenst één run na een extreme uitval (Decodo's API geeft max 100 dag-items terug).

**Vandaag telt mee.** De gemeten delay (~1 s, geen revisie) rechtvaardigt het; de 1-daags-lookback herschrijft vandaag de volgende nacht, dus als er iets naloopt corrigeert het zichzelf.

**Gat kan niet ontstaan.** Ligt de worker meerdere nachten plat, dan is `MAX(day)` de laatste geschreven dag; de volgende run haalt vanaf `watermark − 1` alles op tot nu. Geen permanent gat (in tegenstelling tot de oude vaste-venster-versie, waar dag 4 na 4 nachten uitval voorgoed weg was).

**Overschrijven/revisie:** `upsert(on_conflict="day")` → **overschrijven**. Omdat de watermark maar 1 dag teruggaat, wordt een dag normaal op 2 nachten (de dag zelf + de volgende) herschreven; een Decodo-revisie binnen die tijd wordt opgepikt, daarna bevroren. Gezien de gemeten nul-revisie is dat ruim voldoende.

**Historische backfill (eenmalig, 2026-07-17):** Decodo bewaart data terug tot **2026-04-21** (geprobeerd met `startDate=2026-01-01` → 35 dagen mét verkeer, earliest 21 apr; `total_items=35` < API-limiet 100 → geen chunking nodig). Een eenmalige backfill schreef alle dagen 21 apr–nu (88 rijen, 4,75 GB totaal ≈ €14,20). Daarna houdt de watermark de voorrand bij.

---

## B — Gemeten Decodo-registratie-delay (2026-07-17)

**Vraag:** hoe lang duurt het voor Decodo's statistics-API proxyverkeer registreert, en wordt het cijfer daarna nog bijgesteld?

**Methode:** een echte AI-transcriptie-download uitgevoerd via de Decodo residential-proxy (dezelfde `extract_youtube_audio`-pad die de worker gebruikt; alleen de download-stap, want AssemblyAI raakt Decodo niet). Video: *Big Buck Bunny 60fps 4K*. Daarna Decodo's `statistics/traffic`-API herhaald opgevraagd voor de dag van de test (17 juli), en de dagtotaal-in-bytes vergeleken met wat wij meten. Alle tijden UTC.

**Meetreeks:**

| moment | tijd (UTC) | Decodo dagtotaal (17 jul) | Δ t.o.v. baseline | Decodo requests |
|--------|-----------|---------------------------|-------------------|-----------------|
| baseline (vóór test) | 10:32:06 | 453 198 | — | 1 |
| **download** | 10:32:06 → 10:42:43 (636,9 s) | — | onze meting: **30 760 668** bytes | — |
| +1 s na download | 10:42:44 | **32 670 942** | **+32 217 744** | 5 |
| +2 min | 10:44:31 | 32 670 942 | +32 217 744 | 5 |
| +32 min | 11:14:32 | 32 670 942 | +32 217 744 | 5 |
| +62 min | 11:44:33 | 32 670 942 | +32 217 744 | 5 |
| +122 min | 12:44:34 | 32 670 942 | +32 217 744 | 5 |
| +182 min | 13:44:34 | 32 670 942 | +32 217 744 | 5 |

**Bevindingen (feitelijk, gemeten — geen interpretatie-marge):**
1. **Registratie is nagenoeg real-time.** De download liep van 10:32:06 tot 10:42:43; **één seconde later** (10:42:44) toonde Decodo's API al de volledige toename (+32,2 MB). De bytes werden dus tijdens de download live meegeteld — geen batch-lag van minuten of uren voordat verkeer verschijnt.
2. **Geen herziening binnen 3 uur.** Het dagtotaal bleef **exact 32 670 942** op +1 s, +2 min, +32 min, +62 min, +122 min en +182 min. Δ = 0 over de hele reeks. Het cijfer wordt na registratie niet bijgesteld (binnen het gemeten venster van 3 u).
3. **Decodo telt ~4,7 % méér dan wij.** De API-toename (+32 217 744) is **1 457 076 bytes** groter dan onze gemeten download (30 760 668). Decodo rapporteert ook **5 requests** waar wij één video downloadden — het telt de wire-/TLS-overhead + de metadata/handshake-requests die yt-dlp niet in `raw_bytes` meeneemt. Dit is precies de kleine positieve reconciliatie-gap-richting (Decodo billed ≥ onze meting).

**Consequentie voor de crons (feitelijk, geen voorstel):** omdat Decodo real-time registreert én niet herziet, is de dag-data snel definitief. De `fetch_service_metrics`-cron sluit de huidige dag desondanks uit en wacht op de volgende nacht (zie A2) — dat is conservatiever dan de gemeten delay vereist.

*Testkosten: de 30 760 668 bytes zijn geboekt in `proxy_usage_log` (categorie `delay_test`) — echt proxyverbruik, dus de 17-juli-reconciliatie telt ze mee en matcht Decodo (op de ~1,46 MB wire-overhead na). Geen AssemblyAI-kosten (die stap is overgeslagen; hij raakt de proxy niet).*

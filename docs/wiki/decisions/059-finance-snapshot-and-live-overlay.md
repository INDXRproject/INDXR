# Beslissing 059: Nachtelijke finance-snapshot + live-overlay-model

**Status:** Geaccepteerd
**Datum:** 2026-07-15
**Gerelateerde code:** `supabase/migrations/20260714223105_geld_scope_range_aware.sql`, `20260714223420_finance_daily_snapshot_table_and_fn.sql`, `20260714223530_finance_daily_snapshot_pg_cron.sql`, `20260714225913_finance_snapshot_net_goodwill_fix.sql`, `apps/app/src/app/admin/finance/`

## Context

De Finance-tab toonde een all-time, niet-periode-gebonden P&L (`admin_geld_summary`, ADR-055/057). Voor bruikbare trends over week/maand/kwartaal is een **optelbare, bevroren** dagreeks nodig. Twee vragen:

1. Hoe maken we periode-cijfers zonder de all-time-RPC te breken?
2. Wat bevriezen we, en wat blijft live?

## Beslissing

**Range-refactor zonder vorm-wijziging.** `_geld_scope(p_internal)` → `_geld_scope(p_internal, p_from, p_to)` met defaults `(-infinity, +infinity)`. FLOWS gebonden op `[p_from, p_to)`, STOCKS/recognitie cumulatief-`<p_to`; `recognized_revenue` wordt periode-flow (`cum_to − cum_from`). Bij all-time valt elke waarde samen met de oude uitkomst → `admin_geld_summary` blijft **byte-identiek** (regressie bewezen: JSON-diff leeg). De KEY-SET blijft identiek (geen nieuwe keys) omdat `admin_geld_summary` het object raw embed.

**Onherstelbare nachtelijke snapshot.** `finance_daily_snapshot(snapshot_date, scope)` + `snapshot_finance_day(p_day)`, via **pg_cron** om 02:00 UTC. pg_cron gekozen boven een ARQ-cron omdat de snapshot pure SQL is (hergebruikt `_geld_scope`) en DB-native draaien worker-deploys/-restarts overleeft (de ARQ-worker sterft bij deploy). Dag = **Europe/Amsterdam-kalenderdag**, DST-correct via `AT TIME ZONE 'Europe/Amsterdam'` in de query (vaste 02:00 UTC-cron blijft dus DST-veilig). Idempotent via `ON CONFLICT (snapshot_date, scope)`.

**Live-overlay (Optie 1).** De snapshot bevriest **alleen wat niet reproduceerbaar is**: measured revenue/COR/measured-OPEX/stocks. **Entered-OPEX (infra/ads/eenmalig) wordt NOOIT bevroren** — altijd live uit de accrual berekend, in zowel de tab als de trend. `trend_net = frozen_measured − live_entered_accrual(bucket)`.

## Rationale

- Entered-kosten zijn volledig herleidbaar uit hun eigen regel (bedrag + datums + verdeelregel). Bevriezen levert niets op en veroorzaakt drift tussen tab en trend zodra een kost gecorrigeerd/gebackdate wordt. Optie 3 (auto-rebuild) bereikt hetzelfde met rebuild-machinerie die Optie 1 niet nodig heeft.
- Byte-identieke regressie was een harde eis: de all-time-P&L sluit wiskundig op productiedata (ADR-057) en mocht niet verschuiven.

## Consequenties

- **Expliciet geaccepteerd gedrag:** historische net profit in de trend kán verschuiven na een expense-edit of CSV-import — dat is bedoelde correctie, geen bug. Microcopy aangepast: "measured figures frozen nightly · entered costs update live".
- Geverifieerd: regressie byte-identiek; range-additiviteit (dag+dag = all-time); DST-daggrens zomer+winter (00:30 én 23:30 Amsterdam op juiste dag); idempotentie; sluit-test `snapshot == live admin_finance_summary` (beide scopes); live-overlay (backdated kost → tab-net == trend-net).
- **Bug gevonden+gefixt tijdens bouw:** `net_profit_measured` trok goodwill (granted-delivery) dubbel af — die zit al in de COR-termen. Net = `revenue_delivered − volle COR − funnels − stripe_fee`.
- Snapshot-stocks (balance/storage) zijn "captured-at-snapshot" (nachtelijk ≈ einde dag); backfill van oude dagen gebruikt de huidige stock — benoemd, niet retro-reconstrueerbaar.

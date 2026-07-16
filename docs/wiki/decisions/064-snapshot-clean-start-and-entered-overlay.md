# Beslissing 064: Snapshot clean-start + entered-OPEX als live-overlay

**Status:** Geaccepteerd
**Datum:** 2026-07-16
**Gerelateerde code:** `supabase/migrations/20260716095301_f5b_snapshot_net_adr063.sql`, `.../20260716121000_f3_snapshot_storage_from_scope_and_series.sql`, `finance_daily_snapshot`, `snapshot_finance_day`, `apps/app/src/app/admin/finance/FinanceView.tsx` (`Trend`)

## Context
De nachtelijke `finance_daily_snapshot` voedt de **Trend** (gemeten net over tijd). Twee losse kwesties kwamen samen in de F5b/F5-taak:

1. **F5b — het net-model van de snapshot liep achter op ADR-063.** De oude `snapshot_finance_day` boekte de **volle gemeten COR** (goodwill inbegrepen) en de **volle Stripe-fee bij de sale**, terwijl de live-tab (`admin_finance_summary`) sinds ADR-063 rekent met `cor_against_revenue` (usage-share + `recognized_fee`) en de fee per lot defert. De snapshot-net week daardoor af van de headline-net met de `deferred_fee` (op een sale-dag te laag, op latere verbruiksdagen te hoog; over de levensduur telt beide gelijk).

2. **F5 — de bestaande snapshot-rijen droegen een oud model.** De 6 rijen (12/14/15 jul × 2 scopes) waren pre-ADR-063 én bevatten **uitsluitend internal testverkeer** (de externe economie is leeg). Een Trend die maanden testruis toont met dashboard-precisie suggereert betekenis die er niet is.

Daarbij speelde de vraag: hoort **entered-OPEX** (handmatig ingevoerde uitgaven, `opex_expenses`) in de bevroren snapshot, of blijft het een live-overlay?

## Beslissing

**1. Snapshot-net gelijkgetrokken met ADR-063 (F5b).**
`net_profit_measured = revenue_delivered − cor_against_revenue (usage-share + recognized_fee + storage) − (goodwill + funnels + radar)` — identiek aan `admin_finance_summary` mínus de entered-overlay.

**2. Entered-OPEX blijft een live-overlay — NIET bevriezen in de snapshot.**
De snapshot slaat `net_profit_measured` op = gemeten net **vóór** entered. De Trend trekt entered **live** af via `accrualForRange`. Reden: entered-regels zijn **bewerkbaar** en moeten **retroactief** doorwerken — bevriezen zou de historie fout maken zodra Khidr een uitgave aanpast. De kolomnaam `net_profit_measured` is bewust gekozen zodat niemand de rauwe kolom voor de volle net aanziet; de Trend-lijn heet "Net profit" en trékt entered ook echt af.
Borging: `headline-net (measured − entered_live)` == `Trend-net (net_profit_measured − entered_overlay)` — het label liegt niet, ook zodra F14 (Vercel/Railway/domein) entered-regels toevoegt.

**3. Clean-start i.p.v. backfill (F5).**
De 6 bestaande rijen zijn `DELETE`'d (waarden gerapporteerd vóór de DELETE); **geen backfill**. De cron (`0 2 * * *` UTC) schrijft vanaf de eerstvolgende run ADR-063-conforme rijen. De Trend leest `MIN(snapshot_date)` **per scope** uit de tabel (nooit gehardcode) en toont de echte startdatum; tot de eerste cron-run is de Trend leeg — verwacht, geen regressie.

## Rationale
- **Backfillen kan altijd** (`snapshot_finance_day(d)` is range-aware voor elk verleden venster) — we doen het nu niet omdat de data testruis is, niet omdat het niet kan.
- **De aanloop-P&L (verliesmaanden) komt niet uit de Trend** maar uit de **live** `_geld_scope` (range-aware; "Last month" rekent live). Alleen de grafiek-over-tijd heeft snapshots nodig.
- **100 dagen testruis bewaren** om een grafiek te vullen is de verkeerde ruil tegen een schone, betekenisvolle serie vanaf de echte start.

## Consequenties
- De Trend is leeg tot de eerste cron-run na deze wijziging; daarna groeit hij gatenloos op het nieuwe model.
- `net_profit_measured` ≠ volle net (entered is een live-overlay) — vastgelegd hier en in de provenance zodat de rauwe kolom niet als volle net wordt gelezen.
- F5 vervalt van de roadmap (opgelost door verwijderen). F5b idem.
- Bij een edit van een entered-uitgave schuift de historische Trend-net mee — **bedoeld gedrag**, gedocumenteerd in de Trend-voetnoot.

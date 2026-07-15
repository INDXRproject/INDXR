# Beslissing 063: Per-user COR-attributie + Stripe-fee als (gedefereerd) COR

**Status:** Geaccepteerd
**Datum:** 2026-07-15
**Gerelateerde code:** `supabase/migrations/20260715163000_recognize_asof_peruser_fee_deferredcredits.sql`, `supabase/migrations/20260715163500_geld_scope_peruser_cor_and_fee.sql`, `supabase/migrations/20260715164000_admin_finance_summary_fee_to_cor.sql`, `apps/app/src/app/admin/finance/FinanceView.tsx`, `apps/app/src/app/admin/finance/financeTypes.ts`

## Context

Na ADR-061 (per-user chronologische recognitie) bleven twee financiële fouten staan in dezelfde functieketen (`_recognize_asof` → `_geld_scope` → `admin_finance_summary`):

**F1 — COR-against-revenue was gepoold, niet per-user.** `_geld_scope` berekende:
```sql
v_purchased_share := v_cons_purch_to / v_consumed_to;   -- ÉÉN scope-brede, all-time share
v_cor_rev         := v_cor_total * v_purchased_share;    -- op de scope-TOTALE COR
v_granted_deliv   := v_cor_total * (1 - v_purchased_share);
```
Dit is exact de pooling-klasse die ADR-061 voor de recognitie sloot, maar nu in de COR-splitsing. Bewezen tegen echte internal-data (juli 2026): `purchased_share = 131/8046 = 1,63%` terwijl de user die álle COR én álle aankopen droeg zijn eigen share `131/3758 = 3,49%` had. De gepoolde noemer (8046, incl. een granted-zware user met €0 COR) verdunde de share 2,14×. Uitkomst: `cor_against_revenue = €0,17` waar per-user €0,36 correct is. **Geen weergavefix — een echte rekenfout** die COR tussen omzet (COGS) en goodwill (OPEX) verschuift.

**Neveninzicht (zelfde regel):** de share was `all-time as-of to`, terwijl `v_cor_total` **periode**-scoped is → een maandweergave vermenigvuldigde juli-COR met een sinds-altijd-share. Voor "All time" vielen ze samen; voor een maand niet.

**F1b (zelfde foutklasse):** `deferred.credits = round(deferred_balance / per_credit_net)` met `per_credit_net = purchased_net / purchased_cr` (blended over álle lots). Bij verschillende tiers in één scope is dat gemiddelde geen echte prijs → een verzonnen credit-count.

**F22 — Stripe-fee stond in OPEX, niet in COR.** De transactiekost (9–11% bij kleine tickets) werd als measured OPEX geboekt → gross margin negeerde de fee (fictie). SaaS-praktijk: de fee is COR ("gaat de kost naar 0 als de omzet naar 0 gaat?" → ja). Maar de fee valt cash bij de aankoop terwijl de omzet pas bij verbruik erkend wordt → de fee moet **mee-deferren per lot**, anders ontstaat een timing-mismatch.

## Beslissing

**F1 — per-user COR-against-revenue, periode-consistent.** `_recognize_asof` geeft een `by_user`-map terug (`{uid: {purchased_consumed, consumed_cr, recognized, recognized_fee}}`, alleen economisch actieve users). `_geld_scope` berekent per methode de **per-user periode-COR** (`GROUP BY user_id` over `transcription_jobs`/`usage_logs`/`transcripts` op `[p_from,p_to)`) en de **per-user periode-share** (`(rec_to.by_user[u].purchased_consumed − rec_from…) / (rec_to.by_user[u].consumed_cr − rec_from…)`). Dan:
```
cor_against_revenue = Σ_user Σ_methode (user_period_cor × user_period_share)
granted_delivery    = Σ_user Σ_methode (user_period_cor × (1 − user_period_share))
```

**F1b — echte lot-restanten.** `_recognize_asof` geeft `deferred_credits = Σ lot_rem` direct uit de FIFO-lus terug (naast `deferred = Σ lot_rem × lot_pc`). Geen terugrekening meer uit een blended gemiddelde.

**F22 — Stripe-fee wordt gedefereerd COR.** Per aankoop-lot een tweede prijs `fee_pc = stripe_fee / amount`; bij FIFO-consumptie `recognized_fee += verbruikt × fee_pc`, het lot-restant → `deferred_fee`. `recognized_fee` telt in `cor_against_revenue` (revenue-matched: **géén share, géén goodwill** — granted credits dragen geen fee). `deferred_fee` staat in de Deferred-kaart. `stripe_fee` is uit `measured_opex` verwijderd. De **bankkaart** houdt de volle cash-fee bij verkoop (`bank.stripe_fee`) — dat is de kasstroom, bewust een ander getal dan de P&L-fee.

**COR-tabel = optie (ii), volle kost.** De tabel toont per methode `Cost = cor[k]` (volle gemeten COR), `Credits = alle verbruikte credits`, `€/credit = Cost/Credits` → de rij vermenigvuldigt. De against-revenue/goodwill-splitsing staat als **aparte regel eronder**, niet in de kolommen. De fee heeft een eigen regel (recognised/deferred).

## Rationale

- COR-against-revenue is een per-portemonnee-eigenschap (net als recognitie in ADR-061): de dure granted-levering van user A mag niet als betaalde COGS van user B geboekt worden. Poolen smeert dat uit zodra dure-granted en goedkope-purchased users samen in één scope zitten.
- Periode-share bij periode-COR: anders vermenigvuldig je deze-maand-kosten met een sinds-altijd-verhouding.
- Fee als COR met defer: de fee hoort economisch bij de omzet die hij mogelijk maakte; hem revenue-matchen houdt de gross margin eerlijk én voorkomt dat een aankoop aan het periode-einde zijn volle fee als kost neemt terwijl de omzet nog deferred is.
- Volle-kost-tabel: de vorige tabel mengde drie populaties in één rij (against-Cost × alle-credits × volle-€/credit → vermenigvuldigde niet). Volle kost + losse split-regel is zelf-consistent.

## Consequenties

- **Geverifieerd (reversibel, ≥2 profielen, echte + synthetische data):**
  - **F1 (A/B, tegengestelde profielen):** A 100 granted / €9,66 COR / share 0, B 100 purchased / €0,0032 COR / share 1 → against-revenue €0,0032, goodwill €9,66. Oude gepoolde formule (periode-COR × all-time-share) gaf €0,27 tegen €0,0032 correct — 85× overschatting.
  - **Neveninzicht (periode-share):** user koopt+verbruikt in jan, verbruikt granted in feb; target-venster feb → against €0,00 / goodwill €5,00 (feb periode-share 0), terwijl de all-time-share 0,5 ten onrechte €2,50 tegen omzet zou boeken.
  - **F1b + F22 (twee tiers, Try €5/100cr + Plus €25/1000cr, 400 verbruikt):** `recognized_fee €0,76 + deferred_fee €0,49 = purchased_fee €1,25`; `deferred_credits = 700` (echte Σ lot_rem) vs blended terugrekening 641,7 — 8,3%-fout bij twee tiers, nu weg.
  - **Regressie all-time internal:** `cor.against_revenue €0,7803` (ai €0,3608 + fee €0,4192), goodwill €20,9219, `measured_opex.total` zonder fee, `deferred.credits 69` + `deferred_fee €0,22`, `against_revenue_by_method` telt exact op tot `cor.against_revenue`.
- **NULL-COALESCE-valkuil (opgelost, LESSONS 2026-07-15):** de per-user COR-subqueries moesten elke `sum()` in `COALESCE(...,0)` wrappen. Zonder dat werd `sum(dur)*rate + sum(bytes)*rate` NULL zodra een user uitsluitend `proxy_bytes=NULL`-jobs had (80 productie-jobs), wat diens €10,92 duur-kost stil liet vallen — een gat dat de scope-aggregaat (`COALESCE(sum(),0) INTO var`) verborg maar per-user-groepering blootlegde.
- **Advisors schoon:** `_recognize_asof`/`_geld_scope`/`admin_finance_summary` blijven `REVOKE anon+authenticated` (SECURITY DEFINER), niet zichtbaar in de anon/authenticated-executable lint.
- **Open follow-up:** `snapshot_finance_day` (nachtelijke Trend-bron) rekent zijn `net_profit_measured` nog met het oude model (volle COR + volle fee-bij-sale). Leest alle bestaande `_geld_scope`-keys → geen crash, maar de Trend-net wijkt af van de headline-net met o.a. `deferred_fee`. Gelijktrekken is een apart F-item.
- **Backward compatible:** alle bestaande return-keys blijven; nieuwe keys (`recognized_fee`, `deferred_fee`, `deferred_credits`, `purchased_fee`, `by_user`, `against_revenue_by_method.payment_fee`, `cor.payment_fee`) erbij.

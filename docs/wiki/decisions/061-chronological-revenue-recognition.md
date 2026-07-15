# Beslissing 061: Chronologische omzet-recognitie (FIFO purchase-lots, granted-first) i.p.v. cumulatieve pooling

**Status:** Geaccepteerd
**Datum:** 2026-07-15
**Gerelateerde code:** `supabase/migrations/20260715101920_chronological_recognition.sql`, `supabase/migrations/20260715102400_admin_finance_summary_cor_reconcile.sql`, `supabase/migrations/20260715140000_recognize_asof_per_user.sql`, `apps/app/src/app/admin/finance/FinanceView.tsx`

## Context

De erkende omzet (recognized revenue) werd berekend met **cumulatieve** granted-first pooling (ADR-055/057, migratie `20260714223105`):

```sql
v_cons_purch_to := LEAST(v_purchased_to, GREATEST(0, v_consumed_to - v_granted_to));  -- cumulatieve totalen
v_recognized_to := v_cons_purch_to * v_per_credit_to;
```

Dit gebruikt **cumulatieve totalen op moment `to`**: totaal gekocht, totaal granted, totaal verbruikt. Het probleem is een **retroactieve clawback**: als een klant koopt (100 @ €5), 50 verbruikt (→ €2,50 erkend), en Khidr geeft **daarna** 100 goodwill-credits, dan schuift `consumed − granted = 50 − 100 = −50 → 0` de reeds-erkende omzet met terugwerkende kracht naar **€0** — zonder refund, zonder dat er iets aan het verleden veranderde. Khidr geeft structureel credits aan betalende klanten (goodwill/bug/billing-correctie), dus dit raakt de echte economie, niet alleen testdata.

**Bewezen (reversibel, tegen de echte `_geld_scope(false)`):** koop 100 @ €5 → verbruik 50 → recognized **€2,50** / deferred €2,50. Grant daarna 100 → recognized **€0,00** / deferred €5,00. De grant at de erkende omzet op.

## Beslissing

Vervang cumulatieve pooling door **chronologische pooling**: simuleer de event-stream op volgorde (`created_at ASC`, bij gelijke tijd credits vóór debits), granted-first, met **FIFO purchase-lots**. Elk verbruiksmoment trekt uit wat op **dát moment** beschikbaar was: eerst het granted-saldo, dan de oudste openstaande aankoop-lot. Elke lot draagt zijn eigen `€/credit` (`(amount_paid − amount_tax) / credits`). Erkende omzet = som van `getrokken × lot_€/credit` over alle verbruik.

Geïmplementeerd als helper `_recognize_asof(p_users uuid[], p_to timestamptz)` (SECURITY DEFINER, `REVOKE anon+authenticated`), die de stream `< p_to` afspeelt en `{recognized, purchased_consumed, deferred, purchased_cr, purchased_net, granted_cr, consumed_cr}` teruggeeft. `_geld_scope` roept 'm aan voor `p_to` en `p_from`; periode-recognized = `rec_to − rec_from`, deferred/consumed_purchased = stock as-of `to`. **Invariant:** `recognized + deferred = purchased_net`.

**Recognitie is PER-USER, niet per-scope** (migratie `20260715140000`, financieel kritiek). `_recognize_asof` loopt met een **buiten-loop over elke user afzonderlijk**: elke user heeft zijn eigen `granted_bal` en zijn eigen FIFO purchase-lots; pas ná die per-user-simulatie wordt over de scope gesommeerd. Reden: **granted-first is een eigenschap van een individuele creditportemonnee, niet van de scope.** De gratis credits van user A mogen nooit het verbruik van user B compenseren. De eerste implementatie voegde alle users' events samen in één stream met één gedeeld `granted_bal` → user A's ongebruikte grant trok af van user B's erkende omzet (cross-user pooling). Dit vergiftigde óók `purchased_share` (= `purchased_consumed / consumed`) en dus de COR-splitsing (`against_revenue` vs `granted_delivery_cost`). Bewezen A/B: A grant 25 (verbruikt niets), B koopt 400 @ €15 en verbruikt 400 → **vóór:** recognized €14,06 / share 0,9375 (fout); **ná:** recognized €15,00 / share 1,0 (B's volle waarde, A raakt niets).

**Een grant van vandaag raakt het verleden niet** — ook cross-user. Een grant met `created_at` ná een historisch `p_to` valt buiten `_recognize_asof(..., p_to)` (strikt `< p_to`), en de per-user-scheiding zorgt dat een latere registratie/grant van een *andere* user een bevroren dag niet verschuift. Bewezen: B koopt+verbruikt 10 jul, A grant 14 jul → recognized as-of 11 jul blijft €15,00 (zowel as-of 11 als 15 jul).

## Rationale

- Omzet-recognitie hoort te reflecteren wat op het verbruiksmoment waar was. Cumulatieve clamping herrekent achteraf uit totalen en kan daardoor het verleden veranderen — boekhoudkundig onjuist (je kunt geen al-erkende omzet terugdraaien zonder een creditnota/refund-event).
- FIFO purchase-lots geven per aankoop de juiste `€/credit` (prijswijzigingen/pakket-mix worden niet uitgesmeerd tot één blended tarief in het verleden).
- Granted-first blijft: gratis credits worden eerst verbruikt (conservatief — erkent zo laat mogelijk), maar nu per-moment i.p.v. cumulatief.

## Consequenties

- **Geverifieerd (reversibel, vóór én ná):** dezelfde koop→verbruik→grant-test toont ná de fix recognized **€2,50 → €2,50** (blijft), deferred **€2,50 → €2,50** (blijft), grant €100 raakt niets. Snapshot-onaantastbaarheid: `_recognize_asof(user, '2026-07-11')` blijft €2,50/€2,50 ook al landt er een grant op 14 jul.
- **`admin_geld_summary` verandert bewust van vorm-inhoud** (niet langer byte-identiek aan ADR-057/059): dit is een correctheids-fix. Enige caller is `apps/app/src/app/admin/page.tsx` (Overview-blok). All-time intern blijft toevallig recognized €0,00 (testusers kregen 10 002 granted vóór 200 gekocht → alle verbruik trekt granted-first uit granted; nu chronologisch juist i.p.v. per cumulatieve clamp toevallig juist).
- **COR-splitsing volgt de chronologische purchased-share.** `purchased_share = purchased_consumed / consumed` (as-of to) stuurt `cor_against_revenue` (COGS) vs `granted_delivery_cost` (goodwill/OPEX). Zie ADR voor de COR-tabel-reconciliatie (Punt 2): `admin_finance_summary` exposeert nu per-method `against_revenue_by_method` (`gross × share`) zodat de COR-breakdown optelt tot de COR-regel, met de granted-levering zichtbaar als goodwill-regel in OPEX.
- **Performance:** `_recognize_asof` loopt lineair over de credit-events per scope (index `credit_transactions(user_id, type)` dekt de filter). Voor de huidige volumes verwaarloosbaar; bij groei is een materialisatie per gebruiker mogelijk.
- **Randgeval:** verbruik boven het beschikbare saldo (mag niet bij correcte balans) wordt genegeerd in de recognitie — het kan geen niet-bestaande aankoop erkennen.

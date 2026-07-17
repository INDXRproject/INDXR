# Finance-audit — klopt het antwoord?

**Doel:** naast [`finance-number-provenance.md`](finance-number-provenance.md) (dat beschrijft *wat de code doet*) zegt dit document per getal in `/admin/finance` of **het antwoord klopt** — met de rekensom die dat aantoont. Verdict-kolom: **JA** / **NEE** / **WEET NIET**. Een geruststelling zonder rekensom telt niet.

**Methode:** functiedefinities letterlijk uit `pg_get_functiondef` (`admin_finance_summary`, `_geld_scope`, `_recognize_asof`, `opex_accrual`, `_sale_vat`) + `FinanceView.tsx`/`periods.ts`; live data uit de RPC en de brontabellen.

**Peildatum:** 2026-07-15 20:55 UTC. **Scope:** internal (test) — daar zit alle activiteit; de externe/"echte economie" is momenteel leeg (0 sales, zie §0). **Twee vensters:** juli-2026 = lopende maand (`2026-07-01 00:00` → `now()`, 14 dagen) en all-time (`2020-01-01` → `now()`).

> **STATUS-UPDATE 2026-07-15 (na fix-taak).** Alle 4 NEE's + 1 doc-fout weggewerkt (migratie `20260715213746_finance_audit_fixes_deferred_radar` + `FinanceView.tsx`/`periods.ts`). De "vat_owed 1,22 vs 1,21"-bevinding is **ingetrokken**: elke factuur toont €0,61, de afdracht is de **som van de facturen** (€1,22), geen herberekening over het totaal — §7.1 gecorrigeerd. De rekensommen hieronder zijn de originele diagnose; per sectie staat "→ GEFIXT" met het nieuwe gedrag.

## Tally (na fixes)

| Verdict | Aantal | Items |
|---|---|---|
| **JA** | 31 | net_profit · revenue (hero) · hero-delta (incl. afgeronde periodes, GEFIXT) · deferred_balance · deferred credits · **est_cost_to_deliver** (GEFIXT) · **est_future_gross** (GEFIXT) · COR ai_transcription/caption/ai_summary/**rag** (GEFIXT: expliciete aanname)/storage · cor_against_revenue · goodwill · gross_profit · gross_margin · OPEX goodwill/funnel_anon/**radar screen-count** (GEFIXT)/entered · charged · stripe_fee · net_settlement · yours_to_keep · vat_owed · vat per bucket · revenue per regio · cache (ai) · **OPEX funnel_loggedin** (her-afgeleid 2026-07-16) · **cache savings (caption)** (her-afgeleid 2026-07-16) |
| **NEE** | 0 | — (alle 4 weggewerkt) |
| **WEET NIET** | 0 | — (de 2 laatste her-afgeleid 2026-07-16, zie §6/§10) |

*Oorspronkelijke tally (diagnose 16cd6fc): 25 JA / 4 NEE / 2 weet-niet.* De twee "verdachte" getallen uit de opdracht staan als eerste (§1 hero-delta, §2 est_*). De rest volgt de UI-volgorde. Punt 8 (caption-COR = playlist-captions) → §12.

---

## §0 — Randvoorwaarde: de externe scope is leeg

Alle live sales (2× Try €3,49, beide NL) staan op een **internal** account (`…62e4`, `profiles.is_internal=true`). De externe RPC-scope geeft `revenue_delivered=0`, `credits_sold=0`, `bank.charged=0`, `net_profit=−0,03` (alleen `funnel_anon`). **Gevolg voor deze audit:** elke "echte" waarde leeft in de internal scope; het dashboard in default (external) modus toont voor de meeste kaarten nul. Dit is geen bug — het is de staat van de data — maar het bepaalt waarom hieronder alles internal-scope is.

---

## §1 — Hero-delta (VERDACHT #1)

**NAAM** het `+X%`/`−X%` naast "Revenue" en naast "Net profit".
**FORMULE** `FinanceView.tsx:39` `delta(cur,prev)= (cur−prev)/|prev|`, `null` als `prev=0`. Vergelijkingsvenster uit `periods.ts:78-105` `makePeriod`:
```
const running = now >= from && now < fullTo
const to = running ? now : fullTo
const elapsed = to.getTime() - from.getTime()
compareFrom: prev.from,
compareTo: new Date(prev.from.getTime() + elapsed),  // same elapsed days
```
`page.tsx:24-25` doet twee RPC-calls: `[from,to]` en `[compareFrom,compareTo]`.
**BRON** `revenue_delivered`/`net_profit` uit `_geld_scope` op exacte timestamps (flow, niet dag-getrunceerd).
**LIVE WAARDE** (15 juli, month-to-date):

| | current venster | compare venster | elapsed |
|---|---|---|---|
| bereik | 2026-07-01 00:00 → 07-15 20:55 | 2026-06-01 00:00 → **06-15 20:55** | beide **14 d 20:55:40** |
| `period.days` | 14 | 14 | gelijk |
| `revenue_delivered` | 3,77 | 0,00 | |
| `net_profit` | −7,02 | 0,00 | |

**KLOPT? JA** — het label "vs same elapsed days last period" is correct. Bewijs: `compareTo = 06-01 + (now − 07-01) = 06-15 20:55`, exact hetzelfde elapsed als het huidige venster (14 d 20:55:40); beide `days=14`. Er wordt dus **niet** 15 dagen tegen 31 gezet. → **F11 is STALE voor het month-to-date-geval**: `periods.ts` doet al wat F11 vraagt. Van "label vs F11" klopt het **label**.

**Twee kanttekeningen (geen weerlegging van het bovenstaande):**
1. *Nu rendert er niets.* `prev=0` (juni had 0 recognized/net) → `delta()` geeft `null`. Op 15 juli staat er dus géén percentage naast de hero. Correct gedrag, maar het getal is momenteel afwezig, niet fout.
2. *Afgeronde periodes waren wél scheef.* Voor een **niet-lopende** periode was `elapsed = volle maandlengte`; `prev.from + elapsed` schoot dan over de kortere/langere vorige maand heen. → **GEFIXT** (`periods.ts`): een afgeronde periode vergelijkt nu met de **hele** vorige periode (`compareTo = prev.fullTo`), ongeacht lengte; lopend (to-date) blijft `prev.from + elapsed`. Bewezen: afgeronde maart → OUD `compareTo=04 mrt` (3 maartdagen als februari) → NIEUW `01 mrt` (hele feb vs hele mrt); afgerond Q1-2026 → OUD `30 dec` (2 Q4-dagen weg) → NIEUW `01 jan` (heel Q4 92 d vs heel Q1 90 d); lopende maand ongewijzigd (`15 jun`).

---

## §2 — Deferred: est. cost to deliver / est. future gross (VERDACHT #2)

**NAAM** "Est. cost to deliver `[est]`" en "Est. future gross" (DeferredCard, `FinanceView.tsx:406-408`), met bijschrift "Based on the last `{window_days}` days' usage mix."
**FORMULE** `admin_finance_summary` (letterlijk):
```
v_recent      := _geld_scope(v_internal, p_to - make_interval(days => v_defer_win), p_to);
v_recent_cor  := (v_recent#>>'{cor,total}')::numeric;     -- FULL cache-miss COR (ai+cap+sum+rag), NIET storage
v_recent_cons := (v_recent->>'consumed_cr')::numeric;     -- álle verbruikte credits (purchased + granted)
v_avg_cpc     := CASE WHEN v_recent_cons > 0 THEN v_recent_cor / v_recent_cons ELSE 0 END;
v_est_future_cost := v_defer_credits * v_avg_cpc;
-- est_future_gross := deferred_balance − est_future_cost
```
**BRON** venster = laatste `v_defer_win` (=`finance_settings.deferred_window_days`=90) dagen vóór `p_to`. `cor.total` uit `transcription_jobs`/`usage_logs`/`transcripts` (cache-miss). `deferred_credits` = onverbruikte **gekochte** credits (FIFO-rest in `_recognize_asof`).
**LIVE WAARDE** (internal, `p_to=now`): venster Apr-16→Jul-15: `cor.total=15,96`, `consumed_cr=6321` → `avg_cpc = 15,96/6321 = 0,0025249 €/cr`. `deferred_credits=69`. `est_future_cost = 69 × 0,0025249 = 0,1742 → 0,17`. `est_future_gross = 1,99 − 0,17 = 1,82`. All-time identiek (deferred is as-of).

**KLOPT? NEE** — arithmetisch consistent (0,17 en 1,82 kloppen), maar de **basis geeft het verkeerde antwoord in twee gevallen:**

1. **Bij 0 verbruik → gratis levering.** `v_recent_cons=0` ⇒ `v_avg_cpc=0` ⇒ `est_future_cost=0` ⇒ **`est_future_gross = volledige deferred_balance`**. Dus zodra er de laatste 90 dagen niets verbruikt is (nieuwe/stille maand), claimt de kaart dat het toekomstige leveren €0 kost en de volledige €1,99 pure winst is. Dat is de "0-verbruik"-vraag uit de opdracht: het antwoord is fout (te optimistisch), niet leeg.

2. **"Usage mix" is een gemengd tarief, niet de mix van de deferred credits.** De rekensom is één **blended €/credit** over álle methodes samen (`ΣCOR / Σcredits`), niet de methode-samenstelling van de 69 openstaande credits. Het venster is nu 85% AI-transcriptie (5360/6321 cr; `cor.total` is voor ~99,9% AI: 15,95/15,96). Blended = 0,00252/cr, terwijl AI-transcriptie in werkelijkheid ~0,00335/cr kost (10,3512/3091) en captions ~0. Gaan de 69 credits naar AI → **onderschatting**; gaan ze naar captions → **overschatting**. De teller telt bovendien alleen **cache-miss**-kosten en **granted-credit-verbruik** mee (goodwill), terwijl de deferred credits **gekochte** credits zijn — een tarief uit een andere populatie.

Het getoonde 0,17 was daarom een plausibele-maar-toevallige waarde.

**→ GEFIXT** (migratie `20260715213746` + DeferredCard):
- **(1) 0-verbruik:** `v_recent_cons=0` ⇒ `est_future_cost=NULL`, `est_future_gross=NULL`, nieuwe vlag `est_data_sufficient=false`. De UI toont dan **"insufficient data"** i.p.v. €0 — precies bij een stille maand na launch.
- **(2) mix:** beslist en gemotiveerd — de blended €/credit **is** de methode-mix-gewogen per-methode-eenheidskost: `Σcor_m/Σcredits = Σ(mix_m × unit_m)`, algebraïsch identiek, dus er is géén ander "eerlijk" tarief te berekenen zonder de toekomstige mix te kennen (die we niet hebben). De openstaande credits hebben zelf geen methode. De hint zegt nu expliciet: *"assumes the same method mix + cache rate as the last N days"*. Populatie granted-vs-purchased verandert de **per-methode-eenheidskost niet** (een minuut AI kost hetzelfde ongeacht bron), alleen de mix — en de recente consumptie is ons enige mix-signaal.
- **(1 & extra) fee ontbrak** — zie §9. `est_future_gross` trekt nu ook de deferred Stripe fee af.
- **Nieuwe live waarde:** `est_future_cost ≈ 0,17–0,18` (wiebelt met het schuivende venster: consumed_cr 6321→6266 in 44 min toen goedkope credits van de vensterrand vielen → tarief omhoog → 0,18; illustreert waarom het een *estimate* blijft). `est_future_gross = 1,99 − 0,1757 − 0,2208 = 1,59`.

**KLOPT? nu JA** (schatting, expliciet gelabeld; 0-data afgevangen; fee meegenomen).

---

## §3 — Hero "Revenue" & Net profit

### 3.1 Revenue (hero, groot getal) — **JA**
**FORMULE** `FinanceView.tsx:555` `eur(scope.revenue_delivered)` (sinds F4 flow-only). `revenue_delivered` = `_recognize_asof(to).recognized − _recognize_asof(from).recognized`, FIFO purchase-lots × `lot_pc` waarbij `lot_pc = (amount_paid − vat)/credits`.
**LIVE** 3,77 (juli = all-time; vóór 1 juli 0 verbruik van gekochte credits).
**KLOPT? JA** — rekensom: `lot_pc = (3,49 − 0,61)/100 = 0,0288 €/cr`; FIFO consumeert 131 gekochte cr → `131 × 0,0288 = 3,7728 → 3,77`. Sluit aan op §5 (deferred 69×0,0288=1,99).

### 3.2 Net profit — **JA**
**FORMULE** `v_net = v_gross − v_opex_meas − (external ? entered : 0)`; `v_gross = revenue_delivered − cor_against_revenue`.
**LIVE** juli −7,02; all-time −17,94.
**KLOPT? JA** — `2,99 − 10,0075 − 0 = −7,0175 → −7,02` (juli); `2,99 − 20,9311 = −17,94` (all-time). **Kanttekening (geen fout):** net wordt gedomineerd door **goodwill** (§6.1) — de leverkost van *granted* credits die interne testusers verbranden. Voor de test-scope is dat correct-maar-betekenisloos; de echte-economie-scope (extern) is leeg.

### 3.3 Net-profit-delta — **JA** (zie §1; nu `null` want prev=0).

---

## §4 — Income statement: COR

### 4.1 COR-rijen (Cost · Credits · €/credit) — `CorTable`
`cost = cor[k]` (uit `_geld_scope`); `credits = consumed_by_type[k]` (debits met `product_type`); `€/credit = cost/credits`.

| Methode | Cost (juli) | Credits (juli) | €/cr | KLOPT? |
|---|---|---|---|---|
| ai_transcription | 10,3512 | 3091 | 0,00335 | **JA** — `182245 s/60×0,00322 + 190.865.465 B/1e9×2,99 = 9,7805 + 0,5707 = 10,3512`; credits = debits ai (3091) ✓ |
| caption | 0,0075 | 602 | 0,0000125 | **JA** — paid-caption proxy-bytes × 2,99/GB; credits 602 ✓ |
| ai_summary | 0,0008 | 12 | 0,0000667 | **JA** — deepseek tokens × tarief; credits 12 ✓ |
| **rag** | **0,0000** | **55** | **0** | was **NEE** → **GEFIXT** (aanname). `_geld_scope` zet `v_cor_rag := 0` bewust: RAG is een reshape van een bestaand transcript zonder externe API-call → marginale kost ≈ €0. Nu **expliciet als aanname** in de UI-hint ("assumed ~€0 · reshape of existing transcript, no external API call"), niet als gemeten €0. Verschijnt er wél meetbare compute/egress → meten. |
| storage (R2) | 0 (intern) | — | — | **JA** — intern geforceerd 0; extern `GREATEST(0, GB−10)×0,015×0,92×(dagen/maanddagen)`, live 122 KB < 10 GB → 0 ✓ |

All-time cost ai_transcription 21,2748 = `385790 s/60×0,00322 + 190.865.465 B/1e9×2,99 = 20,7041 + 0,5707` ✓. (Merk op: bytes all-time = juli — proxy_bytes wordt niet op elk AI-pad gepersisteerd; duur wél.)

**COR-tabel weergave-afronding — GEFIXT (audit-punt 6).** Bron/berekening blijven volledige precisie; afronden gebeurt **alleen bij render** (`corCost`/`corUnit` in `FinanceView.tsx`). Cost: 2 decimalen; een waarde >0 die naar €0,00 zou afronden toont **"<€0,01"** (echte 0 blijft €0,00). €/credit: leesbaar getal (4 dec voor <€0,01) of **"<€0,01"**, nooit "€0,0000". Materiële rij blijft narekenbaar (AI: €10,35 · 3.091 · €0,0033); immateriële rij (caption: €0,01 · 602 · "<€0,01") toont "niet nul, verwaarloosbaar" zonder een misleidende 0,00.

### 4.2 "Total measured COR" — **JA**
`measured_total = ai+cap+sum+rag+storage = 10,3512+0,0075+0,0008+0+0 = 10,3595` ✓ (juli); all-time 21,2831.

### 4.3 Payment processing (Stripe fee, COR-regel) — **JA**
`recognized_fee/deferred_fee/purchased_fee` deferren per lot: `feepc = fee/credits = 0,32/100 = 0,0032/cr`. `recognized = 131×0,0032 = 0,4192` ✓; `deferred = 69×0,0032 = 0,2208 → 0,22` ✓; `purchased = 0,64` ✓.

### 4.4 cor_against_revenue ("Cost of revenue" hoofdregel) — **JA**
`= Σmethode(against_revenue) + recognized_fee + storage`. Per-user gewogen (ADR-063): `Σ_user methodekost × (purch_consumed_venster / consumed_venster)`.
**LIVE** 0,7803. **Onafhankelijk her-afgeleid:**
- AI against-revenue = **0,3608** (SQL-replica van de `uc/sh`-CTE): alle AI-kost (10,3512) zit bij één user `…62e4` met share `131/3758 = 0,03486` → `10,3512 × 0,03486 = 0,3608` ✓
- caption 0,0003 + ai_summary 0 + rag 0 + storage 0 + fee 0,4192 → **0,7803** ✓
**KLOPT? JA** — reconcilieert exact; voedt gross_profit correct.

### 4.5 "of which against revenue / goodwill" split — **JA**
UI: `goodwill = measured_total − usageAgainst`. `usageAgainst = 0,3608+0,0003+0+0+0 = 0,3611`; `goodwill = 10,3595 − 0,3611 = 9,9984` ≈ RPC per-user `measured_opex.goodwill=9,9983` (0,0001 afronding) ✓.

---

## §5 — Gross profit / margin

**Gross profit — JA:** `3,77 − 0,7803 = 2,9897 → 2,99` ✓.
**Gross margin — JA:** `2,9897 / 3,77 = 0,7930 = 79,3%` ✓. **Kanttekening:** deze 79,3% is ná fee-in-COR (F22); vóór F22 was het fictieve 95,5%.
**Net margin — JA:** `−7,0178 / 3,77 = −1,8615` ✓.

---

## §6 — Operating expenses (`OpexTable`)

| Regel | LIVE (intern, juli) | KLOPT? |
|---|---|---|
| **Goodwill — granted credits used** | 9,9983 | **JA** — = measured_total − usageAgainst (§4.5) |
| **Free-caption funnel — logged-in** | 0,0092 | **JA** (her-afgeleid 2026-07-16) — `funnel_free_caption_cost = Σ proxy_bytes(caption, success, internal, credits_used=0)/1e9 × decodo_eur_per_gb`. Onafhankelijk uit `usage_logs` gerekend: **0,009157** → rondt op **0,0092** ✓. (Het "logged-in"-label dekt álle gratis caption-bytes credits_used=0; de had_paid=false-subsegment alleen is 0,005005.) |
| **Free-caption funnel — anonymous** | 0 intern / **0,0278** extern | **JA** — extern uit `daily_cost_counters.caption_proxy_bytes/1e9×2,99`; intern geforceerd 0 |
| **Fraud screening (Radar)** | 0 intern / 0 extern | **JA** (waarde) — `billable×rate`; `free_until 2026-08-15` ⇒ billable 0 ⇒ €0. De **screen-telling** was fout (§11) → **GEFIXT** |
| **Entered OPEX-regels** | geen | **JA** — `opex_expenses` leeg; `entered_opex.lines=[]`, total 0; intern toont sowieso 0 (`isExternal`-gate) |

`measured_opex.total (juli) = 9,9983 + 0,0092 + 0 + 0 = 10,0075` ✓.

---

## §7 — Bankkaart "Where the cash sits"

Alle bedragen = 2 sales × per-sale, distinct op `stripe_session_id`, internal users.

| NAAM | FORMULE | LIVE | KLOPT? |
|---|---|---|---|
| Charged to customers | `Σ COALESCE(settlement_amount, amount_paid)` | 6,98 | **JA** — `settlement_amount` is **null** → fallback `amount_paid` 3,49×2=6,98. EUR-sale, dus presentment=settlement. *Label "settlement €" is hier eigenlijk presentment.* |
| − VAT (owed to tax office) | `Σ _sale_vat(m).vat` | 1,22 | **JA** — zie §7.1 |
| = Revenue ex-VAT | `charged − vat` | 5,76 | **JA** — 6,98 − 1,22 |
| − Stripe fee | `Σ metadata.stripe_fee` | 0,64 | **JA** — 0,32×2 |
| = Yours to keep | `revenue_ex_vat − stripe_fee` (inline tsx) | 5,12 | **JA** — 5,76 − 0,64 |
| Settled to your bank | `net_settlement>0 ? net_settlement : charged−fee` | 6,34 | **JA** — `net_settlement` 3,17×2=6,34 = `charged−fee` (beide paden gelijk) |

### 7.1 vat_owed — €1,22 is correct (bevinding "±1 ct" INGETROKKEN)
`_sale_vat`: als `tax_status='complete'` → `amount_tax×exchange_rate`; **elif `metadata ? 'invoice_tax'`** → `invoice_tax` (status *measured*); else unknown. Live per sale: `amount_tax=0`, maar **`invoice_tax=0,61`** aanwezig ⇒ `vat=0,61`, measured. `Σ = 1,22`.

**Ingetrokken:** de eerdere "1,22 vs 1,21"-bevinding was **onjuist**. Elke factuur toont €0,61 BTW; de af te dragen BTW is de **som van de facturen** (€0,61 + €0,61 = €1,22), niet een 21%-herberekening over het bruto-totaal (`6,98×21/121 = 1,2114`). Die aggregatie-benadering is juist verkeerd — de fiscus krijgt wat er per factuur staat. **€1,22 is correct.** Navenant klopt Revenue ex-VAT = 6,98 − 1,22 = 5,76 exact. (Enige overgebleven noot, géén discrepantie: de BTW-bron is het reconcile-veld `invoice_tax`, niet Stripe's `amount_tax` dat 0 is — een provenance-doc-detail, geen fout in het getal.)

---

## §8 — VAT-buckets & Revenue by region

**VAT per bucket — JA:** buckets uit `vat_by_country` via de EU-lijst. Live alleen `nl`: `{vat 1,22, gross 6,98, count 2}`. Geen oss/outside/unknown. `rate_implied = 1,22/(6,98−1,22) = 0,2118` ✓.
**Revenue by region — JA:** `RevenueByRegion` groepeert NL/EU/Intl; net = gross − vat. Live NL: `6,98 − 1,22 = 5,76` net, 2 sales. Geen geblokkeerde landen (GB/CH) aanwezig → Radar-guard-indicator OK.
**Dubbel NL-label — GEFIXT (audit-punt 7):** "Netherlands · 2 · €5,76" stond dubbel (bucket-label + land-rij). De per-land-uitsplitsing rendert nu alleen voor buckets die **meerdere** landen kunnen bevatten (EU/Intl); de NL-bucket is per definitie één land → geen land-rij meer.

---

## §9 — Deferred card (rest)

| NAAM | LIVE | KLOPT? |
|---|---|---|
| Balance (ex-VAT) | 1,99 | **JA** — 69 × 0,0288 (FIFO-rest) |
| Credits outstanding | 69 | **JA** — 200 gekocht − 131 verbruikt-uit-lot |
| Deferred Stripe fee | 0,22 | **JA** — 69 × 0,0032 = 0,2208 |
| Est. cost to deliver | ~0,17–0,18 | was **NEE** → **GEFIXT** (§2): 0-data ⇒ "insufficient data" i.p.v. €0 |
| Est. future gross | **1,59** (was 1,82) | was **NEE** → **GEFIXT** (§2 + audit-punt 1): trekt nu óók de deferred Stripe fee af. `1,99 − 0,1757 − 0,2208 = 1,59`. *(De opdracht noemde 1,60 uit afgeronde displaywaarden 1,99−0,17−0,22; met volle precisie in de bron — audit-punt 6 — is het 1,59.)* |

---

## §10 — Cache savings

**ai_transcription — JA:** `saved = hit_credits × (cor_ai / miss_credits)`. Live `hit_jobs=0` → `saved=0`; `total_jobs=108` (juli). Klopt (geen hits → geen besparing).
**caption — JA (her-afgeleid 2026-07-16):** `saved = hit_count × avg_miss_bytes/1e9 × decodo_eur_per_gb`. Onafhankelijk uit `usage_logs` (caption, success, internal, juli): `hit_n=1`, `total=4`, `avg_miss_bytes=1.853.441` (≈1,85 MB) → `1 × 1.853.441/1e9 × 2,99 = 0,005542` → rondt op **0,0055** ✓. Blijft een **heuristiek** (huidige-periode-gemiddelde miss-grootte toegepast op de hit) — dezelfde klasse als cache (ai), die al JA was; het getal implementeert zijn formule correct.

---

## §11 — payment_attempts / Radar screen-count — was **NEE** → **GEFIXT**

**NAAM** Radar-hint in OPEX: "`{screens}` screened (`{successful}` ok · `{declined}` declined · `{blocked}` blocked) × €rate".
**FORMULE (was)** `v_scr_succ = count(DISTINCT stripe_session_id) FROM credit_transactions WHERE type='credit' AND …` **zonder `JOIN profiles`/`is_internal`-filter**; `v_scr_fail…` uit `payment_attempts`. Alleen berekend in de `v_internal=false`-tak.
**DIAGNOSE** `payment_attempts` is leeg (0 rijen), maar de externe scope toonde toch `screens=2, successful=2` — de 2 **internal-test-aankopen** lekten in de externe Radar-telling omdat de teller niet op `is_internal` filterde. €0 nu (gratis t/m 2026-08-15), maar ná die datum zou de externe scope Radar-fee rekenen over interne testverkopen.
**→ GEFIXT** (migratie `20260715213746`): de successful-screen-query joint nu `JOIN profiles pr ON pr.id=ct.user_id AND NOT pr.is_internal`; de failed-screen-query op `payment_attempts` sluit interne profielen uit via `LEFT JOIN profiles` (null user_id = anoniem = extern → behouden). **Geverifieerd:** externe `radar.screens` ging van `2` → **`0`**, `successful` `2` → `0`. Alle interne invarianten (net_profit, gross, bank, cor) ongewijzigd.

---

## §12 — Rapport-punt 8: de 602 caption-COR-credits (geen fix, alleen bevinding)

**Vraag:** zijn de 602 caption-credits playlist-captions (1 credit/video), terwijl losse caption-extractie 0 credits kost?
**Antwoord: JA.** Bewijs uit `credit_transactions` (internal debits, `product_type='caption'`):
- **Juli: 602/602 caption-credits dragen een `playlist_id`** in `metadata` (`jul_with_playlist = jul_total = 602`). Alle `amount=1`, `kind='settlement'`.
- All-time 881: 737 met `playlist_id`; de resterende 144 (april-18, één job `551c832e…`) dragen `job_id`+`video_id` i.p.v. `playlist_id` — **ook** playlist-per-video-captions, alleen ouder metadata-schema. Alle `amount=1`.
- Distinct amounts = `[1]` → nooit 0, nooit >1. Losse caption-extractie schrijft **geen** debit (0 credits, conform CLAUDE.md).

**Prijsregel (nu vastgelegd in provenance):** playlist-caption = **1 credit/video**; losse caption-extractie = 0 credits. De caption-COR-rij (§4.1) is dus te lezen als proxy-bytes van betaalde playlist-video-captions; de €0,0075 kost hoort bij die 602 playlist-video's (cache-misses).

---

## Wat NIET geverifieerd is (eerlijkheidshalve)

- ~~**funnel_loggedin (0,0092)** en **cache caption saved (0,0055)**~~ → **her-afgeleid 2026-07-16, beide JA** (§6/§10): 0,009157→0,0092 en 0,005542→0,0055 onafhankelijk uit `usage_logs`. De cache-caption-regel blijft een heuristiek (correct geïmplementeerd), niet een onzekerheid. Tally nu **31 JA / 0 NEE / 0 weet-niet**.
- **proxy_bytes op AI all-time** = juli-waarde: duidt erop dat bytes niet op elk AI-pad gepersisteerd worden (bekend, zie 1.24). Raakt cor.ai all-time (duur wél volledig). **Bevestigd 2026-07-16** (Decodo-coverage-analyse, §3c van de opruim-taak / ADR-065): van 188 complete AI-jobs dragen er maar **6** proxy_bytes (capture pas sinds ADR-054); 27 error-jobs 0 bytes. De gemeten proxy is dus een **ondergrens**, niet de volle Decodo-uitgave.

*Peildatum diagnose: 2026-07-15 20:55 UTC. Fixes + herverificatie: 2026-07-15 ~21:40 UTC (migratie `20260715213746`, `FinanceView.tsx`, `periods.ts`). Her-afleiding 2 laatste getallen + Decodo-coverage: 2026-07-16 (ADR-065).*

---

## §13 — Laatste finance-taak (2026-07-17): reconciliatie-venster, F6, F7, asset

### 13.1 Proxy-reconciliatie toonde een negatief gat (−0,025 GB) — GEFIXT
**Oorzaak:** `admin_finance_summary` mat onze proxy-bytes over de **volle gekozen periode** (16 dagen) maar vergeleek met billed die alleen bestond voor de **gefetchte dagen** (14 + 16). 16 dagen meten vs 2 dagen factureren → measured > billed → vals negatief gat. De 14–18-juli-test klopte toevallig omdat daar de vensters bijna gelijk waren — een test op één gunstig venster betrapt dit niet.

**Fix (migratie `20260717100000` + `backend/worker.py`):**
1. Measured beperkt tot de **gedekte dagen** (dagen mét een `decodo_daily_usage`-rij), via een `v_cov_day_arr` day-membership-filter op alle vier de meetbronnen. Billed én measured spannen nu dezelfde dagen.
2. Worker schrijft voor **élke complete dag** in het fetch-venster een rij (0 bytes als Decodo niets teruggaf) → "rij bestaat" = "dag gedekt", geen ambiguïteit meer tussen "geen verkeer" (15 jul, billed=0) en "nooit gefetcht". **Vandaag wordt bewust NIET geschreven** (nog aan het aggregeren; Decodo's same-day-telling loopt achter op onze real-time meting → zou measured>billed geven).
3. `data_from` (vroegste Decodo-dag) toegevoegd aan de reconciliatie-jsonb; UI toont "gap over N of M days · Decodo data starts 14 Jul".

**Bewezen ≥2 vensters** (peildatum 2026-07-17):
- **A [14→17), volledig binnen dekking:** status `ok` (3/3), billed 185,09 MB · measured 184,93 MB · **gap +164 KB** (positief, €0,0005).
- **B "This month" [01→18), buiten dekking:** status `partial` (3/17), **zelfde** billed/measured, **gap +164 KB** (positief). Geen negatief getal meer.

### 13.2 F6 — `cor_caption_estimated` (verdict: dode vlag, waarde toevallig correct)
De vlag stond hard op `false`. Onderzoek: (a) **niets rendert 'm** — alleen de `GeldScope`-type declareert 'm; geen enkele `.tsx` leest 'm. (b) **Caption-COR is feitelijk volledig gemeten:** 0 non-cache geslaagde caption-rijen missen `proxy_bytes`; de enige 0-byte-rij is een **legitieme cache-hit** (`cache_hit=true`, `credits_used=0`, internal). Dus de COR is geen ondergrens en `false` is toevallig juist.
**Verdict (b):** dode vlag → **type-veld verwijderd** uit `GeldScope`. De grote financiële `_geld_scope`-RPC is NIET herschreven enkel om een inerte, ongelezen, toevallig-correcte constante te droppen (risico > baat). Als de vlag ooit herleeft: **data-afgeleid maken** (`EXISTS(non-cache success caption met NULL/0 proxy_bytes)`), nooit een constante.

### 13.3 F7 — Stripe invoicing-fee (verdict: fee is €0, niets bouwen)
Tarief geverifieerd tegen Stripe: **0,4% per betaalde factuur, gecapt op $2** (Invoicing Starter; Plus = 0,5% cap $2). MAAR: onze on-demand facturen worden aangemaakt met **`pay(paid_out_of_band: true)`** (ADR-053, `api/stripe/invoice/route.ts:128`). Stripe rekent de invoicing-fee **niet** op facturen die buiten Stripe betaald zijn ("not charged for invoices paid outside Stripe"). → **De fee is €0.** Een gemeten OPEX-regel bouwen zou een spookkost boeken. `invoice_id` staat wél in `credit_transactions.metadata` (dus in principe meetbaar), maar er is niets te meten. ADR-060's entered-regel-voorziening blijft staan voor als Stripe ooit wél een invoicing-fee op de Fees report toont (96u vertraging).

### 13.4 credit-coin.png (rapport, geen actie)
`public/credit-coin.png` (128×128 RGBA PNG, 19 KB, gemaakt 14 jul, **nooit in git**) wordt gebruikt door `HexagonCreditIcon.tsx` (`src="/credit-coin.png"`) → gerenderd in AppTopbar, app-sidebar en TransactionHistoryCard. Het is dus een **product-asset** die momenteel in productie een 404 geeft (het credit-icoon in de topbar/sidebar is stuk). Aanbeveling: committen. Niet zelf gedaan — Khidr beslist.

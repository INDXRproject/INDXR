# Finance-audit — klopt het antwoord?

**Doel:** naast [`finance-number-provenance.md`](finance-number-provenance.md) (dat beschrijft *wat de code doet*) zegt dit document per getal in `/admin/finance` of **het antwoord klopt** — met de rekensom die dat aantoont. Verdict-kolom: **JA** / **NEE** / **WEET NIET**. Een geruststelling zonder rekensom telt niet.

**Methode:** functiedefinities letterlijk uit `pg_get_functiondef` (`admin_finance_summary`, `_geld_scope`, `_recognize_asof`, `opex_accrual`, `_sale_vat`) + `FinanceView.tsx`/`periods.ts`; live data uit de RPC en de brontabellen.

**Peildatum:** 2026-07-15 20:55 UTC. **Scope:** internal (test) — daar zit alle activiteit; de externe/"echte economie" is momenteel leeg (0 sales, zie §0). **Twee vensters:** juli-2026 = lopende maand (`2026-07-01 00:00` → `now()`, 14 dagen) en all-time (`2020-01-01` → `now()`).

---

## Tally

| Verdict | Aantal | Items |
|---|---|---|
| **JA** | 25 | net_profit · revenue (hero) · hero-delta · deferred_balance · deferred credits · COR ai_transcription/caption/ai_summary/storage · cor_against_revenue · goodwill · gross_profit · gross_margin · OPEX goodwill/funnel_anon/radar_fee/entered · charged · stripe_fee · net_settlement · yours_to_keep · vat_owed · vat per bucket · revenue per regio · cache (ai) |
| **NEE** | 4 | **est_cost_to_deliver** · **est_future_gross** · **COR rag** (kost hard 0) · **payment_attempts/radar screen-count** (scope-lek) |
| **WEET NIET** | 2 | OPEX funnel_loggedin · cache savings (caption) |

De twee "verdachte" getallen uit de opdracht staan als eerste (§1 hero-delta, §2 est_*). De rest volgt de UI-volgorde.

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
2. *Afgeronde periodes zijn wél scheef.* Voor een **niet-lopende** periode is `elapsed = volle maandlengte`; `prev.from + elapsed` schiet dan over de kortere/langere vorige maand heen. Voorbeeld: een afgeronde maand van 31 dagen vergelijkt tegen `prev.from + 31 d` — bij een vorige maand van 30 dagen valt de laatste dag ín de maand daarna. Dat is **niet** het month-to-date-geval dat F11 en de opdracht noemen, maar het is een reële, aparte scheefheid → **WEET NIET/NEE** specifiek voor afgeronde-periode-navigatie.

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

Het getoonde 0,17 is daarom een plausibele-maar-toevallige waarde; de schatter zelf is niet betrouwbaar. (Geen voorstel — alleen de bevinding.)

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
| **rag** | **0,0000** | **55** | **0** | **NEE** — `_geld_scope` zet `v_cor_rag := 0` **hard**. 55 credits RAG geleverd, kost **nooit gemeten** → €/credit=0 is een gat, geen echte 0. |
| storage (R2) | 0 (intern) | — | — | **JA** — intern geforceerd 0; extern `GREATEST(0, GB−10)×0,015×0,92×(dagen/maanddagen)`, live 122 KB < 10 GB → 0 ✓ |

All-time cost ai_transcription 21,2748 = `385790 s/60×0,00322 + 190.865.465 B/1e9×2,99 = 20,7041 + 0,5707` ✓. (Merk op: bytes all-time = juli — proxy_bytes wordt niet op elk AI-pad gepersisteerd; duur wél.)

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
| **Free-caption funnel — logged-in** | 0,0092 | **WEET NIET** — `v_cap_free_bytes(credits_used=0, internal, logged-in)/1e9×2,99`; laag-materieel, niet apart her-afgeleid |
| **Free-caption funnel — anonymous** | 0 intern / **0,0278** extern | **JA** — extern uit `daily_cost_counters.caption_proxy_bytes/1e9×2,99`; intern geforceerd 0 |
| **Fraud screening (Radar)** | 0 intern / 0 extern | **JA** (waarde) — `billable×rate`; `free_until 2026-08-15` ⇒ billable 0 ⇒ €0. Maar de **screen-telling** is fout, zie §9 |
| **Entered OPEX-regels** | geen | **JA** — `opex_expenses` leeg; `entered_opex.lines=[]`, total 0; intern toont sowieso 0 (`isExternal`-gate) |

`measured_opex.total (juli) = 9,9983 + 0,0092 + 0 + 0 = 10,0075` ✓.

---

## §7 — Bankkaart "Where the cash sits"

Alle bedragen = 2 sales × per-sale, distinct op `stripe_session_id`, internal users.

| NAAM | FORMULE | LIVE | KLOPT? |
|---|---|---|---|
| Charged to customers | `Σ COALESCE(settlement_amount, amount_paid)` | 6,98 | **JA** — `settlement_amount` is **null** → fallback `amount_paid` 3,49×2=6,98. EUR-sale, dus presentment=settlement. *Label "settlement €" is hier eigenlijk presentment.* |
| − VAT (owed to tax office) | `Σ _sale_vat(m).vat` | 1,22 | **JA (±1 ct)** — zie §7.1 |
| = Revenue ex-VAT | `charged − vat` | 5,76 | **JA** — 6,98 − 1,22 |
| − Stripe fee | `Σ metadata.stripe_fee` | 0,64 | **JA** — 0,32×2 |
| = Yours to keep | `revenue_ex_vat − stripe_fee` (inline tsx) | 5,12 | **JA** — 5,76 − 0,64 |
| Settled to your bank | `net_settlement>0 ? net_settlement : charged−fee` | 6,34 | **JA** — `net_settlement` 3,17×2=6,34 = `charged−fee` (beide paden gelijk) |

### 7.1 vat_owed — de rekensom achter "±1 ct"
`_sale_vat`: als `tax_status='complete'` → `amount_tax×exchange_rate`; **elif `metadata ? 'invoice_tax'`** → `invoice_tax` (status *measured*); else unknown. Live per sale: `amount_tax=0`, maar **`invoice_tax=0,61`** aanwezig ⇒ `vat=0,61`, measured. `Σ = 1,22`. **Twee noten (getal blijft verdedigbaar):**
- **Basis ≠ Stripe Tax.** De provenance-doc zegt "sinds 2026-07-15 rekent de Checkout Session BTW". In werkelijkheid is `amount_tax=0` en komt de BTW uit een **reconcile-veld `invoice_tax`** (21%-uitname). Correct bedrag (NL 21% inclusief op €3,49 = €0,6057), maar niet de gedocumenteerde bron.
- **Per-sale-afronding.** `invoice_tax` is per sale afgerond: `0,61×2 = 1,22`, terwijl de zuivere aggregatie `6,98×21/121 = 1,2114 → 1,21` is. Het dashboard toont dus **1,22** waar 1,21 "exacter" is; navenant is Revenue ex-VAT 5,76 i.p.v. 5,7686. Immaterieel, maar het is een echte 1-cent-discrepantie.

---

## §8 — VAT-buckets & Revenue by region

**VAT per bucket — JA:** buckets uit `vat_by_country` via de EU-lijst. Live alleen `nl`: `{vat 1,22, gross 6,98, count 2}`. Geen oss/outside/unknown. `rate_implied = 1,22/(6,98−1,22) = 0,2118` ✓.
**Revenue by region — JA:** `RevenueByRegion` groepeert NL/EU/Intl; net = gross − vat. Live NL: `6,98 − 1,22 = 5,76` net, 2 sales. Geen geblokkeerde landen (GB/CH) aanwezig → Radar-guard-indicator OK.

---

## §9 — Deferred card (rest)

| NAAM | LIVE | KLOPT? |
|---|---|---|
| Balance (ex-VAT) | 1,99 | **JA** — 69 × 0,0288 (FIFO-rest) |
| Credits outstanding | 69 | **JA** — 200 gekocht − 131 verbruikt-uit-lot |
| Deferred Stripe fee | 0,22 | **JA** — 69 × 0,0032 = 0,2208 |
| Est. cost to deliver | 0,17 | **NEE** — §2 |
| Est. future gross | 1,82 | **NEE** — §2 |

---

## §10 — Cache savings

**ai_transcription — JA:** `saved = hit_credits × (cor_ai / miss_credits)`. Live `hit_jobs=0` → `saved=0`; `total_jobs=108` (juli). Klopt (geen hits → geen besparing).
**caption — WEET NIET:** `saved = hit_count × avg_miss_bytes/1e9 × 2,99`. Live `hit 1 / total 4`, `saved 0,0055`. Impliceert `avg_miss ≈ 1,84 MB`; plausibel maar niet onafhankelijk her-afgeleid, en het is een heuristiek (huidige-periode-gemiddelde toegepast op de hit).

---

## §11 — payment_attempts / Radar screen-count — **NEE**

**NAAM** Radar-hint in OPEX: "`{screens}` screened (`{successful}` ok · `{declined}` declined · `{blocked}` blocked) × €rate".
**FORMULE** `v_scr_succ = count(DISTINCT stripe_session_id) FROM credit_transactions WHERE type='credit' AND …` **zonder `JOIN profiles`/`is_internal`-filter**; `v_scr_fail…` uit `payment_attempts`. Alleen berekend in de `v_internal=false`-tak.
**LIVE** `payment_attempts` is **leeg** (0 rijen). Externe scope toont toch `screens=2, successful=2, billable=0, fee=0`.
**KLOPT? NEE** — die 2 "successful screens" zijn de **2 internal-test-aankopen**: de screen-teller filtert niet op `is_internal`, dus interne testsales lekken in de **externe** Radar-telling. Nu €0 (gratis t/m 2026-08-15), maar ná die datum zou de externe scope Radar-fee rekenen over interne testverkopen. `radar_fee` (het €-getal) is toevallig 0 en dus "JA", maar de **telling eronder is fout**. Failed-screens dragen 0 bij omdat `payment_attempts` leeg is (geen echte mislukte-poging-registratie aanwezig).

---

## Wat NIET geverifieerd is (eerlijkheidshalve)

- **funnel_loggedin (0,0092)** en **cache caption saved (0,0055)**: laag-materieel, niet onafhankelijk her-afgeleid → WEET NIET.
- **Afgeronde-periode-delta** (§1 noot 2): reële scheefheid, maar buiten het month-to-date-geval van de opdracht; niet met live data uitgerekend (juni/juli hebben geen bruikbare afgeronde-periode-data).
- **proxy_bytes op AI all-time** = juli-waarde: duidt erop dat bytes niet op elk AI-pad gepersisteerd worden (bekend, zie 1.24). Raakt cor.ai all-time (duur wél volledig).

*Peildatum data: 2026-07-15 20:55 UTC. Alle "LIVE"-waarden komen uit `admin_finance_summary` / brontabellen op dat moment.*

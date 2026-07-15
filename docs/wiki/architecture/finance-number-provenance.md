# Finance-tab — herkomst van elk getal

**Doel:** elk getal dat de Finance-tab toont, herleidbaar maken tot formule, bron, driver, tijdstoewijzing, scope en aannames — zodat een fout (zoals de cross-user pooling-bug die vier dagen stond) inspecteerbaar is in plaats van verstopt.

**Geschreven tegen de werkelijke functiecode** (opgehaald via `pg_get_functiondef` op 2026-07-15) en de frontend-bestanden — niet tegen ADR-teksten. Waar de code afwijkt van een ADR, is de code de waarheid en wordt het verschil expliciet gemeld.

> **UPDATE 2026-07-15 — COR pooling + Stripe-fee GEFIXT (deploy live, ADR-063).**
> - **`cor_against_revenue` is niet langer gepoold** (§2.2/§2.3/§2.12): `_geld_scope` rekent nu
>   `Σ_user (user_period_COR × user_period_share)` per methode, met een **periode**-share (niet meer een
>   all-time-share op periode-COR). De 🔴 pooling-klasse hieronder is dáármee gesloten voor COR/goodwill.
>   Bewezen (A/B, tegengestelde profielen): oude formule €5,005/€5,005 → nieuw €0,01 against / €10 goodwill.
> - **Stripe-fee is COR, niet OPEX** (§2.14 → verplaatst): fee wordt per aankoop-lot gedefereerd
>   (`recognized_fee` op verbruikte gekochte credits, `deferred_fee` op de rest) en is revenue-matched —
>   géén share, géén goodwill-deel. Bewezen (2 tiers): €1,25 fee → €0,76 recognized / €0,49 deferred.
> - **`deferred.credits` is nu de echte som van lot-restanten** (§4.2), niet meer teruggerekend uit een
>   blended €/credit. Bewezen (Try+Plus): echt 700 vs blended 641,7.

**Legenda:**
- 🟢 **gemeten** — komt uit werkelijk vastgelegde data (bytes, minuten, tokens, transacties).
- 🟡 **geschat** — een aanname of extrapolatie zit in de berekening.
- 🔴 **pooling-risico** — een berekening draait op een som/aggregaat terwijl de regel eigenlijk bij een individuele user hoort (de klasse van de opgeloste bug). Alleen gerapporteerd, niet gefixt.
- 👁️ **driver onzichtbaar** — het onderliggende volume (bytes/tokens/minuten) is nergens in de UI af te lezen.

**Rekenketen (welke functie levert wat):**
```
page.tsx  ──rpc──►  admin_finance_summary(from,to)          ← live tab (hero, statement, kaarten)
                        │  roept per scope (external/internal):
                        ├─►  _geld_scope(internal, from, to)  ← revenue, COR-per-methode, deferred, share
                        │         └─►  _recognize_asof(users, to/from)  ← PER-USER recognitie (FIFO lots)
                        └─►  opex_accrual(from_d, to_d)        ← entered-OPEX (infra/ads), external-only
page.tsx  ──select─►  finance_daily_snapshot                 ← trend (bevroren dagen)
FinanceView.tsx: accrualForRange()                           ← trend-overlay entered-OPEX (JS-spiegel opex_accrual)
snapshot_finance_day() [pg_cron 02:00 UTC]                   ← vult finance_daily_snapshot nachtelijk
```

**Tarieven** (alle uit `cost_config`, laatste rij op `effective_from DESC`): `assemblyai_eur_per_min`, `decodo_eur_per_gb`, `deepseek_eur_per_1k_input_tokens`, `deepseek_eur_per_1k_output_tokens`, `deepseek_eur_per_1k_cache_hit_tokens`, `r2_usd_per_gb_month`, `r2_free_gb`, `usd_eur_rate`.

---

## Sectie 1 — Hero

### 1.1 Net profit (groot getal)
1. **Naam:** "Net profit".
2. **Formule:** `net_profit = gross_profit − measured_opex.total − (external ? entered_opex_total : 0)`, waarbij `gross_profit = recognized_revenue − cor_against_revenue` (incl. storage). In gewone taal: erkende omzet, min de kosten om die omzet te leveren, min alle bedrijfskosten.
3. **Bron:** `admin_finance_summary` → `v_net`. Onderdelen: `_geld_scope` (revenue, COR, goodwill) + `opex_accrual` (entered) + Stripe-fee uit `credit_transactions.metadata`.
4. **Driver:** samengesteld — geen enkele driver; het is het sluitstuk van de hele keten. 👁️
5. **Tijdstoewijzing:** flow over `[from,to)`. Optelbaar.
6. **Scope:** per scope (external default, internal bij toggle). Samengesteld uit onderdelen met eigen scope-eigenschappen (zie hieronder). `cor_against_revenue` is nu ✅ per-user (§2.2, ADR-063) — het pooling-risico op deze term is gesloten.
7. **Aannames/zwakke plekken:** zo betrouwbaar als zijn zwakste term. De Stripe-fee zit nu in COR (revenue-matched, §2.14) en kan nog niet-gereconcilieerd €0 zijn tot reconcile draait. De F1-fix verplaatst kosten tussen COR en goodwill (beide binnen net) — het netto-effect op net_profit is de fee-defer (`deferred_fee` wordt niet meer direct als OPEX afgeboekt).

### 1.2 Net profit — delta vs vorige periode
1. **Naam:** het `+X%`/`−X%` naast Net profit.
2. **Formule:** `delta = (net_now − net_prev) / |net_prev|`, getoond als afgeronde procent. `null` (niets getoond) als `net_prev = 0`. Kleur: amber omhoog, rood omlaag (`FinanceView.tsx` `delta()`).
3. **Bron:** twee `admin_finance_summary`-aanroepen — huidige periode + `compareFrom/compareTo` (zelfde aantal verstreken dagen in de vorige periode, `periods.ts` `makePeriod`).
4. **Driver:** twee net-profit-getallen. 👁️
5. **Tijdstoewijzing:** vergelijkt `[from,to)` met de vorige gelijk-lange periode.
6. **Scope:** zelfde scope als de tab.
7. **Aannames/zwakke plekken:** bij `net_prev = 0` (pre-revenue, nu het geval) verschijnt er niets — geen "+∞". Deelt door de vorige waarde, dus een kleine vorige periode geeft grote procenten.

### 1.3 Revenue (groot getal)
1. **Naam:** "Revenue".
2. **Formule:** `revenue_delivered + deferred_balance`. In gewone taal: alle ex-BTW omzetwaarde van verkochte credits — het al geleverde deel plus het nog-verschuldigde deel.
3. **Bron:** `admin_finance_summary` block `revenue_delivered` + `deferred_balance` (beide uit `_geld_scope`).
4. **Driver:** gekochte credits × €/credit. Credits zichtbaar elders (credits_sold), €/credit niet. 👁️
5. **Tijdstoewijzing:** **gemengd** — `revenue_delivered` is een flow over `[from,to)`, `deferred_balance` is een **stock** (as-of `to`, cumulatief). Deze twee optellen mengt flow + stock (zie zwakke plek).
6. **Scope:** per-user gesommeerd (via `_recognize_asof`).
7. **Aannames/zwakke plekken:** het optellen van een periode-flow (delivered) en een cumulatieve stock (deferred) tot één "Revenue" is conceptueel scheef: bij een korte periode is delivered klein maar deferred het hele openstaande saldo. **Bovendien:** de delta ernaast (1.4) rekent op `revenue_delivered` alléén, niet op dit gecombineerde getal — mismatch.

### 1.4 Revenue — delta
Zelfde mechaniek als §1.2, maar `delta(revenue_delivered_now, revenue_delivered_prev)` — **let op:** op `revenue_delivered`, terwijl het getoonde getal (§1.3) `revenue_delivered + deferred_balance` is. De procent hoort dus niet bij het getal erboven. 🟡 zwakke plek (inconsistente basis).

### 1.5 Delivered / deferred balk + labels
1. **Naam:** "Delivered €X" / "Deferred €Y" met gekleurde balk (amber / lichter amber).
2. **Formule:** balksegmenten `revenue_delivered` en `deferred_balance`, breedte naar rato (`SplitBar`).
3. **Bron:** idem §1.3.
4. **Driver:** €-waarden zelf.
5. **Tijdstoewijzing:** delivered = flow; deferred = stock. (Zelfde meng-caveat.)
6. **Scope:** per-user gesommeerd.
7. **Aannames/zwakke plekken:** zie §1.3.

---

## Sectie 2 — Income statement

### 2.1 Revenue · delivered (ex-VAT)
1. **Naam:** "Revenue · delivered (ex-VAT)".
2. **Formule:** `recognized_revenue`. Per verbruiksmoment, granted-first, FIFO purchase-lots: bij elke consumptie die uit een aankoop-lot trekt → `getrokken × lot_€/credit`, gesommeerd. `lot_€/credit = (amount_paid − amount_tax) / credits` van die aankoop. Periode-flow = `recognize_asof(to).recognized − recognize_asof(from).recognized`.
3. **Bron:** `_recognize_asof` over `credit_transactions` (type/amount/metadata/kind/product_type). €/credit uit `metadata.amount_paid` + `metadata.amount_tax` van de aankoop-rijen.
4. **Driver:** verbruikte gekochte credits × €/credit per lot. Credits deels zichtbaar (§2.x consumed_by_type); de lot-prijzen niet. 👁️
5. **Tijdstoewijzing:** flow op `credit_transactions.created_at`. Optelbaar. Volgorde binnen gelijk tijdstip: credits vóór debits, dan `id`.
6. **Scope:** ✅ **per-user** — elke user eigen `granted_bal` + eigen FIFO-lots, daarna gesommeerd (ADR-061, migratie `20260715140000`). Dit was de pooling-bug; nu correct.
7. **Aannames/zwakke plekken:** verbruik boven het eigen beschikbare saldo wordt genegeerd. €/credit sinds 2026-07-15 in **settlement-EUR**: `net_lot = settlement_amount − amount_tax × exchange_rate` (fallback `amount_paid − amount_tax` voor bestaande EUR-sales). Sales zonder gemeten BTW (`tax_status≠'complete'`) missen de BTW-aftrek → recognized voor díe sales is nog BTW-inclusief te hoog; dat wordt niet verzwegen maar geteld in `vat_unmeasured` en gewaarschuwd (§3.4).

### 2.2 Cost of revenue (COR-regel)
1. **Naam:** "Cost of revenue".
2. **Formule:** `cor_against_revenue = Σ_user Σ_methode (user_period_cor_methode × user_period_share) + cor_storage + recognized_fee`. In gewone taal: het deel van de leverkosten dat aan betaalde (erkende) omzet is toe te rekenen — nu **per user** opgeteld, niet meer via één scope-brede share; plus storage en de gedefereerd-herkende Stripe-fee. Het granted-deel gaat naar OPEX (goodwill).
3. **Bron:** `_geld_scope` (`v_cor_rev` = `v_ar_ai + v_ar_cap + v_ar_sum + v_recognized_fee`) + storage uit `admin_finance_summary` (`v_cor_sto`). De per-user COR-per-methode komt uit een `GROUP BY user_id`-query over `transcription_jobs`/`usage_logs`/`transcripts`; de per-user share uit `_recognize_asof.by_user` (`rec_to − rec_from`, periode).
4. **Driver:** AssemblyAI-minuten + Decodo-bytes + DeepSeek-tokens + opslag-GB, × tarieven, × per-user-share. 👁️ (drivers niet in UI).
5. **Tijdstoewijzing:** COR-termen zijn flows op elk hun eigen event-tijdstip (§2.4–2.7); de per-user share is óók **periode**-scoped (`by_user` as-of `to` minus as-of `from`) — flow × flow, niet meer flow × all-time-stock.
6. **Scope:** ✅ **per-user** (ADR-063, migratie `20260715163500`). `Σ_user (user_COR × user_share)`, elke user zijn eigen periode-share. Was de 🔴 pooling-bug: user A verbruikt 100 granted credits voor €10 COR (share 0), user B 100 purchased voor €0,01 (share 1) → nu juist: against-revenue €0,01 / goodwill €10 (oude gepoolde formule gaf share 0,5 → €5,00/€5,00). Bewezen met reversibele A/B-test.
7. **Aannames/zwakke plekken:** storage wordt **volledig** tegen omzet geboekt (geen share) terwijl er deferred credits openstaan — een aanname. `recognized_fee` is revenue-matched (geen share, geen goodwill — granted credits dragen geen fee). **NULL-valkuil (opgelost, zie LESSONS 2026-07-15):** de per-user COR-subqueries wrappen elke `sum()` in `COALESCE(...,0)`; zonder dat werd `sum(dur)*rate + sum(bytes)*rate` NULL zodra `proxy_bytes` volledig NULL was voor een user, wat diens duur-kost stil liet vallen. Caption-COR-nauwkeurigheid hangt af van gevulde `proxy_bytes` (§2.5).

### 2.3 COR-tabel — per methode: Cost (optie ii, volle kost)
1. **Naam:** kolommen "Cost / Credits / € per credit" per rij (AI transcription / Auto-captions / AI summary / RAG / Storage), plus de rij "Total measured COR".
2. **Formule (Aanvulling 3, Khidr's keuze):** de tabel toont de **VOLLE kost** per methode zodat de rij vermenigvuldigt. `Cost = cor[k]` (volle gemeten COR), `Credits = consumed_by_type[k]` (alle verbruikte credits), `€/credit = cor[k] / credits` → `Credits × €/credit = Cost`. De against-revenue/goodwill-splitsing staat als **aparte regel eronder** ("of which against revenue €X · goodwill €Y"), niet in de kolommen. De Stripe-fee heeft een eigen regel (recognised/deferred).
3. **Bron:** `admin_finance_summary` `cor.<k>` (volle kost) + `cor.against_revenue_by_method` (voor de split-regel) + `cor.payment_fee` (fee-regel).
4. **Driver:** per methode het volume × tarief (zie §2.4–2.8). De rij is nu zelf-consistent (kolommen vermenigvuldigen).
5. **Tijdstoewijzing:** flow (methode-event-tijd); de split-regel eronder gebruikt de per-user against (§2.2).
6. **Scope:** volle kost = aggregaat (pure kostensom, §2.4–2.8). De split-regel eronder is ✅ per-user (§2.2).
7. **Aannames/zwakke plekken:** de drie populaties die vroeger in één rij botsten (against-Cost × alle-credits × volle-€/credit) zijn ontkoppeld: de tabel toont nu één consistente populatie (volle kost), de splitsing is een losse regel. Storage-rij heeft geen per-credit-eenheid ("—").

### 2.4 COR-driver: AI transcription
1. **Naam:** onder "AI transcription" (Cost/Credits/€ per credit).
2. **Formule:** `cor_ai = (Σ duration_seconds / 60) × assemblyai_eur_per_min + (Σ proxy_bytes / 1e9) × decodo_eur_per_gb`. Credits-kolom = `consumed_by_type.ai_transcription`; €/credit = `cor_ai / credits`.
3. **Bron:** `transcription_jobs` (`duration_seconds`, `proxy_bytes`) waar `status='complete' AND cache_hit=false`; tarieven uit `cost_config`.
4. **Driver:** AssemblyAI-minuten + proxy-bytes (👁️ niet in UI) + verbruikte credits (zichtbaar in Credits-kolom).
5. **Tijdstoewijzing:** flow op `transcription_jobs.created_at`. 🟢 klopt (job draait ~bij creatie).
6. **Scope:** aggregaat (Σ over scope-users via `user_id = ANY(users)`). Correct: het is een pure kostensom, geen per-wallet-logica.
7. **Aannames/zwakke plekken:** `cache_hit=true`-jobs → COR 0 (bewust; master-cache-hit betaalt geen AssemblyAI/proxy). Nauwkeurig mits `duration_seconds`/`proxy_bytes` gevuld zijn.

### 2.5 COR-driver: Auto-captions
1. **Naam:** "Auto-captions".
2. **Formule:** `cor_caption = (Σ proxy_bytes waar credits_used>0 / 1e9) × decodo_eur_per_gb`. Credits = `consumed_by_type.caption`; €/credit = `cor_caption / credits`.
3. **Bron:** `usage_logs` waar `extraction_type='caption' AND success AND is_internal_at_time=scope`, filter `credits_used>0`.
4. **Driver:** Decodo caption-egress-bytes (👁️) + caption-credits (zichtbaar).
5. **Tijdstoewijzing:** flow op `usage_logs.created_at`. 🟢 klopt.
6. **Scope:** aggregaat op `is_internal_at_time` (point-in-time stempel). Correct (kostensom).
7. **Aannames/zwakke plekken:** `cor_caption_estimated` staat **hardcoded `false`** in de code — het getal presenteert zich als gemeten. Dat klopt alleen zolang `proxy_bytes` op élk caption-event (incl. playlist) echt gemeten is; oudere/niet-geïnstrumenteerde rijen met `proxy_bytes=0` verlagen de COR stilzwijgend. 🟡 (label zegt "gemeten", nauwkeurigheid afhankelijk van instrumentatie).

### 2.6 COR-driver: AI summary
1. **Naam:** "AI summary".
2. **Formule:** `cor_ai_summary = (max(prompt_tokens − cache_hit_tokens,0)/1000) × deepseek_eur_per_1k_input_tokens + (cache_hit_tokens/1000) × deepseek_eur_per_1k_cache_hit_tokens + (completion_tokens/1000) × deepseek_eur_per_1k_output_tokens`.
3. **Bron:** `transcripts.ai_summary_usage` (jsonb: `prompt_tokens`, `completion_tokens`, `prompt_cache_hit_tokens`) waar `ai_summary_usage IS NOT NULL`.
4. **Driver:** DeepSeek-tokens (👁️).
5. **Tijdstoewijzing:** 🔴🟡 flow op **`transcripts.created_at`**, NIET op het moment waarop de samenvatting draaide. Zie **§8** — dit is het bevestigde attributie-probleem: een later gedraaide of geregenereerde samenvatting valt op de transcript-datum (mogelijk een al bevroren dag).
6. **Scope:** aggregaat (kostensom). Correct qua pooling.
7. **Aannames/zwakke plekken:** regenerate overschrijft `ai_summary_usage` → historische COR verschuift; summary van een oud transcript telt nooit mee in de al-gedraaide snapshot. Zie §8.

### 2.7 COR-driver: RAG export
1. **Naam:** "RAG export".
2. **Formule:** `cor_rag = 0` (hardcoded).
3. **Bron:** geen — vaste 0 in `_geld_scope`.
4. **Driver:** RAG-credits (`consumed_by_type.rag`) zichtbaar in Credits-kolom, maar Cost is per definitie 0.
5. **Tijdstoewijzing:** n.v.t.
6. **Scope:** n.v.t.
7. **Aannames/zwakke plekken:** 🟡 aanname dat RAG-export €0 aan externe kosten heeft. Als RAG ooit een betaalde LLM/embedding-call doet, is dit stil fout.

### 2.8 COR-driver: Storage (R2)
1. **Naam:** "Storage (R2)".
2. **Formule:** `cor_storage = max(0, GB − r2_free_gb) × r2_usd_per_gb_month × usd_eur_rate × (dagen_in_periode / dagen_in_maand)`, met `GB = Σ user_credits.library_bytes / 1e9` over externe users. Credits/€per-credit = "—".
3. **Bron:** `user_credits.library_bytes` (alleen externe users), `cost_config` R2-tarieven.
4. **Driver:** opgeslagen bytes (👁️, wel als `storage_bytes` in de block maar niet in de COR-tabel getoond).
5. **Tijdstoewijzing:** 🟡 **stock geprorateerd naar flow** — huidige `library_bytes` (as-of nu) × (periodedagen/maanddagen). Gebruikt de HUIDIGE opslagstand, niet de stand tijdens de periode.
6. **Scope:** alleen external; bij internal is storage 0. Aggregaat over externe library — correct.
7. **Aannames/zwakke plekken:** proratering veronderstelt constante opslag over de maand; backfill van oude periodes gebruikt de huidige bytes (niet reconstrueerbaar). Volledig tegen omzet (geen share) — zie §2.2.

### 2.9 Cache-subregel (AI transcription / Auto-captions)
1. **Naam:** "34% from cache · saved €X" onder de twee methoderijen.
2. **Formule:**
   - AI: `pct = hit_jobs / total_jobs`; `saved_eur = hit_credits × (cor_ai / miss_credits)` — bespaarde credits gewaardeerd tegen de gemiddelde kost/credit van de misses.
   - Caption: `pct = hit_count / total_count`; `saved_eur = (hit_count × gem_miss_bytes / 1e9) × decodo_eur_per_gb`.
3. **Bron:** AI uit `transcription_jobs` (`cache_hit`, `credits_cost`, count); caption uit `usage_logs` (`cache_hit`, `proxy_bytes`).
4. **Driver:** hit/miss-aantallen + credits/bytes (👁️ deels; pct wel afleesbaar uit de tekst).
5. **Tijdstoewijzing:** flow op resp. `transcription_jobs.created_at` / `usage_logs.created_at`.
6. **Scope:** aggregaat. Correct (tel- en kostensom).
7. **Aannames/zwakke plekken:** 🟡 `saved_eur` is een **contrafeitelijke schatting** (wat het gekost zou hebben zonder cache), geen gemeten uitgave. AI-waardering deelt door `miss_credits`; bij 0 misses → 0.

### 2.10 Gross profit + marge
1. **Naam:** "Gross profit", label "margin X%".
2. **Formule:** `gross_profit = recognized_revenue − cor_against_revenue`; `gross_margin = gross_profit / recognized_revenue` (of `null` als revenue 0).
3. **Bron:** `admin_finance_summary` `v_gross`.
4. **Driver:** samengesteld. 👁️
5. **Tijdstoewijzing:** flow.
6. **Scope:** 🔴 erft het COR-pooling-risico (§2.2).
7. **Aannames/zwakke plekken:** kleur groen alleen bij positief, rood bij negatief (correct); marge `null` bij 0 omzet toont "—".

### 2.11 Operating expenses (OPEX-regel)
1. **Naam:** "Operating expenses".
2. **Formule:** `measured_opex.total + (external ? entered_opex_total : 0)`, met `measured_opex.total = goodwill + funnel_loggedin + funnel_anon + radar_fee`. **Stripe-fee zit hier NIET meer in** — die is COR geworden (§2.14, ADR-063).
3. **Bron:** `_geld_scope` (goodwill, funnel_loggedin) + `admin_finance_summary` (funnel_anon, radar_fee) + `opex_accrual` (entered).
4. **Driver:** samengesteld (bytes, fee, ingevoerde bedragen). 👁️
5. **Tijdstoewijzing:** measured = flows; entered = accrual over `[from_d,to_d)`.
6. **Scope:** measured per scope; entered **alleen external** (dubbeltelling voorkomen).
7. **Aannames/zwakke plekken:** goodwill erft de COR-splitsing (§2.12). Bij internal-toggle telt entered niet mee (bewust).

### 2.12 OPEX-rij: Goodwill — granted credits used
1. **Naam:** "Goodwill — granted credits used".
2. **Formule:** `granted_delivery_cost = Σ_user Σ_methode (user_period_cor_methode × (1 − user_period_share))`. De leverkosten van gratis verbruikte credits, per user.
3. **Bron:** `_geld_scope` `v_granted_deliv` (= `v_goodwill`, de per-user som).
4. **Driver:** dezelfde COR-drivers × (1−user_share). 👁️
5. **Tijdstoewijzing:** flow × periode-share (per user).
6. **Scope:** ✅ **per-user** — spiegelbeeld van §2.2, nu correct. Sluit per constructie: `Σ_user(user_cor×share) + Σ_user(user_cor×(1−share)) = Σ_user user_cor = volle COR` (excl. storage/fee). Bewezen: A/B-test goodwill €10 (A's volle COR, share 0).
7. **Aannames/zwakke plekken:** de fee draagt geen goodwill-deel (granted credits kosten geen Stripe-fee); goodwill dekt alleen de leverkosten (AssemblyAI/Decodo/DeepSeek/opslag).

### 2.13 OPEX-rijen: Free-caption funnel (logged-in / anonymous)
1. **Naam:** "Free-caption funnel — logged-in" / "— anonymous".
2. **Formule:**
   - logged-in: `funnel_free_caption_cost = (Σ proxy_bytes waar credits_used=0 / 1e9) × decodo_eur_per_gb` (uit `usage_logs`, per scope).
   - anonymous: `(Σ daily_cost_counters.caption_proxy_bytes / 1e9) × decodo_eur_per_gb` (alleen external).
3. **Bron:** `usage_logs` (logged-in gratis captions) resp. `daily_cost_counters` (anonieme captions, geen user).
4. **Driver:** gratis caption-egress-bytes (👁️).
5. **Tijdstoewijzing:** logged-in = flow op `usage_logs.created_at`; anon = flow op `daily_cost_counters.day` (Amsterdam-dag).
6. **Scope:** logged-in per scope (via `is_internal_at_time`); anon alleen external (anonieme users hebben geen `is_internal`). Aggregaat — correct.
7. **Aannames/zwakke plekken:** anon draait op dag-grain (`day`), de rest op timestamptz — kleine dag-randverschillen. Anon-teller is globaal (geen scope-splitsing mogelijk).

### 2.14 COR-component: Payment processing (Stripe-fee) — verplaatst van OPEX naar COR
1. **Naam:** "Payment processing (Stripe)" — nu een **COR**-regel onder de COR-tabel (§2.3), niet meer een OPEX-rij.
2. **Formule (ADR-063, F22):** de fee wordt **per aankoop-lot** gedefereerd. Per lot `fee_pc = stripe_fee / amount`; bij FIFO-consumptie van gekochte credits `recognized_fee += verbruikt × fee_pc`; het restant van elk lot → `deferred_fee`. `recognized_fee` telt in `cor_against_revenue` (§2.2); `deferred_fee` staat in de Deferred-kaart (§4.x). `purchased_fee = recognized_fee + deferred_fee` = de totale fee van de lots.
3. **Bron:** `_recognize_asof` (`recognized_fee`, `deferred_fee`, `purchased_fee` — per-user, uit `metadata.stripe_fee` per lot). `by_type` uit `credit_transactions.metadata.fee_details`.
4. **Driver:** fee per charge (👁️), toegewezen naar rato van verbruikte vs. openstaande gekochte credits.
5. **Tijdstoewijzing:** ✅ **revenue-matched** — de fee valt boekhoudkundig bij het verbruik van de gekochte credits (net als de omzet), niet meer volledig bij de sale. Timing-valkuil van F22 opgelost: de fee defert mee met de deferred omzet.
6. **Scope:** per-user (via `_recognize_asof`), gesommeerd per scope. **Géén share, géén goodwill** — granted credits dragen geen fee.
7. **Aannames/zwakke plekken:** 🟡 de `balance_transaction` settle't async → een net-verkochte charge kan nog `stripe_fee=0` hebben tot het reconcile-pad (`/api/admin/reconcile-stripe-fees`) draait; dan is de recognized/deferred fee voor die charge tijdelijk 0. De on-demand **invoicing-fee** zit hier NIET in (out-of-band factuur, ADR-053) → hoort als aparte **entered**-regel. **Let op:** de bankkaart (§3.2) toont nog de **volle cash-fee** bij verkoop (`bank.stripe_fee`) — dat is bewust: de bank-brug laat de echte kasstroom zien (fee valt cash bij de sale), terwijl de P&L de fee revenue-matcht. Twee verschillende vragen, twee getallen.

### 2.14b OPEX-rij: Fraud screening (Radar)
1. **Naam:** "Fraud screening (Radar)" (alleen getoond als `radar.screens > 0`).
2. **Formule:** `radar_fee = billable_screens × cfg.radar_eur_per_screen`, waarbij `screens = geslaagde charges (credit_transactions) + gescreende mislukte pogingen (payment_attempts.screened)` en `billable = screens met datum ≥ cfg.radar_free_until` (free-trial-pogingen tellen niet).
3. **Bron:** `payment_attempts` (mislukt/geblokkeerd, gelogd op `charge.failed`) + `credit_transactions` (geslaagd); tarief uit `cost_config.radar_eur_per_screen` (RfFT standaard-pricing €0,02) + `radar_free_until` (2026-08-15).
4. **Driver:** aantal gescreende pogingen, uitgesplitst `successful · declined · blocked`, × tarief — **volledig zichtbaar** in de hint (bv. "12 screened (9 ok · 2 declined · 1 blocked) × €0,02 · free until 2026-08-15").
5. **Tijdstoewijzing:** flow op poging-/verkoopdatum. **Nooit COR** (fraudekost valt bij de poging, niet bij levering).
6. **Scope:** business-wide → **alleen external** (geblokkeerde/mislukte pogingen zijn niet aan een user te koppelen; toggle mag niet dubbeltellen). Internal = €0.
7. **Aannames/zwakke plekken:** 🟡 de `radar_free_until` (2026-08-15) is een door de eigenaar opgegeven free-trial-einddatum, geen gemeten waarde. **Controlemogelijkheid (niet gebouwd):** reconcileerbaar tegen Stripe's **Fees report** (Reports → All Fees), die data toont **96u** na balans-impact — daar staan de echte Radar-per-screen-fees. Base-Radar-ML is gratis; de €0,02 is het Radar-for-Fraud-Teams standaard-pricing-tarief (custom rules vereisen RfFT). Detectie dat de landguard werkt: `blocked`-pogingen verschijnen hier én landen-bij-naam in Revenue-by-region (ADR-062).

### 2.15 OPEX-rijen: entered (infra / ads / eenmalig)
1. **Naam:** de ingevoerde categorieën (bv. "Infrastructure", "Ads") met hint "€300 / month · 14 of 31 days".
2. **Formule (`opex_accrual`):**
   - `monthly` + `evenly`: dagtarief `= amount / dagen_in_kalendermaand`; regelbedrag `= overlap_dagen × dagtarief`.
   - `none` + `evenly`: dagtarief `= amount / dagen_in_occurrence`.
   - `single`: volledig `amount` op de ankerdag (occurrence-start) als die in `[from,to)` valt.
3. **Bron:** `opex_expenses` (`amount`, `recurrence`, `spread`, `effective_from/to`, `category`, `description`/`note`).
4. **Driver:** ingevoerd bedrag + datums + verdeelregel — **volledig zichtbaar** in de hint (bedrag + "X of Y days").
5. **Tijdstoewijzing:** accrual, gesneden op `[from_d,to_d)` (Amsterdam-dag). Flow.
6. **Scope:** **alleen external** (`opex_accrual` is scope-loos, wordt enkel op external opgeteld).
7. **Aannames/zwakke plekken:** `monthly evenly` deelt door kalendermaand-dagen (28–31) → dagtarief varieert per maand. Prijswijziging = nieuwe reeks (changed-from-this-month), anders herschrijf je history (ADR-060).

### 2.16 Net profit + marge (statement-slot)
Zelfde getal als §1.1; marge `net_margin = net_profit / recognized_revenue`. Kleur groen bij positief, rood bij negatief. Erft alle onderliggende zwakke plekken.

---

## Sectie 3 — Kaart "Where the cash sits"

### 3.1 Charged to customers
1. **Naam:** "Charged to customers (settlement €)".
2. **Formule:** `bank.charged = Σ COALESCE(settlement_amount, amount_paid)` over distinct `stripe_session_id` in de periode. Sinds 2026-07-15 in **settlement-EUR** (P4): `settlement_amount = balance_transaction.amount` (presentment × exchange_rate). Presentment (`amount_paid`+`currency`) blijft als info bewaard.
3. **Bron:** `credit_transactions.metadata.settlement_amount` (fallback `amount_paid`).
4. **Driver:** aantal sales × settlement-bedrag (👁️ aantal niet los getoond).
5. **Tijdstoewijzing:** flow op `created_at` (verkoopdatum).
6. **Scope:** aggregaat per scope. Correct (som van charges).
7. **Aannames/zwakke plekken:** één valutabron (EUR) — voorkomt dat een USD-sale presentment-dollars van settlement-euro's aftrekt (bewezen met gesimuleerde USD-sale). BTW-inclusief bruto (Adaptive Pricing / prijs uit `pricing.ts`).

### 3.2 − Stripe fee
Zelfde bron/scope als §2.14 (`bank.stripe_fee = Σ metadata.stripe_fee`). 🟡 kan €0 zijn vóór reconcile.

### 3.3 = Settled to your bank
1. **Naam:** "= Settled to your bank".
2. **Formule:** `net_settlement > 0 ? net_settlement : (charged − fee)`. In gewone taal: wat er echt op de bank landt; als Stripe's `net` bekend is gebruik die, anders reken charged − fee.
3. **Bron:** `metadata.net_settlement` (uit `balance_transaction.net`) met fallback `charged − fee`.
4. **Driver:** charges + fees (👁️).
5. **Tijdstoewijzing:** flow (verkoopdatum).
6. **Scope:** aggregaat per scope.
7. **Aannames/zwakke plekken:** fallback `charged − fee` klopt alleen als fee bekend is; bij niet-gereconcilieerde fee=0 toont settled = charged (te hoog).

### 3.4 VAT — owed to the tax office
1. **Naam:** "VAT (owed to tax office)".
2. **Formule:** getoond als `vat_computed ? vat_owed : "not computed"`, met `vat_owed = Σ metadata.amount_tax` en `vat_computed = bool_or(amount_tax > 0)`.
3. **Bron:** `credit_transactions.metadata.amount_tax` (uit `session.total_details.amount_tax`).
4. **Driver:** BTW per sale (👁️).
5. **Tijdstoewijzing:** flow (verkoopdatum).
6. **Scope:** aggregaat per scope.
7. **Aannames/zwakke plekken:** sinds 2026-07-15 rekent de Checkout Session BTW (§7). `vat_owed = Σ amount_tax × exchange_rate` (settlement-EUR). `vat_computed = (vat_unmeasured_count = 0)` — false zodra er sales zonder gemeten BTW in de periode zitten; dan toont de UI "not computed" plus een waarschuwing met exact aantal + gross (`vat_unmeasured`). Historische 2 sales blijven onbekend tot ze een `invoice_tax` krijgen; nieuwe sales dragen Stripe's berekende BTW.

### 3.5 Revenue (ex-VAT)
1. **Naam:** "Revenue ex-VAT (delivered + deferred)".
2. **Formule:** `bank.revenue_ex_vat = charged − vat`.
3. **Bron:** §3.1 + §3.4.
4. **Driver:** charges − BTW.
5. **Tijdstoewijzing:** flow.
6. **Scope:** aggregaat per scope.
7. **Aannames/zwakke plekken:** zolang `vat=0` is `revenue_ex_vat = charged` — inclusief de niet-afgezonderde BTW. Wordt pas juist als §7 is opgelost.

---

## Sectie 4 — Kaart "Deferred"

### 4.1 Balance (ex-VAT)
1. **Naam:** "Balance (ex-VAT)".
2. **Formule:** `deferred.balance = deferred_revenue` = Σ (onverbruikte aankoop-lots × lot_€/credit), per-user (as-of `to`).
3. **Bron:** `_recognize_asof` (`deferred`).
4. **Driver:** openstaande gekochte credits × €/credit (👁️ €/credit).
5. **Tijdstoewijzing:** **stock** (as-of `to`, cumulatief).
6. **Scope:** ✅ per-user gesommeerd.
7. **Aannames/zwakke plekken:** ex-BTW mits BTW correct vastligt (nu 0, §7). Invariant `recognized + deferred = purchased_net` per user.

### 4.2 Credits outstanding
1. **Naam:** "Credits outstanding".
2. **Formule (F1b, ADR-063):** `deferred.credits = Σ lot_rem` — de **echte som van onverbruikte credits per aankoop-lot**, direct uit de FIFO-lus. Niet meer teruggerekend uit een blended €/credit.
3. **Bron:** `_recognize_asof` (`deferred_credits`), doorgegeven via `_geld_scope`/`admin_finance_summary`.
4. **Driver:** de resterende credits van elk nog-niet-volledig-verbruikt aankoop-lot.
5. **Tijdstoewijzing:** stock (as-of `to`).
6. **Scope:** ✅ **per-user** — elke user zijn eigen lot-restanten, gesommeerd. Geen blending meer.
7. **Aannames/zwakke plekken:** exact (hele credits per lot, geen afronding/blending). Bewezen (Try 100 + Plus 1000, 400 verbruikt): echt 700 vs. de oude blended terugrekening 641,7 — een 8,3%-fout bij twee tiers die nu weg is.

### 4.2b Deferred Stripe fee
1. **Naam:** "Deferred Stripe fee".
2. **Formule:** `deferred.deferred_fee = Σ lot_rem × lot_fee_pc` — de fee op de nog-onverbruikte gekochte credits (spiegel van `recognized_fee`, §2.14). `recognized_fee + deferred_fee = purchased_fee`.
3. **Bron:** `_recognize_asof` (`deferred_fee`), via `admin_finance_summary` `deferred.deferred_fee`.
4. **Driver:** openstaande gekochte credits × fee/credit per lot.
5. **Tijdstoewijzing:** stock (as-of `to`).
6. **Scope:** ✅ per-user gesommeerd.
7. **Aannames/zwakke plekken:** wordt herkend (naar COR) zodra die credits verbruikt worden; tot dan een uitgestelde kost naast de deferred omzet.

### 4.3 Est. cost to deliver
1. **Naam:** "Est. cost to deliver" (badge "est").
2. **Formule:** `est_future_cost = deferred.credits × avg_cpc`, met `avg_cpc = recent_cor_total / recent_consumed` over de laatste `window_days` (default 90) — de recente gemiddelde kost per credit.
3. **Bron:** `admin_finance_summary` roept `_geld_scope(scope, to − window, to)` → `cor.total` en `consumed_cr`.
4. **Driver:** recente COR ÷ recent verbruik × openstaande credits (👁️).
5. **Tijdstoewijzing:** stock (openstaande credits) × recente-flow-ratio.
6. **Scope:** 🔴🟡 **aggregaat** — `avg_cpc` is scope-breed over het recente venster; mengt alle users' verbruiksmix. Als de openstaande credits een andere mix hebben dan het recente scope-gemiddelde, is de schatting scheef.
7. **Aannames/zwakke plekken:** expliciet een **schatting**. Bij geen recent verbruik → `avg_cpc = 0` → €0 kostenschatting.

### 4.4 Est. future gross
1. **Naam:** "Est. future gross".
2. **Formule:** `est_future_gross = deferred_balance − est_future_cost`.
3. **Bron:** §4.1 − §4.3.
4. **Driver:** afgeleid.
5. **Tijdstoewijzing:** stock.
6. **Scope:** erft §4.3.
7. **Aannames/zwakke plekken:** schatting (erft §4.3).

### 4.5 "last N days" / window
`deferred.window_days` uit `finance_settings.deferred_window_days` (default 90). Config, geen berekening.

---

## Sectie 5 — Trend

### 5.1 Trend-balken (Revenue / Net profit / Delivered-deferred)
1. **Naam:** de dagbalken + metric-toggle.
2. **Formule per dag:**
   - Revenue: `snapshot.revenue_delivered`.
   - Net: `snapshot.net_profit_measured − accrualForRange(entered, dag, dag+1)` (external; internal = geen entered-aftrek).
   - Split: `snapshot.revenue_delivered` (zelfde bron; segmentatie delivered/deferred).
3. **Bron:** tabel `finance_daily_snapshot` (bevroren, per `snapshot_date`+`scope`), plus **live** entered-overlay via `accrualForRange` (JS-spiegel van `opex_accrual`) over `expenses`.
4. **Driver:** dagsnapshot-waarden + ingevoerde kosten. 👁️ (onderliggende drivers zitten in de snapshot-kolommen, niet in de balk).
5. **Tijdstoewijzing:** snapshot = bevroren flow per Amsterdam-dag (`snapshot_finance_day`, pg_cron 02:00 UTC); entered = **live** overlay (niet bevroren). Daarom kan historische net verschuiven na een expense-edit (ADR-059, bedoeld).
6. **Scope:** per gekozen scope (external/internal); entered alleen external.
7. **Aannames/zwakke plekken:** `net_profit_measured` in de snapshot bevat GEEN entered-OPEX (die komt live erover) — de balk trekt entered dus apart af. `snapshot.revenue_delivered` is de recognitie zoals berekend op de snapshot-dag; door de per-user recognitie-fix zijn snapshots vanaf de fix-datum correct, oudere snapshots dragen de oude (mogelijk cross-user-pooled) waarde tot ze opnieuw gedraaid worden. 🔴 (historische snapshotrijen van vóór ADR-061). **Model-divergentie (open, follow-up F-item):** `snapshot_finance_day` berekent zijn `net_profit_measured` nog met het **oude model** — volle gemeten COR (niet against-revenue) **en de volle Stripe-fee bij de sale** (niet gedefereerd, ADR-063). De live-tab (`admin_finance_summary`) gebruikt against-revenue + fee-defer. De Trend-net wijkt daardoor af van de headline-net met (o.a.) `deferred_fee`. De snapshotfunctie leest alle `_geld_scope`-keys die nog bestaan → geen crash, maar de net-definitie moet nog gelijkgetrokken worden.

### 5.2 Trend lege staat
Bij < 2 snapshotrijen: tekst i.p.v. grafiek. Geen getal.

---

## Sectie 6 — Dwarsdoorsnede

### 6.1 Pooling-klasse (som terwijl de regel bij een individu hoort) — 🔴
| Getal | Status | Toelichting |
|---|---|---|
| `recognized_revenue`, `deferred_revenue`, `purchased_consumed` | ✅ opgelost | per-user via `_recognize_asof` (ADR-061). |
| `cor_against_revenue` (§2.2), per-methode split (§2.3), `granted_delivery_cost`/goodwill (§2.12) | ✅ **opgelost** | `Σ_user (user_period_COR × user_period_share)`, per-user periode-share (ADR-063, migratie `20260715163500`). Bewezen A/B: €0,01 against / €10 goodwill. |
| `deferred.credits` (§4.2) | ✅ **opgelost** | echte som van lot-restanten (`Σ lot_rem`), niet meer blended teruggerekend (ADR-063). |
| `est_future_cost` / `est_future_gross` (§4.3–4.4) | 🟡 benadering | scope-breed `avg_cpc` op de openstaande credits. |
| overige COR-drivers, funnels, fee, cash, vat | ✅ ok | pure kostensommen — geen per-wallet-logica vereist. |

### 6.2 Geschat vs gemeten
| Getal | Status |
|---|---|
| COR ai/caption/summary/rag-drivers, cache-pct, charged, fee, vat, recognized, deferred | 🟢 gemeten (mits onderliggende kolommen gevuld) |
| `saved_eur` (cache, §2.9) | 🟡 contrafeitelijke schatting |
| `cor_storage` (§2.8) | 🟡 stock geprorateerd, huidige bytes |
| `est_future_cost`/`est_future_gross` (§4.3–4.4) | 🟡 schatting |
| `cor_rag` = 0 (§2.7) | 🟡 aanname |
| `vat` / `vat_owed` (§3.4) | 🔴 niet berekend (structureel 0, §7) |
| `cor_ai_summary` tijdstoewijzing (§2.6) | 🟡 verkeerde datum (§8) |

### 6.3 Onzichtbare drivers (volume niet afleesbaar in UI) — 👁️
AssemblyAI-minuten, proxy-bytes (transcriptie én caption), DeepSeek-tokens, opslag-bytes (wel in block `storage_bytes`, niet in de COR-tabel), aantal sales achter charged/fee/vat, lot-€/credit achter recognized/deferred. **Wel** zichtbaar: credits per methode (COR-tabel), cache-pct (subregel), entered bedrag+datums (OPEX-hint).

---

## Sectie 7 — Status BTW

> **UPDATE 2026-07-15 — GEFIXT IN CODE (deploy live).**
> - **Checkout rekent BTW.** `checkout/route.ts`: `automatic_tax:{enabled:true}` + line-item
>   `tax_behavior:'inclusive'` + `product_data.tax_code:'txcd_10000000'`. Live geverifieerd op
>   checkout.stripe.com: DE €2,39 (19%) · NL/BE €2,60 (21%) · IT €2,70 (22%) · IE €2,80 (23%) · UK €0 ·
>   US "enter address" — totaal blijft overal €15, tarief komt uit het factuuradres. Adaptive Pricing
>   compatibel ([Stripe-doc](https://docs.stripe.com/tax/checkout/adaptive-pricing)).
> - **Eén BTW-bron.** `_sale_vat(m)` beslist per sale de BTW én de meet-status: `tax_status='complete'`
>   → `amount_tax × exchange_rate` (ook een gemeten 0); anders `invoice_tax`; anders `unknown`. `_geld_scope`
>   (vat + measured + `vat_by_country`) én `_recognize_asof` (net_lot) roepen dezelfde functie aan — geen
>   enkele lezer bouwt nog zijn eigen BTW-expressie. Bewezen (3 sales, 2 users): een sale met alleen
>   `invoice_tax` telt die BTW nu óók in het net_lot af (was: measured=true maar omzet BTW-inclusief).
> - **Per-land VAT-blok** (`vat_buckets`): NL (eigen btw-aangifte) · overige EU (OSS/Unieregeling) ·
>   buiten EU-scope (€0) · onbekend land (apart, niet bij NL). Expliciete EU-lidstatenlijst in SQL; GB
>   valt in "outside" (Brexit). "not computed" is weg: de bankkaart toont de som over **measured**, met
>   een eigen regel voor de onbekende sales (count + gross).
> - **P&L in settlement-EUR** (§2.1/§3.1): `net = settlement_amount − _sale_vat(m).vat`.
> - **Dood veld `vat_known` verwijderd** (werd nergens gerenderd; `vat_measured_all`/`vat_unmeasured` dragen
>   nu de meet-status).
>
> **P4-status genuanceerd (eerlijk):** de eerdere "USD-simulatie" was een **verzonnen én onmogelijk**
> scenario — een US-particulier betaalt geen EU-BTW, dus die €1,60 VAT kan niet bestaan. De settlement-
> valuta-**rekenregel** is daarmee **rekenkundig geverifieerd** (charged = settlement, net = settlement − vat,
> sluit), maar **end-to-end open tot een echte niet-EUR-sale**. Fiscale grondslag (bron: Belastingdienst,
> *digitale diensten*): digitale diensten aan **particulieren** zijn belast in het **land van de klant** →
> **US-B2C = buiten EU-btw-scope, €0 is correct en volledig**. **UK-B2C = 20% UK VAT verschuldigd vanaf de
> eerste verkoop** (HMRC NETP-regime, geen drempel voor niet-gevestigde verkopers) — een **openstaande
> verplichting**, geen codeprobleem; de landguard volgt in een aparte taak.
>
> **Live-key-constraint:** de 2 bestaande sessions ophalen (Punt 4) en de backfill (Punt 5) vereisen de
> **live** Stripe-key (lokaal is alleen `sk_test`). De mechaniek staat in `reconcile-stripe-fees` (dumpt de
> sessiestructuur + backf't `tax_status`/`customer_country`/`invoice_tax` via de gedeelde `extractSessionTax`);
> de admin triggert `POST /api/admin/reconcile-stripe-fees` één keer (geen aankoop) → verwacht `unknown → 0`.

**Oorspronkelijke bevinding (bevestigd uit de code — de asymmetrie was echt):**

- **Checkout Session** (`apps/app/src/app/api/stripe/checkout/route.ts:41–80`): de sessie wordt aangemaakt **zonder** `automatic_tax`, **zonder** `tax_behavior`, **zonder** `tax_code` op `price_data`. Alleen `billing_address_collection:'required'`, `customer_update:{address,name}`, `tax_id_collection:{enabled:true}`. Gevolg: `session.total_details.amount_tax = 0`.
- **Webhook** (`apps/app/src/app/api/stripe/webhook/route.ts:76–77`): leest `session.total_details.amount_tax` correct en schrijft `metadata.amount_tax = amountTax/100` — maar die waarde is 0. Geen webhook-bug; de sessie levert niets aan.
- **Invoice** (`apps/app/src/app/api/stripe/invoice/route.ts:91,112,114,125–128`): de on-demand factuur draait **wél** op `automatic_tax:{enabled:true}` + line-item `tax_behavior:'inclusive'` + `tax_code:'txcd_10000000'`, daarna `finalizeInvoice` + `pay(paid_out_of_band:true)`.

**Conclusie:** Stripe Tax staat aan op de **factuurroute**, niet op de **checkout-sessie**. Daardoor is er wél een BTW-uitsplitsing op een (achteraf) gegenereerde factuur, maar niet op de sale zelf — en de Finance-capture leest de sale.

**Voor de hand liggende fix (NIET uitgevoerd, vereist akkoord):** geef de Checkout Session hetzelfde als de factuur al doet — `automatic_tax:{enabled:true}` en op het line-item/product `tax_behavior:'inclusive'` + `tax_code:'txcd_10000000'` (prijzen zijn BTW-inclusief, ADR-052).

**Wat dat verandert:**
- BTW wordt **op checkout** berekend → `session.total_details.amount_tax` > 0 → capture legt echte BTW vast → §3.4/§3.5 en de recognitie/deferred (§2.1, §4.1) worden BTW-zuiver.
- **Stripe Tax-kosten vallen per transactie** (Stripe rekent Tax-fee per berekende sessie) i.p.v. alleen per factuur — een nieuwe measured kostenpost op de sale.
- **Adaptive Pricing:** inclusive tax + automatic_tax kan interfereren met Adaptive Pricing (valuta-omrekening) — gedrag verifiëren; mogelijk moet één van beide wijken.
- **OSS-aangifte:** wordt pas bouwbaar zodra BTW per sale wordt vastgelegd (land-tarief per klant). Dit vereist dat de **OSS-registratie** en de juiste **Tax-registraties per land** in Stripe Tax actief zijn — controleren of die ontbreken vóór activering, anders rekent Stripe 0% of het verkeerde tarief.

**Registraties:** te bevestigen dat Stripe Tax + OSS-registraties bestaan; zonder registratie levert `automatic_tax` geen correcte heffing. Niets wijzigen zonder akkoord.

---

## Sectie 8 — Status AI-summary-COR-attributie (rapport, niet fixen)

**Bevestigd uit de code:** in `_geld_scope` leest het COR-summary-blok:
```
FROM public.transcripts
WHERE ai_summary_usage IS NOT NULL AND user_id = ANY(users)
  AND created_at >= p_from AND created_at < p_to
```
De DeepSeek-COR valt dus op **`transcripts.created_at`** — het moment waarop het transcript is aangemaakt — niet op het moment waarop de samenvatting draaide.

**Wat er misgaat:**
- Een samenvatting die **later** draait dan het transcript (user vat een oud transcript samen, of regenereert) krijgt zijn COR toegewezen aan de **transcript-datum**. Draait die samenvatting in september op een juli-transcript, dan landt de kost in juli — een dag die de nachtelijke snapshot **al bevroren** heeft → de kost telt nooit mee in de snapshot, en in de live-tab valt hij in de juli-periode i.p.v. september.
- **Regenerate overschrijft** `transcripts.ai_summary_usage` → de historische COR van die transcript-dag verandert met terugwerkende kracht (live-tab), terwijl de snapshot de oude waarde vasthoudt → drift tussen tab en trend.

**Afwijking van het plan:** het oorspronkelijke plan (Deel B1) schreef expliciet voor om AI-summary-COR te attribueren op **de `ai_summary`-debit-`created_at`** (join naar `transcripts.ai_summary_usage` voor de tokens). De code doet dit **niet** — hij gebruikt `transcripts.created_at`. **Code ≠ plan; de code is hier de waarheid en dit is de discrepantie.**

**Fix (nog niet gebouwd):** attribueer de summary-COR op het tijdstip van de `ai_summary`-debit in `credit_transactions` (`type='debit' AND product_type='ai_summary'`), en haal de tokens via de transcript erbij. Dan valt de kost op het moment dat DeepSeek daadwerkelijk draaide, en een regenerate wordt een nieuw event op zijn eigen datum i.p.v. een retroactieve overschrijving. Caveat uit het plan blijft: als tokens alleen op de transcript-rij staan (en regenerate overschrijft), is een aparte per-run-tokenlog nodig om regenerate-COR volledig honest te maken.

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

### 1.3 Revenue (groot getal) — ✅ F4 (2026-07-15)
1. **Naam:** "Revenue".
2. **Formule:** `revenue_delivered` (alléén). In gewone taal: de ex-BTW omzet die déze periode geleverd (erkend) is. **Was** `revenue_delivered + deferred_balance` (flow + stock) — flow/stock-menging opgeheven in F4.
3. **Bron:** `admin_finance_summary` block `revenue_delivered` (uit `_geld_scope`).
4. **Driver:** gekochte credits × €/credit. Credits zichtbaar elders (credits_sold), €/credit niet. 👁️
5. **Tijdstoewijzing:** flow over `[from,to)`. Optelbaar. Sluit nu aan op de delta (§1.4), die op hetzelfde flow-getal rekent.
6. **Scope:** per-user gesommeerd (via `_recognize_asof`).
7. **Aannames/zwakke plekken:** geen flow/stock-menging meer. Deferred staat als aparte stand-nu (§1.5), niet in dit getal.

### 1.4 Revenue — delta
Zelfde mechaniek als §1.2, `delta(revenue_delivered_now, revenue_delivered_prev)`. Sinds F4 rekent de delta op **hetzelfde** flow-getal dat erboven staat (§1.3 = `revenue_delivered`) — de eerdere basis-mismatch is opgeheven. ✅

### 1.5 Deferred obligation · held now
1. **Naam:** "Deferred obligation · held now €Y".
2. **Formule:** `deferred_balance`, getoond als losstaande stand-nu-regel (sunken box), **niet** als proportioneel balksegment naast delivered. De oude `SplitBar` (delivered/deferred-segmenten die één balk vulden → suggereerde een som) is verwijderd in F4.
3. **Bron:** `admin_finance_summary` block `deferred_balance`.
4. **Driver:** €-waarde zelf.
5. **Tijdstoewijzing:** stock (as-of `to`, cumulatief) — bewust apart van de flow-hero.
6. **Scope:** per-user gesommeerd.
7. **Aannames/zwakke plekken:** geen — de stand-nu is expliciet als stock gelabeld en wordt nergens bij de flow opgeteld.

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
2. **Formule:** `cor_against_revenue = Σ_user Σ_methode (user_period_cor_methode × user_period_share) + recognized_fee`, waarbij `methode` nu óók **storage** omvat (F3, 2026-07-16). In gewone taal: het deel van de leverkosten dat aan betaalde (erkende) omzet is toe te rekenen — **per user** opgeteld (incl. storage per byte-aandeel × share), plus de gedefereerd-herkende Stripe-fee. Het granted-deel gaat naar OPEX (goodwill).
3. **Bron:** `_geld_scope` (`v_cor_rev` = `v_ar_ai + v_ar_cap + v_ar_sum + v_ar_sto + v_recognized_fee`). De per-user COR-per-methode komt uit een `GROUP BY user_id`-query over `transcription_jobs`/`usage_logs`/`ai_summary_usage_log`; per-user storage = `cor_storage_totaal × user_bytes/total_bytes` (§2.8); de per-user share uit `_recognize_asof.by_user` (`rec_to − rec_from`, periode). `admin_finance_summary` leest storage sinds F3 uit `_geld_scope` (niet meer flat toegevoegd).
4. **Driver:** AssemblyAI-minuten + Decodo-bytes + DeepSeek-tokens + opslag-GB, × tarieven, × per-user-share. 👁️ (drivers niet in UI).
5. **Tijdstoewijzing:** COR-termen zijn flows op elk hun eigen event-tijdstip (§2.4–2.7); de per-user share is óók **periode**-scoped (`by_user` as-of `to` minus as-of `from`) — flow × flow, niet meer flow × all-time-stock.
6. **Scope:** ✅ **per-user** (ADR-063, migratie `20260715163500`). `Σ_user (user_COR × user_share)`, elke user zijn eigen periode-share. Was de 🔴 pooling-bug: user A verbruikt 100 granted credits voor €10 COR (share 0), user B 100 purchased voor €0,01 (share 1) → nu juist: against-revenue €0,01 / goodwill €10 (oude gepoolde formule gaf share 0,5 → €5,00/€5,00). Bewezen met reversibele A/B-test.
7. **Aannames/zwakke plekken:** ✅ storage wordt sinds F3 **per user** geattribueerd (byte-aandeel × share), niet meer flat volledig tegen omzet — het gratis-gebruikers-deel valt nu correct in goodwill. `recognized_fee` is revenue-matched (geen share, geen goodwill — granted credits dragen geen fee). **NULL-valkuil (opgelost, zie LESSONS 2026-07-15):** de per-user COR-subqueries wrappen elke `sum()` in `COALESCE(...,0)`; zonder dat werd `sum(dur)*rate + sum(bytes)*rate` NULL zodra `proxy_bytes` volledig NULL was voor een user, wat diens duur-kost stil liet vallen. Caption-COR-nauwkeurigheid hangt af van gevulde `proxy_bytes` (§2.5).

### 2.3 COR-tabel — per methode: Cost (optie ii, volle kost)
1. **Naam:** kolommen "Cost / Credits / € per credit" per rij (AI transcription / Auto-captions / AI summary / RAG / Storage), plus de rij "Total measured COR".
2. **Formule (Aanvulling 3, Khidr's keuze):** de tabel toont de **VOLLE kost** per methode zodat de rij vermenigvuldigt. `Cost = cor[k]` (volle gemeten COR), `Credits = consumed_by_type[k]` (alle verbruikte credits), `€/credit = cor[k] / credits` → `Credits × €/credit = Cost`. De against-revenue/goodwill-splitsing staat als **aparte regel eronder** ("of which against revenue €X · goodwill €Y"), niet in de kolommen. De Stripe-fee heeft een eigen regel (recognised/deferred).
3. **Bron:** `admin_finance_summary` `cor.<k>` (volle kost) + `cor.against_revenue_by_method` (voor de split-regel) + `cor.payment_fee` (fee-regel).
4. **Driver:** per methode het volume × tarief (zie §2.4–2.8). ✅ **Sinds F15 (2026-07-16) getoond als sub-regel** `driver × tarief = bedrag` onder elke methode-badge, zodat de rij narekenbaar is zonder de code te openen. Vaste kolombreedtes (`grid-cols-[minmax(0,1fr)_5.5rem_5rem_7rem]`) + `tabular-nums` → Cost/Credits/€per-credit staan op een vaste x-positie ongeacht de celinhoud. De verwijderde-in-F15 "playlists"-voetregel (algemene toelichting, verklaarde geen tabelgetal) is geschrapt; de against/goodwill-split, de Stripe-fee-regel en de RAG-aanname (verklaart de €0) blijven.
5. **Tijdstoewijzing:** flow (methode-event-tijd); de split-regel eronder gebruikt de per-user against (§2.2).
6. **Scope:** volle kost = aggregaat (pure kostensom, §2.4–2.8). De split-regel eronder is ✅ per-user (§2.2).
7. **Aannames/zwakke plekken:** de drie populaties die vroeger in één rij botsten (against-Cost × alle-credits × volle-€/credit) zijn ontkoppeld: de tabel toont nu één consistente populatie (volle kost), de splitsing is een losse regel. Storage-rij heeft geen per-credit-eenheid ("—").

### 2.4 COR-driver: AI transcription
1. **Naam:** onder "AI transcription" (Cost/Credits/€ per credit).
2. **Formule:** `cor_ai = (Σ duration_seconds / 60) × assemblyai_eur_per_min + (Σ proxy_bytes / 1e9) × decodo_eur_per_gb`. Credits-kolom = `consumed_by_type.ai_transcription`; €/credit = `cor_ai / credits`.
3. **Bron:** `transcription_jobs` (`duration_seconds`, `proxy_bytes`) waar `status='complete' AND cache_hit=false`; tarieven uit `cost_config`.
4. **Driver:** AssemblyAI-minuten + proxy-bytes + verbruikte credits. ✅ **Zichtbaar sinds F15** (2026-07-16): de COR-rij toont `X min × €/min + Z GB × €/GB = €bedrag` (min = `audio_seconds/60`, GB = `proxy_bytes/1e9`), narekenbaar tegen `cost_config`. Drivers komen uit `admin_finance_summary` `<scope>.drivers.ai_transcription` (`audio_seconds`, `proxy_bytes`).
5. **Tijdstoewijzing:** flow op `transcription_jobs.created_at`. 🟢 klopt (job draait ~bij creatie).
6. **Scope:** aggregaat (Σ over scope-users via `user_id = ANY(users)`). Correct: het is een pure kostensom, geen per-wallet-logica.
7. **Aannames/zwakke plekken:** `cache_hit=true`-jobs → COR 0 (bewust; master-cache-hit betaalt geen AssemblyAI/proxy). Nauwkeurig mits `duration_seconds`/`proxy_bytes` gevuld zijn.

### 2.5 COR-driver: Auto-captions
1. **Naam:** "Auto-captions".
2. **Formule:** `cor_caption = (Σ proxy_bytes waar credits_used>0 / 1e9) × decodo_eur_per_gb`. Credits = `consumed_by_type.caption`; €/credit = `cor_caption / credits`.
   **Prijsregel (geverifieerd 2026-07-15, audit-punt 8):** de caption-**credits** (`consumed_by_type.caption`) zijn **playlist-captions à 1 credit/video** — losse caption-extractie kost **0 credits** en schrijft geen debit. Bewijs: alle caption-debits hebben `amount=1`, `kind='settlement'`, en `metadata.playlist_id` (juli: 602/602; oudere rijen dragen `job_id`+`video_id` i.p.v. `playlist_id`, ook playlist). De COR-rij (bytes) en de credits (playlist-video-count) meten dus hetzelfde caption-verkeer vanaf twee kanten.
3. **Bron:** `usage_logs` waar `extraction_type='caption' AND success AND is_internal_at_time=scope`, filter `credits_used>0`.
4. **Driver:** Decodo caption-egress-bytes + caption-credits. ✅ **Zichtbaar sinds F15**: rij toont `Z GB × €/GB = €bedrag` (`drivers.caption.proxy_bytes/1e9`).
5. **Tijdstoewijzing:** flow op `usage_logs.created_at`. 🟢 klopt.
6. **Scope:** aggregaat op `is_internal_at_time` (point-in-time stempel). Correct (kostensom).
7. **Aannames/zwakke plekken:** `cor_caption_estimated` staat **hardcoded `false`** in de code — het getal presenteert zich als gemeten. Dat klopt alleen zolang `proxy_bytes` op élk caption-event (incl. playlist) echt gemeten is; oudere/niet-geïnstrumenteerde rijen met `proxy_bytes=0` verlagen de COR stilzwijgend. 🟡 (label zegt "gemeten", nauwkeurigheid afhankelijk van instrumentatie).

### 2.6 COR-driver: AI summary
1. **Naam:** "AI summary".
2. **Formule:** `cor_ai_summary = (max(prompt_tokens − cache_hit_tokens,0)/1000) × deepseek_eur_per_1k_input_tokens + (cache_hit_tokens/1000) × deepseek_eur_per_1k_cache_hit_tokens + (completion_tokens/1000) × deepseek_eur_per_1k_output_tokens`.
3. **Bron:** ✅ **`ai_summary_usage_log`** (insert-only per-run tokenlog: `prompt_tokens`, `completion_tokens`, `cache_hit_tokens`, `generated_at`) — sinds F2 (2026-07-16, ADR-064). `transcripts.ai_summary_usage` blijft bestaan als transcript-eigen record maar is **niet meer de COR-bron** (en wordt door de UI niet gelezen — geverifieerd).
4. **Driver:** DeepSeek-tokens. ✅ **Zichtbaar sinds F15**: rij toont `N in × €/1k [+ cache] + N out × €/1k = €bedrag` (`drivers.ai_summary.input_tokens/cache_tokens/output_tokens`; de drie DeepSeek-tarieven staan sinds F15 ook in `rates`).
5. **Tijdstoewijzing:** ✅ flow op **`generated_at`** (het moment waarop de samenvatting draaide) — niet meer op `transcripts.created_at`. Zie **§8** (opgelost). Zowel het scope-totaal als de per-user CTE lezen de log op `generated_at`.
6. **Scope:** aggregaat (kostensom) + per-user CTE (§2.2). Correct qua pooling.
7. **Aannames/zwakke plekken:** ✅ regenerate is niet langer destructief voor de COR — elke run is een aparte, onveranderlijke logrij op zijn eigen `generated_at`, dus 2 runs tellen 2× (i.p.v. de in-place-overschrijving die run 1 wegtelde). Zie §8.

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
2. **Formule:** `cor_storage = max(0, GB − r2_free_gb) × r2_usd_per_gb_month × usd_eur_rate × (dagen_in_periode / dagen_in_maand)`, met `GB = Σ bytes / 1e9` over externe users. Sinds F3 (2026-07-16, ADR-064) berekend **in `_geld_scope`** (niet meer flat in `admin_finance_summary`) en **per-user geattribueerd**: elk user-slice = `cor_storage_totaal × user_bytes/total_bytes`, gesplitst against-revenue (× share) vs goodwill (× 1−share), net als §2.4–2.6. Credits/€per-credit = "—".
3. **Bron:** byte-**serie** `daily_library_bytes` (per nacht per-user weggeschreven door `snapshot_finance_day`) als die het venster-begin dekt (`min(day) ≤ from`); anders terugval op `user_credits.library_bytes` (stand-nu) met `storage_approx=true`. `cost_config` R2-tarieven. De R2-gratis-tier (10 GB) is account-niveau; per-user attributie gebeurt op byte-aandeel ná de vrije-tier-aftrek.
4. **Driver:** opgeslagen bytes. ✅ **Zichtbaar sinds F15**: rij toont `G GB boven free_gb × €/GB·mo × usd_eur × dagen/maand = €bedrag`, of bij ≤ free-tier `G GB · within N GB free tier = €0` — dit verklaart de veelvoorkomende €0. Drivers uit `drivers.storage` (`gb`, `free_gb`, `days_win`, `days_month`).
5. **Tijdstoewijzing:** ✅ leest de **periode-stand** uit de byte-serie wanneer beschikbaar; tot dan stand-nu **met zichtbare `storage_approx`-markering** in de UI (Storage-rij) — geen stille stand-nu-voor-historie meer. De serie start bij de eerste cron-nacht na F3; oudere vensters blijven `approx` tot de serie ze dekt.
6. **Scope:** alleen external; bij internal is storage 0. Per-user over externe library — correct. **Impact nu = €0** (externe lib 122 KB « 10 GB gratis); de meting is gebouwd zodat de attributie klopt zodra de bibliotheek groeit, niet omdat het nu telt.
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
4. **Driver:** dezelfde COR-drivers × (1−user_share). ✅ **Zichtbaar sinds F15**: OPEX-rij toont `N granted credits × ~€/credit` (N = `drivers.goodwill.granted_credits` = verbruikt − purchased-verbruikt; €/credit = `goodwill / N`, gemengd tarief, daarom `~`).
5. **Tijdstoewijzing:** flow × periode-share (per user).
6. **Scope:** ✅ **per-user** — spiegelbeeld van §2.2, nu correct. Sluit per constructie: `Σ_user(user_cor×share) + Σ_user(user_cor×(1−share)) = Σ_user user_cor = volle COR` (excl. storage/fee). Bewezen: A/B-test goodwill €10 (A's volle COR, share 0).
7. **Aannames/zwakke plekken:** de fee draagt geen goodwill-deel (granted credits kosten geen Stripe-fee); goodwill dekt alleen de leverkosten (AssemblyAI/Decodo/DeepSeek/opslag).

### 2.13 OPEX-rijen: Free-caption funnel (logged-in / anonymous)
1. **Naam:** "Free-caption funnel — logged-in" / "— anonymous".
2. **Formule:**
   - logged-in: `funnel_free_caption_cost = (Σ proxy_bytes waar credits_used=0 / 1e9) × decodo_eur_per_gb` (uit `usage_logs`, per scope).
   - anonymous: `(Σ daily_cost_counters.caption_proxy_bytes / 1e9) × decodo_eur_per_gb` (alleen external).
3. **Bron:** `usage_logs` (logged-in gratis captions) resp. `daily_cost_counters` (anonieme captions, geen user).
4. **Driver:** gratis caption-egress-bytes. ✅ **Zichtbaar sinds F15**: beide rijen tonen `Z GB × €/GB` (`drivers.funnel_loggedin.proxy_bytes` resp. `drivers.funnel_anon.proxy_bytes`, ÷1e9). Anon-bytes komen uit `daily_cost_counters`, in `admin_finance_summary` aan `drivers` toegevoegd.
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
2. **Formule:** `radar_fee = billable_screens × cfg.radar_eur_per_screen`, waarbij `screens = geslaagde charges (credit_transactions) + gescreende mislukte pogingen (payment_attempts.screened)` en `billable = screens met datum ≥ cfg.radar_free_until` (free-trial-pogingen tellen niet). **Alleen externe scope; interne testverkopen uitgesloten** (✅ audit-fix 2026-07-15): de successful-screen-telling joint `profiles ... AND NOT is_internal`, de failed-screen-telling `LEFT JOIN profiles` met `NOT COALESCE(is_internal,false)` (null user = anoniem = extern → behouden). Vóór de fix lekten interne testsales als "successful screens" in de externe scope (2 → 0 na fix).
3. **Bron:** `payment_attempts` (mislukt/geblokkeerd, gelogd op `charge.failed`, `is_internal` uitgesloten) + `credit_transactions` (geslaagd, `is_internal` uitgesloten); tarief uit `cost_config.radar_eur_per_screen` (RfFT standaard-pricing €0,02) + `radar_free_until` (2026-08-15).
4. **Driver:** aantal gescreende pogingen, uitgesplitst `successful · declined · blocked`, × tarief — **volledig zichtbaar** in de hint (bv. "12 screened (9 ok · 2 declined · 1 blocked) × €0,02 · free until 2026-08-15").
5. **Tijdstoewijzing:** flow op poging-/verkoopdatum. **Nooit COR** (fraudekost valt bij de poging, niet bij levering).
6. **Scope:** business-wide → **alleen external** (geblokkeerde/mislukte pogingen zijn niet aan een user te koppelen; toggle mag niet dubbeltellen). Internal = €0.
7. **Aannames/zwakke plekken:** 🟡 de `radar_free_until` (2026-08-15) is een door de eigenaar opgegeven free-trial-einddatum, geen gemeten waarde. **Controlemogelijkheid (niet gebouwd):** reconcileerbaar tegen Stripe's **Fees report** (Reports → All Fees), die data toont **96u** na balans-impact — daar staan de echte Radar-per-screen-fees. Base-Radar-ML is gratis; de €0,02 is het Radar-for-Fraud-Teams standaard-pricing-tarief (custom rules vereisen RfFT). Detectie dat de landguard werkt: `blocked`-pogingen verschijnen hier én landen-bij-naam in Revenue-by-region (ADR-062).

### 2.15 OPEX-rijen: entered (infra / ads / eenmalig)
1. **Naam:** de ingevoerde categorieën (bv. "Infrastructure", "Ads") met hint "€300 / month · 14 of 31 days".
2. **Formule (`opex_accrual`):**
   - `monthly` + `evenly`: dagtarief `= amount / dagen_in_kalendermaand`; regelbedrag `= overlap_dagen × dagtarief`.
   - `yearly` + `evenly` (ADR-065): anniversary-based occurrence `[verjaardag, verjaardag+1jr)`, auto-herhaalt; dagtarief `= amount / looptijd_dagen (365/366)`; regelbedrag `= overlap_dagen × dagtarief`. Uitsmeren = matching voor een vooruitbetaling (domein).
   - `none` + `evenly`: dagtarief `= amount / dagen_in_occurrence` (custom periode `from..to`).
   - `single`: volledig `amount` op de ankerdag (occurrence-start / verjaardag / betaaldag) als die in `[from,to)` valt.
3. **Bron:** `opex_expenses` (`amount`, `recurrence` ∈ `none|monthly|yearly`, `spread`, `effective_from/to`, `category`, `description`/`note`). **Guard (ADR-065):** in COR gemeten diensten (Decodo/AssemblyAI/DeepSeek/R2) horen NIET als volle OPEX-regel — `AddExpense` waarschuwt (dubbeltelling); alleen een reconciliatie-gat (factuur − gemeten).
4. **Driver:** ingevoerd bedrag + datums + verdeelregel — **volledig zichtbaar** in de hint (bedrag + "X of Y days").
5. **Tijdstoewijzing:** accrual, gesneden op `[from_d,to_d)` (Amsterdam-dag). Flow.
6. **Scope:** **alleen external** (`opex_accrual` is scope-loos, wordt enkel op external opgeteld).
7. **Aannames/zwakke plekken:** `monthly evenly` deelt door kalendermaand-dagen (28–31) → dagtarief varieert per maand. Prijswijziging = nieuwe reeks (changed-from-this-month), anders herschrijf je history (ADR-060).

### 2.16 Net profit + marge (statement-slot)
Zelfde getal als §1.1; marge `net_margin = net_profit / recognized_revenue`. Kleur groen bij positief, rood bij negatief. Erft alle onderliggende zwakke plekken.

---

## Sectie 3 — Kaart "Where the cash sits" — ✅ F4 (2026-07-15)

**Volgorde-fix F4:** de kaart is BTW-eerst geherordend en toont nu twee onafhankelijke aftrekkingen van hetzelfde bruto (jij↔fiscus, jij↔Stripe) i.p.v. een valse keten. Nieuwe volgorde op scherm: Charged → − VAT → = Revenue ex-VAT → − Stripe fee → = **Yours to keep**; daaronder los "Settled to your bank" (bankafschrift). De formules zijn ongewijzigd — alleen de weergave/volgorde en de nieuwe afgeleide "Yours to keep"-regel. De per-land VAT-uitsplitsing (nl/oss/outside) staat nu direct onder de VAT-regel.

### 3.1 Charged to customers
1. **Naam:** "Charged to customers (settlement €)".
2. **Formule:** `bank.charged = Σ COALESCE(settlement_amount, amount_paid)` over distinct `stripe_session_id` in de periode. Sinds 2026-07-15 in **settlement-EUR** (P4): `settlement_amount = balance_transaction.amount` (presentment × exchange_rate). Presentment (`amount_paid`+`currency`) blijft als info bewaard.
3. **Bron:** `credit_transactions.metadata.settlement_amount` (fallback `amount_paid`).
4. **Driver:** aantal sales × settlement-bedrag (👁️ aantal niet los getoond).
5. **Tijdstoewijzing:** flow op `created_at` (verkoopdatum).
6. **Scope:** aggregaat per scope. Correct (som van charges).
7. **Aannames/zwakke plekken:** één valutabron (EUR) — voorkomt dat een USD-sale presentment-dollars van settlement-euro's aftrekt (bewezen met gesimuleerde USD-sale). BTW-inclusief bruto (Adaptive Pricing / prijs uit `pricing.ts`).

### 3.2 − VAT (owed to tax office)
1. **Naam:** "− VAT (owed to tax office)". Met de per-land uitsplitsing (nl/oss/outside) er direct onder.
2. **Formule:** `vat_owed = Σ metadata.amount_tax × exchange_rate` (settlement-EUR).
3. **Bron:** `credit_transactions.metadata.amount_tax` (uit `session.total_details.amount_tax`).
4. **Driver:** BTW per sale (👁️).
5. **Tijdstoewijzing:** flow (verkoopdatum).
6. **Scope:** aggregaat per scope.
7. **Aannames/zwakke plekken:** BTW eerst omdat dat geld nooit van ons was. Sinds 2026-07-15 rekent de Checkout Session BTW (§7). Sales zonder gemeten BTW verschijnen in de `vat_unmeasured`-waarschuwing onderaan de kaart (exact aantal + gross); historische 2 sales blijven onbekend tot ze een `invoice_tax` krijgen.

### 3.3 = Revenue ex-VAT
1. **Naam:** "= Revenue ex-VAT".
2. **Formule:** `bank.revenue_ex_vat = charged − vat` — een echte aftrekking op scherm (§3.1 − §3.2).
3. **Bron:** §3.1 + §3.2.
4. **Driver:** charges − BTW.
5. **Tijdstoewijzing:** flow.
6. **Scope:** aggregaat per scope.
7. **Aannames/zwakke plekken:** wat overblijft nadat de fiscus z'n deel heeft — dít is de omzet, en hier gaat de fee vanaf.

### 3.4 − Stripe fee
Zelfde bron/scope als §2.14 (`bank.stripe_fee = Σ metadata.stripe_fee`). 🟡 kan €0 zijn vóór reconcile. Onafhankelijke aftrekking van hetzelfde bruto — geen vervolg op de VAT-aftrek.

### 3.5 = Yours to keep (nieuw, F4)
1. **Naam:** "= Yours to keep".
2. **Formule:** `revenue_ex_vat − stripe_fee` (§3.3 − §3.4), inline in `FinanceView.tsx` berekend — geen nieuw RPC-veld.
3. **Bron:** afgeleid van §3.3 + §3.4.
4. **Driver:** omzet − fee.
5. **Tijdstoewijzing:** flow.
6. **Scope:** aggregaat per scope.
7. **Aannames/zwakke plekken:** het enige getal dat volledig van ons is; stond vóór F4 nergens in het dashboard. 🟡 volgt de fee: bij niet-gereconcilieerde fee=0 is Yours to keep = revenue_ex_vat (te hoog).

### 3.6 Settled to your bank (losse regel)
1. **Naam:** "Settled to your bank (bank statement)", met sub-note "of which €X is not yet yours (VAT held for the tax office)".
2. **Formule:** `net_settlement > 0 ? net_settlement : (charged − fee)`. In gewone taal: wat er echt op de bank landt; als Stripe's `net` bekend is gebruik die, anders reken charged − fee. De sub-note toont `vat_owed` als het gereserveerde, nog-niet-eigen deel.
3. **Bron:** `metadata.net_settlement` (uit `balance_transaction.net`) met fallback `charged − fee`.
4. **Driver:** charges + fees (👁️).
5. **Tijdstoewijzing:** flow (verkoopdatum).
6. **Scope:** aggregaat per scope.
7. **Aannames/zwakke plekken:** bewust een losse regel (bankafschrift), niet het sluitstuk van de keten — de spanning "er staat meer op de rekening dan van ons is" (het gereserveerde BTW-deel) is precies wat deze regel hoort te tonen. Fallback `charged − fee` klopt alleen als fee bekend is; bij fee=0 toont settled = charged (te hoog).

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

### 4.3 Est. cost to deliver — ✅ audit-fix (2026-07-15)
1. **Naam:** "Est. cost to deliver" (badge "est").
2. **Formule:** `est_future_cost = deferred.credits × avg_cpc`, met `avg_cpc = recent_cor_total / recent_consumed` over de laatste `window_days` (default 90). **Sufficiency-guard:** bij `recent_consumed = 0` (en openstaande credits > 0) → `avg_cpc = NULL`, `est_future_cost = NULL`, vlag `est_data_sufficient = false` → UI toont **"insufficient data"**, NIET €0. (Was: `ELSE 0` → claimde gratis levering bij een stille maand.)
3. **Bron:** `admin_finance_summary` roept `_geld_scope(scope, to − window, to)` → `cor.total` en `consumed_cr`.
4. **Driver:** recente COR ÷ recent verbruik × openstaande credits (👁️).
5. **Tijdstoewijzing:** stock (openstaande credits) × recente-flow-ratio.
6. **Scope:** aggregaat over het recente venster. **Beslist (audit-punt 2b):** de blended €/credit **is** de methode-mix-gewogen per-methode-eenheidskost — `Σcor_m/Σcredits = Σ(mix_m × unit_m)` — dus algebraïsch identiek aan "methode-mix"; de openstaande credits hebben zelf geen methode, en de recente consumptie is het enige mix-signaal. Granted-vs-purchased verandert de eenheidskost niet (een minuut AI kost hetzelfde), alleen de mix.
7. **Aannames/zwakke plekken:** expliciet een **schatting** — de UI-hint zegt nu "assumes the same method mix + cache rate as the last N days". Wiebelt met het schuivende venster (goedkope credits vallen van de rand → tarief omhoog).

### 4.4 Est. future gross — ✅ audit-fix (2026-07-15)
1. **Naam:** "Est. future gross".
2. **Formule:** `est_future_gross = deferred_balance − est_future_cost − deferred_fee`. **De deferred Stripe fee wordt nu óók afgetrokken** (fee is COR sinds ADR-063); was `deferred_balance − est_future_cost`. `NULL` als `est_data_sufficient = false`.
3. **Bron:** §4.1 − §4.3 − deferred_fee (§4.2).
4. **Driver:** afgeleid.
5. **Tijdstoewijzing:** stock.
6. **Scope:** erft §4.3.
7. **Aannames/zwakke plekken:** schatting (erft §4.3). Live: `1,99 − 0,1757 − 0,2208 = 1,59`.

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
5. **Tijdstoewijzing:** snapshot = bevroren flow per Amsterdam-dag (`snapshot_finance_day`, pg_cron 02:00 UTC); entered = **live** overlay (niet bevroren). Daarom kan historische net verschuiven na een expense-edit (ADR-059/064, bedoeld).
6. **Scope:** per gekozen scope (external/internal); entered alleen external.
7. **Aannames/zwakke plekken:** ✅ **Model gelijkgetrokken (F5b, ADR-064):** `net_profit_measured` = `revenue_delivered − cor_against_revenue (usage-share + recognized_fee + per-user storage) − (goodwill + funnels + radar)` — identiek aan `admin_finance_summary` mínus de entered-overlay. **`net_profit_measured` ≠ de volle net:** de kolom is bewust "measured" (net **vóór** entered); de volle net = `net_profit_measured − entered_live`. Entered blijft een **live-overlay** (niet bevriezen — bewerkbare regels werken retroactief door); daarom heet de kolom zo en trekt de balk entered apart af. Borging: headline-net (measured − entered_live) == Trend-net → het label liegt niet. **Clean-start (F5, ADR-064):** de oude snapshotrijen (pre-ADR-063 internal testruis) zijn `DELETE`'d; er is géén backfill. De Trend leest `MIN(snapshot_date)` **per scope** (niet hardcoded) en toont de echte startdatum; de serie groeit vanaf de eerste cron-run na de fix. Backfillen kan altijd (`snapshot_finance_day(d)` is range-aware) — de aanloop-P&L komt uit de **live** `_geld_scope`, niet uit de Trend.

### 5.2 Trend lege staat
Bij < 2 snapshotrijen: tekst i.p.v. grafiek, met de **echte startdatum** uit `MIN(snapshot_date)` (of "nog geen snapshots — de nachtelijke cron schrijft de eerste dag") — nooit gehardcode. Geen getal.

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
| `cor_storage` (§2.8) | 🟢 byte-serie (`daily_library_bytes`) / 🟡 `storage_approx` tot de serie het venster dekt; per-user geattribueerd (F3) |
| `est_future_cost`/`est_future_gross` (§4.3–4.4) | 🟡 schatting |
| `cor_rag` = 0 (§2.7) | 🟡 aanname |
| `vat` / `vat_owed` (§3.4) | 🔴 niet berekend (structureel 0, §7) |
| `cor_ai_summary` tijdstoewijzing (§2.6) | 🟢 op `generated_at` via `ai_summary_usage_log` (F2, §8 opgelost) |

### 6.3 Onzichtbare drivers (volume niet afleesbaar in UI) — 👁️
✅ **F15 (2026-07-16) heeft de COR- én OPEX-driver-volumes zichtbaar gemaakt** als `driver × tarief = bedrag` per rij: AssemblyAI-minuten, proxy-bytes (transcriptie én caption), DeepSeek-tokens, opslag-GB (incl. free-tier-verklaring), goodwill granted-credits, en de free-caption-funnel-bytes (logged-in + anon). Bron: `admin_finance_summary` `<scope>.drivers` + de tarieven in `rates` (incl. de drie DeepSeek-token-tarieven).
**Nog onzichtbaar:** aantal sales achter charged/fee/vat (§3.x), lot-€/credit achter recognized/deferred (§4.x), Deferred est.-drivers (§4.3). **Wel** zichtbaar gebleven: credits per methode (COR-tabel), cache-pct (subregel), entered bedrag+datums (OPEX-hint).

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

## Sectie 8 — AI-summary-COR-attributie ✅ OPGELOST (F2, 2026-07-16, ADR-064)

**Was:** `_geld_scope` las het COR-summary-blok uit `transcripts` op `created_at` → de DeepSeek-COR viel op **transcript-aanmaak**, niet op het moment dat de samenvatting draaide. Twee gevolgen: (1) een later/geregenereerde samenvatting landde op de (mogelijk al bevroren) transcript-dag; (2) regenerate UPDATE't `transcripts.ai_summary_usage` in-place → historische COR verschoof met terugwerkende kracht en 2 runs telden als 1×.

**Nu:** nieuwe insert-only **`ai_summary_usage_log`** (RLS; kolommen `transcript_id`, `user_id`, `generated_at`, `model`, `prompt_tokens`, `completion_tokens`, `cache_hit_tokens`). De backend appendt één rij per DeepSeek-call (`backend/main.py`, na de transcript-update; non-fataal). `_geld_scope` leest de summary-COR uit de log op **`generated_at`** — zowel het scope-totaal als de per-user CTE. De 2 bestaande summaries zijn gebackfilld uit hun `ai_summary_usage.generated_at`.

**Waarom een tabel i.p.v. `COALESCE(generated_at, created_at)` op de transcript-rij:** de transcript houdt maar één (laatste) run vast; `COALESCE` verplaatst alleen dat ene record. De log is de enige bron die **elke** run afzonderlijk bewaart → regenerate telt beide runs, elk op zijn eigen datum.

**Bewijs (F2):** maand-invariant identiek (0,000800) vóór/ná; per-dag COR verschuift van 07-09 (created) naar 07-11 (generated); synthetisch 2 users × 2 periodes: cross-period shift (kost van een periode-1-transcript valt in periode 2) + regenerate telt beide runs (0,0003612 vs 0,0001806 = 2×). `transcripts.ai_summary_usage` blijft bestaan (transcript-eigen record, niet door UI gelezen), maar is niet meer de COR-bron.

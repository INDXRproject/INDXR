# Beslissing 067: Service-saldi ophalen + Decodo-reconciliatie (F17)

**Status:** Geaccepteerd  
**Datum:** 2026-07-16  
**Gerelateerde code:** `backend/worker.py` (`fetch_service_metrics`, `_parse_decodo_traffic`), `supabase/migrations/20260716180000_f17_service_metrics_decodo_reconcile.sql`, `apps/app/src/app/admin/operations/page.tsx` (`ServiceHealth`), `apps/app/src/app/admin/finance/FinanceView.tsx` (Proxy reconciliation-rij), `apps/app/src/app/admin/adminTypes.ts`, `apps/app/src/app/admin/finance/financeTypes.ts`

## Context

De Finance-cijfers rusten op **gemeten** kostdrivers (proxy-bytes, tokens, minuten) × tarieven uit `cost_config`. Twee blinde vlekken:

1. **Geen zicht op prepaid-saldi.** DeepSeek is prepaid — raakt het op, dan stallen AI-samenvattingen zonder waarschuwing. Er was geen enkele meting van het resterende saldo.
2. **Proxy-meting is een ondergrens (ADR-065/066).** We meten Decodo-bytes per job/scrape, maar Decodo factureert **account-niveau**. Zonder de gefactureerde bytes ernaast konden we niet zien hoe groot het ongemeten verschil is.

Fase-A-onderzoek per dienst (endpoint / key / frequentie):

- **DeepSeek:** `GET https://api.deepseek.com/user/balance`, Bearer `DEEPSEEK_API_KEY` (bestaat al op de worker). Geeft `balance_infos[{currency,total_balance,granted_balance,topped_up_balance}]`. Prepaid. Bij ~46k summaries/jaar burn duurt het saldo ~een jaar → **nachtelijk** volstaat, uurlijks zou ruis zijn.
- **Decodo:** `POST https://api.decodo.com/api/v2/statistics/traffic`, Bearer **dashboard-token** (los van de proxy-auth `PROXY_USERNAME/PASSWORD`). `groupBy: "day"` → `rx_bytes`/`tx_bytes` per dag. Alleen **verbruik**, geen saldo. Decodo **auto-refilt op 90%** → een saldo-alert is zinloos (het loopt nooit leeg), maar het verbruik is precies wat de reconciliatie nodig heeft.
- **AssemblyAI:** **geen** balance/usage-API (alleen dashboard), PAYG + auto-recharge. Niets te bouwen.

## Beslissing

1. **Nachtelijke cron op de ARQ-worker (Railway), 02:00 UTC.** `fetch_service_metrics` haalt DeepSeek-saldo én Decodo-dagverkeer op. Eén run/dag, één cron. Keys leven alleen op de worker (server-side); geen key raakt ooit de browser of Next.js-client. Keuze voor ARQ-cron boven pg_cron/Vercel omdat de API-keys daar al staan.

2. **DeepSeek-saldo → Operations, met alert.** `service_metrics`-tabel bewaart `balance`, `currency`, `last_success_at`, `last_attempt_at`, `last_error`. `admin_operations_summary` levert een `services.deepseek`-blok met status `ok`/`low`/`unavailable`. Drempel instelbaar in `cost_config.deepseek_low_balance_usd` (default $5) — **niet hardcoded**.

3. **Decodo billed vs gemeten → Finance-reconciliatie (OPEX).** `decodo_daily_usage`-tabel (`day` PK, `rx_bytes`/`tx_bytes`/`billed_bytes`). `admin_finance_summary` vergelijkt gefactureerd tegen **alle** gemeten proxy-bytes (jobs beide scopes + caption-egress + `proxy_usage_log`) en boekt een positief gat als OPEX-regel "Proxy reconciliation (Decodo)" naast Proxy overhead. Alle drie de getallen (billed · measured · gap) zichtbaar in de driver-hint.

4. **AssemblyAI:** niets gebouwd; het ontbreken van een API staat vast in de provenance (§2.13d) met bron.

## Rationale

- **Faalgedrag is expliciet, nooit misleidend.** `record_service_fetch(p_ok=false, …)` schrijft alleen `last_attempt_at` + `last_error` en **behoudt** het laatst-geslaagde saldo + `last_success_at`. De UI toont dan **"unavailable" + tijdstip laatste geslaagde ophaling**, nooit `$0` (een niet-leesbaar saldo ≠ een saldo van nul) en nooit stil een oud getal alsof het actueel is.
- **Reconciliatie toont pas een gat als er écht data is.** `coverage_days = 0` (geen `decodo_daily_usage`-rijen in de periode, bv. geen `DECODO_API_KEY`) → status `unavailable`, gap `0`, kost `0`, UI-cel `—`. Geen gefabriceerd gat-van-100% wanneer we niets hebben opgehaald. Met deel-dekking → `partial` (`x/y dagen`).
- **Account-niveau → alleen external scope.** Decodo factureert test+prod op één proxy-user (niet te splitsen). De reconciliatie zit daarom alleen op de externe scope; `measured` telt álle proxy-bytes (beide scopes); een positief gat = onherleidbaar restverkeer → externe economie (zelfde klasse als `funnel_anon`). Internal = `{status:'not_applicable'}`.
- **`GREATEST(0, gap)`-boeking.** Gemeten kan de gefactureerde bytes overstijgen (wij meten gedecomprimeerde payload-grootte via yt-dlp; Decodo factureert wire-bytes ná compressie). Een negatief "gat" is dan een meetartefact, geen krediet — dus alleen een positief gat wordt als kost geboekt.
- **Nachtelijk, niet uurlijks (DeepSeek).** Prepaid dat ~een jaar meegaat vraagt geen uurlijkse polling. De bestaande 02:00-UTC-slot hergebruikt; geen tweede cron.

## Consequenties

- **Nieuwe env-var `DECODO_API_KEY`** (Decodo **dashboard**-token, niet de proxy-auth) moet Khidr zetten op de **Railway worker-service** (waar de ARQ-cron draait) — **niet** op Vercel. Zolang die leeg is: Decodo-fetch faalt best-effort → reconciliatie blijft `unavailable` (geen gat), Operations toont DeepSeek gewoon. `DEEPSEEK_API_KEY` moet eveneens op de worker-service staan (bestaat al voor de summary-flow).
- **Geen backfill** — forward-only. De eerste rijen verschijnen na de eerste nachtelijke run.
- **Best-effort per dienst:** een DeepSeek-fout blokkeert de Decodo-fetch niet en omgekeerd.
- Reconciliatie bewezen met ≥2 periodes (synthetisch): dag met billed=measured → gap 0 → €0; dag met billed 5 GB vs measured 15,5 MB → gap 4,984 GB × tarief → €14,90. Synthetische rijen daarna opgeruimd.
- `record_service_fetch` is `SECURITY DEFINER` → `REVOKE EXECUTE FROM PUBLIC, anon, authenticated` + re-GRANT `service_role` (LESSONS 2026-07-13: default PUBLIC-grant, `REVOKE FROM anon` alleen is niet genoeg). Geverifieerd anon/auth = false.

---

## Update 2026-07-19 (ADR-068): DeepSeek-saldo-monitoring verwijderd

De DeepSeek prepaid-balans-poll (binnen `fetch_service_metrics`) en de Operations "External services / DeepSeek balance"-widget uit deze ADR zijn **verwijderd** toen de AI-summary-provider naar de AssemblyAI EU LLM Gateway ging (ADR-068). AssemblyAI is PAYG met auto-recharge en heeft **geen balance-API** → er is geen vervangende saldo-widget. Wat uit deze ADR blijft: de **Decodo**-dagverkeer-reconciliatie (dezelfde `fetch_service_metrics`-cron, 02:00 UTC) en de `service_metrics`/`record_service_fetch`-infra (nu alleen door Decodo geschreven). `cost_config.deepseek_low_balance_usd` is mee-gedropt.

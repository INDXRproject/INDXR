# Beslissing 065: Entered-OPEX-model dekkend + COR-dubbeltelling-guard + ai_summary_usage-opruiming

**Status:** Geaccepteerd
**Datum:** 2026-07-16
**Gerelateerde code:** `opex_accrual` (migratie `20260716130000_opex_accrual_yearly_recurrence.sql`), `opex_expenses` CHECK, `apps/app/src/app/admin/finance/SettingsDialog.tsx` (`AddExpense`), `actions/finance.ts`, `financeTypes.ts`, migratie `20260716104934_drop_transcripts_ai_summary_usage.sql`, `backend/main.py`

## Context
Opruim- + model-taak na de finance-audit. Drie sporen: (1) een dubbele bron voor AI-summary-tokens, (2) het entered-OPEX-accrualmodel moet vóór launch de reële uitgavenvormen dekken, (3) meerdere kosten worden al per gebruik in COR gemeten — die als OPEX invoeren telt dubbel.

## Beslissing

### 1. `transcripts.ai_summary_usage` verwijderd
Sinds ADR-064 is `ai_summary_usage_log` (insert-only, op `generated_at`) de gezaghebbende AI-summary-COR-bron. Geverifieerd dat **niets** het kolom-veld leest: live `_geld_scope` leest de log; geen view/trigger/functie refereert de kolom; de UI las het nooit. Twee bronnen voor één getal waarvan er één niets aandrijft is een strik → `DROP COLUMN`. De backend schrijft het veld niet meer (`main.py`). Verlies: `deepseek_created` (peak-pricing-timestamp, ongebruikt — `generated_at` is een proxy binnen seconden) en `prompt_cache_miss_tokens` (afleidbaar: `prompt − cache_hit`). Summary-COR ongewijzigd (0,000800 juli internal).

### 2. Entered-OPEX-model dekkend — `recurrence='yearly'` toegevoegd (3a/3b)
**Bestaand model (`opex_accrual`, 3a):** kolommen `amount, spread(evenly|single), recurrence(none|monthly), effective_from, effective_to`. `monthly` itereert kalendermaanden vanaf `date_trunc('month', max(from,p_from))`; `evenly` verdeelt `amount` over de kalendermaand-dagen en telt de overlap met `[p_from,p_to)`; `single` boekt het volle bedrag op de occurrence-startdag. `none` = één occurrence: `evenly` prorateert over `[effective_from, effective_to]` (custom periode), `single` boekt op `effective_from`. Een venster dat een occurrence deels overlapt krijgt alleen de overlap-dagen (dagelijkse proratie).

**Dekking van de vier gevallen:**
- **Maandelijks terugkerend** (Vercel/Railway/Supabase): `recurrence='monthly'`, `effective_to=NULL` (loopt tot stopgezet). ✅ bestond.
- **Eenmalig** (eHerkenning/KvK): `recurrence='none', spread='single'`. ✅ bestond.
- **Jaarlijks** (domeinverlenging): **nieuw `recurrence='yearly'`** — anniversary-based (occurrence `[verjaardag, verjaardag+1jr)`, stapt +1 jaar, auto-herhaalt). **Beslissing: default `spread='evenly'` (uitsmeren over de 12-maands looptijd)** omdat matching — de domeinkost hoort bij de periode waarin je het domein gebruikt; op de betaaldag boeken maakt één maand kunstmatig slecht. `spread='single'` (op de betaaldag) blijft mogelijk voor wie dat wil. Eén invoer i.p.v. één rij per jaar (parallel aan `monthly`).
- **Custom periode X..Y**: `recurrence='none', spread='evenly'`, `effective_from=X, effective_to=Y` → pro-rata over die periode. ✅ bestond.

Bewezen met wegwerp-rijen over ≥2 periodes (geen echte data ingevoerd): monthly evenly €20 vanaf 10 mrt → mrt €14,19 / apr €20,00; yearly evenly €12 vanaf 1 feb → feb €0,92 / mrt €1,02 / apr €0,99; yearly single €12 → feb €12 / mrt €0; one-off €50 op 15 mrt → mrt €50 / apr €0; custom €30 over 1–10 mrt → volle maand €30 / venster 5–8 mrt €9. De UI (`AddExpense`) heeft nu een `yearly`-optie en een `to`-veld (custom periode / einddatum).

### 3. Gemeten diensten horen NIET als volle OPEX-regel — dubbeltelling-guard (3c/3d)
**Decodo (3c):** proxy-bytes worden per job gemeten en zitten al in `cor_ai`/`cor_caption`. Maar de meting is **geen** volledige dekking van de Decodo-uitgave: van 188 complete AI-jobs dragen er **6** proxy_bytes (capture pas sinds ADR-054/2026-07-11 → 182 pre-instrumentatie = 0), 27 error-jobs 0 bytes, en niet-job-verkeer (bgutil PO-tokens, playlist `/info`, health checks, retries) wordt helemaal niet gemeten. → De gemeten proxy is een **ondergrens**. Gevolg: de **volle** Decodo-factuur als OPEX invoeren telt het gemeten deel dubbel; níets invoeren mist het gat. **Beslissing:** Decodo blijft in COR (gemeten, ondergrens) en gaat **niet** als volle regel in `opex_accrual`. Wil je reconciliëren, voer dan alleen het **gat** in (factuur − gemeten proxy-COR) als entered-regel — nooit de volle factuur.

**AssemblyAI + DeepSeek + R2 (3d):** idem gemeten in COR (`cor_ai`, `cor_ai_summary`, `cor_storage`). Er is structureel niets dat verhindert ze als entered-OPEX in te voeren (vrije-tekst `category`). **Guard:** `AddExpense` toont een **waarschuwing** zodra category/description een gemeten dienst noemt (`assemblyai`, `deepseek`, `decodo`, `proxy`, `cloudflare`, `r2`, `storage`) — geen harde blokkade (een reconciliatie-gat-regel moet mogelijk blijven), maar de dubbeltelling gebeurt niet meer stil.

## Rationale
Uitsmeren = matching (ADR-060-lijn). Waarschuwen i.p.v. blokkeren houdt legitieme reconciliatie-gat-invoer mogelijk. De Decodo-meting bouwen tot volledige dekking (failed jobs, non-job-verkeer) is een grotere capture-taak (buiten scope); tot dan is de eerlijke positie: COR = ondergrens, gat expliciet.

## Consequenties
- `opex_expenses.recurrence` accepteert nu `yearly`; `opex_accrual` heeft een derde tak. Geen COR/revenue-formule geraakt.
- Khidr kan alle vier de vormen invoeren; de bedragen komen later (nu geen data ingevoerd).
- Decodo/AssemblyAI/DeepSeek/R2 als volle OPEX-regel = bewust ontraden (waarschuwing); alleen gat-regels.
- `transcripts.ai_summary_usage` bestaat niet meer; alle historie in `ai_summary_usage_log`.
- **Open (buiten scope, benoemd):** de Decodo-meting dekt de uitgave niet volledig (6/188 jobs, 27 error-jobs, non-job-verkeer). Zie known-issues.

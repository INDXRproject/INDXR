# Beslissing 068: AI-summary provider DeepSeek → AssemblyAI EU LLM Gateway (GDPR/EU-residency)

**Status:** Geaccepteerd
**Datum:** 2026-07-19
**Gerelateerde code:** `backend/main.py` (`summarize_transcript`), `backend/worker.py` (`fetch_service_metrics`), migraties `20260719120000`–`20260719122000`, `apps/app/src/app/admin/finance/*`, `apps/app/src/app/admin/operations/page.tsx`, `apps/app/src/app/admin/adminTypes.ts`

## Context
De AI-samenvatting draaide op **DeepSeek** (`api.deepseek.com`, model `deepseek-v4-flash`). DeepSeek is een Chinese aanbieder **zonder DPA en zonder SCC's** — daarmee onrechtmatig voor de verwerking van EU-persoonsgegevens (Garante-ban, EDPB AI-taskforce). Transcript-tekst kan persoonsgegevens bevatten. De verwerking moest naar een EU-resident, DPA-gedekte aanbieder zodat de (nog te schrijven) `/privacy` "SCC/EU"-zin waar is.

DeepSeek was ~gratis, dus de summary-COR-tarief stond dicht bij nul. De COR-*plumbing* bestond al (F2/ADR-064: per-run token-log `ai_summary_usage_log` op `generated_at`, per-user gewogen ADR-063) — alleen het **tarief** moest naar de nieuwe aanbieder.

## Beslissing
- **Provider = AssemblyAI EU LLM Gateway** (`https://llm-gateway.eu.assemblyai.com/v1/chat/completions`, OpenAI-compatible, EU data-residency). Hergebruikt de bestaande `ASSEMBLYAI_API_KEY` (auth-header = rauwe key, **geen** "Bearer").
- **Model:** primair **`gemini-2.5-flash`**, fallback **`claude-haiku-4-5-20251001`** (één retry bij gateway-fout). Beide zijn EU-beschikbaar (OpenAI-modellen zijn US-only). Single-pass, geen chunking.
- **Prompt/output-vorm ongewijzigd** — zelfde system-prompt, output `{text, action_points, generated_at, edited}`. Gemini omhult JSON in ` ```json `-fences → backend strippt fences vóór `json.loads`.
- **Prijs ongewijzigd:** een summary kost **3 credits** (`pricing.ts` en de aftrek niet aangeraakt).
- **Tarief in config:** nieuwe `cost_config`-kolommen `assemblyai_llm_usd_per_1m_input_tokens` / `_output_tokens` (USD/1M). `_geld_scope` past de FX (`usd_eur_rate`) op query-moment toe — zelfde patroon als R2-storage-COR. **EU in-region prijs** = global $0.30 in / $2.50 out **+ 10% in-region** (we sturen géén `model_region:global`, want data moet in de EU blijven) = **$0.33 in / $2.75 out per 1M**. Geen prompt-cache-tier → cache-term vervalt.
- **ZDR:** de EU-endpoint + AssemblyAI's DPA/SCC's maken de verwerking rechtmatig. Echte **zero-data-retention** vereist een uitgevoerde **BAA** + een header/project-setting die AssemblyAI niet publiek documenteert → **Khidr-vervolg** (geen ongeverifieerde header meegestuurd).

## Rationale
- EU-residency is de dragende rechtmatigheidsgrond; AssemblyAI biedt (anders dan DeepSeek) een DPA + SCC's. ZDR is data-minimalisatie bovenop, geen voorwaarde voor rechtmatigheid.
- De gateway is OpenAI-compatible → minimale code-wijziging (alleen de call-block in `summarize_transcript`); `usage.prompt_tokens/completion_tokens` vullen het bestaande token-log.
- USD-tarief + FX-op-query volgt het bestaande R2-patroon en de taak-formule ("tokens × USD-tarief × FX"), en houdt het tarief onderhoudbaar in `cost_config`.

## Consequenties
- **DeepSeek-plumbing opgeruimd:** de nachtelijke DeepSeek prepaid-balans-poll (binnen `fetch_service_metrics`, Decodo blijft), de Operations "DeepSeek balance"-widget, en alle `cost_config.deepseek_*`-kolommen zijn verwijderd (migratie `20260719122000`, na verificatie dat geen RPC/view ze nog leest). `DEEPSEEK_API_KEY` is dood → **Khidr haalt 'm uit Railway/Vercel**.
- **Finance COR** rekent AI-summary nu tegen het gemeten Gemini-tarief. Geverifieerd (wegwerp-summary): gemini-2.5-flash, 103 in / 184 out tokens, COR €0,000497 (FX 0,92), per-user gewogen (against-revenue ≠ volle COR → niet scope-gemiddeld), audit-lijn `ai_summary` verifieert (tally 31/0/0 blijft). Revenue/VAT (`_sale_vat`, `vat_by_country`, `_recognize_asof`) niet aangeraakt.
- **AssemblyAI heeft geen balance-API** (PAYG) → geen vervangende Operations-balanswidget; de blinde vlek is dezelfde als vóór (ADR-067).
- **Openstaand:** `gemini-2.5-flash` wordt bij Google gedeprecieerd rond **2026-10-16** — vóór die datum het model-constant in `backend/main.py` bijwerken (bijv. `gemini-3.5-flash`); tarief in `cost_config` meebewegen.

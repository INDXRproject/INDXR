# Finance-map — elk UI-getal → functie → tabellen → tarief → ADR

De kaart voor een redesign: wat raak je als je een regel verplaatst? Elk getal in de Finance-tab, herleid tot **de functie die het berekent**, **de tabellen/kolommen die het leest**, **het tarief uit `cost_config`** (indien van toepassing) en **de ADR die de beslissing draagt**. Voor het volledige verhaal per getal (formule, tijdstoewijzing, aannames) → [`finance-number-provenance.md`](finance-number-provenance.md). Voor de crons → [`nightly-jobs.md`](nightly-jobs.md). Geverifieerd tegen de code op 2026-07-18.

## Bronnen in één oogopslag

- **Live statement (Finance-tab):** `admin_finance_summary(from, to)` → per scope (`external`/`internal`) een blok. Roept per scope `_geld_scope(internal, from, to)` aan (de zware aggregator) en verrijkt met bank-brug, cache-savings, reconciliatie, radar, entered-OPEX.
- **Trend (bevroren):** `finance_daily_snapshot` (nachtelijk geschreven door `snapshot_finance_day` via `snapshot_finance_catchup`), + live entered-OPEX-overlay.
- **Operations (dienst-saldi):** `admin_operations_summary()` → `service_metrics`.
- **Tarieven:** één rij `cost_config` (laatste `effective_from`): `decodo_eur_per_gb`, `assemblyai_eur_per_min`, `deepseek_eur_per_1k_{input,output,cache_hit}_tokens`, `r2_usd_per_gb_month`, `r2_free_gb`, `usd_eur_rate`, `radar_eur_per_screen`, `radar_free_until`, `deepseek_low_balance_usd`. **Nooit hardcoded in de UI.**
- **Config (geen tarief):** `finance_settings` — `business_start_date` (1 jan), `proxy_measured_from` (11 jul), `deferred_window_days` (90), `deferred_cost_overrides`.

## Hero + Income statement (`admin_finance_summary` → `<scope>`)

| UI-getal | Berekend in | Leest (tabellen/kolommen) | Tarief (`cost_config`) | ADR |
|----------|-------------|---------------------------|------------------------|-----|
| **Net profit** (hero + statement) | `admin_finance_summary` (afgeleid) | `= gross_profit − measured_opex.total − (external? entered_opex_total)` | — | 063/064 |
| **Revenue delivered** | `_geld_scope` → `_recognize_asof` | `credit_transactions` (type/amount/kind/product_type, `metadata.amount_paid/amount_tax/settlement_amount`) | `usd_eur_rate` (settlement-EUR) | 061 |
| **Deferred obligation** (stand) | `_recognize_asof` | `credit_transactions` (openstaande lot-rest) | — | 061 |
| COR · **AI transcription** | `_geld_scope` | `transcription_jobs` (`duration_seconds`, `proxy_bytes`, `cache_hit`, `status='complete'`) | `assemblyai_eur_per_min` + `decodo_eur_per_gb` | 063 |
| COR · **Auto-captions** | `_geld_scope` | `usage_logs` (`extraction_type='caption'`, `success`, `proxy_bytes`, `cache_hit`) | `decodo_eur_per_gb` | 063 |
| COR · **AI summary** | `_geld_scope` | `ai_summary_usage_log` (`prompt/completion/cache_hit_tokens`, op `generated_at`) | `deepseek_eur_per_1k_{input,output,cache_hit}_tokens` | 064 |
| COR · **Storage (R2)** | `_geld_scope` | `daily_library_bytes` (periode-stand, `storage_approx`-fallback op stand-nu) | `r2_usd_per_gb_month`, `r2_free_gb`, `usd_eur_rate` | 064 |
| COR · **against_revenue** (per methode) | `_recognize_asof` **per-user** (`Σ user_period_cor × user_period_share`) | idem COR-bronnen, per user | zie COR | **063** (verving pooling-bug uit 061) |
| COR · **Payment processing (Stripe-fee)** | `_recognize_asof` (per lot gedefereerd) | `credit_transactions.metadata.stripe_fee` / `fee_details` | — | **063/064** |
| **Gross profit** | afgeleid | `= revenue_delivered − cor_against_revenue` | — | 063 |
| OPEX · **Goodwill** (granted credits) | `_geld_scope` `granted_delivery_cost` | `credit_transactions` (granted verbruik) × per-methode kost | zie COR | 061 |
| OPEX · **Free-caption funnel** (logged-in) | `_geld_scope` | `usage_logs` (gratis captions) | `decodo_eur_per_gb` | 057/066 |
| OPEX · **Free-caption funnel** (anon) | `admin_finance_summary` (external) | `daily_cost_counters.caption_proxy_bytes` | `decodo_eur_per_gb` | 066 |
| OPEX · **Fraud screening (Radar)** | `admin_finance_summary` (external) | `payment_attempts` (`screened`, `outcome_type`) + `credit_transactions` (geslaagd) | `radar_eur_per_screen`, `radar_free_until` | **062** |
| OPEX · **Proxy overhead** | `admin_finance_summary` | `transcription_jobs` (`status<>'complete'`) + `proxy_usage_log` (external: `NOT is_internal`; internal: `is_internal`) | `decodo_eur_per_gb` | **066** (is_internal: deze week) |
| OPEX · **Proxy reconciliation (Decodo)** | `admin_finance_summary` (external) | `decodo_daily_usage` (dagen ≥ `proxy_measured_from`) vs measured (alle proxy-bronnen) | `decodo_eur_per_gb` | **067** |
| OPEX · **Historical proxy (unverified)** | `admin_finance_summary` (external) | `decodo_daily_usage` (dagen < `proxy_measured_from`) — billed IS de kost | `decodo_eur_per_gb` | **067** + deze week |
| OPEX · **entered** (infra/ads/eenmalig) | `opex_accrual` | `opex_expenses` (`amount/spread/recurrence/effective_from/to`) | — | **065** |
| **Net margin** | afgeleid | `= net_profit / revenue_delivered` | — | — |

## Bank-brug ("Where the cash sits") + BTW

| UI-getal | Berekend in | Leest | Tarief | ADR |
|----------|-------------|-------|--------|-----|
| Charged to customers | `admin_finance_summary` `bank.charged` | `credit_transactions.metadata.settlement_amount/amount_paid` (DISTINCT ON session) | `usd_eur_rate` | 060 |
| − **VAT** (owed) | `_sale_vat(m)` | `credit_transactions.metadata.amount_tax` (`tax_status`) × `exchange_rate` | `usd_eur_rate` | 059/062 |
| VAT per land (nl · oss · outside · unknown) | `_geld_scope` `vat_by_country` → `vat_buckets` | `credit_transactions.metadata` (land-ISO), EU-lijst in `admin_finance_summary` | — | **062** |
| − Stripe fee (cash) | `bank.stripe_fee` | `credit_transactions.metadata.stripe_fee` (volle cash-fee bij sale) | — | 060 |
| = Yours to keep / Settled to bank | afgeleid | `charged − vat − fee` | — | 060 |

**Eén BTW-bron:** `_sale_vat(m)` beslist per sale de BTW én de meet-status — `tax_status='complete'` → `amount_tax × exchange_rate`; anders `invoice_tax`; anders `unknown` (→ `vat_unmeasured`-waarschuwing). Zowel `_geld_scope` (vat/buckets) als `_recognize_asof` (net_lot) roepen dezelfde functie aan (provenance §"Eén BTW-bron").

## Trend + Operations

| UI-getal | Berekend in | Leest | ADR |
|----------|-------------|-------|-----|
| **Trend** (revenue/net/split per dag) | `finance_daily_snapshot` (bevroren) + live entered-overlay | geschreven door `snapshot_finance_day` (measured-only net; entered NIET bevroren) | **064** |
| Trend-startdatum | `MIN(snapshot_date)` | schone start 16 jul | 064 |
| **DeepSeek balance** (Operations) | `admin_operations_summary` → `services.deepseek` | `service_metrics` (`balance`, `last_success_at`), alert < `cost_config.deepseek_low_balance_usd` | **067** |

## Wat een redesigner moet weten voordat hij iets verplaatst

- **Twee scopes, één view:** elk getal bestaat in `external` (echte economie) én `internal` (test). De UI toont er één; de toggle wisselt in-place. `is_internal` op `profiles` (users) én `proxy_usage_log` (proxy-egress) houdt test uit external.
- **Live vs bevroren:** het statement herberekent elke periode (`admin_finance_summary`); de Trend is bevroren (`finance_daily_snapshot`) + een live entered-overlay. Verschillende startdatums (statement kan terug tot launch; Trend vanaf 16 jul) — dat is bedoeld, niet een bug (§ADR-064).
- **Reconciliatie is live-overlay, niet bevroren:** Decodo-data komt async; de gap/unverified zit in `admin_finance_summary`, niet in de snapshot.
- **Alle tarieven uit `cost_config`, alle grenzen uit `finance_settings`** — nooit hardcoded. Een tarief wijzigen herprijst measured COR direct.
- **Decodo-horizon = 21 apr 2026** (géén data daarvóór), ook al is `business_start_date` 1 jan — "All time" proxy begint dus op 21 apr.
- **Provenance is het waarom, deze map is het waar.** Raak je een regel aan, lees dan de bijbehorende provenance-sectie voor de aannames.

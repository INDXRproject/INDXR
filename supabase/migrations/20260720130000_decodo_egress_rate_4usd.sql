-- Decodo proxy-egress COR rate correction. The Decodo PAYG price is now $4.00/GB. cost_config held
-- decodo_eur_per_gb = €2.99, which was $3.25/GB × usd_eur_rate(0.92) — so the proxy-COR was booked
-- ~23% too low (not ~13%: the config held $3.25, not the $3.50 that appears in some wiki narrative).
--
-- The column is stored PRE-CONVERTED in EUR and applied directly (no query-time FX) in _geld_scope /
-- snapshot_finance_day / admin_finance_summary / admin_geld_summary — they read this column from
-- cost_config, so a value update propagates automatically; no function/DDL change is needed.
-- New value: $4.00 × 0.92 = €3.68/GB.
--
-- Scope guard: only the proxy-egress rate changes. _sale_vat(), vat_by_country, and revenue/VAT
-- recognition are untouched.
UPDATE public.cost_config
SET decodo_eur_per_gb = 3.68,
    notes = notes || ' | 2026-07-20: Decodo PAYG rate $3.25/GB → $4.00/GB → decodo_eur_per_gb €2.99 → €3.68 (× usd_eur_rate 0.92). Proxy-egress-COR was ~23% too low.'
WHERE id = '02e35c6f-afb6-4605-9bb7-c8b788284ad2';

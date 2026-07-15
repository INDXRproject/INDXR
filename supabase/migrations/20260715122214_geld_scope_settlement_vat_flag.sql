-- Toegepast en binnen dezelfde sessie GECORRIGEERD door 20260715122517_geld_scope_vat_measured_null_fix.sql.
-- Deze versie introduceerde de settlement-EUR gross/VAT + vat_unmeasured-telling in _geld_scope, maar had een
-- NULL-bug in de `measured`-expressie (NULL='complete' -> NULL -> count(*) FILTER (WHERE NOT measured) sloeg
-- onbekende-BTW-sales over). De null-fix-migratie herdefinieert _geld_scope volledig (CREATE OR REPLACE) en
-- levert de eindtoestand -- deze tussenstap is bewust een no-op bij een verse replay.
SELECT 1;

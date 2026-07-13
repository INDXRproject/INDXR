-- Hygiëne (LESSONS 2026-07-13): trigger-functie flag_internal_test_account kreeg auto-EXECUTE
-- voor anon+authenticated. Onschadelijk (trigger-func faalt buiten TG-context) maar de advisor
-- flagt 'm; expliciet revoken. Trigger-invocatie loopt via de tabel-trigger, niet via deze grant.
REVOKE ALL ON FUNCTION public.flag_internal_test_account() FROM PUBLIC, anon, authenticated;

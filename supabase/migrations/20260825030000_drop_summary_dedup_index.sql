-- Migratie 2 van 2 (ADR-019): de partiële unieke index op samenvattingen kan WEG nu de idempotentiesleutel
-- de dubbel-start-garantie overneemt. De index dedupliceerde op resource-STAAT (user, transcript) over alle
-- niet-terminale statussen; de sleutel dedupliceert op INTENTIE. Zolang beide bestaan botsen ze: een
-- bewuste tweede poging (nieuwe sleutel) op een vastgelopen samenvattingsjob zou door de index geblokkeerd
-- worden (blokkade A). De sleutel heeft dat probleem niet — een echte retry is een nieuwe handeling.
--
-- VOLGORDE (choice 5): deze drop draait PAS nadat het sleutel-pad live + bewezen is, zodat er nooit een
-- moment zonder bescherming is. Vóór de drop: index + sleutel (dubbel). Ná de drop: sleutel alleen.

DROP INDEX IF EXISTS public.uniq_active_ai_summary_job;

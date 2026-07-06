-- Eenmalige backfill: bestaande negatieve caption-debits -> positief.
-- Goedgekeurde scope (Stap 1 verificatie 2026-07-06): exact type='debit' AND amount < 0 (627 rijen).
-- De 159 legacy-positieve caption-rijen blijven ongemoeid. Onomkeerbaar.
-- Live balans (user_credits.credits) is ONgewijzigd correct; dit herstelt alleen het log,
-- zodat SUM(credit) - SUM(debit) weer reconcilieert naar user_credits.credits.
-- Verificatie na apply: 0 negatieve debits over; 6/6 users diff=0; Credits Consumed 5813 -> 7067.
UPDATE public.credit_transactions
SET amount = ABS(amount)
WHERE type = 'debit' AND amount < 0;

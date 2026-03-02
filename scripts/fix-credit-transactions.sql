-- Complete fix for credit_transactions table
-- This handles the balance_after column issue

-- First, drop the NOT NULL constraint on balance_after if it exists
ALTER TABLE public.credit_transactions 
ALTER COLUMN balance_after DROP NOT NULL;

-- Or add default value
ALTER TABLE public.credit_transactions 
ALTER COLUMN balance_after SET DEFAULT 0;

-- Now add missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credit_transactions' AND column_name = 'type'
    ) THEN
        ALTER TABLE public.credit_transactions 
        ADD COLUMN type TEXT NOT NULL DEFAULT 'debit' CHECK (type IN ('debit', 'credit'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credit_transactions' AND column_name = 'reason'
    ) THEN
        ALTER TABLE public.credit_transactions 
        ADD COLUMN reason TEXT NOT NULL DEFAULT 'Transaction';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'credit_transactions' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE public.credit_transactions 
        ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Test: This should work now
SELECT public.deduct_credits_atomic(
    'baedeb43-12d9-4e3c-8aa2-6919ac1ec3ba'::uuid,
    1,
    'Test transaction',
    '{}'::jsonb
);

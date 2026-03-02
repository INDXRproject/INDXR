-- =====================================================
-- Whisper AI Integration - Database Schema (FIXED)
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Create user_credits table (separate from auth.users to avoid permission issues)
CREATE TABLE IF NOT EXISTS public.user_credits (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    credits INTEGER DEFAULT 0 NOT NULL,
    playlist_quota_used INTEGER DEFAULT 0 NOT NULL,
    quota_resets_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month'),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create credit_transactions table for audit trail
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('debit', 'credit')),
    reason TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_credits_user_id 
ON public.user_credits(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id 
ON public.credit_transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at 
ON public.credit_transactions(created_at DESC);

-- 4. Enable Row Level Security
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_credits (drop if exists first)
DROP POLICY IF EXISTS "Users can view own credits" ON public.user_credits;
CREATE POLICY "Users can view own credits"
ON public.user_credits
FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own credits" ON public.user_credits;
CREATE POLICY "Users can update own credits"
ON public.user_credits
FOR UPDATE
USING (auth.uid() = user_id);

-- 6. RLS Policy for credit_transactions (drop if exists first)
DROP POLICY IF EXISTS "Users can view own transactions" ON public.credit_transactions;
CREATE POLICY "Users can view own transactions"
ON public.credit_transactions
FOR SELECT
USING (auth.uid() = user_id);

-- 7. Create trigger to auto-create user_credits on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (NEW.id, 0)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 8. Create atomic credit deduction function
CREATE OR REPLACE FUNCTION public.deduct_credits_atomic(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Lock the user_credits row to prevent race conditions
    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Check if user credits record exists
    IF NOT FOUND THEN
        -- Create credits record if it doesn't exist
        INSERT INTO public.user_credits (user_id, credits)
        VALUES (p_user_id, 0)
        ON CONFLICT (user_id) DO NOTHING;
        v_current_balance := 0;
    END IF;

    -- Check if sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Insufficient credits',
            'required', p_amount,
            'available', v_current_balance
        );
    END IF;

    -- Deduct credits
    v_new_balance := v_current_balance - p_amount;
    
    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log transaction
    INSERT INTO public.credit_transactions (user_id, amount, type, reason, metadata)
    VALUES (p_user_id, p_amount, 'debit', p_reason, p_metadata);

    -- Return success
    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance,
        'amount_deducted', p_amount
    );
END;
$$;

-- 9. Create function to add credits (for testing/admin)
CREATE OR REPLACE FUNCTION public.add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'Manual credit addition'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_balance INTEGER;
    v_new_balance INTEGER;
BEGIN
    -- Ensure user_credits record exists
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    -- Lock the user_credits row
    SELECT credits INTO v_current_balance
    FROM public.user_credits
    WHERE user_id = p_user_id
    FOR UPDATE;

    -- Add credits
    v_new_balance := v_current_balance + p_amount;
    
    UPDATE public.user_credits
    SET credits = v_new_balance,
        updated_at = NOW()
    WHERE user_id = p_user_id;

    -- Log transaction
    INSERT INTO public.credit_transactions (user_id, amount, type, reason)
    VALUES (p_user_id, p_amount, 'credit', p_reason);

    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance
    );
END;
$$;

-- 10. Update get_user_credits function to use new table
CREATE OR REPLACE FUNCTION public.get_user_credits(p_user_id UUID)
RETURNS TABLE (
    credits INTEGER,
    playlist_quota_used INTEGER,
    playlist_quota_remaining INTEGER,
    quota_resets_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Ensure user_credits record exists
    INSERT INTO public.user_credits (user_id, credits)
    VALUES (p_user_id, 0)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN QUERY
    SELECT 
        COALESCE(uc.credits, 0) as credits,
        COALESCE(uc.playlist_quota_used, 0) as playlist_quota_used,
        COALESCE(50 - uc.playlist_quota_used, 50) as playlist_quota_remaining,
        COALESCE(uc.quota_resets_at, NOW() + INTERVAL '1 month') as quota_resets_at
    FROM public.user_credits uc
    WHERE uc.user_id = p_user_id;
END;
$$;

-- =====================================================
-- Success! Schema is ready for Whisper AI integration
-- =====================================================

-- OPTIONAL: Give yourself 100 test credits (replace YOUR_USER_ID)
-- SELECT public.add_credits('YOUR_USER_ID'::uuid, 100, 'Initial test credits');


-- =====================================================
-- Update add_credits to accept metadata (FIXED)
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Drop existing functions to avoid "return type mismatch" or ambiguous overload errors
-- We drop the old signature (3 args) AND the potential new one (4 args) just to be clean.
DROP FUNCTION IF EXISTS public.add_credits(uuid, integer, text);
DROP FUNCTION IF EXISTS public.add_credits(uuid, integer, text, jsonb);

-- 2. Recreate the function with the new signature and metadata support
CREATE OR REPLACE FUNCTION public.add_credits(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT DEFAULT 'Manual credit addition',
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

    -- Log transaction with metadata
    INSERT INTO public.credit_transactions (user_id, amount, type, reason, metadata)
    VALUES (p_user_id, p_amount, 'credit', p_reason, p_metadata);

    RETURN jsonb_build_object(
        'success', true,
        'previous_balance', v_current_balance,
        'new_balance', v_new_balance
    );
END;
$$;

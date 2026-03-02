-- =====================================================
-- Rate Limiting Support - Database Migration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Add new columns to user_credits table
ALTER TABLE public.user_credits
ADD COLUMN IF NOT EXISTS total_credits_purchased INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS credits_bonus INTEGER DEFAULT 0 NOT NULL;

-- 2. Update get_user_credits function to include new fields
DROP FUNCTION IF EXISTS public.get_user_credits(uuid);

CREATE OR REPLACE FUNCTION public.get_user_credits(p_user_id UUID)
RETURNS TABLE (
    credits INTEGER,
    playlist_quota_used INTEGER,
    playlist_quota_remaining INTEGER,
    quota_resets_at TIMESTAMPTZ,
    total_credits_purchased INTEGER,
    credits_bonus INTEGER
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
        COALESCE(uc.quota_resets_at, NOW() + INTERVAL '1 month') as quota_resets_at,
        COALESCE(uc.total_credits_purchased, 0) as total_credits_purchased,
        COALESCE(uc.credits_bonus, 0) as credits_bonus
    FROM public.user_credits uc
    WHERE uc.user_id = p_user_id;
END;
$$;

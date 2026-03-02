-- =====================================================
-- Welcome Reward - Database Migration
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Add tracking column to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS welcome_reward_claimed BOOLEAN DEFAULT FALSE;

-- 2. Ensure the add_credits function is accessible to authenticated users (via RPC or Service Role)
-- The add_credits function from 001_whisper_credits.sql is SECURITY DEFINER, so it bypasses RLS.
-- We just need to make sure we can call it (we will call it from Server Action).

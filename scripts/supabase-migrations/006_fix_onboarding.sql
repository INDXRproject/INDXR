-- =====================================================
-- FIX: Onboarding & Profiles - Clean Slate & Backfill
-- Run this in your Supabase SQL Editor to resolve errors
-- =====================================================

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE,
    role TEXT CHECK (role IN ('student', 'researcher', 'content_creator', 'business', 'other')),
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 Ensure columns exist (if table already existed but was incomplete)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('student', 'researcher', 'content_creator', 'business', 'other'));

-- 2. Reset RLS Policies (Drop first to avoid "already exists" error)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id);

-- 3. Backfill profiles for ANY existing users who missed the trigger
-- This fixes the "Failed to update profile" if the row was missing
INSERT INTO public.profiles (id, onboarding_completed, username)
SELECT 
    id, 
    FALSE, -- Reset onboarding for them so they see the flow, or TRUE if you prefer
    split_part(email, '@', 1) 
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 4. Verify count
SELECT count(*) as total_profiles FROM public.profiles;

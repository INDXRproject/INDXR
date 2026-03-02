-- Add 100 test credits to your account
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/uivlvwcplcaixkzuiwsv/sql/new

-- First, find your user ID
SELECT id, email FROM auth.users;

-- Copy your user ID from above, then run this (replace YOUR_USER_ID):
SELECT public.add_credits(
    'YOUR_USER_ID'::uuid,
    100,
    'Test credits for Whisper AI'
);

-- Verify it worked:
SELECT * FROM public.user_credits WHERE user_id = 'YOUR_USER_ID'::uuid;

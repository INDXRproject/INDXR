-- Add avatar_color column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color text;

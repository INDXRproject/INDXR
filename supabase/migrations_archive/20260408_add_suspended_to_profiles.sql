-- Add suspended column to profiles table for admin user management
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS suspended boolean DEFAULT false;

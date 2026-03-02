-- =====================================================
-- Update Profiles Role Constraint
-- Run this in your Supabase SQL Editor
-- =====================================================

-- 1. Drop the old constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- 2. Update existing data to match new values
UPDATE public.profiles SET role = 'academic_researcher' WHERE role = 'researcher';
UPDATE public.profiles SET role = 'marketing_business' WHERE role = 'business';

-- 3. Add new constraint with expanded roles
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
    'student', 
    'personal_projects', 
    'academic_researcher', 
    'content_creator', 
    'marketing_business', 
    'developer_technical', 
    'other'
));

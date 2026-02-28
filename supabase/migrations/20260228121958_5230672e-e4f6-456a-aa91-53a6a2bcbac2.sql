
-- Remove all RLS policies from config table before dropping
DROP POLICY IF EXISTS "Admins can delete config" ON public.config;
DROP POLICY IF EXISTS "Admins can insert config" ON public.config;
DROP POLICY IF EXISTS "Admins can update config" ON public.config;
DROP POLICY IF EXISTS "Config is viewable by everyone" ON public.config;

-- Drop the legacy config table
DROP TABLE IF EXISTS public.config;

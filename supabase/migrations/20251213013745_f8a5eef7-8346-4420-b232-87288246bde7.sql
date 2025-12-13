-- Add hero_banner_url column to config table
ALTER TABLE public.config 
ADD COLUMN hero_banner_url text DEFAULT NULL;

-- Set initial value with the uploaded banner
UPDATE public.config 
SET hero_banner_url = '/images/banner-home.jpeg' 
WHERE id = 1;
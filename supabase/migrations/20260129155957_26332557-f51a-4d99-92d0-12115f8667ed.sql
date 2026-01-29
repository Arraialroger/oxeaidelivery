-- Add new columns to restaurants for the premium details page
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS instagram text,
ADD COLUMN IF NOT EXISTS facebook text,
ADD COLUMN IF NOT EXISTS accepted_payments text[] DEFAULT ARRAY['pix', 'dinheiro', 'credito', 'debito'],
ADD COLUMN IF NOT EXISTS gallery_urls text[] DEFAULT ARRAY[]::text[],
ADD COLUMN IF NOT EXISTS min_order numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_delivery_time integer DEFAULT 40;

-- Create index for gallery if needed
CREATE INDEX IF NOT EXISTS idx_restaurants_status ON public.restaurants(status);
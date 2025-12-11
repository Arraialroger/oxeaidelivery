-- Add order_index column to products table
ALTER TABLE public.products 
ADD COLUMN order_index integer DEFAULT 0;

-- Update existing products with sequential order based on name
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) - 1 as new_order
  FROM public.products
)
UPDATE public.products p
SET order_index = n.new_order
FROM numbered n
WHERE p.id = n.id;
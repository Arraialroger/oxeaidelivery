
-- Create upsell_products table
CREATE TABLE public.upsell_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id, product_id)
);

-- Enable RLS
ALTER TABLE public.upsell_products ENABLE ROW LEVEL SECURITY;

-- Public can read upsell products (needed for checkout display)
CREATE POLICY "Public can view upsell products"
ON public.upsell_products
FOR SELECT
USING (true);

-- Admins can manage their restaurant's upsell products
CREATE POLICY "Admins can manage their restaurant upsell products"
ON public.upsell_products
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

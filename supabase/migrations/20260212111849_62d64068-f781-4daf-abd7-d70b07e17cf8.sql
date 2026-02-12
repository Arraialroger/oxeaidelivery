
-- Create coupons table
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  code text NOT NULL,
  description text,
  discount_type text NOT NULL DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percentage')),
  discount_value numeric NOT NULL DEFAULT 0,
  min_order_value numeric NOT NULL DEFAULT 0,
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  first_purchase_only boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Unique code per restaurant
CREATE UNIQUE INDEX idx_coupons_code_restaurant ON public.coupons (restaurant_id, upper(code));

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Admins can manage their restaurant coupons
CREATE POLICY "Admins can manage their restaurant coupons"
ON public.coupons
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()));

-- Public can view active coupons for valid restaurants
CREATE POLICY "Public can view active coupons"
ON public.coupons
FOR SELECT
USING (is_active = true AND is_valid_restaurant(restaurant_id));

-- Create coupon_uses table to track individual uses
CREATE TABLE public.coupon_uses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  coupon_id uuid NOT NULL REFERENCES public.coupons(id),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  customer_id uuid REFERENCES public.customers(id),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  discount_applied numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.coupon_uses ENABLE ROW LEVEL SECURITY;

-- Admins can view their restaurant coupon uses
CREATE POLICY "Admins can view their restaurant coupon uses"
ON public.coupon_uses
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()));

-- Insert with valid restaurant
CREATE POLICY "Coupon uses insertable with valid restaurant"
ON public.coupon_uses
FOR INSERT
WITH CHECK (restaurant_id IS NOT NULL AND is_valid_restaurant(restaurant_id));

-- Add coupon fields to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_discount numeric DEFAULT 0;

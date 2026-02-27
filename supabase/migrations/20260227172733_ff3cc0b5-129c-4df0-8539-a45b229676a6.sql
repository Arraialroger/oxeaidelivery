
-- Enable pgcrypto for encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Table to store per-restaurant payment gateway credentials
CREATE TABLE public.restaurant_payment_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'mercadopago',
  gateway_mode text NOT NULL DEFAULT 'platform' CHECK (gateway_mode IN ('platform', 'own_gateway')),
  encrypted_access_token text,
  public_key text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restaurant_payment_settings ENABLE ROW LEVEL SECURITY;

-- Only admins of the restaurant can view/manage their settings
CREATE POLICY "Admins can manage their restaurant payment settings"
ON public.restaurant_payment_settings
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

-- Trigger for updated_at
CREATE TRIGGER update_restaurant_payment_settings_updated_at
BEFORE UPDATE ON public.restaurant_payment_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_restaurants_updated_at();

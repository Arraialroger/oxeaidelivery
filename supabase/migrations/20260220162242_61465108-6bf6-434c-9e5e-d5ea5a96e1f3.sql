
-- =============================================
-- Sprint 1: Onboarding Self-Service Tables
-- =============================================

-- 1. Plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  price_monthly numeric NOT NULL DEFAULT 0,
  features jsonb NOT NULL DEFAULT '{}'::jsonb,
  limits jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plans are viewable by everyone"
  ON public.plans FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can manage plans"
  ON public.plans FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed initial plans
INSERT INTO public.plans (name, display_name, price_monthly, features, limits) VALUES
  ('starter', 'Starter', 0, '{"platform_fee_percentage": 5, "max_products": 20, "kds_enabled": false, "loyalty_enabled": false}'::jsonb, '{"max_orders_month": 100}'::jsonb),
  ('pro', 'Pro', 99, '{"platform_fee_percentage": 3.5, "max_products": 200, "kds_enabled": true, "loyalty_enabled": true, "upsell_enabled": true}'::jsonb, '{"max_orders_month": 5000}'::jsonb),
  ('enterprise', 'Enterprise', 249, '{"platform_fee_percentage": 2, "max_products": -1, "kds_enabled": true, "loyalty_enabled": true, "upsell_enabled": true, "whatsapp_enabled": true}'::jsonb, '{"max_orders_month": -1}'::jsonb);

-- 2. Subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trialing',
  trial_ends_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (restaurant_id)
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Restaurant owners/admins can view their subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    is_restaurant_owner(auth.uid(), restaurant_id)
    OR (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()))
  );

CREATE POLICY "Subscriptions insertable by service role only"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    is_restaurant_owner(auth.uid(), restaurant_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Subscription updatable by owner or admin"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (
    is_restaurant_owner(auth.uid(), restaurant_id)
    OR (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()))
  );

-- Trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_restaurants_updated_at();

-- 3. Onboarding events table (activation funnel tracking)
CREATE TABLE public.onboarding_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their restaurant onboarding events"
  ON public.onboarding_events FOR SELECT
  TO authenticated
  USING (
    is_restaurant_owner(auth.uid(), restaurant_id)
    OR (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()))
  );

CREATE POLICY "Onboarding events insertable by owner"
  ON public.onboarding_events FOR INSERT
  TO authenticated
  WITH CHECK (
    is_restaurant_owner(auth.uid(), restaurant_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- 4. Referral clicks table (growth loop tracking)
CREATE TABLE public.referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  referrer_restaurant_id uuid REFERENCES public.restaurants(id),
  source text DEFAULT 'link',
  utm_campaign text,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert referral clicks with valid restaurant"
  ON public.referral_clicks FOR INSERT
  WITH CHECK (restaurant_id IS NOT NULL AND is_valid_restaurant(restaurant_id));

CREATE POLICY "Admins can view their restaurant referral clicks"
  ON public.referral_clicks FOR SELECT
  TO authenticated
  USING (
    is_restaurant_owner(auth.uid(), restaurant_id)
    OR (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()))
  );

-- Index for performance
CREATE INDEX idx_onboarding_events_restaurant ON public.onboarding_events(restaurant_id, event_type);
CREATE INDEX idx_referral_clicks_restaurant ON public.referral_clicks(restaurant_id, created_at DESC);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Add UNIQUE constraint on restaurants.slug if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'restaurants_slug_key'
  ) THEN
    ALTER TABLE public.restaurants ADD CONSTRAINT restaurants_slug_key UNIQUE (slug);
  END IF;
END $$;


-- payment_alerts table for monitoring and reconciliation
CREATE TABLE public.payment_alerts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  alert_type text NOT NULL,
  severity text NOT NULL DEFAULT 'warning',
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  resolved boolean NOT NULL DEFAULT false,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their restaurant payment alerts"
  ON public.payment_alerts FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE POLICY "Payment alerts insertable with valid restaurant"
  ON public.payment_alerts FOR INSERT
  WITH CHECK (restaurant_id IS NOT NULL AND is_valid_restaurant(restaurant_id));

CREATE POLICY "Admins can update their restaurant payment alerts"
  ON public.payment_alerts FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()));

CREATE INDEX idx_payment_alerts_restaurant_created ON public.payment_alerts(restaurant_id, created_at DESC);
CREATE INDEX idx_payment_alerts_unresolved ON public.payment_alerts(resolved, created_at DESC) WHERE resolved = false;

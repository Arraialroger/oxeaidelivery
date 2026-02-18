
-- Table to track upsell events (impressions & additions)
CREATE TABLE public.upsell_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'impression' or 'added'
  session_id text,
  customer_phone text,
  product_price numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast queries by restaurant and date
CREATE INDEX idx_upsell_events_restaurant_date ON public.upsell_events(restaurant_id, created_at DESC);
CREATE INDEX idx_upsell_events_type ON public.upsell_events(event_type);

-- Enable RLS
ALTER TABLE public.upsell_events ENABLE ROW LEVEL SECURITY;

-- Anyone can insert (checkout is public)
CREATE POLICY "Anyone can insert upsell events with valid restaurant"
  ON public.upsell_events
  FOR INSERT
  WITH CHECK (restaurant_id IS NOT NULL AND is_valid_restaurant(restaurant_id));

-- Only admins can view their restaurant's events
CREATE POLICY "Admins can view their restaurant upsell events"
  ON public.upsell_events
  FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()));

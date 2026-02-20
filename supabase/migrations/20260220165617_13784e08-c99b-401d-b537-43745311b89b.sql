
-- ============================================
-- Sprint 2: Payments Infrastructure
-- ============================================

-- Payments table - decoupled from orders
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  order_id uuid REFERENCES public.orders(id),
  
  -- Provider info
  provider text NOT NULL DEFAULT 'mercadopago',
  provider_payment_id text,
  provider_status text,
  provider_raw jsonb,
  
  -- Payment details
  payment_method text NOT NULL DEFAULT 'pix',
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  status text NOT NULL DEFAULT 'pending',
  
  -- PIX specific
  pix_qr_code text,
  pix_qr_code_base64 text,
  pix_expiration_date timestamptz,
  
  -- Refund
  refund_amount numeric DEFAULT 0,
  refund_reason text,
  
  -- Metadata
  idempotency_key text UNIQUE,
  metadata jsonb DEFAULT '{}'::jsonb,
  
  -- Timestamps
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Payment events log for audit trail
CREATE TABLE public.payment_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  provider_status text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payments_restaurant_id ON public.payments(restaurant_id);
CREATE INDEX idx_payments_order_id ON public.payments(order_id);
CREATE INDEX idx_payments_provider_payment_id ON public.payments(provider_payment_id);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_idempotency ON public.payments(idempotency_key);
CREATE INDEX idx_payment_events_payment_id ON public.payment_events(payment_id);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

-- Payments: admins can view their restaurant payments
CREATE POLICY "Admins can view their restaurant payments"
ON public.payments FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

-- Payments: public can view own payment by order (for polling)
CREATE POLICY "Anyone can view payments by valid restaurant"
ON public.payments FOR SELECT
USING (is_valid_restaurant(restaurant_id));

-- Payments: insert only with valid restaurant
CREATE POLICY "Payments insertable with valid restaurant"
ON public.payments FOR INSERT
WITH CHECK (restaurant_id IS NOT NULL AND is_valid_restaurant(restaurant_id));

-- Payments: update by admin only
CREATE POLICY "Admins can update their restaurant payments"
ON public.payments FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

-- Payment events: viewable by admin
CREATE POLICY "Admins can view their restaurant payment events"
ON public.payment_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = payment_events.payment_id
    AND p.restaurant_id = get_user_restaurant_id(auth.uid())
    AND has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Payment events: insertable with valid payment
CREATE POLICY "Payment events insertable with valid payment"
ON public.payment_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.payments p
    WHERE p.id = payment_events.payment_id
    AND is_valid_restaurant(p.restaurant_id)
  )
);

-- Updated_at trigger for payments
CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.update_restaurants_updated_at();

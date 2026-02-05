-- =====================================================
-- FASE 1: Fundação Geoespacial para Endereços e Zonas
-- =====================================================

-- 1. Adicionar campos geoespaciais na tabela addresses
ALTER TABLE public.addresses 
ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS formatted_address TEXT,
ADD COLUMN IF NOT EXISTS place_id TEXT,
ADD COLUMN IF NOT EXISTS address_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS delivery_zone_id UUID REFERENCES public.delivery_zones(id);

-- 2. Adicionar campos de polígono/raio na tabela delivery_zones
ALTER TABLE public.delivery_zones
ADD COLUMN IF NOT EXISTS polygon_coords JSONB,
ADD COLUMN IF NOT EXISTS is_polygon BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS estimated_delivery_time INTEGER,
ADD COLUMN IF NOT EXISTS center_lat NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS center_lng NUMERIC(10, 7),
ADD COLUMN IF NOT EXISTS radius_km NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS min_order_value NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS free_delivery_above NUMERIC(10, 2);

-- 3. Criar tabela de log de tentativas de entrega (para análise de demanda)
CREATE TABLE IF NOT EXISTS public.delivery_attempts_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  customer_phone TEXT,
  latitude NUMERIC(10, 7),
  longitude NUMERIC(10, 7),
  requested_address TEXT,
  rejection_reason TEXT,
  nearest_zone_id UUID REFERENCES public.delivery_zones(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Criar tabela de eventos de checkout (para métricas de abandono)
CREATE TABLE IF NOT EXISTS public.checkout_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id),
  session_id TEXT,
  customer_phone TEXT,
  event_type TEXT NOT NULL,
  step_name TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Índices para performance
CREATE INDEX IF NOT EXISTS idx_addresses_coords ON public.addresses(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_delivery_zones_coords ON public.delivery_zones(center_lat, center_lng);
CREATE INDEX IF NOT EXISTS idx_delivery_attempts_restaurant ON public.delivery_attempts_log(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_checkout_events_restaurant ON public.checkout_events(restaurant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_checkout_events_session ON public.checkout_events(session_id);

-- 6. RLS para delivery_attempts_log
ALTER TABLE public.delivery_attempts_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their restaurant delivery attempts"
ON public.delivery_attempts_log FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

CREATE POLICY "Anyone can insert delivery attempts with valid restaurant"
ON public.delivery_attempts_log FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND is_valid_restaurant(restaurant_id)
);

-- 7. RLS para checkout_events
ALTER TABLE public.checkout_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their restaurant checkout events"
ON public.checkout_events FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

CREATE POLICY "Anyone can insert checkout events with valid restaurant"
ON public.checkout_events FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND is_valid_restaurant(restaurant_id)
);
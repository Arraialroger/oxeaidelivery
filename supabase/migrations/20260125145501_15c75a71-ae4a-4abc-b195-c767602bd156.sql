-- ============================================
-- FASE 1, SEMANA 1 - MIGRATION 4/4
-- Criar tabelas delivery_zones e business_hours
-- ============================================

-- 1. Criar tabela delivery_zones (áreas de entrega por restaurante)
CREATE TABLE public.delivery_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  neighborhood TEXT NOT NULL,
  cep_prefix TEXT,
  is_active BOOLEAN DEFAULT true,
  delivery_fee_override NUMERIC,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, neighborhood)
);

CREATE INDEX idx_delivery_zones_restaurant ON public.delivery_zones(restaurant_id);

-- Habilitar RLS
ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;

-- Políticas: Público pode ver, admins podem gerenciar
CREATE POLICY "Public can view delivery zones"
ON public.delivery_zones
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage delivery zones"
ON public.delivery_zones
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Comentário
COMMENT ON TABLE public.delivery_zones IS 'Áreas de entrega permitidas por restaurante';
COMMENT ON COLUMN public.delivery_zones.delivery_fee_override IS 'Taxa específica para este bairro (null = usa padrão do restaurante)';

-- 2. Criar tabela business_hours (horário de funcionamento)
CREATE TABLE public.business_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  open_time TIME,
  close_time TIME,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(restaurant_id, day_of_week)
);

CREATE INDEX idx_business_hours_restaurant ON public.business_hours(restaurant_id);

-- Habilitar RLS
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;

-- Políticas: Público pode ver, admins podem gerenciar
CREATE POLICY "Public can view business hours"
ON public.business_hours
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage business hours"
ON public.business_hours
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Comentário
COMMENT ON TABLE public.business_hours IS 'Horário de funcionamento por dia da semana (0=domingo, 6=sábado)';

-- 3. Inserir bairros iniciais para o Astral (Arraial d Ajuda e região)
INSERT INTO public.delivery_zones (restaurant_id, neighborhood, is_active)
SELECT 
  r.id,
  bairro,
  true
FROM public.restaurants r,
UNNEST(ARRAY[
  'Centro',
  'Arraial d''Ajuda',
  'Mucugê',
  'Pitinga',
  'Parracho',
  'Apaga Fogo',
  'São Brás',
  'Trancoso',
  'Estrada Arraial-Trancoso'
]) AS bairro
WHERE r.slug = 'astral'
ON CONFLICT (restaurant_id, neighborhood) DO NOTHING;

-- 4. Inserir horários padrão para o Astral (18:00 - 23:00, fechado segunda)
INSERT INTO public.business_hours (restaurant_id, day_of_week, open_time, close_time, is_closed)
SELECT 
  r.id,
  dia.day_of_week,
  dia.open_time,
  dia.close_time,
  dia.is_closed
FROM public.restaurants r,
(VALUES
  (0, '18:00'::TIME, '23:00'::TIME, false), -- Domingo
  (1, NULL, NULL, true),                     -- Segunda (fechado)
  (2, '18:00'::TIME, '23:00'::TIME, false), -- Terça
  (3, '18:00'::TIME, '23:00'::TIME, false), -- Quarta
  (4, '18:00'::TIME, '23:00'::TIME, false), -- Quinta
  (5, '18:00'::TIME, '23:30'::TIME, false), -- Sexta
  (6, '18:00'::TIME, '23:30'::TIME, false)  -- Sábado
) AS dia(day_of_week, open_time, close_time, is_closed)
WHERE r.slug = 'astral'
ON CONFLICT (restaurant_id, day_of_week) DO NOTHING;
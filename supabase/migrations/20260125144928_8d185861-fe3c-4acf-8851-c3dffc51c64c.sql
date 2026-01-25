-- ============================================
-- FASE 1, SEMANA 1 - MIGRATION 1/4
-- Criar tabela master de restaurantes
-- ============================================

-- 1. Criar tabela restaurants (master table do multi-tenant)
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  logo_url TEXT,
  hero_banner_url TEXT,
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#ffffff',
  phone TEXT,
  whatsapp TEXT,
  address TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  settings JSONB DEFAULT '{
    "delivery_fee": 5,
    "is_open": true,
    "loyalty_enabled": true,
    "loyalty_stamps_goal": 8,
    "loyalty_min_order": 50,
    "loyalty_reward_value": 50,
    "kds_enabled": true,
    "local_ddd": "73"
  }'::jsonb
);

-- 2. Criar índice para buscas por slug (roteamento)
CREATE INDEX idx_restaurants_slug ON public.restaurants(slug);

-- 3. Criar índice para buscas por status
CREATE INDEX idx_restaurants_status ON public.restaurants(status);

-- 4. Habilitar RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;

-- 5. Política: Qualquer um pode ver restaurantes ativos (para o menu público)
CREATE POLICY "Public can view active restaurants"
ON public.restaurants
FOR SELECT
USING (status = 'active');

-- 6. Política: Owners podem gerenciar seu restaurante
CREATE POLICY "Owners can manage their restaurant"
ON public.restaurants
FOR ALL
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- 7. Criar trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_restaurants_updated_at
BEFORE UPDATE ON public.restaurants
FOR EACH ROW
EXECUTE FUNCTION public.update_restaurants_updated_at();

-- 8. Comentário na tabela para documentação
COMMENT ON TABLE public.restaurants IS 'Master table for multi-tenant restaurant management';
COMMENT ON COLUMN public.restaurants.slug IS 'Unique URL-friendly identifier for routing (e.g., /astral/menu)';
COMMENT ON COLUMN public.restaurants.settings IS 'JSONB with restaurant-specific settings like delivery_fee, loyalty config, etc.';
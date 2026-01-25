-- ============================================
-- FASE 1, SEMANA 1 - MIGRATION 3/4
-- Criar restaurante piloto e migrar dados existentes
-- ============================================

-- 1. Inserir o restaurante piloto Astral Gastro Bar
-- Usamos INSERT com ON CONFLICT para ser idempotente
INSERT INTO public.restaurants (
  name,
  slug,
  logo_url,
  hero_banner_url,
  phone,
  whatsapp,
  status,
  settings
) VALUES (
  'Astral Gastro Bar',
  'astral',
  '/logo-astral.png',
  '/images/banner-astral.png',
  '(73) 99999-9999',
  '5573999999999',
  'active',
  '{
    "delivery_fee": 5,
    "is_open": true,
    "loyalty_enabled": true,
    "loyalty_stamps_goal": 3,
    "loyalty_min_order": 50,
    "loyalty_reward_value": 50,
    "kds_enabled": true,
    "local_ddd": "73"
  }'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Atualizar todos os produtos existentes para pertencer ao Astral
UPDATE public.products 
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'astral')
WHERE restaurant_id IS NULL;

-- 3. Atualizar todas as categorias existentes
UPDATE public.categories 
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'astral')
WHERE restaurant_id IS NULL;

-- 4. Atualizar todas as product_options existentes
UPDATE public.product_options 
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'astral')
WHERE restaurant_id IS NULL;

-- 5. Atualizar todos os pedidos existentes (se houver)
UPDATE public.orders 
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'astral')
WHERE restaurant_id IS NULL;

-- 6. Atualizar todos os clientes existentes (se houver)
UPDATE public.customers 
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'astral')
WHERE restaurant_id IS NULL;

-- 7. Atualizar todos os endereços existentes (se houver)
UPDATE public.addresses 
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'astral')
WHERE restaurant_id IS NULL;

-- 8. Atualizar stamp_transactions existentes (se houver)
UPDATE public.stamp_transactions 
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'astral')
WHERE restaurant_id IS NULL;

-- 9. Atualizar push_subscriptions existentes (se houver)
UPDATE public.push_subscriptions 
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'astral')
WHERE restaurant_id IS NULL;

-- 10. Atualizar kds_events existentes (se houver)
UPDATE public.kds_events 
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'astral')
WHERE restaurant_id IS NULL;

-- 11. Atualizar user_roles existentes para o Astral
UPDATE public.user_roles 
SET restaurant_id = (SELECT id FROM public.restaurants WHERE slug = 'astral')
WHERE restaurant_id IS NULL;
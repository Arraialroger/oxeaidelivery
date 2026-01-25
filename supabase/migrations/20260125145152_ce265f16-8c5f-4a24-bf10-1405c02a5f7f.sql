-- ============================================
-- FASE 1, SEMANA 1 - MIGRATION 2/4
-- Adicionar restaurant_id em todas as tabelas
-- ============================================

-- 1. PRODUCTS - Adicionar restaurant_id
ALTER TABLE public.products 
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

CREATE INDEX idx_products_restaurant ON public.products(restaurant_id);

-- 2. CATEGORIES - Adicionar restaurant_id
ALTER TABLE public.categories 
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

CREATE INDEX idx_categories_restaurant ON public.categories(restaurant_id);

-- 3. ORDERS - Adicionar restaurant_id
ALTER TABLE public.orders 
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

CREATE INDEX idx_orders_restaurant ON public.orders(restaurant_id);

-- 4. CUSTOMERS - Adicionar restaurant_id
ALTER TABLE public.customers 
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

CREATE INDEX idx_customers_restaurant ON public.customers(restaurant_id);

-- 5. ADDRESSES - Adicionar restaurant_id
ALTER TABLE public.addresses 
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

CREATE INDEX idx_addresses_restaurant ON public.addresses(restaurant_id);

-- 6. PRODUCT_OPTIONS - Adicionar restaurant_id
ALTER TABLE public.product_options 
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

CREATE INDEX idx_product_options_restaurant ON public.product_options(restaurant_id);

-- 7. STAMP_TRANSACTIONS - Adicionar restaurant_id
ALTER TABLE public.stamp_transactions 
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

CREATE INDEX idx_stamp_transactions_restaurant ON public.stamp_transactions(restaurant_id);

-- 8. PUSH_SUBSCRIPTIONS - Adicionar restaurant_id
ALTER TABLE public.push_subscriptions 
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

CREATE INDEX idx_push_subscriptions_restaurant ON public.push_subscriptions(restaurant_id);

-- 9. KDS_EVENTS - Adicionar restaurant_id
ALTER TABLE public.kds_events 
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

CREATE INDEX idx_kds_events_restaurant ON public.kds_events(restaurant_id);

-- 10. USER_ROLES - Adicionar restaurant_id (crítico para multi-tenant admin)
ALTER TABLE public.user_roles 
ADD COLUMN restaurant_id UUID REFERENCES public.restaurants(id);

CREATE INDEX idx_user_roles_restaurant ON public.user_roles(restaurant_id);

-- Comentários para documentação
COMMENT ON COLUMN public.products.restaurant_id IS 'FK to restaurants - isolates products per tenant';
COMMENT ON COLUMN public.categories.restaurant_id IS 'FK to restaurants - isolates categories per tenant';
COMMENT ON COLUMN public.orders.restaurant_id IS 'FK to restaurants - isolates orders per tenant';
COMMENT ON COLUMN public.customers.restaurant_id IS 'FK to restaurants - isolates customers per tenant';
COMMENT ON COLUMN public.user_roles.restaurant_id IS 'FK to restaurants - defines which restaurant this admin/user belongs to';
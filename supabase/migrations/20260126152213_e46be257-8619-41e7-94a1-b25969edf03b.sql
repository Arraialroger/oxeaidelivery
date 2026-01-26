-- ============================================
-- SEMANA 3: RLS MULTI-TENANT POR RESTAURANT_ID
-- ============================================

-- ============================================
-- PARTE 1: FUNÇÃO HELPER PARA VERIFICAR OWNER
-- ============================================

-- Função para verificar se usuário é owner do restaurante
-- Evita recursão em RLS policies
CREATE OR REPLACE FUNCTION public.is_restaurant_owner(_user_id uuid, _restaurant_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.restaurants
    WHERE id = _restaurant_id
      AND owner_id = _user_id
  )
$$;

-- Função para obter restaurant_id do usuário logado
-- Busca na tabela user_roles
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT restaurant_id
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- ============================================
-- PARTE 2: ATUALIZAR RLS PARA PRODUCTS
-- ============================================

-- Drop policies existentes
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;

-- Novas policies com restaurant_id
CREATE POLICY "Products are viewable by everyone"
ON public.products FOR SELECT
USING (true);

CREATE POLICY "Admins can insert their restaurant products"
ON public.products FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

CREATE POLICY "Admins can update their restaurant products"
ON public.products FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

CREATE POLICY "Admins can delete their restaurant products"
ON public.products FOR DELETE
USING (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

-- ============================================
-- PARTE 3: ATUALIZAR RLS PARA CATEGORIES
-- ============================================

DROP POLICY IF EXISTS "Admins can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Admins can update categories" ON public.categories;
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;

CREATE POLICY "Categories are viewable by everyone"
ON public.categories FOR SELECT
USING (true);

CREATE POLICY "Admins can insert their restaurant categories"
ON public.categories FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

CREATE POLICY "Admins can update their restaurant categories"
ON public.categories FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

CREATE POLICY "Admins can delete their restaurant categories"
ON public.categories FOR DELETE
USING (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

-- ============================================
-- PARTE 4: ATUALIZAR RLS PARA ORDERS
-- ============================================

DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;

-- SELECT: Público (filtrado por app), Admin vê só do seu restaurante
CREATE POLICY "Orders are viewable by everyone"
ON public.orders FOR SELECT
USING (true);

-- INSERT: Qualquer um pode criar pedido (checkout público)
CREATE POLICY "Anyone can insert orders"
ON public.orders FOR INSERT
WITH CHECK (true);

-- UPDATE: Admins podem atualizar só pedidos do seu restaurante
CREATE POLICY "Admins can update their restaurant orders"
ON public.orders FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

-- ============================================
-- PARTE 5: ATUALIZAR RLS PARA CUSTOMERS
-- ============================================

DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can view customers" ON public.customers;

CREATE POLICY "Customers are viewable by everyone"
ON public.customers FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert customers"
ON public.customers FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update customers"
ON public.customers FOR UPDATE
USING (true);

-- ============================================
-- PARTE 6: ATUALIZAR RLS PARA ADDRESSES
-- ============================================

DROP POLICY IF EXISTS "Anyone can insert addresses" ON public.addresses;
DROP POLICY IF EXISTS "Anyone can update addresses" ON public.addresses;
DROP POLICY IF EXISTS "Anyone can view addresses" ON public.addresses;

CREATE POLICY "Addresses are viewable by everyone"
ON public.addresses FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert addresses"
ON public.addresses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update addresses"
ON public.addresses FOR UPDATE
USING (true);

-- ============================================
-- PARTE 7: ATUALIZAR RLS PARA PRODUCT_OPTIONS
-- ============================================

DROP POLICY IF EXISTS "Admins can delete product options" ON public.product_options;
DROP POLICY IF EXISTS "Admins can insert product options" ON public.product_options;
DROP POLICY IF EXISTS "Admins can update product options" ON public.product_options;
DROP POLICY IF EXISTS "Product options are viewable by everyone" ON public.product_options;

CREATE POLICY "Product options are viewable by everyone"
ON public.product_options FOR SELECT
USING (true);

CREATE POLICY "Admins can insert their restaurant product options"
ON public.product_options FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

CREATE POLICY "Admins can update their restaurant product options"
ON public.product_options FOR UPDATE
USING (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

CREATE POLICY "Admins can delete their restaurant product options"
ON public.product_options FOR DELETE
USING (
  has_role(auth.uid(), 'admin') 
  AND restaurant_id = get_user_restaurant_id(auth.uid())
);

-- ============================================
-- PARTE 8: ATUALIZAR RLS PARA KDS_EVENTS
-- ============================================

DROP POLICY IF EXISTS "Anyone can insert kds events" ON public.kds_events;
DROP POLICY IF EXISTS "Anyone can view kds events" ON public.kds_events;

CREATE POLICY "KDS events are viewable by everyone"
ON public.kds_events FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert kds events"
ON public.kds_events FOR INSERT
WITH CHECK (true);

-- ============================================
-- PARTE 9: ATUALIZAR RLS PARA STAMP_TRANSACTIONS
-- ============================================

DROP POLICY IF EXISTS "Anyone can insert stamp transactions" ON public.stamp_transactions;
DROP POLICY IF EXISTS "Anyone can view stamp transactions" ON public.stamp_transactions;

CREATE POLICY "Stamp transactions are viewable by everyone"
ON public.stamp_transactions FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert stamp transactions"
ON public.stamp_transactions FOR INSERT
WITH CHECK (true);

-- ============================================
-- PARTE 10: ATUALIZAR RLS PARA PUSH_SUBSCRIPTIONS
-- ============================================

DROP POLICY IF EXISTS "Anyone can delete push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can view push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Push subscriptions are viewable by everyone"
ON public.push_subscriptions FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert push subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can delete push subscriptions"
ON public.push_subscriptions FOR DELETE
USING (true);
-- ============================================
-- SEMANA 4: RLS RESTRITIVA MULTI-TENANT
-- ============================================

-- PARTE 1: FUNCAO HELPER
CREATE OR REPLACE FUNCTION public.is_valid_restaurant(_restaurant_id uuid)
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
      AND status = 'active'
  )
$$;

-- PARTE 2: PRODUCTS
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;

CREATE POLICY "Products viewable with restaurant filter"
ON public.products FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin') 
   AND restaurant_id = get_user_restaurant_id(auth.uid()))
  OR is_valid_restaurant(restaurant_id)
);

-- PARTE 3: CATEGORIES
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON public.categories;

CREATE POLICY "Categories viewable with restaurant filter"
ON public.categories FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin') 
   AND restaurant_id = get_user_restaurant_id(auth.uid()))
  OR is_valid_restaurant(restaurant_id)
);

-- PARTE 4: ORDERS
DROP POLICY IF EXISTS "Orders are viewable by everyone" ON public.orders;

CREATE POLICY "Orders viewable with restaurant filter"
ON public.orders FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin') 
   AND restaurant_id = get_user_restaurant_id(auth.uid()))
  OR is_valid_restaurant(restaurant_id)
);

-- PARTE 5: CUSTOMERS
DROP POLICY IF EXISTS "Customers are viewable by everyone" ON public.customers;
DROP POLICY IF EXISTS "Anyone can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Anyone can update customers" ON public.customers;

CREATE POLICY "Customers viewable with restaurant filter"
ON public.customers FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin') 
   AND restaurant_id = get_user_restaurant_id(auth.uid()))
  OR is_valid_restaurant(restaurant_id)
);

CREATE POLICY "Customers insertable with valid restaurant"
ON public.customers FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL AND is_valid_restaurant(restaurant_id)
);

CREATE POLICY "Customers updatable with restaurant filter"
ON public.customers FOR UPDATE
USING (
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin') 
   AND restaurant_id = get_user_restaurant_id(auth.uid()))
  OR is_valid_restaurant(restaurant_id)
);

-- PARTE 6: ADDRESSES
DROP POLICY IF EXISTS "Addresses are viewable by everyone" ON public.addresses;
DROP POLICY IF EXISTS "Anyone can insert addresses" ON public.addresses;
DROP POLICY IF EXISTS "Anyone can update addresses" ON public.addresses;

CREATE POLICY "Addresses viewable with restaurant filter"
ON public.addresses FOR SELECT
USING (
  restaurant_id IS NULL OR is_valid_restaurant(restaurant_id)
);

CREATE POLICY "Addresses insertable with valid restaurant"
ON public.addresses FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL AND is_valid_restaurant(restaurant_id)
);

CREATE POLICY "Addresses updatable with restaurant filter"
ON public.addresses FOR UPDATE
USING (
  restaurant_id IS NULL OR is_valid_restaurant(restaurant_id)
);

-- PARTE 7: STAMP_TRANSACTIONS
DROP POLICY IF EXISTS "Stamp transactions are viewable by everyone" ON public.stamp_transactions;
DROP POLICY IF EXISTS "Anyone can insert stamp transactions" ON public.stamp_transactions;

CREATE POLICY "Stamp transactions viewable with restaurant filter"
ON public.stamp_transactions FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin') 
   AND restaurant_id = get_user_restaurant_id(auth.uid()))
  OR is_valid_restaurant(restaurant_id)
);

CREATE POLICY "Stamp transactions insertable with valid restaurant"
ON public.stamp_transactions FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL AND is_valid_restaurant(restaurant_id)
);

-- PARTE 8: KDS_EVENTS
DROP POLICY IF EXISTS "KDS events are viewable by everyone" ON public.kds_events;
DROP POLICY IF EXISTS "Anyone can insert kds events" ON public.kds_events;

CREATE POLICY "KDS events viewable with restaurant filter"
ON public.kds_events FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin') 
   AND restaurant_id = get_user_restaurant_id(auth.uid()))
  OR is_valid_restaurant(restaurant_id)
);

CREATE POLICY "KDS events insertable with valid restaurant"
ON public.kds_events FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL AND is_valid_restaurant(restaurant_id)
);

-- PARTE 9: PRODUCT_OPTIONS
DROP POLICY IF EXISTS "Product options are viewable by everyone" ON public.product_options;

CREATE POLICY "Product options viewable with restaurant filter"
ON public.product_options FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND has_role(auth.uid(), 'admin') 
   AND restaurant_id = get_user_restaurant_id(auth.uid()))
  OR is_valid_restaurant(restaurant_id)
);
-- =============================================
-- ETAPA 2: RLS para Vendas e Sistema (Minimalista Ajustado)
-- =============================================

-- 1. CUSTOMERS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert customers"
ON public.customers FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update customers"
ON public.customers FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read customers"
ON public.customers FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete customers"
ON public.customers FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. ADDRESSES
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can insert addresses"
ON public.addresses FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can update addresses"
ON public.addresses FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read addresses"
ON public.addresses FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete addresses"
ON public.addresses FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view orders"
ON public.orders FOR SELECT USING (true);

CREATE POLICY "Public can insert orders"
ON public.orders FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update orders"
ON public.orders FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete orders"
ON public.orders FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. ORDER_ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view order items"
ON public.order_items FOR SELECT USING (true);

CREATE POLICY "Public can insert order items"
ON public.order_items FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update order items"
ON public.order_items FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete order items"
ON public.order_items FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 5. ORDER_ITEM_OPTIONS
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view order item options"
ON public.order_item_options FOR SELECT USING (true);

CREATE POLICY "Public can insert order item options"
ON public.order_item_options FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update order item options"
ON public.order_item_options FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete order item options"
ON public.order_item_options FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 6. KDS_EVENTS (Sistema)
ALTER TABLE public.kds_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage kds events"
ON public.kds_events FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 7. USER_ROLES (Sistema Crítico)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage user roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 8. SMS_CODES (Sistema)
ALTER TABLE public.sms_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage sms codes"
ON public.sms_codes FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
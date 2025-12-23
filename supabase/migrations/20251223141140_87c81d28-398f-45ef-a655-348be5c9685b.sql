-- ============================================
-- FASE 1: Remover políticas permissivas antigas
-- ============================================

-- orders
DROP POLICY IF EXISTS "Aceitar Tudo Orders" ON public.orders;

-- order_items
DROP POLICY IF EXISTS "Aceitar Tudo Items" ON public.order_items;

-- order_item_options
DROP POLICY IF EXISTS "Aceitar Tudo Options" ON public.order_item_options;

-- addresses
DROP POLICY IF EXISTS "Aceitar Tudo Addresses" ON public.addresses;
DROP POLICY IF EXISTS "Enable insert for all addresses" ON public.addresses;
DROP POLICY IF EXISTS "Enable read for all addresses" ON public.addresses;

-- customers
DROP POLICY IF EXISTS "Enable insert for all customers" ON public.customers;
DROP POLICY IF EXISTS "Enable select for all customers" ON public.customers;

-- kds_events
DROP POLICY IF EXISTS "Aceitar Tudo KDS" ON public.kds_events;

-- ============================================
-- FASE 2: Políticas para PRODUCTS (leitura pública)
-- ============================================

-- Já existe products_public_read, mas vamos garantir que admin tem acesso total
-- Políticas admin já existem (products_admin_insert, products_admin_update, products_admin_delete)
-- Produtos inativos devem ser visíveis para admin
DROP POLICY IF EXISTS "products_public_read" ON public.products;
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (is_active = true);

CREATE POLICY "products_admin_select" ON public.products
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FASE 3: Políticas para CATEGORIES (leitura pública)
-- ============================================
-- Já corretas: categories_public_read, categories_admin_*

-- ============================================
-- FASE 4: Políticas para PRODUCT_OPTIONS (leitura pública)
-- ============================================
-- Já corretas: product_options_public_read, admin_full_access_options

-- ============================================
-- FASE 5: Políticas para CONFIG (leitura pública)
-- ============================================
-- Já corretas: config_public_read, config_admin_update

-- ============================================
-- FASE 6: Políticas para CUSTOMERS
-- ============================================

-- Qualquer um pode criar customer (registro público)
CREATE POLICY "customers_public_insert" ON public.customers
  FOR INSERT WITH CHECK (true);

-- Usuários podem ver apenas seus próprios dados (mantém customers_select_own existente)
-- Admin pode ver todos
CREATE POLICY "customers_admin_all" ON public.customers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FASE 7: Políticas para ADDRESSES
-- ============================================

-- Qualquer um pode inserir endereços (para checkout público)
CREATE POLICY "addresses_public_insert" ON public.addresses
  FOR INSERT WITH CHECK (true);

-- Usuários veem apenas seus próprios endereços (mantém addresses_select_own existente)
-- Admin pode ver/gerenciar todos
CREATE POLICY "addresses_admin_all" ON public.addresses
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FASE 8: Políticas para ORDERS
-- ============================================

-- Qualquer um pode criar pedidos (checkout público)
CREATE POLICY "orders_public_insert" ON public.orders
  FOR INSERT WITH CHECK (true);

-- Usuários podem ver apenas seus próprios pedidos
CREATE POLICY "orders_select_own" ON public.orders
  FOR SELECT USING (customer_id = auth.uid());

-- Admin tem acesso total
CREATE POLICY "orders_admin_all" ON public.orders
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FASE 9: Políticas para ORDER_ITEMS
-- ============================================

-- Qualquer um pode inserir itens de pedido
CREATE POLICY "order_items_public_insert" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- Usuários podem ver itens dos seus próprios pedidos
CREATE POLICY "order_items_select_own" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND orders.customer_id = auth.uid()
    )
  );

-- Admin tem acesso total
CREATE POLICY "order_items_admin_all" ON public.order_items
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FASE 10: Políticas para ORDER_ITEM_OPTIONS
-- ============================================

-- Qualquer um pode inserir opções de itens
CREATE POLICY "order_item_options_public_insert" ON public.order_item_options
  FOR INSERT WITH CHECK (true);

-- Usuários podem ver opções dos seus próprios pedidos
CREATE POLICY "order_item_options_select_own" ON public.order_item_options
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.orders o ON o.id = oi.order_id
      WHERE oi.id = order_item_options.order_item_id 
      AND o.customer_id = auth.uid()
    )
  );

-- Admin tem acesso total
CREATE POLICY "order_item_options_admin_all" ON public.order_item_options
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FASE 11: Políticas para KDS_EVENTS
-- ============================================

-- Apenas admin pode gerenciar eventos do KDS
CREATE POLICY "kds_events_admin_all" ON public.kds_events
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================
-- FASE 12: Políticas para SMS_CODES
-- ============================================
-- Já possui sms_codes_insert e sms_codes_select apropriados

-- Admin pode gerenciar
CREATE POLICY "sms_codes_admin_all" ON public.sms_codes
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
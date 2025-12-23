-- =============================================
-- ETAPA 1: RLS para tabelas do Cardápio
-- =============================================

-- 1. PRODUCTS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
ON public.products
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage products"
ON public.products
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 2. CATEGORIES
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are viewable by everyone"
ON public.categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage categories"
ON public.categories
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. PRODUCT_OPTIONS
ALTER TABLE public.product_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Product options are viewable by everyone"
ON public.product_options
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage product options"
ON public.product_options
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. CONFIG
ALTER TABLE public.config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Config is viewable by everyone"
ON public.config
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage config"
ON public.config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 5. COMBO_SLOTS
ALTER TABLE public.combo_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Combo slots are viewable by everyone"
ON public.combo_slots
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage combo slots"
ON public.combo_slots
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 6. COMBO_SLOT_PRODUCTS (necessário para combos funcionarem)
ALTER TABLE public.combo_slot_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Combo slot products are viewable by everyone"
ON public.combo_slot_products
FOR SELECT
USING (true);

CREATE POLICY "Admins can manage combo slot products"
ON public.combo_slot_products
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
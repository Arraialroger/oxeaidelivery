-- Add admin policies for products table
CREATE POLICY "products_admin_insert" ON public.products
FOR INSERT WITH CHECK (true);

CREATE POLICY "products_admin_update" ON public.products
FOR UPDATE USING (true);

CREATE POLICY "products_admin_delete" ON public.products
FOR DELETE USING (true);

-- Add admin policies for categories table
CREATE POLICY "categories_admin_insert" ON public.categories
FOR INSERT WITH CHECK (true);

CREATE POLICY "categories_admin_update" ON public.categories
FOR UPDATE USING (true);

CREATE POLICY "categories_admin_delete" ON public.categories
FOR DELETE USING (true);

-- Add admin policies for config table
CREATE POLICY "config_admin_update" ON public.config
FOR UPDATE USING (true);
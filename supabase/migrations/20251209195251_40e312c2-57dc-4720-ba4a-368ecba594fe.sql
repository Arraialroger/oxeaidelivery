-- Add admin policies for product_options table
CREATE POLICY "product_options_admin_insert" 
ON public.product_options 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "product_options_admin_update" 
ON public.product_options 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "product_options_admin_delete" 
ON public.product_options 
FOR DELETE 
USING (has_role(auth.uid(), 'admin'::app_role));
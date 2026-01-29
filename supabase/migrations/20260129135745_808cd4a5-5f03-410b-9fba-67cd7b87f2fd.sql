-- Remover policy antiga
DROP POLICY IF EXISTS "Owners can manage their restaurant" ON public.restaurants;

-- Criar nova policy que aceita owners OU admins via user_roles
CREATE POLICY "Owners and admins can manage their restaurant"
ON public.restaurants
FOR ALL
TO authenticated
USING (
  owner_id = auth.uid() 
  OR (
    has_role(auth.uid(), 'admin'::app_role) 
    AND id = get_user_restaurant_id(auth.uid())
  )
)
WITH CHECK (
  owner_id = auth.uid() 
  OR (
    has_role(auth.uid(), 'admin'::app_role) 
    AND id = get_user_restaurant_id(auth.uid())
  )
);
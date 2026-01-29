-- 1. Corrigir função update_restaurants_updated_at com search_path
CREATE OR REPLACE FUNCTION public.update_restaurants_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- 2. Corrigir RLS policy order_items: vincular ao restaurant_id do pedido
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
CREATE POLICY "Order items insertable with valid order"
ON public.order_items
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_items.order_id 
    AND orders.restaurant_id IS NOT NULL
    AND is_valid_restaurant(orders.restaurant_id)
  )
);

-- 3. Corrigir RLS policy order_item_options: vincular ao order_item existente
DROP POLICY IF EXISTS "Anyone can insert order item options" ON public.order_item_options;
CREATE POLICY "Order item options insertable with valid order item"
ON public.order_item_options
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.id = order_item_options.order_item_id
    AND o.restaurant_id IS NOT NULL
  )
);

-- 4. Corrigir RLS policy push_subscriptions: requerer restaurant_id válido
DROP POLICY IF EXISTS "Anyone can insert push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Push subscriptions insertable with valid restaurant"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (
  (restaurant_id IS NOT NULL AND is_valid_restaurant(restaurant_id))
  OR
  (order_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = push_subscriptions.order_id
    AND orders.restaurant_id IS NOT NULL
  ))
);

-- 5. Corrigir RLS policy sms_codes: adicionar rate limiting via timestamp
-- Nota: mantemos INSERT aberto mas com validação de formato do telefone
DROP POLICY IF EXISTS "Anyone can insert sms codes" ON public.sms_codes;
CREATE POLICY "SMS codes insertable with valid phone"
ON public.sms_codes
FOR INSERT
WITH CHECK (
  phone IS NOT NULL 
  AND length(phone) >= 10 
  AND length(phone) <= 11
  AND phone ~ '^[0-9]+$'
);

-- 6. Tornar orders INSERT mais restritivo (requer restaurant_id válido)
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Orders insertable with valid restaurant"
ON public.orders
FOR INSERT
WITH CHECK (
  restaurant_id IS NOT NULL 
  AND is_valid_restaurant(restaurant_id)
);
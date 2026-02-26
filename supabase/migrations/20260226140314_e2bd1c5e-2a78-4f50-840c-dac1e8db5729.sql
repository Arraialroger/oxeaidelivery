
-- 1. Add idempotency_key column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON public.orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- 2. Create order_audit_log table
CREATE TABLE IF NOT EXISTS public.order_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  correlation_id text NOT NULL,
  idempotency_key text NOT NULL,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id),
  customer_phone text,
  total numeric,
  status text NOT NULL,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.order_audit_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_order_audit_log_restaurant_date ON public.order_audit_log(restaurant_id, created_at DESC);

-- RLS: only admins can SELECT, no direct INSERT from frontend
CREATE POLICY "Admins can view their restaurant audit logs"
  ON public.order_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role) AND restaurant_id = get_user_restaurant_id(auth.uid()));

-- 3. Create the atomic transaction function
CREATE OR REPLACE FUNCTION public.create_order_transaction(p_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_restaurant_id uuid;
  v_idempotency_key text;
  v_correlation_id text;
  v_customer_phone text;
  v_customer_name text;
  v_customer_type text;
  v_customer_id uuid;
  v_address_id uuid;
  v_order_id uuid;
  v_order_item_id uuid;
  v_item jsonb;
  v_option jsonb;
  v_total numeric;
  v_subtotal numeric;
  v_delivery_fee numeric;
  v_loyalty_discount numeric;
  v_coupon_discount numeric;
  v_existing_order_id uuid;
  v_stamps_goal int;
  v_current_stamps int;
  v_reward_value numeric;
  v_new_stamps int;
  v_coupon_id uuid;
  v_coupon_current_uses int;
BEGIN
  -- Statement timeout for safety
  SET LOCAL statement_timeout = '15s';

  -- Extract top-level fields
  v_restaurant_id := (p_data->>'restaurant_id')::uuid;
  v_idempotency_key := p_data->>'idempotency_key';
  v_correlation_id := p_data->>'correlation_id';

  -- Validate restaurant is active
  IF NOT is_valid_restaurant(v_restaurant_id) THEN
    RAISE EXCEPTION 'RESTAURANT_INACTIVE';
  END IF;

  -- IDEMPOTENCY CHECK
  SELECT id INTO v_existing_order_id
  FROM public.orders
  WHERE idempotency_key = v_idempotency_key AND restaurant_id = v_restaurant_id;

  IF v_existing_order_id IS NOT NULL THEN
    -- Log reuse
    INSERT INTO public.order_audit_log (correlation_id, idempotency_key, restaurant_id, status, metadata)
    VALUES (v_correlation_id, v_idempotency_key, v_restaurant_id, 'reused',
            jsonb_build_object('order_id', v_existing_order_id));
    RETURN jsonb_build_object('order_id', v_existing_order_id, 'status', 'ORDER_REUSED', 'correlation_id', v_correlation_id);
  END IF;

  -- Extract customer fields
  v_customer_phone := p_data->'customer'->>'phone';
  v_customer_name := p_data->'customer'->>'name';
  v_customer_type := COALESCE(p_data->'customer'->>'customer_type', 'tourist');

  -- Extract order fields
  v_subtotal := (p_data->'order_data'->>'subtotal')::numeric;
  v_delivery_fee := (p_data->'order_data'->>'delivery_fee')::numeric;
  v_total := (p_data->'order_data'->>'total')::numeric;
  v_loyalty_discount := COALESCE((p_data->'order_data'->>'loyalty_discount')::numeric, 0);
  v_coupon_discount := COALESCE((p_data->'order_data'->>'coupon_discount')::numeric, 0);

  -- 1. UPSERT CUSTOMER
  INSERT INTO public.customers (phone, name, customer_type, restaurant_id)
  VALUES (v_customer_phone, v_customer_name, v_customer_type, v_restaurant_id)
  ON CONFLICT (restaurant_id, phone) DO UPDATE SET
    name = COALESCE(EXCLUDED.name, customers.name),
    customer_type = COALESCE(EXCLUDED.customer_type, customers.customer_type)
  RETURNING id INTO v_customer_id;

  -- 2. INSERT ADDRESS
  INSERT INTO public.addresses (
    customer_id, street, number, neighborhood, complement, reference,
    restaurant_id, latitude, longitude, formatted_address, place_id,
    delivery_zone_id, address_source
  ) VALUES (
    v_customer_id,
    p_data->'address'->>'street',
    p_data->'address'->>'number',
    p_data->'address'->>'neighborhood',
    NULLIF(p_data->'address'->>'complement', ''),
    NULLIF(p_data->'address'->>'reference', ''),
    v_restaurant_id,
    (p_data->'address'->>'latitude')::numeric,
    (p_data->'address'->>'longitude')::numeric,
    NULLIF(p_data->'address'->>'formatted_address', ''),
    NULLIF(p_data->'address'->>'place_id', ''),
    NULLIF(p_data->'address'->>'delivery_zone_id', '')::uuid,
    COALESCE(p_data->'address'->>'address_source', 'manual')
  ) RETURNING id INTO v_address_id;

  -- 3. INSERT ORDER
  INSERT INTO public.orders (
    customer_id, address_id, payment_method, change, subtotal,
    delivery_fee, total, loyalty_discount, stamp_redeemed, status,
    restaurant_id, coupon_id, coupon_discount, idempotency_key
  ) VALUES (
    v_customer_id,
    v_address_id,
    p_data->'order_data'->>'payment_method',
    NULLIF(p_data->'order_data'->>'change', ''),
    v_subtotal,
    v_delivery_fee,
    v_total,
    v_loyalty_discount,
    COALESCE((p_data->'order_data'->>'stamp_redeemed')::boolean, false),
    'pending',
    v_restaurant_id,
    NULLIF(p_data->'order_data'->>'coupon_id', '')::uuid,
    v_coupon_discount,
    v_idempotency_key
  ) RETURNING id INTO v_order_id;

  -- 4. INSERT ORDER ITEMS + OPTIONS
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_data->'items')
  LOOP
    INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, note)
    VALUES (
      v_order_id,
      (v_item->>'product_id')::uuid,
      (v_item->>'quantity')::int,
      (v_item->>'unit_price')::numeric,
      NULLIF(v_item->>'note', '')
    ) RETURNING id INTO v_order_item_id;

    -- Insert options for this item
    IF v_item->'options' IS NOT NULL AND jsonb_array_length(v_item->'options') > 0 THEN
      FOR v_option IN SELECT * FROM jsonb_array_elements(v_item->'options')
      LOOP
        INSERT INTO public.order_item_options (order_item_id, option_name, option_price)
        VALUES (v_order_item_id, v_option->>'name', (v_option->>'price')::numeric);
      END LOOP;
    END IF;
  END LOOP;

  -- 5. PROCESS LOYALTY (conditional)
  IF p_data->'loyalty' IS NOT NULL AND (p_data->'loyalty'->>'enabled')::boolean = true THEN
    v_stamps_goal := (p_data->'loyalty'->>'stamps_goal')::int;
    v_current_stamps := (p_data->'loyalty'->>'current_stamps')::int;
    v_reward_value := (p_data->'loyalty'->>'reward_value')::numeric;
    v_new_stamps := v_current_stamps - v_stamps_goal;

    UPDATE public.customers
    SET stamps_count = v_new_stamps, stamps_redeemed = v_current_stamps
    WHERE id = v_customer_id;

    INSERT INTO public.stamp_transactions (customer_id, order_id, type, amount, balance_after, notes, restaurant_id)
    VALUES (v_customer_id, v_order_id, 'redeemed', -v_stamps_goal, v_new_stamps,
            'Brinde resgatado - Desconto R$ ' || v_reward_value::text, v_restaurant_id);
  END IF;

  -- 6. PROCESS COUPON (conditional)
  IF p_data->'coupon' IS NOT NULL AND p_data->'coupon'->>'coupon_id' IS NOT NULL THEN
    v_coupon_id := (p_data->'coupon'->>'coupon_id')::uuid;

    INSERT INTO public.coupon_uses (coupon_id, order_id, customer_id, restaurant_id, discount_applied)
    VALUES (v_coupon_id, v_order_id, v_customer_id, v_restaurant_id, v_coupon_discount);

    UPDATE public.coupons SET current_uses = current_uses + 1 WHERE id = v_coupon_id;
  END IF;

  -- 7. AUDIT LOG
  INSERT INTO public.order_audit_log (correlation_id, idempotency_key, restaurant_id, customer_phone, total, status, metadata)
  VALUES (v_correlation_id, v_idempotency_key, v_restaurant_id, v_customer_phone, v_total, 'created',
          jsonb_build_object('order_id', v_order_id, 'payment_method', p_data->'order_data'->>'payment_method'));

  RETURN jsonb_build_object('order_id', v_order_id, 'status', 'ORDER_CREATED', 'correlation_id', v_correlation_id);
END;
$$;

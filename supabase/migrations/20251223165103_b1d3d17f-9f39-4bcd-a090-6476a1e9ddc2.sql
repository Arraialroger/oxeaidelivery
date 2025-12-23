-- Create RPC function to get or create customer (bypasses RLS issues)
CREATE OR REPLACE FUNCTION public.get_or_create_customer(
  p_phone text,
  p_name text DEFAULT NULL,
  p_customer_type text DEFAULT 'tourist'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
BEGIN
  -- Try to find existing customer by phone
  SELECT id INTO v_customer_id 
  FROM customers 
  WHERE phone = p_phone;
  
  -- If not exists, create new customer
  IF v_customer_id IS NULL THEN
    INSERT INTO customers (phone, name, customer_type)
    VALUES (p_phone, p_name, p_customer_type)
    RETURNING id INTO v_customer_id;
  END IF;
  
  RETURN v_customer_id;
END;
$$;
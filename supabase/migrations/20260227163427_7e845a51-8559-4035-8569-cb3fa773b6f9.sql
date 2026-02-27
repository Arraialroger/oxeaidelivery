
-- ==========================================
-- RPC: get_dashboard_metrics
-- Replaces client-side aggregation that fetched ALL orders
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_dashboard_metrics(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_prev_from timestamptz,
  p_prev_to timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
  v_revenue_current numeric;
  v_revenue_previous numeric;
  v_orders_current int;
  v_orders_previous int;
  v_new_customers_current int;
  v_returning_current int;
  v_new_customers_previous int;
  v_returning_previous int;
  v_total_customers int;
BEGIN
  -- Current period revenue/orders
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO v_revenue_current, v_orders_current
  FROM orders
  WHERE restaurant_id = p_restaurant_id
    AND status != 'cancelled'
    AND created_at >= p_from
    AND created_at <= p_to;

  -- Previous period revenue/orders
  SELECT COALESCE(SUM(total), 0), COUNT(*)
  INTO v_revenue_previous, v_orders_previous
  FROM orders
  WHERE restaurant_id = p_restaurant_id
    AND status != 'cancelled'
    AND created_at >= p_prev_from
    AND created_at <= p_prev_to;

  -- New customers in current period (created in period)
  SELECT COUNT(*)
  INTO v_new_customers_current
  FROM customers
  WHERE restaurant_id = p_restaurant_id
    AND created_at >= p_from
    AND created_at <= p_to;

  -- Returning customers in current period (created before, ordered in period)
  SELECT COUNT(DISTINCT c.id)
  INTO v_returning_current
  FROM customers c
  WHERE c.restaurant_id = p_restaurant_id
    AND c.created_at < p_from
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.customer_id = c.id
        AND o.restaurant_id = p_restaurant_id
        AND o.status != 'cancelled'
        AND o.created_at >= p_from
        AND o.created_at <= p_to
    );

  -- New customers in previous period
  SELECT COUNT(*)
  INTO v_new_customers_previous
  FROM customers
  WHERE restaurant_id = p_restaurant_id
    AND created_at >= p_prev_from
    AND created_at <= p_prev_to;

  -- Returning customers in previous period
  SELECT COUNT(DISTINCT c.id)
  INTO v_returning_previous
  FROM customers c
  WHERE c.restaurant_id = p_restaurant_id
    AND c.created_at < p_prev_from
    AND EXISTS (
      SELECT 1 FROM orders o
      WHERE o.customer_id = c.id
        AND o.restaurant_id = p_restaurant_id
        AND o.status != 'cancelled'
        AND o.created_at >= p_prev_from
        AND o.created_at <= p_prev_to
    );

  -- Total customers
  SELECT COUNT(*)
  INTO v_total_customers
  FROM customers
  WHERE restaurant_id = p_restaurant_id;

  v_result := jsonb_build_object(
    'revenue', jsonb_build_object(
      'current', v_revenue_current,
      'previous', v_revenue_previous,
      'ordersCurrent', v_orders_current,
      'ordersPrevious', v_orders_previous
    ),
    'customers', jsonb_build_object(
      'newCustomers', v_new_customers_current,
      'returningCustomers', v_returning_current,
      'totalCustomers', v_total_customers,
      'newCustomersPrevious', v_new_customers_previous,
      'returningCustomersPrevious', v_returning_previous
    ),
    'avgTicket', jsonb_build_object(
      'current', CASE WHEN v_orders_current > 0 THEN v_revenue_current / v_orders_current ELSE 0 END,
      'previous', CASE WHEN v_orders_previous > 0 THEN v_revenue_previous / v_orders_previous ELSE 0 END
    )
  );

  RETURN v_result;
END;
$$;

-- ==========================================
-- RPC: get_top_products
-- Replaces 3-query chain with JOINs
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_top_products(
  p_restaurant_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_limit int DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      SUM(oi.quantity) AS total_qty,
      SUM(oi.quantity * oi.unit_price) AS total_revenue
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    LEFT JOIN products p ON p.id = oi.product_id
    WHERE o.restaurant_id = p_restaurant_id
      AND o.status != 'cancelled'
      AND o.created_at >= p_from
      AND o.created_at <= p_to
      AND oi.product_id IS NOT NULL
    GROUP BY p.id, p.name
    ORDER BY SUM(oi.quantity) DESC
    LIMIT p_limit
  ) t;

  RETURN v_result;
END;
$$;

-- ==========================================
-- RPC: get_customers_with_stats
-- Replaces N+1 pattern (1 query per customer)
-- ==========================================
CREATE OR REPLACE FUNCTION public.get_customers_with_stats(
  p_restaurant_id uuid,
  p_filter_type text DEFAULT 'all'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      c.id,
      c.name,
      c.phone,
      c.customer_type,
      c.created_at,
      c.stamps_count,
      COALESCE(stats.total_spent, 0) AS total_spent,
      COALESCE(stats.order_count, 0) AS order_count,
      stats.last_order_date
    FROM customers c
    LEFT JOIN LATERAL (
      SELECT
        SUM(o.total) AS total_spent,
        COUNT(*) AS order_count,
        MAX(o.created_at) AS last_order_date
      FROM orders o
      WHERE o.customer_id = c.id
        AND o.restaurant_id = p_restaurant_id
    ) stats ON true
    WHERE c.restaurant_id = p_restaurant_id
      AND (p_filter_type = 'all' OR c.customer_type = p_filter_type)
  ) t;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_platform_restaurants_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
BEGIN
  -- Only super_admin can call this
  IF NOT has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'ACCESS_DENIED';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT
      r.id,
      r.name,
      r.slug,
      r.status,
      r.logo_url,
      r.category,
      r.created_at,
      r.phone,
      r.owner_id,
      COALESCE(s.plan_name, 'Sem plano') AS plan_name,
      COALESCE(s.plan_status, 'none') AS subscription_status,
      s.trial_ends_at,
      COALESCE(stats.total_orders, 0) AS total_orders,
      COALESCE(stats.total_revenue, 0) AS total_revenue,
      COALESCE(stats.orders_30d, 0) AS orders_30d,
      COALESCE(stats.revenue_30d, 0) AS revenue_30d,
      COALESCE(stats.total_customers, 0) AS total_customers,
      COALESCE(stats.total_products, 0) AS total_products
    FROM restaurants r
    LEFT JOIN LATERAL (
      SELECT
        p.display_name AS plan_name,
        sub.status AS plan_status,
        sub.trial_ends_at
      FROM subscriptions sub
      JOIN plans p ON p.id = sub.plan_id
      WHERE sub.restaurant_id = r.id
      ORDER BY sub.created_at DESC
      LIMIT 1
    ) s ON true
    LEFT JOIN LATERAL (
      SELECT
        COUNT(*) FILTER (WHERE o.status != 'cancelled') AS total_orders,
        COALESCE(SUM(o.total) FILTER (WHERE o.status != 'cancelled'), 0) AS total_revenue,
        COUNT(*) FILTER (WHERE o.status != 'cancelled' AND o.created_at >= now() - interval '30 days') AS orders_30d,
        COALESCE(SUM(o.total) FILTER (WHERE o.status != 'cancelled' AND o.created_at >= now() - interval '30 days'), 0) AS revenue_30d
      FROM orders o
      WHERE o.restaurant_id = r.id
    ) stats ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total_customers
      FROM customers c
      WHERE c.restaurant_id = r.id
    ) cust ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS total_products
      FROM products pr
      WHERE pr.restaurant_id = r.id AND pr.is_active = true
    ) prod ON true
  ) t;

  RETURN v_result;
END;
$$;
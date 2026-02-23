
-- Update RLS policy for reconciliation_runs to filter by restaurant_id (multi-tenant ready)
DROP POLICY IF EXISTS "Admins can view reconciliation runs" ON public.reconciliation_runs;

CREATE POLICY "Admins can view their restaurant reconciliation runs"
ON public.reconciliation_runs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (
    restaurant_id IS NULL
    OR restaurant_id = get_user_restaurant_id(auth.uid())
  )
);

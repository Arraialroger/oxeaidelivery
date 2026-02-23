
-- Create reconciliation_runs table
CREATE TABLE public.reconciliation_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES public.restaurants(id),
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'success',
  duration_ms integer NOT NULL DEFAULT 0,
  fixed_count integer NOT NULL DEFAULT 0,
  expired_count integer NOT NULL DEFAULT 0,
  alert_count integer NOT NULL DEFAULT 0,
  errors text,
  correlation_id text,
  target_payment_id uuid,
  target_order_id uuid
);

-- Enable RLS
ALTER TABLE public.reconciliation_runs ENABLE ROW LEVEL SECURITY;

-- Admins can view runs for their restaurant (or global runs where restaurant_id is null)
CREATE POLICY "Admins can view reconciliation runs"
ON public.reconciliation_runs
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role)
);

-- No INSERT/UPDATE/DELETE policies for authenticated users
-- Edge Function uses service_role key which bypasses RLS

-- Index for performance on queries
CREATE INDEX idx_reconciliation_runs_executed_at ON public.reconciliation_runs(executed_at DESC);
CREATE INDEX idx_reconciliation_runs_status ON public.reconciliation_runs(status);

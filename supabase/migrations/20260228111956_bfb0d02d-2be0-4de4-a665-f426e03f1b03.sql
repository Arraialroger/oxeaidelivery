
-- RLS policies for super_admin to view ALL data across restaurants

CREATE POLICY "Super admins can view all payment alerts"
ON public.payment_alerts FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can update all payment alerts"
ON public.payment_alerts FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all reconciliation runs"
ON public.reconciliation_runs FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all payments"
ON public.payments FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all notifications"
ON public.notification_queue FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all health events"
ON public.system_health_events FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can insert health events"
ON public.system_health_events FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

CREATE POLICY "Super admins can view all restaurants"
ON public.restaurants FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'super_admin'::app_role));

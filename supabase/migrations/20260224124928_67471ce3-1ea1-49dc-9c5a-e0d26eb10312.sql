
-- =============================================
-- Tabela notification_queue
-- =============================================
CREATE TABLE public.notification_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id uuid NOT NULL REFERENCES public.payment_alerts(id) ON DELETE CASCADE,
  restaurant_id uuid REFERENCES public.restaurants(id),
  channel text NOT NULL DEFAULT 'email',
  recipient text,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  last_attempt_at timestamptz,
  sent_at timestamptz,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índice UNIQUE para idempotência (barreira contra race conditions)
CREATE UNIQUE INDEX idx_notification_queue_alert_id ON public.notification_queue(alert_id);

-- Índice parcial para performance do worker
CREATE INDEX idx_notification_queue_pending ON public.notification_queue(status, created_at) WHERE status = 'pending';

-- =============================================
-- RLS
-- =============================================
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Admins podem VER notificações do seu restaurante
CREATE POLICY "Admins can view their restaurant notifications"
  ON public.notification_queue FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND restaurant_id = get_user_restaurant_id(auth.uid())
  );

-- Sem INSERT/UPDATE/DELETE via frontend

-- =============================================
-- Função trigger idempotente
-- =============================================
CREATE OR REPLACE FUNCTION public.enqueue_critical_alert_notification()
RETURNS trigger AS $$
BEGIN
  IF NEW.severity = 'critical'
     AND NEW.alert_type LIKE 'health_%'
     AND NOT EXISTS (
       SELECT 1 FROM public.notification_queue WHERE alert_id = NEW.id
     )
  THEN
    INSERT INTO public.notification_queue (alert_id, restaurant_id, channel, subject, body, metadata)
    VALUES (
      NEW.id,
      NEW.restaurant_id,
      'email',
      'Alerta Critico: ' || NEW.alert_type,
      NEW.message,
      jsonb_build_object('alert_type', NEW.alert_type, 'source', 'auto_trigger')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- Trigger AFTER INSERT na payment_alerts
-- =============================================
CREATE TRIGGER trg_enqueue_critical_alert_notification
  AFTER INSERT ON public.payment_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_critical_alert_notification();

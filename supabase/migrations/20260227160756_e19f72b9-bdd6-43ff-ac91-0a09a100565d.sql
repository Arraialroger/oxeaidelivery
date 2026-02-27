
-- ============================================
-- System Health Events table
-- ============================================
CREATE TABLE public.system_health_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  severity text NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  source text NOT NULL,
  restaurant_id uuid REFERENCES public.restaurants(id),
  correlation_id text,
  message text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX idx_health_events_severity_created ON public.system_health_events (severity, created_at DESC);
CREATE INDEX idx_health_events_restaurant_created ON public.system_health_events (restaurant_id, created_at DESC);

-- RLS
ALTER TABLE public.system_health_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view health events"
  ON public.system_health_events
  FOR SELECT
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND (
      restaurant_id IS NULL
      OR restaurant_id = get_user_restaurant_id(auth.uid())
    )
  );

-- No INSERT/UPDATE/DELETE policies for frontend (only SECURITY DEFINER)

-- ============================================
-- RPC: log_health_event (SECURITY DEFINER)
-- ============================================
CREATE OR REPLACE FUNCTION public.log_health_event(
  p_event_type text,
  p_severity text,
  p_source text,
  p_restaurant_id uuid DEFAULT NULL,
  p_correlation_id text DEFAULT NULL,
  p_message text DEFAULT '',
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.system_health_events (event_type, severity, source, restaurant_id, correlation_id, message, metadata)
  VALUES (p_event_type, p_severity, p_source, p_restaurant_id, p_correlation_id, p_message, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- ============================================
-- Trigger: enqueue critical health events to notification_queue
-- ============================================
CREATE OR REPLACE FUNCTION public.enqueue_critical_health_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alert_id uuid;
  v_body text;
BEGIN
  IF NEW.severity != 'critical' THEN
    RETURN NEW;
  END IF;

  -- Dedup: skip if same event_type + restaurant_id in last 30 min
  IF EXISTS (
    SELECT 1 FROM public.system_health_events
    WHERE event_type = NEW.event_type
      AND (restaurant_id IS NOT DISTINCT FROM NEW.restaurant_id)
      AND created_at > (now() - interval '30 minutes')
      AND id != NEW.id
  ) THEN
    RETURN NEW;
  END IF;

  -- Create a payment_alert as anchor for notification_queue FK
  INSERT INTO public.payment_alerts (restaurant_id, alert_type, severity, message, metadata)
  VALUES (
    COALESCE(NEW.restaurant_id, (SELECT id FROM public.restaurants WHERE status = 'active' LIMIT 1)),
    'health_' || NEW.event_type,
    'critical',
    NEW.message,
    jsonb_build_object(
      'source', NEW.source,
      'correlation_id', NEW.correlation_id,
      'health_event_id', NEW.id
    )
  )
  RETURNING id INTO v_alert_id;

  -- Format Telegram message
  v_body := E'🔴 *ALERTA CRÍTICO*\n'
    || '*Tipo:* ' || NEW.event_type || E'\n'
    || '*Fonte:* ' || NEW.source || E'\n'
    || '*Restaurante:* ' || COALESCE(NEW.restaurant_id::text, 'Global') || E'\n'
    || '*Horário:* ' || to_char(NEW.created_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM/YYYY HH24:MI:SS') || E'\n'
    || '*Correlation ID:* `' || COALESCE(NEW.correlation_id, 'N/A') || E'`\n'
    || '*Detalhes:* ' || left(NEW.message, 200);

  INSERT INTO public.notification_queue (alert_id, restaurant_id, channel, subject, body, metadata)
  VALUES (
    v_alert_id,
    COALESCE(NEW.restaurant_id, (SELECT id FROM public.restaurants WHERE status = 'active' LIMIT 1)),
    'telegram',
    'Alerta Critico: ' || NEW.event_type,
    v_body,
    jsonb_build_object('health_event_id', NEW.id, 'correlation_id', NEW.correlation_id, 'source', 'health_trigger')
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enqueue_critical_health
  AFTER INSERT ON public.system_health_events
  FOR EACH ROW
  EXECUTE FUNCTION public.enqueue_critical_health_notification();

-- Tabela para armazenar subscriptions de push notifications
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '24 hours')
);

-- Índice para busca por order_id
CREATE INDEX idx_push_subscriptions_order_id ON push_subscriptions(order_id);

-- Habilitar RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Public can insert push subscriptions"
  ON push_subscriptions FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can delete own push subscriptions"
  ON push_subscriptions FOR DELETE USING (true);

CREATE POLICY "Admins can read push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
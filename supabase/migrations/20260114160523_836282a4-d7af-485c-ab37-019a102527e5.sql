-- ============================================
-- PROGRAMA DE FIDELIDADE - MIGRAÇÃO COMPLETA
-- ============================================

-- 1. Adicionar campos de fidelidade na tabela config
ALTER TABLE config 
ADD COLUMN IF NOT EXISTS loyalty_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loyalty_stamps_goal INTEGER DEFAULT 8,
ADD COLUMN IF NOT EXISTS loyalty_min_order NUMERIC DEFAULT 50,
ADD COLUMN IF NOT EXISTS loyalty_reward_value NUMERIC DEFAULT 50;

-- 2. Adicionar campos de selos na tabela customers
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS stamps_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS stamps_redeemed INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_stamp_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS stamps_expire_at TIMESTAMPTZ;

-- 3. Criar tabela de transações de selos (auditoria)
CREATE TABLE IF NOT EXISTS stamp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'expired', 'manual_adjustment')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS na tabela stamp_transactions
ALTER TABLE stamp_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins podem gerenciar todas as transações
CREATE POLICY "Admins can manage stamp transactions"
ON stamp_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Policy: Service role pode inserir (para Edge Functions)
CREATE POLICY "Service role can insert stamp transactions"
ON stamp_transactions FOR INSERT
WITH CHECK (true);

-- 4. Adicionar campos de fidelidade na tabela orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS stamp_earned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS stamp_redeemed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS loyalty_discount NUMERIC DEFAULT 0;

-- 5. Criar índices para otimização
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_customer_id ON stamp_transactions(customer_id);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_order_id ON stamp_transactions(order_id);
CREATE INDEX IF NOT EXISTS idx_stamp_transactions_type ON stamp_transactions(type);
CREATE INDEX IF NOT EXISTS idx_customers_stamps_count ON customers(stamps_count);

-- 6. Configuração inicial (desativado por padrão)
UPDATE config SET 
  loyalty_enabled = false,
  loyalty_stamps_goal = 8,
  loyalty_min_order = 50,
  loyalty_reward_value = 50
WHERE id = 1;
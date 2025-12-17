-- FASE 1: Estrutura de Banco de Dados para Sistema de Combos

-- 1. Adicionar coluna is_combo na tabela products
ALTER TABLE products ADD COLUMN is_combo boolean DEFAULT false;

-- 2. Criar tabela combo_slots (define os "slots" de escolha de cada combo)
CREATE TABLE combo_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  combo_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  slot_label text NOT NULL,
  quantity integer DEFAULT 1,
  slot_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 3. Criar tabela combo_slot_products (produtos disponíveis em cada slot)
CREATE TABLE combo_slot_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid REFERENCES combo_slots(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE CASCADE NOT NULL,
  price_difference numeric DEFAULT 0,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 4. Habilitar RLS nas novas tabelas
ALTER TABLE combo_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE combo_slot_products ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para combo_slots
CREATE POLICY "combo_slots_public_read" ON combo_slots
  FOR SELECT USING (true);

CREATE POLICY "combo_slots_admin_insert" ON combo_slots
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "combo_slots_admin_update" ON combo_slots
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "combo_slots_admin_delete" ON combo_slots
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 6. Políticas RLS para combo_slot_products
CREATE POLICY "combo_slot_products_public_read" ON combo_slot_products
  FOR SELECT USING (true);

CREATE POLICY "combo_slot_products_admin_insert" ON combo_slot_products
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "combo_slot_products_admin_update" ON combo_slot_products
  FOR UPDATE USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "combo_slot_products_admin_delete" ON combo_slot_products
  FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- 7. Índices para performance
CREATE INDEX idx_combo_slots_combo_id ON combo_slots(combo_id);
CREATE INDEX idx_combo_slot_products_slot_id ON combo_slot_products(slot_id);
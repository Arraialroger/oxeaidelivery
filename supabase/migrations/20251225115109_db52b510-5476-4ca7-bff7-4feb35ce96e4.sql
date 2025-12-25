-- FASE 2.2: Habilitar RLS para orders, order_items e order_item_options
-- As políticas já existem, apenas precisamos HABILITAR o RLS nas tabelas

-- Habilitar RLS na tabela orders
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela order_items
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela order_item_options
ALTER TABLE public.order_item_options ENABLE ROW LEVEL SECURITY;
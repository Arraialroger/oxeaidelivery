-- FASE 2.1: Habilitar RLS para customers e addresses
-- As políticas já existem, só precisamos ativar o RLS

-- Habilitar RLS na tabela customers
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Habilitar RLS na tabela addresses
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
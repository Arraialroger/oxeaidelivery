-- FASE 2.1 Fix: Adicionar política SELECT público para addresses
-- Necessário para que o .select() após INSERT funcione no checkout

CREATE POLICY "Public can read addresses" 
ON public.addresses 
FOR SELECT 
USING (true);
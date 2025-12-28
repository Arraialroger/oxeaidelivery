-- Permitir INSERT público na tabela kds_events para registrar eventos de novos pedidos
-- Isso é seguro pois apenas registra eventos, não expõe dados sensíveis

CREATE POLICY "Public can insert kds events" 
ON public.kds_events 
FOR INSERT 
WITH CHECK (true);
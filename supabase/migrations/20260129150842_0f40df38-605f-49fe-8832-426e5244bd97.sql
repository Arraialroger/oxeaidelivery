-- Adicionar campo de categoria na tabela restaurants
ALTER TABLE public.restaurants 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'restaurant';

-- Atualizar restaurantes existentes com categorias
UPDATE public.restaurants SET category = 'hamburgueria' WHERE slug = 'astral';
UPDATE public.restaurants SET category = 'hamburgueria' WHERE slug = 'bruttus';

-- Adicionar índice para performance em buscas por categoria
CREATE INDEX IF NOT EXISTS idx_restaurants_category ON public.restaurants(category);
-- Fase 2: Adicionar coluna email à tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS email text;

-- Fase 3: Atualizar trigger para incluir email e usar metadados corretamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, phone, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
    name = COALESCE(EXCLUDED.name, public.profiles.name);
  RETURN NEW;
END;
$$;
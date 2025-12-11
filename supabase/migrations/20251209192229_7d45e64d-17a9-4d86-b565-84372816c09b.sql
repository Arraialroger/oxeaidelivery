-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policy: users can see their own roles
CREATE POLICY "users_select_own_roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid());

-- Update products policies to require admin role
DROP POLICY IF EXISTS "products_admin_insert" ON public.products;
DROP POLICY IF EXISTS "products_admin_update" ON public.products;
DROP POLICY IF EXISTS "products_admin_delete" ON public.products;

CREATE POLICY "products_admin_insert" ON public.products
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "products_admin_update" ON public.products
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "products_admin_delete" ON public.products
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Update categories policies to require admin role
DROP POLICY IF EXISTS "categories_admin_insert" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_update" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_delete" ON public.categories;

CREATE POLICY "categories_admin_insert" ON public.categories
FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "categories_admin_update" ON public.categories
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "categories_admin_delete" ON public.categories
FOR DELETE USING (public.has_role(auth.uid(), 'admin'));

-- Update config policy to require admin role
DROP POLICY IF EXISTS "config_admin_update" ON public.config;

CREATE POLICY "config_admin_update" ON public.config
FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product, Category } from '@/types';
import { useToast } from '@/hooks/use-toast';
export function useCreateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id'>) => {
      const { data, error } = await supabase
        .from('products')
        .insert(product)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
      const { data, error } = await supabase
        .from('products')
        .update(product)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useDuplicateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (product: Product) => {
      // 1. Create the duplicated product
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: `${product.name} (cópia)`,
          description: product.description,
          price: product.price,
          image_url: product.image_url,
          category_id: product.category_id,
          is_active: product.is_active,
        })
        .select()
        .single();

      if (productError) throw productError;

      // 2. Fetch and duplicate product options
      const { data: options, error: optionsError } = await supabase
        .from('product_options')
        .select('*')
        .eq('product_id', product.id);

      if (optionsError) throw optionsError;

      if (options && options.length > 0) {
        const newOptions = options.map(({ id, product_id, ...opt }) => ({
          ...opt,
          product_id: newProduct.id,
        }));

        const { error: insertOptionsError } = await supabase
          .from('product_options')
          .insert(newOptions);

        if (insertOptionsError) throw insertOptionsError;
      }

      return newProduct;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['product-options'] });
      toast({ title: 'Produto duplicado!' });
    },
  });
}

export function useReorderProducts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (products: { id: string; order_index: number }[]) => {
      const updates = products.map(({ id, order_index }) =>
        supabase
          .from('products')
          .update({ order_index })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<Category, 'id'>) => {
      const { data, error } = await supabase
        .from('categories')
        .insert(category)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...category }: Partial<Category> & { id: string }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(category)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (categories: { id: string; order_index: number }[]) => {
      const updates = categories.map(({ id, order_index }) =>
        supabase
          .from('categories')
          .update({ order_index })
          .eq('id', id)
      );

      const results = await Promise.all(updates);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: { delivery_fee?: number; restaurant_open?: boolean; kds_enabled?: boolean; hero_banner_url?: string | null }) => {
      const { data, error } = await supabase
        .from('config')
        .update(config)
        .eq('id', 1)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['config'] });
    },
  });
}

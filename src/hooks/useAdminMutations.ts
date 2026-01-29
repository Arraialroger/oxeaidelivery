import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product, Category } from '@/types';
import type { RestaurantSettings } from '@/types/restaurant';
import { DEFAULT_SETTINGS } from '@/types/restaurant';
import { useToast } from '@/hooks/use-toast';

export function useCreateProduct(restaurantId: string | null) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (product: Omit<Product, 'id' | 'restaurant_id'>) => {
      if (!restaurantId) throw new Error('Restaurant ID is required');
      
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, restaurant_id: restaurantId })
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

export function useDuplicateProduct(restaurantId: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (product: Product) => {
      if (!restaurantId) throw new Error('Restaurant ID is required');
      
      // 1. Create the duplicated product with restaurant_id
      const { data: newProduct, error: productError } = await supabase
        .from('products')
        .insert({
          name: `${product.name} (cópia)`,
          description: product.description,
          price: product.price,
          image_url: product.image_url,
          category_id: product.category_id,
          is_active: product.is_active,
          is_combo: product.is_combo,
          restaurant_id: restaurantId,
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
          restaurant_id: restaurantId,
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

export function useCreateCategory(restaurantId: string | null) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (category: Omit<Category, 'id' | 'restaurant_id'>) => {
      if (!restaurantId) throw new Error('Restaurant ID is required');
      
      const { data, error } = await supabase
        .from('categories')
        .insert({ ...category, restaurant_id: restaurantId })
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

/**
 * Hook to update restaurant settings (multi-tenant).
 * Updates the restaurants.settings JSONB column for the specific restaurant.
 */
export function useUpdateRestaurantSettings(restaurantId: string | null) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (newSettings: Partial<RestaurantSettings> & { hero_banner_url?: string | null }) => {
      if (!restaurantId) throw new Error('Restaurant ID is required');
      
      // Fetch current settings
      const { data: current, error: fetchError } = await supabase
        .from('restaurants')
        .select('settings, hero_banner_url')
        .eq('id', restaurantId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Extract hero_banner_url if present (it's a separate column)
      const { hero_banner_url, ...settingsToMerge } = newSettings;
      
      // Merge settings with defaults as fallback - cast to handle Json type
      const currentSettings = (current?.settings ?? DEFAULT_SETTINGS) as unknown as RestaurantSettings;
      const mergedSettings = { 
        ...DEFAULT_SETTINGS,
        ...currentSettings, 
        ...settingsToMerge 
      };
      
      // Build update payload - cast settings back to Json for Supabase
      const updatePayload: Record<string, unknown> = {
        settings: mergedSettings as unknown as Record<string, unknown>,
      };
      
      // Only include hero_banner_url if it was explicitly provided
      if (hero_banner_url !== undefined) {
        updatePayload.hero_banner_url = hero_banner_url;
      }
      
      const { data, error, count } = await supabase
        .from('restaurants')
        .update(updatePayload)
        .eq('id', restaurantId)
        .select();
        
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error('Você não tem permissão para atualizar este restaurante.');
      }
      return data[0];
    },
    onSuccess: () => {
      // Invalidate restaurant queries to refresh the context
      queryClient.invalidateQueries({ queryKey: ['restaurant'] });
    },
  });
}

/**
 * @deprecated Use useUpdateRestaurantSettings instead for multi-tenant support
 */
export function useUpdateConfig() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (config: { 
      delivery_fee?: number; 
      restaurant_open?: boolean; 
      kds_enabled?: boolean; 
      hero_banner_url?: string | null;
      loyalty_enabled?: boolean;
      loyalty_stamps_goal?: number;
      loyalty_min_order?: number;
      loyalty_reward_value?: number;
    }) => {
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

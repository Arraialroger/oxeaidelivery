import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import type { Product } from '@/types';

export interface UpsellProduct {
  id: string;
  restaurant_id: string;
  product_id: string;
  order_index: number;
  created_at: string;
  product?: Product;
}

/**
 * Fetch upsell products for the current restaurant (admin use).
 * Joins with products table to get product details.
 */
export function useUpsellProducts() {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['upsell-products-admin', restaurantId],
    queryFn: async (): Promise<UpsellProduct[]> => {
      if (!restaurantId) return [];

      // Fetch upsell entries
      const { data: upsellEntries, error } = await supabase
        .from('upsell_products' as any)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      if (!upsellEntries || upsellEntries.length === 0) return [];

      // Fetch product details
      const productIds = (upsellEntries as any[]).map((u: any) => u.product_id);
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds);

      if (prodError) throw prodError;

      const productMap = new Map((products || []).map(p => [p.id, p]));

      return (upsellEntries as any[]).map((entry: any) => ({
        ...entry,
        product: productMap.get(entry.product_id) || undefined,
      }));
    },
    enabled: !!restaurantId,
  });
}

/**
 * Fetch upsell product IDs for checkout display (public).
 */
export function useUpsellProductsPublic(restaurantId?: string | null) {
  return useQuery({
    queryKey: ['upsell-products-public', restaurantId],
    queryFn: async (): Promise<Product[]> => {
      if (!restaurantId) return [];

      const { data: upsellEntries, error } = await supabase
        .from('upsell_products' as any)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      if (!upsellEntries || (upsellEntries as any[]).length === 0) return [];

      const productIds = (upsellEntries as any[]).map((u: any) => u.product_id);
      const { data: products, error: prodError } = await supabase
        .from('products')
        .select('*')
        .in('id', productIds)
        .eq('is_active', true);

      if (prodError) throw prodError;

      // Maintain upsell order
      const productMap = new Map((products || []).map(p => [p.id, p as Product]));
      return productIds
        .map((id: string) => productMap.get(id))
        .filter((p): p is Product => !!p);
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpsellMutations() {
  const { restaurantId } = useRestaurantContext();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['upsell-products-admin', restaurantId] });
    queryClient.invalidateQueries({ queryKey: ['upsell-products-public', restaurantId] });
  };

  const addProduct = useMutation({
    mutationFn: async ({ productId, orderIndex }: { productId: string; orderIndex: number }) => {
      if (!restaurantId) throw new Error('Restaurant not found');
      const { error } = await supabase
        .from('upsell_products' as any)
        .insert({ restaurant_id: restaurantId, product_id: productId, order_index: orderIndex } as any);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const removeProduct = useMutation({
    mutationFn: async (upsellId: string) => {
      const { error } = await supabase
        .from('upsell_products' as any)
        .delete()
        .eq('id', upsellId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const reorderProducts = useMutation({
    mutationFn: async (items: { id: string; order_index: number }[]) => {
      for (const item of items) {
        const { error } = await supabase
          .from('upsell_products' as any)
          .update({ order_index: item.order_index } as any)
          .eq('id', item.id);
        if (error) throw error;
      }
    },
    onSuccess: invalidate,
  });

  return { addProduct, removeProduct, reorderProducts };
}

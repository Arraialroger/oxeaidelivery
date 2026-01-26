import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/types';

/**
 * Admin hook to fetch products for a specific restaurant.
 * CRITICAL: Always pass restaurantId for multi-tenant isolation.
 */
export function useAdminProducts(restaurantId?: string) {
  return useQuery({
    queryKey: ['products', 'admin', restaurantId],
    queryFn: async (): Promise<Product[]> => {
      if (!restaurantId) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });
}

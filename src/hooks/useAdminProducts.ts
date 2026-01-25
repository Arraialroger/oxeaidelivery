import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/types';

/**
 * Admin hook to fetch ALL products (not filtered by restaurant context).
 * Used in admin pages where RestaurantContext may not be available.
 */
export function useAdminProducts(restaurantId?: string) {
  return useQuery({
    queryKey: ['products', 'admin', restaurantId],
    queryFn: async (): Promise<Product[]> => {
      let query = supabase
        .from('products')
        .select('*');

      if (restaurantId) {
        query = query.eq('restaurant_id', restaurantId);
      }

      const { data, error } = await query.order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
}

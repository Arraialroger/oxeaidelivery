import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Product } from '@/types';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export function useProducts(categoryId?: string | null) {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['products', restaurantId, categoryId],
    queryFn: async (): Promise<Product[]> => {
      if (!restaurantId) return [];

      let query = supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .eq('restaurant_id', restaurantId);

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query.order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });
}

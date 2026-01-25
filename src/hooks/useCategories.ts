import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Category } from '@/types';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export function useCategories() {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['categories', restaurantId],
    queryFn: async (): Promise<Category[]> => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!restaurantId,
  });
}

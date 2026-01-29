import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface FeaturedProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
}

export function useFeaturedProducts(restaurantId: string | undefined, limit: number = 4) {
  return useQuery({
    queryKey: ['featured-products', restaurantId, limit],
    queryFn: async (): Promise<FeaturedProduct[]> => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('products')
        .select('id, name, description, price, image_url')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true)
        .order('order_index')
        .limit(limit);

      if (error) {
        console.error('[useFeaturedProducts] Error:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!restaurantId,
    staleTime: 5 * 60 * 1000,
  });
}

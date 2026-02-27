import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export interface TopProduct {
  product_id: string;
  product_name: string;
  total_qty: number;
  total_revenue: number;
}

interface DateRange {
  from: Date;
  to: Date;
}

export function useTopProducts(dateRange: DateRange, limit = 10) {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['top-products', restaurantId, dateRange.from.toISOString(), dateRange.to.toISOString(), limit],
    queryFn: async (): Promise<TopProduct[]> => {
      if (!restaurantId) throw new Error('Restaurant ID required');

      const { data, error } = await (supabase.rpc as any)('get_top_products', {
        p_restaurant_id: restaurantId,
        p_from: dateRange.from.toISOString(),
        p_to: dateRange.to.toISOString(),
        p_limit: limit,
      });

      if (error) throw error;

      return ((data as any[]) || []).map((item: any) => ({
        product_id: item.product_id || '',
        product_name: item.product_name || 'Produto removido',
        total_qty: Number(item.total_qty) || 0,
        total_revenue: Number(item.total_revenue) || 0,
      }));
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });
}

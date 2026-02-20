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

      // Get orders in date range (not cancelled)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'cancelled')
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (ordersError) throw ordersError;
      if (!orders || orders.length === 0) return [];

      const orderIds = orders.map(o => o.id);

      // Get order items for those orders
      const { data: items, error: itemsError } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price')
        .in('order_id', orderIds);

      if (itemsError) throw itemsError;
      if (!items || items.length === 0) return [];

      // Get product names
      const productIds = [...new Set(items.map(i => i.product_id).filter(Boolean))] as string[];
      const { data: products } = await supabase
        .from('products')
        .select('id, name')
        .in('id', productIds);

      const productMap = new Map((products || []).map(p => [p.id, p.name]));

      // Aggregate
      const agg = new Map<string, { qty: number; revenue: number }>();
      for (const item of items) {
        if (!item.product_id) continue;
        const existing = agg.get(item.product_id) || { qty: 0, revenue: 0 };
        existing.qty += item.quantity || 0;
        existing.revenue += (item.quantity || 0) * (item.unit_price || 0);
        agg.set(item.product_id, existing);
      }

      const result: TopProduct[] = Array.from(agg.entries())
        .map(([id, { qty, revenue }]) => ({
          product_id: id,
          product_name: productMap.get(id) || 'Produto removido',
          total_qty: qty,
          total_revenue: revenue,
        }))
        .sort((a, b) => b.total_qty - a.total_qty)
        .slice(0, limit);

      return result;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });
}

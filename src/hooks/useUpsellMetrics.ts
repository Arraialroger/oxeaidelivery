import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

interface DateRange {
  from: Date;
  to: Date;
}

export interface UpsellMetrics {
  totalImpressions: number;
  totalAdded: number;
  conversionRate: number;
  revenueGenerated: number;
  topProducts: { productId: string; productName: string; addedCount: number; revenue: number }[];
}

export function useUpsellMetrics(dateRange: DateRange) {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['upsell-metrics', restaurantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<UpsellMetrics> => {
      if (!restaurantId) throw new Error('Restaurant ID required');

      const { data: events, error } = await supabase
        .from('upsell_events' as any)
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', dateRange.from.toISOString())
        .lte('created_at', dateRange.to.toISOString());

      if (error) throw error;

      const allEvents = (events || []) as any[];

      const impressions = allEvents.filter(e => e.event_type === 'impression');
      const added = allEvents.filter(e => e.event_type === 'added');

      // Unique sessions that saw upsell
      const impressionSessions = new Set(impressions.map(e => e.session_id).filter(Boolean));
      const addedSessions = new Set(added.map(e => e.session_id).filter(Boolean));

      const totalImpressions = impressionSessions.size;
      const totalAdded = addedSessions.size;
      const conversionRate = totalImpressions > 0 ? (totalAdded / totalImpressions) * 100 : 0;
      const revenueGenerated = added.reduce((sum: number, e: any) => sum + (Number(e.product_price) || 0), 0);

      // Top products by additions
      const productMap = new Map<string, { count: number; revenue: number }>();
      for (const e of added) {
        const existing = productMap.get(e.product_id) || { count: 0, revenue: 0 };
        existing.count++;
        existing.revenue += Number(e.product_price) || 0;
        productMap.set(e.product_id, existing);
      }

      // Fetch product names
      const productIds = [...productMap.keys()];
      let productNames = new Map<string, string>();
      if (productIds.length > 0) {
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .in('id', productIds);
        productNames = new Map((products || []).map(p => [p.id, p.name]));
      }

      const topProducts = [...productMap.entries()]
        .map(([productId, data]) => ({
          productId,
          productName: productNames.get(productId) || 'Produto removido',
          addedCount: data.count,
          revenue: data.revenue,
        }))
        .sort((a, b) => b.addedCount - a.addedCount)
        .slice(0, 5);

      return { totalImpressions, totalAdded, conversionRate, revenueGenerated, topProducts };
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });
}

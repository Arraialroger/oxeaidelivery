import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { startOfDay, endOfDay } from 'date-fns';

interface DateRange {
  from: Date;
  to: Date;
}

/**
 * Shared hook: fetches order created_at timestamps for a date range.
 * Used by OrdersChart, PeakHoursChart, and DemandHeatmap to avoid
 * 3 identical queries to the orders table.
 */
export function useOrderTimestamps(dateRange: DateRange) {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['order-timestamps', restaurantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<string[]> => {
      if (!restaurantId) return [];

      const from = startOfDay(dateRange.from).toISOString();
      const to = endOfDay(dateRange.to).toISOString();

      // Fetch all timestamps; use pagination to bypass 1000-row limit
      const allTimestamps: string[] = [];
      let lastCreatedAt: string | null = null;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('orders')
          .select('created_at')
          .eq('restaurant_id', restaurantId)
          .neq('status', 'cancelled')
          .gte('created_at', from)
          .lte('created_at', to)
          .order('created_at', { ascending: true })
          .limit(1000);

        if (lastCreatedAt) {
          query = query.gt('created_at', lastCreatedAt);
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          for (const row of data) {
            if (row.created_at) allTimestamps.push(row.created_at);
          }
          lastCreatedAt = data[data.length - 1].created_at;
          if (data.length < 1000) hasMore = false;
        }
      }

      return allTimestamps;
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });
}

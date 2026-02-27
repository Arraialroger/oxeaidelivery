import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { differenceInDays, subDays, startOfDay, endOfDay } from 'date-fns';

export interface CustomerMetrics {
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
  newCustomersPrevious: number;
  returningCustomersPrevious: number;
}

export interface RevenueMetrics {
  current: number;
  previous: number;
  ordersCurrent: number;
  ordersPrevious: number;
}

export interface DashboardMetrics {
  customers: CustomerMetrics;
  revenue: RevenueMetrics;
  avgTicket: {
    current: number;
    previous: number;
  };
}

interface DateRange {
  from: Date;
  to: Date;
}

export function useDashboardMetrics(dateRange: DateRange) {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['dashboard-metrics', restaurantId, dateRange.from.toISOString(), dateRange.to.toISOString()],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!restaurantId) throw new Error('Restaurant ID required');

      const { from, to } = dateRange;
      const periodDays = differenceInDays(to, from) + 1;
      const previousFrom = startOfDay(subDays(from, periodDays));
      const previousTo = endOfDay(subDays(from, 1));

      const { data, error } = await (supabase.rpc as any)('get_dashboard_metrics', {
        p_restaurant_id: restaurantId,
        p_from: from.toISOString(),
        p_to: to.toISOString(),
        p_prev_from: previousFrom.toISOString(),
        p_prev_to: previousTo.toISOString(),
      });

      if (error) throw error;

      const result = data as any;

      return {
        revenue: {
          current: Number(result.revenue.current) || 0,
          previous: Number(result.revenue.previous) || 0,
          ordersCurrent: Number(result.revenue.ordersCurrent) || 0,
          ordersPrevious: Number(result.revenue.ordersPrevious) || 0,
        },
        customers: {
          newCustomers: Number(result.customers.newCustomers) || 0,
          returningCustomers: Number(result.customers.returningCustomers) || 0,
          totalCustomers: Number(result.customers.totalCustomers) || 0,
          newCustomersPrevious: Number(result.customers.newCustomersPrevious) || 0,
          returningCustomersPrevious: Number(result.customers.returningCustomersPrevious) || 0,
        },
        avgTicket: {
          current: Number(result.avgTicket.current) || 0,
          previous: Number(result.avgTicket.previous) || 0,
        },
      };
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5,
  });
}

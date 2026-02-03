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
      
      // Previous period (same duration, immediately before)
      const previousFrom = startOfDay(subDays(from, periodDays));
      const previousTo = endOfDay(subDays(from, 1));

      // Fetch all orders for this restaurant (not cancelled)
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select('id, customer_id, total, created_at')
        .eq('restaurant_id', restaurantId)
        .neq('status', 'cancelled');

      if (ordersError) throw ordersError;

      // Fetch all customers for this restaurant
      const { data: customers, error: customersError } = await supabase
        .from('customers')
        .select('id, created_at')
        .eq('restaurant_id', restaurantId);

      if (customersError) throw customersError;

      // Helper to filter orders by date range
      const filterOrdersByDate = (start: Date, end: Date) => {
        return (orders || []).filter(order => {
          const orderDate = new Date(order.created_at || '');
          return orderDate >= start && orderDate <= end;
        });
      };

      // Helper to calculate revenue
      const calculateRevenue = (filteredOrders: typeof orders) => {
        return (filteredOrders || []).reduce((sum, order) => sum + (order.total || 0), 0);
      };

      // Current period orders
      const currentOrders = filterOrdersByDate(from, to);
      const previousOrders = filterOrdersByDate(previousFrom, previousTo);

      // Revenue calculations
      const revenue: RevenueMetrics = {
        current: calculateRevenue(currentOrders),
        previous: calculateRevenue(previousOrders),
        ordersCurrent: currentOrders.length,
        ordersPrevious: previousOrders.length,
      };

      // Customer analysis - new vs returning in current period
      const currentCustomerIds = new Set(currentOrders.map(o => o.customer_id).filter(Boolean));
      
      // New customers = created in current period
      const newCustomersCurrent = (customers || []).filter(c => {
        const createdAt = new Date(c.created_at || '');
        return createdAt >= from && createdAt <= to;
      });

      // Returning = ordered in current period but created before
      const returningCustomersCurrent = (customers || []).filter(c => {
        const createdAt = new Date(c.created_at || '');
        const isOld = createdAt < from;
        const orderedInPeriod = currentCustomerIds.has(c.id);
        return isOld && orderedInPeriod;
      });

      // Previous period comparison
      const previousCustomerIds = new Set(previousOrders.map(o => o.customer_id).filter(Boolean));
      
      const newCustomersPrevious = (customers || []).filter(c => {
        const createdAt = new Date(c.created_at || '');
        return createdAt >= previousFrom && createdAt <= previousTo;
      });

      const returningCustomersPrevious = (customers || []).filter(c => {
        const createdAt = new Date(c.created_at || '');
        const isOld = createdAt < previousFrom;
        const orderedInPeriod = previousCustomerIds.has(c.id);
        return isOld && orderedInPeriod;
      });

      const customerMetrics: CustomerMetrics = {
        newCustomers: newCustomersCurrent.length,
        returningCustomers: returningCustomersCurrent.length,
        totalCustomers: customers?.length || 0,
        newCustomersPrevious: newCustomersPrevious.length,
        returningCustomersPrevious: returningCustomersPrevious.length,
      };

      // Average ticket
      const avgTicketCurrent = currentOrders.length > 0 
        ? revenue.current / currentOrders.length 
        : 0;
      const avgTicketPrevious = previousOrders.length > 0 
        ? revenue.previous / previousOrders.length 
        : 0;

      return {
        customers: customerMetrics,
        revenue,
        avgTicket: {
          current: avgTicketCurrent,
          previous: avgTicketPrevious,
        },
      };
    },
    enabled: !!restaurantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

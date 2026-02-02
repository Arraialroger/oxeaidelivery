import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths } from 'date-fns';

export interface CustomerMetrics {
  newCustomers: number;
  returningCustomers: number;
  totalCustomers: number;
  newCustomersPrevious: number;
  returningCustomersPrevious: number;
}

export interface RevenueMetrics {
  today: number;
  todayPrevious: number;
  week: number;
  weekPrevious: number;
  month: number;
  monthPrevious: number;
  ordersToday: number;
  ordersTodayPrevious: number;
  ordersWeek: number;
  ordersWeekPrevious: number;
  ordersMonth: number;
  ordersMonthPrevious: number;
}

export interface DashboardMetrics {
  customers: CustomerMetrics;
  revenue: RevenueMetrics;
  avgTicket: {
    current: number;
    previous: number;
  };
}

export function useDashboardMetrics() {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['dashboard-metrics', restaurantId],
    queryFn: async (): Promise<DashboardMetrics> => {
      if (!restaurantId) throw new Error('Restaurant ID required');

      const now = new Date();
      
      // Current periods
      const todayStart = startOfDay(now);
      const todayEnd = endOfDay(now);
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      const monthStart = startOfMonth(now);
      const monthEnd = endOfMonth(now);
      
      // Previous periods (for comparison)
      const yesterdayStart = startOfDay(subDays(now, 1));
      const yesterdayEnd = endOfDay(subDays(now, 1));
      const lastWeekStart = startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastWeekEnd = endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 });
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));

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
      const todayOrders = filterOrdersByDate(todayStart, todayEnd);
      const weekOrders = filterOrdersByDate(weekStart, weekEnd);
      const monthOrders = filterOrdersByDate(monthStart, monthEnd);

      // Previous period orders
      const yesterdayOrders = filterOrdersByDate(yesterdayStart, yesterdayEnd);
      const lastWeekOrders = filterOrdersByDate(lastWeekStart, lastWeekEnd);
      const lastMonthOrders = filterOrdersByDate(lastMonthStart, lastMonthEnd);

      // Revenue calculations
      const revenue: RevenueMetrics = {
        today: calculateRevenue(todayOrders),
        todayPrevious: calculateRevenue(yesterdayOrders),
        week: calculateRevenue(weekOrders),
        weekPrevious: calculateRevenue(lastWeekOrders),
        month: calculateRevenue(monthOrders),
        monthPrevious: calculateRevenue(lastMonthOrders),
        ordersToday: todayOrders.length,
        ordersTodayPrevious: yesterdayOrders.length,
        ordersWeek: weekOrders.length,
        ordersWeekPrevious: lastWeekOrders.length,
        ordersMonth: monthOrders.length,
        ordersMonthPrevious: lastMonthOrders.length,
      };

      // Customer analysis - new vs returning this month
      const monthCustomerIds = new Set(monthOrders.map(o => o.customer_id).filter(Boolean));
      
      // New customers = created this month
      const newCustomersThisMonth = (customers || []).filter(c => {
        const createdAt = new Date(c.created_at || '');
        return createdAt >= monthStart && createdAt <= monthEnd;
      });

      // Returning = ordered this month but created before
      const returningCustomersThisMonth = (customers || []).filter(c => {
        const createdAt = new Date(c.created_at || '');
        const isOld = createdAt < monthStart;
        const orderedThisMonth = monthCustomerIds.has(c.id);
        return isOld && orderedThisMonth;
      });

      // Previous month comparison
      const lastMonthCustomerIds = new Set(lastMonthOrders.map(o => o.customer_id).filter(Boolean));
      
      const newCustomersLastMonth = (customers || []).filter(c => {
        const createdAt = new Date(c.created_at || '');
        return createdAt >= lastMonthStart && createdAt <= lastMonthEnd;
      });

      const returningCustomersLastMonth = (customers || []).filter(c => {
        const createdAt = new Date(c.created_at || '');
        const isOld = createdAt < lastMonthStart;
        const orderedLastMonth = lastMonthCustomerIds.has(c.id);
        return isOld && orderedLastMonth;
      });

      const customerMetrics: CustomerMetrics = {
        newCustomers: newCustomersThisMonth.length,
        returningCustomers: returningCustomersThisMonth.length,
        totalCustomers: customers?.length || 0,
        newCustomersPrevious: newCustomersLastMonth.length,
        returningCustomersPrevious: returningCustomersLastMonth.length,
      };

      // Average ticket
      const avgTicketCurrent = monthOrders.length > 0 
        ? revenue.month / monthOrders.length 
        : 0;
      const avgTicketPrevious = lastMonthOrders.length > 0 
        ? revenue.monthPrevious / lastMonthOrders.length 
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

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export interface CustomerWithStats {
  id: string;
  name: string | null;
  phone: string;
  customer_type: 'local' | 'tourist' | null;
  created_at: string | null;
  last_order_date: string | null;
  total_spent: number;
  order_count: number;
  stamps_count: number;
}

export function useCustomers(filterType?: 'local' | 'tourist' | 'all') {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['customers', restaurantId, filterType],
    queryFn: async (): Promise<CustomerWithStats[]> => {
      if (!restaurantId) return [];

      const { data, error } = await (supabase.rpc as any)('get_customers_with_stats', {
        p_restaurant_id: restaurantId,
        p_filter_type: filterType || 'all',
      });

      if (error) throw error;

      return ((data as any[]) || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        customer_type: c.customer_type as 'local' | 'tourist' | null,
        created_at: c.created_at,
        last_order_date: c.last_order_date,
        total_spent: Number(c.total_spent) || 0,
        order_count: Number(c.order_count) || 0,
        stamps_count: Number(c.stamps_count) || 0,
      }));
    },
    enabled: !!restaurantId,
  });
}

export function useUpdateCustomerType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ customerId, customerType }: { customerId: string; customerType: 'local' | 'tourist' }) => {
      const { error } = await supabase
        .from('customers')
        .update({ customer_type: customerType })
        .eq('id', customerId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

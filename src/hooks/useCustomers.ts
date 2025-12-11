import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface CustomerWithStats {
  id: string;
  name: string | null;
  phone: string;
  customer_type: 'local' | 'tourist' | null;
  created_at: string | null;
  last_order_date: string | null;
  total_spent: number;
  order_count: number;
}

export function useCustomers(filterType?: 'local' | 'tourist' | 'all') {
  return useQuery({
    queryKey: ['customers', filterType],
    queryFn: async () => {
      // Get all customers
      let query = supabase.from('customers').select('*');
      
      if (filterType && filterType !== 'all') {
        query = query.eq('customer_type', filterType);
      }
      
      const { data: customers, error: customersError } = await query.order('created_at', { ascending: false });
      
      if (customersError) throw customersError;
      
      // Get order stats for each customer
      const customersWithStats: CustomerWithStats[] = await Promise.all(
        (customers || []).map(async (customer) => {
          const { data: orders } = await supabase
            .from('orders')
            .select('total, created_at')
            .eq('customer_id', customer.id)
            .order('created_at', { ascending: false });
          
          const totalSpent = orders?.reduce((sum, order) => sum + (order.total || 0), 0) || 0;
          const lastOrderDate = orders?.[0]?.created_at || null;
          const orderCount = orders?.length || 0;
          
          return {
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            customer_type: customer.customer_type as 'local' | 'tourist' | null,
            created_at: customer.created_at,
            last_order_date: lastOrderDate,
            total_spent: totalSpent,
            order_count: orderCount,
          };
        })
      );
      
      return customersWithStats;
    },
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

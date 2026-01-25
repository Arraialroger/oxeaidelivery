import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  note: string | null;
  product: {
    name: string;
  } | null;
}

interface Order {
  id: string;
  created_at: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string | null;
  order_items: OrderItem[];
}

export function useCustomerOrders(phone: string | null) {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['customer-orders', phone, restaurantId],
    queryFn: async (): Promise<Order[]> => {
      if (!phone || !restaurantId) return [];

      // Primeiro, buscar o customer_id pelo telefone
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (customerError) throw customerError;
      if (!customer) return [];

      // Buscar os pedidos do cliente
      const { data: orders, error: ordersError } = await supabase
        .from('orders')
        .select(`
          id,
          created_at,
          status,
          subtotal,
          delivery_fee,
          total,
          payment_method,
          order_items (
            id,
            quantity,
            unit_price,
            note,
            product:products (
              name
            )
          )
        `)
        .eq('customer_id', customer.id)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (ordersError) throw ordersError;

      return (orders || []) as unknown as Order[];
    },
    enabled: !!phone && phone.length >= 10 && !!restaurantId,
  });
}

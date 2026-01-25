import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export interface CustomerStamps {
  stamps_count: number;
  stamps_redeemed: number;
  last_stamp_at: string | null;
  stamps_expire_at: string | null;
}

export function useCustomerStamps(phone: string | null) {
  const { settings, restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['customer-stamps', phone, restaurantId],
    queryFn: async (): Promise<CustomerStamps | null> => {
      if (!phone || !restaurantId) return null;

      // Clean phone number (only digits)
      const cleanPhone = phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) return null;

      const { data, error } = await supabase
        .from('customers')
        .select('stamps_count, stamps_redeemed, last_stamp_at, stamps_expire_at')
        .eq('phone', cleanPhone)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (error) {
        console.error('[useCustomerStamps] Error fetching stamps:', error);
        throw error;
      }

      // Return default values if customer not found
      if (!data) {
        return {
          stamps_count: 0,
          stamps_redeemed: 0,
          last_stamp_at: null,
          stamps_expire_at: null,
        };
      }

      return {
        stamps_count: data.stamps_count ?? 0,
        stamps_redeemed: data.stamps_redeemed ?? 0,
        last_stamp_at: data.last_stamp_at,
        stamps_expire_at: data.stamps_expire_at,
      };
    },
    enabled: !!phone && !!settings?.loyalty_enabled && !!restaurantId,
    staleTime: 30000, // 30 seconds
  });
}

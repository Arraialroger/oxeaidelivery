import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export interface SavedAddress {
  id: string;
  street: string;
  number: string;
  neighborhood: string;
  complement: string | null;
  reference: string | null;
  formatted_address: string | null;
  latitude: number | null;
  longitude: number | null;
  place_id: string | null;
  created_at: string | null;
}

interface UseSavedAddressesOptions {
  phone: string | null;
  enabled?: boolean;
}

export function useSavedAddresses({ phone, enabled = true }: UseSavedAddressesOptions) {
  const { restaurantId } = useRestaurantContext();

  return useQuery({
    queryKey: ['saved-addresses', phone, restaurantId],
    queryFn: async (): Promise<SavedAddress[]> => {
      if (!phone || !restaurantId) return [];

      // First get the customer by phone + restaurant
      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', phone)
        .eq('restaurant_id', restaurantId)
        .maybeSingle();

      if (customerError || !customer) {
        return [];
      }

      // Then get their addresses, ordered by most recent
      const { data: addresses, error: addressError } = await supabase
        .from('addresses')
        .select(`
          id,
          street,
          number,
          neighborhood,
          complement,
          reference,
          formatted_address,
          latitude,
          longitude,
          place_id,
          created_at
        `)
        .eq('customer_id', customer.id)
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(5); // Limit to last 5 addresses

      if (addressError) {
        console.error('[useSavedAddresses] Error fetching addresses:', addressError);
        return [];
      }

      // Remove duplicates based on street + number + neighborhood
      const uniqueAddresses = addresses?.reduce((acc: SavedAddress[], addr) => {
        const key = `${addr.street}-${addr.number}-${addr.neighborhood}`.toLowerCase();
        const exists = acc.some(
          (a) => `${a.street}-${a.number}-${a.neighborhood}`.toLowerCase() === key
        );
        if (!exists) {
          acc.push(addr);
        }
        return acc;
      }, []) || [];

      return uniqueAddresses;
    },
    enabled: enabled && !!phone && phone.length >= 10 && !!restaurantId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

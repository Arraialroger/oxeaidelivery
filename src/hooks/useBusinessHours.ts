import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface BusinessHour {
  id: string;
  day_of_week: number;
  open_time: string | null;
  close_time: string | null;
  is_closed: boolean | null;
}

export function useBusinessHours(restaurantId: string | undefined) {
  return useQuery({
    queryKey: ['business-hours', restaurantId],
    queryFn: async (): Promise<BusinessHour[]> => {
      if (!restaurantId) return [];

      const { data, error } = await supabase
        .from('business_hours')
        .select('id, day_of_week, open_time, close_time, is_closed')
        .eq('restaurant_id', restaurantId)
        .order('day_of_week');

      if (error) {
        console.error('[useBusinessHours] Error:', error);
        throw error;
      }

      return data || [];
    },
    enabled: !!restaurantId,
    staleTime: 10 * 60 * 1000,
  });
}

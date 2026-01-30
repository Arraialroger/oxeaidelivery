import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface RestaurantListItem {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  hero_banner_url: string | null;
  category: string | null;
  address: string | null;
  settings: {
    is_open?: boolean;
    delivery_fee?: number;
    schedule_mode?: 'auto' | 'manual';
  };
}

export function useRestaurants(categoryFilter?: string) {
  return useQuery({
    queryKey: ['restaurants', categoryFilter],
    queryFn: async (): Promise<RestaurantListItem[]> => {
      let query = supabase
        .from('restaurants')
        .select('id, name, slug, logo_url, hero_banner_url, category, address, settings')
        .eq('status', 'active')
        .order('name');

      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[useRestaurants] Error fetching restaurants:', error);
        throw error;
      }

      // Parse settings from JSONB
      return (data || []).map((restaurant) => ({
        ...restaurant,
        settings: {
          is_open: (restaurant.settings as any)?.is_open ?? true,
          delivery_fee: (restaurant.settings as any)?.delivery_fee ?? 5,
          schedule_mode: (restaurant.settings as any)?.schedule_mode ?? 'auto',
        },
      }));
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

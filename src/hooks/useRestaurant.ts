import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Restaurant, RestaurantSettings } from '@/types/restaurant';
import { DEFAULT_SETTINGS } from '@/types/restaurant';

export function useRestaurantBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['restaurant', slug],
    queryFn: async (): Promise<Restaurant | null> => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('[useRestaurant] Error fetching restaurant:', error);
        throw error;
      }

      if (!data) return null;

      // Parse settings from JSONB with defaults
      const settings: RestaurantSettings = {
        ...DEFAULT_SETTINGS,
        ...(typeof data.settings === 'object' ? data.settings as Partial<RestaurantSettings> : {}),
      };

      return {
        ...data,
        settings,
      } as Restaurant;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes - restaurant data doesn't change often
    retry: false, // Don't retry on 404
  });
}

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { RestaurantSettings } from '@/types/restaurant';
import { DEFAULT_SETTINGS } from '@/types/restaurant';

interface RestaurantDetails {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  hero_banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  description: string | null;
  instagram: string | null;
  facebook: string | null;
  accepted_payments: string[] | null;
  gallery_urls: string[] | null;
  min_order: number | null;
  avg_delivery_time: number | null;
  category: string | null;
  settings: RestaurantSettings;
}

export function useRestaurantDetails(slug: string | undefined) {
  return useQuery({
    queryKey: ['restaurant-details', slug],
    queryFn: async (): Promise<RestaurantDetails | null> => {
      if (!slug) return null;

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('status', 'active')
        .maybeSingle();

      if (error) {
        console.error('[useRestaurantDetails] Error:', error);
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
        accepted_payments: data.accepted_payments as string[] | null,
        gallery_urls: data.gallery_urls as string[] | null,
      } as RestaurantDetails;
    },
    enabled: !!slug,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

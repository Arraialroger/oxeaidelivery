import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PlatformRestaurant {
  id: string;
  name: string;
  slug: string;
  status: string;
  logo_url: string | null;
  category: string | null;
  created_at: string;
  phone: string | null;
  owner_id: string | null;
  plan_name: string;
  subscription_status: string;
  trial_ends_at: string | null;
  total_orders: number;
  total_revenue: number;
  orders_30d: number;
  revenue_30d: number;
  total_customers: number;
  total_products: number;
}

export function usePlatformRestaurants() {
  return useQuery({
    queryKey: ['platform-restaurants-overview'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_platform_restaurants_overview');
      if (error) throw error;
      return (data as unknown as PlatformRestaurant[]) || [];
    },
    refetchInterval: 60_000,
  });
}

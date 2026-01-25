import { useRestaurantContext } from '@/contexts/RestaurantContext';
import type { RestaurantSettings } from '@/types/restaurant';

/**
 * Hook to access restaurant configuration.
 * Returns settings from the RestaurantContext.
 * 
 * This replaces the old useConfig hook that fetched from the global config table.
 * Now settings are per-restaurant and stored in the restaurants.settings JSONB column.
 */
export function useConfig() {
  const { settings, restaurant, isLoading } = useRestaurantContext();

  // Transform settings to match the old Config interface for backwards compatibility
  const data = restaurant ? {
    id: 1, // Legacy compatibility
    delivery_fee: settings.delivery_fee,
    restaurant_open: settings.is_open,
    kds_enabled: settings.kds_enabled,
    hero_banner_url: restaurant.hero_banner_url,
    loyalty_enabled: settings.loyalty_enabled,
    loyalty_stamps_goal: settings.loyalty_stamps_goal,
    loyalty_min_order: settings.loyalty_min_order,
    loyalty_reward_value: settings.loyalty_reward_value,
  } : null;

  return {
    data,
    isLoading,
    settings,
    restaurant,
  };
}

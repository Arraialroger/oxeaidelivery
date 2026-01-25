import React, { createContext, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useRestaurantBySlug } from '@/hooks/useRestaurant';
import type { Restaurant, RestaurantSettings } from '@/types/restaurant';
import { DEFAULT_SETTINGS } from '@/types/restaurant';

interface RestaurantContextType {
  restaurant: Restaurant | null;
  restaurantId: string | null;
  slug: string | undefined;
  settings: RestaurantSettings;
  isLoading: boolean;
  isError: boolean;
  notFound: boolean;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

export function RestaurantProvider({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const { data: restaurant, isLoading, isError, isFetched } = useRestaurantBySlug(slug);

  const value = useMemo<RestaurantContextType>(() => ({
    restaurant: restaurant ?? null,
    restaurantId: restaurant?.id ?? null,
    slug,
    settings: restaurant?.settings ?? DEFAULT_SETTINGS,
    isLoading,
    isError,
    notFound: isFetched && !restaurant && !!slug,
  }), [restaurant, slug, isLoading, isError, isFetched]);

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurantContext() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurantContext must be used within a RestaurantProvider');
  }
  return context;
}

// Convenience hook that throws if no restaurant is loaded
export function useCurrentRestaurant() {
  const { restaurant, restaurantId, notFound, isLoading } = useRestaurantContext();
  
  if (isLoading) {
    return { restaurant: null, restaurantId: null, isLoading: true };
  }
  
  if (notFound || !restaurant) {
    return { restaurant: null, restaurantId: null, isLoading: false };
  }
  
  return { restaurant, restaurantId, isLoading: false };
}

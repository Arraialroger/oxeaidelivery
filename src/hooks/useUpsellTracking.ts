import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

export function useUpsellTracking() {
  const { restaurantId } = useRestaurantContext();
  const sessionIdRef = useRef<string>(`${Date.now()}-${Math.random().toString(36).substring(2, 9)}`);
  const trackedImpressions = useRef<Set<string>>(new Set());

  const trackImpression = useCallback(
    async (productId: string, productPrice: number) => {
      if (!restaurantId || trackedImpressions.current.has(productId)) return;
      trackedImpressions.current.add(productId);

      try {
        await supabase.from('upsell_events' as any).insert({
          restaurant_id: restaurantId,
          product_id: productId,
          event_type: 'impression',
          session_id: sessionIdRef.current,
          product_price: productPrice,
        } as any);
      } catch (e) {
        console.error('Failed to track upsell impression:', e);
      }
    },
    [restaurantId]
  );

  const trackAdded = useCallback(
    async (productId: string, productPrice: number, customerPhone?: string) => {
      if (!restaurantId) return;

      try {
        await supabase.from('upsell_events' as any).insert({
          restaurant_id: restaurantId,
          product_id: productId,
          event_type: 'added',
          session_id: sessionIdRef.current,
          product_price: productPrice,
          customer_phone: customerPhone || null,
        } as any);
      } catch (e) {
        console.error('Failed to track upsell addition:', e);
      }
    },
    [restaurantId]
  );

  return { trackImpression, trackAdded };
}

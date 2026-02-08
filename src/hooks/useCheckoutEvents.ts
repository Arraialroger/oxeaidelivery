import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';
import type { Json } from '@/integrations/supabase/types';

type CheckoutEventType =
  | 'checkout_started'
  | 'address_step_started'
  | 'address_step_completed'
  | 'address_zone_rejected'
  | 'address_manual_fallback'
  | 'address_gps_used'
  | 'address_map_clicked'
  | 'address_autocomplete_used'
  | 'saved_address_selected'
  | 'new_address_started'
  | 'payment_step_started'
  | 'payment_step_completed'
  | 'order_completed'
  | 'checkout_abandoned';

interface CheckoutEventMetadata {
  [key: string]: unknown;
}

export function useCheckoutEvents() {
  const { restaurantId } = useRestaurantContext();
  const sessionIdRef = useRef<string>(generateSessionId());

  const trackEvent = useCallback(
    async (
      eventType: CheckoutEventType,
      stepName?: string,
      metadata?: CheckoutEventMetadata,
      customerPhone?: string
    ) => {
      if (!restaurantId) return;

      try {
        await supabase.from('checkout_events').insert({
          restaurant_id: restaurantId,
          session_id: sessionIdRef.current,
          customer_phone: customerPhone || null,
          event_type: eventType,
          step_name: stepName || null,
          metadata: (metadata || null) as Json,
        });
      } catch (error) {
        console.error('Failed to track checkout event:', error);
      }
    },
    [restaurantId]
  );

  const logDeliveryAttempt = useCallback(
    async (
      coords: { lat: number; lng: number } | null,
      requestedAddress: string,
      rejectionReason: string,
      nearestZoneId?: string,
      customerPhone?: string
    ) => {
      if (!restaurantId) return;

      try {
        await supabase.from('delivery_attempts_log').insert({
          restaurant_id: restaurantId,
          customer_phone: customerPhone || null,
          latitude: coords?.lat || null,
          longitude: coords?.lng || null,
          requested_address: requestedAddress,
          rejection_reason: rejectionReason,
          nearest_zone_id: nearestZoneId || null,
        });
      } catch (error) {
        console.error('Failed to log delivery attempt:', error);
      }
    },
    [restaurantId]
  );

  return {
    sessionId: sessionIdRef.current,
    trackEvent,
    logDeliveryAttempt,
  };
}

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CheckoutCustomer {
  phone: string;
  name: string;
  customer_type: string;
}

interface CheckoutAddress {
  street: string;
  number: string;
  neighborhood: string;
  complement?: string;
  reference?: string;
  latitude?: number | null;
  longitude?: number | null;
  formatted_address?: string;
  place_id?: string;
  delivery_zone_id?: string | null;
  address_source?: string;
}

interface CheckoutOrderData {
  payment_method: string;
  change?: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  loyalty_discount: number;
  stamp_redeemed: boolean;
  coupon_id?: string | null;
  coupon_discount: number;
}

interface CheckoutItem {
  product_id: string;
  quantity: number;
  unit_price: number;
  note?: string;
  options: { name: string; price: number }[];
}

interface CheckoutLoyalty {
  enabled: boolean;
  stamps_goal: number;
  current_stamps: number;
  reward_value: number;
}

interface CheckoutCoupon {
  coupon_id: string;
  discount_applied: number;
}

export interface CheckoutSubmitPayload {
  restaurantId: string;
  customer: CheckoutCustomer;
  address: CheckoutAddress;
  order_data: CheckoutOrderData;
  items: CheckoutItem[];
  loyalty?: CheckoutLoyalty | null;
  coupon?: CheckoutCoupon | null;
}

interface CheckoutResult {
  order_id: string;
  status: string;
  correlation_id: string;
}

function generateIdempotencyKey(phone: string, items: CheckoutItem[]): string {
  const cartSignature = items.map(i => `${i.product_id}:${i.quantity}:${i.unit_price}`).join('|');
  const timeWindow = Math.floor(Date.now() / 300_000); // 5-minute window
  const raw = `${phone}|${cartSignature}|${timeWindow}`;
  // Simple hash
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `idem_${Math.abs(hash).toString(36)}_${timeWindow}`;
}

export function useCheckoutSubmit() {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSlowRequest, setIsSlowRequest] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const slowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const submit = useCallback(async (payload: CheckoutSubmitPayload): Promise<CheckoutResult | null> => {
    if (isSubmitting) return null;

    const idempotencyKey = generateIdempotencyKey(payload.customer.phone, payload.items);
    setIsSubmitting(true);
    setIsSlowRequest(false);
    setIsRetrying(false);

    // Start slow request timer (20s)
    slowTimerRef.current = setTimeout(() => setIsSlowRequest(true), 20_000);

    const body = {
      restaurant_id: payload.restaurantId,
      idempotency_key: idempotencyKey,
      customer: payload.customer,
      address: payload.address,
      order_data: payload.order_data,
      items: payload.items,
      loyalty: payload.loyalty || null,
      coupon: payload.coupon || null,
    };

    let lastError: Error | null = null;
    const maxAttempts = 2; // 1 original + 1 retry

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) {
        setIsRetrying(true);
        await new Promise(r => setTimeout(r, 2000));
      }

      try {
        const { data, error } = await supabase.functions.invoke('create-order', {
          body,
        });

        if (error) {
          throw new Error(error.message || 'Erro na chamada da função');
        }

        if (data?.error) {
          // Structured error from edge function
          const errorCode = data.error;
          if (errorCode === 'VALIDATION_ERROR' || errorCode === 'RESTAURANT_INACTIVE') {
            // Don't retry client errors
            toast({
              title: 'Erro',
              description: data.message || 'Dados inválidos.',
              variant: 'destructive',
            });
            return null;
          }
          if (errorCode === 'RATE_LIMIT') {
            toast({
              title: 'Aguarde',
              description: data.message || 'Muitas tentativas.',
              variant: 'destructive',
            });
            return null;
          }
          // Server errors: retry
          throw new Error(data.message || errorCode);
        }

        // Success
        if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
        return data as CheckoutResult;

      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.error(`[useCheckoutSubmit] Attempt ${attempt + 1} failed:`, lastError.message);
      }
    }

    // All attempts failed
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);

    const isTimeout = lastError?.message?.includes('timeout') || lastError?.message?.includes('TIMEOUT');
    toast({
      title: isTimeout ? 'Processando...' : 'Erro ao criar pedido',
      description: isTimeout
        ? 'O servidor demorou para responder. Estamos verificando seu pedido...'
        : 'Erro ao criar pedido. Tente novamente.',
      variant: 'destructive',
    });

    return null;
  }, [isSubmitting, toast]);

  // Reset states when submit completes
  const resetAfterSubmit = useCallback(() => {
    setIsSubmitting(false);
    setIsRetrying(false);
    setIsSlowRequest(false);
    if (slowTimerRef.current) clearTimeout(slowTimerRef.current);
  }, []);

  return { submit, isSubmitting, isRetrying, isSlowRequest, resetAfterSubmit };
}

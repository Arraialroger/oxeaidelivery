import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

interface StampAdjustmentParams {
  customerId: string;
  amount: number; // positive to add, negative to remove
  reason: string;
  currentStamps: number;
}

export function useStampAdjustment() {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantContext();

  return useMutation({
    mutationFn: async ({ customerId, amount, reason, currentStamps }: StampAdjustmentParams) => {
      const newBalance = Math.max(0, currentStamps + amount);

      // 1. Update customer stamps_count
      const { error: customerError } = await supabase
        .from('customers')
        .update({ stamps_count: newBalance })
        .eq('id', customerId);

      if (customerError) throw customerError;

      // 2. Record audit transaction
      const { error: txError } = await supabase
        .from('stamp_transactions')
        .insert({
          customer_id: customerId,
          restaurant_id: restaurantId,
          type: 'manual_adjustment',
          amount,
          balance_after: newBalance,
          notes: reason,
        });

      if (txError) {
        console.error('[useStampAdjustment] Error recording transaction:', txError);
        // Don't throw - main operation succeeded
      }

      return { newBalance };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['stamp-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customer-stamps'] });
    },
  });
}

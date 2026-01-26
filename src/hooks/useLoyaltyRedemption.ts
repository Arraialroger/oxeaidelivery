import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useRestaurantContext } from '@/contexts/RestaurantContext';

interface RedemptionParams {
  customerId: string;
  orderId: string;
  stampsGoal: number;
  currentStamps: number;
  rewardValue: number;
}

export function useLoyaltyRedemption() {
  const queryClient = useQueryClient();
  const { restaurantId } = useRestaurantContext();

  return useMutation({
    mutationFn: async ({
      customerId,
      orderId,
      stampsGoal,
      currentStamps,
      rewardValue,
    }: RedemptionParams) => {
      const newStampsCount = currentStamps - stampsGoal;

      // 1. Debit stamps from customer
      const { error: customerError } = await supabase
        .from('customers')
        .update({
          stamps_count: newStampsCount,
          stamps_redeemed: currentStamps, // Increment total redeemed
        })
        .eq('id', customerId);

      if (customerError) {
        console.error('[useLoyaltyRedemption] Error updating customer:', customerError);
        throw customerError;
      }

      // 2. Mark order as reward redeemed
      const { error: orderError } = await supabase
        .from('orders')
        .update({
          stamp_redeemed: true,
          loyalty_discount: rewardValue,
        })
        .eq('id', orderId);

      if (orderError) {
        console.error('[useLoyaltyRedemption] Error updating order:', orderError);
        throw orderError;
      }

      // 3. Record transaction for audit with restaurant_id
      const { error: transactionError } = await supabase
        .from('stamp_transactions')
        .insert({
          customer_id: customerId,
          order_id: orderId,
          type: 'redeemed',
          amount: -stampsGoal,
          balance_after: newStampsCount,
          notes: `Brinde resgatado - Desconto R$ ${rewardValue.toFixed(2)}`,
          restaurant_id: restaurantId,
        });

      if (transactionError) {
        console.error('[useLoyaltyRedemption] Error recording transaction:', transactionError);
        // Don't throw - main operations succeeded
      }

      return { newStampsCount };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-stamps'] });
    },
  });
}

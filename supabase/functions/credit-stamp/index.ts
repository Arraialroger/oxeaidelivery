import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { orderId, status } = await req.json();

    console.log(`[credit-stamp] Processing order ${orderId} with status ${status}`);

    // GUARD 1: Fetch order and check if stamp was already earned
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, total, customer_id, stamp_earned, restaurant_id')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('[credit-stamp] Order not found:', orderError);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'order_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GUARD 2: Check if order has restaurant_id
    if (!order.restaurant_id) {
      console.log('[credit-stamp] Order has no restaurant_id');
      return new Response(
        JSON.stringify({ skipped: true, reason: 'no_restaurant_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GUARD 3: Fetch restaurant settings and check feature flag
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('settings')
      .eq('id', order.restaurant_id)
      .single();

    if (restaurantError || !restaurant) {
      console.error('[credit-stamp] Restaurant not found:', restaurantError);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'restaurant_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = restaurant.settings as {
      loyalty_enabled?: boolean;
      loyalty_stamps_goal?: number;
      loyalty_min_order?: number;
      loyalty_reward_value?: number;
    } | null;

    if (!settings?.loyalty_enabled) {
      console.log('[credit-stamp] Loyalty program disabled for this restaurant');
      return new Response(
        JSON.stringify({ skipped: true, reason: 'loyalty_disabled' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GUARD 4: Check if status is 'delivered'
    if (status !== 'delivered') {
      console.log(`[credit-stamp] Status is ${status}, not 'delivered'. Skipping.`);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'status_not_delivered' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (order.stamp_earned) {
      console.log(`[credit-stamp] Order ${orderId} already earned a stamp`);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'stamp_already_earned' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GUARD 5: Check minimum order value
    const minOrder = settings.loyalty_min_order ?? 50;
    if ((order.total ?? 0) < minOrder) {
      console.log(`[credit-stamp] Order total ${order.total} is below minimum ${minOrder}`);
      return new Response(
        JSON.stringify({ 
          skipped: true, 
          reason: 'below_minimum', 
          orderTotal: order.total, 
          minRequired: minOrder 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GUARD 6: Check if customer exists
    if (!order.customer_id) {
      console.log('[credit-stamp] Order has no customer_id');
      return new Response(
        JSON.stringify({ skipped: true, reason: 'no_customer_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, stamps_count')
      .eq('id', order.customer_id)
      .single();

    if (customerError || !customer) {
      console.error('[credit-stamp] Customer not found:', customerError);
      return new Response(
        JSON.stringify({ skipped: true, reason: 'customer_not_found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate new stamp count and expiration (180 days)
    const newStampsCount = (customer.stamps_count ?? 0) + 1;
    const newExpireAt = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);

    // Update customer stamps
    const { error: updateCustomerError } = await supabase
      .from('customers')
      .update({
        stamps_count: newStampsCount,
        last_stamp_at: new Date().toISOString(),
        stamps_expire_at: newExpireAt.toISOString(),
      })
      .eq('id', customer.id);

    if (updateCustomerError) {
      console.error('[credit-stamp] Error updating customer:', updateCustomerError);
      return new Response(
        JSON.stringify({ error: true, message: updateCustomerError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark order as stamp earned
    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ stamp_earned: true })
      .eq('id', orderId);

    if (updateOrderError) {
      console.error('[credit-stamp] Error updating order:', updateOrderError);
      // Don't fail - stamp was already credited to customer
    }

    // Record transaction for audit with restaurant_id
    const { error: transactionError } = await supabase
      .from('stamp_transactions')
      .insert({
        customer_id: customer.id,
        order_id: orderId,
        type: 'earned',
        amount: 1,
        balance_after: newStampsCount,
        notes: `Selo creditado - Pedido #${orderId.slice(0, 8)}`,
        restaurant_id: order.restaurant_id,
      });

    if (transactionError) {
      console.error('[credit-stamp] Error recording transaction:', transactionError);
      // Don't fail - stamp was already credited
    }

    const stampsGoal = settings.loyalty_stamps_goal ?? 8;
    const rewardAvailable = newStampsCount >= stampsGoal;
    
    console.log(`[credit-stamp] SUCCESS! Customer ${customer.id} now has ${newStampsCount}/${stampsGoal} stamps`);

    // Notificação push agora é unificada e enviada pelo Kitchen.tsx
    // Retornamos os dados para que o Kitchen envie uma única notificação combinada

    return new Response(
      JSON.stringify({
        success: true,
        stamps_count: newStampsCount,
        stamps_goal: stampsGoal,
        reward_available: rewardAvailable,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[credit-stamp] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: true, message: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

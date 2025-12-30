import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mensagens por status
const statusMessages: Record<string, { title: string; body: string }> = {
  preparing: {
    title: '👨‍🍳 Pedido em preparo!',
    body: 'Estamos preparando seu pedido com carinho',
  },
  ready: {
    title: '✅ Pedido pronto!',
    body: 'Seu pedido está pronto e será despachado em breve',
  },
  out_for_delivery: {
    title: '🏍️ Saiu para entrega!',
    body: 'O entregador está a caminho do seu endereço',
  },
  delivered: {
    title: '🎉 Entregue!',
    body: 'Obrigado pela preferência! Bom apetite!',
  },
  cancelled: {
    title: '❌ Pedido cancelado',
    body: 'Seu pedido foi cancelado',
  },
};

// Importar web-push via esm.sh
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidDetails: { subject: string; publicKey: string; privateKey: string }
): Promise<{ success: boolean; statusCode?: number }> {
  try {
    // Use esm.sh to import web-push as a dynamic import
    const webpush = await import("https://esm.sh/web-push@3.6.7?target=deno");
    
    webpush.setVapidDetails(
      vapidDetails.subject,
      vapidDetails.publicKey,
      vapidDetails.privateKey
    );

    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth,
      },
    };

    await webpush.sendNotification(pushSubscription, payload);
    return { success: true };
  } catch (error: unknown) {
    const err = error as { statusCode?: number; message?: string };
    console.error('[send-push] Web push error:', err.message);
    return { success: false, statusCode: err.statusCode };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, status, customTitle, customBody } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push] Processing push for order ${orderId}, status: ${status}`);

    // Configurar VAPID
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');

    if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
      console.error('[send-push] VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar Supabase client com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar subscriptions ativas para o pedido
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('order_id', orderId)
      .gt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('[send-push] Error fetching subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Error fetching subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[send-push] No active subscriptions found for order');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push] Found ${subscriptions.length} subscription(s)`);

    // Pegar mensagem do status ou usar custom
    const message = statusMessages[status] || { title: 'Bruttus Delivery', body: 'Atualização do seu pedido' };
    const title = customTitle || message.title;
    const body = customBody || message.body;

    const pushPayload = JSON.stringify({
      title,
      body,
      orderId,
      url: `/order/${orderId}`,
    });

    let sentCount = 0;
    const failedSubscriptions: string[] = [];

    // Enviar para cada subscription
    for (const sub of subscriptions) {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        pushPayload,
        { subject: vapidSubject, publicKey: vapidPublicKey, privateKey: vapidPrivateKey }
      );

      if (result.success) {
        sentCount++;
        console.log(`[send-push] Successfully sent to ${sub.endpoint.slice(0, 50)}...`);
      } else if (result.statusCode === 410 || result.statusCode === 404) {
        // Subscription expirada ou inválida - remover
        console.log(`[send-push] Subscription expired/invalid, marking for removal: ${sub.id}`);
        failedSubscriptions.push(sub.id);
      }
    }

    // Remover subscriptions inválidas
    if (failedSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', failedSubscriptions);
      console.log(`[send-push] Removed ${failedSubscriptions.length} invalid subscription(s)`);
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[send-push] Unexpected error:', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

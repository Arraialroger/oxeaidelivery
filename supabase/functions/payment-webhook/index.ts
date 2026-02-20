import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Rate limiting for webhook endpoint
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string, maxRequests = 30, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > maxRequests;
}

// Map Mercado Pago status to our internal status
function mapStatus(mpStatus: string): string {
  const map: Record<string, string> = {
    pending: "pending",
    approved: "approved",
    authorized: "approved",
    in_process: "pending",
    in_mediation: "pending",
    rejected: "rejected",
    cancelled: "rejected",
    refunded: "refunded",
    charged_back: "refunded",
  };
  return map[mpStatus] || "pending";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (isRateLimited(clientIp)) {
    return new Response("Too many requests", { status: 429, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    console.log("[WEBHOOK] Received:", JSON.stringify(body));

    // Mercado Pago sends different notification types
    // We care about "payment" type
    const { type, data, action } = body;

    if (type !== "payment" && action !== "payment.updated" && action !== "payment.created") {
      // Acknowledge but ignore non-payment notifications
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      console.error("[WEBHOOK] No payment ID in notification");
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from Mercado Pago to verify
    const mpToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpToken) {
      console.error("[WEBHOOK] MERCADOPAGO_ACCESS_TOKEN not configured");
      return new Response("Server configuration error", { status: 500, headers: corsHeaders });
    }

    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      {
        headers: { Authorization: `Bearer ${mpToken}` },
      }
    );

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error("[WEBHOOK] MP fetch error:", mpResponse.status, errorText);
      return new Response("Failed to verify payment", { status: 500, headers: corsHeaders });
    }

    const mpPayment = await mpResponse.json();
    const internalStatus = mapStatus(mpPayment.status);

    console.log(
      `[WEBHOOK] Payment ${paymentId}: MP status=${mpPayment.status}, internal=${internalStatus}`
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find our payment record by provider_payment_id
    const { data: payment, error: findError } = await supabase
      .from("payments")
      .select("id, order_id, status, restaurant_id")
      .eq("provider_payment_id", String(paymentId))
      .maybeSingle();

    if (findError || !payment) {
      console.error("[WEBHOOK] Payment not found for provider ID:", paymentId, findError);
      // Still return 200 to prevent MP retries for unknown payments
      return new Response(JSON.stringify({ received: true, warning: "payment_not_found" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process if status actually changed
    if (payment.status === internalStatus) {
      console.log(`[WEBHOOK] Payment ${payment.id} already has status ${internalStatus}, skipping`);
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update payment status
    const updateData: Record<string, unknown> = {
      status: internalStatus,
      provider_status: mpPayment.status,
      provider_raw: mpPayment,
    };

    if (internalStatus === "approved") {
      updateData.paid_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from("payments")
      .update(updateData)
      .eq("id", payment.id);

    if (updateError) {
      console.error("[WEBHOOK] Payment update error:", updateError);
    }

    // Log payment event
    await supabase.from("payment_events").insert({
      payment_id: payment.id,
      event_type: `webhook_${mpPayment.status}`,
      provider_status: mpPayment.status,
      metadata: {
        action: action || type,
        mp_payment_id: paymentId,
        internal_status: internalStatus,
      },
    });

    // If approved, update order status to 'preparing'
    if (internalStatus === "approved" && payment.order_id) {
      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "preparing" })
        .eq("id", payment.order_id)
        .eq("status", "pending"); // Only update if still pending (idempotent)

      if (orderError) {
        console.error("[WEBHOOK] Order update error:", orderError);
      } else {
        console.log(`[WEBHOOK] Order ${payment.order_id} moved to 'preparing'`);
      }

      // Log KDS event for the kitchen
      await supabase.from("kds_events").insert({
        order_id: payment.order_id,
        restaurant_id: payment.restaurant_id,
        event: "order_paid",
      });
    }

    // If rejected, update order to cancelled
    if (internalStatus === "rejected" && payment.order_id) {
      await supabase
        .from("orders")
        .update({ status: "cancelled", cancellation_reason: "Pagamento rejeitado" })
        .eq("id", payment.order_id)
        .eq("status", "pending");
    }

    console.log(`[WEBHOOK] Successfully processed payment ${payment.id} -> ${internalStatus}`);

    return new Response(JSON.stringify({ received: true, status: internalStatus }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[WEBHOOK] Error:", error);
    // Always return 200 to prevent MP infinite retries
    return new Response(JSON.stringify({ received: true, error: "processing_error" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

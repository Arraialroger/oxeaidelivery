import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

function mapStatus(mpStatus: string): string {
  const map: Record<string, string> = {
    pending: "pending", approved: "approved", authorized: "approved",
    in_process: "pending", in_mediation: "pending", rejected: "rejected",
    cancelled: "rejected", refunded: "refunded", charged_back: "refunded",
  };
  return map[mpStatus] || "pending";
}

/**
 * Resolve the Mercado Pago access token for a given restaurant.
 * If the restaurant uses own_gateway, decrypt their stored token.
 * Otherwise, fall back to the platform-level MERCADOPAGO_ACCESS_TOKEN.
 */
async function getMpTokenForRestaurant(
  supabase: ReturnType<typeof createClient>,
  restaurantId: string,
  log: (action: string, detail?: unknown) => void,
): Promise<string> {
  const { data: settings } = await supabase
    .from("restaurant_payment_settings")
    .select("gateway_mode, encrypted_access_token")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (settings?.gateway_mode === "own_gateway" && settings?.encrypted_access_token) {
    const encryptionKey = Deno.env.get("PAYMENT_ENCRYPTION_KEY");
    if (encryptionKey) {
      try {
        const { data: decryptedToken, error: decError } = await supabase.rpc(
          "decrypt_payment_token",
          { p_encrypted: settings.encrypted_access_token, p_key: encryptionKey },
        );
        if (!decError && decryptedToken) {
          log("using_restaurant_gateway", { restaurant_id: restaurantId });
          return decryptedToken;
        }
        log("decryption_failed", { error: decError?.message });
      } catch (err) {
        log("gateway_decrypt_error", { error: (err as Error).message });
      }
    }
  }

  // Fallback: platform token
  log("using_platform_gateway", { restaurant_id: restaurantId });
  const token = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
  return token;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID().slice(0, 12);
  const log = (action: string, detail?: unknown) =>
    console.log(JSON.stringify({ fn: "payment-webhook", cid: correlationId, action, ...(detail ? { detail } : {}) }));

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (isRateLimited(clientIp)) {
    log("rate_limited", { ip: clientIp });
    return new Response("Too many requests", { status: 429, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const body = await req.json();
    const { type, data, action } = body;
    log("webhook_received", { type, action, data_id: data?.id });

    if (type !== "payment" && action !== "payment.updated" && action !== "payment.created") {
      log("ignored_notification", { type, action });
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const mpPaymentId = data?.id;
    if (!mpPaymentId) {
      log("no_payment_id");
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Find our payment record FIRST so we know which restaurant it belongs to
    const { data: payment, error: findError } = await supabase
      .from("payments")
      .select("id, order_id, status, restaurant_id")
      .eq("provider_payment_id", String(mpPaymentId))
      .maybeSingle();

    if (findError || !payment) {
      log("payment_not_found", { provider_payment_id: mpPaymentId });
      if (!findError) {
        log("suspicious_webhook", { provider_payment_id: mpPaymentId });
      }
      return new Response(JSON.stringify({ received: true, warning: "payment_not_found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve the correct MP token for THIS restaurant (multi-tenant)
    const mpToken = await getMpTokenForRestaurant(supabase, payment.restaurant_id, log);

    // Verify with Mercado Pago using the restaurant-specific token
    const mpResponse = await fetch(
      `https://api.mercadopago.com/v1/payments/${mpPaymentId}`,
      { headers: { Authorization: `Bearer ${mpToken}` } },
    );

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      log("mp_verification_failed", { status: mpResponse.status, error: errorText });
      return new Response("Failed to verify payment", { status: 500, headers: corsHeaders });
    }

    const mpPayment = await mpResponse.json();
    const internalStatus = mapStatus(mpPayment.status);
    log("mp_verified", { mp_status: mpPayment.status, internal_status: internalStatus });

    log("payment_found", { payment_id: payment.id, current_status: payment.status, new_status: internalStatus });

    // Skip if status hasn't changed
    if (payment.status === internalStatus) {
      log("status_unchanged", { payment_id: payment.id, status: internalStatus });
      return new Response(JSON.stringify({ received: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      log("payment_update_error", { error: updateError.message });
    } else {
      log("payment_updated", { payment_id: payment.id, new_status: internalStatus });
    }

    // Log payment event with correlation
    await supabase.from("payment_events").insert({
      payment_id: payment.id,
      event_type: `webhook_${mpPayment.status}`,
      provider_status: mpPayment.status,
      metadata: {
        action: action || type,
        mp_payment_id: mpPaymentId,
        internal_status: internalStatus,
        correlation_id: correlationId,
      },
    });

    // ── Reconcile: If approved, update order to preparing ──
    if (internalStatus === "approved" && payment.order_id) {
      const { data: orderCheck } = await supabase
        .from("orders")
        .select("status")
        .eq("id", payment.order_id)
        .single();

      const { error: orderError } = await supabase
        .from("orders")
        .update({ status: "preparing" })
        .eq("id", payment.order_id)
        .eq("status", "pending");

      if (orderError) {
        log("order_update_error", { order_id: payment.order_id, error: orderError.message });
        await supabase.from("payment_alerts").insert({
          restaurant_id: payment.restaurant_id,
          alert_type: "order_update_failed",
          severity: "critical",
          message: `Payment ${payment.id} approved but order ${payment.order_id} update failed`,
          metadata: { payment_id: payment.id, order_id: payment.order_id, error: orderError.message, correlation_id: correlationId },
        });
      } else {
        log("order_updated", { order_id: payment.order_id, from: orderCheck?.status, to: "preparing" });
      }

      await supabase.from("kds_events").insert({
        order_id: payment.order_id,
        restaurant_id: payment.restaurant_id,
        event: "order_paid",
      });
    }

    // If rejected, cancel order
    if (internalStatus === "rejected" && payment.order_id) {
      await supabase
        .from("orders")
        .update({ status: "cancelled", cancellation_reason: "Pagamento rejeitado" })
        .eq("id", payment.order_id)
        .eq("status", "pending");
      log("order_cancelled", { order_id: payment.order_id, reason: "payment_rejected" });
    }

    log("webhook_processed", { payment_id: payment.id, final_status: internalStatus });

    return new Response(JSON.stringify({ received: true, status: internalStatus }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    log("error", { message: (error as Error).message });
    return new Response(JSON.stringify({ received: true, error: "processing_error" }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

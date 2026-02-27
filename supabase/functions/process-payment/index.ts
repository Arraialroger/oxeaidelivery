import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://deliveryarraial.lovable.app",
  "https://id-preview--0384a06e-621e-4be3-9b52-eaa7f97369ec.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

// ─── PaymentProvider Abstraction ───────────────────────────────────
interface PaymentResult {
  providerPaymentId: string;
  status: string;
  pixQrCode?: string;
  pixQrCodeBase64?: string;
  pixExpirationDate?: string;
  raw: Record<string, unknown>;
}

interface PaymentProvider {
  createPixPayment(params: {
    amount: number;
    description: string;
    externalReference: string;
    payerEmail?: string;
    notificationUrl: string;
    idempotencyKey: string;
  }): Promise<PaymentResult>;
}

// ─── Mercado Pago Implementation ──────────────────────────────────
class MercadoPagoProvider implements PaymentProvider {
  private accessToken: string;
  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  async createPixPayment(params: {
    amount: number;
    description: string;
    externalReference: string;
    payerEmail?: string;
    notificationUrl: string;
    idempotencyKey: string;
  }): Promise<PaymentResult> {
    const body: Record<string, unknown> = {
      transaction_amount: params.amount,
      description: params.description,
      payment_method_id: "pix",
      external_reference: params.externalReference,
      notification_url: params.notificationUrl,
      payer: { email: params.payerEmail || "cliente@delivery.com" },
    };

    const response = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.accessToken}`,
        "X-Idempotency-Key": params.idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Mercado Pago error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    return {
      providerPaymentId: String(data.id),
      status: this.mapStatus(data.status),
      pixQrCode: data.point_of_interaction?.transaction_data?.qr_code || null,
      pixQrCodeBase64: data.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      pixExpirationDate: data.point_of_interaction?.transaction_data?.expiration_date || null,
      raw: data,
    };
  }

  private mapStatus(mpStatus: string): string {
    const map: Record<string, string> = {
      pending: "pending", approved: "approved", authorized: "approved",
      in_process: "pending", in_mediation: "pending", rejected: "rejected",
      cancelled: "rejected", refunded: "refunded", charged_back: "refunded",
    };
    return map[mpStatus] || "pending";
  }
}

// ─── Provider Factory ─────────────────────────────────────────────
async function getProviderForRestaurant(
  supabase: any,
  restaurantId: string,
  providerName: string,
  log: (action: string, detail?: unknown) => void
): Promise<PaymentProvider> {
  // Try to get restaurant-specific credentials
  const { data: settings } = await supabase
    .from("restaurant_payment_settings")
    .select("gateway_mode, encrypted_access_token")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true)
    .maybeSingle();

  if (settings?.gateway_mode === "own_gateway" && settings?.encrypted_access_token) {
    try {
      const encryptionKey = Deno.env.get("PAYMENT_ENCRYPTION_KEY");
      if (encryptionKey) {
        const { data: decryptedToken, error: decError } = await supabase.rpc("decrypt_payment_token", {
          p_encrypted: settings.encrypted_access_token,
          p_key: encryptionKey,
        });

        if (!decError && decryptedToken) {
          log("using_restaurant_gateway", { restaurant_id: restaurantId });
          return new MercadoPagoProvider(decryptedToken);
        }
        log("decryption_failed", { error: decError?.message });
      }
    } catch (err) {
      log("gateway_fallback", { error: err.message });
    }
  }

  // Fallback to platform global token
  log("using_platform_gateway", { restaurant_id: restaurantId });
  const token = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
  if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
  return new MercadoPagoProvider(token);
}

// ─── Rate Limiting ────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(key: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > maxRequests;
}

// ─── Main Handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  // Generate correlation_id for end-to-end tracing
  const correlationId = crypto.randomUUID().slice(0, 12);
  const log = (action: string, detail?: unknown) =>
    console.log(JSON.stringify({ fn: "process-payment", cid: correlationId, action, ...(detail ? { detail } : {}) }));

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (isRateLimited(`ip:${clientIp}`)) {
    log("rate_limited", { ip: clientIp });
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { order_id, restaurant_id, amount, description, provider } = body;
    log("request_received", { order_id, restaurant_id, amount, provider });

    // Validate required fields
    if (!order_id || !restaurant_id || !amount) {
      log("validation_failed", { missing: { order_id: !order_id, restaurant_id: !restaurant_id, amount: !amount } });
      return new Response(
        JSON.stringify({ error: "Missing required fields: order_id, restaurant_id, amount" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be positive" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // ── Security: Validate order exists and amount matches ──
    const { data: orderData, error: orderError } = await supabase
      .from("orders")
      .select("id, total, status, restaurant_id")
      .eq("id", order_id)
      .eq("restaurant_id", restaurant_id)
      .maybeSingle();

    if (orderError || !orderData) {
      log("order_not_found", { order_id, restaurant_id });
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    if (orderData.status !== "pending") {
      log("order_not_pending", { order_id, status: orderData.status });
      return new Response(
        JSON.stringify({ error: "Order is not pending" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Validate amount matches order total (anti-fraud)
    if (Math.abs(Number(orderData.total) - amount) > 0.01) {
      log("amount_mismatch", { order_total: orderData.total, requested: amount });
      return new Response(
        JSON.stringify({ error: "Amount does not match order total" }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ── Rate limit per order_id (max 3 PIX per order) ──
    if (isRateLimited(`order:${order_id}`, 3, 3600000)) {
      log("order_rate_limited", { order_id });
      return new Response(
        JSON.stringify({ error: "Too many payment attempts for this order" }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // ── Rate limit per restaurant (max 100 PIX/hour) ──
    if (isRateLimited(`restaurant:${restaurant_id}`, 100, 3600000)) {
      log("restaurant_rate_limited", { restaurant_id });
      return new Response(
        JSON.stringify({ error: "Too many payment requests" }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Check for existing pending payment for this order
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, pix_qr_code, pix_qr_code_base64, pix_expiration_date, provider_payment_id")
      .eq("order_id", order_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPayment) {
      if (existingPayment.pix_expiration_date) {
        const expDate = new Date(existingPayment.pix_expiration_date);
        if (expDate > new Date()) {
          log("reusing_existing_pix", { payment_id: existingPayment.id });
          return new Response(
            JSON.stringify({
              payment_id: existingPayment.id,
              pix_qr_code: existingPayment.pix_qr_code,
              pix_qr_code_base64: existingPayment.pix_qr_code_base64,
              pix_expiration_date: existingPayment.pix_expiration_date,
              status: "pending",
              correlation_id: correlationId,
            }),
            { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Build webhook URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const notificationUrl = `${supabaseUrl}/functions/v1/payment-webhook`;
    const idempotencyKey = `${order_id}-${Date.now()}`;

    // Create payment via provider
    const providerName = provider || "mercadopago";
    const paymentProvider = await getProviderForRestaurant(supabase, restaurant_id, providerName, log);

    log("creating_pix", { provider: providerName });

    const result = await paymentProvider.createPixPayment({
      amount,
      description: description || `Pedido ${order_id.slice(0, 8)}`,
      externalReference: order_id,
      notificationUrl,
      idempotencyKey,
    });

    log("pix_created_at_provider", { provider_payment_id: result.providerPaymentId, status: result.status });

    // Save payment in DB
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        restaurant_id,
        order_id,
        provider: providerName,
        provider_payment_id: result.providerPaymentId,
        provider_status: result.raw?.status || "pending",
        provider_raw: result.raw,
        payment_method: "pix",
        amount,
        status: result.status,
        pix_qr_code: result.pixQrCode,
        pix_qr_code_base64: result.pixQrCodeBase64,
        pix_expiration_date: result.pixExpirationDate,
        idempotency_key: idempotencyKey,
      })
      .select("id")
      .single();

    if (paymentError) {
      log("db_insert_error", { error: paymentError.message });
      throw new Error("Failed to save payment");
    }

    // Log event
    await supabase.from("payment_events").insert({
      payment_id: payment.id,
      event_type: "payment_created",
      provider_status: result.raw?.status || "pending",
      metadata: { provider: providerName, amount, order_id, correlation_id: correlationId },
    });

    log("payment_saved", { payment_id: payment.id });

    return new Response(
      JSON.stringify({
        payment_id: payment.id,
        pix_qr_code: result.pixQrCode,
        pix_qr_code_base64: result.pixQrCodeBase64,
        pix_expiration_date: result.pixExpirationDate,
        status: result.status,
        correlation_id: correlationId,
      }),
      { status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error", correlation_id: correlationId }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

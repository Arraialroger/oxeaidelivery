import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  getPaymentStatus(providerPaymentId: string): Promise<{
    status: string;
    providerStatus: string;
    raw: Record<string, unknown>;
  }>;
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
      payer: {
        email: params.payerEmail || "cliente@delivery.com",
      },
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
      console.error("[MP] Error creating payment:", response.status, errorBody);
      throw new Error(`Mercado Pago error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();

    return {
      providerPaymentId: String(data.id),
      status: this.mapStatus(data.status),
      pixQrCode: data.point_of_interaction?.transaction_data?.qr_code || null,
      pixQrCodeBase64:
        data.point_of_interaction?.transaction_data?.qr_code_base64 || null,
      pixExpirationDate:
        data.point_of_interaction?.transaction_data?.expiration_date || null,
      raw: data,
    };
  }

  async getPaymentStatus(providerPaymentId: string) {
    const response = await fetch(
      `https://api.mercadopago.com/v1/payments/${providerPaymentId}`,
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`MP status error: ${response.status} - ${errorBody}`);
    }

    const data = await response.json();
    return {
      status: this.mapStatus(data.status),
      providerStatus: data.status,
      raw: data,
    };
  }

  private mapStatus(mpStatus: string): string {
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
}

// ─── Provider Factory ─────────────────────────────────────────────
function getProvider(providerName: string): PaymentProvider {
  switch (providerName) {
    case "mercadopago":
    default: {
      const token = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
      if (!token) throw new Error("MERCADOPAGO_ACCESS_TOKEN not configured");
      return new MercadoPagoProvider(token);
    }
  }
}

// ─── Rate Limiting ────────────────────────────────────────────────
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
function isRateLimited(ip: string, maxRequests = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > maxRequests;
}

// ─── Main Handler ─────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (isRateLimited(clientIp)) {
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { order_id, restaurant_id, amount, description, provider } = body;

    // Validate required fields
    if (!order_id || !restaurant_id || !amount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: order_id, restaurant_id, amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Amount must be positive" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate idempotency key to prevent duplicate payments
    const idempotencyKey = `${order_id}-${Date.now()}`;

    // Check for existing pending payment for this order
    const { data: existingPayment } = await supabase
      .from("payments")
      .select("id, status, pix_qr_code, pix_qr_code_base64, pix_expiration_date, provider_payment_id")
      .eq("order_id", order_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingPayment) {
      // Check if existing payment is still valid (not expired)
      if (existingPayment.pix_expiration_date) {
        const expDate = new Date(existingPayment.pix_expiration_date);
        if (expDate > new Date()) {
          return new Response(
            JSON.stringify({
              payment_id: existingPayment.id,
              pix_qr_code: existingPayment.pix_qr_code,
              pix_qr_code_base64: existingPayment.pix_qr_code_base64,
              pix_expiration_date: existingPayment.pix_expiration_date,
              status: "pending",
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Build webhook URL
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const notificationUrl = `${supabaseUrl}/functions/v1/payment-webhook`;

    // Create payment via provider
    const providerName = provider || "mercadopago";
    const paymentProvider = getProvider(providerName);

    const result = await paymentProvider.createPixPayment({
      amount,
      description: description || `Pedido ${order_id.slice(0, 8)}`,
      externalReference: order_id,
      notificationUrl,
      idempotencyKey,
    });

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
      console.error("[PAYMENT] DB insert error:", paymentError);
      throw new Error("Failed to save payment");
    }

    // Log event
    await supabase.from("payment_events").insert({
      payment_id: payment.id,
      event_type: "payment_created",
      provider_status: result.raw?.status || "pending",
      metadata: { provider: providerName, amount, order_id },
    });

    console.log(`[PAYMENT] Created payment ${payment.id} for order ${order_id}`);

    return new Response(
      JSON.stringify({
        payment_id: payment.id,
        pix_qr_code: result.pixQrCode,
        pix_qr_code_base64: result.pixQrCodeBase64,
        pix_expiration_date: result.pixExpirationDate,
        status: result.status,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[PAYMENT] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

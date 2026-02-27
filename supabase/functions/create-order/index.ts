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

// In-memory rate limiting (resets on cold start)
const ipLimiter = new Map<string, { count: number; resetAt: number }>();
const restaurantLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(
  map: Map<string, { count: number; resetAt: number }>,
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = map.get(key);
  if (!entry || now > entry.resetAt) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

function log(level: string, correlationId: string, message: string, data?: Record<string, unknown>) {
  console.log(JSON.stringify({ level, correlation_id: correlationId, message, ...data, ts: new Date().toISOString() }));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: getCorsHeaders(req) });
  }

  const correlationId = crypto.randomUUID().slice(0, 12);

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    log("info", correlationId, "create-order request received", { restaurant_id: body.restaurant_id });

    // Validate required fields
    const { restaurant_id, idempotency_key, customer, address, order_data, items } = body;
    if (!restaurant_id || !idempotency_key || !customer?.phone || !address?.street || !order_data || !items?.length) {
      log("warn", correlationId, "Validation failed: missing required fields");
      return new Response(
        JSON.stringify({ error: "VALIDATION_ERROR", message: "Campos obrigatórios ausentes", correlation_id: correlationId }),
        { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Rate limiting
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkRateLimit(ipLimiter, clientIp, 10, 60_000)) {
      log("warn", correlationId, "IP rate limit exceeded", { ip: clientIp });
      return new Response(
        JSON.stringify({ error: "RATE_LIMIT", message: "Muitas tentativas. Aguarde um momento.", correlation_id: correlationId }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }
    if (!checkRateLimit(restaurantLimiter, restaurant_id, 200, 3_600_000)) {
      log("warn", correlationId, "Restaurant rate limit exceeded", { restaurant_id });
      return new Response(
        JSON.stringify({ error: "RATE_LIMIT", message: "Limite de pedidos excedido.", correlation_id: correlationId }),
        { status: 429, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with service role for SECURITY DEFINER RPC
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Build payload for RPC
    const rpcPayload = {
      restaurant_id,
      idempotency_key,
      correlation_id: correlationId,
      customer,
      address,
      order_data,
      items,
      loyalty: body.loyalty || null,
      coupon: body.coupon || null,
    };

    log("info", correlationId, "Calling create_order_transaction RPC");

    const { data, error } = await supabase.rpc("create_order_transaction", {
      p_data: rpcPayload,
    });

    if (error) {
      log("error", correlationId, "RPC error", { error: error.message, code: error.code });

      // Log failed attempt to audit table (outside transaction)
      try {
        await supabase.from("order_audit_log").insert({
          correlation_id: correlationId,
          idempotency_key,
          restaurant_id,
          customer_phone: customer.phone,
          total: order_data.total,
          status: "failed",
          error_message: error.message,
          metadata: { error_code: error.code },
        });
      } catch (auditErr) {
        log("error", correlationId, "Failed to write audit log", { audit_error: String(auditErr) });
      }

      // Emit health event for critical failures
      const isTimeout = error.message?.includes("statement timeout");
      const eventType = isTimeout ? "order_creation_timeout" : "order_creation_failed";
      try {
        await supabase.rpc("log_health_event", {
          p_event_type: eventType,
          p_severity: "critical",
          p_source: "create-order",
          p_restaurant_id: restaurant_id,
          p_correlation_id: correlationId,
          p_message: `Falha ao criar pedido: ${error.message}`,
          p_metadata: { error_code: error.code, customer_phone: customer.phone, total: order_data.total },
        });
      } catch (healthErr) {
        log("error", correlationId, "Failed to log health event", { health_error: String(healthErr) });
      }

      // Map error types
      if (error.message?.includes("RESTAURANT_INACTIVE")) {
        return new Response(
          JSON.stringify({ error: "RESTAURANT_INACTIVE", message: "Restaurante não está ativo.", correlation_id: correlationId }),
          { status: 400, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }
      if (isTimeout) {
        return new Response(
          JSON.stringify({ error: "TIMEOUT_ERROR", message: "Tempo limite excedido.", correlation_id: correlationId }),
          { status: 504, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "INTERNAL_ERROR", message: "Erro ao criar pedido.", correlation_id: correlationId }),
        { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
      );
    }

    log("info", correlationId, "Order created successfully", { order_id: data?.order_id, status: data?.status });

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (err) {
    log("error", correlationId, "Unhandled error", { error: String(err) });
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR", message: "Erro interno.", correlation_id: correlationId }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID().slice(0, 12);
  const log = (action: string, detail?: unknown) =>
    console.log(JSON.stringify({ fn: "reconcile-payments", cid: correlationId, action, ...(detail ? { detail } : {}) }));

  const startTime = Date.now();

  // ── Auth guard: validate CRON_SECRET_KEY or admin JWT ──
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET_KEY");
  let isAdminCall = false;

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    log("auth_ok", { method: "cron_secret" });
  } else if (authHeader?.startsWith("Bearer ")) {
    // Try to validate as admin JWT
    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey);
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    
    if (userError || !user) {
      log("auth_failed", { reason: "invalid_jwt" });
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      log("auth_failed", { reason: "not_admin", user_id: user.id });
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    isAdminCall = true;
    log("auth_ok", { method: "admin_jwt", user_id: user.id });
  } else {
    log("auth_failed", { has_header: !!authHeader });
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // ── Parse optional target filters ──
    let targetPaymentId: string | null = null;
    let targetOrderId: string | null = null;

    if (req.method === "POST") {
      try {
        const body = await req.json();
        targetPaymentId = body.payment_id || null;
        targetOrderId = body.order_id || null;
      } catch { /* no body is fine */ }
    }

    const isTargeted = !!(targetPaymentId || targetOrderId);
    log("reconciliation_start", { targeted: isTargeted, targetPaymentId, targetOrderId });

    let fixedCount = 0;
    let expiredCount = 0;
    let alertCount = 0;

    // ── 1. Fix orphan payments: approved payment + pending order ──
    let orphanQuery = supabase
      .from("payments")
      .select("id, order_id, restaurant_id, status, paid_at")
      .eq("status", "approved")
      .not("order_id", "is", null);

    if (targetPaymentId) {
      orphanQuery = orphanQuery.eq("id", targetPaymentId);
    } else if (targetOrderId) {
      orphanQuery = orphanQuery.eq("order_id", targetOrderId);
    }

    const { data: orphanPayments } = await orphanQuery;

    if (orphanPayments) {
      for (const payment of orphanPayments) {
        const { data: order } = await supabase
          .from("orders")
          .select("id, status")
          .eq("id", payment.order_id!)
          .single();

        if (order && order.status === "pending") {
          log("fixing_orphan", { payment_id: payment.id, order_id: order.id });

          const { error } = await supabase
            .from("orders")
            .update({ status: "preparing" })
            .eq("id", order.id)
            .eq("status", "pending");

          if (!error) {
            fixedCount++;
            await supabase.from("payment_events").insert({
              payment_id: payment.id,
              event_type: "reconciliation_fix",
              provider_status: "approved",
              metadata: { action: "order_status_corrected", order_id: order.id, correlation_id: correlationId, triggered_by: isAdminCall ? "admin" : "cron" },
            });

            await supabase.from("kds_events").insert({
              order_id: order.id,
              restaurant_id: payment.restaurant_id,
              event: "order_paid",
            });

            await supabase.from("payment_alerts").insert({
              restaurant_id: payment.restaurant_id,
              alert_type: "status_mismatch_fixed",
              severity: "warning",
              message: `Pedido ${order.id.slice(0, 8)} corrigido automaticamente (pagamento aprovado mas pedido estava pendente)`,
              metadata: { payment_id: payment.id, order_id: order.id, correlation_id: correlationId },
            });
            alertCount++;
          }
        }

        // Fix missing paid_at
        if (!payment.paid_at) {
          await supabase
            .from("payments")
            .update({ paid_at: new Date().toISOString() })
            .eq("id", payment.id);
        }
      }
    }

    // ── 2. Expire stale pending PIX payments (skip for targeted) ──
    if (!isTargeted) {
      const { data: stalePending } = await supabase
        .from("payments")
        .select("id, order_id, restaurant_id, pix_expiration_date")
        .eq("status", "pending")
        .not("pix_expiration_date", "is", null)
        .lt("pix_expiration_date", new Date().toISOString());

      if (stalePending) {
        for (const payment of stalePending) {
          const { error } = await supabase
            .from("payments")
            .update({ status: "expired" })
            .eq("id", payment.id)
            .eq("status", "pending");

          if (!error) {
            expiredCount++;
            await supabase.from("payment_events").insert({
              payment_id: payment.id,
              event_type: "reconciliation_expired",
              metadata: { expired_at: payment.pix_expiration_date, correlation_id: correlationId },
            });
          }
        }
      }

      // ── 3. Check for high failure rate (last 30 min) ──
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
      const { data: recentPayments } = await supabase
        .from("payments")
        .select("status, restaurant_id")
        .gte("created_at", thirtyMinAgo);

      if (recentPayments && recentPayments.length >= 5) {
        const byRestaurant = new Map<string, { total: number; failed: number }>();
        for (const p of recentPayments) {
          const r = byRestaurant.get(p.restaurant_id) || { total: 0, failed: 0 };
          r.total++;
          if (p.status === "rejected" || p.status === "expired") r.failed++;
          byRestaurant.set(p.restaurant_id, r);
        }

        for (const [restaurantId, stats] of byRestaurant) {
          if (stats.total >= 3 && stats.failed / stats.total > 0.3) {
            await supabase.from("payment_alerts").insert({
              restaurant_id: restaurantId,
              alert_type: "high_failure_rate",
              severity: "critical",
              message: `Alta taxa de falha: ${stats.failed}/${stats.total} pagamentos falharam nos últimos 30 min`,
              metadata: { ...stats, correlation_id: correlationId },
            });
            alertCount++;
            log("high_failure_rate", { restaurant_id: restaurantId, ...stats });
          }
        }
      }
    }

    const durationMs = Date.now() - startTime;

    // ── Record execution ──
    await supabase.from("reconciliation_runs").insert({
      status: "success",
      duration_ms: durationMs,
      fixed_count: fixedCount,
      expired_count: expiredCount,
      alert_count: alertCount,
      correlation_id: correlationId,
      target_payment_id: targetPaymentId,
      target_order_id: targetOrderId,
    });

    log("reconciliation_complete", { fixed: fixedCount, expired: expiredCount, alerts: alertCount, duration_ms: durationMs });

    return new Response(
      JSON.stringify({
        success: true,
        fixed: fixedCount,
        expired: expiredCount,
        alerts: alertCount,
        correlation_id: correlationId,
        duration_ms: durationMs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log("error", { message: error.message });

    // Record failed execution
    await supabase.from("reconciliation_runs").insert({
      status: "error",
      duration_ms: durationMs,
      errors: error.message,
      correlation_id: correlationId,
    }).catch(() => {}); // Don't fail if logging fails

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

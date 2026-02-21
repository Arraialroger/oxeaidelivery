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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let fixedCount = 0;
    let expiredCount = 0;
    let alertCount = 0;

    // ── 1. Fix orphan payments: approved payment + pending order ──
    const { data: orphanPayments } = await supabase
      .from("payments")
      .select("id, order_id, restaurant_id, status, paid_at")
      .eq("status", "approved")
      .not("order_id", "is", null);

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
            // Audit trail
            await supabase.from("payment_events").insert({
              payment_id: payment.id,
              event_type: "reconciliation_fix",
              provider_status: "approved",
              metadata: { action: "order_status_corrected", order_id: order.id, correlation_id: correlationId },
            });

            // KDS event
            await supabase.from("kds_events").insert({
              order_id: order.id,
              restaurant_id: payment.restaurant_id,
              event: "order_paid",
            });

            // Alert
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

    // ── 2. Expire stale pending PIX payments ──
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
      // Group by restaurant
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

    log("reconciliation_complete", { fixed: fixedCount, expired: expiredCount, alerts: alertCount });

    return new Response(
      JSON.stringify({
        success: true,
        fixed: fixedCount,
        expired: expiredCount,
        alerts: alertCount,
        correlation_id: correlationId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

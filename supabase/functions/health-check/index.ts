import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface HealthCheckResult {
  check: string;
  status: "ok" | "warning" | "critical";
  message: string;
  metadata?: Record<string, unknown>;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID().slice(0, 12);
  const log = (action: string, detail?: unknown) =>
    console.log(JSON.stringify({ fn: "health-check", cid: correlationId, action, ...(detail ? { detail } : {}) }));

  // ── Auth guard ──
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET_KEY");

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const isCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCron) {
    // Also allow admin JWT
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") || supabaseServiceKey);
      const { data: { user }, error } = await anonClient.auth.getUser(token);
      
      if (error || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  log("health_check_start");

  const results: HealthCheckResult[] = [];

  try {
    // ── Check 1: Cron last execution ──
    const { data: lastRun } = await supabase
      .from("reconciliation_runs")
      .select("executed_at, status, correlation_id")
      .order("executed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!lastRun) {
      results.push({
        check: "cron_reconciliation",
        status: "warning",
        message: "Nenhuma execução de reconciliação registrada",
      });
    } else {
      const ageMinutes = (Date.now() - new Date(lastRun.executed_at).getTime()) / 60000;
      if (ageMinutes > 15) {
        results.push({
          check: "cron_reconciliation",
          status: "critical",
          message: `Cron inativo há ${Math.round(ageMinutes)} minutos (limite: 15 min)`,
          metadata: { last_run: lastRun.executed_at, last_status: lastRun.status, age_minutes: Math.round(ageMinutes) },
        });
      } else if (lastRun.status === "error") {
        results.push({
          check: "cron_reconciliation",
          status: "warning",
          message: `Última execução falhou (${Math.round(ageMinutes)} min atrás)`,
          metadata: { last_run: lastRun.executed_at, correlation_id: lastRun.correlation_id },
        });
      } else {
        results.push({
          check: "cron_reconciliation",
          status: "ok",
          message: `Cron OK - última execução ${Math.round(ageMinutes)} min atrás`,
          metadata: { last_run: lastRun.executed_at },
        });
      }
    }

    // ── Check 2: Unreconciled approved payments (approved payment + pending order) ──
    const { data: approvedPayments } = await supabase
      .from("payments")
      .select("id, order_id, restaurant_id, created_at")
      .eq("status", "approved")
      .not("order_id", "is", null);

    if (approvedPayments && approvedPayments.length > 0) {
      const orderIds = approvedPayments.map(p => p.order_id!).filter(Boolean);
      const { data: pendingOrders } = await supabase
        .from("orders")
        .select("id")
        .in("id", orderIds)
        .eq("status", "pending");

      const unreconciledCount = pendingOrders?.length || 0;

      if (unreconciledCount > 0) {
        results.push({
          check: "unreconciled_payments",
          status: "critical",
          message: `${unreconciledCount} pagamento(s) aprovado(s) sem reconciliação`,
          metadata: { count: unreconciledCount },
        });
      } else {
        results.push({
          check: "unreconciled_payments",
          status: "ok",
          message: "Todos os pagamentos aprovados estão reconciliados",
        });
      }
    } else {
      results.push({
        check: "unreconciled_payments",
        status: "ok",
        message: "Nenhum pagamento aprovado pendente de reconciliação",
      });
    }

    // ── Check 3: Stale pending PIX payments (expired but not marked) ──
    const { data: stalePayments, count: staleCount } = await supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .not("pix_expiration_date", "is", null)
      .lt("pix_expiration_date", new Date().toISOString());

    if ((staleCount || 0) > 0) {
      results.push({
        check: "stale_pix_payments",
        status: "warning",
        message: `${staleCount} pagamento(s) PIX expirado(s) ainda com status pending`,
        metadata: { count: staleCount },
      });
    } else {
      results.push({
        check: "stale_pix_payments",
        status: "ok",
        message: "Nenhum pagamento PIX expirado pendente",
      });
    }

    // ── Check 4: Unresolved critical alerts ──
    const { count: criticalAlerts } = await supabase
      .from("payment_alerts")
      .select("id", { count: "exact", head: true })
      .eq("severity", "critical")
      .eq("resolved", false);

    if ((criticalAlerts || 0) > 0) {
      results.push({
        check: "critical_alerts",
        status: "warning",
        message: `${criticalAlerts} alerta(s) crítico(s) não resolvido(s)`,
        metadata: { count: criticalAlerts },
      });
    } else {
      results.push({
        check: "critical_alerts",
        status: "ok",
        message: "Nenhum alerta crítico pendente",
      });
    }

    // ── Generate system alerts for critical issues (per restaurant) ──
    const criticalResults = results.filter(r => r.status === "critical");
    
    if (criticalResults.length > 0) {
      // Get all active restaurants to create alerts
      const { data: restaurants } = await supabase
        .from("restaurants")
        .select("id")
        .eq("status", "active");

      for (const restaurant of (restaurants || [])) {
        for (const critical of criticalResults) {
          // Dedup: check if alert already exists in last 30 min
          const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
          const { data: existing } = await supabase
            .from("payment_alerts")
            .select("id")
            .eq("restaurant_id", restaurant.id)
            .eq("alert_type", `health_${critical.check}`)
            .eq("resolved", false)
            .gte("created_at", thirtyMinAgo)
            .maybeSingle();

          if (!existing) {
            await supabase.from("payment_alerts").insert({
              restaurant_id: restaurant.id,
              alert_type: `health_${critical.check}`,
              severity: "critical",
              message: critical.message,
              metadata: {
                ...critical.metadata,
                correlation_id: correlationId,
                source: "health_check",
              },
            });
            log("alert_created", { restaurant_id: restaurant.id, check: critical.check });
          }
        }
      }
    }

    // ── Overall status ──
    const overallStatus = criticalResults.length > 0
      ? "critical"
      : results.some(r => r.status === "warning")
        ? "warning"
        : "ok";

    log("health_check_complete", { overall: overallStatus, checks: results.length, critical: criticalResults.length });

    return new Response(
      JSON.stringify({
        status: overallStatus,
        checks: results,
        correlation_id: correlationId,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("error", { message: error.message });
    return new Response(
      JSON.stringify({ error: error.message, correlation_id: correlationId }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

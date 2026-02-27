import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface NotificationRecord {
  id: string;
  channel: string;
  subject: string;
  body: string;
  restaurant_id: string | null;
  attempts: number;
  max_attempts: number;
  metadata: Record<string, unknown>;
}

// ── Telegram provider ──
async function sendTelegram(notification: NotificationRecord, log: (a: string, d?: unknown) => void): Promise<void> {
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
  const chatId = Deno.env.get("TELEGRAM_CHAT_ID");

  if (!token || !chatId) {
    throw new Error("TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured");
  }

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: notification.body,
      parse_mode: "Markdown",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    log("telegram_api_error", { status: res.status, error: errText });
    throw new Error(`Telegram API error: ${res.status} - ${errText}`);
  }

  const result = await res.json();
  log("telegram_sent", { message_id: result?.result?.message_id });
}

// ── Provider dispatcher ──
async function sendNotification(notification: NotificationRecord, log: (a: string, d?: unknown) => void): Promise<void> {
  switch (notification.channel) {
    case "telegram":
      await sendTelegram(notification, log);
      break;
    default:
      // Future channels (email, whatsapp, slack) - simulate for now
      log("[NOTIFY-SIM]", {
        notification_id: notification.id,
        channel: notification.channel,
        subject: notification.subject,
        body_preview: notification.body?.slice(0, 100),
      });
      break;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const correlationId = crypto.randomUUID().slice(0, 12);
  const log = (action: string, detail?: unknown) =>
    console.log(
      JSON.stringify({
        fn: "process-notifications",
        cid: correlationId,
        action,
        ...(detail ? { detail } : {}),
      })
    );

  const startTime = Date.now();

  // ── Auth guard: CRON_SECRET_KEY only ──
  const authHeader = req.headers.get("authorization");
  const cronSecret = Deno.env.get("CRON_SECRET_KEY");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    log("auth_failed", { has_header: !!authHeader });
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  log("auth_ok", { method: "cron_secret" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // ── Fetch pending notifications ──
    const { data: pending, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!pending || pending.length === 0) {
      log("no_pending");
      return new Response(
        JSON.stringify({ success: true, processed: 0, sent: 0, failed: 0, correlation_id: correlationId }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter only those with attempts < max_attempts
    const eligible = pending.filter((n) => n.attempts < n.max_attempts);
    log("batch_start", { total_pending: pending.length, eligible: eligible.length });

    let sentCount = 0;
    let failedCount = 0;

    for (const notification of eligible) {
      // Mark as processing
      await supabase
        .from("notification_queue")
        .update({ status: "processing", last_attempt_at: new Date().toISOString() })
        .eq("id", notification.id);

      try {
        await sendNotification(notification as NotificationRecord, log);

        await supabase
          .from("notification_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: notification.attempts + 1,
          })
          .eq("id", notification.id);

        sentCount++;
      } catch (sendError) {
        const newAttempts = notification.attempts + 1;
        const newStatus = newAttempts >= notification.max_attempts ? "failed" : "pending";

        await supabase
          .from("notification_queue")
          .update({
            status: newStatus,
            attempts: newAttempts,
            error_message: sendError.message || "Unknown send error",
          })
          .eq("id", notification.id);

        failedCount++;
        log("send_error", {
          notification_id: notification.id,
          channel: notification.channel,
          attempts: newAttempts,
          max_attempts: notification.max_attempts,
          final_status: newStatus,
          error: sendError.message,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    log("batch_complete", {
      processed: eligible.length,
      sent: sentCount,
      failed: failedCount,
      duration_ms: durationMs,
    });

    return new Response(
      JSON.stringify({
        success: true,
        processed: eligible.length,
        sent: sentCount,
        failed: failedCount,
        correlation_id: correlationId,
        duration_ms: durationMs,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    log("error", { message: error.message, duration_ms: durationMs });

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

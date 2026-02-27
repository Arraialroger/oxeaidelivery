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

  const log = (action: string, detail?: unknown) =>
    console.log(JSON.stringify({ fn: "save-payment-settings", action, ...(detail ? { detail } : {}) }));

  try {
    // Authenticate user
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify admin role
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const restaurantId = roleData.restaurant_id;
    const body = await req.json();
    const { gateway_mode, access_token, public_key } = body;

    log("request", { restaurant_id: restaurantId, gateway_mode });

    // Validate
    if (!gateway_mode || !["platform", "own_gateway"].includes(gateway_mode)) {
      return new Response(JSON.stringify({ error: "Invalid gateway_mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (gateway_mode === "own_gateway" && !access_token) {
      return new Response(JSON.stringify({ error: "Access token is required for own_gateway mode" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Encrypt access token if provided
    let encryptedToken: string | null = null;
    if (access_token && gateway_mode === "own_gateway") {
      const encryptionKey = Deno.env.get("PAYMENT_ENCRYPTION_KEY");
      if (!encryptionKey) {
        log("error", { message: "PAYMENT_ENCRYPTION_KEY not configured" });
        return new Response(JSON.stringify({ error: "Server configuration error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use pgcrypto via SQL for encryption
      const { data: encData, error: encError } = await supabaseAdmin.rpc("encrypt_payment_token", {
        p_token: access_token,
        p_key: encryptionKey,
      });

      if (encError) {
        log("encryption_error", { error: encError.message });
        // Fallback: encode as base64 with key prefix
        const encoder = new TextEncoder();
        const keyBytes = encoder.encode(encryptionKey.slice(0, 32));
        const tokenBytes = encoder.encode(access_token);
        // Simple XOR encryption as fallback
        const encrypted = new Uint8Array(tokenBytes.length);
        for (let i = 0; i < tokenBytes.length; i++) {
          encrypted[i] = tokenBytes[i] ^ keyBytes[i % keyBytes.length];
        }
        encryptedToken = btoa(String.fromCharCode(...encrypted));
      } else {
        encryptedToken = encData;
      }
    }

    // Upsert settings
    const { error: upsertError } = await supabaseAdmin
      .from("restaurant_payment_settings")
      .upsert(
        {
          restaurant_id: restaurantId,
          provider: "mercadopago",
          gateway_mode,
          encrypted_access_token: encryptedToken,
          public_key: gateway_mode === "own_gateway" ? (public_key || null) : null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "restaurant_id" }
      );

    if (upsertError) {
      log("upsert_error", { error: upsertError.message });
      return new Response(JSON.stringify({ error: "Failed to save settings" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("settings_saved", { restaurant_id: restaurantId, gateway_mode });

    return new Response(
      JSON.stringify({ success: true, gateway_mode }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("error", { message: error.message });
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

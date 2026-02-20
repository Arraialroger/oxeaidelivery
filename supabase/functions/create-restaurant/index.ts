import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreateRestaurantRequest {
  name: string;
  slug: string;
  category?: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
}

function validateSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(slug) && !slug.includes("--");
}

function sanitizeText(text: string, maxLength: number): string {
  return text.trim().slice(0, maxLength);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Auth client to get user
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Service role client for privileged operations
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Parse and validate input
    const body: CreateRestaurantRequest = await req.json();

    if (!body.name || !body.slug) {
      return new Response(
        JSON.stringify({ error: "Nome e slug são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const name = sanitizeText(body.name, 100);
    const slug = body.slug.toLowerCase().trim();

    if (!validateSlug(slug)) {
      return new Response(
        JSON.stringify({ error: "Slug inválido. Use apenas letras minúsculas, números e hifens (3-50 caracteres)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "Este slug já está em uso. Escolha outro." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already owns a restaurant
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (existingRole) {
      return new Response(
        JSON.stringify({ error: "Você já possui um restaurante cadastrado." }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Create restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from("restaurants")
      .insert({
        name,
        slug,
        owner_id: userId,
        category: body.category ? sanitizeText(body.category, 50) : "restaurant",
        logo_url: body.logo_url || null,
        primary_color: body.primary_color || "#000000",
        secondary_color: body.secondary_color || "#ffffff",
        status: "active",
        settings: {
          is_open: true,
          schedule_mode: "manual",
          kds_enabled: true,
          delivery_fee: 5,
          local_ddd: "73",
          loyalty_enabled: true,
          loyalty_stamps_goal: 8,
          loyalty_min_order: 50,
          loyalty_reward_value: 50,
        },
      })
      .select("id, slug")
      .single();

    if (restaurantError) {
      console.error("Error creating restaurant:", restaurantError);
      return new Response(
        JSON.stringify({ error: "Erro ao criar restaurante" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const restaurantId = restaurant.id;

    // 2. Create admin role for user
    await supabase.from("user_roles").insert({
      user_id: userId,
      role: "admin",
      restaurant_id: restaurantId,
    });

    // 3. Create subscription (Pro trial 14 days)
    const { data: proPlan } = await supabase
      .from("plans")
      .select("id")
      .eq("name", "pro")
      .single();

    if (proPlan) {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 14);

      await supabase.from("subscriptions").insert({
        restaurant_id: restaurantId,
        plan_id: proPlan.id,
        status: "trialing",
        trial_ends_at: trialEnd.toISOString(),
        current_period_start: new Date().toISOString(),
        current_period_end: trialEnd.toISOString(),
      });
    }

    // 4. Create default categories
    const categories = [
      { name: "Pratos Principais", order_index: 0, restaurant_id: restaurantId },
      { name: "Bebidas", order_index: 1, restaurant_id: restaurantId },
      { name: "Sobremesas", order_index: 2, restaurant_id: restaurantId },
    ];

    const { data: createdCategories } = await supabase
      .from("categories")
      .insert(categories)
      .select("id, name");

    // 5. Create template products
    if (createdCategories && createdCategories.length > 0) {
      const mainCat = createdCategories.find((c) => c.name === "Pratos Principais");
      const drinkCat = createdCategories.find((c) => c.name === "Bebidas");
      const dessertCat = createdCategories.find((c) => c.name === "Sobremesas");

      const templateProducts = [
        {
          name: "Prato do Dia",
          description: "Edite este produto com o nome e descrição do seu prato",
          price: 29.9,
          category_id: mainCat?.id,
          restaurant_id: restaurantId,
          is_active: true,
          order_index: 0,
        },
        {
          name: "Suco Natural",
          description: "Edite este produto com as opções de suco disponíveis",
          price: 12.0,
          category_id: drinkCat?.id,
          restaurant_id: restaurantId,
          is_active: true,
          order_index: 0,
        },
        {
          name: "Sobremesa da Casa",
          description: "Edite este produto com sua sobremesa especial",
          price: 18.0,
          category_id: dessertCat?.id,
          restaurant_id: restaurantId,
          is_active: true,
          order_index: 0,
        },
      ];

      await supabase.from("products").insert(templateProducts);
    }

    // 6. Register onboarding event
    await supabase.from("onboarding_events").insert({
      restaurant_id: restaurantId,
      event_type: "signup",
      metadata: { source: "wizard", user_id: userId },
    });

    console.log(`Restaurant created: ${slug} (${restaurantId}) by user ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        restaurant: { id: restaurantId, slug: restaurant.slug },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

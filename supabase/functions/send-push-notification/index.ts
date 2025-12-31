import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mensagens por status
const statusMessages: Record<string, { title: string; body: string }> = {
  preparing: {
    title: '👨‍🍳 Pedido em preparo!',
    body: 'Estamos preparando seu pedido com carinho',
  },
  ready: {
    title: '✅ Pedido pronto!',
    body: 'Seu pedido está pronto e será despachado em breve',
  },
  out_for_delivery: {
    title: '🏍️ Saiu para entrega!',
    body: 'O entregador está a caminho do seu endereço',
  },
  delivered: {
    title: '🎉 Entregue!',
    body: 'Obrigado pela preferência! Bom apetite!',
  },
  cancelled: {
    title: '❌ Pedido cancelado',
    body: 'Seu pedido foi cancelado',
  },
};

// Web Push implementation using Web Crypto API (Deno compatible)
async function generateVAPIDAuthHeader(
  audience: string,
  subject: string,
  privateKeyJWK: JsonWebKey,
  expiration: number
): Promise<string> {
  // Import private key
  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJWK,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Create JWT header and payload
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: expiration,
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Sign the token
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    privateKey,
    encoder.encode(unsignedToken)
  );

  // Convert signature from DER to raw format expected by JWT
  const signatureArray = new Uint8Array(signature);
  const signatureB64 = btoa(String.fromCharCode(...signatureArray))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  return `${unsignedToken}.${signatureB64}`;
}

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Decode subscription keys
  const p256dhKey = Uint8Array.from(atob(p256dh.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const authSecret = Uint8Array.from(atob(auth.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

  // Generate local key pair for ECDH
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Import subscriber's public key
  const subscriberPublicKey = await crypto.subtle.importKey(
    "raw",
    p256dhKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberPublicKey },
    localKeyPair.privateKey,
    256
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Derive encryption key using HKDF
  const encoder = new TextEncoder();
  
  // PRK = HKDF-Extract(auth_secret, ecdh_secret)
  const prkKey = await crypto.subtle.importKey(
    "raw",
    authSecret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = await crypto.subtle.sign("HMAC", prkKey, new Uint8Array(sharedSecret));

  // Create info for key derivation
  const keyInfo = new Uint8Array([
    ...encoder.encode("Content-Encoding: aes128gcm\0"),
  ]);
  
  const nonceInfo = new Uint8Array([
    ...encoder.encode("Content-Encoding: nonce\0"),
  ]);

  // Derive content encryption key
  const cekPrkKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(prk),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const cekInfo = new Uint8Array([...salt, ...keyInfo, 1]);
  const cekFull = await crypto.subtle.sign("HMAC", cekPrkKey, cekInfo);
  const cek = new Uint8Array(cekFull).slice(0, 16);

  // Derive nonce
  const nonceInfoFull = new Uint8Array([...salt, ...nonceInfo, 1]);
  const nonceFull = await crypto.subtle.sign("HMAC", cekPrkKey, nonceInfoFull);
  const nonce = new Uint8Array(nonceFull).slice(0, 12);

  // Encrypt payload
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 2);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // Padding delimiter

  const encryptionKey = await crypto.subtle.importKey(
    "raw",
    cek,
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce },
    encryptionKey,
    paddedPayload
  );

  return {
    ciphertext: new Uint8Array(encrypted),
    salt,
    localPublicKey,
  };
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; orderId: string; url: string },
  vapidDetails: { subject: string; privateKeyJWK: JsonWebKey; publicKey: string }
): Promise<{ success: boolean; statusCode?: number }> {
  try {
    console.log('[send-push] Preparing push notification...');
    
    const payloadString = JSON.stringify(payload);
    
    // Get audience from endpoint
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
    
    // Generate VAPID authorization
    const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
    const jwt = await generateVAPIDAuthHeader(
      audience,
      vapidDetails.subject,
      vapidDetails.privateKeyJWK,
      expiration
    );

    // Encrypt payload
    const { ciphertext, salt, localPublicKey } = await encryptPayload(
      payloadString,
      subscription.p256dh,
      subscription.auth
    );

    // Build request body with aes128gcm format
    const recordSize = 4096;
    const body = new Uint8Array(
      salt.length + 4 + 1 + localPublicKey.length + ciphertext.length
    );
    
    let offset = 0;
    body.set(salt, offset);
    offset += salt.length;
    
    // Record size (4 bytes, big endian)
    body[offset++] = (recordSize >> 24) & 0xff;
    body[offset++] = (recordSize >> 16) & 0xff;
    body[offset++] = (recordSize >> 8) & 0xff;
    body[offset++] = recordSize & 0xff;
    
    // Key length
    body[offset++] = localPublicKey.length;
    
    // Local public key
    body.set(localPublicKey, offset);
    offset += localPublicKey.length;
    
    // Ciphertext
    body.set(ciphertext, offset);

    const headers: Record<string, string> = {
      "Authorization": `vapid t=${jwt},k=${vapidDetails.publicKey}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "3600",
      "Urgency": "high",
    };

    console.log('[send-push] Sending to:', subscription.endpoint.slice(0, 60) + '...');

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers,
      body,
    });

    console.log('[send-push] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[send-push] Push service error:', response.status, errorText);
      return { success: false, statusCode: response.status };
    }

    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[send-push] Error:', err.message);
    return { success: false };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, status, customTitle, customBody } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push] Processing push for order ${orderId}, status: ${status}`);

    // Configurar VAPID
    const vapidPrivateKeyRaw = Deno.env.get('VAPID_PRIVATE_KEY');
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidSubject = Deno.env.get('VAPID_SUBJECT');

    if (!vapidPrivateKeyRaw || !vapidPublicKey || !vapidSubject) {
      console.error('[send-push] VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse VAPID private key from JWK format
    let privateKeyJWK: JsonWebKey;
    try {
      privateKeyJWK = JSON.parse(vapidPrivateKeyRaw);
      console.log('[send-push] VAPID private key parsed successfully');
    } catch (e) {
      console.error('[send-push] Failed to parse VAPID_PRIVATE_KEY as JSON. Make sure it is in JWK format.');
      return new Response(
        JSON.stringify({ error: 'VAPID_PRIVATE_KEY must be in JWK format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar Supabase client com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Buscar subscriptions ativas para o pedido
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('order_id', orderId)
      .gt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('[send-push] Error fetching subscriptions:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Error fetching subscriptions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[send-push] No active subscriptions found for order');
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'No subscriptions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push] Found ${subscriptions.length} subscription(s)`);

    // Pegar mensagem do status ou usar custom
    const message = statusMessages[status] || { title: 'Bruttus Delivery', body: 'Atualização do seu pedido' };
    const title = customTitle || message.title;
    const body = customBody || message.body;

    const pushPayload = {
      title,
      body,
      orderId,
      url: `/order/${orderId}`,
    };

    let sentCount = 0;
    const failedSubscriptions: string[] = [];

    // Enviar para cada subscription
    for (const sub of subscriptions) {
      const result = await sendWebPush(
        { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
        pushPayload,
        { subject: vapidSubject, privateKeyJWK, publicKey: vapidPublicKey }
      );

      if (result.success) {
        sentCount++;
        console.log(`[send-push] Successfully sent to ${sub.endpoint.slice(0, 50)}...`);
      } else if (result.statusCode === 410 || result.statusCode === 404) {
        // Subscription expirada ou inválida - remover
        console.log(`[send-push] Subscription expired/invalid, marking for removal: ${sub.id}`);
        failedSubscriptions.push(sub.id);
      }
    }

    // Remover subscriptions inválidas
    if (failedSubscriptions.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('id', failedSubscriptions);
      console.log(`[send-push] Removed ${failedSubscriptions.length} invalid subscription(s)`);
    }

    return new Response(
      JSON.stringify({ success: true, sent: sentCount, total: subscriptions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const err = error as Error;
    console.error('[send-push] Unexpected error:', err.message);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

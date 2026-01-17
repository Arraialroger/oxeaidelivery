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

// ============= RFC 8291 Helper Functions =============

function base64urlToUint8Array(base64url: string): Uint8Array {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padding = '='.repeat((4 - base64.length % 4) % 4);
  const binary = atob(base64 + padding);
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw", key.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data.buffer as ArrayBuffer));
}

// ============= RFC 8291 Web Push Encryption =============

async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const encoder = new TextEncoder();
  
  // 1. Decode subscription keys (ua_public and auth_secret)
  const ua_public = base64urlToUint8Array(p256dh);
  const auth_secret = base64urlToUint8Array(auth);

  console.log('[encrypt] ua_public length:', ua_public.length);
  console.log('[encrypt] auth_secret length:', auth_secret.length);

  // 2. Generate server key pair (as_private, as_public)
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );
  const as_public = new Uint8Array(
    await crypto.subtle.exportKey("raw", serverKeyPair.publicKey)
  );

  console.log('[encrypt] as_public length:', as_public.length);

  // 3. Import subscriber's public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw", ua_public.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false, []
  );

  // 4. Derive ECDH shared secret
  const ecdh_secret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: subscriberKey },
      serverKeyPair.privateKey,
      256
    )
  );

  console.log('[encrypt] ecdh_secret length:', ecdh_secret.length);

  // 5. Generate salt (16 random bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // ====== RFC 8291 Section 3.4 - Key Derivation ======

  // 6. PRK_key = HKDF-Extract(salt=auth_secret, IKM=ecdh_secret)
  //    = HMAC-SHA-256(auth_secret, ecdh_secret)
  const prk_key = await hmacSha256(auth_secret, ecdh_secret);

  console.log('[encrypt] prk_key length:', prk_key.length);

  // 7. key_info = "WebPush: info" || 0x00 || ua_public || as_public
  const key_info = concatUint8Arrays([
    encoder.encode("WebPush: info"),
    new Uint8Array([0x00]),
    ua_public,
    as_public
  ]);

  console.log('[encrypt] key_info length:', key_info.length);

  // 8. IKM = HKDF-Expand(PRK_key, key_info, L=32)
  //    = HMAC-SHA-256(PRK_key, key_info || 0x01)[0..31]
  const ikm = await hmacSha256(prk_key, concatUint8Arrays([key_info, new Uint8Array([0x01])]));

  console.log('[encrypt] ikm length:', ikm.length);

  // ====== RFC 8188 - Content Encryption ======

  // 9. PRK = HKDF-Extract(salt=salt, IKM=ikm)
  //    = HMAC-SHA-256(salt, ikm)
  const prk = await hmacSha256(salt, ikm);

  console.log('[encrypt] prk length:', prk.length);

  // 10. cek_info = "Content-Encoding: aes128gcm" || 0x00
  const cek_info = encoder.encode("Content-Encoding: aes128gcm\0");
  
  // 11. CEK = HKDF-Expand(PRK, cek_info, L=16)
  //     = HMAC-SHA-256(PRK, cek_info || 0x01)[0..15]
  const cek_full = await hmacSha256(prk, concatUint8Arrays([cek_info, new Uint8Array([0x01])]));
  const cek = cek_full.slice(0, 16);

  console.log('[encrypt] cek length:', cek.length);

  // 12. nonce_info = "Content-Encoding: nonce" || 0x00
  const nonce_info = encoder.encode("Content-Encoding: nonce\0");
  
  // 13. NONCE = HKDF-Expand(PRK, nonce_info, L=12)
  //     = HMAC-SHA-256(PRK, nonce_info || 0x01)[0..11]
  const nonce_full = await hmacSha256(prk, concatUint8Arrays([nonce_info, new Uint8Array([0x01])]));
  const nonce = nonce_full.slice(0, 12);

  console.log('[encrypt] nonce length:', nonce.length);

  // 14. Add padding delimiter (0x02) to payload - RFC 8188 Section 2
  const payloadBytes = encoder.encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 0x02; // padding delimiter

  console.log('[encrypt] paddedPayload length:', paddedPayload.length);

  // 15. Encrypt with AES-128-GCM
  const encryptionKey = await crypto.subtle.importKey(
    "raw", cek,
    { name: "AES-GCM" },
    false, ["encrypt"]
  );
  
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      encryptionKey,
      paddedPayload
    )
  );

  console.log('[encrypt] ciphertext length:', ciphertext.length);
  console.log('[encrypt] Encryption complete!');

  return { ciphertext, salt, localPublicKey: as_public };
}

// Envio COM payload (criptografado)
async function sendWebPushWithPayload(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; orderId: string; url: string },
  vapidDetails: { subject: string; privateKeyJWK: JsonWebKey; publicKey: string }
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    console.log('[send-push] Preparing push WITH payload...');
    
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

    console.log('[send-push] Sending WITH payload to:', subscription.endpoint.slice(0, 60) + '...');

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers,
      body,
    });

    console.log('[send-push] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[send-push] Push service error:', response.status, errorText);
      return { success: false, statusCode: response.status, error: errorText };
    }

    return { success: true, statusCode: response.status };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[send-push] Error with payload:', err.message);
    return { success: false, error: err.message };
  }
}

// Envio SEM payload (apenas notifica, event.data será null)
async function sendWebPushNoPayload(
  subscription: { endpoint: string },
  vapidDetails: { subject: string; privateKeyJWK: JsonWebKey; publicKey: string }
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    console.log('[send-push] Preparing push WITHOUT payload (diagnostic mode)...');
    
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

    const headers: Record<string, string> = {
      "Authorization": `vapid t=${jwt},k=${vapidDetails.publicKey}`,
      "Content-Length": "0",
      "TTL": "3600",
      "Urgency": "high",
    };

    console.log('[send-push] Sending WITHOUT payload to:', subscription.endpoint.slice(0, 60) + '...');

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers,
      // NO body, NO Content-Encoding
    });

    console.log('[send-push] Response status (no payload):', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[send-push] Push service error (no payload):', response.status, errorText);
      return { success: false, statusCode: response.status, error: errorText };
    }

    return { success: true, statusCode: response.status };
  } catch (error: unknown) {
    const err = error as Error;
    console.error('[send-push] Error without payload:', err.message);
    return { success: false, error: err.message };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderId, status, customTitle, customBody, noPayload } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'orderId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[send-push] ========== NEW REQUEST ==========`);
    console.log(`[send-push] Order: ${orderId}, Status: ${status}, NoPayload: ${noPayload === true}`);

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
    const message = statusMessages[status] || { title: 'Astral Gastro Bar', body: 'Atualização do seu pedido' };
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
    const results: { endpoint: string; success: boolean; statusCode?: number; error?: string; mode: string }[] = [];

    // Enviar para cada subscription
    for (const sub of subscriptions) {
      let result: { success: boolean; statusCode?: number; error?: string };
      
      if (noPayload === true) {
        // Modo diagnóstico: enviar SEM payload
        result = await sendWebPushNoPayload(
          { endpoint: sub.endpoint },
          { subject: vapidSubject, privateKeyJWK, publicKey: vapidPublicKey }
        );
        results.push({ ...result, endpoint: sub.endpoint.slice(0, 50), mode: 'noPayload' });
      } else {
        // Modo normal: enviar COM payload criptografado
        result = await sendWebPushWithPayload(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          pushPayload,
          { subject: vapidSubject, privateKeyJWK, publicKey: vapidPublicKey }
        );
        results.push({ ...result, endpoint: sub.endpoint.slice(0, 50), mode: 'withPayload' });
      }

      if (result.success) {
        sentCount++;
        console.log(`[send-push] ✅ Successfully sent to ${sub.endpoint.slice(0, 50)}...`);
      } else if (result.statusCode === 410 || result.statusCode === 404) {
        // Subscription expirada ou inválida - remover
        console.log(`[send-push] ⚠️ Subscription expired/invalid, marking for removal: ${sub.id}`);
        failedSubscriptions.push(sub.id);
      } else {
        console.log(`[send-push] ❌ Failed: ${result.error || result.statusCode}`);
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

    console.log(`[send-push] ========== COMPLETE: ${sentCount}/${subscriptions.length} sent ==========`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent: sentCount, 
        total: subscriptions.length,
        mode: noPayload ? 'noPayload' : 'withPayload',
        results 
      }),
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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'text/html; charset=utf-8',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate ECDSA P-256 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "ECDSA",
        namedCurve: "P-256",
      },
      true,
      ["sign", "verify"]
    );

    // Export private key as JWK
    const privateJWK = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
    
    // Export public key as raw bytes for base64url encoding
    const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chaves VAPID Geradas</title>
  <style>
    * { box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px; 
      margin: 40px auto; 
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; margin-bottom: 10px; }
    .subtitle { color: #666; margin-bottom: 30px; }
    .key-section { 
      background: white; 
      border-radius: 8px; 
      padding: 20px; 
      margin-bottom: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .key-section h2 { 
      margin: 0 0 10px 0; 
      color: #333;
      font-size: 16px;
    }
    .key-section p {
      color: #666;
      font-size: 14px;
      margin: 0 0 15px 0;
    }
    .key-value { 
      background: #1a1a2e; 
      color: #00ff88;
      padding: 15px; 
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 12px;
      word-break: break-all;
      white-space: pre-wrap;
      position: relative;
    }
    .copy-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #00ff88;
      color: #1a1a2e;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: bold;
      font-size: 12px;
    }
    .copy-btn:hover { background: #00cc6a; }
    .copy-btn.copied { background: #666; color: white; }
    .instructions {
      background: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      padding: 20px;
      margin-top: 30px;
    }
    .instructions h3 { margin: 0 0 15px 0; color: #856404; }
    .instructions ol { margin: 0; padding-left: 20px; color: #856404; }
    .instructions li { margin-bottom: 10px; }
    .instructions a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>🔑 Chaves VAPID Geradas com Sucesso!</h1>
  <p class="subtitle">Copie as chaves abaixo e cole no painel de secrets do Supabase.</p>

  <div class="key-section">
    <h2>1. VAPID_PRIVATE_KEY (formato JWK)</h2>
    <p>Esta é a chave privada. Cole este JSON completo no secret.</p>
    <div class="key-value" id="private-key">${JSON.stringify(privateJWK)}<button class="copy-btn" onclick="copyKey('private-key', this)">Copiar</button></div>
  </div>

  <div class="key-section">
    <h2>2. VAPID_PUBLIC_KEY (formato Base64URL)</h2>
    <p>Esta é a chave pública. Cole este valor no secret.</p>
    <div class="key-value" id="public-key">${publicKeyBase64}<button class="copy-btn" onclick="copyKey('public-key', this)">Copiar</button></div>
  </div>

  <div class="instructions">
    <h3>📋 Próximos Passos:</h3>
    <ol>
      <li>Clique em "Copiar" na <strong>VAPID_PRIVATE_KEY</strong> acima</li>
      <li>Acesse o <a href="https://supabase.com/dashboard/project/hcmiearxmhruuhphfctf/settings/functions" target="_blank">Painel de Secrets do Supabase</a></li>
      <li>Encontre o secret <strong>VAPID_PRIVATE_KEY</strong> e clique para editar</li>
      <li>Cole o valor copiado e salve</li>
      <li>Repita o processo para a <strong>VAPID_PUBLIC_KEY</strong></li>
      <li>Volte ao chat do Lovable e avise que atualizou os secrets</li>
    </ol>
  </div>

  <script>
    function copyKey(id, btn) {
      const el = document.getElementById(id);
      const text = el.textContent.replace('Copiar', '').trim();
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = 'Copiado!';
        btn.classList.add('copied');
        setTimeout(() => {
          btn.textContent = 'Copiar';
          btn.classList.remove('copied');
        }, 2000);
      });
    }
  </script>
</body>
</html>
    `;

    return new Response(html, { headers: corsHeaders });
  } catch (e: unknown) {
    const error = e as Error;
    console.error('Error generating VAPID keys:', error);
    return new Response(`Error: ${error.message}`, { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
    });
  }
});

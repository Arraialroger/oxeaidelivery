// Service Worker para receber notificações push
// Este arquivo é importado pelo SW principal do PWA

self.addEventListener('push', (event) => {
  console.log('[SW Push] ========== PUSH EVENT RECEIVED ==========');
  console.log('[SW Push] Has data:', !!event.data);
  console.log('[SW Push] Timestamp:', new Date().toISOString());
  
  // Notificar TODAS as páginas abertas (diagnóstico)
  const notifyClients = self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
    console.log('[SW Push] Found', clients.length, 'open client(s)');
    clients.forEach(client => {
      client.postMessage({ 
        type: 'PUSH_RECEIVED', 
        hasData: !!event.data,
        timestamp: Date.now(),
        rawData: event.data ? event.data.text() : null
      });
    });
  });

  // Parse payload com fallback robusto
  let data = { 
    title: 'Bruttus Delivery', 
    body: 'Atualização do seu pedido' 
  };
  
  if (event.data) {
    try {
      const textData = event.data.text();
      console.log('[SW Push] Raw text data:', textData?.slice(0, 200));
      
      data = JSON.parse(textData);
      console.log('[SW Push] Parsed JSON successfully:', data.title);
    } catch (e) {
      console.error('[SW Push] Error parsing JSON:', e.message);
      // Tentar usar como texto simples
      const textContent = event.data?.text();
      if (textContent) {
        data.body = textContent;
      }
      console.log('[SW Push] Using fallback body:', data.body);
    }
  } else {
    console.log('[SW Push] No payload - using default notification');
  }

  const options = {
    body: data.body || 'Atualização do seu pedido',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    tag: data.orderId || 'order-update',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/',
      orderId: data.orderId
    }
  };

  console.log('[SW Push] Showing notification:', data.title, '-', options.body);

  event.waitUntil(
    Promise.all([
      notifyClients,
      self.registration.showNotification(data.title || 'Bruttus Delivery', options)
    ])
  );
});

// Ao clicar na notificação, abre a página de rastreamento
self.addEventListener('notificationclick', (event) => {
  console.log('[SW Push] Notification clicked');
  event.notification.close();

  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Tenta focar em uma janela existente com a URL
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      // Se não encontrar, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Log quando o SW é ativado (útil para debug de versão)
self.addEventListener('activate', (event) => {
  console.log('[SW Push] Service Worker activated - version 2.0 (diagnostic)');
});

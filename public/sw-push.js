// Service Worker para receber notificações push
// Este arquivo é importado pelo SW principal do PWA

self.addEventListener('push', (event) => {
  console.log('[SW Push] Push event received');
  
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch (e) {
    console.error('[SW Push] Error parsing push data:', e);
    data = { title: 'Bruttus Delivery', body: event.data?.text() || 'Atualização do seu pedido' };
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

  event.waitUntil(
    self.registration.showNotification(data.title || 'Bruttus Delivery', options)
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

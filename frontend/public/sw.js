// Service Worker for RENACE Trading Lab (Pulsos y Notificaciones Leves)
const CACHE_NAME = 'renace-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Push notification receiver
self.addEventListener('push', (event) => {
  let data = { title: 'RENACE Lab', body: 'Nuevo pulso de mercado disponible', icon: '/assets/renace_symbol.svg' };
  try {
    if (event.data) {
      data = event.data.json();
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/assets/renace_symbol.svg',
    badge: '/assets/renace_symbol.svg',
    vibrate: [40, 60, 40], // Light vibration
    tag: 'renace-market-pulse',
    renotify: false, // Do not spam sounds if another pulse arrives
    data: data.url || '/',
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

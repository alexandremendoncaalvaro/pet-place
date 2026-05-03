self.addEventListener('push', (event) => {
  event.waitUntil(showLatestNotification());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
      return undefined;
    })
  );
});

async function showLatestNotification() {
  let title = 'Pet Place';
  let body = 'Você tem uma nova atualização.';
  let tag = 'caixinha-notification';

  try {
    const response = await fetch('/api/notifications/latest', { credentials: 'include' });
    if (response.ok) {
      const data = await response.json();
      if (data.notification) {
        title = data.notification.title || title;
        body = data.notification.message || body;
        tag = data.notification.aggregationKey || data.notification.id || tag;
      }
    }
  } catch (error) {
    console.warn('[push-sw] Não foi possível buscar a notificação mais recente.', error);
  }

  await self.registration.showNotification(title, {
    body,
    icon: '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    tag,
    renotify: true,
  });
}

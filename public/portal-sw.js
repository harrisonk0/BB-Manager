self.addEventListener('push', event => {
  let message = { title: 'BB Company Section', body: 'Your calendar has been updated.' };
  try { message = { ...message, ...event.data.json() }; } catch { /* Keep fallback notification. */ }
  event.waitUntil(self.registration.showNotification(message.title, { body: message.body, icon: '/bb-icon.png', badge: '/bb-icon.png', tag: 'bb-event-' + Date.now(), data: { url: '/' } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async windows => {
    const existing = windows.find(window => new URL(window.url).origin === self.location.origin);
    if (existing) { await existing.navigate('/'); return existing.focus(); }
    return clients.openWindow('/');
  }));
});

// public/firebase-messaging-sw.js
// Service Worker Firebase Messaging (compat, car importScripts)
// P0 FIX: Enabled background notifications
importScripts('/firebase-config.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// La config est fournie par firebase-config.js, non committée
firebase.initializeApp(self.__FIREBASE_CONFIG__);
const messaging = firebase.messaging();

// P0 FIX: Enabled background message handler for push notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[Firebase SW] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'SOS Expat';
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: payload.data?.tag || 'sos-notification',
    data: payload.data || {},
    // Note: vibrate retiré car bloqué par les navigateurs sans interaction utilisateur
    // La vibration sera gérée côté client après interaction
    actions: [
      { action: 'open', title: 'Ouvrir' },
      { action: 'close', title: 'Fermer' }
    ]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[Firebase SW] Notification click:', event);
  event.notification.close();

  if (event.action === 'close') return;

  // Open app or focus existing window
  const urlToOpen = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});
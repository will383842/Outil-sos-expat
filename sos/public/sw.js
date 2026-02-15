// Service Worker - DÉSACTIVÉ TEMPORAIREMENT
// Ce SW se désinstalle automatiquement pour résoudre les problèmes de 503

console.log('[SW] Désinstallation automatique en cours...');

self.addEventListener('install', (event) => {
  console.log('[SW] Installation détectée - désinstallation immédiate');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation - nettoyage de tous les caches');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          console.log('[SW] Suppression cache:', cacheName);
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      console.log('[SW] ✅ Tous les caches supprimés');
      return self.registration.unregister();
    }).then(() => {
      console.log('[SW] ✅ Service Worker désinstallé');
      return clients.matchAll();
    }).then((clients) => {
      clients.forEach((client) => {
        console.log('[SW] 🔄 Rechargement client:', client.url);
        client.navigate(client.url);
      });
    })
  );
});

// Intercepte toutes les requêtes et les laisse passer sans cache
self.addEventListener('fetch', (event) => {
  // Ne rien faire - laisser passer toutes les requêtes normalement
  return;
});

console.log('[SW] ⚠️ Service Worker en mode désactivation - aucune requête ne sera interceptée');

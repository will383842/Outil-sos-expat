// Service Worker - DÉSACTIVÉ - Version 2
// Ce SW se désinstalle et laisse TOUTES les requêtes passer

console.log('[SW] Mode désactivation - toutes requêtes passent au réseau');

self.addEventListener('install', (event) => {
  console.log('[SW] Installation - skipWaiting immédiat');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation - nettoyage et désinstallation');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('[SW] Suppression de', cacheNames.length, 'caches');
        return Promise.all(cacheNames.map((c) => caches.delete(c)));
      })
      .then(() => {
        console.log('[SW] ✅ Caches supprimés');
        return self.registration.unregister();
      })
      .then(() => {
        console.log('[SW] ✅ Désinstallé - rechargement des clients');
        return self.clients.claim();
      })
  );
});

// CRITIQUE : Laisser TOUTES les requêtes passer au réseau
self.addEventListener('fetch', (event) => {
  // Ne rien faire = laisse la requête passer normalement au réseau
  // PAS de event.respondWith() = pas d'interception
});

console.log('[SW] ✅ Prêt - aucune requête ne sera interceptée');

// Service Worker - DÉSACTIVÉ - Version 3
// Nettoyage des caches et désinstallation propre

self.addEventListener('install', (event) => {
  console.log('[SW] Installation - activation immédiate');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation - nettoyage des caches');
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        console.log('[SW] Suppression de', cacheNames.length, 'caches');
        return Promise.all(cacheNames.map((c) => caches.delete(c)));
      })
      .then(() => {
        console.log('[SW] ✅ Caches supprimés');
        // Ne PAS appeler unregister() depuis le SW lui-même
        // La désinstallation doit se faire depuis le client (navigateur)
      })
  );
});

console.log('[SW] ✅ Service Worker désactivé - pas de mise en cache');

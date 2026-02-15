# SOLUTION ERREUR 503 - Service Worker

## Problème

Le Service Worker (sw.js) intercepte toutes les requêtes et retourne 503 quand:
1. La requête réseau échoue
2. Il n'y a pas de cache pour la ressource

## Solution 1: Désactiver temporairement le Service Worker (TEST)

**Dans la console navigateur (F12):**

```javascript
// Désactiver tous les Service Workers
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.unregister());
  console.log('✅ Service Workers désactivés');
  location.reload();
});
```

Après désactivation, testez si l'inscription fonctionne.

## Solution 2: Vider le cache + recharger (CTRL+SHIFT+R)

1. Ouvrez la console (F12)
2. Onglet "Application" > "Storage"
3. Cliquez "Clear site data"
4. Fermez tous les onglets du site
5. Rouvrez le site

## Solution 3: Corriger le Service Worker

Le SW doit laisser passer les requêtes critiques même sans cache:

```javascript
// AVANT (ligne 367-381):
return new Response(JSON.stringify({ error: 'SERVICE_UNAVAILABLE' }), {
  status: 503  // ❌ BLOQUE LE SITE!
});

// APRÈS:
// Pour les requêtes critiques (HTML, API), on retourne une erreur réseau normale
// Le navigateur gérera mieux qu'un 503 du SW
throw new Error('Network request failed and no cache available');
```

## Solution 4: Ajouter logs pour diagnostiquer

Modifier sw.js ligne 350 pour logger:

```javascript
try {
  console.log('[SW] Fetching:', request.url);
  const networkResponse = await fetch(request);
  console.log('[SW] ✅ Network success:', request.url);
  return networkResponse;
} catch (error) {
  console.error('[SW] ❌ Network failed:', request.url, error);
  // ... reste du code
}
```

---

**RECOMMANDATION IMMÉDIATE:**

Testez la **Solution 1** en console pour confirmer que le problème vient bien du Service Worker.

Si l'inscription fonctionne après désactivation du SW, alors:
1. Le SW doit être corrigé
2. En attendant, désactivez-le dans le code (vite.config.ts)

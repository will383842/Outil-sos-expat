# Firebase Authentication Google - Guide de dépannage

## Problème : L'authentification Google ne fonctionne pas

### Diagnostic rapide

1. **Ouvrir la console du navigateur** (F12)
2. **Exécuter le diagnostic**:
   ```javascript
   window.diagnoseFirebaseAuth()
   ```
3. **Noter toutes les erreurs affichées**

---

## Vérifications Firebase Console

### 1. Vérifier que Google Auth est activé

1. Aller sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionner votre projet
3. Aller dans **Authentication** > **Sign-in method**
4. Vérifier que **Google** est activé (toggle ON)
5. Noter l'**ID client OAuth** et le **Secret client**

### 2. Vérifier les domaines autorisés

Dans **Authentication** > **Settings** > **Authorized domains**, vérifier que ces domaines sont ajoutés:

- `localhost` (pour le dev)
- `sos-expat.com`
- `www.sos-expat.com`
- Tout autre domaine de staging/production

**IMPORTANT**: Si votre domaine n'est pas dans cette liste, l'authentification Google NE FONCTIONNERA PAS.

### 3. Vérifier la configuration OAuth 2.0

1. Aller sur [Google Cloud Console](https://console.cloud.google.com/)
2. Sélectionner votre projet Firebase
3. Aller dans **APIs & Services** > **Credentials**
4. Trouver le **Web client OAuth 2.0**
5. Vérifier les **Authorized JavaScript origins**:
   - `https://sos-expat.com`
   - `https://www.sos-expat.com`
   - `http://localhost:5173` (dev)
6. Vérifier les **Authorized redirect URIs**:
   - `https://sos-expat.com/__/auth/handler`
   - `https://www.sos-expat.com/__/auth/handler`
   - `https://[PROJECT-ID].firebaseapp.com/__/auth/handler`
   - `http://localhost:5173/__/auth/handler` (dev)

---

## Erreurs courantes et solutions

### Erreur: "auth/unauthorized-domain"

**Cause**: Le domaine actuel n'est pas autorisé dans Firebase Console.

**Solution**:
1. Vérifier le domaine avec `window.location.hostname` dans la console
2. Ajouter ce domaine exact dans Firebase Console > Authentication > Authorized domains

### Erreur: "auth/operation-not-allowed"

**Cause**: Google Auth n'est pas activé dans Firebase Console.

**Solution**:
1. Activer Google dans Firebase Console > Authentication > Sign-in method

### Erreur: "auth/popup-blocked"

**Cause**: Le navigateur bloque les popups.

**Solution**:
1. Le code fait automatiquement un fallback vers redirect
2. Vérifier que les redirects fonctionnent
3. Si ça ne fonctionne toujours pas, vérifier les domaines autorisés

### Popup s'ouvre puis se ferme immédiatement

**Cause**: CSP bloque les requêtes vers Google.

**Solution**:
1. Vérifier que ces domaines sont dans la CSP:
   - `https://accounts.google.com`
   - `https://apis.google.com`
   - `https://www.googleapis.com`
   - `https://securetoken.googleapis.com`
   - `https://identitytoolkit.googleapis.com`
2. Vérifier les headers CSP dans `sos/public/_headers` et `sos/.htaccess`

### Erreur: "Failed to fetch" ou erreur réseau

**Cause**: Bloqueur de publicités, extension de confidentialité, ou antivirus.

**Solution**:
1. Tester en navigation privée
2. Désactiver les extensions
3. Tester sur un autre réseau
4. Vérifier le pare-feu/antivirus

### iOS Safari: Ne fonctionne pas

**Cause**: ITP (Intelligent Tracking Prevention) ou restrictions de cookies tiers.

**Solution**:
1. Le code utilise déjà des workarounds pour iOS
2. Vérifier que le domaine Firebase (`firebaseapp.com`) n'est pas bloqué
3. S'assurer que les cookies tiers sont activés dans Safari > Réglages

---

## Test manuel

### Test popup (Desktop)

```javascript
import { auth } from './src/config/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

signInWithPopup(auth, provider)
  .then(result => {
    console.log('✅ Succès!', result.user);
  })
  .catch(error => {
    console.error('❌ Erreur:', error.code, error.message);
  });
```

### Test redirect (Mobile)

```javascript
import { auth } from './src/config/firebase';
import { GoogleAuthProvider, signInWithRedirect } from 'firebase/auth';

const provider = new GoogleAuthProvider();
provider.addScope('email');
provider.addScope('profile');

signInWithRedirect(auth, provider);
// Après redirect, vérifier le résultat avec getRedirectResult
```

---

## Logs de débogage

Les logs suivants devraient apparaître dans la console:

```
🔵 GOOGLE LOGIN: Début (v10 - production ready)
🔵 GOOGLE LOGIN: forceRedirect=false (iOS/WebView/Samsung)
🔵 GOOGLE LOGIN: setPersistence...
🔵 GOOGLE LOGIN: Création provider...
🔵 GOOGLE LOGIN: Tentative POPUP (desktop)...
✅ GOOGLE POPUP: Succès! UID: abc123...
```

Si vous voyez une erreur, noter le code d'erreur exact (ex: `auth/unauthorized-domain`).

---

## Checklist de vérification

- [ ] Google Auth activé dans Firebase Console
- [ ] Domaine ajouté dans Authorized domains (Firebase)
- [ ] JavaScript origins ajoutées dans OAuth 2.0 (Google Cloud Console)
- [ ] Redirect URIs ajoutées dans OAuth 2.0
- [ ] CSP autorise `accounts.google.com`, `apis.google.com`, etc.
- [ ] Cookies et localStorage non bloqués
- [ ] Popups autorisées (ou fallback redirect fonctionne)
- [ ] Pas de bloqueur de pub/extension qui interfère
- [ ] Variables d'environnement Firebase correctes (`.env`)

---

## Contact

Si le problème persiste après toutes ces vérifications:
1. Copier les logs de `window.diagnoseFirebaseAuth()`
2. Copier les erreurs de la console
3. Noter le navigateur et l'OS
4. Contacter le support avec ces informations

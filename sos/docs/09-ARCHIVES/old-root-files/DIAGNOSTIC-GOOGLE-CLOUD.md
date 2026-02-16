# DIAGNOSTIC GOOGLE CLOUD / CLOUD RUN

## Objectif
Vérifier si les problèmes d'inscription viennent de Google Cloud, Cloud Run, quotas CPU, régions, ou cold starts.

---

## 🔍 ÉTAPE 1: Vérifier les logs Cloud Functions

### Console Google Cloud

1. **Ouvrir Google Cloud Console**: https://console.cloud.google.com/
2. **Sélectionner projet**: `sos-urgently-ac307`
3. **Aller dans Cloud Functions**: Navigation > Cloud Functions
4. **Filtrer par région**:
   - europe-west1 (default)
   - europe-west2 (affiliate: chatter, influencer, blogger, groupAdmin)
   - europe-west3 (payment + triggers/call/telegram)

### Logs à chercher

```bash
# Dans Cloud Logging (https://console.cloud.google.com/logs)

# Rechercher les erreurs registerLawyer
resource.type="cloud_function"
resource.labels.function_name="registerLawyer"
severity>=ERROR

# Rechercher les erreurs registerClient
resource.type="cloud_function"
resource.labels.function_name="registerClient"
severity>=ERROR

# Rechercher les erreurs registerExpat
resource.type="cloud_function"
resource.labels.function_name="registerExpat"
severity>=ERROR

# Rechercher les erreurs AuthContext (createUser)
textPayload=~"REGISTER.*ERROR|permission-denied|auth/.*"

# Rechercher les erreurs 503
textPayload=~"503|Service Unavailable"

# Rechercher les cold starts
textPayload=~"Function execution started|Cold start"

# Rechercher les timeouts
severity>=ERROR
textPayload=~"timeout|deadline exceeded|DEADLINE_EXCEEDED"
```

### Métriques à vérifier

Dans **Cloud Functions > Metrics**:

1. **Invocations** - Nombre d'appels (doit être > 0)
2. **Execution times** - Temps d'exécution (doit être < 60s)
3. **Errors** - Taux d'erreur (doit être proche de 0%)
4. **Memory utilization** - Utilisation mémoire
5. **CPU utilization** - Utilisation CPU

**⚠️ ALERTES:**
- Execution time > 10s → Cold start probable
- Error rate > 5% → Problème critique
- Memory > 90% → Augmenter la mémoire
- CPU > 90% → Augmenter le CPU ou réduire concurrency

---

## 🔍 ÉTAPE 2: Vérifier les quotas CPU

### Problème identifié dans commit 3b268560

**Contexte**: "consolidate 30 Cloud Run services into 5 (-25 services)"

**Raison**: CPU quota exhaustion (europe-west1)

**Impact**: Les fonctions dans europe-west1 peuvent être throttled ou échouer

### Vérifier les quotas

1. **IAM & Admin > Quotas**: https://console.cloud.google.com/iam-admin/quotas
2. **Filtrer**:
   - Service: "Cloud Run API"
   - Location: "europe-west1", "europe-west2", "europe-west3"
   - Metric: "CPU allocation per region"

**Quotas normaux:**
- europe-west1: 300-500 vCPUs (UTILISÉ!)
- europe-west2: 100-300 vCPUs (OK)
- europe-west3: 100-300 vCPUs (OK)

**⚠️ SI QUOTA DÉPASSÉ:**
```
Error: Quota 'CPU allocation' exceeded
  → Les nouvelles fonctions ne peuvent pas démarrer
  → Les inscriptions échouent silencieusement
```

**SOLUTION:**
1. Demander augmentation quota (24-48h délai)
2. OU migrer fonctions vers europe-west2/west3

---

## 🔍 ÉTAPE 3: Vérifier les cold starts

### Pourquoi c'est important

**Cold start** = Première invocation d'une fonction après inactivité
- Temps de démarrage: 2-10 secondes
- Si user attend > 10s → Timeout frontend
- Si timeout frontend → Retry → Double inscription possible

### Logs cold start

```bash
# Chercher "Function execution started" dans Cloud Logging
resource.type="cloud_function"
resource.labels.function_name=~"register.*"
textPayload=~"Function execution started"

# Calculer la fréquence des cold starts
# Si > 50% des invocations = cold start → Problème!
```

### Solutions cold start

**Option 1: Min instances** (⚠️ COÛTEUX - $7-15/mois par fonction)

```typescript
// firebase/functions/src/index.ts
export const registerClient = onCall({
  region: "europe-west1",
  memory: "512MiB",
  timeoutSeconds: 60,
  minInstances: 1,  // ⬅️ GARDE 1 INSTANCE CHAUDE
  maxInstances: 10,
  cors: true
}, async (request) => { ... });
```

**Option 2: Cloud Scheduler ping** (gratuit)

```yaml
# Ping toutes les 5 minutes pour garder les fonctions chaudes
- url: https://europe-west1-sos-urgently-ac307.cloudfunctions.net/registerClient
  schedule: "*/5 * * * *"
  http_method: OPTIONS
```

**Option 3: Accepter les cold starts** (recommandé)
- Frontend: augmenter timeout à 30s
- UX: afficher "Création du compte..." pendant cold start

---

## 🔍 ÉTAPE 4: Vérifier les régions et routing

### Mapping fonctions → régions

D'après `firebase/functions/src/index.ts` et commit 52a687ca:

| Fonction | Région | Raison |
|----------|--------|--------|
| registerClient | europe-west1 | Default |
| registerLawyer | europe-west1 | Default |
| registerExpat | europe-west1 | Default |
| registerChatter | **europe-west2** | Migrated (quota CPU west1) |
| registerInfluencer | **europe-west2** | Migrated (quota CPU west1) |
| registerBlogger | **europe-west2** | Migrated (quota CPU west1) |
| registerGroupAdmin | **europe-west2** | Migrated (quota CPU west1) |
| createStripeAccount | **europe-west3** | Separate quota payment |
| twilioWebhooks | **europe-west3** | Twilio + Cloud Tasks |

### Vérifier configuration frontend

**Fichier**: `sos/src/config/firebase.ts`

```typescript
// Ligne 470-488
const REGION = "europe-west1";              // Client, Lawyer, Expat
const PAYMENT_REGION = "europe-west3";      // Stripe
const TRIGGERS_REGION = "europe-west3";     // Twilio, Telegram
const AFFILIATE_REGION = "europe-west2";    // Chatter, Influencer, Blogger, GroupAdmin

export const functions = getFunctions(app, REGION);
export const functionsPayment = getFunctions(app, PAYMENT_REGION);
export const functionsWest3 = getFunctions(app, TRIGGERS_REGION);
export const functionsWest2 = getFunctions(app, AFFILIATE_REGION);
```

**⚠️ VÉRIFIER:**
- Les appels frontend utilisent-ils la bonne instance `functions` / `functionsWest2`?
- Exemple: `registerChatter` DOIT utiliser `functionsWest2`, PAS `functions`

### Tester manuellement les régions

```javascript
// Console navigateur (F12)
const { httpsCallable } = await import('firebase/functions');
const { functions, functionsWest2 } = await import('./config/firebase');

// Test region west1 (Client, Lawyer, Expat)
const registerClient = httpsCallable(functions, 'registerClient');
await registerClient({ email: 'test@test.com', ... });

// Test region west2 (Chatter, Influencer, Blogger, GroupAdmin)
const registerChatter = httpsCallable(functionsWest2, 'registerChatter');
await registerChatter({ email: 'test@test.com', ... });
```

---

## 🔍 ÉTAPE 5: Vérifier Firestore sync (request.auth)

### Problème connu

**Symptôme**: `permission-denied` lors de la création du document user

**Cause**: Le token Firebase Auth n'est pas encore synchronisé avec Firestore Security Rules

**Délai normal**: 0.5-2 secondes (dépend de la connexion réseau)

**Fix appliqué**: Augmenté délai de 1s → 2s dans AuthContext.tsx (ligne 2088)

### Vérifier si le fix fonctionne

**Console navigateur (F12):**

```javascript
// Chercher ces logs:
[DEBUG] ⏱️ REGISTER: Waiting 2s for Firestore sync
[DEBUG] 📝 REGISTER: Creating user document in Firestore
[DEBUG] ✅ REGISTER: User document created successfully

// OU erreur:
[DEBUG] ❌ REGISTER: Document creation failed, rolling back auth user
```

**Si erreur persiste:**
1. Augmenter délai à 3s ou 4s
2. Ajouter retry logic (max 3 tentatives)
3. Vérifier Firestore Security Rules

### Firestore Security Rules

```javascript
// sos/firestore.rules
match /users/{userId} {
  // CRITIQUE: request.auth DOIT être non-null
  allow create: if request.auth != null
                && request.auth.uid == userId;
}
```

**Tester les rules:**

```bash
# Firebase Console > Firestore > Rules
# Cliquer "Rules Playground"
# Tester: write users/<uid> avec auth.uid = <uid>
# Doit retourner: ✅ Allow
```

---

## 🔍 ÉTAPE 6: Vérifier Service Worker (503)

### Problème identifié

**Fichier**: `sos/public/sw.js` ligne 375 et 617

**Symptôme**: Toutes les requêtes retournent 503 Service Unavailable

**Cause**: Service Worker intercepte les requêtes, si réseau échoue ET pas de cache → 503

### Désactiver Service Worker (TEST)

**Console navigateur (F12):**

```javascript
// Désactiver tous les Service Workers
navigator.serviceWorker.getRegistrations().then(regs => {
  regs.forEach(r => r.unregister());
  console.log('✅ SW désactivés');
  location.reload();
});
```

**Après reload, tester inscription:**
- ✅ Si ça fonctionne → Le problème est le Service Worker
- ❌ Si ça ne fonctionne pas → Le problème est ailleurs (backend, auth, réseau)

### Logs Service Worker

**Console navigateur (F12):**

```javascript
// Chercher ces logs:
[SW] Fetching: <URL>
[SW] ✅ Network success: <URL>

// OU erreur:
[SW] ❌ Network failed: <URL> <error>
  → Retourne 503 si pas de cache
```

### Fix Service Worker

**Option 1: Laisser passer les erreurs réseau** (RECOMMANDÉ)

```javascript
// sw.js ligne 367-381
// AVANT:
return new Response(JSON.stringify({ error: 'SERVICE_UNAVAILABLE' }), {
  status: 503  // ❌ BLOQUE LE SITE
});

// APRÈS:
// Pour les requêtes critiques (HTML, API), on laisse l'erreur réseau se propager
// Le navigateur gérera mieux qu'un 503 du SW
throw new Error('Network request failed and no cache available');
```

**Option 2: Désactiver temporairement le SW**

```typescript
// vite.config.ts
VitePWA({
  injectRegister: null,  // ⬅️ DÉSACTIVE LE SERVICE WORKER
  registerType: 'none'
})
```

---

## 🔍 ÉTAPE 7: Monitoring en temps réel

### Cloud Functions Logs Stream

```bash
# Terminal
cd sos/firebase/functions
firebase functions:log --only registerClient,registerLawyer,registerExpat

# Affiche les logs en temps réel pendant les tests d'inscription
```

### Frontend Console Logs

**Console navigateur (F12) - Filtrer par pattern:**

```
[LawyerRegisterForm] 🔵 DÉBUT
[LawyerRegisterForm] 🤖 ANTI-BOT
[LawyerRegisterForm] 📤 APPEL BACKEND
[LawyerRegisterForm] ✅ BACKEND OK
[LawyerRegisterForm] ❌ ERREUR

[DEBUG] REGISTER:
[SW]
```

### Network Tab

**Chrome DevTools > Network:**

1. Filter: `Fetch/XHR`
2. Chercher: `registerLawyer`, `registerClient`, etc.
3. Vérifier:
   - **Status**: doit être 200 (pas 503, 500, 403)
   - **Time**: doit être < 10s (si > 10s = cold start)
   - **Size**: doit être > 0 (si 0 = requête bloquée)
   - **Initiator**: doit être le formulaire (pas le SW)

**⚠️ SI STATUS 503:**
- C'est le Service Worker qui bloque!
- Solution: désactiver le SW (voir ÉTAPE 6)

**⚠️ SI STATUS 500:**
- Erreur backend (Cloud Function)
- Solution: vérifier logs Cloud Functions (ÉTAPE 1)

**⚠️ SI STATUS 403:**
- Firestore permission-denied
- Solution: vérifier délai auth sync (ÉTAPE 5)

---

## 📊 RÉSUMÉ: Checklist diagnostic

### Ordre de priorité

1. ✅ **Service Worker 503** → Désactiver SW et retester
2. ✅ **Cloud Functions logs** → Chercher erreurs registerClient/Lawyer/Expat
3. ✅ **Firestore auth sync** → Vérifier délai 2s fonctionne
4. ✅ **CPU quotas** → Vérifier quota europe-west1 pas dépassé
5. ✅ **Cold starts** → Accepter ou ajouter minInstances
6. ✅ **Régions** → Vérifier mapping fonctions → instances
7. ✅ **Frontend logs** → Suivre flow console navigateur

### Actions immédiates

```bash
# 1. Désactiver Service Worker (console navigateur)
navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()));
location.reload();

# 2. Tester inscription Client/Lawyer/Expat

# 3. Vérifier logs Cloud Functions
firebase functions:log --only registerClient

# 4. Si erreur persiste, vérifier quota CPU
# Google Cloud Console > IAM & Admin > Quotas
# Filtrer: Cloud Run API > europe-west1 > CPU allocation
```

---

## 🆘 Si RIEN ne fonctionne

### Rollback d'urgence

```bash
# Revenir au commit précédent la consolidation Cloud Run
git revert 3b268560

# Redéployer
cd sos/firebase/functions
rm -rf lib && npm run build
firebase deploy --only functions

# Attendre 5-10 minutes pour propagation
```

### Contacter Support Google Cloud

1. **Console > Support**: https://console.cloud.google.com/support
2. **Créer un ticket**: "Cloud Functions registration failing after consolidation"
3. **Joindre**:
   - Logs Cloud Functions (erreurs registerClient)
   - Quota CPU utilisé (europe-west1)
   - Commits récents (3b268560, 52a687ca)
4. **Priorité**: P1 (Production down)
5. **Délai réponse**: 1-4 heures


# RAPPORT DE COMPARAISON APPROFONDIE
## Système de Paiement et Appels Twilio
### Commit Initial (16473b0) vs État Actuel

---

## RÉSUMÉ EXÉCUTIF

**PROBLÈME PRINCIPAL IDENTIFIÉ**: L'architecture initiale était conçue pour que les appels soient déclenchés par le webhook Stripe sur `payment_intent.succeeded`. Cependant, avec `capture_method: manual`, cet événement ne se déclenche JAMAIS jusqu'à la capture finale (après l'appel).

**CONSÉQUENCE**: Les appels Twilio ne sont jamais planifiés car le système attend un événement qui n'arrive pas.

---

## 1. FLUX DE PAIEMENT - COMPARAISON

### 1.1 Architecture Initiale (16473b0)

```
Client Paie → createPaymentIntent (capture_method: manual)
    ↓
Stripe Webhook: payment_intent.requires_capture (NON GÉRÉ!)
    ↓
❌ Le système attend payment_intent.succeeded (qui n'arrive jamais)
    ↓
❌ Aucun appel planifié
```

### 1.2 Architecture Actuelle (après corrections)

```
Client Paie → createPaymentIntent (capture_method: manual)
    ↓
createAndScheduleCallFunction → createCallSession()
    ↓
✅ NOUVEAU: scheduleCallTask() appelé DIRECTEMENT
    ↓
Cloud Tasks → executeCallTask (4 minutes plus tard)
    ↓
Twilio déclenche l'appel
```

---

## 2. FICHIERS MODIFIÉS - ANALYSE DÉTAILLÉE

### 2.1 `createAndScheduleCallFunction.ts`

**INITIAL (16473b0)**:
```typescript
// PAS d'import de scheduleCallTask
// PAS de secret TASKS_AUTH_SECRET

export const createAndScheduleCallHTTPS = onCall({
  // ...
  // Pas de planification directe - attendait webhook Stripe
});
```

**ACTUEL**:
```typescript
// P0 FIX: Import scheduleCallTask pour planifier l'appel directement
import { scheduleCallTask } from './lib/tasks';

const TASKS_AUTH_SECRET = defineSecret('TASKS_AUTH_SECRET');

// Après création de session:
const CALL_DELAY_SECONDS = 240; // 4 minutes
const taskId = await scheduleCallTask(callSession.id, CALL_DELAY_SECONDS);
```

**IMPACT**: L'appel est maintenant planifié immédiatement après la création de session, sans attendre de webhook.

### 2.2 `index.ts` - stripeWebhook

**INITIAL (16473b0)**:
```typescript
// Webhook commenté ou désactivé
// export const stripeWebhook = onRequest(...)
```

**ACTUEL**:
- Webhook actif mais avec problème potentiel d'accès aux secrets
- Handler pour `payment_intent.succeeded` présent mais **ne sera jamais appelé** avec `capture_method: manual` avant capture

**ÉVÉNEMENTS STRIPE AVEC `capture_method: manual`**:
| Événement | Quand il se déclenche | Géré dans le code? |
|-----------|----------------------|-------------------|
| `payment_intent.created` | Création du PI | ✅ Oui (log) |
| `payment_intent.requires_capture` | **IMMÉDIATEMENT après paiement client** | ❌ NON GÉRÉ! |
| `payment_intent.succeeded` | **SEULEMENT après capture** | ✅ Oui |

### 2.3 `callScheduler.ts`

**INITIAL ET ACTUEL**: Identiques
- La fonction `createCallSession()` ne fait PAS de planification
- Le commentaire indique: `schedulingMethod: 'webhook_only'`
- La planification est déléguée au webhook Stripe (problème!)

### 2.4 `lib/tasks.ts` (Cloud Tasks)

**INITIAL ET ACTUEL**: Identiques
- Fonction `scheduleCallTask()` bien implémentée
- Utilise `TASKS_AUTH_SECRET.value()` correctement
- URL de callback: `https://europe-west1-{project}.cloudfunctions.net/executeCallTask`

---

## 3. RÈGLES FIRESTORE - CHANGEMENTS CRITIQUES

### 3.1 Collection `call_sessions`

**INITIAL**:
```javascript
match /call_sessions/{sessionId} {
  allow read: if isAuthenticated() &&
              (resource.data.clientId == request.auth.uid ||
               resource.data.providerId == request.auth.uid ||
               isAdmin() || isDev());
  allow create: if isAuthenticated();
  allow update: if isAuthenticated();
}
```

**ACTUEL**:
```javascript
match /call_sessions/{sessionId} {
  // CHANGEMENT: clientId et providerId sont dans metadata
  allow read: if isAuthenticated() &&
              (resource.data.metadata.clientId == request.auth.uid ||
               resource.data.metadata.providerId == request.auth.uid ||
               // Fallback pour ancien format
               (resource.data.clientId != null && resource.data.clientId == request.auth.uid) ||
               (resource.data.providerId != null && resource.data.providerId == request.auth.uid) ||
               isAdmin() || isDev());
  allow create: if isAuthenticated() &&
                (request.resource.data.metadata.clientId == request.auth.uid ||
                 request.resource.data.clientId == request.auth.uid);
  allow update: if isAuthenticated() &&
                (resource.data.metadata.clientId == request.auth.uid ||
                 resource.data.metadata.providerId == request.auth.uid ||
                 resource.data.clientId == request.auth.uid ||
                 resource.data.providerId == request.auth.uid ||
                 isAdmin() || isDev());
}
```

**PROBLÈME POTENTIEL**: Si le document `call_sessions` a `clientId` dans `metadata` mais le listener frontend essaie d'accéder sans cette structure, la permission échouera.

### 3.2 Collection `invoice_records` (NOUVELLE)

**INITIAL**: N'existait pas!

**ACTUEL**:
```javascript
match /invoice_records/{invoiceId} {
  allow read: if isAuthenticated() &&
              (resource.data.clientId == request.auth.uid ||
               resource.data.providerId == request.auth.uid ||
               isAdmin() || isDev());
  allow create: if isAuthenticated() &&
                request.resource.data.clientId == request.auth.uid;
  allow update, delete: if isAdmin() || isDev();
}
```

### 3.3 Collection `payments`

**INITIAL**:
```javascript
match /payments/{paymentId} {
  allow read: if isAuthenticated() &&
              (resource.data.userId == request.auth.uid || isAdmin());
  allow create: if isAuthenticated();
  allow update: if isAdmin() || isDev();
}
```

**ACTUEL** (PLUS RESTRICTIF):
```javascript
match /payments/{paymentId} {
  allow read: if isAuthenticated() &&
              (resource.data.userId == request.auth.uid ||
               resource.data.clientId == request.auth.uid ||
               resource.data.providerId == request.auth.uid ||
               isAdmin() || isDev());
  allow create: if isAuthenticated() &&
                (request.resource.data.userId == request.auth.uid ||
                 request.resource.data.clientId == request.auth.uid) &&
                // Validation stricte du montant
                request.resource.data.amount >= 50 &&
                request.resource.data.amount <= 200000 &&
                request.resource.data.status in ['pending', 'requires_payment_method', 'requires_capture'];
  // CHANGEMENT: Les updates sont maintenant interdits côté client
  allow update: if false;
}
```

---

## 4. ERREURS DE PERMISSIONS FIRESTORE

### 4.1 Cause Probable des Erreurs

L'erreur `Missing or insufficient permissions` sur le snapshot listener provient de:

1. **Structure de données incompatible**:
   - Les règles attendent `resource.data.metadata.clientId`
   - Mais le document peut avoir `clientId` au niveau racine

2. **Query sans filtre**:
   ```typescript
   // PaymentSuccess.tsx ligne 364-366
   const ref = doc(db, "call_sessions", callId);
   const unsub = onSnapshot(ref, (snap) => {
   ```
   - Le listener fait un `getDoc` direct sans filtre
   - Si le document n'a pas les bons champs accessibles, permission denied

### 4.2 Solution Requise

Le document `call_sessions` DOIT avoir:
```json
{
  "metadata": {
    "clientId": "uid_du_client",
    "providerId": "uid_du_provider"
  },
  // OU (fallback)
  "clientId": "uid_du_client",
  "providerId": "uid_du_provider"
}
```

---

## 5. PROBLÈMES IDENTIFIÉS ET SOLUTIONS

### PROBLÈME 1: Appels Twilio jamais déclenchés

| Aspect | Détail |
|--------|--------|
| **Cause** | `capture_method: manual` + système qui attend `payment_intent.succeeded` |
| **Solution appliquée** | Planification directe via `scheduleCallTask()` dans `createAndScheduleCallFunction.ts` |
| **Status** | ✅ Corrigé dans le code (commit ec6c730) |

### PROBLÈME 2: Secrets Stripe non accessibles

| Aspect | Détail |
|--------|--------|
| **Cause** | Utilisation de `process.env.STRIPE_SECRET_KEY_LIVE` au lieu de `.value()` |
| **Solution appliquée** | Changé vers `STRIPE_SECRET_KEY_LIVE.value()` |
| **Status** | ✅ Corrigé (commit 910706d) |

### PROBLÈME 3: Permissions Firestore `call_sessions`

| Aspect | Détail |
|--------|--------|
| **Cause** | Les règles attendent `metadata.clientId` mais le document peut ne pas avoir cette structure |
| **Solution requise** | Vérifier que `TwilioCallManager.createCallSession()` crée le document avec la bonne structure |
| **Status** | ⚠️ À VÉRIFIER |

### PROBLÈME 4: Permissions Firestore `invoice_records`

| Aspect | Détail |
|--------|--------|
| **Cause** | Query sans `clientId` dans le filtre |
| **Solution appliquée** | Ajout de `where('clientId', '==', currentUserId)` dans PaymentSuccess.tsx |
| **Status** | ✅ Corrigé |

### PROBLÈME 5: Permissions Firestore `payments`

| Aspect | Détail |
|--------|--------|
| **Cause** | `allow update: if false` empêche toute mise à jour côté client |
| **Impact** | Les Cloud Functions doivent utiliser Admin SDK pour les updates |
| **Status** | ✅ Intentionnel (sécurité) |

---

## 6. VÉRIFICATIONS À EFFECTUER

### 6.1 Vérifier la structure de `call_sessions` dans Firestore

```bash
# Dans la console Firebase, vérifier un document call_sessions récent
# Il DOIT avoir cette structure:
{
  "id": "call_session_xxx",
  "status": "pending",
  "metadata": {
    "clientId": "xxx",  // ← OBLIGATOIRE
    "providerId": "yyy" // ← OBLIGATOIRE
  }
  // OU
  "clientId": "xxx",    // ← Fallback
  "providerId": "yyy"   // ← Fallback
}
```

### 6.2 Vérifier les logs Cloud Functions

```bash
firebase functions:log --only createAndScheduleCall
```

Chercher:
- `✅ Cloud Task créée: call-xxx-yyy`
- Ou des erreurs de scheduling

### 6.3 Vérifier Cloud Tasks Queue

```bash
gcloud tasks queues describe call-scheduler-queue --location=europe-west1
```

### 6.4 Vérifier les logs Twilio

Dans la console Twilio, vérifier:
- Les appels sortants récents
- Les erreurs éventuelles

---

## 7. ACTIONS CORRECTIVES RECOMMANDÉES

### Action 1: Déployer les dernières modifications
```bash
cd sos/firebase/functions
firebase deploy --only functions
```

### Action 2: Vérifier/Corriger `TwilioCallManager.createCallSession()`

Le document créé doit avoir `clientId` accessible (soit au niveau racine, soit dans metadata).

### Action 3: Déployer les règles Firestore
```bash
firebase deploy --only firestore:rules
```

### Action 4: Tester le flux complet

1. Faire un paiement test
2. Vérifier les logs `createAndScheduleCall`
3. Vérifier qu'une Cloud Task est créée
4. Attendre 4 minutes
5. Vérifier que l'appel Twilio est déclenché

---

## 8. CONCLUSION

Le système initial avait une architecture qui dépendait d'un événement Stripe (`payment_intent.succeeded`) qui ne se déclenche jamais avant la capture avec `capture_method: manual`.

Les corrections apportées (planification directe via Cloud Tasks) devraient résoudre le problème principal, mais il reste des problèmes de permissions Firestore à investiguer, particulièrement autour de la structure des documents `call_sessions`.

**PROCHAINE ÉTAPE**: Déployer les corrections et tester le flux complet.

---

## 9. CORRECTIONS APPLIQUÉES (Aujourd'hui)

### 9.1 TwilioCallManager.ts - Ajout de clientId/providerId au niveau racine

**Fichier**: `sos/firebase/functions/src/TwilioCallManager.ts`

**Problème**: Les documents `call_sessions` n'avaient `clientId` et `providerId` que dans `metadata`, ce qui causait des erreurs de permissions Firestore car les règles vérifiaient aussi au niveau racine.

**Solution**: Ajout de `clientId` et `providerId` au niveau racine du document:

```typescript
const callSession: CallSessionState = {
  id: params.sessionId,
  status: "pending",
  // P0 FIX: Ajouter clientId et providerId au niveau racine pour compatibilité Firestore rules
  clientId: params.clientId,
  providerId: params.providerId,
  // ...
};
```

### 9.2 Mise à jour de l'interface CallSessionState

```typescript
export interface CallSessionState {
  id: string;
  // P0 FIX: Ajouter clientId et providerId au niveau racine pour Firestore rules
  clientId?: string;
  providerId?: string;
  status: ...;
  // ...
}
```

---

## 10. DÉPLOIEMENT REQUIS

```bash
# 1. Compiler les fonctions
cd sos/firebase/functions
npm run build

# 2. Déployer les fonctions
firebase deploy --only functions

# 3. Les règles Firestore sont déjà correctes
```

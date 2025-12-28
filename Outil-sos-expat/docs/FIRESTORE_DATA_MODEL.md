# Modele de Donnees Firestore - SOS-Expat

## Vue d'ensemble Architecture

```
Firebase Auth (Users)
        |
        v
+------------------+     +------------------+     +------------------+
|     users/       |---->|   providers/     |---->|   bookings/      |
|  (compte auth)   |     | (profil metier)  |     |   (dossiers)     |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        v                        |                        v
+------------------+             |               +------------------+
|  subscriptions/  |             +-------------->|  conversations/  |
|  (abonnements)   |                             |   /messages      |
+------------------+                             +------------------+
```

---

## 1. Collection: `users`

Document ID: `{Firebase Auth UID}`

### Structure du document

```typescript
interface UserDocument {
  // === IDENTIFICATION ===
  email: string;                          // Email (indexe, unique)
  displayName: string;                    // Nom affiche
  photoURL?: string;                      // Photo profil (Firebase Auth)

  // === ROLE & PERMISSIONS ===
  role: 'user' | 'provider' | 'admin' | 'superadmin';
  permissions?: string[];                 // Permissions granulaires optionnelles

  // === ABONNEMENT (denormalise pour perf) ===
  subscriptionStatus: 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired' | null;
  subscriptionExpiresAt?: Timestamp;      // Date expiration
  subscriptionId?: string;                // Ref vers subscriptions/{id}
  planName?: string;                      // Nom du plan (denormalise)

  // === LIEN PROVIDERS (multi-provider) ===
  linkedProviderIds: string[];            // IDs des providers lies
  activeProviderId?: string;              // Provider actif (pour comptes multi)

  // === PREFERENCES ===
  language: 'fr' | 'en' | 'es' | 'pt';
  timezone?: string;
  notifications?: {
    email: boolean;
    push: boolean;
    newBooking: boolean;
    urgentOnly: boolean;
  };

  // === TRACKING ===
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  loginCount?: number;

  // === FLAGS ===
  isActive: boolean;                      // Compte actif
  isBlocked?: boolean;                    // Compte bloque (admin)
  blockReason?: string;
}
```

### Index recommandes

```json
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "role", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "users",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "subscriptionStatus", "order": "ASCENDING" },
    { "fieldPath": "subscriptionExpiresAt", "order": "ASCENDING" }
  ]
}
```

---

## 2. Collection: `providers`

Document ID: Auto-genere ou ID externe (ex: `prov_abc123`)

### Structure du document

```typescript
interface ProviderDocument {
  // === IDENTIFICATION ===
  email: string;                          // Email unique (indexe)
  name: string;                           // Nom complet
  type: 'lawyer' | 'expat';               // Type prestataire

  // === PROFIL PROFESSIONNEL ===
  phone?: string;
  whatsapp?: string;
  company?: string;                       // Cabinet/Societe
  bio?: string;                           // Description
  photoURL?: string;

  // === LOCALISATION ===
  country: string;                        // Pays principal
  countries?: string[];                   // Pays couverts (multi)
  city?: string;
  address?: string;

  // === COMPETENCES ===
  languages: string[];                    // Langues parlees ['fr', 'en', 'es']
  specialties?: string[];                 // Specialites ['visa', 'immobilier', 'fiscal']
  barNumber?: string;                     // Numero barreau (avocats)
  certifications?: string[];

  // === TARIFICATION ===
  hourlyRate?: number;
  currency?: string;

  // === QUOTAS IA ===
  aiQuota: number;                        // Quota mensuel
  aiCallsUsed: number;                    // Appels utilises ce mois
  aiCallsUsedPreviousMonth?: number;      // Historique mois precedent
  aiQuotaResetAt?: Timestamp;             // Date reset

  // === STATUT ===
  active: boolean;                        // Provider actif
  verified: boolean;                      // Verifie par admin
  verifiedAt?: Timestamp;
  verifiedBy?: string;                    // UID admin

  // === STATS (denormalisees) ===
  stats?: {
    totalBookings: number;
    completedBookings: number;
    avgRating?: number;
    responseTimeAvg?: number;             // Minutes
  };

  // === SYNC EXTERNE ===
  externalId?: string;                    // ID sos-expat.com
  source: 'manual' | 'sync' | 'import';

  // === TRACKING ===
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Index recommandes

```json
{
  "collectionGroup": "providers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "active", "order": "ASCENDING" },
    { "fieldPath": "type", "order": "ASCENDING" },
    { "fieldPath": "name", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "providers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "active", "order": "ASCENDING" },
    { "fieldPath": "country", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "providers",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "email", "order": "ASCENDING" }
  ]
}
```

---

## 3. Collection: `bookings`

Document ID: Auto-genere

### Structure du document

```typescript
interface BookingDocument {
  // === CLIENT ===
  clientFirstName: string;
  clientLastName: string;
  clientName: string;                     // Concatene (pour affichage)
  clientEmail?: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  clientCurrentCountry: string;           // Pays residence
  clientNationality: string;              // Nationalite
  clientLanguages: string[];              // Langues parlees

  // === DEMANDE ===
  title: string;                          // Titre demande
  description: string;                    // Description detaillee
  serviceType?: string;                   // Type de service
  category?: string;                      // Categorie (visa, fiscal, etc.)

  // === URGENCE & PRIORITE ===
  priority: 'low' | 'medium' | 'high' | 'urgent';
  urgency?: 'low' | 'medium' | 'high' | 'critical';

  // === PROVIDER ASSIGNE ===
  providerId: string;                     // Ref vers providers/{id}
  providerType: 'lawyer' | 'expat';
  providerName?: string;                  // Denormalise pour affichage
  providerCountry?: string;

  // === STATUT ===
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  statusHistory?: Array<{
    from: string;
    to: string;
    at: Timestamp;
    by?: string;                          // UID ou 'system'
    source?: string;
  }>;

  // === IA ===
  aiProcessed: boolean;                   // IA a repondu
  aiProcessedAt?: Timestamp;              // Date premiere reponse IA
  conversationId?: string;                // Ref vers conversation liee

  // === COMPLETION ===
  completedAt?: Timestamp;
  cancelledAt?: Timestamp;
  cancelReason?: string;
  callDuration?: number;                  // Duree appel en secondes

  // === NOTES ===
  internalNotes?: string;                 // Notes internes (provider)
  externalNotes?: string;                 // Notes sos-expat.com

  // === SOURCE & TRACKING ===
  source: 'webhook' | 'manual' | 'api';
  externalId?: string;                    // ID sos-expat.com
  requestId?: string;                     // ID requete
  metadata?: Record<string, unknown>;     // Donnees supplementaires

  // === TIMESTAMPS ===
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Index recommandes

```json
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "providerId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "providerId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "priority", "order": "DESCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## 4. Collection: `conversations`

Document ID: Auto-genere

### Structure du document

```typescript
interface ConversationDocument {
  // === LIENS ===
  bookingId: string;                      // Ref vers bookings/{id}
  providerId: string;                     // Ref vers providers/{id}
  providerType: 'lawyer' | 'expat';
  userId?: string;                        // Ref vers users/{uid} (optionnel)

  // === CONTEXTE PERSISTANT (jamais perdu) ===
  bookingContext: {
    clientName: string;
    country: string;
    nationality: string;
    title: string;
    description: string;
    category?: string;
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    specialties?: string[];
    languages?: string[];
  };

  // === RESUME (pour conversations longues) ===
  conversationSummary?: string;           // Resume IA
  summaryUpdatedAt?: Timestamp;

  // === STATS ===
  messageCount: number;
  lastMessageAt?: Timestamp;
  lastMessageRole?: 'user' | 'assistant' | 'provider';

  // === STATUT ===
  status: 'active' | 'archived' | 'expired';
  archivedAt?: Timestamp;
  archiveReason?: string;

  // === TIMESTAMPS ===
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Sous-collection: `conversations/{convId}/messages`

```typescript
interface MessageDocument {
  // === CONTENU ===
  role: 'user' | 'assistant' | 'system' | 'provider';
  source?: 'client' | 'provider' | 'ai' | 'system';
  content: string;

  // === METADONNEES IA ===
  model?: string;                         // 'gpt-4o', 'claude-3-opus', etc.
  provider?: 'claude' | 'gpt' | 'perplexity';
  citations?: string[];                   // Sources Perplexity
  searchPerformed?: boolean;
  tokensUsed?: number;

  // === PROCESSING ===
  processed?: boolean;                    // Message traite par IA
  processedAt?: Timestamp;
  processingError?: string;

  // === REFS ===
  providerId?: string;

  // === TIMESTAMPS ===
  timestamp: Timestamp;                   // Pour tri
  createdAt: Timestamp;
}
```

### Index recommandes

```json
{
  "collectionGroup": "conversations",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "providerId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "updatedAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "conversations",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "bookingId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "messages",
  "queryScope": "COLLECTION_GROUP",
  "fields": [
    { "fieldPath": "providerId", "order": "ASCENDING" },
    { "fieldPath": "timestamp", "order": "DESCENDING" }
  ]
}
```

---

## 5. Collection: `subscriptions`

Document ID: Auto-genere ou ID Stripe

### Structure du document

```typescript
interface SubscriptionDocument {
  // === LIENS ===
  userId: string;                         // Ref vers users/{uid}
  providerId?: string;                    // Ref vers providers/{id}

  // === PLAN ===
  planId: string;                         // ID plan
  planName: string;                       // Nom plan
  planType: 'solo' | 'multi' | 'enterprise';

  // === PRICING ===
  priceAmount: number;                    // Montant en centimes
  priceCurrency: string;                  // 'EUR', 'USD'
  interval: 'month' | 'year';

  // === STATUT ===
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'expired' | 'paused';

  // === PERIODES ===
  currentPeriodStart: Timestamp;
  currentPeriodEnd: Timestamp;
  trialEnd?: Timestamp;
  canceledAt?: Timestamp;
  cancelAtPeriodEnd: boolean;

  // === QUOTAS ===
  features: {
    maxProviders: number;                 // Nombre providers (multi)
    aiCallsPerMonth: number;              // Quota IA mensuel
    prioritySupport: boolean;
    customBranding?: boolean;
  };

  // === STRIPE ===
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;

  // === SYNC EXTERNE ===
  externalId?: string;                    // ID sos-expat.com
  source: 'stripe' | 'manual' | 'sync';

  // === TIMESTAMPS ===
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Index recommandes

```json
{
  "collectionGroup": "subscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "userId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "currentPeriodEnd", "order": "ASCENDING" }
  ]
},
{
  "collectionGroup": "subscriptions",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "currentPeriodEnd", "order": "ASCENDING" }
  ]
}
```

---

## 6. Collections Auxiliaires

### `settings` - Configuration globale

```typescript
interface SettingsDocument {
  // === AI SETTINGS ===
  ai: {
    enabled: boolean;
    replyOnBookingCreated: boolean;
    replyOnUserMessage: boolean;
    model: string;                        // 'gpt-4o'
    perplexityModel: string;              // 'sonar-pro'
    temperature: number;
    maxOutputTokens: number;
    systemPrompt: string;
    lawyerSystemPrompt?: string;
    expertSystemPrompt?: string;
    usePerplexityForFactual: boolean;
    useClaudeForLawyers: boolean;
  };

  // === QUOTAS ===
  quotas: {
    defaultAiCallsPerMonth: number;
    maxBookingsPerDay: number;
    maxMessagesPerConversation: number;
  };

  updatedAt: Timestamp;
  updatedBy: string;
}
```

### `countryConfigs` - Configuration par pays

```typescript
interface CountryConfigDocument {
  code: string;                           // 'FR', 'US', etc.
  name: string;
  nameLocal: string;
  languages: string[];
  currency: string;
  timezone: string;

  // Config specifique pays
  legalDisclaimer?: string;
  requiresBarNumber?: boolean;

  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### `auditLogs` - Journal d'audit

```typescript
interface AuditLogDocument {
  action: string;                         // 'booking_created', 'user_login', etc.
  resourceType: 'booking' | 'user' | 'provider' | 'conversation' | 'subscription';
  resourceId?: string;

  // Contexte
  userId?: string;
  userEmail?: string;
  ip?: string;
  userAgent?: string;

  // Details
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  metadata?: Record<string, unknown>;

  timestamp: Timestamp;
}
```

### `notifications` - Notifications

```typescript
interface NotificationDocument {
  userId: string;
  type: 'new_booking' | 'booking_completed' | 'subscription_expiring' | 'system';
  title: string;
  message: string;

  isRead: boolean;
  readAt?: Timestamp;

  actionUrl?: string;
  resourceType?: string;
  resourceId?: string;

  priority: 'low' | 'medium' | 'high';
  expiresAt?: Timestamp;

  createdAt: Timestamp;
}
```

---

## 7. Regles de Securite Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ==========================================================================
    // FONCTIONS UTILITAIRES
    // ==========================================================================

    function isSignedIn() {
      return request.auth != null;
    }

    function getUserData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }

    function hasRole(role) {
      return isSignedIn() && (
        request.auth.token.role == role ||
        getUserData().role == role
      );
    }

    function isAdmin() {
      return hasRole('admin') || hasRole('superadmin');
    }

    function isProvider() {
      return hasRole('provider') || isAdmin();
    }

    function hasActiveSubscription() {
      let userData = getUserData();
      return userData.subscriptionStatus == 'active' ||
             userData.subscriptionStatus == 'trialing' ||
             isAdmin();
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    function canAccessProvider(providerId) {
      let userData = getUserData();
      return isSignedIn() && (
        userData.linkedProviderIds.hasAny([providerId]) ||
        userData.activeProviderId == providerId ||
        isAdmin()
      );
    }

    // ==========================================================================
    // USERS
    // ==========================================================================
    match /users/{uid} {
      // Lecture: propre profil ou admin
      allow read: if isOwner(uid) || isAdmin();

      // Creation: pour son propre UID
      allow create: if isOwner(uid);

      // Mise a jour: propre profil (champs limites) ou admin
      // SECURITE: role, subscription, linkedProviderIds proteges
      allow update: if isOwner(uid) && !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['role', 'subscriptionStatus', 'subscriptionId', 'linkedProviderIds', 'activeProviderId'])
        || isAdmin();

      // Suppression: admin uniquement
      allow delete: if isAdmin();
    }

    // ==========================================================================
    // PROVIDERS
    // ==========================================================================
    match /providers/{providerId} {
      // Lecture: utilisateur avec abonnement actif
      allow read: if isSignedIn() && (hasActiveSubscription() || isAdmin());

      // Ecriture: admin uniquement (creation via Cloud Functions)
      allow create, update, delete: if isAdmin();
    }

    // ==========================================================================
    // BOOKINGS
    // ==========================================================================
    match /bookings/{bookingId} {
      // Lecture: admin ou provider assigne
      allow read: if isAdmin() || (
        isProvider() &&
        hasActiveSubscription() &&
        canAccessProvider(resource.data.providerId)
      );

      // Creation: admin ou via Cloud Functions (webhook)
      allow create: if isAdmin();

      // Mise a jour: admin ou provider assigne (champs limites)
      allow update: if isAdmin() || (
        isProvider() &&
        hasActiveSubscription() &&
        canAccessProvider(resource.data.providerId) &&
        !request.resource.data.diff(resource.data).affectedKeys()
          .hasAny(['providerId', 'providerType', 'createdAt', 'source'])
      );

      // Suppression: admin uniquement
      allow delete: if isAdmin();
    }

    // ==========================================================================
    // CONVERSATIONS & MESSAGES
    // ==========================================================================
    match /conversations/{convId} {
      // Lecture: admin ou provider assigne
      allow read: if isAdmin() || (
        isProvider() &&
        hasActiveSubscription() &&
        canAccessProvider(resource.data.providerId)
      );

      // Creation: admin ou systeme
      allow create: if isAdmin();

      // Mise a jour: admin ou provider assigne
      allow update: if isAdmin() || (
        isProvider() &&
        hasActiveSubscription() &&
        canAccessProvider(resource.data.providerId)
      );

      allow delete: if isAdmin();

      // Messages dans la conversation
      match /messages/{msgId} {
        allow read: if isAdmin() || (
          isProvider() &&
          hasActiveSubscription() &&
          canAccessProvider(get(/databases/$(database)/documents/conversations/$(convId)).data.providerId)
        );

        allow create: if isAdmin() || (
          isProvider() &&
          hasActiveSubscription() &&
          canAccessProvider(get(/databases/$(database)/documents/conversations/$(convId)).data.providerId)
        );

        allow update, delete: if isAdmin();
      }
    }

    // ==========================================================================
    // SUBSCRIPTIONS
    // ==========================================================================
    match /subscriptions/{subId} {
      // Lecture: propre abonnement ou admin
      allow read: if isAdmin() || resource.data.userId == request.auth.uid;

      // Ecriture: Cloud Functions uniquement
      allow create, update, delete: if false;
    }

    // ==========================================================================
    // SETTINGS & CONFIG
    // ==========================================================================
    match /settings/{settingId} {
      allow read: if isSignedIn() && (isAdmin() || hasActiveSubscription());
      allow write: if isAdmin();
    }

    match /countryConfigs/{code} {
      allow read: if isSignedIn();
      allow write: if isAdmin();
    }

    // ==========================================================================
    // AUDIT & LOGS
    // ==========================================================================
    match /auditLogs/{logId} {
      allow read: if isAdmin();
      allow write: if false; // Cloud Functions uniquement
    }

    // ==========================================================================
    // NOTIFICATIONS
    // ==========================================================================
    match /notifications/{notifId} {
      allow read: if isAdmin() || resource.data.userId == request.auth.uid;
      allow create: if isAdmin();
      allow update: if resource.data.userId == request.auth.uid &&
        request.resource.data.diff(resource.data).affectedKeys().hasOnly(['isRead', 'readAt']);
      allow delete: if isAdmin();
    }

    // ==========================================================================
    // CATCH-ALL: REFUSER TOUT LE RESTE
    // ==========================================================================
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 8. Considerations de Performance

### 8.1 Denormalisation strategique

| Donnee | Document source | Denormalise dans | Raison |
|--------|-----------------|------------------|--------|
| `subscriptionStatus` | `subscriptions` | `users` | Evite join pour chaque verification acces |
| `providerName` | `providers` | `bookings` | Affichage liste sans join |
| `clientName` | Calcule | `bookings` | Evite concatenation cote client |
| `bookingContext` | `bookings` | `conversations` | Contexte IA toujours disponible |
| `messageCount` | Calcule | `conversations` | Stats sans count() couteux |

### 8.2 Pagination recommandee

```typescript
// Pattern de pagination efficace
const getBookings = async (providerId: string, lastDoc?: DocumentSnapshot) => {
  let q = query(
    collection(db, 'bookings'),
    where('providerId', '==', providerId),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  if (lastDoc) {
    q = query(q, startAfter(lastDoc));
  }

  return getDocs(q);
};
```

### 8.3 Listeners optimises

```typescript
// Ecouter uniquement les champs necessaires (si supporte)
// Sinon, utiliser des selectors cote client pour limiter re-renders

// Pattern recommande
const useBookingsList = (providerId: string) => {
  const [bookings, setBookings] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, 'bookings'),
      where('providerId', '==', providerId),
      where('status', 'in', ['pending', 'in_progress']),
      orderBy('createdAt', 'desc'),
      limit(50) // Limiter pour performance
    );

    return onSnapshot(q, (snapshot) => {
      // Traitement incremental
      const changes = snapshot.docChanges();
      // ...
    });
  }, [providerId]);
};
```

### 8.4 Batching des ecritures

```typescript
// Pour operations en masse
const batchUpdate = async (updates: Array<{id: string, data: any}>) => {
  const BATCH_SIZE = 500; // Limite Firestore

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = updates.slice(i, i + BATCH_SIZE);

    chunk.forEach(({ id, data }) => {
      batch.update(doc(db, 'collection', id), data);
    });

    await batch.commit();
  }
};
```

---

## 9. Migration depuis structure actuelle

### Changements recommandes

1. **Ajouter `bookingContext` aux conversations existantes**
   - Script de backfill pour copier les infos du booking lie

2. **Normaliser les noms de champs**
   - `subscription_status` -> `subscriptionStatus`
   - `created_at` -> `createdAt`

3. **Ajouter les index manquants**
   - Deployer via `firebase deploy --only firestore:indexes`

4. **Nettoyer les donnees orphelines**
   - Conversations sans booking
   - Messages sans conversation

---

## 10. Checklist Implementation

- [ ] Deployer les nouveaux index (`firestore.indexes.json`)
- [ ] Mettre a jour les regles de securite
- [ ] Backfill `bookingContext` dans conversations
- [ ] Ajouter denormalisation `providerName` dans bookings
- [ ] Implementer cleanup scheduled pour donnees expirees
- [ ] Configurer alertes quota Firestore
- [ ] Tester les regles de securite (emulateur)

---

## Annexe: Diagramme des Relations

```
users (1) -----> (N) subscriptions
  |
  +-----------> (N) providers (via linkedProviderIds)
                    |
                    +-----> (N) bookings
                              |
                              +-----> (1) conversations
                                          |
                                          +-----> (N) messages
```

**Cardinalites:**
- 1 User peut avoir N Subscriptions (historique)
- 1 User peut gerer N Providers (compte multi)
- 1 Provider peut avoir N Bookings
- 1 Booking a 1 Conversation
- 1 Conversation a N Messages

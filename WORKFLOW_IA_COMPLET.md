# WORKFLOW COMPLET - ASSISTANT IA SOS-EXPAT

## 1. ARCHITECTURE GLOBALE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (sos-expat.com)                          │
│                                                                              │
│  Dashboard.tsx                        AiAssistant/Index.tsx                 │
│  ├── Condition d'affichage:          ├── useAiChat() hook                   │
│  │   user.role === "lawyer"          ├── useAiQuota() hook                  │
│  │   || user.role === "expat"        └── useSubscription() hook             │
│  │   || user.role === "admin"                    │                          │
│  │                                               │                          │
│  └── Menu → "Assistant IA" (badge NEW)           │                          │
│             route: /dashboard/ai-assistant        │                          │
└──────────────────────────────────────────────────┼──────────────────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FIREBASE CALLABLE FUNCTIONS                               │
│                                                                              │
│  aiChatForProvider (onCall)           Subscription Functions                 │
│  ├── region: europe-west1             ├── checkAiQuota                       │
│  ├── memory: 512MiB                   ├── recordAiCall                       │
│  ├── timeout: 60s                     ├── createSubscription                 │
│  └── secrets: [OUTIL_API_KEY]         └── stripeWebhook                      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                                    │
                                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OUTIL-SOS-EXPAT (Backend IA)                         │
│                                                                              │
│  Endpoint: https://europe-west1-outils-sos-expat.cloudfunctions.net/aiChat  │
│                                                                              │
│  Système hybride multi-LLM:                                                 │
│  ├── Claude 3.5 Sonnet → Avocats (raisonnement juridique)                   │
│  ├── GPT-4o → Expatriés (conseils pratiques)                                │
│  └── Perplexity → Recherche web (questions factuelles)                      │
│                                                                              │
│  Fallback automatique entre LLMs si erreur                                  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CONDITIONS D'AFFICHAGE DE L'ASSISTANT IA

### Dans Dashboard.tsx (lignes 1791-1836)

```typescript
// L'onglet AI Assistant s'affiche SEULEMENT si:
...(user.role === "lawyer" || user.role === "expat" || user.role === "admin"
  ? [
      {
        key: "ai-assistant",
        icon: <Bot className="mr-3 h-5 w-5" />,
        fr: "Assistant IA",
        en: "AI Assistant",
        route: "/dashboard/ai-assistant",
        badge: "NEW",
      },
      // ... + Subscription + Translations
    ]
  : [])  // ← Tableau vide si autre rôle → pas d'onglet
```

### Dans App.tsx (lignes 231-234) - Protection des routes

```typescript
// Routes protégées par rôle
{ path: "/dashboard/ai-assistant", component: AiAssistantPage, protected: true, role: ['lawyer', 'expat', 'admin'] },
{ path: "/dashboard/subscription", component: SubscriptionPage, protected: true, role: ['lawyer', 'expat', 'admin'] },
```

### Dans ProtectedRoute.tsx - Vérification d'accès

```typescript
// checkUserRole vérifie user.role contre allowedRoles
if (allowedRoles) {
  const hasRole = checkUserRole(user, allowedRoles);
  setAuthState(hasRole ? 'authorized' : 'unauthorized');
}
```

---

## 3. COLLECTIONS FIRESTORE

### Structure des données

```
firestore/
├── users/{uid}                          ← Compte utilisateur
│   ├── role: "client" | "lawyer" | "expat" | "admin"
│   ├── email: string
│   ├── firstName, lastName, fullName
│   └── subscriptionStatus: string
│
├── sos_profiles/{uid}                   ← Profil prestataire public
│   ├── type: "lawyer" | "expat"
│   ├── role: "lawyer" | "expat"         ← Dupliqué pour compatibilité
│   ├── specialties, languages, country
│   ├── isApproved, isVisible, isOnline
│   ├── rating, reviewCount
│   └── price, duration
│
├── subscriptions/{userId}               ← Abonnement IA
│   ├── tier: "gratuit" | "starter" | "pro" | "elite"
│   ├── status: "active" | "canceled" | "past_due" | "trialing"
│   ├── stripeSubscriptionId
│   ├── aiCallsUsed: number
│   ├── aiCallsLimit: number
│   └── currentPeriodEnd: Timestamp
│
├── ai_usage_logs/{logId}                ← Logs d'utilisation IA
│   ├── userId, prestataireId
│   ├── provider: "claude" | "gpt4o" | "perplexity"
│   ├── promptTokens, completionTokens, totalTokens
│   ├── costUsd, responseTimeMs
│   └── success, errorMessage
│
├── ai_response_cache/{cacheKey}         ← Cache réponses (5 min TTL)
│   ├── response, provider, model
│   └── cachedAt: Timestamp
│
└── providers/{uid}                      ← Accès Outil-sos-expat (séparé)
    ├── email, name, type
    ├── aiQuota, aiCallsUsed
    ├── active, verified
    └── forcedAIAccess: boolean          ← Bypass admin
```

---

## 4. FLUX D'UN APPEL IA

### Étape 1: Frontend (AiAssistant/Index.tsx)

```typescript
// 1. Hook useAiChat pour envoyer message
const { sendMessage, messages, isLoading } = useAiChat();

// 2. Hook useAiQuota pour vérifier quota
const { quota, hasQuota, isLoading: quotaLoading } = useAiQuota();

// 3. Hook useSubscription pour statut abonnement
const { subscription, hasActiveSubscription } = useSubscription();

// 4. Envoi du message
await sendMessage(userMessage);
```

### Étape 2: Firebase Function (aiChatForProvider.ts)

```typescript
export const aiChatForProvider = onCall({
  region: 'europe-west1',
  secrets: [OUTIL_API_KEY_SECRET],
}, async (request) => {

  // 1️⃣ VÉRIFICATION AUTH
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentification requise');
  }
  const userId = request.auth.uid;

  // 2️⃣ VÉRIFICATION QUOTA
  const quota = await checkAiQuota(userId);
  if (!quota.allowed) {
    throw new HttpsError('resource-exhausted',
      `Quota IA épuisé. ${quota.remaining}/${quota.limit} appels restants.`);
  }

  // 3️⃣ DÉTERMINATION TYPE PRESTATAIRE
  let providerType: 'lawyer' | 'expat' = 'expat';
  const providerDoc = await db.collection('providers').doc(userId).get();
  if (providerDoc.exists && providerDoc.data()?.role === 'lawyer') {
    providerType = 'lawyer';
  }

  // 4️⃣ VÉRIFICATION CACHE (5 min TTL)
  const cacheKey = generateCacheKey(userId, message, providerType);
  const cached = await getCachedResponse(cacheKey);
  if (cached) return cached;

  // 5️⃣ APPEL OUTIL-SOS-EXPAT (avec retry 429 + backoff)
  const result = await callOutilAiChat(userId, message, providerType, history);

  // 6️⃣ INCRÉMENTATION QUOTA
  await incrementAiUsage(userId);

  // 7️⃣ LOG UTILISATION
  await logAiUsage({
    userId,
    provider: result.provider,
    model: result.model,
    success: true,
    responseTimeMs: Date.now() - startTime,
  });

  // 8️⃣ MISE EN CACHE
  await setCachedResponse(cacheKey, result);

  return {
    success: true,
    response: result.response,
    provider: result.provider,
    quotaRemaining: (await checkAiQuota(userId)).remaining,
  };
});
```

### Étape 3: Outil-sos-expat (Backend IA)

```typescript
// Système hybride intelligent
if (providerType === 'lawyer') {
  // Claude 3.5 Sonnet pour raisonnement juridique
  response = await callClaude(message, context);
} else {
  // GPT-4o pour conseils pratiques expatriés
  response = await callGPT4o(message, context);
}

// Si question factuelle → Perplexity pour recherche web
if (needsWebSearch(message)) {
  response = await callPerplexity(message);
}

// Fallback automatique si erreur
if (!response) {
  response = await fallbackChain([claude, gpt4o, perplexity]);
}
```

---

## 5. GESTION DES QUOTAS

### Plans d'abonnement

| Tier | Limite IA/mois | Prix |
|------|----------------|------|
| gratuit | 0 | 0€ |
| starter | 100 | 29€ |
| pro | 500 | 79€ |
| elite | 2000 | 199€ |
| unlimited | 500 (fair use) | - |

### Vérification quota (subscription-service.ts)

```typescript
export async function checkAiQuota(userId: string): Promise<QuotaCheckResult> {
  const subDoc = await db.collection('subscriptions').doc(userId).get();
  const sub = subDoc.data();

  // Vérifier période d'essai
  if (sub?.status === 'trialing') {
    const trialEnd = sub.trialEndDate?.toDate();
    if (trialEnd && trialEnd > new Date()) {
      return { allowed: true, remaining: sub.trialCallsRemaining };
    }
  }

  // Vérifier abonnement actif
  if (sub?.status !== 'active') {
    return { allowed: false, reason: 'no_active_subscription' };
  }

  // Vérifier quota
  const used = sub.aiCallsUsed || 0;
  const limit = sub.aiCallsLimit || 0;

  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
    resetAt: sub.currentPeriodEnd?.toDate(),
  };
}
```

### Incrémentation atomique (après succès)

```typescript
export async function incrementAiUsage(userId: string): Promise<boolean> {
  return db.runTransaction(async (transaction) => {
    const subRef = db.collection('subscriptions').doc(userId);
    const subDoc = await transaction.get(subRef);

    const current = subDoc.data()?.aiCallsUsed || 0;
    transaction.update(subRef, {
      aiCallsUsed: current + 1,
      lastAiCallAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return true;
  });
}
```

---

## 6. RETRY 429 + CACHE

### Retry avec backoff exponentiel

```typescript
const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

async function callOutilAiChat(/* ... */): Promise<OutilResponse> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const response = await fetch(OUTIL_AI_ENDPOINT, { /* ... */ });

    // Gestion 429 (Rate Limit)
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const delayMs = retryAfter
        ? parseInt(retryAfter) * 1000
        : INITIAL_DELAY_MS * Math.pow(2, attempt);

      await sleep(delayMs);
      continue;
    }

    // Gestion 5xx (Server Error)
    if (response.status >= 500) {
      await sleep(INITIAL_DELAY_MS * Math.pow(2, attempt));
      continue;
    }

    return await response.json();
  }

  return { ok: false, error: 'Service IA surchargé' };
}
```

### Cache Firestore (5 minutes TTL)

```typescript
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function generateCacheKey(userId: string, message: string, providerType: string): string {
  const normalized = message.trim().toLowerCase().slice(0, 200);
  return `ai_cache_${userId}_${providerType}_${btoa(normalized).slice(0, 50)}`;
}

async function getCachedResponse(cacheKey: string): Promise<OutilResponse | null> {
  const doc = await db.collection('ai_response_cache').doc(cacheKey).get();
  if (!doc.exists) return null;

  const data = doc.data();
  const cachedAt = data.cachedAt?.toDate();

  // Expiration check
  if (Date.now() - cachedAt.getTime() > CACHE_TTL_MS) {
    await doc.ref.delete(); // Nettoyer cache expiré
    return null;
  }

  return { ok: true, response: data.response, /* ... */ };
}
```

---

## 7. NOTIFICATIONS EMAIL (Mailwizz)

### Payment Failed (subscription/index.ts)

```typescript
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  // ... update status to 'past_due' ...

  const mailwizz = new MailwizzAPI();
  await mailwizz.sendTransactional({
    to: provider.email,
    template: `TR_PRV_subscription-payment-failed_${lang}`,
    customFields: {
      FNAME: provider.firstName,
      AMOUNT: (invoice.amount_due / 100).toString(),
      CURRENCY: invoice.currency.toUpperCase(),
      INVOICE_URL: invoice.hosted_invoice_url,
      RETRY_URL: 'https://sos-expat.com/dashboard/subscription',
    },
  });
}
```

### Trial Ending

```typescript
async function handleTrialEnding(subscription: Stripe.Subscription) {
  const daysRemaining = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));

  const mailwizz = new MailwizzAPI();
  await mailwizz.sendTransactional({
    to: provider.email,
    template: `TR_PRV_trial-ending_${lang}`,
    customFields: {
      FNAME: provider.firstName,
      DAYS_REMAINING: daysRemaining.toString(),
      TRIAL_END_DATE: trialEnd.toLocaleDateString(),
      UPGRADE_URL: 'https://sos-expat.com/dashboard/subscription/plans',
    },
  });
}
```

---

## 8. FICHIERS CLÉS

### Frontend (sos/)
| Fichier | Rôle |
|---------|------|
| `src/pages/Dashboard.tsx` | Dashboard principal, condition affichage onglets |
| `src/pages/Dashboard/AiAssistant/Index.tsx` | Page Assistant IA |
| `src/pages/Dashboard/Subscription/Index.tsx` | Page Abonnement |
| `src/hooks/useAiChat.ts` | Hook envoi messages IA |
| `src/hooks/useAiQuota.ts` | Hook gestion quota |
| `src/hooks/useSubscription.ts` | Hook statut abonnement |
| `src/App.tsx` | Routes protégées par rôle |
| `src/components/auth/ProtectedRoute.tsx` | Protection des routes |
| `src/contexts/AuthContext.tsx` | Authentification + user.role |

### Backend (sos/firebase/functions/)
| Fichier | Rôle |
|---------|------|
| `src/ai/aiChatForProvider.ts` | Cloud Function principale IA |
| `src/subscription/index.ts` | Fonctions abonnement Stripe |
| `src/subscriptions/subscription-service.ts` | Service quota + logs |
| `src/subscriptions/ai-quota-middleware.ts` | Middleware quota |
| `src/emailMarketing/utils/mailwizz.ts` | Envoi emails transactionnels |
| `src/index.ts` | Exports de toutes les fonctions |

---

## 9. VÉRIFICATION RAPIDE

### Pour voir l'Assistant IA dans le dashboard:

1. **Vérifier votre rôle Firestore:**
   ```
   Firestore Console → users/{votre_uid} → role
   Doit être: "lawyer", "expat", ou "admin"
   ```

2. **Si rôle incorrect**, mettre à jour:
   ```javascript
   // Dans Firestore Console
   users/{uid}.role = "lawyer" // ou "expat" ou "admin"
   ```

3. **Vérifier sos_profiles (si lawyer/expat):**
   ```
   Firestore Console → sos_profiles/{votre_uid}
   Doit exister avec type: "lawyer" ou "expat"
   ```

4. **Vérifier abonnement (optionnel mais recommandé):**
   ```
   Firestore Console → subscriptions/{votre_uid}
   status: "active" ou "trialing"
   aiCallsLimit > 0
   ```

---

## 10. TESTS RECOMMANDÉS

```bash
# 1. Tester la fonction aiChatForProvider
firebase functions:shell
> aiChatForProvider({message: "Bonjour", conversationHistory: []}, {auth: {uid: "test-uid"}})

# 2. Vérifier les logs
firebase functions:log --only aiChatForProvider

# 3. Tester quota
firebase functions:shell
> subscriptionCheckQuota({}, {auth: {uid: "test-uid"}})
```

---

*Document généré le 24/12/2024*

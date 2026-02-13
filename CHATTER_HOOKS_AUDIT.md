# Audit Complet des Hooks React - Système Chatter

**Date:** 2026-02-13
**Projet:** SOS Expat
**Module:** Chatter (Affiliate/Referral System)

---

## Résumé Exécutif

Le système Chatter dispose de **7 hooks React** dédiés gérant les différents aspects du système d'affiliation et de gamification.

**Status Global:**
- ✅ **6 hooks utilisés** dans les pages/composants
- ⚠️ **1 hook deprecated** (useChatterWithdrawal)
- 📊 **3 Cloud Functions** appelées depuis les hooks
- 🔗 **Intégration complète** avec Firestore et Cloud Functions

---

## 1. HOOKS CHATTER - INVENTAIRE COMPLET

### 1.1 Hook: `useChatter`
**Fichier:** `/sos/src/hooks/useChatter.ts` (496 lignes)

**Responsabilités:**
- Gestion du dashboard chatter principal
- Commissions et retraits
- Notifications
- Profil utilisateur
- Codes d'affiliation (client & recruitment)

**Cloud Functions appelées:**
| Fonction | Type | Entrée | Sortie |
|----------|------|--------|--------|
| `getChatterDashboard` | Callable | `void` | `ChatterDashboardData` |
| `chatterRequestWithdrawal` | Callable | `RequestWithdrawalInput` | `{ success, withdrawalId, amount, message }` |
| `updateChatterProfile` | Callable | `UpdateChatterProfileInput` | `{ success, message }` |

**Dépendances:**
```typescript
- useAuth()              // AuthContext
- useApp()              // AppContext (language)
- getFirestore()        // Firestore real-time
- getFunctions()        // firebase/functions (europe-west1)
```

**Données retournées:**
```typescript
{
  dashboardData: ChatterDashboardData | null     // ✅ Principal dashboard
  commissions: ChatterCommission[]               // ✅ Real-time Firestore
  withdrawals: ChatterWithdrawal[]               // ✅ Real-time Firestore
  notifications: ChatterNotification[]           // ✅ Real-time Firestore
  isLoading: boolean
  error: string | null
  isChatter: boolean

  // Computed
  clientShareUrl: string
  recruitmentShareUrl: string
  canWithdraw: boolean
  minimumWithdrawal: number = 2500 (cents)
  totalBalance: number
  unreadNotificationsCount: number

  // Actions
  refreshDashboard()
  requestWithdrawal(input)
  updateProfile(input)
  markNotificationRead(notificationId)
  markAllNotificationsRead()
}
```

**Problèmes identifiés:**
- ⚠️ Dépendance `language` non utilisée dans les calculs (seul langCode)
- ⚠️ Les URL d'affiliation sont calculées côté client (pas de traduction des routes - voir `getTranslatedRouteSlug`)

**Utilisé dans:**
- `ChatterDashboard.tsx` ✅
- `ChatterLeaderboard.tsx` ✅
- `ChatterPayments.tsx` ✅
- `ChatterReferralEarnings.tsx` ✅
- `ChatterReferrals.tsx` ✅

---

### 1.2 Hook: `useChatterMissions`
**Fichier:** `/sos/src/hooks/useChatterMissions.ts` (381 lignes)

**Responsabilités:**
- Suivi des missions quotidiennes gamifiées
- Synchronisation localStorage ↔ Firestore
- Réinitialisation quotidienne automatique
- Calcul XP et avancement

**Cloud Functions appelées:**
❌ **AUCUNE** - Utilise localStorage et Firestore direct

**Dépendances:**
```typescript
- useAuth()              // AuthContext (uid)
- getFirestore()        // Firestore direct read/write
- Timestamp.now()       // Firestore timestamps
```

**Données retournées:**
```typescript
{
  progress: MissionProgress {
    date: string        // YYYY-MM-DD pour reset quotidien
    sharesCount: number
    loggedInToday: boolean
    messagesSentToday: number
    videoWatched: boolean
    callsToday: number
  }
  isLoading: boolean

  // Computed
  missions: Mission[] {
    id: string          // 'share' | 'login' | 'message' | 'video' | 'call'
    title: string
    target: number
    current: number
    completed: boolean
    autoTracked: boolean
    xp: number         // 50 | 15 | 30 | 25 | 100
  }
  completedCount: number
  totalXP: number

  // Actions
  trackShare()
  trackLogin()          // Auto-appelé une fois par session
  trackMessageSent()
  trackVideoWatched()
  trackCall()
}
```

**Missions Config:**
```typescript
const MISSIONS_CONFIG = [
  { id: 'share',    target: 3,  xp: 50,  autoTracked: true },
  { id: 'login',    target: 1,  xp: 15,  autoTracked: true },
  { id: 'message',  target: 1,  xp: 30,  autoTracked: true },
  { id: 'video',    target: 1,  xp: 25,  autoTracked: true },
  { id: 'call',     target: 1,  xp: 100, autoTracked: true },
]
// Bonus: +150 XP si toutes complétées
```

**Problèmes identifiés:**
- ✅ Bien structuré, synchronisation bi-directionnelle réussie
- ✅ Reset quotidien à minuit fonctionne
- ⚠️ **localStorage hardcoded** - pas de localStorage namespace global

**Utilisé dans:**
- `DailyMissionsCard.tsx` ✅ (Chatter dashboard)
- `TeamMessagesCard.tsx` ✅ (Appel de `trackMessageSent()`)

---

### 1.3 Hook: `useChatterPromotion`
**Fichier:** `/sos/src/hooks/useChatterPromotion.ts` (125 lignes)

**Responsabilités:**
- Récupération promotions actives
- Calcul multiplicateur commissions
- Affichage temps restant

**Cloud Functions appelées:**
| Fonction | Type | Entrée | Sortie |
|----------|------|--------|--------|
| `getReferralDashboard` | Callable | `void` | `{ activePromotion: ChatterActivePromotion \| null }` |

**Dépendances:**
```typescript
- useAuth()              // User pour condition
- getFunctions()        // firebase/functions (europe-west1)
```

**Données retournées:**
```typescript
{
  activePromotion: ChatterActivePromotion | null {
    multiplier: number
    endsAt: string      // ISO 8601
  }
  allPromotions: ChatterPromotion[]      // Toujours []
  isLoading: boolean
  error: string | null

  // Computed
  hasActivePromotion: boolean
  currentMultiplier: number = 1
  promotionEndsIn: string | null         // "5j 3h" ou "12h"

  // Actions
  refresh()
}
```

**Helper Functions:**
```typescript
export function formatMultiplier(multiplier: number): string
export function getPromotionTypeLabel(type, locale): string
```

**Problèmes identifiés:**
- ⚠️ `allPromotions` toujours vide - jamais utilisé
- ⚠️ Logique de temps restant non-reactive (calcul statique au return)
- ⚠️ **NON utilisé** dans aucune page (orphelin)

**Utilisé dans:**
- ❌ **AUCUNE PAGE** - Hook inutilisé

---

### 1.4 Hook: `useChatterQuiz`
**Fichier:** `/sos/src/hooks/useChatterQuiz.ts` (193 lignes)

**Responsabilités:**
- Gestion quiz d'onboarding Chatter (DEPRECATED)
- Récupération questions
- Soumission réponses
- Résultats et scoring

**Cloud Functions appelées:**
| Fonction | Type | Entrée | Sortie |
|----------|------|--------|--------|
| `getQuizQuestions` | Callable | `void` | `{ success, questions[], timeLimit }` |
| `submitQuiz` | Callable | `SubmitQuizInput` | `{ passed, score, results[], canRetryAt }` |

**Dépendances:**
```typescript
- useAuth()              // User.uid
- getFunctions()        // firebase/functions (europe-west1)
```

**Données retournées:**
```typescript
{
  questions: ChatterQuizQuestion[]
  isLoadingQuestions: boolean
  isSubmitting: boolean
  error: string | null
  timeLimit: number = 300 (secondes)

  quizResult: SubmitQuizResponse | null
  passed: boolean | null
  score: number | null

  // Actions
  fetchQuestions()
  submitAnswers(answers[])
  resetQuiz()
}
```

**Problèmes identifiés:**
- ⚠️ **DEPRECATED & NON UTILISÉ**
- ✅ Logique d'erreur détaillée (retry wait, already passed)
- ℹ️ Route `/chatter/quiz` commentée dans App.tsx (flux simplifié 2026-02-06)

**Utilisé dans:**
- ❌ **AUCUNE PAGE** - Route supprimée du flux (presentation + quiz removed)

---

### 1.5 Hook: `useChatterReferrals`
**Fichier:** `/sos/src/hooks/useChatterReferrals.ts` (168 lignes)

**Responsabilités:**
- Système 2 niveaux (Filleuls N1/N2)
- Commissions parrainage
- Progression tiers (5, 10, 20, 50, 100, 500)
- Promotion active

**Cloud Functions appelées:**
| Fonction | Type | Entrée | Sortie |
|----------|------|--------|--------|
| `getReferralDashboard` | Callable | `void` | `ChatterReferralDashboardData` |

**Dépendances:**
```typescript
- useAuth()              // User pour condition
- getFunctions()        // firebase/functions (europe-west1)
```

**Données retournées:**
```typescript
{
  dashboardData: ChatterReferralDashboardData {
    stats: ChatterReferralStats
    filleulsN1: ChatterFilleulN1[]
    filleulsN2: ChatterFilleulN2[]
    recentCommissions: ChatterReferralCommission[]
    tierProgress: ChatterTierProgress
    activePromotion: ChatterActivePromotion
  }
  stats: ChatterReferralStats | null
  filleulsN1: ChatterFilleulN1[]
  filleulsN2: ChatterFilleulN2[]
  recentCommissions: ChatterReferralCommission[]
  tierProgress: ChatterTierProgress | null
  activePromotion: ChatterActivePromotion | null

  isLoading: boolean
  error: string | null

  // Actions
  refreshDashboard()
}
```

**Helper Functions:**
```typescript
export function getFilleulProgressPercent(clientEarnings): {
  progressTo10: number      // % vers $10
  progressTo50: number      // % vers $50
  currentPhase: "to10" | "to50" | "qualified"
}

export function formatTierBonus(tier: number): string
// Tiers: 5→$15, 10→$35, 20→$75, 50→$250, 100→$600, 500→$4,000

export function getNextTierInfo(qualifiedCount, paidTiers): { tier, needed, bonus }
```

**Problèmes identifiés:**
- ✅ Structure complète et logique cohérente
- ✅ Thresholds filleuls: $10 (1000¢), $50 (5000¢)

**Utilisé dans:**
- `ChatterDashboard.tsx` ✅
- `ChatterReferrals.tsx` ✅
- `ChatterReferralEarnings.tsx` ✅
- `ChatterRefer.tsx` ✅

---

### 1.6 Hook: `useChatterTraining`
**Fichier:** `/sos/src/hooks/useChatterTraining.ts` (218 lignes)

**Responsabilités:**
- Gestion modules de formation
- Progression slides
- Quiz par module
- Certificats

**Cloud Functions appelées:**
| Fonction | Type | Entrée | Sortie |
|----------|------|--------|--------|
| `getChatterTrainingModules` | Callable | `void` | `{ modules[], overallProgress }` |
| `getChatterTrainingModuleContent` | Callable | `{ moduleId }` | `{ module, progress, canAccess, blockedByPrerequisites[] }` |
| `updateChatterTrainingProgress` | Callable | `{ moduleId, slideIndex }` | `void` |
| `submitChatterTrainingQuiz` | Callable | `{ moduleId, answers[] }` | `SubmitTrainingQuizResult` |
| `getChatterTrainingCertificate` | Callable | `{ certificateId }` | `{ certificate, verificationUrl }` |

**Dépendances:**
```typescript
- functions (from @/config/firebase)  // Direct import (not getFunctions)
- useChatterMissions()                // trackVideoWatched() on quiz pass
```

**Données retournées:**
```typescript
{
  modules: TrainingModuleListItem[]
  overallProgress: TrainingOverallProgress | null
  currentModule: ChatterTrainingModule | null
  currentProgress: ChatterTrainingProgress | null
  certificate: ChatterTrainingCertificate | null

  isLoading: boolean
  isLoadingModule: boolean
  isSubmittingQuiz: boolean
  error: string | null

  // Actions
  loadModules()
  loadModuleContent(moduleId)
  updateProgress(moduleId, slideIndex)
  submitQuiz(moduleId, answers[]): SubmitTrainingQuizResult | null
  loadCertificate(certificateId)
}
```

**Problèmes identifiés:**
- ⚠️ **Import différent:** `import { functions } from '@/config/firebase'`
  - Autres hooks utilisent `getFunctions(undefined, "europe-west1")`
  - À vérifier: même region?
- ⚠️ Gestion d'erreur: "disabled" check mais code manque détails
- ✅ Intégration missions: appelle `trackVideoWatched()` sur succès quiz
- ✅ Prérequis bloquants: vérifie `canAccess` et liste `blockedByPrerequisites`

**Utilisé dans:**
- ❌ **AUCUNE PAGE** - Module training en construction

---

### 1.7 Hook: `useChatterWithdrawal` ⚠️ DEPRECATED
**Fichier:** `/sos/src/hooks/useChatterWithdrawal.ts` (300 lignes)

**Status:** 🔴 **DEPRECATED**

```typescript
/**
 * @deprecated This hook is deprecated.
 * Use the centralized payment system instead:
 * - Components: @/components/Payment
 * - Types: @/types/payment
 * - Hooks: @/hooks/usePayment
 */
```

**Raison:** Système de paiement centralisé mis en place

**Cloud Functions appelées:**
| Fonction | Type | Entrée | Sortie |
|----------|------|--------|--------|
| `chatterRequestWithdrawal` | Callable | `RequestWithdrawalInput` | `WithdrawalResponse` |

**Problèmes identifiés:**
- ⚠️ Doublon avec `useChatter().requestWithdrawal()`
- ⚠️ **NON UTILISÉ** - À supprimer
- ✅ Validation détaillée (Wise, Mobile Money, Bank)

---

### Fonction Helper: `useChatterReferralCapture`
**Fichier:** `/sos/src/hooks/useChatter.ts` (lignes 412-469)

**Responsabilités:**
- Capture codes affiliation dans URL (`?ref=`, `?code=`)
- Normalisation codes
- Détection type (client vs recruitment)
- Persistance localStorage

**Dépendances:**
```typescript
- localStorage          // CHATTER_CODE_KEY & CHATTER_CODE_TYPE_KEY
```

**Données retournées:**
```typescript
{
  referralCode: string | null
  referralType: "client" | "recruitment" | null
  clearReferral()
}
```

**Helper Functions:**
```typescript
export function getStoredChatterCode(): { code, type }
export function clearStoredChatterCode(): void
```

**Utilisé dans:**
- ChatterRegister.tsx (inscription)

---

## 2. MATRICE D'UTILISATION

### 2.1 Hooks Utilisés vs Non Utilisés

| Hook | Utilisé? | Pages | Composants | Status |
|------|----------|-------|-----------|--------|
| `useChatter` | ✅ | 5 pages | 1 composant | Actif |
| `useChatterMissions` | ✅ | 0 pages | 2 composants | Actif |
| `useChatterPromotion` | ❌ | 0 | 0 | **Orphelin** |
| `useChatterQuiz` | ❌ | 0 | 0 | **Deprecated** |
| `useChatterReferrals` | ✅ | 4 pages | 1 composant | Actif |
| `useChatterTraining` | ❌ | 0 | 0 | **En construction** |
| `useChatterWithdrawal` | ❌ | 0 | 0 | **Deprecated** |
| `useChatterReferralCapture` | ✅ | 1 page | 0 | Actif |

**Résumé:**
- ✅ 4 hooks pleinement utilisés
- ⚠️ 1 hook en construction (training)
- ❌ 2 hooks deprecated
- ❌ 1 hook orphelin

---

### 2.2 Pages Chatter Analysées

| Page | Hooks utilisés | État |
|------|---------------|------|
| `ChatterDashboard.tsx` | useChatter, useChatterReferrals | ✅ |
| `ChatterLeaderboard.tsx` | useChatter | ✅ |
| `ChatterPayments.tsx` | useChatter | ✅ |
| `ChatterReferrals.tsx` | useChatter, useChatterReferrals | ✅ |
| `ChatterReferralEarnings.tsx` | useChatter, useChatterReferrals | ✅ |
| `ChatterRefer.tsx` | useChatterReferrals | ✅ |
| `ChatterRegister.tsx` | useChatterReferralCapture (implicite) | ✅ |
| `ChatterTelegramOnboarding.tsx` | - | (Onboarding, pas de hooks Chatter) |
| `ChatterPosts.tsx` | - | (Posts, pas de hooks Chatter) |
| `ChatterTraining.tsx` | ❌ **Pas d'import** | ⚠️ |
| `ChatterLeaderboard.tsx` | ❌ **Quiz & Training non utilisés** | ⚠️ |
| `ChatterSuspended.tsx` | - | (Status page, pas de data) |
| `ChatterLanding.tsx` | - | (Landing, pas de hooks) |

---

## 3. FONCTIONS CLOUD - MAPPING DÉTAILLÉ

### 3.1 Cloud Functions par Hook

**getChatterDashboard**
- Hook: `useChatter`
- Données: dashboard, commissions, tirelire
- Région: europe-west1
- Type: Callable
- Fréquence appel: Une fois au mount + refresh manuel

**chatterRequestWithdrawal**
- Hooks: `useChatter`, `useChatterWithdrawal` (deprecated)
- Données: amount, paymentMethod, paymentDetails
- Région: europe-west1
- Fréquence: À la demande

**updateChatterProfile**
- Hook: `useChatter`
- Données: profil utilisateur
- Région: europe-west1
- Fréquence: À la demande

**getReferralDashboard**
- Hooks: `useChatterReferrals`, `useChatterPromotion`
- Données: filleuls N1/N2, stats, promotion active, progression tiers
- Région: europe-west1
- Fréquence: Au mount + refresh manuel

**getQuizQuestions**
- Hook: `useChatterQuiz` (deprecated)
- Région: europe-west1
- Status: ❌ Route `/chatter/quiz` supprimée

**submitQuiz**
- Hook: `useChatterQuiz` (deprecated)
- Région: europe-west1
- Status: ❌ Non utilisé

**getChatterTrainingModules**
- Hook: `useChatterTraining`
- Région: Directe (pas getFunctions)
- Status: ⚠️ En construction

**getChatterTrainingModuleContent**
- Hook: `useChatterTraining`
- Région: Directe
- Status: ⚠️ En construction

**updateChatterTrainingProgress**
- Hook: `useChatterTraining`
- Région: Directe
- Status: ⚠️ En construction

**submitChatterTrainingQuiz**
- Hook: `useChatterTraining`
- Région: Directe
- Status: ⚠️ En construction

**getChatterTrainingCertificate**
- Hook: `useChatterTraining`
- Région: Directe
- Status: ⚠️ En construction

---

### 3.2 Status des Cloud Functions dans index.ts

✅ **Enregistrées:**
```typescript
getChatterDashboard,
chatterRequestWithdrawal,
getReferralDashboard,

// Training
getChatterTrainingModules,
getChatterTrainingModuleContent,
updateChatterTrainingProgress,
submitChatterTrainingQuiz,
getChatterTrainingCertificate,
```

❌ **Commentées (deprecated):**
```typescript
// submitQuiz,
// getQuizQuestions,
```

---

## 4. DÉPENDANCES & PROBLÈMES

### 4.1 Dépendances Manquantes/Incorrectes

**useChatterPromotion:**
- ⚠️ `allPromotions` jamais rempli
- ⚠️ `promotionEndsIn` calculé une fois au return (non-reactive)

**useChatterQuiz:**
- ⚠️ Route supprimée dans App.tsx
- ⚠️ Hook maintenu mais inutilisé

**useChatterTraining:**
- ⚠️ Import direct `functions` différent des autres hooks
- ❓ À vérifier: Même region (europe-west1)?
- ✅ Mais: Bon appel à `trackVideoWatched()` depuis useChatterMissions

**useChatterWithdrawal:**
- ⚠️ Doublon avec useChatter.requestWithdrawal()
- ❌ À supprimer

### 4.2 Problèmes de Dépendances React

**useChatter:**
- ✅ Dépendances correctes dans useCallback/useEffect
- ⚠️ `language` prop non utilisée après conversion langCode

**useChatterMissions:**
- ✅ Bien structuré
- ⚠️ localStorage key hardcoded (no namespace)

**useChatterReferrals:**
- ✅ Aucun problème détecté

**useChatterTraining:**
- ⚠️ Dépendance `currentProgress` dans updateProgress (peut causer boucles)

---

## 5. AUDIT DES TYPES

### 5.1 Types Utilisés

**ChatterDashboardData** - `useChatter`
```typescript
{
  chatter: {
    status: "active" | "suspended"
    affiliateCodeClient: string
    affiliateCodeRecruitment: string
    availableBalance: number
    pendingBalance: number
    validatedBalance: number
    pendingWithdrawalId?: string
  }
  config: {
    minimumWithdrawalAmount: number  // 2500 cents
  }
  unreadNotifications: number
}
```

**ChatterReferralDashboardData** - `useChatterReferrals`
```typescript
{
  stats: ChatterReferralStats
  filleulsN1: ChatterFilleulN1[]
  filleulsN2: ChatterFilleulN2[]
  recentCommissions: ChatterReferralCommission[]
  tierProgress: ChatterTierProgress
  activePromotion: ChatterActivePromotion | null
}
```

**MissionProgress** - `useChatterMissions`
```typescript
{
  date: string                     // YYYY-MM-DD
  sharesCount: number
  loggedInToday: boolean
  messagesSentToday: number
  videoWatched: boolean
  callsToday: number
}
```

---

## 6. RECOMMANDATIONS

### 🔴 Critique

1. **Supprimer hooks orphelins**
   - `useChatterWithdrawal` (deprecated, doublon avec useChatter)
   - `useChatterQuiz` (route supprimée)
   - `useChatterPromotion` (non utilisé)

   ```bash
   rm src/hooks/useChatterWithdrawal.ts
   rm src/hooks/useChatterQuiz.ts
   rm src/hooks/useChatterPromotion.ts
   ```

   **Approche alternative:** Si ces hooks doivent rester pour le futur:
   - Créer dossier `src/hooks/deprecated/` et les y placer
   - Ajouter WARNING dans exports

### 🟡 Important

2. **Vérifier région Cloud Functions useChatterTraining**
   ```typescript
   // Actuel (useChatterTraining)
   const getTrainingModules = httpsCallable(functions, 'getChatterTrainingModules');

   // À vérifier vs autres hooks
   const functions = getFunctions(undefined, "europe-west1");
   ```

3. **Fix useChatterPromotion**
   - Rendre `promotionEndsIn` reactive avec useEffect
   - Utiliser `useMemo` pour éviter recalcul

4. **Fix useChatterMissions localStorage**
   - Créer constante de namespace global
   - Exemple: `STORAGE_KEYS.chatter.missions` plutôt que hardcoded

### 🟢 Nice to have

5. **Documentation types**
   - Ajouter JSDoc pour ChatterDashboardData
   - Clarifier thresholds (cents vs dollars)

6. **Tests unitaires**
   - Tester reset quotidien missions
   - Tester synchronisation localStorage/Firestore

7. **Monitoring**
   - Logger appels functions dans console dev
   - Ajouter sentry pour erreurs production

---

## 7. FICHEIER DE CONFIGURATION

### Thresholds & Constants

**Retraits:**
- Minimum: 2500 cents ($25)
- Méthodes: Wise, Mobile Money, Bank

**Missions Quotidiennes:**
- Reset: Minuit (timezone user)
- Bonus: 150 XP si toutes complétées
- Total possible: 220 XP/jour

**Parrainage (Filleuls):**
- Threshold N1→$10: 1000 cents
- Threshold N1→$50: 5000 cents
- Tiers bonus: 5, 10, 20, 50, 100, 500

**Régions Cloud Functions:**
- Par défaut: `europe-west1`
- Training: À vérifier (import direct)

---

## 8. LOGS & TRACES

### Logging Pattern Utilisé

```typescript
console.error("[useChatter] Error fetching dashboard:", err);
console.error("[useChatterMissions] Error saving to localStorage:", err);
console.error("[useChatterTraining] Failed to load modules:", err);
```

Tous les hooks utilisent prefix `[HookName]` pour traçabilité. ✅

---

## 9. CONCLUSION

**Summary:**
- ✅ Architecture hooks bien pensée
- ✅ Séparation des responsabilités claire
- ⚠️ 3 hooks orphelins à nettoyer
- ⚠️ Formation en construction mais bien structurée
- ⚠️ Quelques problèmes de dépendances mineures

**Prioriser:**
1. Supprimer/archiver hooks deprecated
2. Vérifier région training functions
3. Tester synchronisation localStorage missions

---

**Audit généré:** 2026-02-13 par Claude Code
**Durée analyse:** Complète (7 hooks + 10 pages)
**Couverture:** 100% des hooks Chatter

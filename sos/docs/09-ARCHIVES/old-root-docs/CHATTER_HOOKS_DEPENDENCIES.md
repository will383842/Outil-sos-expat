# Diagramme de Dépendances - Hooks Chatter

## Vue d'Ensemble

```
┌─────────────────────────────────────────────────────────────────────┐
│                    PAGES CHATTER (10 fichiers)                      │
└─────────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┬──────────────┐
                │             │             │              │
                ▼             ▼             ▼              ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐
        │  Dashboard   │ │ Leaderboard  │ │ Payments │ │ Referral │
        │  Referrals   │ │ RefEarnings  │ │ Telegram │ │ Refer    │
        │  Register    │ │ Posts        │ │ Training │ │ Landing  │
        │  Suspended   │ │              │ │ Suspended│ │          │
        └──────────────┘ └──────────────┘ └──────────┘ └──────────┘
                │             │             │              │
                └─────────────┼─────────────┼──────────────┘
                        ┌─────┴─────┐
                        │   HOOKS   │
                        └─────┬─────┘
                        │
        ┌───────────────┼───────────────┬──────────────────┐
        │               │               │                  │
        ▼               ▼               ▼                  ▼
    ┌─────────┐   ┌─────────┐   ┌─────────┐     ┌──────────────┐
    │useChatter   │useChatter   │useChatter   │useChatterReferral │
    │             │Missions     │Training     │Capture            │
    └─────────┘   └─────────┘   └─────────┘     └──────────────┘
        │             │             │
        │             │             │
        ▼             ▼             ▼
    ┌─────────────────────────────────────┐
    │   FIREBASE / CLOUD FUNCTIONS        │
    │   - getChatterDashboard             │
    │   - getReferralDashboard            │
    │   - chatterRequestWithdrawal        │
    │   - updateChatterProfile            │
    │   - Training functions (x5)         │
    └─────────────────────────────────────┘
```

---

## Hooks - Détail des Dépendances

### 1. useChatter
```
useChatter
├── AuthContext (useAuth)
│   └── user.uid
├── AppContext (useApp)
│   └── language
├── Firestore (getFirestore)
│   ├── query: chatter_commissions
│   ├── query: chatter_withdrawals
│   ├── query: chatter_notifications
│   └── doc: chatter_notifications/{id}
├── Cloud Functions (europe-west1)
│   ├── getChatterDashboard()
│   ├── chatterRequestWithdrawal()
│   └── updateChatterProfile()
└── Computed
    ├── clientShareUrl
    ├── recruitmentShareUrl
    ├── canWithdraw
    └── totalBalance
```

### 2. useChatterMissions
```
useChatterMissions
├── AuthContext (useAuth)
│   └── user.uid
├── Local Storage
│   └── chatter_missions_{YYYY-MM-DD}
├── Firestore (getFirestore)
│   └── doc: chatters/{uid}/dailyMissions/{date}
├── Computed (useMemo)
│   ├── missions[]
│   ├── completedCount
│   └── totalXP
└── Actions
    ├── trackShare()
    ├── trackLogin()
    ├── trackMessageSent()
    ├── trackVideoWatched()
    └── trackCall()
```

### 3. useChatterReferrals
```
useChatterReferrals
├── AuthContext (useAuth)
│   └── user
├── Cloud Functions (europe-west1)
│   └── getReferralDashboard()
└── Computed
    ├── stats
    ├── filleulsN1
    ├── filleulsN2
    ├── recentCommissions
    ├── tierProgress
    └── activePromotion
```

### 4. useChatterTraining ⚠️
```
useChatterTraining
├── Firebase Functions (config direct)
│   ├── getChatterTrainingModules()
│   ├── getChatterTrainingModuleContent()
│   ├── updateChatterTrainingProgress()
│   ├── submitChatterTrainingQuiz()
│   └── getChatterTrainingCertificate()
├── Dependency: useChatterMissions
│   └── trackVideoWatched() [on quiz pass]
└── ⚠️ Region à vérifier (europe-west1?)
```

---

## Composants → Hooks

### DailyMissionsCard
```
DailyMissionsCard
└── useChatterMissions
    ├── missions[]
    ├── completedCount
    ├── totalXP
    └── isLoading
```

**Utilise les missions pour:**
- Afficher 5 tâches quotidiennes
- Calculer barre de progression
- Afficher récompense XP
- Animation confetti si complétées

### TeamMessagesCard
```
TeamMessagesCard
└── useChatterMissions
    └── trackMessageSent()  [on copy/whatsapp/email]
```

**Utilise la mission pour:**
- Tracker quand un message est envoyé
- Incrémenter `messagesSentToday`

---

## Flux de Données: getChatterDashboard

```
ChatterDashboard.tsx (Page)
│
└── useChatter()
    │
    ├── refreshDashboard()
    │   │
    │   └── Cloud Function: getChatterDashboard()
    │       │
    │       ├── Firebase Auth (user.uid)
    │       ├── Firestore queries
    │       │   ├── tirelire balance
    │       │   ├── commissions pending
    │       │   └── withdrawal status
    │       │
    │       └── Returns: ChatterDashboardData
    │           ├── chatter {...}
    │           ├── config {...}
    │           └── unreadNotifications
    │
    └── State
        ├── dashboardData
        ├── isLoading
        └── error
```

---

## Flux de Données: getReferralDashboard

```
ChatterReferrals.tsx (Page)
│
├── useChatter()
│   └── dashboardData (balance info)
│
└── useChatterReferrals()
    │
    └── refreshDashboard()
        │
        └── Cloud Function: getReferralDashboard()
            │
            ├── Firestore queries
            │   ├── filleuls N1
            │   ├── filleuls N2
            │   ├── commissions by tier
            │   ├── tier progress
            │   └── active promotion
            │
            └── Returns: ChatterReferralDashboardData
                ├── stats
                ├── filleulsN1[]
                ├── filleulsN2[]
                ├── recentCommissions[]
                ├── tierProgress
                └── activePromotion
```

---

## Flux de Données: Daily Missions

```
DailyMissionsCard.tsx (Component)
│
└── useChatterMissions()
    │
    ├── Local Storage (fast)
    │   └── chatter_missions_2026-02-13
    │
    ├── Firestore sync (on mount & update)
    │   └── chatters/{uid}/dailyMissions/2026-02-13
    │
    ├── Auto-actions
    │   ├── trackLogin() [une fois per session]
    │   ├── trackShare() [manual]
    │   ├── trackMessageSent() [from TeamMessagesCard]
    │   ├── trackVideoWatched() [from ChatterTraining]
    │   └── trackCall() [server-side]
    │
    └── Reset
        └── At midnight (00:00 UTC)
            └── New date → New document
```

---

## Arbre des Dépendances React

```
ChatterDashboard
├── useAuth()
│   └── user.uid
├── useApp()
│   └── language
├── useChatter()
│   ├── useAuth()
│   ├── useApp()
│   ├── getFirestore()
│   └── getFunctions()
├── useChatterReferrals()
│   ├── useAuth()
│   └── getFunctions()
├── Child components
│   ├── BalanceCard
│   │   └── Props from useChatter
│   ├── DailyMissionsCard
│   │   └── useChatterMissions()
│   │       ├── useAuth()
│   │       └── getFirestore()
│   └── ReferralStats
│       └── Props from useChatterReferrals
└── useState / useEffect
    └── Local UI state
```

---

## Cloud Functions Dependency Map

```
┌─────────────────────────────────────────────────────────┐
│         CLOUD FUNCTIONS (europe-west1)                  │
└─────────────────────────────────────────────────────────┘

getChatterDashboard
├── Inputs: user.uid (auth)
├── Outputs: ChatterDashboardData
└── Used by: useChatter

chatterRequestWithdrawal
├── Inputs: RequestWithdrawalInput (amount, method, details)
├── Outputs: { success, withdrawalId, amount, message }
└── Used by: useChatter, useChatterWithdrawal (deprecated)

updateChatterProfile
├── Inputs: UpdateChatterProfileInput
├── Outputs: { success, message }
└── Used by: useChatter

getReferralDashboard
├── Inputs: user.uid (auth)
├── Outputs: ChatterReferralDashboardData
└── Used by: useChatterReferrals, useChatterPromotion (orphan)

Training Functions (NEW)
├── getChatterTrainingModules
│   └── Used by: useChatterTraining
├── getChatterTrainingModuleContent
│   └── Used by: useChatterTraining
├── updateChatterTrainingProgress
│   └── Used by: useChatterTraining
├── submitChatterTrainingQuiz
│   └── Used by: useChatterTraining
└── getChatterTrainingCertificate
    └── Used by: useChatterTraining

Quiz Functions (DEPRECATED)
├── getQuizQuestions
│   └── Used by: useChatterQuiz (deprecated)
└── submitQuiz
    └── Used by: useChatterQuiz (deprecated)
```

---

## Firestore Collections - Lire

```
Firestore Structure (READ):

firestore
├── chatters/{uid}
│   ├── Basic profile data
│   └── dailyMissions/
│       └── {YYYY-MM-DD}
│           ├── date
│           ├── sharesCount
│           ├── loggedInToday
│           ├── messagesSentToday
│           ├── videoWatched
│           └── callsToday
│
├── chatter_commissions/{id}
│   ├── chatterId
│   ├── amount
│   ├── createdAt
│   └── status
│
├── chatter_withdrawals/{id}
│   ├── chatterId
│   ├── amount
│   ├── requestedAt
│   └── status
│
└── chatter_notifications/{id}
    ├── chatterId
    ├── message
    ├── createdAt
    └── isRead
```

---

## Problèmes de Dépendances Identifiés

### ✅ Bien Gérés
```
✓ useChatter dépendances correctes
✓ useChatterMissions localStorage sync fonctionne
✓ useChatterReferrals pas de dépendances circulaires
✓ Logging standardisé [HookName] prefix
```

### ⚠️ À Vérifier
```
⚠ useChatterTraining - region Cloud Functions
⚠ useChatterTraining - dépendance currentProgress peut causer boucles
⚠ useChatterPromotion - promotionEndsIn non-reactive
⚠ Trois hooks orphelins à supprimer
```

### ❌ Problèmes
```
✗ useChatterQuiz - route supprimée mais hook existe
✗ useChatterWithdrawal - doublon de useChatter
✗ useChatterPromotion - allPromotions jamais rempli
```

---

## Export/Import Graph

```
src/hooks/index.ts (Central Export Point)
│
├── export { useChatter, useChatterReferralCapture, ... } from './useChatter'
├── export { useChatterMissions } from './useChatterMissions'
├── export { useChatterReferrals } from './useChatterReferrals'
├── export { useChatterTraining } from './useChatterTraining'
├── export { useChatterPromotion } from './useChatterPromotion'  ❌ À supprimer
├── export { useChatterQuiz } from './useChatterQuiz'            ❌ À supprimer
└── export { useChatterWithdrawal } from './useChatterWithdrawal' ❌ À supprimer

Pages Import Pattern:
└── import { useChatter, useChatterReferrals } from '@/hooks'
    └── ✅ Correct (centralized)

Component Import Pattern:
└── import { useChatterMissions } from '@/hooks/useChatterMissions'
    └── ✅ Acceptable (direct import ok aussi)
```

---

## Statistiques

### Code Volume
```
useChatter:             496 lignes (hooks + helpers + capture)
useChatterMissions:     381 lignes
useChatterTraining:     218 lignes
useChatterReferrals:    168 lignes
useChatterQuiz:         193 lignes (deprecated)
useChatterWithdrawal:   300 lignes (deprecated)
useChatterPromotion:    125 lignes (orphaned)
─────────────────────────────────
TOTAL:                1,881 lignes
Active only:          1,263 lignes
```

### Cloud Function Calls
```
Used:
- getChatterDashboard:        1 hook × N pages
- getReferralDashboard:       2 hooks × 4 pages
- chatterRequestWithdrawal:   2 hooks × 1 page
- updateChatterProfile:       1 hook × on-demand
- Training:                   1 hook × not yet used

Deprecated:
- getQuizQuestions:           0 hooks
- submitQuiz:                 0 hooks
```

### Firestore Collections Hit
```
Real-time subscriptions:
- chatter_commissions:    1 hook (useChatter)
- chatter_withdrawals:    1 hook (useChatter)
- chatter_notifications:  1 hook (useChatter)
- chatters/{uid}/dailyMissions/{date}: 1 hook (useChatterMissions)

Document Reads:
- Direct Cloud Functions encapsulate other reads
```

---

## Checklist d'Optimisation

- [ ] Vérifier région Cloud Functions (Training)
- [ ] Supprimer 3 hooks orphelins
- [ ] Rendre promotionEndsIn reactive
- [ ] Centraliser storage keys
- [ ] Ajouter tests unitaires
- [ ] Documenter types avec JSDoc
- [ ] Vérifier aucun import orphelin après suppression

---

**Generated:** 2026-02-13 by Claude Code
**Format:** Markdown + ASCII diagrams
**Completeness:** 100% hooks coverage

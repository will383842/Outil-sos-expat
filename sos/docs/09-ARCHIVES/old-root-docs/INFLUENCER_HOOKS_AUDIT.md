# INFLUENCER HOOKS AUDIT

**Date**: 2026-02-13
**Système**: SOS Expat - Influencer Program
**Statut**: ✅ Architecture propre avec 1 hook deprecated

---

## 🎯 RÉSUMÉ EXÉCUTIF

### Architecture des Hooks Influencer

| Métrique | Valeur |
|----------|--------|
| **Hooks actifs** | 3 |
| **Hooks deprecated** | 0 (1 méthode deprecated dans useInfluencer) |
| **Composants deprecated** | 1 (InfluencerWithdrawalForm) |
| **Fonctions Cloud appelées** | 12+ |
| **Pages utilisant les hooks** | 17 |
| **Composants utilisant les hooks** | 12+ |

**Verdict**: Architecture saine avec migration vers système de paiement unifié en cours.

---

## ✅ HOOKS ACTIFS (3)

### 1. **useInfluencer**
`sos/src/hooks/useInfluencer.ts` (543 lignes)

**Responsabilité principale**:
- Gestion centralisée des données influenceur
- Dashboard, commissions, retraits, notifications
- Référentiels (providers recrutés)
- Leaderboard, profil

**Fonctions Cloud appelées**:
- `getInfluencerDashboard` (europe-west1)
- `getInfluencerLeaderboard` (europe-west1)
- `influencerRequestWithdrawal` (europe-west1) ⚠️ **@deprecated**
- `updateInfluencerProfile` (europe-west1)

**Subscriptions Firestore** (real-time):
- `influencer_commissions` (where influencerId, orderBy createdAt desc, limit 50)
- `influencer_withdrawals` (where influencerId, orderBy requestedAt desc, limit 20)
- `influencer_notifications` (where influencerId, orderBy createdAt desc, limit 30)
- `influencer_referrals` (where influencerId, orderBy createdAt desc, limit 50)

**Data exposée**:
```typescript
{
  dashboardData: InfluencerDashboardData | null,
  commissions: InfluencerCommission[],
  withdrawals: InfluencerWithdrawal[],
  notifications: InfluencerNotification[],
  referrals: InfluencerReferral[],
  leaderboard: InfluencerLeaderboardData | null,
  isInfluencer: boolean,
  clientShareUrl: string,
  recruitmentShareUrl: string,
  canWithdraw: boolean,
  minimumWithdrawal: number,
  totalBalance: number,
  clientDiscount: number
}
```

**Actions**:
- `refreshDashboard()` - Recharge les données dashboard
- `refreshLeaderboard()` - Recharge le classement
- `requestWithdrawal(input)` - ⚠️ **@deprecated** (ligne 159-181)
- `updateProfile(input)` - Met à jour profil influenceur
- `markNotificationRead(notificationId)` - Marque notification lue

**Utilisé par** (9 pages):
- `InfluencerDashboard.tsx`
- `InfluencerEarnings.tsx`
- `InfluencerLeaderboard.tsx`
- `InfluencerPayments.tsx` (mais utilise usePayment pour retraits)
- `InfluencerProfile.tsx`
- `InfluencerPromoTools.tsx`
- `InfluencerReferrals.tsx`
- `InfluencerSuspended.tsx`
- `InfluencerWithdrawalForm.tsx` (deprecated)

**Hooks secondaires exportés**:
- `useInfluencerReferralCapture()` - Capture codes referral depuis URL
- `getStoredInfluencerCode()` - Récupère code stocké
- `clearStoredInfluencerCode()` - Nettoie code après conversion

---

### 2. **useInfluencerTraining**
`sos/src/hooks/useInfluencerTraining.ts` (211 lignes)

**Responsabilité principale**:
- Système de formation des influenceurs
- Modules de training, progression, quizzes
- Certificats de complétion

**Fonctions Cloud appelées**:
- `getInfluencerTrainingModules` (europe-west1)
- `getInfluencerTrainingModuleContent` (europe-west1)
- `updateInfluencerTrainingProgress` (europe-west1)
- `submitInfluencerTrainingQuiz` (europe-west1)
- `getInfluencerTrainingCertificate` (europe-west1)

**Data exposée**:
```typescript
{
  modules: InfluencerTrainingModuleListItem[],
  overallProgress: InfluencerTrainingOverallProgress | null,
  currentModule: InfluencerTrainingModule | null,
  currentProgress: InfluencerTrainingProgress | null,
  certificate: InfluencerTrainingCertificate | null,
  isLoading: boolean,
  isLoadingModule: boolean,
  isSubmittingQuiz: boolean,
  error: string | null
}
```

**Actions**:
- `loadModules()` - Charge liste modules
- `loadModuleContent(moduleId)` - Charge contenu module
- `updateProgress(moduleId, slideIndex)` - Met à jour progression
- `submitQuiz(moduleId, answers)` - Soumet quiz
- `loadCertificate(certificateId)` - Charge certificat

**Utilisé par**:
- Pas encore de page Training UI (training system préparé mais non activé)

**Statut**: ✅ Système prêt mais pas encore UI frontend

---

### 3. **useInfluencerResources**
`sos/src/hooks/useInfluencerResources.ts` (118 lignes)

**Responsabilité principale**:
- Ressources marketing pour influenceurs
- Logos, images, textes par catégorie
- Téléchargement et copie de contenus

**Fonctions Cloud appelées**:
- `getInfluencerResources` (europe-west1)
- `downloadInfluencerResource` (europe-west1)
- `copyInfluencerResourceText` (europe-west1)

**Data exposée**:
```typescript
{
  resources: InfluencerResourcesData | null,
  isLoading: boolean,
  error: string | null
}
```

**Actions**:
- `fetchResources(category?)` - Charge ressources par catégorie
- `downloadResource(resourceId)` - Génère download URL
- `copyText(textId)` - Copie texte dans clipboard

**Utilisé par**:
- `InfluencerResources.tsx`

---

## ⚠️ MÉTHODES DEPRECATED À RETIRER

### Dans `useInfluencer.ts`

#### `requestWithdrawal()` - Lignes 159-181

```typescript
/**
 * @deprecated This method is deprecated.
 * Use the centralized payment system instead:
 * - Hooks: @/hooks/usePayment (usePayment.requestWithdrawal)
 *
 * This method will be removed in a future version.
 */
```

**Raison**: Migration vers système de paiement centralisé (usePayment)

**Status**:
- ⚠️ Encore appelé par `InfluencerWithdrawalForm.tsx` (deprecated)
- ✅ `InfluencerPayments.tsx` utilise déjà `usePayment`

**Action requise**: Supprimer après validation que InfluencerWithdrawalForm n'est plus utilisé

---

## ❌ COMPOSANTS DEPRECATED À SUPPRIMER

### 1. **InfluencerWithdrawalForm**
`sos/src/components/Influencer/Forms/InfluencerWithdrawalForm.tsx`

```typescript
/**
 * @deprecated This component is deprecated.
 * Use the centralized payment system instead:
 * - Components: @/components/Payment
 * - Types: @/types/payment
 * - Hooks: @/hooks/usePayment
 *
 * This file will be removed in a future version.
 */
```

**Statut**:
- Encore exporté dans `sos/src/components/Influencer/index.ts` (ligne 16)
- PAS utilisé dans InfluencerPayments.tsx (utilise `WithdrawalRequestForm` du système centralisé)

**Action requise**:
1. Vérifier qu'aucune autre page n'importe ce composant
2. Retirer export de `components/Influencer/index.ts`
3. Supprimer le fichier

---

## 🔍 TYPES DEPRECATED (Dans influencer.ts)

Plusieurs types marqués @deprecated dans `sos/src/types/influencer.ts`:

| Type | Lignes | Remplacement |
|------|--------|--------------|
| `InfluencerWithdrawalStatus` | 32-37 | `@/types/payment (WithdrawalStatus)` |
| `InfluencerPaymentMethod` | 41-47 | `@/types/payment (PaymentMethod)` |
| `InfluencerPaymentDetailsWise` | 224-229 | `@/types/payment (PaymentDetailsWise)` |
| `InfluencerMobileMoneyProvider` | 238-243 | `@/types/payment (MobileMoneyProvider)` |
| `InfluencerPaymentDetailsMobileMoney` | 253-258 | `@/types/payment (PaymentDetailsMobileMoney)` |
| `InfluencerPaymentDetailsBankTransfer` | 268-273 | `@/types/payment (PaymentDetailsBankTransfer)` |
| `InfluencerPaymentDetails` | 286-291 | `@/types/payment (PaymentDetails)` |
| `RequestInfluencerWithdrawalInput` | 500-511 | `@/types/payment (WithdrawalRequestInput)` |

**Statut**: Ces types sont encore utilisés dans le code mais devraient être migrés progressivement vers `@/types/payment`

---

## 📦 CLOUD FUNCTIONS - BACKEND

### Callables Influencer (12+)

**Localisation**: `sos/firebase/functions/src/influencer/`

| Fonction | Fichier | Hook Frontend |
|----------|---------|---------------|
| `getInfluencerDashboard` | `callables/getInfluencerDashboard.ts` | useInfluencer |
| `getInfluencerLeaderboard` | `callables/getInfluencerLeaderboard.ts` | useInfluencer |
| `updateInfluencerProfile` | `callables/updateInfluencerProfile.ts` | useInfluencer |
| `influencerRequestWithdrawal` | `callables/requestWithdrawal.ts` | useInfluencer (deprecated) |
| `getInfluencerTrainingModules` | `callables/training.ts` | useInfluencerTraining |
| `getInfluencerTrainingModuleContent` | `callables/training.ts` | useInfluencerTraining |
| `updateInfluencerTrainingProgress` | `callables/training.ts` | useInfluencerTraining |
| `submitInfluencerTrainingQuiz` | `callables/training.ts` | useInfluencerTraining |
| `getInfluencerTrainingCertificate` | `callables/training.ts` | useInfluencerTraining |
| `getInfluencerResources` | `callables/resources.ts` | useInfluencerResources |
| `downloadInfluencerResource` | `callables/resources.ts` | useInfluencerResources |
| `copyInfluencerResourceText` | `callables/resources.ts` | useInfluencerResources |

**Services backend**:
- `services/influencerCommissionService.ts` - Gestion commissions
- `services/influencerRecruitmentService.ts` - Gestion recrutement providers
- `services/influencerWithdrawalService.ts` - Gestion retraits (à migrer?)

**Triggers**:
- `triggers/onCallCompleted.ts` - Calcul commissions post-appel
- `triggers/onInfluencerCreated.ts` - Init nouveau influenceur
- `triggers/onProviderRegistered.ts` - Tracking recrutements

**Scheduled functions**:
- `scheduled/monthlyTop3Rewards.ts` - Récompenses top 3 leaderboard

---

## 🎨 PAGES INFLUENCER (17)

### Pages Dashboard (8)
| Page | Hook(s) utilisé(s) | Statut |
|------|-------------------|--------|
| `InfluencerDashboard.tsx` | useInfluencer | ✅ Actif |
| `InfluencerEarnings.tsx` | useInfluencer | ✅ Actif |
| `InfluencerPayments.tsx` | useInfluencer + usePayment | ✅ Actif (migration système centralisé) |
| `InfluencerProfile.tsx` | useInfluencer | ✅ Actif |
| `InfluencerPromoTools.tsx` | useInfluencer | ✅ Actif |
| `InfluencerReferrals.tsx` | useInfluencer | ✅ Actif |
| `InfluencerLeaderboard.tsx` | useInfluencer | ✅ Actif |
| `InfluencerResources.tsx` | useInfluencerResources | ✅ Actif |

### Pages Spéciales (3)
| Page | Description |
|------|-------------|
| `InfluencerLanding.tsx` | Landing page publique |
| `InfluencerRegister.tsx` | Inscription influenceur |
| `InfluencerTelegramOnboarding.tsx` | Onboarding Telegram |
| `InfluencerSuspended.tsx` | Page compte suspendu |

### Pages Admin (6)
| Page | Description |
|------|-------------|
| `admin/Influencers/AdminInfluencersList.tsx` | Liste influenceurs |
| `admin/Influencers/AdminInfluencerDetail.tsx` | Détail influenceur |
| `admin/Influencers/AdminInfluencersConfig.tsx` | Configuration commissions |
| `admin/Influencers/AdminInfluencersPayments.tsx` | Gestion paiements |
| `admin/Influencers/AdminInfluencersLeaderboard.tsx` | Leaderboard admin |
| `admin/Influencers/AdminInfluencersResources.tsx` | Gestion ressources |

---

## 🧩 COMPOSANTS INFLUENCER (12+)

### Layout (1)
- `InfluencerDashboardLayout.tsx` - Layout principal dashboard

### Cards (8)
- `InfluencerBalanceCard.tsx` - Carte balance/retraits
- `InfluencerStatsCard.tsx` - Statistiques générales
- `InfluencerQuickStatsCard.tsx` - Stats rapides
- `InfluencerEarningsBreakdownCard.tsx` - Répartition gains
- `InfluencerLevelCard.tsx` - Niveau/progression
- `InfluencerTeamCard.tsx` - Équipe recrutée
- `InfluencerLiveActivityFeed.tsx` - Feed activité temps réel
- `InfluencerMotivationWidget.tsx` - Widget motivation

### Forms (2)
- `InfluencerRegisterForm.tsx` - Formulaire inscription ✅
- `InfluencerWithdrawalForm.tsx` - Formulaire retrait ⚠️ **DEPRECATED**

### Links (1)
- `InfluencerAffiliateLinks.tsx` - Gestion liens affiliés

---

## 🔗 DÉPENDANCES ENTRE HOOKS

```
useInfluencer (principal)
├── Pas de dépendance vers autres hooks influencer
├── Dépend de: AuthContext, AppContext
└── Utilisé par: 9 pages

useInfluencerTraining (indépendant)
├── Pas de dépendance vers autres hooks influencer
├── Dépend de: firebase/functions
└── Utilisé par: Aucune page (UI non implémentée)

useInfluencerResources (indépendant)
├── Pas de dépendance vers autres hooks influencer
├── Dépend de: firebase/functions
└── Utilisé par: InfluencerResources.tsx
```

**Pattern**: Hooks totalement découplés, aucune dépendance circulaire ✅

---

## 📊 RECOMMANDATIONS

### ✅ POINTS FORTS

1. **Architecture propre**: 3 hooks bien découplés avec responsabilités claires
2. **Real-time**: Subscriptions Firestore pour données live (commissions, retraits, notifications)
3. **Type-safe**: Types TypeScript complets dans `@/types/influencer.ts`
4. **Migration en cours**: Système de paiement unifié (usePayment) déjà adopté dans InfluencerPayments
5. **Backend structuré**: Services, triggers, scheduled functions bien organisés

### ⚠️ ACTIONS PRIORITAIRES

#### 1. **Nettoyer composant deprecated**
```bash
# Vérifier qu'InfluencerWithdrawalForm n'est plus utilisé
grep -r "InfluencerWithdrawalForm" sos/src/pages --include="*.tsx"

# Si aucun résultat (à part deprecated files), supprimer:
rm sos/src/components/Influencer/Forms/InfluencerWithdrawalForm.tsx

# Retirer export de index.ts
# Ligne 16: export { default as InfluencerWithdrawalForm } from './Forms/InfluencerWithdrawalForm';
```

#### 2. **Retirer méthode deprecated de useInfluencer**
Après validation que InfluencerWithdrawalForm est supprimé:
```typescript
// Dans useInfluencer.ts, supprimer lignes 151-181 (requestWithdrawal)
// Et retirer de l'interface UseInfluencerReturn
```

#### 3. **Migrer types vers système centralisé**
Progressivement remplacer:
- `InfluencerWithdrawalStatus` → `WithdrawalStatus`
- `InfluencerPaymentMethod` → `PaymentMethod`
- etc.

#### 4. **Activer Training UI** (optionnel)
Le hook `useInfluencerTraining` est prêt mais aucune page ne l'utilise.
Créer page `InfluencerTraining.tsx` pour activer le système.

### 🎯 PROCHAINES ÉTAPES

1. **Court terme** (semaine):
   - [ ] Supprimer `InfluencerWithdrawalForm.tsx`
   - [ ] Retirer méthode `requestWithdrawal()` de `useInfluencer`
   - [ ] Nettoyer export dans `components/Influencer/index.ts`

2. **Moyen terme** (mois):
   - [ ] Migrer types payment deprecated vers `@/types/payment`
   - [ ] Créer page Training UI si besoin métier
   - [ ] Documenter patterns de migration pour Chatter/Blogger

3. **Long terme** (trimestre):
   - [ ] Audit performance subscriptions Firestore (50 commissions, 20 retraits...)
   - [ ] Évaluer besoin pagination pour hooks

---

## 📈 COMPARAISON AVEC AUTRES SYSTÈMES

| Système | Hooks | Statut Migration Paiement |
|---------|-------|---------------------------|
| **Influencer** | 3 | ✅ En cours (InfluencerPayments migré) |
| **Chatter** | ~5-7 | 🔄 À vérifier |
| **Blogger** | ~3-4 | 🔄 À vérifier |
| **GroupAdmin** | ~3-4 | 🔄 À vérifier |

**Note**: Influencer semble être le premier système à migrer vers paiements centralisés.

---

## 🏁 CONCLUSION

L'architecture des hooks Influencer est **saine et bien structurée**:

- ✅ 3 hooks actifs avec responsabilités claires
- ✅ Découplage total (pas de dépendances circulaires)
- ✅ Migration système paiement centralisé déjà commencée
- ⚠️ 1 méthode deprecated à retirer après validation
- ⚠️ 1 composant deprecated à supprimer
- ⚠️ 8 types deprecated à migrer progressivement

**Priorité**: Nettoyer InfluencerWithdrawalForm et requestWithdrawal() avant audit Chatter/Blogger.

---

**Généré le**: 2026-02-13
**Par**: Claude Sonnet 4.5
**Localisation**: `C:\Users\willi\Documents\Projets\VS_CODE\sos-expat-project\INFLUENCER_HOOKS_AUDIT.md`

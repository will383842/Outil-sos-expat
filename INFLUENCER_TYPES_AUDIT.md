# INFLUENCER TYPES AUDIT

**Date**: 2026-02-13
**Frontend**: `sos/src/types/influencer.ts`
**Backend**: `sos/firebase/functions/src/influencer/types.ts`

---

## RÉSUMÉ EXÉCUTIF

### Types Frontend: 37 types/interfaces
### Types Backend: 50+ types/interfaces

### Statut Global: ⚠️ INCOHÉRENCES MAJEURES DÉTECTÉES

**Problèmes critiques**:
1. ❌ **Différences structurelles majeures** dans `Influencer` interface (19 champs manquants/différents)
2. ❌ **Types de dates incompatibles** (string vs Timestamp)
3. ❌ **Champs optionnels non alignés** (? mismatch)
4. ⚠️ **Enums partiellement divergents**
5. ✅ **Déprécations cohérentes** (withdrawal/payment types)

---

## 📊 INVENTAIRE DES TYPES

### Types Frontend (37)

**Enums/Types de base (9)**:
- `InfluencerStatus`
- `InfluencerCommissionType`
- `CommissionCalculationType`
- `InfluencerCommissionStatus`
- `InfluencerWithdrawalStatus` (deprecated)
- `InfluencerPaymentMethod` (deprecated)
- `InfluencerPlatform`
- `InfluencerNotificationType`
- `TrainingModuleStatus`
- `TrainingSlideType`
- `InfluencerTrainingCategory`
- `InfluencerResourceCategory`
- `InfluencerMobileMoneyProvider` (deprecated)

**Interfaces principales (15)**:
- `Influencer`
- `InfluencerCommission`
- `InfluencerWithdrawal` (deprecated)
- `InfluencerReferral`
- `InfluencerNotification`
- `InfluencerConfig`
- `InfluencerDashboardData`
- `InfluencerLeaderboardEntry`
- `InfluencerLeaderboardData`
- `InfluencerTrainingModule`
- `InfluencerTrainingProgress`
- `InfluencerTrainingCertificate`
- `InfluencerTrainingModuleListItem`
- `InfluencerTrainingOverallProgress`
- `InfluencerResourceFile`
- `InfluencerResourceText`
- `InfluencerResourcesData`

**Commission Rules V2 (4)**:
- `InfluencerCommissionConditions`
- `InfluencerCommissionRule`
- `InfluencerCapturedRates`
- `InfluencerAntiFraudConfig`
- `InfluencerRateHistoryEntry`

**Input/Output types (9)**:
- `RegisterInfluencerInput`
- `UpdateInfluencerProfileInput`
- `RequestInfluencerWithdrawalInput` (deprecated)
- `SubmitInfluencerTrainingQuizInput`
- `SubmitInfluencerTrainingQuizResult`

**Payment Details (deprecated) (3)**:
- `InfluencerPaymentDetailsWise`
- `InfluencerPaymentDetailsMobileMoney`
- `InfluencerPaymentDetailsBankTransfer`

### Types Backend (50+)

**Tous les types frontend PLUS**:
- `SupportedInfluencerLanguage`
- `InfluencerLevel` (1 | 2 | 3 | 4 | 5)
- `InfluencerWiseDetails`
- `InfluencerMobileMoneyDetails`
- `InfluencerBankDetails`
- `InfluencerPaymentDetails` (union type)
- `InfluencerMonthlyRanking`
- `InfluencerAffiliateClick`
- `InfluencerResource`
- `InfluencerResourceText` (version étendue)
- `InfluencerResourceType`
- `WidgetBanner`
- `WidgetText`
- `InfluencerRecruitedInfluencer`
- `InfluencerPlatformDefinition`
- `DEFAULT_COMMISSION_RULES` (const)
- `DEFAULT_ANTI_FRAUD_CONFIG` (const)
- `DEFAULT_INFLUENCER_CONFIG` (const)
- `INFLUENCER_PLATFORMS` (const)

**Admin input/output (6+)**:
- `AdminGetInfluencersListInput`
- `AdminGetInfluencersListResponse`
- `AdminGetInfluencerDetailResponse`
- `AdminProcessInfluencerWithdrawalInput`
- `AdminUpdateInfluencerStatusInput`

**Callables extended (10+)**:
- `RegisterInfluencerResponse`
- `GetInfluencerDashboardResponse`
- `RequestInfluencerWithdrawalResponse`
- `GetInfluencerLeaderboardResponse`
- `GetInfluencerResourcesInput`
- `GetInfluencerResourcesResponse`
- `DownloadInfluencerResourceInput/Response`
- `CopyInfluencerResourceTextInput/Response`
- `GetInfluencerTrainingModulesResponse`
- `GetInfluencerTrainingModuleContentResponse`
- `SubmitInfluencerTrainingQuizResponse`
- `GetInfluencerTrainingCertificateResponse`

---

## 🔴 INCOHÉRENCES CRITIQUES

### 1. Interface `Influencer` - Différences majeures (19+ champs)

| Champ | Frontend | Backend | Impact |
|-------|----------|---------|--------|
| **id** | `string` | `string` | ✅ OK |
| **odooId** | `number?` | ❌ ABSENT | ⚠️ Frontend a champ supplémentaire |
| **userId** | `string` | ❌ ABSENT | ❌ MANQUANT backend |
| **photoUrl** | ❌ ABSENT | `string?` | ❌ MANQUANT frontend |
| **language** | `string` | `SupportedInfluencerLanguage` | ⚠️ Type différent |
| **additionalLanguages** | ❌ ABSENT | `SupportedInfluencerLanguage[]?` | ❌ MANQUANT frontend |
| **socialLinks** | `Record<string, string>?` | `{ facebook?: string; instagram?: string; ... }` | ⚠️ Structure différente |
| **adminNotes** | ❌ ABSENT | `string?` | ✅ OK (admin-only) |
| **suspendedAt** | `string?` | ❌ ABSENT | ⚠️ Frontend a champ supplémentaire |
| **totalEarned** | `number` | `number` | ✅ OK |
| **totalWithdrawn** | `number` | `number` | ✅ OK |
| **pendingWithdrawalId** | `string?` | `string \| null` | ⚠️ `?` vs `\| null` |
| **totalClicks** | `number` | ❌ ABSENT (renamed `totalClients`) | ⚠️ Renommé |
| **totalReferrals** | `number` | ❌ ABSENT | ⚠️ Renommé |
| **totalClientsReferred** | `number` | ❌ ABSENT (renamed `totalClients`) | ⚠️ Renommé |
| **totalProvidersRecruited** | `number` | ❌ ABSENT (renamed `totalRecruits`) | ⚠️ Renommé |
| **totalClients** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **totalRecruits** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **totalCommissions** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **conversionRate** | `number` | ❌ ABSENT | ⚠️ Frontend a champ supplémentaire |
| **currentMonthEarnings** | `number` | ❌ ABSENT (in `currentMonthStats`) | ⚠️ Structure différente |
| **currentMonthRank** | `number?` | `number \| null` | ⚠️ `?` vs `\| null` |
| **currentMonthStats** | ❌ ABSENT | `{ clients, recruits, earnings, month }` | ❌ MANQUANT frontend |
| **bestRank** | ❌ ABSENT | `number \| null` | ❌ MANQUANT frontend |
| **level** | `1 \| 2 \| 3 \| 4 \| 5?` | `InfluencerLevel` (required) | ⚠️ Optional vs Required |
| **levelProgress** | `number?` | `number` (required) | ⚠️ Optional vs Required |
| **monthlyTopMultiplier** | `number?` | `number` (required) | ⚠️ Optional vs Required |
| **monthlyTopMultiplierMonth** | `string \| null?` | `string \| null` | ⚠️ `?` superflu |
| **bestStreak** | `number?` | `number` (required) | ⚠️ Optional vs Required |
| **currentStreak** | `number` | `number` | ✅ OK |
| **longestStreak** | `number` | ❌ ABSENT (renamed `bestStreak`) | ⚠️ Renommé |
| **lastActivityAt** | `string?` | ❌ ABSENT (split in 2) | ⚠️ Split |
| **lastActivityDate** | ❌ ABSENT | `string \| null` | ❌ MANQUANT frontend |
| **lastLoginAt** | ❌ ABSENT | `Timestamp \| null` | ❌ MANQUANT frontend |
| **recruitedBy** | ❌ ABSENT | `string \| null` | ❌ MANQUANT frontend |
| **recruitedByCode** | ❌ ABSENT | `string \| null` | ❌ MANQUANT frontend |
| **recruitedAt** | ❌ ABSENT | `Timestamp \| null` | ❌ MANQUANT frontend |
| **preferredPaymentMethod** | ❌ ABSENT | `InfluencerPaymentMethod \| null` | ❌ MANQUANT frontend |
| **paymentDetails** | ❌ ABSENT | `InfluencerPaymentDetails \| null` | ❌ MANQUANT frontend |
| **capturedRates** | `InfluencerCapturedRates?` | `InfluencerCapturedRates?` | ✅ OK |
| **termsAccepted** | ❌ ABSENT | `boolean?` | ❌ MANQUANT frontend |
| **termsAcceptedAt** | ❌ ABSENT | `string?` | ❌ MANQUANT frontend |
| **termsVersion** | ❌ ABSENT | `string?` | ❌ MANQUANT frontend |
| **termsType** | ❌ ABSENT | `string?` | ❌ MANQUANT frontend |
| **termsAcceptanceMeta** | ❌ ABSENT | `{...}?` | ❌ MANQUANT frontend |
| **createdAt** | `string` | `Timestamp` | ❌ TYPE INCOMPATIBLE |
| **updatedAt** | `string` | `Timestamp` | ❌ TYPE INCOMPATIBLE |

**Résumé des écarts**:
- ❌ **19 champs manquants** dans le frontend
- ❌ **6 champs supplémentaires** dans le frontend (obsolètes)
- ❌ **5 champs renommés** entre frontend et backend
- ❌ **12 champs avec types incompatibles** (string vs Timestamp, optional mismatch)

---

### 2. Interface `InfluencerCommission`

| Champ | Frontend | Backend | Impact |
|-------|----------|---------|--------|
| **id** | `string` | `string` | ✅ OK |
| **influencerId** | `string` | `string` | ✅ OK |
| **influencerEmail** | ❌ ABSENT | `string` | ❌ MANQUANT frontend |
| **influencerCode** | ❌ ABSENT | `string` | ❌ MANQUANT frontend |
| **type** | `InfluencerCommissionType` | `InfluencerCommissionType` | ✅ OK |
| **baseAmount** | `number` | `number` | ✅ OK |
| **finalAmount** | `number` | ❌ ABSENT (renamed `amount`) | ⚠️ Renommé |
| **amount** | ❌ ABSENT | `number` | ⚠️ Renommé |
| **levelBonus** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **top3Bonus** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **streakBonus** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **monthlyTopMultiplier** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **currency** | ❌ ABSENT | `"USD"` | ❌ MANQUANT frontend |
| **calculationDetails** | ❌ ABSENT | `string` | ❌ MANQUANT frontend |
| **description** | ❌ ABSENT | `string` | ❌ MANQUANT frontend |
| **status** | `InfluencerCommissionStatus` | `InfluencerCommissionStatus` | ✅ OK |
| **referenceId** | `string?` | ❌ ABSENT (replaced by `sourceId`) | ⚠️ Renommé |
| **referenceType** | `'call' \| 'provider'?` | ❌ ABSENT (replaced by `sourceType`) | ⚠️ Renommé |
| **sourceId** | ❌ ABSENT | `string \| null` | ❌ MANQUANT frontend |
| **sourceType** | ❌ ABSENT | `'call_session' \| 'user' \| 'provider' \| null` | ❌ MANQUANT frontend |
| **sourceDetails** | ❌ ABSENT | `{...}?` | ❌ MANQUANT frontend |
| **metadata** | `Record<string, unknown>?` | ❌ ABSENT | ⚠️ Frontend a champ supplémentaire |
| **validatedAt** | `string?` | `Timestamp \| null` | ❌ TYPE INCOMPATIBLE |
| **availableAt** | `string?` | `Timestamp \| null` | ❌ TYPE INCOMPATIBLE |
| **paidAt** | `string?` | `Timestamp \| null` | ❌ TYPE INCOMPATIBLE |
| **cancelledAt** | `string?` | `Timestamp` | ❌ TYPE INCOMPATIBLE |
| **cancellationReason** | `string?` | `string?` | ✅ OK |
| **cancelledBy** | ❌ ABSENT | `string?` | ❌ MANQUANT frontend |
| **withdrawalId** | ❌ ABSENT | `string \| null` | ❌ MANQUANT frontend |
| **adminNotes** | ❌ ABSENT | `string?` | ✅ OK (admin-only) |
| **createdAt** | `string` | `Timestamp` | ❌ TYPE INCOMPATIBLE |
| **updatedAt** | ❌ ABSENT | `Timestamp` | ❌ MANQUANT frontend |

**Résumé des écarts**:
- ❌ **14 champs manquants** dans le frontend
- ❌ **6 renommages** de champs
- ❌ **6 champs avec types incompatibles** (string vs Timestamp)

---

### 3. Interface `InfluencerConfig`

| Champ | Frontend | Backend | Impact |
|-------|----------|---------|--------|
| **id** | ❌ ABSENT | `"current"` | ❌ MANQUANT frontend |
| **isSystemActive** | `boolean?` | `boolean` | ⚠️ Optional vs Required |
| **newRegistrationsEnabled** | `boolean?` | `boolean` | ⚠️ Optional vs Required |
| **withdrawalsEnabled** | `boolean?` | `boolean` | ⚠️ Optional vs Required |
| **trainingEnabled** | `boolean?` | `boolean` | ⚠️ Optional vs Required |
| **clientReferralCommission** | `number` | ❌ ABSENT (renamed) | ⚠️ Renommé |
| **providerRecruitmentCommission** | `number` | ❌ ABSENT (renamed) | ⚠️ Renommé |
| **commissionClientAmount** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **commissionRecruitmentAmount** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **clientDiscountPercent** | `number` | `number` | ✅ OK |
| **minimumWithdrawalAmount** | `number` | `number` | ✅ OK |
| **commissionValidationDays** | `number` | ❌ ABSENT (renamed) | ⚠️ Renommé |
| **commissionReleaseHours** | `number` | ❌ ABSENT (renamed) | ⚠️ Renommé |
| **validationHoldPeriodDays** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **releaseDelayHours** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **recruitmentCommissionWindowMonths** | `number` | ❌ ABSENT (renamed) | ⚠️ Renommé |
| **recruitmentWindowMonths** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **attributionWindowDays** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **leaderboardSize** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **levelBonuses** | ❌ ABSENT | `{ level1, level2, ... }` | ❌ MANQUANT frontend |
| **levelThresholds** | ❌ ABSENT | `{ level2, level3, ... }` | ❌ MANQUANT frontend |
| **top1BonusMultiplier** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **top2BonusMultiplier** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **top3BonusMultiplier** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **streakBonuses** | ❌ ABSENT | `{ days7, days14, ... }` | ❌ MANQUANT frontend |
| **recruitmentCommissionThreshold** | ❌ ABSENT | `number` | ❌ MANQUANT frontend |
| **commissionRules** | `InfluencerCommissionRule[]?` | `InfluencerCommissionRule[]` | ⚠️ Optional vs Required |
| **antiFraud** | `InfluencerAntiFraudConfig?` | `InfluencerAntiFraudConfig` | ⚠️ Optional vs Required |
| **defaultHoldPeriodDays** | `number?` | `number` | ⚠️ Optional vs Required |
| **defaultReleaseDelayHours** | `number?` | `number` | ⚠️ Optional vs Required |
| **rateHistory** | `InfluencerRateHistoryEntry[]?` | `InfluencerRateHistoryEntry[]` | ⚠️ Optional vs Required |
| **version** | `number?` | `number` | ⚠️ Optional vs Required |
| **updatedAt** | `string?` | `Timestamp` | ❌ TYPE INCOMPATIBLE |
| **updatedBy** | `string?` | `string` | ⚠️ Optional vs Required |

**Résumé des écarts**:
- ❌ **15 champs manquants** dans le frontend
- ❌ **6 renommages** de champs
- ⚠️ **11 champs optionnels** dans frontend mais requis dans backend
- ❌ **1 type incompatible** (updatedAt)

---

### 4. Autres interfaces avec écarts significatifs

#### `InfluencerReferral`
- ❌ Frontend manque: `influencerCode`, `influencerEmail`, `providerName`, `providerType`, `isActive`, `lastCommissionAt`, `updatedAt`
- ❌ Frontend a: `commissionWindowEnd` (string) vs Backend: `commissionWindowEndsAt` (Timestamp)
- ❌ Frontend a: `totalCallsReceived` vs Backend: `callsWithCommission`
- ❌ Frontend a: `totalCommissionsEarned` vs Backend: `totalCommissions`

#### `InfluencerNotification`
- ❌ Frontend manque: `titleTranslations`, `messageTranslations`, `actionUrl`, `emailSent`
- ❌ Frontend a: `data?: Record<string, unknown>` vs Backend: `data?: { commissionId?, withdrawalId?, ... }`
- ❌ Frontend type incompatible: `type` enum différent

#### `InfluencerWithdrawal` (deprecated)
- ❌ Statut différent: Frontend a `InfluencerWithdrawalStatus` (5 états) vs Backend (6 états avec `approved`)
- ❌ Frontend manque: `influencerName`, `sourceCurrency`, `targetCurrency`, `exchangeRate`, `convertedAmount`, `commissionIds`, `commissionCount`, `paymentReference`, `wiseTransferId`, `estimatedArrival`, `processedBy`, `completedAt`, `failedAt`, `failureReason`
- ❌ Frontend a: `paymentDetails` vs Backend: `paymentDetailsSnapshot`

---

## ⚠️ PROBLÈMES DE TYPES

### Types de Dates (CRITIQUE)

**Frontend utilise `string`**, **Backend utilise `Timestamp`**

| Interface | Champs concernés |
|-----------|------------------|
| **Influencer** | `createdAt`, `updatedAt`, `suspendedAt`, `lastActivityAt` |
| **InfluencerCommission** | `createdAt`, `validatedAt`, `availableAt`, `paidAt`, `cancelledAt` |
| **InfluencerWithdrawal** | `requestedAt`, `processedAt`, `completedAt`, `rejectedAt`, `failedAt` |
| **InfluencerReferral** | `createdAt`, `commissionWindowEnd` |
| **InfluencerNotification** | `createdAt`, `readAt` |
| **InfluencerConfig** | `updatedAt` |
| **InfluencerCapturedRates** | `capturedAt` |
| **InfluencerRateHistoryEntry** | `changedAt` |
| **InfluencerTrainingProgress** | `startedAt`, `completedAt`, `quizAttempts[].attemptedAt` |
| **InfluencerTrainingCertificate** | `issuedAt` |
| **InfluencerTrainingModule** | `createdAt`, `updatedAt` |

**Impact**: ❌ **INCOMPATIBILITÉ TOTALE** - Le frontend ne peut pas lire directement les documents Firestore sans conversion.

**Solution requise**:
1. Ajouter des fonctions de conversion Timestamp → string dans le backend (callables)
2. OU utiliser `Timestamp` dans le frontend (nécessite import de `firebase/firestore`)
3. OU créer des types de mapping séparés pour les callables

---

### Optionnel vs Null vs Required

| Champ | Frontend | Backend | Problème |
|-------|----------|---------|----------|
| **Influencer.level** | `1\|2\|3\|4\|5?` | `InfluencerLevel` | Optional vs Required |
| **Influencer.levelProgress** | `number?` | `number` | Optional vs Required |
| **Influencer.monthlyTopMultiplier** | `number?` | `number` | Optional vs Required |
| **Influencer.monthlyTopMultiplierMonth** | `string \| null?` | `string \| null` | `?` superflu avec `\| null` |
| **Influencer.pendingWithdrawalId** | `string?` | `string \| null` | `?` vs `\| null` |
| **InfluencerConfig (tous les champs système)** | `boolean?` | `boolean` | Optional vs Required |

**Impact**: ⚠️ Le frontend peut envoyer des valeurs `undefined` là où le backend attend des valeurs non-null.

---

### Structure de données différente

#### socialLinks
- **Frontend**: `Record<string, string>?`
- **Backend**: `{ facebook?: string; instagram?: string; ... }`

**Impact**: ⚠️ Le frontend peut ajouter des clés arbitraires que le backend n'attend pas.

#### currentMonthStats
- **Frontend**: `currentMonthEarnings: number` (champ direct)
- **Backend**: `currentMonthStats: { clients, recruits, earnings, month }` (objet imbriqué)

**Impact**: ❌ Structures incompatibles, nécessite transformation.

---

## ✅ TYPES COHÉRENTS

### Enums identiques
- ✅ `InfluencerStatus` (3 valeurs: active, suspended, banned)
- ✅ `InfluencerCommissionType` (9 valeurs identiques)
- ✅ `CommissionCalculationType` (fixed, percentage, hybrid)
- ✅ `InfluencerCommissionStatus` (pending, validated, available, paid, cancelled)
- ✅ `TrainingModuleStatus` (draft, published, archived)
- ✅ `TrainingSlideType` (text, video, image, checklist, tips)
- ✅ `InfluencerTrainingCategory` (5 valeurs identiques)
- ✅ `InfluencerResourceCategory` (sos_expat, ulixai, founder)

### Enums partiellement divergents
- ⚠️ `InfluencerPlatform`: Frontend (11 valeurs) vs Backend (16 valeurs)
  - Backend ajoute: whatsapp, telegram, snapchat, reddit, discord, forum
- ⚠️ `InfluencerNotificationType`: Frontend (11 types) vs Backend (8 types)
  - Frontend a: welcome, withdrawal_failed, provider_recruited, referral_converted
  - Backend a: rank_achieved, new_referral

### Interfaces V2 Commission Rules
- ✅ `InfluencerCommissionConditions` (identique)
- ✅ `InfluencerCommissionRule` (identique)
- ⚠️ `InfluencerCapturedRates`: Frontend (`capturedAt: string`) vs Backend (`capturedAt: Timestamp`)
- ✅ `InfluencerAntiFraudConfig` (identique)
- ⚠️ `InfluencerRateHistoryEntry`: Frontend (`changedAt: string`) vs Backend (`changedAt: Timestamp`)

### Training System
- ✅ `TrainingSlide` (quasi-identique, sauf translations structure)
- ✅ `TrainingQuizQuestion` (quasi-identique, sauf translations structure)
- ⚠️ `InfluencerTrainingModule`: Types de dates différents
- ⚠️ `InfluencerTrainingProgress`: Types de dates différents
- ⚠️ `InfluencerTrainingCertificate`: Types de dates différents

### Input Types
- ✅ `RegisterInfluencerInput`: Quasi-identique
  - ⚠️ Frontend manque les champs CGU tracking (termsAccepted, termsAcceptedAt, etc.)
  - ⚠️ Backend a `language: SupportedInfluencerLanguage` vs Frontend `language: string`
  - ⚠️ Backend a `additionalLanguages`, `recruiterCode`, `referralCapturedAt`
- ✅ `UpdateInfluencerProfileInput`: Quasi-identique
  - ⚠️ Backend plus complet (photoUrl, preferredPaymentMethod, paymentDetails)
- ⚠️ `RequestInfluencerWithdrawalInput`: Structure similaire mais champs différents

---

## 📊 RECOMMANDATIONS

### 🔴 PRIORITÉ 1 - CRITIQUE (Action immédiate requise)

#### 1. Aligner l'interface `Influencer`
**Problème**: 19 champs manquants + 6 renommages + types incompatibles

**Action**: Mettre à jour le frontend pour correspondre exactement au backend:
```typescript
// Frontend: sos/src/types/influencer.ts
export interface Influencer {
  id: string;
  // Supprimer: odooId, userId

  // Ajouter:
  photoUrl?: string;
  additionalLanguages?: string[]; // ou SupportedInfluencerLanguage[]

  // Renommer:
  totalClicks → totalClients
  totalReferrals → totalCommissions
  totalClientsReferred → totalClients
  totalProvidersRecruited → totalRecruits
  longestStreak → bestStreak

  // Remplacer:
  currentMonthEarnings → currentMonthStats: {
    clients: number;
    recruits: number;
    earnings: number;
    month: string;
  }

  // Ajouter champs manquants:
  bestRank: number | null;
  lastActivityDate: string | null;
  lastLoginAt: string | null; // ou Date?
  recruitedBy: string | null;
  recruitedByCode: string | null;
  recruitedAt: string | null;
  preferredPaymentMethod: InfluencerPaymentMethod | null;
  paymentDetails: InfluencerPaymentDetails | null;

  // Champs CGU (RGPD/eIDAS):
  termsAccepted?: boolean;
  termsAcceptedAt?: string;
  termsVersion?: string;
  termsType?: string;
  termsAcceptanceMeta?: {
    userAgent: string;
    language: string;
    timestamp: number;
    acceptanceMethod: string;
    ipHash?: string;
  };

  // Rendre requis (enlever ?):
  level: 1 | 2 | 3 | 4 | 5;
  levelProgress: number;
  monthlyTopMultiplier: number;
  bestStreak: number;
}
```

#### 2. Résoudre l'incompatibilité des dates
**Problème**: Frontend utilise `string`, Backend utilise `Timestamp`

**Option A - Conversion côté backend** (RECOMMANDÉ):
```typescript
// Backend callables doivent convertir Timestamp → ISO string
function serializeInfluencer(doc: Influencer): InfluencerFrontend {
  return {
    ...doc,
    createdAt: doc.createdAt.toDate().toISOString(),
    updatedAt: doc.updatedAt.toDate().toISOString(),
    lastLoginAt: doc.lastLoginAt?.toDate().toISOString() ?? null,
    // etc.
  };
}
```

**Option B - Utiliser Timestamp dans frontend**:
```typescript
// Frontend
import { Timestamp } from 'firebase/firestore';

export interface Influencer {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // ...
}
```

**Choix**: ✅ **Option A** recommandée car:
- Plus simple pour le frontend (pas besoin d'import Firebase)
- Compatibilité JSON native
- Facilite les tests

#### 3. Aligner `InfluencerCommission`
**Action**: Ajouter les champs manquants dans le frontend:
```typescript
export interface InfluencerCommission {
  id: string;
  influencerId: string;
  influencerEmail: string;      // AJOUTER
  influencerCode: string;       // AJOUTER

  type: InfluencerCommissionType;
  baseAmount: number;
  amount: number;               // RENOMMER finalAmount → amount

  // AJOUTER bonus tracking:
  levelBonus: number;
  top3Bonus: number;
  streakBonus: number;
  monthlyTopMultiplier: number;

  currency: "USD";              // AJOUTER
  calculationDetails: string;   // AJOUTER
  description: string;          // AJOUTER

  status: InfluencerCommissionStatus;

  // RENOMMER:
  sourceId: string | null;      // referenceId → sourceId
  sourceType: 'call_session' | 'user' | 'provider' | null;  // referenceType → sourceType
  sourceDetails?: {             // AJOUTER détails complets
    clientId?: string;
    clientEmail?: string;
    callSessionId?: string;
    callDuration?: number;
    connectionFee?: number;
    discountApplied?: number;
    providerId?: string;
    providerEmail?: string;
    providerType?: "lawyer" | "expat";
    callId?: string;
    recruitmentDate?: string;
    monthsRemaining?: number;
  };

  validatedAt: string | null;
  availableAt: string | null;
  paidAt: string | null;
  withdrawalId: string | null;  // AJOUTER

  cancelledAt?: string;
  cancellationReason?: string;
  cancelledBy?: string;         // AJOUTER

  createdAt: string;
  updatedAt: string;            // AJOUTER
}
```

#### 4. Aligner `InfluencerConfig`
**Action**: Ajouter tous les champs de configuration backend:
```typescript
export interface InfluencerConfig {
  id: "current";                                    // AJOUTER

  // Rendre requis (enlever ?):
  isSystemActive: boolean;
  newRegistrationsEnabled: boolean;
  withdrawalsEnabled: boolean;
  trainingEnabled: boolean;

  // RENOMMER:
  commissionClientAmount: number;                   // clientReferralCommission
  commissionRecruitmentAmount: number;              // providerRecruitmentCommission
  validationHoldPeriodDays: number;                 // commissionValidationDays
  releaseDelayHours: number;                        // commissionReleaseHours
  recruitmentWindowMonths: number;                  // recruitmentCommissionWindowMonths

  clientDiscountPercent: number;
  minimumWithdrawalAmount: number;

  // AJOUTER champs manquants:
  attributionWindowDays: number;
  leaderboardSize: number;

  levelBonuses: {
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };

  levelThresholds: {
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };

  top1BonusMultiplier: number;
  top2BonusMultiplier: number;
  top3BonusMultiplier: number;

  streakBonuses: {
    days7: number;
    days14: number;
    days30: number;
    days100: number;
  };

  recruitmentCommissionThreshold: number;

  // Rendre requis:
  commissionRules: InfluencerCommissionRule[];
  antiFraud: InfluencerAntiFraudConfig;
  defaultHoldPeriodDays: number;
  defaultReleaseDelayHours: number;
  rateHistory: InfluencerRateHistoryEntry[];

  version: number;
  updatedAt: string;
  updatedBy: string;
}
```

---

### ⚠️ PRIORITÉ 2 - IMPORTANTE

#### 5. Ajouter types manquants dans le frontend
```typescript
// AJOUTER dans sos/src/types/influencer.ts

export type SupportedInfluencerLanguage =
  | "fr" | "en" | "es" | "pt" | "ar" | "de" | "it" | "nl" | "zh";

export type InfluencerLevel = 1 | 2 | 3 | 4 | 5;

export type InfluencerResourceType =
  | "logo" | "image" | "text" | "data" | "photo" | "bio" | "quote";

export interface InfluencerMonthlyRanking {
  id: string;
  month: string;
  rankings: Array<{
    rank: number;
    influencerId: string;
    influencerName: string;
    influencerCode: string;
    photoUrl?: string;
    country: string;
    monthlyEarnings: number;
    monthlyClients: number;
    monthlyRecruits: number;
  }>;
  calculatedAt: string;
  isFinalized: boolean;
}

export interface InfluencerAffiliateClick {
  id: string;
  influencerCode: string;
  influencerId: string;
  linkType: "client" | "recruitment";
  landingPage: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  userAgent?: string;
  ipHash: string;
  country?: string;
  converted: boolean;
  conversionId?: string;
  conversionType?: "client_signup" | "provider_signup" | "call_completed";
  clickedAt: string;
  convertedAt?: string;
}

export interface InfluencerRecruitedInfluencer {
  id: string;
  recruiterId: string;
  recruitedId: string;
  recruitedEmail: string;
  recruitedName: string;
  recruitmentCode: string;
  recruitedAt: string;
  commissionWindowEnd: string;
  commissionPaid: boolean;
  commissionId?: string;
  commissionPaidAt?: string;
}

export interface WidgetBanner {
  id: string;
  name: string;
  description?: string;
  category: "header" | "sidebar" | "social" | "email" | "square" | "vertical";
  width: number;
  height: number;
  imageUrl: string;
  thumbnailUrl?: string;
  languages: string[];
  isActive: boolean;
  order: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WidgetText {
  id: string;
  name: string;
  category: "social_post" | "email_signature" | "bio" | "short" | "long";
  platforms?: InfluencerPlatform[];
  content: Record<string, string>;
  placeholderHint?: string;
  isActive: boolean;
  order: number;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}
```

#### 6. Étendre les enums existants
```typescript
// Étendre InfluencerPlatform pour correspondre au backend
export type InfluencerPlatform =
  | 'youtube'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'twitter'
  | 'linkedin'
  | 'blog'
  | 'website'
  | 'podcast'
  | 'newsletter'
  | 'whatsapp'      // AJOUTER
  | 'telegram'      // AJOUTER
  | 'snapchat'      // AJOUTER
  | 'reddit'        // AJOUTER
  | 'discord'       // AJOUTER
  | 'forum'         // AJOUTER
  | 'other';

// Aligner InfluencerNotificationType
export type InfluencerNotificationType =
  | 'commission_earned'
  | 'commission_validated'
  | 'commission_available'
  | 'withdrawal_approved'
  | 'withdrawal_completed'
  | 'withdrawal_rejected'
  | 'withdrawal_failed'      // GARDER (utile)
  | 'rank_achieved'          // AJOUTER
  | 'new_referral'           // AJOUTER
  | 'provider_recruited'     // GARDER (utile)
  | 'referral_converted'     // GARDER (utile)
  | 'status_change'
  | 'system';

// SUPPRIMER 'welcome' (pas dans backend)
```

#### 7. Ajouter les Input/Output types manquants
```typescript
// AJOUTER Response types
export interface RegisterInfluencerResponse {
  success: boolean;
  influencerId: string;
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
  message: string;
}

export interface GetInfluencerDashboardResponse {
  influencer: Omit<Influencer, "paymentDetails" | "adminNotes">;
  recentCommissions: Array<{
    id: string;
    type: InfluencerCommissionType;
    amount: number;
    status: InfluencerCommissionStatus;
    description: string;
    createdAt: string;
  }>;
  monthlyStats: {
    earnings: number;
    clients: number;
    recruits: number;
    rank: number | null;
  };
  unreadNotifications: number;
  config: Pick<InfluencerConfig,
    | "commissionClientAmount"
    | "commissionRecruitmentAmount"
    | "clientDiscountPercent"
    | "minimumWithdrawalAmount"
    | "levelThresholds"
    | "levelBonuses"
  >;
}

export interface RequestInfluencerWithdrawalResponse {
  success: boolean;
  withdrawalId: string;
  amount: number;
  status: InfluencerWithdrawalStatus;
  message: string;
  telegramConfirmationRequired?: boolean;
}

export interface GetInfluencerLeaderboardResponse {
  rankings: Array<{
    rank: number;
    influencerId: string;
    influencerName: string;
    photoUrl?: string;
    country: string;
    monthlyEarnings: number;
    monthlyClients: number;
    isCurrentUser: boolean;
  }>;
  currentUserRank: number | null;
  currentUserStats: {
    monthlyEarnings: number;
    monthlyClients: number;
    monthlyRecruits: number;
  } | null;
  month: string;
}

// Resources
export interface GetInfluencerResourcesInput {
  category?: InfluencerResourceCategory;
}

export interface GetInfluencerResourcesResponse {
  resources: Array<{
    id: string;
    category: InfluencerResourceCategory;
    type: InfluencerResourceType;
    name: string;
    description?: string;
    fileUrl?: string;
    thumbnailUrl?: string;
    fileSize?: number;
    fileFormat?: string;
    dimensions?: { width: number; height: number };
  }>;
  texts: Array<{
    id: string;
    category: InfluencerResourceCategory;
    type: InfluencerResourceType;
    title: string;
    content: string;
  }>;
}

// Training
export interface GetInfluencerTrainingModulesResponse {
  modules: Array<{
    id: string;
    order: number;
    title: string;
    description: string;
    category: InfluencerTrainingCategory;
    coverImageUrl?: string;
    estimatedMinutes: number;
    isRequired: boolean;
    prerequisites: string[];
    progress: {
      isStarted: boolean;
      isCompleted: boolean;
      currentSlideIndex: number;
      totalSlides: number;
      bestScore: number;
    } | null;
  }>;
  overallProgress: {
    completedModules: number;
    totalModules: number;
    completionPercent: number;
    hasCertificate: boolean;
    certificateId?: string;
  };
}

export interface SubmitInfluencerTrainingQuizResponse {
  success: boolean;
  score: number;
  passed: boolean;
  passingScore: number;
  results: Array<{
    questionId: string;
    isCorrect: boolean;
    correctAnswerId: string;
    explanation?: string;
  }>;
  moduleCompleted: boolean;
  certificateId?: string;
  rewardGranted?: {
    type: "bonus";
    bonusAmount?: number;
  };
}
```

---

### ℹ️ PRIORITÉ 3 - AMÉLIORATION

#### 8. Créer un fichier de types partagés
**Problème**: Duplication de code entre frontend et backend

**Solution**: Créer un package commun:
```
sos-expat-project/
├── shared/
│   └── types/
│       ├── influencer.ts         (types communs)
│       ├── influencer-db.ts      (types backend avec Timestamp)
│       └── influencer-api.ts     (types API avec string)
```

**Avantages**:
- Source unique de vérité
- Évite les divergences
- Facilite la maintenance
- TypeScript garantit la cohérence

#### 9. Ajouter validation runtime avec Zod
```typescript
import { z } from 'zod';

export const InfluencerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string().min(1),
  // ...
});

export type Influencer = z.infer<typeof InfluencerSchema>;

// Validation dans les callables:
const input = InfluencerSchema.parse(data);
```

**Avantages**:
- Validation automatique
- Meilleurs messages d'erreur
- Protection contre les données invalides

#### 10. Documentation des transformations
Créer un fichier `sos/firebase/functions/src/influencer/serializers.ts`:
```typescript
import { Timestamp } from 'firebase-admin/firestore';
import type {
  Influencer as InfluencerDB,
  InfluencerCommission as InfluencerCommissionDB
} from './types';
import type {
  Influencer as InfluencerAPI,
  InfluencerCommission as InfluencerCommissionAPI
} from '../../../src/types/influencer';

/**
 * Convertit un document Influencer Firestore vers le format API
 */
export function serializeInfluencer(doc: InfluencerDB): InfluencerAPI {
  return {
    id: doc.id,
    email: doc.email,
    firstName: doc.firstName,
    lastName: doc.lastName,
    phone: doc.phone,
    country: doc.country,
    language: doc.language,
    platforms: doc.platforms,
    bio: doc.bio,
    communitySize: doc.communitySize,
    communityNiche: doc.communityNiche,
    socialLinks: doc.socialLinks as Record<string, string> | undefined,
    affiliateCodeClient: doc.affiliateCodeClient,
    affiliateCodeRecruitment: doc.affiliateCodeRecruitment,
    status: doc.status,
    suspensionReason: doc.suspensionReason,
    availableBalance: doc.availableBalance,
    pendingBalance: doc.pendingBalance,
    validatedBalance: doc.validatedBalance,
    totalEarned: doc.totalEarned,
    totalWithdrawn: doc.totalWithdrawn,
    pendingWithdrawalId: doc.pendingWithdrawalId,
    totalClients: doc.totalClients,
    totalRecruits: doc.totalRecruits,
    conversionRate: calculateConversionRate(doc),
    currentMonthStats: doc.currentMonthStats,
    currentMonthRank: doc.currentMonthRank,
    level: doc.level,
    levelProgress: doc.levelProgress,
    monthlyTopMultiplier: doc.monthlyTopMultiplier,
    monthlyTopMultiplierMonth: doc.monthlyTopMultiplierMonth,
    bestStreak: doc.bestStreak,
    currentStreak: doc.currentStreak,
    lastActivityAt: doc.lastActivityDate,
    capturedRates: doc.capturedRates ? {
      capturedAt: timestampToString(doc.capturedRates.capturedAt),
      version: doc.capturedRates.version,
      rules: doc.capturedRates.rules,
    } : undefined,
    createdAt: timestampToString(doc.createdAt),
    updatedAt: timestampToString(doc.updatedAt),
  };
}

function timestampToString(ts: Timestamp | null | undefined): string | undefined {
  return ts?.toDate().toISOString();
}

function calculateConversionRate(doc: InfluencerDB): number {
  // Implement conversion rate logic
  return 0;
}
```

---

## 📋 CHECKLIST D'IMPLÉMENTATION

### Phase 1 - Critique (1-2 jours)
- [ ] Créer fichier `serializers.ts` avec fonctions de conversion Timestamp → string
- [ ] Mettre à jour interface `Influencer` dans frontend (19 champs)
- [ ] Mettre à jour interface `InfluencerCommission` dans frontend (14 champs)
- [ ] Mettre à jour interface `InfluencerConfig` dans frontend (15 champs)
- [ ] Tester toutes les callables avec les nouveaux types

### Phase 2 - Importante (2-3 jours)
- [ ] Ajouter types manquants: `InfluencerMonthlyRanking`, `InfluencerAffiliateClick`, etc.
- [ ] Étendre enums: `InfluencerPlatform` (+6 valeurs), `InfluencerNotificationType`
- [ ] Ajouter Response types manquants (10+ interfaces)
- [ ] Mettre à jour `RegisterInfluencerInput` avec champs CGU
- [ ] Tester frontend avec les nouveaux types

### Phase 3 - Amélioration (optionnel, 3-5 jours)
- [ ] Créer package `shared/types`
- [ ] Migrer types communs vers le package partagé
- [ ] Configurer build pour partager les types
- [ ] Ajouter validation Zod
- [ ] Documenter les patterns de conversion

---

## 🎯 IMPACT ESTIMÉ

### Risques actuels (sans correction)
1. ❌ **Runtime errors** quand le frontend accède à des champs absents
2. ❌ **Type safety compromise** - TypeScript ne détecte pas les erreurs
3. ❌ **Bugs silencieux** - Données manquantes non détectées
4. ❌ **Difficulté de maintenance** - Confusion sur la source de vérité
5. ❌ **Tests non fiables** - Types incorrects masquent les problèmes

### Bénéfices après correction
1. ✅ **Type safety complet** - Détection des erreurs à la compilation
2. ✅ **IntelliSense précis** - Autocomplétion correcte dans VS Code
3. ✅ **Moins de bugs** - Erreurs détectées avant la production
4. ✅ **Meilleure DX** - Développement plus rapide et sûr
5. ✅ **Code maintenable** - Source unique de vérité

---

## 🔍 TESTS DE VALIDATION

### Tests à effectuer après correction

```typescript
// Test 1: Vérifier que serializeInfluencer fonctionne
const dbInfluencer: InfluencerDB = { /* ... */ };
const apiInfluencer: InfluencerAPI = serializeInfluencer(dbInfluencer);
// ✅ Devrait compiler sans erreur TypeScript

// Test 2: Vérifier que tous les champs sont présents
const keys = Object.keys(apiInfluencer);
// ✅ Devrait avoir tous les champs attendus

// Test 3: Vérifier la conversion de dates
expect(typeof apiInfluencer.createdAt).toBe('string');
expect(apiInfluencer.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

// Test 4: Vérifier la compatibilité avec les callables existants
const callable = httpsCallable<void, GetInfluencerDashboardResponse>(
  functions,
  'getInfluencerDashboard'
);
const result = await callable();
// ✅ result.data devrait correspondre au type Response
```

---

## 📚 ANNEXES

### Tableau récapitulatif des renommages

| Ancien nom (Frontend) | Nouveau nom (Backend) | Raison |
|-----------------------|----------------------|--------|
| `totalClicks` | `totalClients` | Clarity |
| `totalReferrals` | `totalCommissions` | Précision |
| `totalClientsReferred` | `totalClients` | Dédoublonnage |
| `totalProvidersRecruited` | `totalRecruits` | Concision |
| `longestStreak` | `bestStreak` | Cohérence |
| `currentMonthEarnings` | `currentMonthStats.earnings` | Structure |
| `referenceId` | `sourceId` | Clarté |
| `referenceType` | `sourceType` | Clarté |
| `finalAmount` | `amount` | Simplification |
| `clientReferralCommission` | `commissionClientAmount` | Cohérence nommage |
| `providerRecruitmentCommission` | `commissionRecruitmentAmount` | Cohérence nommage |
| `commissionValidationDays` | `validationHoldPeriodDays` | Précision |
| `commissionReleaseHours` | `releaseDelayHours` | Précision |
| `recruitmentCommissionWindowMonths` | `recruitmentWindowMonths` | Concision |

---

**FIN DU RAPPORT**

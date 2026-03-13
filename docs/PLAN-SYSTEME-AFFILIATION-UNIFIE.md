# Plan d'implémentation — Système d'affiliation unifié SOS-Expat v2

> **Date** : 2026-03-13 (mise à jour après audit complet)
> **Auteur** : Claude Code (Opus 4.6)
> **Statut** : En attente de validation
> **Durée estimée** : 48 jours de développement
> **Risque production** : Aucun impact jusqu'à la Phase 12 (cutover avec rollback < 30s)
> **Architecture** : Google Cloud Functions (Firebase) — 3 régions existantes

---

## Table des matières

1. [Contexte et problèmes actuels](#1-contexte-et-problèmes-actuels)
2. [Architecture cible](#2-architecture-cible)
3. [Phase 0 — Audit et snapshot](#phase-0--audit--snapshot-de-lexistant-2-jours)
4. [Phase 1 — Types et structures](#phase-1--types--structures-de-données-3-jours)
5. [Phase 2 — Commission Plans](#phase-2--commission-plans-dans-firestore-2-jours)
6. [Phase 3 — Générateur de code unifié](#phase-3--générateur-de-code-unifié-2-jours)
7. [Phase 4 — Collection commissions unifiée](#phase-4--collection-commissions-unifiée-2-jours)
8. [Phase 5 — Calculateur de commissions](#phase-5--calculateur-de-commissions-unifié-5-jours)
9. [Phase 6 — Triggers shadow mode](#phase-6--triggers-shadow-mode-2-jours)
10. [Phase 7 — Frontend referralStorage + 1 lien](#phase-7--frontend-referralstorage-simplifié--1-lien-3-jours)
11. [Phase 8 — Frontend dashboard unifié](#phase-8--frontend-dashboard-affilié-unifié-3-jours)
12. [Phase 9 — Admin UI](#phase-9--admin-ui-commission-plans--dashboard-global-3-jours)
13. [Phase 10 — Migration données](#phase-10--migration-des-données-existantes-3-jours)
14. [Phase 11 — Shadow mode production](#phase-11--shadow-mode-production-7-jours-minimum)
15. [Phase 12 — Cutover](#phase-12--cutover-2-jours)
16. [Phase 13 — Cleanup code mort](#phase-13--cleanup-code-mort-3-jours)
17. [Phase 14 — Tests end-to-end](#phase-14--tests-end-to-end-complets-2-jours)
18. [Systèmes connexes impactés](#systèmes-connexes-impactés)
19. [Rétrocompatibilité](#rétrocompatibilité)
20. [Procédure de rollback](#procédure-de-rollback)
21. [Checklist de validation finale](#checklist-de-validation-finale)
22. [Inventaire complet des fichiers](#inventaire-complet-des-fichiers)

---

## 1. Contexte et problèmes actuels

### 1.1 — Deux systèmes parallèles

| Système | Location | Collections | Rôles couverts |
|---------|----------|-------------|----------------|
| **Générique** | `src/affiliate/` | `affiliate_commissions` | Clients, providers (fallback) |
| **Chatter** | `src/chatter/` | `chatter_commissions` | Chatters uniquement |
| **Influenceur** | `src/influencer/` | `influencer_commissions` | Influenceurs uniquement |
| **Bloggeur** | `src/blogger/` | `blogger_commissions` | Bloggeurs uniquement |
| **GroupAdmin** | `src/groupAdmin/` | `group_admin_commissions` | Admins groupe uniquement |
| **Partenaire** | `src/partner/` | `partner_commissions` | Partenaires uniquement |

**Guardrail anti-double** : Le trigger générique vérifie 10+ champs role-specific et s'arrête s'il en trouve un. Bombe à retardement — chaque nouveau rôle nécessite un ajout manuel.

### 1.2 — 3 liens par affilié

Chaque affilié a 3 codes et 3 liens :
- **Client** (`/ref/{role}/CODE`) — recruter des clients
- **Recrutement** (`/rec/{role}/REC-CODE`) — recruter d'autres affiliés
- **Provider** (`/prov/{role}/PROV-CODE`) — recruter des prestataires

Soit **12 routes URL** (3 types x 4 rôles), **12 clés localStorage**, confusion UX, referrals perdus quand le mauvais lien est utilisé.

### 1.3 — Impact Cloud Functions

- **~298 fonctions** liées à l'affiliation sur **~659 fonctions totales** (45%)
- us-central1 à **80% de quota vCPU**
- Chaque nouveau rôle = ~1200 lignes de code dupliqué, 8+ fichiers, 1 déploiement

### 1.4 — Systèmes de discount éparpillés

| Rôle | Discount client | Configuration | Location |
|------|----------------|---------------|----------|
| GroupAdmin | -$5 fixe | `group_admin_config/current.clientDiscountAmount` | Backend + checkout |
| Influenceur | -5% | `influencer_config/current.clientDiscountPercent` | Backend + checkout |
| Partenaire | Configurable (fixe/%) | `partners/{id}.discountConfig` | Backend + checkout |
| Chatter | **AUCUN** | — | — |
| Blogger | **AUCUN** | — | — |
| Client/Provider | **AUCUN** | — | — |

### 1.5 — Taux figés à vie (Lifetime Rate Lock)

Le système actuel fige les taux de commission à l'inscription via `lockedRates`. Ce mécanisme est **critique** et doit être préservé :
- `snapshotLockedRates(role)` capture les taux du plan actif à la date d'inscription
- Les champs `lockedRates`, `rateLockDate`, `commissionPlanId`, `commissionPlanName` sont stockés **en permanence**
- L'admin peut overrider les `lockedRates` à tout moment via `adminUpdateLockedRates`
- **Priorité de calcul** : `lockedRates` > `commissionPlanId` > plan par défaut du rôle

### 1.6 — Rôles sans système complet

| Rôle | Code affilié | Commissions | Discount client | Peut être référé |
|------|-------------|-------------|-----------------|-------------------|
| Client | Générique seulement | $2/$1 basique | Non | Oui |
| Avocat | Générique seulement | $2/$1 basique | Non | Oui |
| Expatrié | Générique seulement | $2/$1 basique | Non | Oui |
| Chatter | 3 codes spécifiques | Complet (7 types) | **Non** | Oui |
| Captain Chatter | Sous-rôle chatter | Chatter + tiers + quality | **Non** | Oui |
| Influenceur | 3 codes spécifiques | Complet | 5% | Oui |
| Bloggeur | 3 codes spécifiques | Complet | **Non** | Oui |
| AdminGroupe | 3 codes spécifiques | Complet (N1/N2) | $5 | Oui |
| Partenaire | 1 code admin | Custom % | Configurable | Oui |

---

## 2. Architecture cible

### 2.1 — Principes fondamentaux

> **1 utilisateur = 1 code affilié unique = 1 lien `/r/CODE`**
> **Les commissions sont déterminées par un `commissionPlan` configurable par rôle ET par utilisateur**
> **L'action de l'inscrit détermine la commission, pas le lien cliqué**
> **Chaque plan peut inclure un discount pour les filleuls clients**
> **Les taux peuvent être figés à vie (Lifetime Rate Lock) ET modifiés individuellement par admin**

### 2.2 — Avant / Après

| Aspect | Avant (6 systèmes) | Après (1 système) |
|--------|---------------------|---------------------|
| Collections commissions | 7 séparées | **1 seule** (`commissions`) |
| Codes par affilié | 3 (client + rec + provider) | **1 seul** |
| Liens par affilié | 3 URLs | **1 seul** (`/r/CODE`) |
| Routes URL | 12 + locale = 24 | **2** (`/r/:code` + `/:locale/r/:code`) + legacy redirects |
| localStorage | 12 clés | **1 clé** (`sos_referral`) |
| Générateurs de codes | 4 fichiers | **1 fichier** |
| Triggers onCallCompleted | 6 en parallèle | **1 seul** |
| Triggers onSubscription | 2 séparés | **Intégré** dans le système unifié |
| Discount client | 3 configs séparées | **Intégré** dans le commission plan |
| Ajouter un rôle | ~1200 lignes, 8+ fichiers | **1 document Firestore, 0 code** |
| Personnalisation par user | Modifier du code | **1 champ Firestore** (`commissionPlanId`) |
| Changer commissions en cours | Modifier lockedRates manuellement | **Dropdown admin** → nouveau plan actif immédiatement |

### 2.3 — Tous les rôles couverts

| Rôle | Plan par défaut | Lien | Commission client | Discount filleul |
|------|----------------|------|-------------------|------------------|
| Client | `client_v1` | `/r/CODE` | $2/$1 par appel | Configurable |
| Avocat | `provider_v1` | `/r/CODE` | $2/$1 par appel | Configurable |
| Expatrié | `provider_v1` | `/r/CODE` | $2/$1 par appel | Configurable |
| Chatter | `chatter_v1` | `/r/CODE` | $10/$5 + N1/N2 + bonus | Configurable |
| Captain | `captain_v1` | `/r/CODE` | $10/$5 + captain tiers | Configurable |
| Influenceur | `influencer_v1` | `/r/CODE` | $10/$5 + streaks | 5% (configurable) |
| Bloggeur | `blogger_v1` | `/r/CODE` | $10/$5 fixe | Configurable |
| AdminGroupe | `groupadmin_v1` | `/r/CODE` | $5/$3 + N1/N2 | $5 (configurable) |
| Partenaire | `partner_v1` | `/r/CODE` | 15% custom | Configurable |
| **Futur rôle X** | `x_v1` (admin crée) | `/r/CODE` | Configurable | Configurable |

### 2.4 — Flux simplifié

```
1. INSCRIPTION
   Peu importe le rôle → 1 seul code affilié généré
   Plan de commission assigné selon le rôle
   Taux figés à vie (lockedRates snapshot)

2. REFERRAL CAPTURE
   /r/CODE → localStorage: sos_referral = "CODE"
   L'utilisateur s'inscrit comme ce qu'il veut
   Le type de commission est déterminé par L'ACTION, pas le lien

3. APPEL PAYÉ
   1 seul trigger onCallCompleted :
     → Trouve le referrer du client
     → Charge le commissionPlan du referrer
     → Vérifie lockedRates (priorité sur le plan)
     → Calcule la commission selon les rules
     → Applique discount au client si configuré
     → Crée 1 doc dans `commissions`
     → Si depth > 0 → cascade N1/N2

4. ABONNEMENT PROVIDER
   1 seul trigger onSubscription :
     → Trouve le referrer du provider
     → Calcule la commission d'abonnement
     → Crée 1 doc dans `commissions`

5. ADMIN OVERRIDE (à tout moment)
   → Change commissionPlanId du user
   → OU modifie lockedRates individuellement
   → Les NOUVELLES commissions utilisent les nouveaux taux
   → Les anciennes commissions restent inchangées
```

### 2.5 — Personnalisation à 4 niveaux

```
NIVEAU 1 — Par rôle (plan par défaut)
  Tous les chatters → "chatter_v1" → $10 par appel client

NIVEAU 2 — Par sous-groupe (plan custom)
  Les captains → "captain_v1" → $10 + bonus captain tiers
  Les top performers → "chatter_vip" → $15 par appel

NIVEAU 3 — Par utilisateur individuel (plan dédié)
  Jean Dupont → "custom_jean_dupont" → $20 + 20% recurring

NIVEAU 4 — Override ponctuel (lockedRates)
  Marie Martin → lockedRates.commissionClientAmountLawyer = 2500 ($25)
  (Override SANS changer de plan — utile pour 1 taux spécifique)
```

```
// Priorité de calcul dans le commissionCalculator :
1. user.lockedRates[clé_spécifique]     ← Admin override OU taux figés à l'inscription
2. commissionPlan.rules[type]            ← Plan assigné (default ou custom)
3. getDefaultPlanForRole(role)           ← Fallback : plan par défaut du rôle
4. LOG ERROR + skip                      ← Jamais de crash
```

---

## Phase 0 — Audit & snapshot de l'existant (2 jours)

**Objectif** : Photographier l'état actuel pour vérifier à 100% qu'on ne perd RIEN.

**Impact production** : AUCUN (lecture seule)

### 0.1 — Export des commissions

```
Fichier : src/scripts/audit/snapshotCurrentState.ts

Exporter dans un fichier JSON :
  - chatter_commissions (count + sum par statut + par type)
  - chatter_referral_commissions (legacy, count + sum)
  - influencer_commissions (count + sum par statut)
  - blogger_commissions (count + sum par statut)
  - group_admin_commissions (count + sum par statut)
  - affiliate_commissions (count + sum par statut + par type)
  - partner_commissions (count + sum par statut)

Par affilié :
  - userId, role, totalEarned, availableBalance, pendingBalance
  - Nombre de filleuls, nombre de commissions par type
  - lockedRates (si présent)
  - commissionPlanId (si présent)
  - monthlyTopMultiplier (si présent)

Total global :
  - Somme de toutes les commissions par statut (pending, validated, held, available, paid, cancelled)
  - Nombre total de commissions
  - Nombre total d'affiliés par rôle
```

### 0.2 — Export des codes affiliés

```
Fichier : src/scripts/audit/snapshotAffiliateCodes.ts

Exporter :
  - Tous les users avec affiliateCode (générique)
  - Tous les users avec affiliateCodeClient
  - Tous les users avec affiliateCodeRecruitment
  - Tous les users avec affiliateCodeProvider
  - Tous les partners avec affiliateCode

Vérifications :
  [ ] Aucun code en double (collision check sur les 5 champs)
  [ ] Chaque affilié actif a au moins 1 code
  [ ] Format valide pour chaque code
```

### 0.3 — Export des referrals

```
Fichier : src/scripts/audit/snapshotReferrals.ts

Exporter pour chaque user :
  - referredBy, referredByUserId
  - referredByChatterId, chatterReferredBy
  - referredByInfluencerId, influencerReferredBy
  - referredByBlogger, bloggerReferredBy
  - referredByGroupAdmin, groupAdminReferredBy
  - partnerReferredBy, partnerReferredById
  - providerRecruitedByChatter, providerRecruitedByChatterId
  - providerRecruitedByBlogger, providerRecruitedByBloggerId
  - providerRecruitedByGroupAdmin, providerRecruitedByGroupAdminId
  - recruitedByInfluencer, influencerCode

Vérifications :
  [ ] Chaque referredByUserId pointe vers un user existant
  [ ] Chaque referredByChatterId pointe vers un chatter existant
  [ ] Pas de self-referral (referredByUserId !== userId)
  [ ] Pas de circular referral (A->B->A)
```

### 0.4 — Export des clics + recruited providers

```
Fichier : src/scripts/audit/snapshotAffiliateClicks.ts

Clics depuis :
  - chatter_affiliate_clicks
  - influencer_affiliate_clicks
  - blogger_affiliate_clicks
  - group_admin_clicks (nom différent !)
  - affiliate_clicks
  - partner_affiliate_clicks

Recruited providers depuis :
  - chatter_recruited_providers
  - blogger_recruited_providers
  - influencer_referrals (NOM DIFFÉRENT — pas "influencer_recruited_providers")
  - group_admin_recruited_providers
```

### 0.5 — Export config discount actuel

```
Fichier : src/scripts/audit/snapshotDiscountConfig.ts

Exporter :
  - group_admin_config/current.clientDiscountAmount
  - influencer_config/current.clientDiscountPercent
  - Tous les partners/{id}.discountConfig
  - Tous les coupons actifs dans la collection coupons
```

### 0.6 — Livrable Phase 0

```
snapshots/
  snapshot_commissions_YYYYMMDD.json
  snapshot_codes_YYYYMMDD.json
  snapshot_referrals_YYYYMMDD.json
  snapshot_clicks_YYYYMMDD.json
  snapshot_recruited_providers_YYYYMMDD.json
  snapshot_discounts_YYYYMMDD.json
  snapshot_telegram_bonus_YYYYMMDD.json   // AJOUTÉ V2.1 : chatter_telegram_bonus collection
  snapshot_tier_bonuses_YYYYMMDD.json     // AJOUTÉ V2.1 : tierBonusesPaid flags + milestones
  snapshot_summary.json          <- totaux pour comparaison rapide
```

### Tests de validation Phase 0

```
[ ] Le nombre total de commissions exportées == le nombre en Firestore
[ ] La somme totale des montants == le montant en Firestore
[ ] 0 code en double entre toutes les collections
[ ] 0 self-referral
[ ] 0 referral orphelin (pointe vers un user supprimé)
[ ] 4 collections recruited_providers exportées
[ ] Configs discount documentées
```

---

## Phase 1 — Types & structures de données (3 jours)

**Objectif** : Définir les types TypeScript et la structure Firestore.

**Impact production** : AUCUN (fichiers additifs)

### 1.1 — Types unifiés

```
Créer : src/unified/types.ts
```

```typescript
// ================================================================
// COMMISSION PLAN — Structure complète avec discount + captain tiers
// ================================================================

export interface CommissionPlan {
  id: string;                       // "chatter_v1", "blogger_v1", etc.
  name: string;                     // "Plan Chatter Standard"
  description: string;
  targetRoles: string[];            // ["chatter"] ou ["*"]
  isDefault: boolean;               // Plan par défaut pour ce rôle

  rules: CommissionPlanRules;
  bonuses: CommissionPlanBonuses;
  discount: CommissionPlanDiscount;  // NOUVEAU : discount pour les filleuls
  withdrawal: CommissionPlanWithdrawal;

  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;                // UID admin
  version: number;                  // Incrémenté à chaque update
}

export interface CommissionPlanRules {
  signup_bonus: {
    enabled: boolean;
    amount: number;                 // cents
  };
  client_call: {
    enabled: boolean;
    type: "fixed" | "percentage";
    amounts?: {                     // si type=fixed
      lawyer: number;               // cents
      expat: number;                // cents
    };
    rate?: number;                  // si type=percentage (0.15 = 15%)
  };
  recruitment_call: {
    enabled: boolean;
    depth: number;                  // 0=pas de cascade, max 5
    depthAmounts: number[];         // [100, 50] = N1 $1, N2 $0.50
  };
  activation_bonus: {
    enabled: boolean;
    amount: number;                 // cents
    afterNthCall: number;           // déclenché après le Nème appel du recruté
  };
  provider_recruitment: {
    enabled: boolean;
    amounts: {                      // CORRIGÉ : montant par type de provider
      lawyer: number;               // cents
      expat: number;                // cents
    };
    windowMonths: number;           // durée de la fenêtre (1-24)
  };
  recruit_bonus: {
    enabled: boolean;
    amount: number;                 // quand ton recruté recrute quelqu'un qui s'active
  };
  n1_recruit_bonus: {              // AJOUTÉ : N2 gagne quand le recruté de N1 s'active
    enabled: boolean;
    amount: number;                 // cents
  };
  subscription_commission: {        // AJOUTÉ : commission sur abonnement provider
    enabled: boolean;
    type: "fixed" | "percentage";
    firstMonthAmount?: number;      // cents (fixe)
    renewalAmount?: number;         // cents (fixe)
    rate?: number;                  // pourcentage (0-1)
    maxMonths?: number;             // 0 = illimité
  };
  referral_milestones: {            // AJOUTÉ V2.1 : paliers one-time par nb filleuls qualifiés
    enabled: boolean;               // chatters uniquement actuellement
    qualificationThreshold: number; // cents, minimum gagné par le filleul pour être "qualifié" (2000 = $20)
    milestones: ReferralMilestone[];
  };
  captain_bonus: {
    enabled: boolean;
    callAmount: number;             // cents par appel d'équipe (remplace n1/n2 pour captain)
    tiers: CaptainTier[];           // AJOUTÉ : système de paliers mensuel (reset chaque mois)
    qualityBonus: {                 // AJOUTÉ : bonus qualité mensuel
      enabled: boolean;
      amount: number;               // cents
      minActiveRecruits: number;    // minimum recruits actifs requis
      minTeamCommissions: number;   // cents, minimum commissions équipe
    };
  };
  promo_multiplier: {               // AJOUTÉ V2.1 : promotions temporaires (GroupAdmin)
    enabled: boolean;               // multiplicateur appliqué aux commissions
    // Résolu via groupAdminPromotionService.getBestPromoMultiplier()
    // Le plan stocke juste le flag ; la promo elle-même est dans admin_config
  };
}

export interface ReferralMilestone {
  minQualifiedReferrals: number;    // seuil de filleuls qualifiés
  bonusAmount: number;              // cents (one-time, jamais reset)
  name?: string;                    // "5 filleuls", "10 filleuls"
}

export interface CaptainTier {
  name: string;                     // "Bronze", "Argent", "Or", "Platine", "Diamant"
  minTeamCalls: number;             // seuil d'appels équipe (mensuel, reset chaque mois)
  bonusAmount: number;              // cents
}

// ================================================================
// DISCOUNT — Remise pour les clients qui utilisent le lien affilié
// ================================================================

export interface CommissionPlanDiscount {
  enabled: boolean;                 // activer le discount pour ce plan
  type: "fixed" | "percentage";     // type de remise
  value: number;                    // cents (fixe) ou 1-100 (pourcentage)
  maxDiscountCents?: number;        // plafond pour type percentage
  label?: string;                   // "Remise spéciale" (affiché au client)
  labelTranslations?: Record<string, string>; // i18n
  appliesToServices?: string[];     // ["lawyer_call", "expat_call"] ou vide = tout
  expiresAfterDays?: number;        // 0 = pas d'expiration, sinon N jours après inscription
}

// ================================================================
// BONUSES — Top 3 avec distinction cash vs multiplicateur
// ================================================================

export interface CommissionPlanBonuses {
  levels: boolean;                  // Niveaux 1-5
  streaks: boolean;                 // Bonus streaks
  top3: {                           // CORRIGÉ : structure riche au lieu de boolean
    enabled: boolean;
    type: "cash" | "multiplier";    // cash = $200/$100/$50, multiplier = 2x/1.5x/1.15x
    cashAmounts?: number[];         // [20000, 10000, 5000] si type=cash (cents)
    multipliers?: number[];         // [2.0, 1.5, 1.15] si type=multiplier
    minTotalEarned?: number;        // cents, minimum pour être éligible
  };
  captain: boolean;                 // Système capitaine (tiers + quality)
  weeklyChallenges: boolean;        // Défis hebdomadaires
  telegramBonus: {                  // AJOUTÉ : $50 bonus Telegram
    enabled: boolean;
    amount: number;                 // cents (5000 = $50)
    unlockThreshold: number;        // cents, commissions requises pour débloquer (15000 = $150)
  };
}

export interface CommissionPlanWithdrawal {
  minimumAmount: number;            // cents (ex: 3000 = $30)
  fee: number;                      // cents (ex: 300 = $3)
  holdPeriodHours: number;          // 0-720 (30 jours max)
}

// ================================================================
// UNIFIED COMMISSION
// ================================================================

export type CommissionType =
  | "client_call"
  | "signup_bonus"
  | "recruitment_call"
  | "activation_bonus"
  | "provider_recruitment"
  | "recruit_bonus"
  | "n1_recruit_bonus"
  | "subscription_commission"        // AJOUTÉ
  | "subscription_renewal"           // AJOUTÉ
  | "captain_call"                   // AJOUTÉ (remplace n1/n2 pour captain)
  | "captain_tier_bonus"             // AJOUTÉ
  | "captain_quality_bonus"          // AJOUTÉ
  | "referral_milestone"             // AJOUTÉ V2.1 : one-time bonus palier filleuls qualifiés
  | "bonus_level"
  | "bonus_streak"
  | "bonus_top3"
  | "bonus_weekly_challenge"
  | "bonus_telegram"
  | "manual_adjustment";

export type CommissionStatus =
  | "pending"       // En attente de validation
  | "validated"     // Validé (ancien système), mappé vers held
  | "held"          // Gelé (holdPeriod)
  | "available"     // Disponible pour retrait
  | "paid"          // Payé
  | "cancelled";    // Annulé

export interface UnifiedCommission {
  id: string;

  // QUI GAGNE
  referrerId: string;               // UID de l'affilié
  referrerRole: string;             // "chatter", "blogger", etc.
  referrerCode: string;             // "JEAN1A2B3C"

  // QUI A GÉNÉRÉ L'ACTION
  refereeId: string;                // UID de celui qui a agi
  refereeRole: string;              // "client", "lawyer", "chatter"

  // TYPE
  type: CommissionType;
  subType?: string;                 // "n1" | "n2" | "n3" pour recruitment_call

  // SOURCE
  sourceId?: string;                // callSessionId, userId, subscriptionId, etc.
  sourceType?: string;              // "call_session" | "registration" | "subscription"

  // MONTANT
  planId: string;                   // "chatter_v1" — traçabilité
  planVersion: number;              // version du plan au moment du calcul
  calculationType: string;          // "fixed" | "percentage" | "locked_rate"
  baseAmount?: number;              // montant de base (pour percentage)
  rateApplied?: number;             // taux appliqué
  lockedRateUsed?: boolean;         // AJOUTÉ : true si lockedRates a pris le dessus
  multiplierApplied?: number;       // AJOUTÉ : monthlyTopMultiplier influenceur
  amount: number;                   // montant final en cents
  currency: string;                 // "USD"

  // STATUT
  status: CommissionStatus;
  holdUntil?: Timestamp;

  // METADATA
  createdAt: Timestamp;
  validatedAt?: Timestamp;          // AJOUTÉ : compatibilité ancien système
  availableAt?: Timestamp;
  paidAt?: Timestamp;
  payoutId?: string;
  cancelledAt?: Timestamp;
  cancelReason?: string;

  // MIGRATION
  _migratedFrom?: string;          // "chatter_commissions", etc.
  _migratedAt?: Timestamp;
}

// ================================================================
// COMMISSION EVENTS — Tous les événements déclencheurs
// ================================================================

export type CommissionEvent =
  | {
      type: "call_completed";
      callSession: {
        id: string;
        clientId: string;
        providerId: string;
        providerType: "lawyer" | "expat";
        amount: number;             // montant facturé (pour calcul %)
        connectionFee: number;      // frais de connexion
        duration: number;
        isPaid: boolean;
      };
      shadowMode?: boolean;
    }
  | {
      type: "user_registered";
      userId: string;
      role: string;
      referralCode?: string;
      referralCapturedAt?: string;
      shadowMode?: boolean;
    }
  | {
      type: "provider_registered";
      userId: string;
      providerType: "lawyer" | "expat";
      recruitmentCode?: string;     // CORRIGÉ : code fourni par le frontend
      // Fallback legacy fields :
      providerRecruitedByChatter?: string;
      providerRecruitedByBlogger?: string;
      recruitedByInfluencer?: boolean;
      influencerCode?: string;
      providerRecruitedByGroupAdmin?: string;
      shadowMode?: boolean;
    }
  | {
      type: "subscription_created";  // AJOUTÉ
      subscriptionId: string;
      providerId: string;
      planId: string;
      amount: number;               // montant de l'abonnement en cents
      billingPeriod: "monthly" | "yearly";
      shadowMode?: boolean;
    }
  | {
      type: "subscription_renewed";  // AJOUTÉ
      subscriptionId: string;
      providerId: string;
      renewalMonth: number;
      amount: number;
      shadowMode?: boolean;
    };

export interface ShadowResult {
  commissions: Array<{
    referrerId: string;
    type: CommissionType;
    subType?: string;
    amount: number;
  }>;
  totalAmount: number;
  discountApplied?: number;         // AJOUTÉ : discount calculé
}

// ================================================================
// REFERRAL RESOLUTION
// ================================================================

export interface ReferralResolution {
  userId: string;
  email: string;
  role: string;
  affiliateCode: string;
  commissionPlanId: string;
  lockedRates?: Record<string, number>;  // AJOUTÉ
  monthlyTopMultiplier?: number;         // AJOUTÉ : pour influenceurs
  resolvedVia: "unified" | "legacy_client" | "legacy_recruitment" | "legacy_provider" | "partner";
}

export interface CascadeNode {
  userId: string;
  role: string;
  affiliateCode: string;
  commissionPlanId: string;
  lockedRates?: Record<string, number>;
  isCaptain?: boolean;              // AJOUTÉ : si captain, utilise captain_call
  depth: number;                    // 0=direct, 1=N1, 2=N2
}
```

### 1.2 — Validateurs de plans

```
Créer : src/unified/validators.ts
```

```typescript
export function validateCommissionPlan(plan: Partial<CommissionPlan>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!plan.name?.trim()) errors.push("Nom requis");
  if (!plan.targetRoles?.length) errors.push("Au moins 1 rôle cible requis");

  // Rules validation
  if (plan.rules) {
    const r = plan.rules;
    if (r.signup_bonus?.amount < 0) errors.push("signup_bonus.amount >= 0");
    if (r.client_call?.type === "fixed") {
      if ((r.client_call.amounts?.lawyer ?? 0) < 0) errors.push("client_call.amounts.lawyer >= 0");
      if ((r.client_call.amounts?.expat ?? 0) < 0) errors.push("client_call.amounts.expat >= 0");
    }
    if (r.client_call?.type === "percentage") {
      if ((r.client_call.rate ?? 0) < 0 || (r.client_call.rate ?? 0) > 1) {
        errors.push("client_call.rate entre 0 et 1");
      }
    }
    if (r.recruitment_call?.depth < 0 || r.recruitment_call?.depth > 5) {
      errors.push("recruitment_call.depth entre 0 et 5");
    }
    if (r.recruitment_call?.enabled && r.recruitment_call?.depth > 0) {
      if (r.recruitment_call.depthAmounts?.length !== r.recruitment_call.depth) {
        errors.push("depthAmounts.length doit == depth");
      }
    }
    if (r.provider_recruitment?.windowMonths < 1 || r.provider_recruitment?.windowMonths > 24) {
      errors.push("provider_recruitment.windowMonths entre 1 et 24");
    }
    if (r.activation_bonus?.afterNthCall < 1) {
      errors.push("activation_bonus.afterNthCall >= 1");
    }
    // Subscription validation
    if (r.subscription_commission?.type === "percentage") {
      if ((r.subscription_commission.rate ?? 0) < 0 || (r.subscription_commission.rate ?? 0) > 1) {
        errors.push("subscription_commission.rate entre 0 et 1");
      }
    }
    // Captain tiers validation
    if (r.captain_bonus?.enabled && r.captain_bonus?.tiers?.length) {
      for (const tier of r.captain_bonus.tiers) {
        if (tier.minTeamCalls < 0) errors.push(`Captain tier ${tier.name}: minTeamCalls >= 0`);
        if (tier.bonusAmount < 0) errors.push(`Captain tier ${tier.name}: bonusAmount >= 0`);
      }
    }
  }

  // Discount validation
  if (plan.discount?.enabled) {
    if (plan.discount.type === "percentage" && (plan.discount.value < 0 || plan.discount.value > 100)) {
      errors.push("discount.value entre 0 et 100 pour type percentage");
    }
    if (plan.discount.type === "fixed" && plan.discount.value < 0) {
      errors.push("discount.value >= 0 pour type fixed");
    }
  }

  // Bonuses top3 validation
  if (plan.bonuses?.top3?.enabled) {
    if (plan.bonuses.top3.type === "cash" && (!plan.bonuses.top3.cashAmounts || plan.bonuses.top3.cashAmounts.length !== 3)) {
      errors.push("bonuses.top3.cashAmounts doit avoir exactement 3 valeurs");
    }
    if (plan.bonuses.top3.type === "multiplier" && (!plan.bonuses.top3.multipliers || plan.bonuses.top3.multipliers.length !== 3)) {
      errors.push("bonuses.top3.multipliers doit avoir exactement 3 valeurs");
    }
  }

  // Withdrawal validation
  if (plan.withdrawal) {
    if (plan.withdrawal.minimumAmount < 0) errors.push("withdrawal.minimumAmount >= 0");
    if (plan.withdrawal.fee < 0) errors.push("withdrawal.fee >= 0");
    if (plan.withdrawal.holdPeriodHours < 0 || plan.withdrawal.holdPeriodHours > 720) {
      errors.push("withdrawal.holdPeriodHours entre 0 et 720");
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### Tests de validation Phase 1

```
Créer : src/unified/__tests__/types.test.ts
Créer : src/unified/__tests__/validators.test.ts

[ ] Un plan valide passe la validation
[ ] Un plan avec montant négatif échoue
[ ] Un plan avec depth=3 et depthAmounts=[100, 50] échoue (longueur mismatch)
[ ] Un plan avec windowMonths=0 échoue
[ ] Un plan avec nom vide échoue
[ ] Un plan avec rate > 1 échoue
[ ] Un plan avec depth > 5 échoue
[ ] Un plan avec discount percentage > 100 échoue
[ ] Un plan avec top3 cash sans 3 valeurs échoue
[ ] Un plan captain avec tier.bonusAmount négatif échoue
[ ] Tous les 8 plans par défaut passent la validation
```

---

## Phase 2 — Commission Plans dans Firestore (2 jours)

**Objectif** : Créer les plans dans Firestore et les callables admin.

**Impact production** : AUCUN (documents additifs, pas lus par l'ancien système)

### 2.1 — Service de plans

```
Créer : src/unified/planService.ts
```

Fonctions :
- `getPlan(planId)` — Cache in-memory 5 minutes, retourne null si introuvable (JAMAIS crash)
- `getDefaultPlanForRole(role)` — Query `commission_plans WHERE targetRoles contains role AND isDefault == true`
- `getDefaultPlanIdForRole(role)` — Retourne juste l'ID
- `getAllPlans()` — Pour l'admin UI
- `createPlan(plan)` — Validation + vérification pas de doublon nom + retourne planId
- `updatePlan(planId, updates)` — Validation + log historique dans `commission_plan_history/{id}`
- `duplicatePlan(planId, newName)` — Copie un plan existant
- `deletePlan(planId)` — INTERDIT si des users sont assignés (query + guard)
- `assignPlanToUser(userId, planId)` — Update user doc + log changement
- `countUsersOnPlan(planId)` — Pour l'admin UI
- `getEffectiveRate(user, commissionType, providerType?)` — **NOUVEAU** : résout le taux effectif avec priorité lockedRates > plan > default

### 2.2 — Plans par défaut (8 plans)

```
Créer : src/scripts/seedCommissionPlans.ts
```

#### `commission_plans/client_v1`
```
name: "Plan Client Standard"
targetRoles: ["client"]
isDefault: true
rules:
  signup_bonus: { enabled: true, amount: 200 }
  client_call: { enabled: true, type: "fixed", amounts: { lawyer: 200, expat: 100 } }
  recruitment_call: { enabled: false, depth: 0, depthAmounts: [] }
  activation_bonus: { enabled: false, amount: 0, afterNthCall: 2 }
  provider_recruitment: { enabled: false, amounts: { lawyer: 0, expat: 0 }, windowMonths: 6 }
  recruit_bonus: { enabled: false, amount: 0 }
  n1_recruit_bonus: { enabled: false, amount: 0 }
  subscription_commission: { enabled: false, type: "fixed", firstMonthAmount: 0, renewalAmount: 0, maxMonths: 0 }
  captain_bonus: { enabled: false, callAmount: 0, tiers: [], qualityBonus: { enabled: false, amount: 0, minActiveRecruits: 0, minTeamCommissions: 0 } }
bonuses: { levels: false, streaks: false, top3: { enabled: false, type: "cash", cashAmounts: [], multipliers: [] }, captain: false, weeklyChallenges: false, telegramBonus: { enabled: false, amount: 0, unlockThreshold: 0 } }
discount: { enabled: false, type: "fixed", value: 0 }
withdrawal: { minimumAmount: 3000, fee: 300, holdPeriodHours: 24 }
```

#### `commission_plans/provider_v1`
```
name: "Plan Prestataire Standard"
targetRoles: ["lawyer", "expat", "provider"]
isDefault: true
rules:
  (identique à client_v1)
discount: { enabled: false, type: "fixed", value: 0 }
```

#### `commission_plans/chatter_v1`
```
name: "Plan Chatter Standard"
targetRoles: ["chatter"]
isDefault: true
rules:
  signup_bonus: { enabled: true, amount: 200 }
  client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } }
  recruitment_call: { enabled: true, depth: 2, depthAmounts: [100, 50] }
  activation_bonus: { enabled: true, amount: 500, afterNthCall: 2 }
  provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 }
  recruit_bonus: { enabled: true, amount: 100 }
  n1_recruit_bonus: { enabled: true, amount: 100 }
  subscription_commission: { enabled: false, type: "fixed", firstMonthAmount: 0, renewalAmount: 0, maxMonths: 0 }
  referral_milestones:
    enabled: true
    qualificationThreshold: 2000    // $20 minimum gagné par le filleul
    milestones:
      - { minQualifiedReferrals: 5, bonusAmount: 1500, name: "5 filleuls" }
      - { minQualifiedReferrals: 10, bonusAmount: 3500, name: "10 filleuls" }
      - { minQualifiedReferrals: 20, bonusAmount: 7500, name: "20 filleuls" }
      - { minQualifiedReferrals: 50, bonusAmount: 25000, name: "50 filleuls" }
      - { minQualifiedReferrals: 100, bonusAmount: 60000, name: "100 filleuls" }
      - { minQualifiedReferrals: 500, bonusAmount: 400000, name: "500 filleuls" }
  captain_bonus: { enabled: false, callAmount: 0, tiers: [], qualityBonus: { enabled: false, amount: 0, minActiveRecruits: 0, minTeamCommissions: 0 } }
  promo_multiplier: { enabled: false }
bonuses:
  levels: true
  streaks: true
  top3: { enabled: true, type: "cash", cashAmounts: [20000, 10000, 5000], minTotalEarned: 20000 }
  captain: true
  weeklyChallenges: true
  telegramBonus: { enabled: true, amount: 5000, unlockThreshold: 15000 }
discount: { enabled: false, type: "fixed", value: 0 }
withdrawal: { minimumAmount: 3000, fee: 300, holdPeriodHours: 24 }
```

#### `commission_plans/captain_v1`
```
name: "Plan Captain Chatter"
targetRoles: ["captainChatter"]
isDefault: true
rules:
  (identique à chatter_v1 SAUF) :
  captain_bonus:
    enabled: true
    callAmount: 300               // $3 avocat, $2 expat (remplace N1/N2 pour captain)
    tiers:
      - { name: "Bronze", minTeamCalls: 50, bonusAmount: 2500 }
      - { name: "Argent", minTeamCalls: 100, bonusAmount: 5000 }
      - { name: "Or", minTeamCalls: 200, bonusAmount: 10000 }
      - { name: "Platine", minTeamCalls: 500, bonusAmount: 20000 }
      - { name: "Diamant", minTeamCalls: 1000, bonusAmount: 40000 }
    qualityBonus:
      enabled: true
      amount: 2000                // $20
      minActiveRecruits: 10
      minTeamCommissions: 10000   // $100
```

#### `commission_plans/influencer_v1`
```
name: "Plan Influenceur Standard"
targetRoles: ["influencer"]
isDefault: true
rules:
  signup_bonus: { enabled: true, amount: 200 }
  client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } }
  recruitment_call: { enabled: false, depth: 0, depthAmounts: [] }
  activation_bonus: { enabled: false, amount: 0, afterNthCall: 2 }
  provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 }
  recruit_bonus: { enabled: false, amount: 0 }
  n1_recruit_bonus: { enabled: false, amount: 0 }
  subscription_commission: { enabled: false, type: "fixed", firstMonthAmount: 0, renewalAmount: 0, maxMonths: 0 }
  captain_bonus: { enabled: false, callAmount: 0, tiers: [], qualityBonus: { enabled: false, amount: 0, minActiveRecruits: 0, minTeamCommissions: 0 } }
bonuses:
  levels: true, streaks: true
  top3: { enabled: true, type: "multiplier", multipliers: [2.0, 1.5, 1.15] }
  captain: false, weeklyChallenges: false
  telegramBonus: { enabled: true, amount: 5000, unlockThreshold: 15000 }
discount: { enabled: true, type: "percentage", value: 5, label: "Remise affilié", labelTranslations: { fr: "5% de remise", en: "5% discount" } }
withdrawal: { minimumAmount: 3000, fee: 300, holdPeriodHours: 24 }
```

#### `commission_plans/blogger_v1`
```
name: "Plan Bloggeur Standard"
targetRoles: ["blogger"]
isDefault: true
rules:
  signup_bonus: { enabled: true, amount: 200 }
  client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } }
  recruitment_call: { enabled: false, depth: 0, depthAmounts: [] }
  provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 }
  (reste disabled)
bonuses: { levels: false, streaks: false, top3: { enabled: false }, captain: false, weeklyChallenges: false, telegramBonus: { enabled: false, amount: 0, unlockThreshold: 0 } }
discount: { enabled: false, type: "fixed", value: 0 }
withdrawal: { minimumAmount: 3000, fee: 300, holdPeriodHours: 24 }
```

#### `commission_plans/groupadmin_v1`
```
name: "Plan Admin Groupe Standard"
targetRoles: ["groupAdmin"]
isDefault: true
rules:
  signup_bonus: { enabled: true, amount: 200 }
  client_call: { enabled: true, type: "fixed", amounts: { lawyer: 500, expat: 300 } }
  recruitment_call: { enabled: true, depth: 2, depthAmounts: [100, 50] }
  activation_bonus: { enabled: true, amount: 500, afterNthCall: 2 }
  provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 }
  recruit_bonus: { enabled: true, amount: 100 }
  n1_recruit_bonus: { enabled: true, amount: 100 }
  referral_milestones: { enabled: false, qualificationThreshold: 0, milestones: [] }
  (captain + subscription disabled)
  promo_multiplier: { enabled: true }    // AJOUTÉ V2.1 : promos temporaires via groupAdminPromotionService
bonuses: { levels: false, streaks: false, top3: { enabled: false }, captain: false, weeklyChallenges: false, telegramBonus: { enabled: false, amount: 0, unlockThreshold: 0 } }
discount: { enabled: true, type: "fixed", value: 500, label: "Remise groupe", labelTranslations: { fr: "5$ de remise", en: "$5 discount" } }
withdrawal: { minimumAmount: 3000, fee: 300, holdPeriodHours: 24 }
```

#### `commission_plans/partner_v1`
```
name: "Plan Partenaire Standard"
targetRoles: ["partner"]
isDefault: true
rules:
  signup_bonus: { enabled: false, amount: 0 }
  client_call: { enabled: true, type: "percentage", rate: 0.15 }
  (tout le reste disabled)
discount: { enabled: false, type: "fixed", value: 0 }
  NOTE: Les partenaires ont un discountConfig INDIVIDUEL (pas via le plan)
  Car chaque partenaire peut avoir un discount différent (gardé tel quel)
withdrawal: { minimumAmount: 3000, fee: 300, holdPeriodHours: 24 }
```

### 2.3 — Callables admin

```
Créer : src/unified/callables/adminCommissionPlans.ts

Fonctions exportées (Cloud Functions) :
  adminGetCommissionPlans         -> getAllPlans()
  adminGetCommissionPlan          -> getPlan(planId)
  adminCreateCommissionPlan       -> createPlan(data) + validation
  adminUpdateCommissionPlan       -> updatePlan(planId, updates) + historique
  adminDuplicateCommissionPlan    -> duplicatePlan(planId, newName)
  adminDeleteCommissionPlan       -> deletePlan(planId) + guard users > 0
  adminAssignPlanToUser           -> assignPlanToUser(userId, planId) + log
  adminUpdateUserLockedRates      -> UNIFIÉ : update lockedRates d'un user individuel
  adminGetPlanHistory             -> query commission_plan_history
  adminGetPlanUsers               -> query users WHERE commissionPlanId == planId (paginé)
```

### Tests de validation Phase 2

```
Créer : src/unified/__tests__/planService.test.ts

[ ] getPlan retourne le plan correct
[ ] getPlan retourne null si plan inexistant (pas de crash)
[ ] getPlan cache fonctionne (2 appels rapides = 1 lecture Firestore)
[ ] getDefaultPlanForRole("chatter") retourne chatter_v1
[ ] getDefaultPlanForRole("unknown_role") retourne null
[ ] getEffectiveRate avec lockedRates -> retourne le lockedRate
[ ] getEffectiveRate sans lockedRates -> retourne le taux du plan
[ ] getEffectiveRate sans plan -> retourne le taux du plan par défaut
[ ] createPlan avec données valides cree le document
[ ] createPlan avec données invalides rejette avec erreurs
[ ] updatePlan modifie le plan + crée entrée dans commission_plan_history
[ ] deletePlan avec users assignés refuse avec message clair
[ ] assignPlanToUser met à jour le user + log changement
[ ] adminUpdateUserLockedRates modifie les taux individuels
[ ] Chaque rôle a exactement 1 plan isDefault=true
```

---

## Phase 3 — Générateur de code unifié (2 jours)

**Impact production** : AUCUN (fichiers additifs)

### 3.1 — Générateur

```
Créer : src/unified/codeGenerator.ts
```

```typescript
/**
 * Génère un code affilié unique basé sur le prénom et l'UID.
 * Format : PRENOM (4 chars max, nettoyé) + UID suffix (6 chars)
 * Exemple : "JEAN1A2B3C"
 * Synchrone, 0 requête Firestore, garanti unique (UID unique).
 */
export function generateUnifiedAffiliateCode(firstName: string, uid: string): string {
  const cleanName = firstName
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 4);

  const prefix = cleanName.length >= 2 ? cleanName : (cleanName + "XX").slice(0, 2);
  const uidSuffix = uid.slice(-6).toUpperCase();

  return prefix + uidSuffix;
}

export function isValidUnifiedCode(code: string): boolean {
  if (!code || typeof code !== "string") return false;
  if (code.length < 6 || code.length > 12) return false;
  if (code.includes("-")) return false;  // Ancien format (REC-, PROV-)
  return /^[A-Z0-9]+$/i.test(code);
}
```

### 3.2 — Résolveur universel

```
Créer : src/unified/codeResolver.ts
```

Ordre de résolution (du plus récent au legacy) :
1. `users WHERE affiliateCode == code` (nouveau système unifié)
2. `users WHERE affiliateCode == baseCode` (si code avait préfixe)
3. `users WHERE affiliateCodeClient == code` (ancien système)
4. `users WHERE affiliateCodeClient == baseCode`
5. `users WHERE affiliateCodeRecruitment == code`
6. `users WHERE affiliateCodeProvider == code`
7. `partners WHERE affiliateCode == code`
8. `partners WHERE affiliateCode == baseCode`

Où `baseCode = deriveClientCode(code)` :
- `"REC-JEAN456"` -> `"JEAN456"`
- `"PROV-INF-MARIE123"` -> `"MARIE123"`
- `"PROV-BLOG-JEAN1A2B3C"` -> `"BLOG-JEAN1A2B3C"`
- `"JEAN1A2B3C"` -> `"JEAN1A2B3C"` (déjà un baseCode)

### 3.3 — Migrateur de code par user

```
Créer : src/unified/codeMigrator.ts
```

Fonction `migrateUserAffiliateCode(userId)` :
1. Lire le user
2. S'il a déjà un `affiliateCode` unifié (nouveau format sans tirets) -> skip
3. Sinon : prendre `affiliateCodeClient` || `generateUnifiedAffiliateCode()`
4. Écrire `affiliateCode` + `commissionPlanId` sur le user doc
5. Snapshot `lockedRates` depuis le plan actif (si pas déjà présent)
6. NE PAS supprimer les anciens champs (rétrocompatibilité)

---

## Phase 4 — Collection `commissions` unifiée (2 jours)

**Impact production** : AUCUN (collection additif)

### 4.1 — Commission writer

```
Créer : src/unified/commissionWriter.ts
```

Fonctions :
- `createUnifiedCommission(data)` :
  - Valide les champs obligatoires
  - Anti-duplicate : check (referrerId + sourceId + type + subType) dans les 5 dernières minutes
  - Crée le document dans `commissions/{id}`
  - Met à jour les compteurs du referrer avec `FieldValue.increment()` :
    - `users/{referrerId}.totalEarned += amount`
    - `users/{referrerId}.pendingBalance += amount` (si status=held)
    - `users/{referrerId}.availableBalance += amount` (si status=available)
  - **Notification hook** : appelle `dispatchCommissionNotification(commission)` :
    - Détermine la collection notification selon `referrerRole`
    - Crée la notification multilingue (9 langues)
    - Si chatter → appelle aussi `sendChatterNotification()` (FCM push)
  - Retourne commissionId

- `cancelCommission(commissionId, reason)` :
  - Vérifie status != "paid"
  - Met status = "cancelled"
  - Décrémente les compteurs du referrer

- `releaseHeldCommission(commissionId)` :
  - Vérifie status == "held"
  - Met status = "available"
  - Transfère : pendingBalance -= amount, availableBalance += amount

### 4.2 — Indexes Firestore

```
Ajouter dans firestore.indexes.json :

1. commissions (referrerId ASC, createdAt DESC)
2. commissions (referrerId ASC, status ASC, createdAt DESC)
3. commissions (referrerId ASC, type ASC, createdAt DESC)
4. commissions (referrerRole ASC, status ASC, createdAt DESC)
5. commissions (status ASC, holdUntil ASC)
6. commissions (sourceId ASC, type ASC, subType ASC)
7. commissions (refereeId ASC, type ASC)
8. commissions (referrerRole ASC, createdAt DESC)    // admin dashboard par rôle
```

---

## Phase 5 — Calculateur de commissions unifié (5 jours)

**LE coeur du système.** 1 calculateur remplace 6 services.

**Impact production** : AUCUN (code additif, pas appelé en prod)

### 5.1 — Referral resolver

```
Créer : src/unified/referralResolver.ts
```

- `findReferrer(userId)` :
  - Nouveau champ : `referredByUserId`
  - Fallback anciens champs : `referredByChatterId`, `referredByInfluencerId`, `referredByBlogger`, `referredByGroupAdmin`, `partnerReferredById`
  - Charge le profil + commissionPlanId + lockedRates + monthlyTopMultiplier
  - Retourne `ReferralResolution | null`

- `findProviderRecruiter(providerId)` : **NOUVEAU**
  - Cherche dans `recruited_providers` (nouveau) d'abord
  - Fallback dans les 4 anciennes collections :
    - `chatter_recruited_providers` WHERE providerId == id AND windowEnd > now
    - `blogger_recruited_providers` WHERE providerId == id AND windowEnd > now
    - `influencer_referrals` WHERE providerId == id AND windowEnd > now (NOM DIFFÉRENT)
    - `group_admin_recruited_providers` WHERE providerId == id AND windowEnd > now

- `buildCascadeChain(userId, maxDepth)` :
  - Protection anti-boucle : Set de userIds déjà visités
  - Charge `isCaptain` pour chaque node (si captain → `captain_call` au lieu de `recruitment_call`)

### 5.2 — Discount resolver

```
Créer : src/unified/discountResolver.ts
```

**NOUVEAU** : Résout le discount à appliquer au client lors du paiement.

```typescript
export async function resolveAffiliateDiscount(
  clientId: string,
  originalPrice: number,
  serviceType: string
): Promise<DiscountResult> {
  // 1. Trouver qui a référé ce client
  const referrer = await findReferrer(clientId);
  if (!referrer) return { hasDiscount: false, ... };

  // 2. Charger le plan du referrer
  const plan = await getPlan(referrer.commissionPlanId);
  if (!plan?.discount?.enabled) return { hasDiscount: false, ... };

  // 3. Vérifier que le service est applicable
  if (plan.discount.appliesToServices?.length &&
      !plan.discount.appliesToServices.includes(serviceType)) {
    return { hasDiscount: false, ... };
  }

  // 4. Vérifier expiration (si expiresAfterDays configuré)
  // ...

  // 5. Calculer le discount
  let discountAmount = 0;
  if (plan.discount.type === "fixed") {
    discountAmount = Math.min(plan.discount.value / 100, originalPrice);
  } else {
    discountAmount = Math.round((originalPrice * plan.discount.value / 100) * 100) / 100;
    if (plan.discount.maxDiscountCents) {
      discountAmount = Math.min(discountAmount, plan.discount.maxDiscountCents / 100);
    }
  }

  return {
    hasDiscount: true,
    discountAmount,
    originalPrice,
    finalPrice: originalPrice - discountAmount,
    label: plan.discount.label,
    referrerCode: referrer.affiliateCode,
    referrerId: referrer.userId,
    planId: plan.id,
  };
}
```

**Intégration** : Remplace les 3 lookups séparés dans `createPaymentIntent.ts` :
- ~~groupAdminReferredBy → group_admin_config → $5~~
- ~~influencerReferredBy → influencer_config → 5%~~
- ~~partnerReferredById → partnerDiscountService → custom~~
- **→ 1 seul appel** : `resolveAffiliateDiscount(clientId, price, service)`

### 5.3 — Handler call_completed (le plus critique)

```
Créer : src/unified/handlers/handleCallCompleted.ts
```

```
GARDES :
  G1. Appel payé ? (isPaid == true)
  G2. Durée > 60 secondes ?
  G3. Anti-duplicate : commission déjà créée pour ce sourceId + type ?

COMMISSION DIRECTE (client_call) :
  1. Trouver le referrer du client (findReferrer)
  2. Self-referral check (referrer != client ET referrer != provider)
  3. Charger le plan du referrer (getPlan)
  4. Résoudre le taux effectif :
     a. lockedRates[commissionClientAmountLawyer] ? → utiliser (calculationType="locked_rate")
     b. Sinon plan.rules.client_call
     c. Si type=fixed : montant = amounts[providerType]
     d. Si type=percentage : montant = Math.round(callAmount * rate)
  5. Appliquer monthlyTopMultiplier si influenceur (multiplierApplied = multiplicateur)
  6. Créer commission (createUnifiedCommission)

CASCADE N1/N2 (recruitment_call OU captain_call) :
  7. Si plan.rules.recruitment_call.enabled ET depth > 0 :
     - buildCascadeChain(referrerId, depth)
     - Pour chaque niveau :
       a. Si node.isCaptain → type="captain_call", montant=captain_bonus.callAmount
       b. Sinon → type="recruitment_call", subType="n1"/"n2", montant=depthAmounts[level]
       c. Résoudre lockedRates du parent (priorité sur plan)

ACTIVATION BONUS :
  8. Si plan.rules.activation_bonus.enabled :
     - Compter commissions client_call du recruté dans collection unifiée
     - Si count == afterNthCall : créer commission activation_bonus
     - Check idempotence : flag activationBonusPaid sur le recruté
     - Si N1 du recruteur existe ET n1_recruit_bonus.enabled → bonus pour N2

PROVIDER RECRUITMENT :
  9. findProviderRecruiter(providerId)
     - Si trouvé ET dans la fenêtre (windowEnd > now) :
       - Anti-double : skip si même recruteur a aussi référé le client (GUARD existant)
       - Résoudre montant : lockedRates > plan.rules.provider_recruitment.amounts[providerType]
       - Créer commission type="provider_recruitment"

RECRUIT BONUS :
  10. Si plan.rules.recruit_bonus.enabled :
      - Vérifier flag recruitBonusPaid
      - Créer commission recruit_bonus pour le recruteur
```

### 5.4 — Handler user_registered

```
Créer : src/unified/handlers/handleUserRegistered.ts
```

```
1. Générer affiliateCode = generateUnifiedAffiliateCode(firstName, uid)
2. Déterminer planId = getDefaultPlanIdForRole(role)
3. Snapshot lockedRates = snapshotLockedRates(role) depuis le plan
4. Écrire : users/{userId}.affiliateCode + commissionPlanId + lockedRates + rateLockDate
5. Si referralCode fourni (depuis URL, sessionStorage, ou champs legacy) :
   a. resolveAnyAffiliateCode(referralCode)
   b. Self-referral check
   c. Vérifier fenêtre 30 jours (referralCapturedAt)
   d. Écrire referredByUserId + referredByCode + referredAt
   e. Si plan du referrer a signup_bonus.enabled :
      - Créer commission type="signup_bonus"

Sources du referralCode (dans l'ordre) :
  - data.referralCode (passé directement)
  - data.pendingReferralCode (sessionStorage client)
  - data.recruitmentCode (inscription affilié)
  - URL params : ref, referralCode, code, sponsor (rétrocompatibilité)
```

### 5.5 — Handler provider_registered

```
Créer : src/unified/handlers/handleProviderRegistered.ts
```

```
1. Chercher le code de recrutement depuis :
   a. data.recruitmentCode (nouveau champ unifié)
   b. data.providerRecruitedByChatter (legacy)
   c. data.providerRecruitedByBlogger (legacy)
   d. data.recruitedByInfluencer + data.influencerCode (legacy, pattern différent !)
   e. data.providerRecruitedByGroupAdmin (legacy)
2. Si pas de code → return
3. Résoudre le recruteur : resolveAnyAffiliateCode(code)
4. Créer document recruited_providers :
   - recruiterId, providerId, providerType
   - recruitedAt, windowEnd (now + plan.rules.provider_recruitment.windowMonths)
   - commissionsPaid: 0
5. Notifier le recruteur
```

### 5.6 — Handler subscription (NOUVEAU)

```
Créer : src/unified/handlers/handleSubscriptionEvent.ts
```

```
SUBSCRIPTION CREATED :
  1. Trouver qui a référé ce provider (findReferrer)
  2. Charger le plan du referrer
  3. Si plan.rules.subscription_commission.enabled :
     - Si type=fixed : montant = firstMonthAmount
     - Si type=percentage : montant = Math.round(subscriptionAmount * rate)
     - Créer commission type="subscription_commission"

SUBSCRIPTION RENEWED :
  1. findReferrer(providerId)
  2. Si plan.rules.subscription_commission.enabled :
     - Vérifier maxMonths (si 0 = illimité, sinon renewalMonth <= maxMonths)
     - Si type=fixed : montant = renewalAmount
     - Si type=percentage : montant = Math.round(amount * rate)
     - Anti-duplicate : sourceId = subscriptionId_periodStart
     - Créer commission type="subscription_renewal"
```

### 5.7 — Fraud detector

```
Créer : src/unified/fraudDetector.ts
```

- Self-referral detection (même userId, même email, même IP)
- Circular referral detection (parcours chaîne jusqu'à 10 niveaux)
- Same IP detection
- Disposable email detection
- Rate limiting (max commissions/heure)
- **RÈGLE** : fraud check NEVER blocks, only flags
  - High risk → commission en "held" + `fraud_alerts` doc
  - Medium risk → log, commission normalement
  - Check échoue → continue (fail-open)

### Tests Phase 5 — LES PLUS CRITIQUES

```
=== Tests commission directe (16 tests) ===
[ ] Chatter réfère client → appel avocat → $10
[ ] Chatter réfère client → appel expatrié → $5
[ ] Influenceur réfère client → appel avocat → $10
[ ] Influenceur avec monthlyTopMultiplier=2.0 → appel avocat → $20
[ ] Bloggeur réfère client → appel avocat → $10
[ ] GroupAdmin réfère client → appel avocat → $5
[ ] Client réfère client → appel avocat → $2
[ ] Provider réfère client → appel avocat → $2
[ ] Partenaire → appel avocat 55$ → 15% = $8.25
[ ] User avec plan custom ($20) → $20
[ ] User avec lockedRates.commissionClientAmountLawyer=2500 → $25 (override plan)
[ ] lockedRateUsed = true dans la commission créée

=== Tests cascade (12 tests) ===
[ ] Chatter N1 → recruté génère appel → recruteur gagne $1
[ ] Chatter N2 → $0.50
[ ] Chatter N3 → depth=2 → PAS de commission N3
[ ] GroupAdmin N1 → $1 | N2 → $0.50
[ ] Captain N1 → captain_call $3 (pas recruitment_call $1)
[ ] Cascade circulaire (A→B→A) → s'arrête
[ ] Anti-double provider recruitment : skip si même recruteur = client referrer

=== Tests activation bonus (3 tests) ===
[ ] 1er appel → PAS de bonus
[ ] 2e appel → bonus $5 + n1_recruit_bonus $1 pour N2
[ ] 3e appel → PAS de double bonus (idempotent, flag activationBonusPaid)

=== Tests referral milestones (4 tests) ===       // AJOUTÉ V2.1
[ ] Chatter atteint 5 filleuls qualifiés → bonus $15 (one-time)
[ ] Chatter atteint 10 filleuls qualifiés → bonus $35 (one-time)
[ ] Chatter avec déjà milestone 5 atteint → PAS de double bonus (idempotent, tierBonusesPaid)
[ ] Rôle sans milestones (blogger) → PAS de bonus milestone

=== Tests subscription (4 tests) ===
[ ] Provider référé crée abonnement → commission subscription_commission
[ ] Provider référé renouvelle → commission subscription_renewal
[ ] renewalMonth > maxMonths → PAS de commission
[ ] Anti-duplicate : même souscription traitée 2 fois → 1 commission

=== Tests discount (6 tests) ===
[ ] Client référé par influenceur → 5% discount sur appel
[ ] Client référé par groupAdmin → $5 discount
[ ] Client référé par chatter (plan sans discount) → 0 discount
[ ] Client référé par user avec plan custom (discount 10%) → 10% discount
[ ] Discount ne peut pas dépasser le prix total
[ ] maxDiscountCents respecté

=== Tests gardes (8 tests) ===
[ ] Appel non payé → 0 commission
[ ] Appel < 60 secondes → 0 commission
[ ] Client non référé → 0 commission
[ ] Self-referral → 0 commission
[ ] Anti-duplicate → 1 seule commission
[ ] Plan introuvable → log error, 0 commission (pas de crash)
[ ] Referrer supprimé → 0 commission
[ ] Fraud detected → commission held (pas bloquée)
```

---

## Phase 6 — Triggers shadow mode (2 jours)

**Impact production** : AUCUN (shadow = observation seule)

### 6.1 — Modifier le trigger consolidé

```
Modifier : src/consolidated/onCallCompleted.ts
```

```typescript
// ANCIEN SYSTÈME (continue normalement)
await handleChatterCommission(callSession);
await handleInfluencerCommission(callSession);
// ... etc.

// NOUVEAU SYSTÈME EN SHADOW (calcule mais N'ÉCRIT PAS)
try {
  const shadowResult = await calculateAndCreateCommissions({
    type: "call_completed",
    callSession,
    shadowMode: true,
  });
  await compareShadowResults(callSession.id, shadowResult);
} catch (err) {
  logger.error("[SHADOW] Error", { error: err });
  // N'impacte PAS l'ancien système
}
```

### 6.2 — Modifier onUserCreated + onSubscription

Même pattern shadow pour les 3 types d'événements.

### 6.3 — Comparateur shadow

```
Créer : src/unified/shadowComparator.ts
```

Compare les résultats du nouveau calculateur avec les commissions réellement créées par l'ancien système. Log dans `shadow_comparison_results/{id}`.

---

## Phase 7 — Frontend referralStorage simplifié + 1 lien (3 jours)

**Impact production** : AUCUN (additif, anciennes routes conservées)

### 7.1 — referralStorage v2

```
Modifier : src/utils/referralStorage.ts

AJOUTER :
  const UNIFIED_STORAGE_KEY = 'sos_referral';

  storeUnifiedReferral(code, tracking?)
    → Nettoie le code (deriveClientCode si ancien format)
    → Stocke dans 'sos_referral' (nouveau)
    → AUSSI stocke dans l'ancien format (rétrocompatibilité)
    → AUSSI stocke dans sessionStorage 'pendingReferralCode' (pour RegisterClient)

  getUnifiedReferralCode()
    → 1. Nouveau format 'sos_referral'
    → 2. Fallback : getBestAvailableReferralCode() (ancien)
    → 3. Fallback : sessionStorage 'pendingReferralCode'
```

### 7.2 — Nouvelle route /r/:code

```
Modifier : src/App.tsx

AJOUTER :
  /r/:code                → UnifiedAffiliateCapture
  /:locale/r/:code        → UnifiedAffiliateCapture

GARDER (rétrocompatibilité permanente) :
  /ref/:role/:code        → LegacyAffiliateRedirect
  /rec/:role/:code        → LegacyAffiliateRedirect
  /prov/:role/:code       → LegacyAffiliateRedirect
```

### 7.3 — TOUS les formulaires d'inscription

```
Modifier dans CHAQUE formulaire :

  src/pages/Chatter/ChatterRegister.tsx
  src/pages/Blogger/BloggerRegister.tsx
  src/pages/Influencer/InfluencerRegister.tsx
  src/pages/GroupAdmin/GroupAdminRegister.tsx
  src/pages/RegisterClient.tsx
  src/pages/RegisterLawyer.tsx                    ← AJOUTÉ (manquait)
  src/components/registration/lawyer/LawyerRegisterForm.tsx  ← CRITIQUE
  src/components/registration/expat/ExpatRegisterForm.tsx    ← CRITIQUE

AVANT (lecture différente par formulaire) :
  const code = getStoredReferralCode('chatter') || ...

APRÈS (identique partout) :
  const code = getUnifiedReferralCode();

POUR LawyerRegisterForm et ExpatRegisterForm :
  AVANT : écrit 4 champs séparés (providerRecruitedByChatter, etc.)
  APRÈS : écrit 1 seul champ = pendingRecruitmentCode: getUnifiedReferralCode()
  Le backend handleProviderRegistered résout le recruteur depuis ce seul champ
  GARDER les anciens champs en fallback (rétrocompatibilité)
```

### 7.4 — Checkout discount unifié

```
Modifier : src/pages/CallCheckout.tsx

AVANT (3 lookups séparés) :
  if (groupAdminReferredBy) → $5 fixe depuis group_admin_config
  else if (influencerReferredBy) → 5% depuis influencer_config
  else if (partnerReferredById) → partnerDiscountService

APRÈS (1 seul appel) :
  const discount = await resolveAffiliateDiscountCallable({ clientId, originalPrice, serviceType });
  if (discount.hasDiscount) → afficher discount.label + discount.discountAmount

Modifier : src/firebase/functions/src/createPaymentIntent.ts
  Remplacer les 3 blocs de discount par 1 appel à resolveAffiliateDiscount()
  Garder le système de coupon existant (indépendant, se cumule ou non selon config)
```

### 7.5 — SEO/OG + useAffiliateTracking

```
Modifier : src/seo/affiliateOgRender.ts → support /r/:code
Modifier : src/hooks/useAffiliateTracking.ts → skip /r/ routes dans AffiliateRefSync
Modifier : src/multilingual-system/core/routing/LocaleRouter.tsx → bypass /r/ routes
```

---

## Phase 8 — Frontend dashboard affilié unifié (3 jours)

### 8.1 — Composants

```
Créer :
  src/components/unified/UnifiedAffiliateDashboard.tsx
  src/components/unified/UnifiedAffiliateLink.tsx      ← 1 lien /r/CODE avec copier/partager/QR
  src/components/unified/CommissionPlanCard.tsx         ← taux en langage clair + discount
  src/components/unified/CommissionsHistory.tsx         ← paginé, filtrable, export CSV
  src/components/unified/ReferralsList.tsx              ← filleuls paginés
```

### 8.2 — Intégration dans TOUS les dashboards

```
Modifier :
  src/pages/Chatter/ChatterDashboard.tsx       → <UnifiedAffiliateDashboard />
  src/pages/Chatter/ChatterProfile.tsx         → afficher 1 code au lieu de 3
  src/pages/Influencer/InfluencerDashboard.tsx → idem
  src/pages/Influencer/InfluencerProfile.tsx   → 1 code
  src/pages/Blogger/BloggerDashboard.tsx       → idem
  src/pages/Blogger/BloggerProfile.tsx         → 1 code
  src/pages/GroupAdmin/GroupAdminDashboard.tsx  → idem
  src/pages/GroupAdmin/GroupAdminProfile.tsx    → 1 code
  src/pages/Affiliate/AffiliateDashboard.tsx   → utiliser commissions unifiées
  src/pages/Affiliate/AffiliateTools.tsx       → UTM builder avec lien unifié /r/CODE
  src/pages/Affiliate/AffiliateEarnings.tsx    → lire collection commissions
  src/pages/Affiliate/AffiliateReferrals.tsx   → lire referredByUserId

  AJOUTÉ V2.1 — Fichiers avec montants hardcodés à centraliser :
  src/components/Chatter/Layout/StickyAffiliateBar.tsx  → lire taux depuis plan/config
  src/components/Chatter/ViralKit/ReferralLinkCard.tsx  → lire taux depuis plan/config
  src/components/dashboard/DashboardAffiliateCard.tsx   → lire taux depuis plan/config
  src/hooks/useChatterReferrals.ts                      → lire collection commissions unifiée

  OPTIONNEL (après cutover) :
  src/pages/Client/ClientDashboard.tsx         → section affilié
  src/pages/Provider/ProviderDashboard.tsx     → section affilié
```

---

## Phase 9 — Admin UI commission plans + dashboard global (3 jours)

### 9.1 — Pages admin NOUVELLES

```
Créer :
  src/pages/admin/commissions/AdminCommissionPlans.tsx
    → Liste plans, actions CRUD, nb users par plan
  src/pages/admin/commissions/AdminCommissionPlanEditor.tsx
    → Formulaire complet avec : rules, discount, bonuses, withdrawal
    → Aperçu temps réel
    → Historique modifications
  src/pages/admin/commissions/AdminCommissionsGlobal.tsx
    → Filtres, stats, graphiques Recharts, export CSV
```

### 9.2 — Pages admin MODIFIÉES

```
Modifier :
  src/pages/admin/AdminAffiliateDetail.tsx
    → Dropdown changer le plan d'un user
    → Section lockedRates editable (override individuel)
    → Commissions depuis collection unifiée

  src/pages/admin/chatter/AdminChatterDetail.tsx (si existe)
    → Afficher plan + lockedRates + lien unifié
    → Bouton "Changer plan" + "Override taux"

  src/pages/admin/influencer/AdminInfluencerDetail.tsx
  src/pages/admin/blogger/AdminBloggerDetail.tsx
  src/pages/admin/groupAdmin/AdminGroupAdminDetail.tsx
  src/pages/admin/partner/AdminPartnerDetail.tsx
    → Même pattern : plan + lockedRates + commissions unifiées

  src/App.tsx (section admin routes)
    → Ajouter /admin/commission-plans, /admin/commission-plans/:planId, /admin/commissions
    → Ajouter dans le sidebar admin
```

### 9.3 — Callables admin dashboard

```
Créer : src/unified/callables/adminCommissionDashboard.ts

  adminGetGlobalCommissionStats(filters) → agrégation par rôle/type/statut/période
  adminGetCommissionsList(filters, pagination) → query paginée
  adminExportCommissions(filters) → données CSV-ready

Modifier : src/chatter/callables/admin/captain.ts
  → Quand adminPromoteToCaptain : assigner commissionPlanId = "captain_v1"
  → Quand adminRevokeCaptain : remettre commissionPlanId = "chatter_v1"
```

---

## Phase 10 — Migration des données existantes (3 jours)

**Impact production** : AUCUN (copie, anciennes collections intactes)

### 10.1 — Migration commissions

```
Créer : src/scripts/migration/migrateCommissions.ts

Collections sources (7) :
  chatter_commissions
  chatter_referral_commissions (legacy)
  influencer_commissions
  blogger_commissions
  group_admin_commissions
  affiliate_commissions
  partner_commissions

Mapping types :
  chatter.client_call           → type="client_call", referrerRole="chatter"
  chatter.n1_call              → type="recruitment_call", subType="n1"
  chatter.n2_call              → type="recruitment_call", subType="n2"
  chatter.captain_call         → type="captain_call", referrerRole="captainChatter"
  chatter.activation_bonus     → type="activation_bonus"
  chatter.n1_recruit_bonus     → type="n1_recruit_bonus"
  chatter.provider_call        → type="provider_recruitment"
  chatter.bonus_telegram       → type="bonus_telegram"
  chatter.bonus_top3           → type="bonus_top3"
  chatter.tier_bonus           → type="referral_milestone"     // AJOUTÉ V2.1
  influencer.client_referral   → type="client_call", referrerRole="influencer"
  blogger.client_referral      → type="client_call", referrerRole="blogger"
  groupAdmin.client_referral   → type="client_call", referrerRole="groupAdmin"
  groupAdmin.n1_call           → type="recruitment_call", subType="n1"
  affiliate.referral_signup    → type="signup_bonus", referrerRole="generic"
  affiliate.referral_first_call → type="client_call", referrerRole="generic"
  affiliate.referral_subscription → type="subscription_commission"
  affiliate.referral_subscription_renewal → type="subscription_renewal"
  partner.*                    → type approprié, referrerRole="partner"

Status mapping :
  "validated" → "held" (avec holdUntil = validatedAt + holdPeriod)
  "pending"/"available"/"paid"/"cancelled" → identique
```

### 10.2 — Migration recruited_providers

```
Créer : src/scripts/migration/migrateRecruitedProviders.ts

Sources (4 collections, NOM DIFFÉRENT pour influencer) :
  chatter_recruited_providers      → recruited_providers, recruiterRole="chatter"
  blogger_recruited_providers      → recruited_providers, recruiterRole="blogger"
  influencer_referrals             → recruited_providers, recruiterRole="influencer"  ← NOM DIFFÉRENT
  group_admin_recruited_providers  → recruited_providers, recruiterRole="groupAdmin"
```

### 10.3 — Migration codes + vérification

Identique au plan précédent + vérification post-migration exhaustive.

---

## Phase 11 — Shadow mode production (7 jours minimum)

Identique au plan précédent. Critères de cutover :
- 7 jours consécutifs avec 0 mismatch
- Au moins 50 commissions comparées
- Tous les types couverts (client_call, signup_bonus, recruitment_call, provider_recruitment, subscription si applicable)
- Tous les rôles couverts
- Discount calculé correctement (shadow compare aussi les montants discount)

---

## Phase 12 — Cutover (2 jours)

Identique au plan précédent. Feature flag `unified_commission_system/config.enabled`.

**AJOUT** : Au cutover, modifier aussi `createPaymentIntent.ts` pour utiliser le nouveau `resolveAffiliateDiscount()` unifié au lieu des 3 lookups séparés.

---

## Phase 13 — Cleanup code mort (3 jours)

Après 14 jours stable. Supprimer :

```
BACKEND :
  src/chatter/utils/chatterCodeGenerator.ts
  src/chatter/services/chatterCommissionService.ts
  src/chatter/triggers/onCallCompleted.ts (ancien handler)
  src/influencer/utils/influencerCodeGenerator.ts
  src/influencer/services/influencerCommissionService.ts
  src/influencer/triggers/onCallCompleted.ts
  src/blogger/utils/bloggerCodeGenerator.ts
  src/blogger/services/bloggerCommissionService.ts
  src/blogger/triggers/onCallCompleted.ts
  src/groupAdmin/services/groupAdminCommissionService.ts
  src/groupAdmin/triggers/onCallCompleted.ts
  src/affiliate/services/commissionService.ts (ancien)
  src/affiliate/triggers/onCallCompleted.ts (ancien)
  src/affiliate/triggers/onSubscriptionCreated.ts (ancien)
  src/affiliate/triggers/onSubscriptionRenewed.ts (ancien)
  src/chatter/triggers/onProviderRegistered.ts (consolidé)
  src/blogger/triggers/onProviderRegistered.ts
  src/influencer/triggers/onProviderRegistered.ts
  src/groupAdmin/triggers/onProviderRegistered.ts
  src/partner/services/partnerDiscountService.ts (remplacé par discountResolver)
  5 accounting triggers séparés (remplacés par 1 unifié)

FRONTEND :
  src/components/Chatter/Links/ChatterAffiliateLinks.tsx
  src/components/Influencer/Links/InfluencerAffiliateLinks.tsx
  Les 3 blocs de discount dans CallCheckout.tsx (remplacés par 1)

JAMAIS SUPPRIMÉ :
  Les anciennes routes /ref/, /rec/, /prov/ (LegacyAffiliateRedirect)
  deriveClientCode() dans referralStorage.ts
  Les anciens champs Firestore (affiliateCodeClient, etc.)
  Les anciennes collections (archive, lecture seule)
```

---

## Phase 14 — Tests end-to-end complets (2 jours)

### 25 scénarios de test (ajoutés par rapport au plan v1)

1-20 : Identiques au plan v1

21. **Discount affilié sur appel** : Client référé par influenceur → appel 49€ → discount 5% = 2.45€ → paie 46.55€
22. **Discount affilié fixe** : Client référé par groupAdmin → appel 49€ → discount $5 → paie 44€
23. **Pas de discount** : Client référé par chatter (plan sans discount) → paie plein tarif
24. **Admin change plan en cours** : Chatter passe de chatter_v1 ($10) → chatter_vip ($15) → prochain appel = $15
25. **Admin override lockedRates** : Admin met lockedRates.commissionClientAmountLawyer=2500 → commission = $25

---

## Systèmes connexes impactés

### Notifications
```
GARDER les collections existantes (chatter_notifications, etc.)
Le commissionWriter dispatch vers la bonne collection selon referrerRole
Chatters : FCM push via sendChatterNotification() EN PLUS de in-app
```

### Accounting
```
AVANT : 5 triggers sur 5 collections
APRÈS : 1 trigger onDocumentCreated("commissions/{id}")
  → Le champ referrerRole détermine la catégorie comptable
```

### Scheduled functions
```
CONSOLIDER en ~5 fonctions :
  unifiedReleaseHeldCommissions
  unifiedValidatePendingCommissions
  unifiedMonthlyRewards (top3 cash ET multiplier selon plan)
  unifiedWeeklyChallenges (pour rôles avec weeklyChallenges: true)
  unifiedResetCaptainMonthly (paliers + quality bonus + archive)
```

### Withdrawal, Tirelire, Levels, Leaderboards
```
AUCUN changement : lisent totalEarned/availableBalance sur le user doc
Le commissionWriter met à jour ces compteurs → tout fonctionne
```

### Coupons existants
```
AUCUN changement : le système de coupon reste indépendant
Règle de cumul (stackableWithCoupons) configurée dans l'override pricing
Le nouveau discount affilié remplace les 3 lookups séparés, pas les coupons
```

---

## Rétrocompatibilité

### Codes affiliés existants → FONCTIONNENT POUR TOUJOURS
### Liens partagés existants → FONCTIONNENT POUR TOUJOURS
### localStorage → Fallback automatique (ancien format lu par getUnifiedReferralCode)
### Collections Firestore → Archive en lecture seule, jamais supprimées
### URL params (ref, referralCode, code, sponsor) → Tous supportés

---

## Procédure de rollback

```
TEMPS DE ROLLBACK : < 30 secondes

ÉTAPE 1 : Firestore : unified_commission_system/config.enabled = false
ÉTAPE 2 : L'ancien système reprend IMMÉDIATEMENT
ÉTAPE 3 : Le discount dans createPaymentIntent revient aux 3 lookups (feature flag)
ÉTAPE 4 : Investiguer + fix + recommencer Phase 11
```

---

## Checklist de validation finale

### Avant de commencer
```
[ ] Snapshots exportés (7 fichiers JSON)
[ ] 0 code en double, 0 self-referral, 0 orphelin
[ ] Configs discount documentées
```

### Avant le cutover
```
[ ] 7 jours shadow à 0 mismatch (commissions ET discounts)
[ ] > 50 commissions comparées, tous types et rôles couverts
[ ] Tous les formulaires utilisent getUnifiedReferralCode()
[ ] LawyerRegisterForm/ExpatRegisterForm écrivent pendingRecruitmentCode
[ ] CallCheckout utilise resolveAffiliateDiscount()
[ ] Admin peut changer plan + override lockedRates
[ ] Tous les dashboards affichent le lien /r/CODE
[ ] Tous les profils affichent 1 code (pas 3)
```

### Après le cutover
```
[ ] Commissions créées dans collection unifiée
[ ] Discounts appliqués correctement au checkout
[ ] Notifications envoyées (in-app + FCM chatters + Telegram)
[ ] Accounting journal entries créées
[ ] Compteurs users cohérents
[ ] Aucune erreur dans les logs
```

---

## Inventaire complet des fichiers

### Fichiers créés (~50)

```
Backend src/unified/ :
  types.ts, validators.ts, planService.ts, codeGenerator.ts, codeResolver.ts,
  codeMigrator.ts, commissionWriter.ts, commissionCalculator.ts,
  referralResolver.ts, discountResolver.ts, fraudDetector.ts, shadowComparator.ts
  handlers/ : handleCallCompleted.ts, handleUserRegistered.ts,
              handleProviderRegistered.ts, handleSubscriptionEvent.ts
  callables/ : adminCommissionPlans.ts, adminCommissionDashboard.ts
  scheduled/ : shadowMonitor.ts, unifiedReleaseHeldCommissions.ts,
               unifiedValidatePendingCommissions.ts, unifiedMonthlyRewards.ts,
               unifiedResetCaptainMonthly.ts
  __tests__/ : (14 fichiers de tests)

Scripts :
  scripts/audit/ : (5 fichiers snapshot)
  scripts/migration/ : migrateCommissions.ts, migrateAffiliateCodes.ts,
                       migrateRecruitedProviders.ts, verifyMigration.ts
  scripts/seedCommissionPlans.ts

Frontend :
  src/components/unified/ : UnifiedAffiliateDashboard.tsx, UnifiedAffiliateLink.tsx,
    CommissionPlanCard.tsx, CommissionsHistory.tsx, ReferralsList.tsx,
    UnifiedAffiliateCapture.tsx, LegacyAffiliateRedirect.tsx
  src/hooks/ : useUnifiedCommissions.ts, useCommissionPlan.ts, useAffiliateStats.ts
  src/pages/admin/commissions/ : AdminCommissionPlans.tsx,
    AdminCommissionPlanEditor.tsx, AdminCommissionsGlobal.tsx
```

### Fichiers modifiés (~30)

```
Backend :
  src/consolidated/onCallCompleted.ts              ← shadow mode
  src/consolidated/onUserCreated.ts                ← shadow mode
  src/affiliate/triggers/onSubscriptionCreated.ts  ← shadow mode
  src/affiliate/triggers/onSubscriptionRenewed.ts  ← shadow mode
  src/createPaymentIntent.ts                       ← discount unifié
  src/accounting/triggers.ts                       ← trigger commission unifiée
  src/chatter/callables/admin/captain.ts           ← assign plan on promote/revoke
  firestore.indexes.json                           ← 8 nouveaux indexes

Frontend :
  src/App.tsx                                      ← routes /r/:code + admin + legacy
  src/utils/referralStorage.ts                     ← storeUnifiedReferral + getUnifiedReferralCode
  src/hooks/useAffiliateTracking.ts                ← support /r/:code
  src/multilingual-system/core/routing/LocaleRouter.tsx  ← bypass /r/
  src/seo/affiliateOgRender.ts                     ← support /r/:code
  src/pages/CallCheckout.tsx                       ← discount unifié
  src/pages/Chatter/ChatterRegister.tsx            ← getUnifiedReferralCode()
  src/pages/Blogger/BloggerRegister.tsx
  src/pages/Influencer/InfluencerRegister.tsx
  src/pages/GroupAdmin/GroupAdminRegister.tsx
  src/pages/RegisterClient.tsx
  src/pages/RegisterLawyer.tsx
  src/components/registration/lawyer/LawyerRegisterForm.tsx  ← pendingRecruitmentCode
  src/components/registration/expat/ExpatRegisterForm.tsx    ← pendingRecruitmentCode
  src/pages/Chatter/ChatterDashboard.tsx           ← UnifiedAffiliateDashboard
  src/pages/Chatter/ChatterProfile.tsx             ← 1 code au lieu de 3
  src/pages/Influencer/InfluencerDashboard.tsx
  src/pages/Influencer/InfluencerProfile.tsx
  src/pages/Blogger/BloggerDashboard.tsx
  src/pages/Blogger/BloggerProfile.tsx
  src/pages/GroupAdmin/GroupAdminDashboard.tsx
  src/pages/GroupAdmin/GroupAdminProfile.tsx
  src/pages/Affiliate/AffiliateDashboard.tsx       ← collection unifiée
  src/pages/Affiliate/AffiliateTools.tsx            ← lien /r/CODE
  src/pages/Affiliate/AffiliateEarnings.tsx         ← collection unifiée
  src/pages/admin/AdminAffiliateDetail.tsx          ← plan + lockedRates + unifiées
  Admin detail pages (chatter, influencer, blogger, groupAdmin, partner)
```

### Fichiers supprimés (Phase 13, ~25 fichiers)

```
(voir section Phase 13 ci-dessus)
```

---

## Résumé du planning

| Phase | Description | Durée | Impact prod |
|-------|-------------|-------|-------------|
| **0** | Audit & snapshot existant | 2 jours | Aucun |
| **1** | Types & structures (avec discount + captain tiers) | 3 jours | Aucun |
| **2** | Commission Plans Firestore (8 plans) | 2 jours | Aucun (additif) |
| **3** | Générateur de code unifié | 2 jours | Aucun (additif) |
| **4** | Collection commissions unifiée | 2 jours | Aucun (additif) |
| **5** | Calculateur unifié (commissions + discount + subscription) | 5 jours | Aucun (additif) |
| **6** | Triggers shadow mode | 2 jours | Aucun (observation) |
| **7** | Frontend referralStorage + 1 lien + checkout discount | 3 jours | Aucun (additif) |
| **8** | Frontend dashboards unifiés (TOUS les rôles) | 3 jours | Aucun (additif) |
| **9** | Admin UI plans + dashboard + override individuel | 3 jours | Aucun (additif) |
| **10** | Migration données (7 collections + 4 recruited_providers) | 3 jours | Aucun (copie) |
| **11** | Shadow mode production | 7 jours | Aucun (observation) |
| **12** | Cutover (feature flag) | 2 jours | **OUI** (rollback < 30s) |
| **13** | Cleanup code mort (~25 fichiers) | 3 jours | Suppression (après 14j) |
| **14** | Tests E2E (25 scénarios) | 2 jours | Vérification |
| **TOTAL** | | **48 jours** | |

# PLAN D'IMPLEMENTATION COMPLET - SYSTEME INFLUENCEURS SOS-EXPAT

## Document de Reference pour Implementation Multi-Agents

**Date**: 29 janvier 2026
**Version**: 1.0
**Stack cible**: React + TypeScript + Firebase (Firestore + Cloud Functions)
**Langues**: 9 (FR, EN, ES, DE, PT, RU, ZH, HI, AR)

---

## RESUME EXECUTIF

Le systeme Influenceurs est un programme d'affiliation pour les createurs de contenu et administrateurs de communautes d'expatries. Contrairement aux Chatters (affiliation active), les Influenceurs utilisent leur audience existante pour promouvoir SOS-Expat.

### Differences cles avec les Chatters

| Aspect | Chatter | Influenceur |
|--------|---------|-------------|
| Quiz d'entree | Oui (85% requis) | Non |
| Lien client | `/ref/c/CODE` (0% remise) | `/ref/i/CODE` (5% remise) |
| Retrait minimum | 25$ | 50$ |
| Top mensuel | Top 3 | Top 10 |
| Outils promo | Non | Oui (bannieres, widgets, QR, textes) |
| Info communaute | Non | Oui (URL, nom, plateforme, membres) |

---

## ORGANISATION DES 20 AGENTS IA

### Niveau 1 - Agent Orchestrateur (1 agent)
```
AGENT-01: ORCHESTRATEUR PRINCIPAL
├── Coordonne tous les agents
├── Valide les dependances entre phases
├── Gere les conflits d'integration
└── Assure la coherence globale
```

### Niveau 2 - Chefs de Domaine (4 agents)
```
AGENT-02: CHEF BACKEND
├── Supervise agents 06-09
└── Valide l'architecture Firebase

AGENT-03: CHEF FRONTEND
├── Supervise agents 10-14
└── Valide l'architecture React

AGENT-04: CHEF ADMIN
├── Supervise agents 15-17
└── Valide l'integration admin

AGENT-05: CHEF QUALITE
├── Supervise agents 18-20
└── Valide les tests et traductions
```

### Niveau 3 - Agents Specialistes (15 agents)
```
BACKEND (4 agents):
AGENT-06: Types et Services Firestore
AGENT-07: Cloud Functions - Callables
AGENT-08: Cloud Functions - Triggers
AGENT-09: Services de Paiement et Widgets

FRONTEND (5 agents):
AGENT-10: Pages Landing et Inscription
AGENT-11: Dashboard Influenceur (Core)
AGENT-12: Dashboard Influenceur (Gamification)
AGENT-13: Outils Promotionnels
AGENT-14: Hooks et Contexts

ADMIN (3 agents):
AGENT-15: Pages Admin - Liste et Detail
AGENT-16: Pages Admin - Finances et Widgets
AGENT-17: Pages Admin - Configuration

QUALITE (3 agents):
AGENT-18: Traductions (9 langues)
AGENT-19: Routes Multilingues
AGENT-20: Tests et Integration
```

---

## PHASE 1 - BACKEND CORE

### AGENT-06: Types et Services Firestore

#### Fichier: `sos/firebase/functions/src/influencer/types.ts`

```typescript
// Types a implementer

// Statuts possibles
export type InfluencerStatus = 'active' | 'suspended' | 'blocked';

// Niveaux (identiques aux Chatters)
export type InfluencerLevel = 1 | 2 | 3 | 4 | 5;
export const INFLUENCER_LEVEL_NAMES = {
  1: 'Apprenti',
  2: 'Confirme',
  3: 'Expert',
  4: 'Ambassadeur',
  5: 'Elite'
};

// Plateformes supportees
export type InfluencerPlatform =
  | 'facebook_group'
  | 'facebook_page'
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'blog'
  | 'forum'
  | 'other';

// Langues supportees
export type SupportedInfluencerLanguage = 'fr' | 'en' | 'es' | 'de' | 'pt' | 'ru' | 'zh' | 'hi' | 'ar';

// Interface Influenceur principale
export interface Influencer {
  id: string;
  userId: string;

  // Informations personnelles
  name: string;
  email: string;
  language: SupportedInfluencerLanguage;

  // Informations communaute (SPECIFIQUE INFLUENCEUR)
  platform: InfluencerPlatform;
  platformUrl: string;
  communityName: string;
  audienceSize: number;
  communityLanguage: SupportedInfluencerLanguage;
  communityCountry: string | null; // null = "General (tous pays)"
  communityTheme: string;

  // Codes affilies
  affiliateCodeClient: string;      // Format: /ref/i/CODE
  affiliateCodeRecruitment: string; // Format: /ref/r/CODE

  // Statut et niveau
  status: InfluencerStatus;
  level: InfluencerLevel;

  // Finances
  totalEarnings: number;           // En centimes USD
  pendingBalance: number;          // En attente de validation
  availableBalance: number;        // Disponible pour retrait

  // Gamification
  currentStreak: number;
  longestStreak: number;
  totalConversions: number;
  totalReferrals: number;          // Prestataires recrutes

  // Paiement
  paymentMethod: 'paypal' | 'wise' | 'mobile_money' | null;
  paymentDetails: InfluencerPaymentDetails | null;

  // Dates
  lastConversionAt: Date | null;
  termsAcceptedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Details de paiement
export interface InfluencerPaymentDetails {
  paypal?: {
    email: string;
  };
  wise?: {
    email?: string;
    iban?: string;
  };
  mobileMoney?: {
    provider: 'mpesa' | 'orange_money' | 'mtn_momo' | 'airtel_money';
    phoneNumber: string;
    country: string;
  };
}

// Commission (reutilise la table partner_commissions)
export interface InfluencerCommission {
  id: string;
  influencerId: string;
  partnerType: 'influencer';
  type: 'client_call' | 'recruitment';

  sourceId: string;
  sourceDescription: string;

  amountBase: number;            // 1000 (10$) ou 500 (5$)
  levelBonusMultiplier: number;  // 1.00 a 1.20
  top10BonusMultiplier: number;  // 1.00, 1.25, 1.50, 2.00
  amountFinal: number;           // Montant final calcule

  status: 'pending' | 'validated' | 'available' | 'paid' | 'cancelled';

  fraudCheckPassed: boolean | null;
  fraudCheckNotes: string | null;

  validatedAt: Date | null;
  availableAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
}

// Retrait
export interface InfluencerWithdrawal {
  id: string;
  influencerId: string;
  amount: number;
  paymentMethod: 'paypal' | 'wise' | 'mobile_money';
  paymentDetails: InfluencerPaymentDetails;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  failureReason: string | null;
  processedAt: Date | null;
  transactionReference: string | null;
  createdAt: Date;
}

// Filleul (prestataire recrute)
export interface InfluencerReferral {
  id: string;
  influencerId: string;
  prestataireUserId: string;
  prestataireName: string;
  status: 'active' | 'expired';
  callsCount: number;
  commissionsGenerated: number;
  expiresAt: Date;  // 6 mois apres inscription
  createdAt: Date;
}

// Badge
export interface InfluencerBadge {
  id: string;
  influencerId: string;
  badgeCode: string;
  unlockedAt: Date;
  createdAt: Date;
}

// Configuration systeme
export interface InfluencerConfig {
  // Commissions
  commissionClientAmount: number;      // 1000 = 10$
  commissionRecruitmentAmount: number; // 500 = 5$
  clientDiscount: number;              // 5 (%)

  // Tracking
  cookieDurationDays: number;          // 30
  recruitmentLinkDurationMonths: number; // 6

  // Retrait
  minimumWithdrawalAmount: number;     // 5000 = 50$

  // Validation
  commissionValidationDelayDays: number; // 7-14

  // Bonus niveaux
  levelBonuses: {
    1: number; // 1.00
    2: number; // 1.05
    3: number; // 1.10
    4: number; // 1.15
    5: number; // 1.20
  };

  // Seuils niveaux
  levelThresholds: {
    1: number; // 0
    2: number; // 11
    3: number; // 51
    4: number; // 201
    5: number; // 501
  };

  // Bonus Top 10 (SPECIFIQUE INFLUENCEUR - vs Top 3 Chatters)
  top1BonusMultiplier: number;  // 2.00
  top2BonusMultiplier: number;  // 1.50
  top3BonusMultiplier: number;  // 1.25
  // Top 4-10: pas de bonus

  // Paiements actives
  paypalEnabled: boolean;
  wiseEnabled: boolean;
  mobileMoneyEnabled: boolean;
  mobileMoneyProviders: string[];

  updatedAt: Date;
}

// Clic (tracking)
export interface InfluencerClick {
  id: string;
  influencerId: string;
  linkType: 'client' | 'recruitment';
  ipAddressHash: string;  // Anonymise
  userAgent: string;
  referer: string;
  countryCode: string;
  converted: boolean;
  convertedAt: Date | null;
  createdAt: Date;
}

// Classement mensuel
export interface InfluencerMonthlyRanking {
  id: string;
  year: number;
  month: number;
  partnerType: 'influencer';
  influencerId: string;
  rank: number;
  earnings: number;
  bonusApplied: number;
  createdAt: Date;
}

// Notification
export interface InfluencerNotification {
  id: string;
  influencerId: string;
  type: string;
  title: string;
  message: string;
  data: Record<string, any>;
  readAt: Date | null;
  createdAt: Date;
}
```

#### Fichier: `sos/firebase/functions/src/influencer/types/widgets.ts`

```typescript
// Types pour les widgets promotionnels (SPECIFIQUE INFLUENCEUR)

// Categorie de banniere
export interface WidgetBannerCategory {
  id: string;
  name: string;
  slug: string;
  defaultWidth: number;
  defaultHeight: number;
  description: string;
  displayOrder: number;
  status: 'active' | 'inactive';
  createdAt: Date;
}

// Banniere
export interface WidgetBanner {
  id: string;
  name: string;
  categoryId: string;
  style: 'modern' | 'classic' | 'colorful' | 'minimal' | 'dark';
  width: number;
  height: number;
  filePng: string;
  fileJpg: string | null;
  allowColorCustomization: boolean;
  allowCommunityName: boolean;
  isFeatured: boolean;
  displayOrder: number;
  status: 'active' | 'inactive';
  downloadCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Widget interactif
export interface WidgetInteractive {
  id: string;
  name: string;
  type: 'search' | 'search_large' | 'button' | 'card' | 'floating';
  defaultWidth: number;
  defaultHeight: number;
  config: {
    title: Record<string, string>;      // 9 langues
    subtitle?: Record<string, string>;
    placeholder1: Record<string, string>;
    placeholder2?: Record<string, string>;
    buttonText: Record<string, string>;
    showCommunityName: boolean;
    expertTypes: string[];
  };
  availableStyles: string[];
  allowColorCustomization: boolean;
  allowCommunityName: boolean;
  status: 'active' | 'inactive';
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Style de widget
export interface WidgetStyle {
  id: string;
  widgetId: string;
  name: string;
  slug: string;
  cssConfig: {
    backgroundColor: string;
    textColor: string;
    buttonColor: string;     // Toujours #DC2626 par defaut
    buttonTextColor: string;
    borderRadius: number;
    shadow: string;
    font: string;
  };
  previewImage: string;
  isDefault: boolean;
  displayOrder: number;
  status: 'active' | 'inactive';
  createdAt: Date;
}

// Couleur disponible
export interface WidgetColor {
  id: string;
  name: string;
  hexCode: string;  // #DC2626 = rouge SOS-Expat (defaut)
  isDefault: boolean;
  displayOrder: number;
  status: 'active' | 'inactive';
  createdAt: Date;
}

// Texte promotionnel
export interface WidgetText {
  id: string;
  name: string;
  type: 'bio_short' | 'bio_long' | 'post' | 'welcome' | 'description';
  maxLength: number;
  content: Record<string, string>;  // 9 langues
  displayOrder: number;
  status: 'active' | 'inactive';
  copyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Log de telechargement
export interface WidgetDownloadLog {
  id: string;
  influencerId: string;
  widgetType: 'banner' | 'qrcode' | 'text' | 'code';
  widgetId: string;
  format: 'png' | 'jpg' | 'svg' | 'pdf' | 'html' | 'bbcode' | 'markdown';
  createdAt: Date;
}
```

#### Fichier: `sos/firebase/functions/src/influencer/initializeInfluencerConfig.ts`

```typescript
// Fonction d'initialisation de la configuration par defaut
// A appeler une seule fois lors du deploiement initial

import * as admin from 'firebase-admin';
import { InfluencerConfig } from './types';

export async function initializeInfluencerConfig(): Promise<void> {
  const db = admin.firestore();
  const configRef = db.collection('influencer_config').doc('default');

  const existingConfig = await configRef.get();
  if (existingConfig.exists) {
    console.log('Influencer config already exists');
    return;
  }

  const defaultConfig: InfluencerConfig = {
    // Commissions
    commissionClientAmount: 1000,       // 10$
    commissionRecruitmentAmount: 500,   // 5$
    clientDiscount: 5,                  // 5%

    // Tracking
    cookieDurationDays: 30,
    recruitmentLinkDurationMonths: 6,

    // Retrait
    minimumWithdrawalAmount: 5000,      // 50$

    // Validation
    commissionValidationDelayDays: 10,  // 7-14 jours

    // Bonus niveaux
    levelBonuses: {
      1: 1.00,  // Apprenti - 0%
      2: 1.05,  // Confirme - 5%
      3: 1.10,  // Expert - 10%
      4: 1.15,  // Ambassadeur - 15%
      5: 1.20,  // Elite - 20%
    },

    // Seuils niveaux (conversions requises)
    levelThresholds: {
      1: 0,
      2: 11,
      3: 51,
      4: 201,
      5: 501,
    },

    // Bonus Top 10 (SPECIFIQUE INFLUENCEUR)
    top1BonusMultiplier: 2.00,
    top2BonusMultiplier: 1.50,
    top3BonusMultiplier: 1.25,

    // Paiements
    paypalEnabled: true,
    wiseEnabled: true,
    mobileMoneyEnabled: true,
    mobileMoneyProviders: ['mpesa', 'orange_money', 'mtn_momo', 'airtel_money'],

    updatedAt: new Date(),
  };

  await configRef.set(defaultConfig);
  console.log('Influencer config initialized');
}
```

#### Fichier: `sos/firebase/functions/src/influencer/services/influencerCodeGenerator.ts`

```typescript
// Generateur de codes affilies uniques
// Format: 6 caracteres alphanumeriques (ex: JEAN45)

import * as admin from 'firebase-admin';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;

function generateRandomCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
  }
  return code;
}

export async function generateUniqueInfluencerCode(): Promise<string> {
  const db = admin.firestore();
  let code: string;
  let isUnique = false;

  while (!isUnique) {
    code = generateRandomCode();

    // Verifier unicite dans les influencers ET chatters
    const [influencerCheck, chatterCheck] = await Promise.all([
      db.collection('influencers')
        .where('affiliateCodeClient', '==', code)
        .limit(1)
        .get(),
      db.collection('chatters')
        .where('affiliateCodeClient', '==', code)
        .limit(1)
        .get(),
    ]);

    if (influencerCheck.empty && chatterCheck.empty) {
      isUnique = true;
    }
  }

  return code!;
}
```

#### Fichier: `sos/firebase/functions/src/influencer/services/influencerCommissionService.ts`

```typescript
// Service de gestion des commissions
// Fonctions principales:
// - createClientCommission(influencerId, callId, callAmount)
// - createRecruitmentCommission(influencerId, referralId, callId)
// - validateCommission(commissionId)
// - releaseCommission(commissionId)
// - calculateBonusMultipliers(influencerId)

import * as admin from 'firebase-admin';
import { Influencer, InfluencerCommission, InfluencerConfig } from '../types';

export class InfluencerCommissionService {
  private db = admin.firestore();

  async getConfig(): Promise<InfluencerConfig> {
    const doc = await this.db.collection('influencer_config').doc('default').get();
    return doc.data() as InfluencerConfig;
  }

  async getInfluencer(influencerId: string): Promise<Influencer> {
    const doc = await this.db.collection('influencers').doc(influencerId).get();
    if (!doc.exists) throw new Error('Influencer not found');
    return { id: doc.id, ...doc.data() } as Influencer;
  }

  async calculateLevelBonus(influencer: Influencer): Promise<number> {
    const config = await this.getConfig();
    return config.levelBonuses[influencer.level] || 1.00;
  }

  async calculateTop10Bonus(influencerId: string): Promise<number> {
    // Verifier si l'influenceur est dans le Top 3 du mois en cours
    const now = new Date();
    const config = await this.getConfig();

    const rankingDoc = await this.db
      .collection('influencer_monthly_rankings')
      .where('year', '==', now.getFullYear())
      .where('month', '==', now.getMonth() + 1)
      .where('influencerId', '==', influencerId)
      .limit(1)
      .get();

    if (rankingDoc.empty) return 1.00;

    const rank = rankingDoc.docs[0].data().rank;

    if (rank === 1) return config.top1BonusMultiplier;
    if (rank === 2) return config.top2BonusMultiplier;
    if (rank === 3) return config.top3BonusMultiplier;

    return 1.00; // Top 4-10: pas de bonus
  }

  async createClientCommission(
    influencerId: string,
    callId: string,
    callDescription: string
  ): Promise<string> {
    const config = await this.getConfig();
    const influencer = await this.getInfluencer(influencerId);

    const levelBonus = await this.calculateLevelBonus(influencer);
    const top10Bonus = await this.calculateTop10Bonus(influencerId);

    const amountBase = config.commissionClientAmount; // 1000 = 10$
    const amountFinal = Math.round(amountBase * levelBonus * top10Bonus);

    const commission: Omit<InfluencerCommission, 'id'> = {
      influencerId,
      partnerType: 'influencer',
      type: 'client_call',
      sourceId: callId,
      sourceDescription: callDescription,
      amountBase,
      levelBonusMultiplier: levelBonus,
      top10BonusMultiplier: top10Bonus,
      amountFinal,
      status: 'pending',
      fraudCheckPassed: null,
      fraudCheckNotes: null,
      validatedAt: null,
      availableAt: null,
      paidAt: null,
      createdAt: new Date(),
    };

    const docRef = await this.db.collection('influencer_commissions').add(commission);

    // Mettre a jour le pending balance
    await this.db.collection('influencers').doc(influencerId).update({
      pendingBalance: admin.firestore.FieldValue.increment(amountFinal),
      totalConversions: admin.firestore.FieldValue.increment(1),
      lastConversionAt: new Date(),
      updatedAt: new Date(),
    });

    return docRef.id;
  }

  async createRecruitmentCommission(
    influencerId: string,
    referralId: string,
    callId: string,
    prestataireDescription: string
  ): Promise<string> {
    const config = await this.getConfig();
    const influencer = await this.getInfluencer(influencerId);

    const levelBonus = await this.calculateLevelBonus(influencer);
    const top10Bonus = await this.calculateTop10Bonus(influencerId);

    const amountBase = config.commissionRecruitmentAmount; // 500 = 5$
    const amountFinal = Math.round(amountBase * levelBonus * top10Bonus);

    const commission: Omit<InfluencerCommission, 'id'> = {
      influencerId,
      partnerType: 'influencer',
      type: 'recruitment',
      sourceId: callId,
      sourceDescription: `Appel recu par ${prestataireDescription}`,
      amountBase,
      levelBonusMultiplier: levelBonus,
      top10BonusMultiplier: top10Bonus,
      amountFinal,
      status: 'pending',
      fraudCheckPassed: null,
      fraudCheckNotes: null,
      validatedAt: null,
      availableAt: null,
      paidAt: null,
      createdAt: new Date(),
    };

    const docRef = await this.db.collection('influencer_commissions').add(commission);

    // Mettre a jour le pending balance et le referral
    await Promise.all([
      this.db.collection('influencers').doc(influencerId).update({
        pendingBalance: admin.firestore.FieldValue.increment(amountFinal),
        updatedAt: new Date(),
      }),
      this.db.collection('influencer_referrals').doc(referralId).update({
        callsCount: admin.firestore.FieldValue.increment(1),
        commissionsGenerated: admin.firestore.FieldValue.increment(amountFinal),
      }),
    ]);

    return docRef.id;
  }

  async validateCommission(commissionId: string): Promise<void> {
    const commissionRef = this.db.collection('influencer_commissions').doc(commissionId);
    const commission = (await commissionRef.get()).data() as InfluencerCommission;

    if (commission.status !== 'pending') {
      throw new Error('Commission is not pending');
    }

    const now = new Date();

    await commissionRef.update({
      status: 'validated',
      fraudCheckPassed: true,
      validatedAt: now,
      updatedAt: now,
    });
  }

  async releaseCommission(commissionId: string): Promise<void> {
    const commissionRef = this.db.collection('influencer_commissions').doc(commissionId);
    const commission = (await commissionRef.get()).data() as InfluencerCommission;

    if (commission.status !== 'validated') {
      throw new Error('Commission is not validated');
    }

    const now = new Date();

    await this.db.runTransaction(async (transaction) => {
      // Mettre a jour la commission
      transaction.update(commissionRef, {
        status: 'available',
        availableAt: now,
      });

      // Transferer de pending a available
      const influencerRef = this.db.collection('influencers').doc(commission.influencerId);
      transaction.update(influencerRef, {
        pendingBalance: admin.firestore.FieldValue.increment(-commission.amountFinal),
        availableBalance: admin.firestore.FieldValue.increment(commission.amountFinal),
        totalEarnings: admin.firestore.FieldValue.increment(commission.amountFinal),
        updatedAt: now,
      });
    });
  }
}
```

#### Fichier: `sos/firebase/functions/src/influencer/services/influencerWithdrawalService.ts`

```typescript
// Service de gestion des retraits
// Integrations: PayPal Payouts, Wise Business API, Flutterwave

// Structure similaire a chatterWithdrawalService.ts
// Avec seuil minimum de 50$ au lieu de 25$
```

---

### AGENT-07: Cloud Functions - Callables

#### Fichier: `sos/firebase/functions/src/influencer/callables/registerInfluencer.ts`

```typescript
// Callable: registerInfluencer
// Params:
// - name: string
// - email: string
// - language: SupportedInfluencerLanguage
// - platform: InfluencerPlatform
// - platformUrl: string
// - communityName: string
// - audienceSize: number
// - communityLanguage: SupportedInfluencerLanguage
// - communityCountry: string | null
// - communityTheme: string
// - termsAccepted: boolean
// - paymentMethod?: PaymentMethod
// - paymentDetails?: PaymentDetails
//
// Return: { influencerId: string, affiliateCode: string }
//
// Logique:
// 1. Valider que l'utilisateur est authentifie
// 2. Verifier qu'il n'est pas deja chatter/influenceur/prestataire
// 3. Valider les donnees (URL communaute, format, etc.)
// 4. Generer le code affilie unique
// 5. Creer le document influencers/{uid}
// 6. Mettre a jour users/{uid} avec role: "influencer"
// 7. Envoyer email de bienvenue
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/getInfluencerDashboard.ts`

```typescript
// Callable: getInfluencerDashboard
// Params: none (utilise auth.uid)
//
// Return: {
//   profile: Influencer,
//   stats: {
//     earningsThisMonth: number,
//     conversionsThisMonth: number,
//     clicksThisMonth: number,
//     conversionRate: number,
//     rankThisMonth: number | null,
//   },
//   recentCommissions: InfluencerCommission[],
//   recentReferrals: InfluencerReferral[],
//   badges: InfluencerBadge[],
//   notifications: InfluencerNotification[],
// }
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/requestWithdrawal.ts`

```typescript
// Callable: requestWithdrawal
// Params:
// - amount: number (en centimes, min 5000 = 50$)
//
// Logique:
// 1. Verifier que amount >= minimumWithdrawalAmount (50$)
// 2. Verifier que availableBalance >= amount
// 3. Verifier que paymentMethod est configure
// 4. Creer la demande de retrait
// 5. Deduire du availableBalance
// 6. Notifier l'admin
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/updateInfluencerProfile.ts`

```typescript
// Callable: updateInfluencerProfile
// Champs modifiables:
// - name
// - language
// - platformUrl
// - communityName
// - audienceSize
// - communityTheme
// - paymentMethod
// - paymentDetails
//
// NON modifiables:
// - platform (choix initial)
// - communityCountry
// - communityLanguage
// - affiliateCode*
// - status, level, balances, etc.
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/getLeaderboard.ts`

```typescript
// Callable: getLeaderboard
// Params:
// - month?: number (defaut: mois courant)
// - year?: number (defaut: annee courante)
//
// Return: {
//   rankings: Array<{
//     rank: number,
//     influencerId: string,
//     name: string,
//     communityName: string,
//     platform: string,
//     earnings: number,
//     conversions: number,
//   }>,
//   currentUserRank: number | null,
//   totalParticipants: number,
// }
//
// Note: Retourne Top 10 (vs Top 3 pour Chatters)
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/getPromotionalTools.ts`

```typescript
// Callable: getPromotionalTools (SPECIFIQUE INFLUENCEUR)
// Params: none
//
// Return: {
//   banners: {
//     categories: WidgetBannerCategory[],
//     items: WidgetBanner[],
//   },
//   widgets: WidgetInteractive[],
//   texts: WidgetText[],
//   colors: WidgetColor[],
//   qrCodeOptions: {
//     sizes: Array<{ name: string, width: number, height: number }>,
//     withLogo: boolean,
//     colors: WidgetColor[],
//   },
//   codeFormats: ['html', 'bbcode', 'markdown'],
//   influencerCode: string,
//   influencerLink: string,
//   communityName: string,
// }
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/generateQRCode.ts`

```typescript
// Callable: generateQRCode (SPECIFIQUE INFLUENCEUR)
// Params:
// - size: 'small' | 'medium' | 'large'
// - format: 'png' | 'svg' | 'pdf'
// - withLogo: boolean
// - color: string (hex)
// - withFrame: boolean
// - withText: boolean
//
// Return: { url: string } // URL temporaire vers le fichier genere
//
// Utiliser une librairie comme 'qrcode' pour generer
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/logWidgetDownload.ts`

```typescript
// Callable: logWidgetDownload (SPECIFIQUE INFLUENCEUR)
// Params:
// - widgetType: 'banner' | 'qrcode' | 'text' | 'code'
// - widgetId: string
// - format: string
//
// Logique:
// 1. Creer un log dans widget_downloads_log
// 2. Incrementer le compteur sur le widget
```

### Callables Admin

#### Fichier: `sos/firebase/functions/src/influencer/callables/admin/getInfluencersList.ts`

```typescript
// Callable admin: getInfluencersList
// Params:
// - filters: {
//     platform?: InfluencerPlatform[],
//     language?: SupportedInfluencerLanguage[],
//     country?: string[],
//     status?: InfluencerStatus[],
//     level?: InfluencerLevel[],
//     audienceMin?: number,
//     audienceMax?: number,
//     dateFrom?: Date,
//     dateTo?: Date,
//     search?: string,
//   }
// - pagination: { page: number, limit: number }
// - sort: { field: string, direction: 'asc' | 'desc' }
//
// Return: {
//   influencers: Influencer[],
//   total: number,
//   page: number,
//   pages: number,
// }
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/admin/getInfluencerDetail.ts`

```typescript
// Callable admin: getInfluencerDetail
// Params: { influencerId: string }
//
// Return: {
//   profile: Influencer,
//   commissions: InfluencerCommission[],
//   referrals: InfluencerReferral[],
//   withdrawals: InfluencerWithdrawal[],
//   badges: InfluencerBadge[],
//   clicks: { total: number, thisMonth: number, conversionRate: number },
//   activityLog: Array<{ action: string, timestamp: Date }>,
//   adminNotes: string,
// }
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/admin/processWithdrawal.ts`

```typescript
// Callable admin: processWithdrawal
// Params:
// - withdrawalId: string
// - action: 'approve' | 'reject' | 'manual'
// - reason?: string (si reject)
// - transactionReference?: string (si manual)
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/admin/updateInfluencerStatus.ts`

```typescript
// Callable admin: updateInfluencerStatus
// Params:
// - influencerId: string
// - status: 'active' | 'suspended' | 'blocked'
// - reason?: string
```

#### Fichier: `sos/firebase/functions/src/influencer/callables/admin/manageWidgets.ts`

```typescript
// Callables admin pour widgets (SPECIFIQUE INFLUENCEUR):
//
// createBanner(data: Partial<WidgetBanner>): Promise<string>
// updateBanner(id: string, data: Partial<WidgetBanner>): Promise<void>
// deleteBanner(id: string): Promise<void>
//
// createBannerCategory(data: Partial<WidgetBannerCategory>): Promise<string>
// updateBannerCategory(id: string, data: Partial<WidgetBannerCategory>): Promise<void>
//
// createWidgetText(data: Partial<WidgetText>): Promise<string>
// updateWidgetText(id: string, data: Partial<WidgetText>): Promise<void>
// deleteWidgetText(id: string): Promise<void>
//
// updateWidgetConfig(widgetId: string, config: Partial<WidgetInteractive>): Promise<void>
// updateWidgetStyle(styleId: string, config: Partial<WidgetStyle>): Promise<void>
//
// updateColor(id: string, data: Partial<WidgetColor>): Promise<void>
// createColor(data: Partial<WidgetColor>): Promise<string>
```

---

### AGENT-08: Cloud Functions - Triggers

#### Fichier: `sos/firebase/functions/src/influencer/triggers/onInfluencerCreated.ts`

```typescript
// Trigger: onCreate sur influencers/{influencerId}
//
// Actions:
// 1. Generer les codes affilies uniques (client + recruitment)
// 2. Initialiser niveau 1, streak 0
// 3. Envoyer email de bienvenue
// 4. Creer notification "Bienvenue"
// 5. Notifier l'admin si audience > 100K
```

#### Fichier: `sos/firebase/functions/src/influencer/triggers/onCallCompleted.ts`

```typescript
// Trigger: onUpdate sur calls/{callId} quand status passe a 'completed' et payment recu
//
// Logique:
// 1. Verifier si le client a un cookie influenceur valide
// 2. Si oui:
//    a. Creer commission client pour l'influenceur
//    b. Appliquer la remise de 5% au client
//    c. Mettre a jour les stats de l'influenceur
//    d. Verifier si nouveau badge debloque
//    e. Verifier si montee de niveau
// 3. Verifier si le prestataire a un lien referral actif
// 4. Si oui et referral non expire:
//    a. Creer commission recrutement pour l'influenceur
//    b. Mettre a jour le referral (callsCount++)
```

#### Fichier: `sos/firebase/functions/src/influencer/triggers/onProviderRegistered.ts`

```typescript
// Trigger: onCreate sur users/{userId} quand role == 'prestataire'
//
// Logique:
// 1. Verifier si cookie de recrutement influenceur present
// 2. Si oui:
//    a. Creer le referral avec expiresAt = +6 mois
//    b. Incrementer totalReferrals sur l'influenceur
//    c. Creer notification "Nouveau filleul"
//    d. Verifier si badge "first_referral" a debloquer
```

#### Fichier: `sos/firebase/functions/src/influencer/triggers/onCommissionStatusChanged.ts`

```typescript
// Trigger: onUpdate sur influencer_commissions/{commissionId}
//
// Logique selon nouveau status:
// - 'validated': Creer notification "Commission validee"
// - 'available':
//   a. Transferer de pending a available
//   b. Creer notification "Commission disponible"
//   c. Verifier badges de gains (100$, 500$, 1000$, 5000$)
// - 'paid': Creer notification "Paiement effectue"
// - 'cancelled':
//   a. Deduire de pendingBalance
//   b. Creer notification "Commission annulee"
```

#### Fichier: `sos/firebase/functions/src/influencer/triggers/onConversionForStreak.ts`

```typescript
// Trigger: onUpdate sur influencers/{influencerId} quand lastConversionAt change
//
// Logique:
// 1. Verifier si la derniere conversion etait hier
// 2. Si oui: incrementer currentStreak
// 3. Si non (gap > 1 jour): reset currentStreak a 1
// 4. Mettre a jour longestStreak si necessaire
// 5. Verifier badges de streak (7, 30, 90, 365 jours)
```

---

### AGENT-09: Services de Paiement et Widgets

#### Fichier: `sos/firebase/functions/src/influencer/scheduled/validatePendingCommissions.ts`

```typescript
// Scheduled: Tous les jours a 2h00
//
// Logique:
// 1. Recuperer toutes les commissions 'pending' creees il y a > X jours
// 2. Pour chaque commission:
//    a. Executer verification anti-fraude basique
//    b. Si OK: passer en 'validated'
//    c. Si suspect: alerter admin
```

#### Fichier: `sos/firebase/functions/src/influencer/scheduled/releaseValidatedCommissions.ts`

```typescript
// Scheduled: Tous les jours a 3h00
//
// Logique:
// 1. Recuperer toutes les commissions 'validated' depuis > Y jours
// 2. Pour chaque commission:
//    a. Passer en 'available'
//    b. Transferer de pending a available balance
//    c. Notifier l'influenceur
```

#### Fichier: `sos/firebase/functions/src/influencer/scheduled/calculateMonthlyRankings.ts`

```typescript
// Scheduled: Le 1er de chaque mois a 00h01
//
// Logique:
// 1. Calculer les gains du mois precedent pour tous les influenceurs
// 2. Trier par gains decroissants
// 3. Creer les documents monthly_rankings avec rang
// 4. Pour le Top 3 (SPECIFIQUE: Top 3 uniquement, pas Top 10):
//    a. Appliquer le bonus multiplicateur sur toutes leurs commissions du mois
//    b. Creer commission bonus si necessaire
//    c. Notifier les gagnants
// 5. Attribuer badges Top 10 / Top 3 / Top 1
```

#### Fichier: `sos/firebase/functions/src/influencer/scheduled/updateLevels.ts`

```typescript
// Scheduled: Toutes les heures
//
// Logique:
// 1. Recuperer tous les influenceurs
// 2. Pour chaque influenceur:
//    a. Verifier si totalConversions >= seuil niveau superieur
//    b. Si oui: incrementer level
//    c. Creer notification "Niveau atteint"
//    d. Attribuer badge de niveau
```

#### Fichier: `sos/firebase/functions/src/influencer/scheduled/updateStreaks.ts`

```typescript
// Scheduled: Tous les jours a minuit
//
// Logique:
// 1. Recuperer tous les influenceurs avec lastConversionAt != aujourd'hui
// 2. Pour ceux dont lastConversionAt etait hier: rien (streak continue)
// 3. Pour ceux dont lastConversionAt etait avant-hier ou plus: reset streak a 0
```

#### Fichier: `sos/firebase/functions/src/influencer/scheduled/expireReferrals.ts`

```typescript
// Scheduled: Tous les jours a 4h00
//
// Logique:
// 1. Recuperer tous les referrals avec expiresAt <= now et status == 'active'
// 2. Passer leur status a 'expired'
```

#### Fichier: `sos/firebase/functions/src/influencer/services/influencerFraudDetection.ts`

```typescript
// Service de detection de fraude basique
//
// Verifications:
// - Meme IP entre influenceur et client
// - Taux de conversion anormalement eleve (> 50%)
// - Conversions groupees (plusieurs dans un court laps de temps)
// - Prestataires recrutes sans aucune activite
//
// Return: { passed: boolean, reason?: string }
```

---

## PHASE 2 - FRONTEND CORE

### AGENT-10: Pages Landing et Inscription

#### Fichier: `sos/src/pages/Influencer/Landing/InfluencerLanding.tsx`

```tsx
// Page de presentation du programme influenceurs
// Route: /{locale}/devenir-influenceur (ou /become-influencer)
//
// Sections:
// 1. Hero avec titre, sous-titre, CTA "Rejoindre le programme"
// 2. Avantages (5% remise clients, commissions, outils promo)
// 3. Comment ca marche (3-4 etapes)
// 4. Temoignages (optionnel)
// 5. FAQ avec schema.org FAQPage
// 6. CTA final
//
// SEO:
// - SEOHead avec meta AI
// - HreflangLinks
// - FAQPageSchema
```

#### Fichier: `sos/src/pages/Influencer/Auth/InfluencerRegister.tsx`

```tsx
// Formulaire d'inscription influenceur
// Route: /{locale}/influencer/inscription
//
// Champs:
// - Informations personnelles:
//   - Nom complet*
//   - Email* (pre-rempli si connecte)
//   - Langue interface*
//
// - Informations communaute:
//   - Type de plateforme* (select: facebook_group, youtube, etc.)
//   - URL de la communaute*
//   - Nom de la communaute*
//   - Nombre de membres/abonnes*
//   - Langue de la communaute*
//   - Pays cible* (select avec "General - tous pays")
//   - Thematique* (text libre)
//
// - Paiement (optionnel a l'inscription):
//   - Methode (PayPal/Wise/Mobile Money)
//   - Details selon methode
//
// - CGU: checkbox "J'accepte les conditions"
//
// Validation:
// - URL doit etre valide et commencer par http(s)
// - Audience >= 100 (seuil minimum suggere)
// - Email non deja utilise par chatter/influenceur
//
// PAS DE QUIZ (difference avec Chatters)
```

#### Fichier: `sos/src/pages/Influencer/Auth/InfluencerSuspended.tsx`

```tsx
// Page affichee si le compte est suspendu
// Message expliquant la suspension
// Bouton pour contacter le support
```

### AGENT-11: Dashboard Influenceur (Core)

#### Fichier: `sos/src/pages/Influencer/Dashboard/InfluencerDashboard.tsx`

```tsx
// Dashboard principal (page d'accueil)
// Route: /{locale}/influencer/dashboard
//
// Layout avec sidebar (reutiliser pattern ChatterDashboardLayout)
//
// Contenu:
// 1. Bandeau de bienvenue avec nom
// 2. Cards KPI:
//    - Ma tirelire (availableBalance) avec bouton "Retirer"
//    - Gains ce mois
//    - Conversions ce mois
//    - Position classement (ou "-" si hors Top 10)
// 3. Mes liens affilies (avec boutons copier):
//    - Lien client: sos-expat.com/ref/i/CODE (-5% pour vos visiteurs)
//    - Lien recrutement: sos-expat.com/ref/r/CODE
// 4. Statistiques rapides:
//    - Clics ce mois
//    - Taux de conversion
// 5. Activite recente (5 dernieres commissions)
// 6. Badges recents
```

#### Fichier: `sos/src/pages/Influencer/Dashboard/InfluencerEarnings.tsx`

```tsx
// Page Mes Gains
// Route: /{locale}/influencer/gains
//
// Contenu:
// 1. Resume:
//    - Total gagne (all time)
//    - En attente de validation
//    - Disponible pour retrait
//    - Deja retire
// 2. Graphique evolution des gains (12 derniers mois)
// 3. Tableau des commissions avec filtres:
//    - Type (client/recrutement)
//    - Status (pending/validated/available/paid/cancelled)
//    - Periode
// 4. Details par commission (expandable)
```

#### Fichier: `sos/src/pages/Influencer/Dashboard/InfluencerReferrals.tsx`

```tsx
// Page Mes Filleuls (prestataires recrutes)
// Route: /{locale}/influencer/filleuls
//
// Contenu:
// 1. Lien de recrutement avec bouton copier
// 2. Stats:
//    - Nombre total de filleuls
//    - Filleuls actifs (non expires)
//    - Commissions generees par filleuls
// 3. Tableau des filleuls:
//    - Nom prestataire
//    - Date inscription
//    - Appels recus
//    - Commissions generees
//    - Status (actif/expire)
//    - Expiration (date ou "Expire")
// 4. Info: "Vous touchez 5$ par appel recu par vos filleuls pendant 6 mois"
```

#### Fichier: `sos/src/pages/Influencer/Dashboard/InfluencerPayments.tsx`

```tsx
// Page Paiements / Retraits
// Route: /{locale}/influencer/paiements
//
// Contenu:
// 1. Solde disponible pour retrait
// 2. Configuration methode de paiement:
//    - Select: PayPal / Wise / Mobile Money
//    - Formulaire selon methode
//    - Bouton "Enregistrer"
// 3. Formulaire de demande de retrait:
//    - Montant (min 50$)
//    - Methode (pre-selectionnee)
//    - Bouton "Demander le retrait"
// 4. Historique des retraits:
//    - Date demande
//    - Montant
//    - Methode
//    - Status
//    - Date traitement
//    - Reference transaction
```

### AGENT-12: Dashboard Influenceur (Gamification)

#### Fichier: `sos/src/pages/Influencer/Dashboard/InfluencerLeaderboard.tsx`

```tsx
// Page Classement
// Route: /{locale}/influencer/classement
//
// Contenu:
// 1. Selecteur de mois
// 2. Podium Top 3 (visual avec medailles)
// 3. Tableau Top 10 (SPECIFIQUE vs Top 3 Chatters):
//    - Rang
//    - Avatar + Nom
//    - Communaute
//    - Plateforme (icone)
//    - Gains du mois
//    - Bonus (x2, x1.5, x1.25 pour Top 3)
// 4. Ma position si hors Top 10
// 5. Info bonus:
//    - Top 1: x2 sur tous les gains du mois
//    - Top 2: x1.5
//    - Top 3: x1.25
```

#### Fichier: `sos/src/pages/Influencer/Dashboard/InfluencerBadges.tsx`

```tsx
// Page Mes Badges
// Route: /{locale}/influencer/badges
//
// Contenu:
// 1. Stats: X badges obtenus / Y total
// 2. Mon niveau actuel avec progression vers le suivant
// 3. Grille de badges par categorie:
//    - Conversions (first, 10, 50, 100, 500)
//    - Gains (100$, 500$, 1000$, 5000$)
//    - Recrutement (first, 10, 50)
//    - Streak (7j, 30j, 90j)
//    - Classement (top10, top3, top1, 3x top10)
//    - Communaute (10K, 50K, 100K audience)
// 4. Badges obtenus: colores avec date
// 5. Badges non obtenus: grises avec condition
```

#### Fichier: `sos/src/pages/Influencer/Dashboard/InfluencerProfile.tsx`

```tsx
// Page Profil
// Route: /{locale}/influencer/profil
//
// Contenu:
// 1. Informations personnelles (modifiables):
//    - Nom
//    - Langue interface
// 2. Informations communaute (partiellement modifiables):
//    - Plateforme (non modifiable)
//    - URL (modifiable)
//    - Nom communaute (modifiable)
//    - Audience (modifiable)
//    - Langue (non modifiable)
//    - Pays (non modifiable)
//    - Thematique (modifiable)
// 3. Mon code affilie (lecture seule)
// 4. Statistiques compte:
//    - Date inscription
//    - Niveau
//    - Total conversions
//    - Total filleuls
// 5. Bouton "Supprimer mon compte"
```

### AGENT-13: Outils Promotionnels (SPECIFIQUE INFLUENCEUR)

#### Fichier: `sos/src/pages/Influencer/Dashboard/InfluencerTools.tsx`

```tsx
// Page Outils Promotionnels (NOUVEAU - pas dans Chatters)
// Route: /{locale}/influencer/outils
//
// Navigation par onglets:
// - Bannieres
// - Codes d'integration
// - Widgets
// - Textes
// - QR Code
//
// Onglet actif stocke dans URL (?tab=banners)
```

#### Fichier: `sos/src/components/Influencer/Tools/BannersTab.tsx`

```tsx
// Onglet Bannieres
//
// Contenu:
// 1. Filtre par categorie (Header, Sidebar, Social, etc.)
// 2. Filtre par style
// 3. Grille de bannieres avec:
//    - Apercu
//    - Nom
//    - Dimensions
//    - Boutons: [Telecharger PNG] [Telecharger JPG]
// 4. Personnalisation (si autorisee):
//    - Ajouter nom communaute
//    - Choix couleur (palette SOS-Expat)
```

#### Fichier: `sos/src/components/Influencer/Tools/CodesTab.tsx`

```tsx
// Onglet Codes d'integration
//
// Contenu:
// 1. Selection format: HTML / BBCode / Markdown
// 2. Selection banniere ou bouton simple
// 3. Options:
//    - Avec/sans texte
//    - Style du bouton
// 4. Preview en temps reel
// 5. Zone de code avec bouton copier
```

#### Fichier: `sos/src/components/Influencer/Tools/WidgetsTab.tsx`

```tsx
// Onglet Widgets interactifs
//
// Contenu:
// 1. Liste des widgets disponibles:
//    - Widget Recherche (300x400)
//    - Widget Recherche Large (600x200)
//    - Widget Bouton (200x60)
//    - Widget Card (350x450)
//    - Widget Flottant (60x60)
// 2. Pour chaque widget:
//    - Preview
//    - Personnalisation:
//      - Style (moderne, classique, sombre, etc.)
//      - Couleur
//      - Afficher nom communaute
//      - Langue
//    - Code d'integration (iframe ou script)
//    - Bouton copier
```

#### Fichier: `sos/src/components/Influencer/Tools/TextsTab.tsx`

```tsx
// Onglet Textes prets a l'emploi
//
// Contenu:
// 1. Selection type: Bio courte / Bio longue / Post / Message bienvenue
// 2. Selection langue
// 3. Apercu du texte avec variables remplacees:
//    - [CODE] -> code affilie
//    - [LIEN] -> lien complet
//    - [NOM_COMMUNAUTE] -> nom communaute
//    - [REMISE] -> "5%"
// 4. Compteur caracteres
// 5. Bouton copier
```

#### Fichier: `sos/src/components/Influencer/Tools/QRCodeTab.tsx`

```tsx
// Onglet QR Code
//
// Contenu:
// 1. Preview du QR Code
// 2. Options:
//    - Taille: Small (200px) / Medium (500px) / Large (1000px)
//    - Avec/sans logo SOS-Expat
//    - Couleur (noir par defaut, rouge SOS-Expat, autre)
//    - Avec/sans cadre
//    - Avec/sans texte "Scannez pour -5%"
// 3. Boutons telecharger: PNG / SVG / PDF
// 4. Info: Le QR redirige vers votre lien affilie
```

### AGENT-14: Hooks et Contexts

#### Fichier: `sos/src/hooks/useInfluencer.ts`

```tsx
// Hook principal pour les donnees influenceur
//
// Return:
// - influencer: Influencer | null
// - loading: boolean
// - error: Error | null
// - isInfluencer: boolean
// - stats: InfluencerStats
// - refetch: () => void
//
// Fonctionnalites:
// - Ecoute en temps reel le document influencers/{uid}
// - Cache les donnees
// - Gere le loading state
```

#### Fichier: `sos/src/hooks/useInfluencerCommissions.ts`

```tsx
// Hook pour les commissions
//
// Params:
// - filters?: { type?, status?, dateFrom?, dateTo? }
// - pagination?: { page, limit }
//
// Return:
// - commissions: InfluencerCommission[]
// - total: number
// - loading: boolean
// - hasMore: boolean
// - loadMore: () => void
```

#### Fichier: `sos/src/hooks/useInfluencerReferrals.ts`

```tsx
// Hook pour les filleuls
//
// Return:
// - referrals: InfluencerReferral[]
// - activeCount: number
// - expiredCount: number
// - totalCommissions: number
// - loading: boolean
```

#### Fichier: `sos/src/hooks/useInfluencerWithdrawal.ts`

```tsx
// Hook pour les retraits
//
// Return:
// - withdrawals: InfluencerWithdrawal[]
// - canWithdraw: boolean (balance >= 50$)
// - availableBalance: number
// - requestWithdrawal: (amount: number) => Promise<void>
// - loading: boolean
```

#### Fichier: `sos/src/hooks/useInfluencerTools.ts`

```tsx
// Hook pour les outils promotionnels (SPECIFIQUE)
//
// Return:
// - banners: { categories: Category[], items: Banner[] }
// - widgets: Widget[]
// - texts: WidgetText[]
// - colors: WidgetColor[]
// - loading: boolean
// - generateQRCode: (options) => Promise<string>
// - logDownload: (type, id, format) => void
```

#### Fichier: `sos/src/hooks/useInfluencerLeaderboard.ts`

```tsx
// Hook pour le classement
//
// Params:
// - month?: number
// - year?: number
//
// Return:
// - rankings: RankingEntry[]
// - myRank: number | null
// - totalParticipants: number
// - loading: boolean
```

---

## PHASE 3 - ADMIN

### AGENT-15: Pages Admin - Liste et Detail

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencersList.tsx`

```tsx
// Liste des influenceurs
// Route: /admin/influencers
//
// Layout: AdminLayout (sidebar)
//
// Contenu:
// 1. Stats en haut:
//    - Total influenceurs
//    - Actifs ce mois
//    - Commissions versees
//    - Audience totale
// 2. Filtres:
//    - Plateforme (multi-select)
//    - Langue (multi-select)
//    - Pays (multi-select avec "General")
//    - Status
//    - Niveau
//    - Audience (range)
//    - Date inscription (range)
//    - Recherche texte
// 3. Tableau:
//    - ID, Nom, Communaute, Membres, Langue, Pays, Theme
//    - Niveau (etoiles), Conversions, Gains, Status
//    - Actions: Voir, Modifier, Suspendre
// 4. Actions de masse:
//    - Exporter CSV
//    - Suspendre selection
//    - Envoyer email
```

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerDetail.tsx`

```tsx
// Detail d'un influenceur
// Route: /admin/influencers/:id
//
// Onglets:
// 1. Profil:
//    - Informations personnelles (modifiables)
//    - Informations communaute (modifiables)
//    - Liens affilies
//    - Stats performance
// 2. Commissions:
//    - Historique complet avec filtres
// 3. Filleuls:
//    - Liste des prestataires recrutes
// 4. Paiements:
//    - Historique des retraits
// 5. Badges:
//    - Badges obtenus avec dates
// 6. Activite:
//    - Log des actions
// 7. Notes admin:
//    - Zone de texte editable
//
// Actions:
// - Modifier
// - Suspendre/Reactiver
// - Bloquer
// - Reset mot de passe
// - Connexion en tant que
// - Supprimer
```

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencersByCountry.tsx`

```tsx
// Vue par pays
// Route: /admin/influencers/countries
//
// Contenu:
// 1. Carte mondiale (optionnel)
// 2. Liste des pays avec:
//    - Drapeau + Nom
//    - Nombre influenceurs
//    - Audience totale
//    - Gains generes
//    - Indicateur couverture (vert/jaune/rouge)
// 3. Clic sur pays = liste filtree
// 4. "General" en premier
```

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencersByLanguage.tsx`

```tsx
// Vue par langue
// Route: /admin/influencers/languages
//
// Contenu similaire a ByCountry mais pour les 9 langues
// Alertes pour langues sous-representees
```

### AGENT-16: Pages Admin - Finances et Widgets

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerFinances.tsx`

```tsx
// Finances influenceurs
// Route: /admin/influencers/finances
//
// Onglets:
// 1. Resume:
//    - CA genere par influenceurs
//    - Commissions totales/payees/en attente/disponibles
//    - Graphiques evolution
// 2. Demandes de retrait:
//    - Tableau des demandes en attente
//    - Actions: Traiter auto / Traiter manuel / Rejeter
// 3. Historique paiements:
//    - Filtres par periode, methode, influenceur, status
// 4. Rapports:
//    - Export mensuel
//    - Export par influenceur
//    - Export comptable CSV
```

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerWidgets.tsx`

```tsx
// Gestion des widgets (SPECIFIQUE INFLUENCEUR)
// Route: /admin/influencers/widgets
//
// Onglets:
// 1. Bannieres:
//    - Liste avec apercu, nom, dimensions, status
//    - CRUD banniere
//    - Gestion categories
// 2. Widgets interactifs:
//    - Liste des widgets
//    - Configuration (textes 9 langues, options)
//    - Gestion styles
// 3. Textes:
//    - Liste des textes
//    - CRUD avec 9 langues
// 4. Config:
//    - Couleurs disponibles
//    - Options de personnalisation
//
// Statistiques:
// - Bannieres les plus telechargees
// - Widgets les plus utilises
// - Evolution telechargements
```

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerGamification.tsx`

```tsx
// Gamification
// Route: /admin/influencers/gamification
//
// Onglets:
// 1. Top 10 mensuel:
//    - Selecteur mois
//    - Classement avec details
//    - Bonus attribues
//    - Actions: Forcer attribution, Exclure
// 2. Niveaux:
//    - Configuration seuils et bonus
// 3. Badges:
//    - Liste des badges
//    - Nombre d'influenceurs par badge
//    - Activer/Desactiver
//    - Attribution manuelle
```

### AGENT-17: Pages Admin - Configuration

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerConfig.tsx`

```tsx
// Configuration systeme
// Route: /admin/influencers/config
//
// Sections:
// 1. Commissions:
//    - Montant commission client (defaut 10$)
//    - Montant commission recrutement (defaut 5$)
//    - Remise client (defaut 5%)
// 2. Tracking:
//    - Duree cookie (defaut 30 jours)
//    - Duree affiliation recrutement (defaut 6 mois)
// 3. Paiements:
//    - Seuil minimum retrait (defaut 50$)
//    - Methodes activees
//    - Providers Mobile Money
// 4. Validation:
//    - Delai validation commission (defaut 7-14j)
// 5. Gamification:
//    - Bonus Top 1/2/3
//    - Seuils niveaux
//    - Bonus niveaux
```

---

## PHASE 4 - QUALITE

### AGENT-18: Traductions (9 langues)

#### Fichier: `sos/src/helper/fr.json` (section influencer)

```json
{
  "influencer.landing.title": "Devenez Partenaire Influenceur SOS-Expat",
  "influencer.landing.subtitle": "Monetisez votre communaute d'expatries",
  "influencer.landing.hero.cta": "Rejoindre le programme",
  "influencer.landing.benefit1.title": "5% de remise pour vos abonnes",
  "influencer.landing.benefit1.description": "Vos visiteurs beneficient automatiquement de 5% de reduction",
  "influencer.landing.benefit2.title": "10$ par client converti",
  "influencer.landing.benefit2.description": "Gagnez une commission sur chaque paiement",
  "influencer.landing.benefit3.title": "Outils promotionnels",
  "influencer.landing.benefit3.description": "Bannieres, widgets et textes prets a l'emploi",
  "influencer.landing.howItWorks.title": "Comment ca marche ?",
  "influencer.landing.step1": "Inscrivez-vous gratuitement",
  "influencer.landing.step2": "Obtenez votre lien personnalise",
  "influencer.landing.step3": "Partagez avec votre communaute",
  "influencer.landing.step4": "Gagnez des commissions",
  "influencer.landing.faq.title": "Questions frequentes",

  "influencer.register.title": "Inscription Partenaire Influenceur",
  "influencer.register.personal": "Informations personnelles",
  "influencer.register.community": "Informations sur votre communaute",
  "influencer.register.platform": "Type de plateforme",
  "influencer.register.platformUrl": "URL de votre communaute",
  "influencer.register.communityName": "Nom de votre communaute",
  "influencer.register.audienceSize": "Nombre de membres/abonnes",
  "influencer.register.communityLanguage": "Langue principale",
  "influencer.register.communityCountry": "Pays cible",
  "influencer.register.communityCountry.general": "General (tous pays)",
  "influencer.register.communityTheme": "Thematique",
  "influencer.register.payment": "Methode de paiement (optionnel)",
  "influencer.register.terms": "J'accepte les conditions generales du programme",
  "influencer.register.submit": "Creer mon compte partenaire",

  "influencer.dashboard.title": "Mon tableau de bord",
  "influencer.dashboard.welcome": "Bienvenue, {name}",
  "influencer.dashboard.balance": "Ma tirelire",
  "influencer.dashboard.earnings": "Gains ce mois",
  "influencer.dashboard.conversions": "Conversions",
  "influencer.dashboard.rank": "Position classement",
  "influencer.dashboard.rankOutOf": "sur {total} influenceurs",
  "influencer.dashboard.notRanked": "Hors Top 10",
  "influencer.dashboard.myLinks": "Mes liens affilies",
  "influencer.dashboard.linkClient": "Lien Client (-5% pour vos visiteurs)",
  "influencer.dashboard.linkRecruitment": "Lien Recrutement (prestataires)",
  "influencer.dashboard.copy": "Copier",
  "influencer.dashboard.copied": "Copie !",
  "influencer.dashboard.recentActivity": "Activite recente",

  "influencer.earnings.title": "Mes Gains",
  "influencer.earnings.total": "Total gagne",
  "influencer.earnings.pending": "En attente",
  "influencer.earnings.available": "Disponible",
  "influencer.earnings.withdrawn": "Deja retire",
  "influencer.earnings.chart": "Evolution des gains",

  "influencer.referrals.title": "Mes Filleuls",
  "influencer.referrals.recruitmentLink": "Votre lien de recrutement",
  "influencer.referrals.total": "Total filleuls",
  "influencer.referrals.active": "Actifs",
  "influencer.referrals.expired": "Expires",
  "influencer.referrals.commissionsGenerated": "Commissions generees",
  "influencer.referrals.info": "Vous touchez 5$ par appel recu par vos filleuls pendant 6 mois",
  "influencer.referrals.expiresIn": "Expire dans {days} jours",
  "influencer.referrals.expired": "Expire",

  "influencer.leaderboard.title": "Classement",
  "influencer.leaderboard.month": "Mois",
  "influencer.leaderboard.rank": "Rang",
  "influencer.leaderboard.name": "Nom",
  "influencer.leaderboard.community": "Communaute",
  "influencer.leaderboard.earnings": "Gains",
  "influencer.leaderboard.bonus": "Bonus",
  "influencer.leaderboard.top1Bonus": "x2 sur tous les gains",
  "influencer.leaderboard.top2Bonus": "x1.5 sur tous les gains",
  "influencer.leaderboard.top3Bonus": "x1.25 sur tous les gains",
  "influencer.leaderboard.myPosition": "Ma position",
  "influencer.leaderboard.outOfTop10": "Vous n'etes pas dans le Top 10 ce mois",

  "influencer.badges.title": "Mes Badges",
  "influencer.badges.obtained": "{count} badges obtenus",
  "influencer.badges.level": "Niveau {level}",
  "influencer.badges.progress": "{current}/{next} conversions pour le niveau suivant",
  "influencer.badges.category.conversions": "Conversions",
  "influencer.badges.category.earnings": "Gains",
  "influencer.badges.category.referrals": "Recrutement",
  "influencer.badges.category.streak": "Regularite",
  "influencer.badges.category.ranking": "Classement",
  "influencer.badges.category.community": "Communaute",

  "influencer.payments.title": "Paiements",
  "influencer.payments.availableBalance": "Solde disponible",
  "influencer.payments.minWithdrawal": "Retrait minimum : 50$",
  "influencer.payments.configureMethod": "Configurer ma methode de paiement",
  "influencer.payments.requestWithdrawal": "Demander un retrait",
  "influencer.payments.amount": "Montant",
  "influencer.payments.withdrawAll": "Tout retirer",
  "influencer.payments.submit": "Confirmer la demande",
  "influencer.payments.history": "Historique des retraits",

  "influencer.tools.title": "Outils Promotionnels",
  "influencer.tools.tabs.banners": "Bannieres",
  "influencer.tools.tabs.codes": "Codes",
  "influencer.tools.tabs.widgets": "Widgets",
  "influencer.tools.tabs.texts": "Textes",
  "influencer.tools.tabs.qrcode": "QR Code",
  "influencer.tools.banners.filter": "Filtrer par categorie",
  "influencer.tools.banners.download": "Telecharger",
  "influencer.tools.codes.format": "Format",
  "influencer.tools.codes.preview": "Apercu",
  "influencer.tools.codes.copy": "Copier le code",
  "influencer.tools.widgets.style": "Style",
  "influencer.tools.widgets.color": "Couleur",
  "influencer.tools.widgets.showCommunity": "Afficher le nom de ma communaute",
  "influencer.tools.widgets.language": "Langue",
  "influencer.tools.texts.type": "Type de texte",
  "influencer.tools.texts.language": "Langue",
  "influencer.tools.texts.characters": "Caracteres",
  "influencer.tools.qrcode.size": "Taille",
  "influencer.tools.qrcode.withLogo": "Avec logo SOS-Expat",
  "influencer.tools.qrcode.color": "Couleur",
  "influencer.tools.qrcode.withFrame": "Avec cadre",
  "influencer.tools.qrcode.withText": "Avec texte \"Scannez pour -5%\"",
  "influencer.tools.qrcode.download": "Telecharger",

  "influencer.profile.title": "Mon Profil",
  "influencer.profile.personal": "Informations personnelles",
  "influencer.profile.community": "Ma communaute",
  "influencer.profile.affiliateCode": "Mon code affilie",
  "influencer.profile.memberSince": "Membre depuis",
  "influencer.profile.save": "Enregistrer",
  "influencer.profile.deleteAccount": "Supprimer mon compte",

  "influencer.suspended.title": "Compte suspendu",
  "influencer.suspended.message": "Votre compte influenceur a ete suspendu.",
  "influencer.suspended.contact": "Contacter le support",

  "influencer.levels.1": "Apprenti",
  "influencer.levels.2": "Confirme",
  "influencer.levels.3": "Expert",
  "influencer.levels.4": "Ambassadeur",
  "influencer.levels.5": "Elite",

  "influencer.platforms.facebook_group": "Groupe Facebook",
  "influencer.platforms.facebook_page": "Page Facebook",
  "influencer.platforms.youtube": "YouTube",
  "influencer.platforms.tiktok": "TikTok",
  "influencer.platforms.instagram": "Instagram",
  "influencer.platforms.blog": "Blog / Site web",
  "influencer.platforms.forum": "Forum",
  "influencer.platforms.other": "Autre",

  "admin.menu.influencers": "Influenceurs",
  "admin.menu.influencers.list": "Liste",
  "admin.menu.influencers.countries": "Par Pays",
  "admin.menu.influencers.languages": "Par Langue",
  "admin.menu.influencers.finances": "Finances",
  "admin.menu.influencers.gamification": "Gamification",
  "admin.menu.influencers.widgets": "Widgets",
  "admin.menu.influencers.config": "Configuration"
}
```

#### Autres langues a traduire

Les memes cles doivent etre traduites dans:
- `en.json` (Anglais)
- `es.json` (Espagnol)
- `de.json` (Allemand)
- `pt.json` (Portugais)
- `ru.json` (Russe)
- `zh.json` (Chinois)
- `hi.json` (Hindi)
- `ar.json` (Arabe)

### AGENT-19: Routes Multilingues

#### Fichier: `sos/src/multilingual-system/core/routing/localeRoutes.ts` (ajouts)

```typescript
// Routes a ajouter pour le systeme Influencer

export const influencerRoutes = {
  'influencer-landing': {
    fr: 'devenir-influenceur',
    en: 'become-influencer',
    es: 'convertirse-en-influencer',
    de: 'influencer-werden',
    pt: 'tornar-se-influenciador',
    ru: 'stat-influencerom',
    zh: 'chengwei-yingxiangzhe',
    hi: 'influencer-banen',
    ar: 'kun-muathiran'
  },
  'influencer-register': {
    fr: 'influencer/inscription',
    en: 'influencer/register',
    es: 'influencer/registro',
    de: 'influencer/registrierung',
    pt: 'influencer/registro',
    ru: 'influencer/registraciya',
    zh: 'influencer/zhuce',
    hi: 'influencer/panjeekaran',
    ar: 'influencer/tasjeel'
  },
  'influencer-dashboard': {
    fr: 'influencer/tableau-de-bord',
    en: 'influencer/dashboard',
    es: 'influencer/panel',
    de: 'influencer/dashboard',
    pt: 'influencer/painel',
    ru: 'influencer/panel',
    zh: 'influencer/yibiaopan',
    hi: 'influencer/dashboard',
    ar: 'influencer/lawhat-altahakum'
  },
  'influencer-earnings': {
    fr: 'influencer/gains',
    en: 'influencer/earnings',
    es: 'influencer/ganancias',
    de: 'influencer/einnahmen',
    pt: 'influencer/ganhos',
    ru: 'influencer/zarabotok',
    zh: 'influencer/shouyi',
    hi: 'influencer/kamai',
    ar: 'influencer/alarabh'
  },
  'influencer-referrals': {
    fr: 'influencer/filleuls',
    en: 'influencer/referrals',
    es: 'influencer/referidos',
    de: 'influencer/empfehlungen',
    pt: 'influencer/indicacoes',
    ru: 'influencer/referaly',
    zh: 'influencer/tuijian',
    hi: 'influencer/sandarbh',
    ar: 'influencer/al-ihalat'
  },
  'influencer-leaderboard': {
    fr: 'influencer/classement',
    en: 'influencer/leaderboard',
    es: 'influencer/clasificacion',
    de: 'influencer/rangliste',
    pt: 'influencer/classificacao',
    ru: 'influencer/reyting',
    zh: 'influencer/paihangbang',
    hi: 'influencer/ranking',
    ar: 'influencer/attartib'
  },
  'influencer-badges': {
    fr: 'influencer/badges',
    en: 'influencer/badges',
    es: 'influencer/insignias',
    de: 'influencer/abzeichen',
    pt: 'influencer/distintivos',
    ru: 'influencer/znachki',
    zh: 'influencer/huizhang',
    hi: 'influencer/badges',
    ar: 'influencer/al-sharat'
  },
  'influencer-payments': {
    fr: 'influencer/paiements',
    en: 'influencer/payments',
    es: 'influencer/pagos',
    de: 'influencer/zahlungen',
    pt: 'influencer/pagamentos',
    ru: 'influencer/platezhi',
    zh: 'influencer/zhifu',
    hi: 'influencer/bhugtan',
    ar: 'influencer/almadfu-at'
  },
  'influencer-tools': {
    fr: 'influencer/outils',
    en: 'influencer/tools',
    es: 'influencer/herramientas',
    de: 'influencer/werkzeuge',
    pt: 'influencer/ferramentas',
    ru: 'influencer/instrumenty',
    zh: 'influencer/gongju',
    hi: 'influencer/upakaran',
    ar: 'influencer/al-adawat'
  },
  'influencer-profile': {
    fr: 'influencer/profil',
    en: 'influencer/profile',
    es: 'influencer/perfil',
    de: 'influencer/profil',
    pt: 'influencer/perfil',
    ru: 'influencer/profil',
    zh: 'influencer/geren',
    hi: 'influencer/profile',
    ar: 'influencer/almalaf-alshakhsi'
  },
  'influencer-suspended': {
    fr: 'influencer/suspendu',
    en: 'influencer/suspended',
    es: 'influencer/suspendido',
    de: 'influencer/gesperrt',
    pt: 'influencer/suspenso',
    ru: 'influencer/priostanovlen',
    zh: 'influencer/zanting',
    hi: 'influencer/nilambit',
    ar: 'influencer/muallaq'
  }
};
```

#### Fichier: `sos/src/config/adminMenu.ts` (ajouts)

```typescript
// Ajouter section Influenceurs dans adminMenuTree

{
  id: "influencers",
  labelKey: "admin.menu.influencers",
  icon: Users,  // ou Video pour representer les createurs
  children: [
    {
      id: "influencers-list",
      path: "/admin/influencers",
      labelKey: "admin.menu.influencers.list",
      icon: Users,
    },
    {
      id: "influencers-countries",
      path: "/admin/influencers/countries",
      labelKey: "admin.menu.influencers.countries",
      icon: MapPin,
    },
    {
      id: "influencers-languages",
      path: "/admin/influencers/languages",
      labelKey: "admin.menu.influencers.languages",
      icon: Languages,
    },
    {
      id: "influencers-finances",
      path: "/admin/influencers/finances",
      labelKey: "admin.menu.influencers.finances",
      icon: Wallet,
      badge: "NEW",
    },
    {
      id: "influencers-gamification",
      path: "/admin/influencers/gamification",
      labelKey: "admin.menu.influencers.gamification",
      icon: Trophy,
    },
    {
      id: "influencers-widgets",
      path: "/admin/influencers/widgets",
      labelKey: "admin.menu.influencers.widgets",
      icon: Layout,
    },
    {
      id: "influencers-config",
      path: "/admin/influencers/config",
      labelKey: "admin.menu.influencers.config",
      icon: Settings,
    },
  ],
},
```

### AGENT-20: Tests et Integration

#### Fichier: `sos/firebase/firestore.rules` (ajouts)

```javascript
// Regles Firestore pour les collections Influencer

// Helper function
function isInfluencer() {
  return request.auth != null &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'influencer';
}

// Collection influencers
match /influencers/{influencerId} {
  // Lecture: proprio ou admin
  allow read: if request.auth.uid == influencerId || isAdmin();

  // Creation: utilisateur authentifie qui cree son propre document
  allow create: if request.auth.uid == influencerId;

  // Mise a jour: proprio (champs limites) ou admin (tout)
  allow update: if (
    request.auth.uid == influencerId &&
    !request.resource.data.diff(resource.data).affectedKeys().hasAny([
      'status', 'level', 'totalEarnings', 'pendingBalance', 'availableBalance',
      'affiliateCodeClient', 'affiliateCodeRecruitment', 'totalConversions',
      'totalReferrals', 'currentStreak', 'longestStreak'
    ])
  ) || isAdmin();
}

// Collection influencer_commissions (lecture seule, ecriture par functions)
match /influencer_commissions/{commissionId} {
  allow read: if resource.data.influencerId == request.auth.uid || isAdmin();
  allow write: if false; // Cloud Functions only
}

// Collection influencer_withdrawals
match /influencer_withdrawals/{withdrawalId} {
  allow read: if resource.data.influencerId == request.auth.uid || isAdmin();
  allow create: if isInfluencer() &&
                   request.resource.data.influencerId == request.auth.uid;
  allow update: if isAdmin();
}

// Collection influencer_referrals (lecture seule)
match /influencer_referrals/{referralId} {
  allow read: if resource.data.influencerId == request.auth.uid || isAdmin();
  allow write: if false; // Cloud Functions only
}

// Collection influencer_badges (lecture seule)
match /influencer_badges/{badgeId} {
  allow read: if resource.data.influencerId == request.auth.uid || isAdmin();
  allow write: if false; // Cloud Functions only
}

// Collection influencer_clicks (ecriture publique, lecture limitee)
match /influencer_clicks/{clickId} {
  allow read: if isAdmin();
  allow create: if true; // Tracking public
  allow update: if false;
}

// Collection influencer_notifications
match /influencer_notifications/{notificationId} {
  allow read: if resource.data.influencerId == request.auth.uid || isAdmin();
  allow update: if resource.data.influencerId == request.auth.uid &&
                   request.resource.data.diff(resource.data).affectedKeys().hasOnly(['readAt']);
  allow write: if false; // Cloud Functions only
}

// Collection influencer_config (lecture publique)
match /influencer_config/{configId} {
  allow read: if true;
  allow write: if isAdmin();
}

// Collection influencer_monthly_rankings (lecture publique)
match /influencer_monthly_rankings/{rankingId} {
  allow read: if true;
  allow write: if false; // Cloud Functions only
}

// Collections widgets (lecture pour influenceurs, ecriture admin)
match /widget_banners/{bannerId} {
  allow read: if isInfluencer() || isAdmin();
  allow write: if isAdmin();
}

match /widget_banner_categories/{categoryId} {
  allow read: if isInfluencer() || isAdmin();
  allow write: if isAdmin();
}

match /widget_interactive/{widgetId} {
  allow read: if isInfluencer() || isAdmin();
  allow write: if isAdmin();
}

match /widget_styles/{styleId} {
  allow read: if isInfluencer() || isAdmin();
  allow write: if isAdmin();
}

match /widget_colors/{colorId} {
  allow read: if isInfluencer() || isAdmin();
  allow write: if isAdmin();
}

match /widget_texts/{textId} {
  allow read: if isInfluencer() || isAdmin();
  allow write: if isAdmin();
}

match /widget_downloads_log/{logId} {
  allow read: if resource.data.influencerId == request.auth.uid || isAdmin();
  allow create: if isInfluencer() &&
                   request.resource.data.influencerId == request.auth.uid;
}
```

#### Tests manuels recommandes

```
Phase 1 - Backend:
1. Inscription influenceur → Verifier creation documents Firestore
2. Generation codes affilies → Verifier unicite
3. Clic lien /ref/i/CODE → Verifier cookie installe avec discount=5
4. Client paie → Verifier commission creee avec 5% remise appliquee
5. Prestataire recrute → Verifier referral cree avec expiration 6 mois
6. Prestataire recoit appel → Verifier commission recrutement

Phase 2 - Frontend:
7. Landing page → SEO, responsive, CTAs
8. Inscription → Validation, creation compte
9. Dashboard → Donnees en temps reel
10. Outils promo → Bannieres, widgets, QR codes
11. Retrait → Verification seuil 50$

Phase 3 - Admin:
12. Liste influenceurs → Filtres, pagination
13. Detail influenceur → Tous les onglets
14. Traitement retrait → Flux complet
15. Gestion widgets → CRUD complet
```

---

## ARBORESCENCE DES FICHIERS A CREER

```
sos/firebase/functions/src/influencer/
├── index.ts
├── types.ts
├── types/
│   └── widgets.ts
├── initializeInfluencerConfig.ts
├── callables/
│   ├── registerInfluencer.ts
│   ├── getInfluencerDashboard.ts
│   ├── requestWithdrawal.ts
│   ├── updateInfluencerProfile.ts
│   ├── getLeaderboard.ts
│   ├── getPromotionalTools.ts
│   ├── generateQRCode.ts
│   ├── logWidgetDownload.ts
│   └── admin/
│       ├── getInfluencersList.ts
│       ├── getInfluencerDetail.ts
│       ├── processWithdrawal.ts
│       ├── updateInfluencerStatus.ts
│       └── manageWidgets.ts
├── triggers/
│   ├── onInfluencerCreated.ts
│   ├── onCallCompleted.ts
│   ├── onProviderRegistered.ts
│   ├── onCommissionStatusChanged.ts
│   └── onConversionForStreak.ts
├── scheduled/
│   ├── validatePendingCommissions.ts
│   ├── releaseValidatedCommissions.ts
│   ├── calculateMonthlyRankings.ts
│   ├── updateLevels.ts
│   ├── updateStreaks.ts
│   └── expireReferrals.ts
├── services/
│   ├── influencerCodeGenerator.ts
│   ├── influencerCommissionService.ts
│   ├── influencerWithdrawalService.ts
│   └── influencerFraudDetection.ts
└── utils/
    └── influencerConfigService.ts

sos/src/pages/Influencer/
├── index.ts
├── Landing/
│   └── InfluencerLanding.tsx
├── Auth/
│   ├── InfluencerRegister.tsx
│   └── InfluencerSuspended.tsx
└── Dashboard/
    ├── InfluencerDashboard.tsx
    ├── InfluencerEarnings.tsx
    ├── InfluencerReferrals.tsx
    ├── InfluencerLeaderboard.tsx
    ├── InfluencerBadges.tsx
    ├── InfluencerPayments.tsx
    ├── InfluencerProfile.tsx
    └── InfluencerTools.tsx

sos/src/components/Influencer/
├── Layout/
│   ├── InfluencerDashboardLayout.tsx
│   ├── InfluencerSidebar.tsx
│   └── InfluencerMobileNav.tsx
├── Cards/
│   ├── InfluencerBalanceCard.tsx
│   ├── InfluencerStatsCard.tsx
│   └── InfluencerLevelCard.tsx
├── Links/
│   └── InfluencerAffiliateLinks.tsx
├── Tools/
│   ├── BannersTab.tsx
│   ├── CodesTab.tsx
│   ├── WidgetsTab.tsx
│   ├── TextsTab.tsx
│   └── QRCodeTab.tsx
└── Forms/
    ├── InfluencerRegisterForm.tsx
    └── InfluencerWithdrawalForm.tsx

sos/src/hooks/
├── useInfluencer.ts
├── useInfluencerCommissions.ts
├── useInfluencerReferrals.ts
├── useInfluencerWithdrawal.ts
├── useInfluencerTools.ts
└── useInfluencerLeaderboard.ts

sos/src/pages/admin/Influencer/
├── AdminInfluencersList.tsx
├── AdminInfluencerDetail.tsx
├── AdminInfluencersByCountry.tsx
├── AdminInfluencersByLanguage.tsx
├── AdminInfluencerFinances.tsx
├── AdminInfluencerGamification.tsx
├── AdminInfluencerWidgets.tsx
└── AdminInfluencerConfig.tsx
```

---

## ESTIMATION TOTALE

| Phase | Agent(s) | Duree estimee |
|-------|----------|---------------|
| Backend Core | 06-09 | 5-7 jours |
| Frontend Core | 10-14 | 6-8 jours |
| Admin | 15-17 | 4-5 jours |
| Qualite | 18-20 | 3-4 jours |
| **TOTAL** | | **18-24 jours** |

Note: Estimation reduite grace a la reutilisation du code Chatters (services de paiement, gamification, etc.)

---

## CHECKLIST FINALE

- [ ] Types TypeScript complets
- [ ] Services backend (commissions, retraits, fraude)
- [ ] Tous les callables (user + admin)
- [ ] Tous les triggers
- [ ] Toutes les scheduled functions
- [ ] Regles Firestore
- [ ] Toutes les pages frontend
- [ ] Tous les composants
- [ ] Tous les hooks
- [ ] Toutes les pages admin
- [ ] Traductions 9 langues
- [ ] Routes multilingues
- [ ] Menu admin
- [ ] Tests manuels valides
- [ ] Build TypeScript OK (backend + frontend)

---

---

## MODIFICATIONS FOOTER ET NAVIGATION

### Lien Footer vers Landing Influenceur

#### Fichier: `sos/src/components/layout/Footer.tsx` (modification)

Ajouter dans la section "Partenaires" ou creer une nouvelle section:

```tsx
// Dans le footer, section liens
<div className="footer-section">
  <h4>{t('footer.partners')}</h4>
  <ul>
    <li>
      <Link to={localizedPath('chatter-landing')}>
        {t('footer.becomeChatter')}
      </Link>
    </li>
    <li>
      <Link to={localizedPath('influencer-landing')}>
        {t('footer.becomeInfluencer')}  {/* NOUVEAU */}
      </Link>
    </li>
    <li>
      <Link to={localizedPath('affiliate-landing')}>
        {t('footer.becomeAffiliate')}
      </Link>
    </li>
  </ul>
</div>
```

#### Traductions footer a ajouter (9 langues):

```json
// fr.json
{
  "footer.partners": "Partenaires",
  "footer.becomeChatter": "Devenir Chatter",
  "footer.becomeInfluencer": "Devenir Influenceur",
  "footer.becomeAffiliate": "Devenir Affilie"
}

// en.json
{
  "footer.partners": "Partners",
  "footer.becomeChatter": "Become a Chatter",
  "footer.becomeInfluencer": "Become an Influencer",
  "footer.becomeAffiliate": "Become an Affiliate"
}
```

---

## CONSOLE ADMIN COMPLETE - DETAILS SUPPLEMENTAIRES

### Structure complete du menu Admin Influenceurs

```
📺 INFLUENCEURS
├── 📊 Dashboard (Vue d'ensemble)
├── 👥 Liste des Influenceurs
├── 🌍 Par Pays (carte + liste)
├── 🗣️ Par Langue (9 langues)
├── 💰 Finances
│   ├── Resume financier
│   ├── Demandes de retrait
│   ├── Historique paiements
│   └── Rapports
├── 🏆 Gamification
│   ├── Top 10 mensuel
│   ├── Configuration niveaux
│   └── Gestion badges
├── 🎨 Widgets & Outils
│   ├── Bannieres (CRUD)
│   ├── Categories bannieres
│   ├── Widgets interactifs
│   ├── Textes promotionnels
│   ├── Couleurs
│   └── Statistiques widgets
└── ⚙️ Configuration
    ├── Commissions
    ├── Tracking
    ├── Paiements
    ├── Validation
    └── Gamification
```

### AGENT-15 (Detail): Pages Admin Dashboard

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerDashboard.tsx`

```tsx
// Dashboard admin influenceurs (vue d'ensemble)
// Route: /admin/influencers/dashboard
//
// KPIs:
// - Total influenceurs (avec evolution vs mois precedent)
// - Influenceurs actifs ce mois
// - Commissions versees ce mois
// - Commissions en attente de traitement
// - Conversions ce mois
// - CA genere par les influenceurs
// - Taux de conversion moyen
// - Audience totale (somme des communautes)
//
// Graphiques:
// - Evolution inscriptions (12 mois)
// - Evolution conversions (12 mois)
// - Repartition par plateforme (camembert)
// - Repartition par langue (barres)
// - Top 5 pays (barres horizontales)
//
// Alertes:
// - Nouveaux influenceurs (24h)
// - Paiements en attente
// - Gros influenceurs (audience > 100K)
// - Influenceurs inactifs (30+ jours)
```

### AGENT-16 (Detail): Gestion complete des Widgets

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerBanners.tsx`

```tsx
// Gestion des bannieres
// Route: /admin/influencers/widgets/banners
//
// Tableau:
// - Apercu (miniature)
// - Nom interne
// - Categorie
// - Dimensions
// - Style
// - Status (actif/inactif)
// - Telechargements (compteur)
// - Actions: Modifier, Dupliquer, Desactiver, Supprimer
//
// Filtres:
// - Par categorie
// - Par style
// - Par status
// - Recherche nom
//
// Formulaire ajout/modification:
// - Nom interne*
// - Categorie* (select)
// - Dimensions* (largeur x hauteur)
// - Style* (select)
// - Upload PNG* (fond transparent)
// - Upload JPG (optionnel, fond opaque)
// - Options:
//   - Personnalisation couleur autorisee
//   - Ajout nom communaute autorise
//   - Mise en avant (featured)
// - Ordre affichage
// - Status (actif/inactif)
```

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerBannerCategories.tsx`

```tsx
// Gestion des categories de bannieres
// Route: /admin/influencers/widgets/categories
//
// Categories par defaut:
// - Header Large (970x90)
// - Header Standard (728x90)
// - Header Medium (468x60)
// - Sidebar Rectangle (300x250)
// - Sidebar Carre (300x300)
// - Sidebar Vertical (160x600)
// - Post Facebook (1200x630)
// - Post Instagram (1080x1080)
// - Story (1080x1920)
// - YouTube Thumbnail (1280x720)
// - Email Signature (600x100)
//
// CRUD categories:
// - Nom
// - Slug
// - Dimensions par defaut
// - Description
// - Ordre affichage
// - Status
```

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerInteractiveWidgets.tsx`

```tsx
// Gestion des widgets interactifs
// Route: /admin/influencers/widgets/interactive
//
// Liste des widgets:
// - Widget Recherche (300x400)
// - Widget Recherche Large (600x200)
// - Widget Bouton (200x60)
// - Widget Card (350x450)
// - Widget Flottant (60x60)
//
// Configuration par widget:
// - Textes (titre, sous-titre, placeholders, bouton) en 9 langues
// - Afficher nom communaute par defaut
// - Types d'experts disponibles
// - Dimensions
// - Styles disponibles
//
// Gestion des styles:
// - Nom du style
// - Configuration CSS (couleurs, bordures, ombres, police)
// - Image de preview
// - Style par defaut
// - Ordre affichage
```

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerTexts.tsx`

```tsx
// Gestion des textes promotionnels
// Route: /admin/influencers/widgets/texts
//
// Types de textes:
// - Bio courte (~100 caracteres)
// - Bio longue (~250 caracteres)
// - Post promotionnel (~500 caracteres)
// - Description groupe (~300 caracteres)
// - Message bienvenue (~400 caracteres)
//
// Formulaire:
// - Nom interne
// - Type (select)
// - Longueur max recommandee
// - Contenu en 9 langues (9 champs texte)
// - Variables: [CODE], [LIEN], [NOM_COMMUNAUTE], [REMISE]
// - Ordre affichage
// - Status
//
// Preview avec variables remplacees
```

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerColors.tsx`

```tsx
// Gestion des couleurs disponibles
// Route: /admin/influencers/widgets/colors
//
// Couleurs par defaut:
// - Rouge SOS-Expat #DC2626 (DEFAUT - non supprimable)
// - Rouge fonce #B91C1C
// - Rouge clair #EF4444
// - Noir #1F2937
// - Blanc #FFFFFF
// - Gris #6B7280
//
// Pour chaque couleur:
// - Nom
// - Code hex
// - Preview visuel
// - Est la couleur par defaut
// - Ordre affichage
// - Status (actif/inactif)
//
// Note: Le rouge SOS-Expat ne peut pas etre desactive
```

#### Fichier: `sos/src/pages/admin/Influencer/AdminInfluencerWidgetStats.tsx`

```tsx
// Statistiques des widgets
// Route: /admin/influencers/widgets/stats
//
// Metriques:
// - Total telechargements bannieres
// - Total copies codes
// - Total generations QR
// - Widgets integres (iframe actifs)
//
// Graphiques:
// - Top 10 bannieres telechargees
// - Repartition par type de widget
// - Evolution telechargements (30 jours)
// - Formats les plus utilises
//
// Tableau detaille:
// - Par influenceur: nombre de telechargements
// - Par banniere: nombre de telechargements
// - Par format: nombre d'utilisations
```

### Routes Admin a ajouter

```typescript
// Dans le router principal, ajouter:

// Admin Influencers
{ path: '/admin/influencers', element: <AdminInfluencersList /> },
{ path: '/admin/influencers/dashboard', element: <AdminInfluencerDashboard /> },
{ path: '/admin/influencers/:id', element: <AdminInfluencerDetail /> },
{ path: '/admin/influencers/countries', element: <AdminInfluencersByCountry /> },
{ path: '/admin/influencers/languages', element: <AdminInfluencersByLanguage /> },
{ path: '/admin/influencers/finances', element: <AdminInfluencerFinances /> },
{ path: '/admin/influencers/gamification', element: <AdminInfluencerGamification /> },

// Admin Widgets
{ path: '/admin/influencers/widgets', element: <AdminInfluencerWidgets /> },
{ path: '/admin/influencers/widgets/banners', element: <AdminInfluencerBanners /> },
{ path: '/admin/influencers/widgets/categories', element: <AdminInfluencerBannerCategories /> },
{ path: '/admin/influencers/widgets/interactive', element: <AdminInfluencerInteractiveWidgets /> },
{ path: '/admin/influencers/widgets/texts', element: <AdminInfluencerTexts /> },
{ path: '/admin/influencers/widgets/colors', element: <AdminInfluencerColors /> },
{ path: '/admin/influencers/widgets/stats', element: <AdminInfluencerWidgetStats /> },

// Admin Config
{ path: '/admin/influencers/config', element: <AdminInfluencerConfig /> },
```

---

## ARBORESCENCE COMPLETE MISE A JOUR

```
sos/src/pages/admin/Influencer/
├── index.ts
├── AdminInfluencerDashboard.tsx       (NOUVEAU)
├── AdminInfluencersList.tsx
├── AdminInfluencerDetail.tsx
├── AdminInfluencersByCountry.tsx
├── AdminInfluencersByLanguage.tsx
├── AdminInfluencerFinances.tsx
├── AdminInfluencerGamification.tsx
├── AdminInfluencerConfig.tsx
└── Widgets/
    ├── AdminInfluencerWidgets.tsx     (page principale onglets)
    ├── AdminInfluencerBanners.tsx
    ├── AdminInfluencerBannerCategories.tsx
    ├── AdminInfluencerInteractiveWidgets.tsx
    ├── AdminInfluencerTexts.tsx
    ├── AdminInfluencerColors.tsx
    └── AdminInfluencerWidgetStats.tsx
```

---

**Document genere automatiquement pour implementation multi-agents**
**Version 1.1 - 29 janvier 2026**
**Mise a jour: Ajout footer link + console admin complete**

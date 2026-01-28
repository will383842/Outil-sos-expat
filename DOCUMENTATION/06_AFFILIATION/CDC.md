# Systeme d'Affiliation SOS-Expat - Cahier des Charges

> **Version**: 2.0
> **Date**: 27 Janvier 2026
> **Statut**: Production Ready

---

## 1. Presentation du Systeme

### 1.1 Objectif

Permettre a tous les utilisateurs SOS-Expat (clients ET prestataires) de parrainer de nouveaux utilisateurs et de gagner des commissions sur les frais de mise en relation generes par leurs filleuls.

### 1.2 Concept Cle : La Tirelire (Piggy Bank)

Chaque utilisateur dispose d'une tirelire qui accumule ses gains d'affiliation :

```
┌─────────────────────────────────────────────────────────────┐
│                    MA TIRELIRE                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Total gagne (historique)     │  156.75 EUR                 │
│  ─────────────────────────────┼───────────────────────────  │
│  Deja retire                  │  100.00 EUR                 │
│  ─────────────────────────────┼───────────────────────────  │
│  Disponible au retrait        │   56.75 EUR                 │
│                                                             │
│  [Retirer mes gains via Wise]  (minimum 30 EUR)            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.3 Acteurs du Systeme

| Acteur | Description | Actions |
|--------|-------------|---------|
| **Affilie** | Tout utilisateur inscrit | Partager lien, voir filleuls, voir tirelire, retirer |
| **Filleul** | Inscrit via lien affiliation | Utiliser la plateforme (genere commissions) |
| **Client** | Paie des appels | Peut etre affilie ET filleul |
| **Prestataire** | Avocat ou Helper | Peut etre affilie ET filleul |
| **Admin** | Gestionnaire | Configurer taux, voir stats, gerer payouts |

### 1.4 Principe du Taux Fige a Vie

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           REGLE FONDAMENTALE                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Le taux de commission d'un affilie est CAPTURE au moment de son inscription  ║
║  et reste IDENTIQUE pour toute la duree de vie de son compte.                 ║
║                                                                               ║
║  Si le taux global change apres son inscription, cela N'AFFECTE PAS           ║
║  son taux personnel. Seuls les NOUVEAUX inscrits heritent du nouveau taux.    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**Exemple concret :**

```
JANVIER 2026 : Taux global = 75%
├── Marie s'inscrit → Son taux = 75% (A VIE)

MARS 2026 : Admin change le taux a 60%
├── Marie garde 75%
├── Paul s'inscrit → Son taux = 60% (A VIE)

JUIN 2026 : Admin change le taux a 50%
├── Marie garde 75%
├── Paul garde 60%
└── Sophie s'inscrit → Son taux = 50% (A VIE)

Si un filleul de Marie appelle un avocat (35 EUR) :
  → Commission Marie = 35 EUR x 75% = 26.25 EUR
```

---

## 2. Regles Metier

### 2.1 Inscription et Code Affilie

| ID | Regle |
|----|-------|
| R01 | Tout nouvel utilisateur recoit automatiquement un code affilie unique |
| R02 | Le code est genere : 3 lettres prenom + 6 caracteres hash (ex: `wil7f8e3a`) |
| R03 | Le code affilie est permanent et ne peut PAS etre modifie |
| R04 | L'inscription peut se faire avec ou sans code de parrainage |
| R05 | Le lien parrain/filleul est permanent |
| R06 | Un utilisateur NE PEUT PAS etre son propre parrain |

### 2.2 Calcul des Commissions

| ID | Regle |
|----|-------|
| R07 | La commission est calculee sur les **frais de mise en relation** UNIQUEMENT |
| R08 | Frais avocat (20 min) = 35 EUR / Frais helper (30 min) = 25 EUR |
| R09 | Formule : `Commission = Frais connexion x Taux personnel affilie` |
| R10 | Commission creee SEULEMENT si appel >= 120 secondes (2 minutes) |
| R11 | Commission disponible IMMEDIATEMENT apres validation appel |
| R12 | Commission generee sur CHAQUE appel du filleul (a vie, illimite) |

**Tableau des commissions :**

| Prestataire | Frais | Taux 75% | Taux 60% | Taux 50% |
|-------------|-------|----------|----------|----------|
| Avocat | 35 EUR | **26.25 EUR** | **21.00 EUR** | **17.50 EUR** |
| Helper | 25 EUR | **18.75 EUR** | **15.00 EUR** | **12.50 EUR** |

### 2.3 Tirelire et Balances

| ID | Regle |
|----|-------|
| R13 | `affiliateBalance` = Total cumule historique (ne diminue JAMAIS) |
| R14 | `pendingAffiliateBalance` = Montant disponible au retrait |
| R15 | `Montant retire = affiliateBalance - pendingAffiliateBalance` |
| R16 | Apres retrait, `pendingAffiliateBalance` est remis a 0 |

### 2.4 Retraits via Wise

| ID | Regle |
|----|-------|
| R17 | Montant minimum de retrait : **30 EUR** |
| R18 | Methode de paiement : **Wise** (virement international) |
| R19 | L'utilisateur DOIT renseigner ses coordonnees bancaires avant retrait |
| R20 | UN SEUL retrait a la fois (pas de retrait pendant un retrait en cours) |
| R21 | Email de confirmation a chaque etape |
| R22 | Types de comptes supportes : IBAN (EU), Sort Code (UK), ABA (US) |

### 2.5 Devises

| ID | Regle |
|----|-------|
| R23 | Commissions stockees en **centimes EUR** (ex: 2625 = 26.25 EUR) |
| R24 | Conversion vers devise du compte bancaire au moment du retrait |
| R25 | Taux de change Wise applique (mid-market rate) |
| R26 | Frais Wise deduits du montant |

---

## 3. Architecture Technique

### 3.1 Stack Technologique

| Composant | Technologie |
|-----------|-------------|
| Base de donnees | Firebase Firestore |
| Backend | Firebase Cloud Functions (Node.js/TypeScript) |
| Authentification | Firebase Auth |
| Frontend | React 18 + TypeScript |
| UI | Tailwind CSS + Radix UI |
| **Paiements sortants** | **Wise Business API** |
| Notifications | Zoho SMTP + FCM |
| i18n | React Intl (9 langues) |

### 3.2 Flux de Donnees

```
1. INSCRIPTION
   Nouvel user → Auth Trigger → Genere code + Capture taux → Document user cree

2. PARRAINAGE
   Filleul clique ?ref=XXX → Inscription → Lien parrain cree → Parrain notifie

3. APPEL & COMMISSION
   Filleul paie → Appel >=120s → Capture paiement → Commission creee → Tirelire MAJ

4. RETRAIT
   Affilie demande → Validation → Wise Quote → Wise Transfer → Webhook → MAJ statut
```

---

## 4. Modele de Donnees Firestore

### 4.1 Collection `users` - Champs Affiliation

```typescript
interface UserAffiliateFields {
  // Code unique de parrainage - IMMUTABLE
  affiliateCode: string;

  // UID du parrain (null si inscription directe)
  referredBy: string | null;

  // Taux capture a l'inscription - NE CHANGE JAMAIS
  affiliateCommissionRate: number; // 0.75 = 75%

  // Total cumule historique en CENTIMES
  affiliateBalance: number;

  // Disponible au retrait en CENTIMES
  pendingAffiliateBalance: number;

  // Nombre de filleuls parraines
  referralCount: number;

  // Coordonnees bancaires (CHIFFREES)
  bankDetails: {
    accountHolderName: string;
    accountType: 'iban' | 'sort_code' | 'aba';
    iban?: string;           // CHIFFRE
    sortCode?: string;       // CHIFFRE
    accountNumber?: string;  // CHIFFRE
    routingNumber?: string;  // CHIFFRE
    currency: string;
    country: string;
  } | null;
}
```

### 4.2 Collection `affiliate_commissions`

```typescript
interface AffiliateCommission {
  id: string;
  affiliateId: string;         // UID du parrain
  referralId: string;          // UID du filleul
  callSessionId: string;
  providerType: 'lawyer' | 'helper';
  connectionFee: number;       // Centimes EUR
  commissionRate: number;      // Taux applique
  commissionAmount: number;    // Centimes EUR
  status: 'pending' | 'confirmed' | 'paid';
  createdAt: Timestamp;
  paidAt?: Timestamp;
  payoutId?: string;
}
```

### 4.3 Collection `affiliate_payouts`

```typescript
interface AffiliatePayout {
  id: string;
  userId: string;
  amount: number;              // Centimes EUR
  currency: string;
  targetCurrency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  wiseTransferId?: string;
  wiseQuoteId?: string;
  wiseFee?: number;
  exchangeRate?: number;
  bankDetails: object;         // Snapshot
  createdAt: Timestamp;
  processedAt?: Timestamp;
  completedAt?: Timestamp;
  errorMessage?: string;
}
```

### 4.4 Collection `affiliate_config`

```typescript
// Document unique: affiliate_config/default
interface AffiliateConfig {
  // Taux actuel pour les nouveaux inscrits (0-1)
  defaultCommissionRate: number;

  // Montants en centimes EUR
  lawyerConnectionFee: number;   // 3500 = 35 EUR
  helperConnectionFee: number;   // 2500 = 25 EUR

  // Retraits
  minimumWithdrawal: number;     // 3000 = 30 EUR
  payoutEnabled: boolean;

  // Hold period (securite)
  holdPeriodHours: number;       // 72 = 3 jours

  // Limites
  maxMonthlyPayout: number;      // 500000 = 5000 EUR
  maxAnnualPayout: number;       // 5000000 = 50000 EUR
  kycThreshold: number;          // 100000 = 1000 EUR

  // Timestamps
  updatedAt: Timestamp;
  updatedBy: string;
}
```

---

## 5. Backend - Cloud Functions

### 5.1 Triggers

| Function | Type | Description |
|----------|------|-------------|
| `onUserCreated` | Auth Trigger | Genere code, capture taux, lie parrain |
| `onCallCompleted` | Firestore Trigger | Cree commission si eligible |

### 5.2 Callables (User)

| Function | Description |
|----------|-------------|
| `getAffiliateStats` | Statistiques de l'affilie |
| `getAffiliateCommissions` | Liste des commissions |
| `updateBankDetails` | MAJ coordonnees bancaires |
| `requestWithdrawal` | Demande de retrait |

### 5.3 Callables (Admin)

| Function | Description |
|----------|-------------|
| `getAdminAffiliateStats` | Stats globales affiliation |
| `listAllAffiliates` | Liste tous les affilies |
| `updateAffiliateConfig` | Modifier la configuration |
| `processManualPayout` | Traitement manuel d'un payout |

### 5.4 Scheduled

| Function | Schedule | Description |
|----------|----------|-------------|
| `releaseHeldCommissions` | Toutes les heures | Libere commissions apres hold period |
| `retryFailedPayouts` | Toutes les 6h | Retry des payouts echoues |
| `updateAffiliateMetrics` | Quotidien | MAJ metriques dashboard |

### 5.5 Webhook

| Function | Description |
|----------|-------------|
| `wiseWebhook` | Recoit les notifications Wise |

---

## 6. Integration Wise

### 6.1 Configuration

```typescript
const WISE_CONFIG = {
  API_URL: 'https://api.wise.com',
  SANDBOX_URL: 'https://api.sandbox.wise.com',
  PROFILE_ID: process.env.WISE_PROFILE_ID,
  API_TOKEN: process.env.WISE_API_TOKEN,
  WEBHOOK_SECRET: process.env.WISE_WEBHOOK_SECRET
};
```

### 6.2 Flux de Paiement

```
1. Utilisateur demande retrait
   └── requestWithdrawal callable
       ├── Verifier montant >= 30 EUR
       ├── Verifier pas de payout en cours
       └── Creer document payout (status: pending)

2. Traitement du payout
   └── processWisePayout
       ├── Creer Recipient Wise si necessaire
       ├── Obtenir Quote
       ├── Creer Transfer
       └── Financer le transfer

3. Confirmation via Webhook
   └── wiseWebhook
       ├── Verifier signature HMAC
       ├── Si "funds_converted" → processing
       └── Si "outgoing_payment_sent" → completed
```

### 6.3 Services Wise

```typescript
// services/wise/
├── wiseClient.ts      // Client Axios avec retry
├── recipients.ts      // Gestion des beneficiaires
├── quotes.ts          // Obtention des devis
├── transfers.ts       // Creation des virements
└── webhooks.ts        // Verification des webhooks
```

---

## 7. Frontend - Espace Utilisateur

### 7.1 Pages

| Page | Route | Description |
|------|-------|-------------|
| Tirelire | `/dashboard/affiliation` | Vue principale affiliation |
| Commissions | `/dashboard/affiliation/commissions` | Historique commissions |
| Filleuls | `/dashboard/affiliation/referrals` | Liste des filleuls |
| Retrait | `/dashboard/affiliation/withdraw` | Formulaire de retrait |
| Coordonnees | `/dashboard/affiliation/bank` | Gestion coordonnees bancaires |

### 7.2 Composants Principaux

```typescript
// components/affiliate/
├── PiggyBank.tsx           // Tirelire animee
├── CommissionsList.tsx     // Liste des commissions
├── AffiliateLink.tsx       // Lien + QR code
├── WithdrawalButton.tsx    // Bouton de retrait
├── BankDetailsForm.tsx     // Formulaire IBAN/Sort Code
├── StatCard.tsx            // Carte statistique
└── AffiliateWidget.tsx     // Widget dashboard
```

### 7.3 Hooks

```typescript
// hooks/
├── useAffiliate.ts         // Stats et solde
├── useCommissions.ts       // Liste commissions
├── useBankDetails.ts       // Coordonnees bancaires
└── useWithdrawal.ts        // Processus de retrait
```

---

## 8. Frontend - Administration

### 8.1 Pages Admin

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/admin/affiliation` | Vue d'ensemble |
| Affilies | `/admin/affiliation/affiliates` | Liste tous les affilies |
| Payouts | `/admin/affiliation/payouts` | Gestion des retraits |
| Configuration | `/admin/affiliation/config` | Parametres systeme |
| Analytics | `/admin/affiliation/analytics` | Graphiques et metriques |

### 8.2 Fonctionnalites Admin

- Voir tous les affilies avec leurs stats
- Modifier le taux global (pour nouveaux inscrits)
- Approuver/rejeter les payouts manuellement
- Voir l'historique complet des commissions
- Graphiques d'evolution (Recharts)

---

## 9. Securite

### 9.1 Chiffrement

```typescript
// Chiffrement AES-256-CBC pour les coordonnees bancaires
const ENCRYPTION_KEY = process.env.AFFILIATE_ENCRYPTION_KEY; // 32 bytes hex

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}
```

### 9.2 Detection de Fraude

```typescript
interface FraudCheck {
  sameIPCount: number;        // Inscriptions meme IP
  sameDeviceCount: number;    // Inscriptions meme device
  emailPatternScore: number;  // Score similarite emails
  timingScore: number;        // Rapidite des actions
}

// Seuils
const FRAUD_THRESHOLDS = {
  SAME_IP_MAX: 5,
  SAME_DEVICE_MAX: 3,
  EMAIL_PATTERN_MAX: 0.8,
  MIN_TIME_BETWEEN_ACTIONS: 60 // secondes
};
```

### 9.3 KYC

- Verification obligatoire si cumul > 1000 EUR
- Integration possible avec Wise KYC
- Documents requis: Piece d'identite + Justificatif de domicile

---

## 10. Timeline Implementation

| Phase | Duree | Activites |
|-------|-------|-----------|
| **Preparation** | 2j | Wise sandbox, Firebase config |
| **Firestore** | 3j | Collections, indexes, rules |
| **Backend** | 8j | Services Wise, triggers, callables |
| **Frontend User** | 6j | Hooks, pages, composants |
| **Frontend Admin** | 3j | Dashboard, tables, analytics |
| **Tests** | 3j | Unit, E2E, Wise sandbox |
| **Staging** | 2j | UAT complet |
| **Production** | 1j | Deploiement, Wise prod |

**Total: 15-20 heures de developpement**

---

## 11. Checklist Pre-Production

### Backend
- [ ] Triggers Firebase deployes
- [ ] Callables testees
- [ ] Integration Wise fonctionnelle
- [ ] Webhooks configures
- [ ] Secrets en place

### Frontend
- [ ] Pages user implementees
- [ ] Pages admin implementees
- [ ] Traductions 9 langues
- [ ] Tests E2E passes

### Securite
- [ ] Chiffrement AES-256 actif
- [ ] Detection fraude active
- [ ] Firestore rules deployees
- [ ] Rate limiting configure

### Wise
- [ ] Compte Business configure
- [ ] API Token production
- [ ] Webhook secret configure
- [ ] KYC process defini

---

## Voir Aussi

- [Implementation Backend](./BACKEND.md)
- [Implementation Frontend](./FRONTEND.md)
- [Integration Wise](./WISE.md)
- [Guide de Deploiement](../01_GETTING_STARTED/INSTALLATION.md)

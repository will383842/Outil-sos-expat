# CAHIER DES CHARGES COMPLET
# SYSTÈME D'AFFILIATION SOS-EXPAT

**Version:** 1.0  
**Date:** 20 janvier 2026  
**Statut:** Production Ready  
**Projet:** SOS-Expat.com

---

# TABLE DES MATIÈRES

1. [Présentation du Système](#1-présentation-du-système)
2. [Règles Métier](#2-règles-métier)
3. [Architecture Technique](#3-architecture-technique)
4. [Modèle de Données Firestore](#4-modèle-de-données-firestore)
5. [Backend - Cloud Functions](#5-backend---cloud-functions)
6. [Intégration Wise](#6-intégration-wise)
7. [Frontend - Espace Utilisateur](#7-frontend---espace-utilisateur)
8. [Frontend - Administration](#8-frontend---administration)
9. [Système de Notifications](#9-système-de-notifications)
10. [Sécurité](#10-sécurité)
11. [Flux Complets](#11-flux-complets)
12. [Tests](#12-tests)
13. [Déploiement](#13-déploiement)
14. [Checklist d'Implémentation](#14-checklist-dimplémentation)

---

# 1. PRÉSENTATION DU SYSTÈME

## 1.1 Objectif

Permettre à tous les utilisateurs SOS-Expat (clients ET prestataires) de parrainer de nouveaux utilisateurs et de gagner des commissions sur les frais de mise en relation générés par leurs filleuls.

## 1.2 Concept Clé : La Tirelire (Piggy Bank)

Chaque utilisateur dispose d'une **tirelire** qui accumule ses gains d'affiliation :

```
┌─────────────────────────────────────────────────────────────┐
│                    🐷 MA TIRELIRE                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Total gagné (historique)     │  € 156.75                   │
│  ─────────────────────────────┼───────────────────────────  │
│  Déjà retiré                  │  € 100.00                   │
│  ─────────────────────────────┼───────────────────────────  │
│  💰 Disponible au retrait     │  € 56.75                    │
│                                                             │
│  [Retirer mes gains via Wise]  (minimum 30€)               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 1.3 Acteurs du Système

| Acteur | Description | Actions |
|--------|-------------|---------|
| **Affilié** | Tout utilisateur inscrit | Partager lien, voir filleuls, voir tirelire, retirer |
| **Filleul** | Inscrit via lien affiliation | Utiliser la plateforme (génère commissions) |
| **Client** | Paie des appels | Peut être affilié ET filleul |
| **Prestataire** | Avocat ou Helper | Peut être affilié ET filleul |
| **Admin** | Gestionnaire | Configurer taux, voir stats, gérer payouts |

## 1.4 Principe du Taux Figé à Vie

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                           RÈGLE FONDAMENTALE                                  ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║  Le taux de commission d'un affilié est CAPTURÉ au moment de son inscription  ║
║  et reste IDENTIQUE pour toute la durée de vie de son compte.                 ║
║                                                                               ║
║  Si le taux global change après son inscription, cela N'AFFECTE PAS           ║
║  son taux personnel. Seuls les NOUVEAUX inscrits héritent du nouveau taux.    ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

**Exemple concret :**

```
JANVIER 2026 : Taux global = 75%
├── Marie s'inscrit → Son taux = 75% (À VIE)
│
MARS 2026 : Admin change le taux à 60%
├── Marie garde 75%
├── Paul s'inscrit → Son taux = 60% (À VIE)
│
JUIN 2026 : Admin change le taux à 50%
├── Marie garde 75%
├── Paul garde 60%  
└── Sophie s'inscrit → Son taux = 50% (À VIE)

Si un filleul de Marie appelle un avocat (35€) :
  → Commission Marie = 35€ × 75% = 26.25€

Si un filleul de Paul appelle un avocat (35€) :
  → Commission Paul = 35€ × 60% = 21.00€
```

---

# 2. RÈGLES MÉTIER

## 2.1 Inscription et Code Affilié

| ID | Règle |
|----|-------|
| R01 | Tout nouvel utilisateur (client OU prestataire) reçoit automatiquement un code affilié unique |
| R02 | Le code est généré : 3 lettres prénom + 6 caractères hash (ex: `wil7f8e3a`) |
| R03 | Le code affilié est permanent et ne peut PAS être modifié |
| R04 | L'inscription peut se faire avec ou sans code de parrainage |
| R05 | Le lien parrain/filleul est permanent (sauf modification admin) |
| R06 | Un utilisateur NE PEUT PAS être son propre parrain |

## 2.2 Calcul des Commissions

| ID | Règle |
|----|-------|
| R07 | La commission est calculée sur les **frais de mise en relation** UNIQUEMENT |
| R08 | Frais avocat (20 min) = 35€ / Frais helper (30 min) = 25€ |
| R09 | Formule : `Commission = Frais connexion × Taux personnel affilié` |
| R10 | Commission créée SEULEMENT si appel ≥ 120 secondes (2 minutes) |
| R11 | Commission disponible IMMÉDIATEMENT après validation appel |
| R12 | Commission générée sur CHAQUE appel du filleul (à vie, illimité) |

**Tableau des commissions :**

| Prestataire | Frais | Taux 75% | Taux 60% | Taux 50% |
|-------------|-------|----------|----------|----------|
| Avocat | 35€ | **26.25€** | **21.00€** | **17.50€** |
| Helper | 25€ | **18.75€** | **15.00€** | **12.50€** |

## 2.3 Tirelire et Balances

| ID | Règle |
|----|-------|
| R13 | `affiliateBalance` = Total cumulé historique (ne diminue JAMAIS) |
| R14 | `pendingAffiliateBalance` = Montant disponible au retrait |
| R15 | `Montant retiré = affiliateBalance - pendingAffiliateBalance` |
| R16 | Après retrait, `pendingAffiliateBalance` est remis à 0 |

## 2.4 Retraits via Wise

| ID | Règle |
|----|-------|
| R17 | Montant minimum de retrait : **30€** (ou équivalent devise) |
| R18 | Méthode de paiement : **Wise** (virement international) |
| R19 | L'utilisateur DOIT renseigner ses coordonnées bancaires avant retrait |
| R20 | UN SEUL retrait à la fois (pas de retrait pendant un retrait en cours) |
| R21 | Email de confirmation à chaque étape (demande, traitement, succès/échec) |
| R22 | Types de comptes supportés : IBAN (EU), Sort Code (UK), ABA (US) |

## 2.5 Devises

| ID | Règle |
|----|-------|
| R23 | Commissions stockées en **centimes EUR** (ex: 2625 = 26.25€) |
| R24 | Conversion vers devise du compte bancaire au moment du retrait |
| R25 | Taux de change Wise appliqué (mid-market rate) |
| R26 | Frais Wise déduits du montant (transparents pour l'utilisateur) |

---

# 3. ARCHITECTURE TECHNIQUE

## 3.1 Stack Technologique

| Composant | Technologie |
|-----------|-------------|
| Base de données | Firebase Firestore |
| Backend | Firebase Cloud Functions (Node.js/TypeScript) |
| Authentification | Firebase Auth |
| Frontend | React 18 + TypeScript |
| UI | Tailwind CSS + Radix UI |
| Paiements entrants | Stripe + PayPal (existant) |
| **Paiements sortants** | **Wise Business API** |
| Notifications | Zoho SMTP + FCM |
| i18n | React Intl (9 langues) |

## 3.2 Architecture Globale

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              UTILISATEURS                                   │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                    │
│   │   Client    │    │ Prestataire │    │    Admin    │                    │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                    │
└──────────┼──────────────────┼──────────────────┼────────────────────────────┘
           │                  │                  │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │    SignUp    │  │  Dashboard   │  │  Tirelire    │  │ Admin Panel  │   │
│  │ (code param) │  │   Affilié    │  │   Retrait    │  │  Affiliation │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CLOUD FUNCTIONS (Backend)                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │ onUserCreate │  │   create     │  │  request     │  │    Admin     │   │
│  │ (Auth Trig.) │  │ Commission   │  │ Withdrawal   │  │    APIs      │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                      │
│  │    Wise      │  │    Wise      │  │    User      │                      │
│  │   Payout     │  │   Webhook    │  │    APIs      │                      │
│  └──────────────┘  └──────────────┘  └──────────────┘                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
           ┌────────────────────────┼────────────────────────┐
           ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│    FIRESTORE     │    │      WISE        │    │   NOTIFICATIONS  │
│  ┌────────────┐  │    │                  │    │  ┌────────────┐  │
│  │   users    │  │    │  - Recipients    │    │  │ Zoho SMTP  │  │
│  │commissions │  │    │  - Quotes        │    │  │    FCM     │  │
│  │  payouts   │  │    │  - Transfers     │    │  │   In-App   │  │
│  │  config    │  │    │  - Webhooks      │    │  └────────────┘  │
│  └────────────┘  │    │                  │    │                  │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

## 3.3 Flux de Données

```
1. INSCRIPTION
   Nouvel user → Auth Trigger → Génère code + Capture taux → Document user créé
   
2. PARRAINAGE  
   Filleul clique ?code=XXX → Inscription → Lien parrain créé → Parrain notifié
   
3. APPEL & COMMISSION
   Filleul paie → Appel ≥120s → Capture paiement → Commission créée → Tirelire MAJ
   
4. RETRAIT
   Affilié demande → Validation → Wise Quote → Wise Transfer → Webhook → MAJ statut
```

---

# 4. MODÈLE DE DONNÉES FIRESTORE

## 4.1 Collection `users` - Champs Affiliation

```typescript
// Collection: users/{userId}
// NOUVEAUX CHAMPS À AJOUTER au document user existant

interface UserAffiliateFields {
  // ═══════════════════════════════════════════════════════════════════
  // CODE AFFILIÉ
  // ═══════════════════════════════════════════════════════════════════
  
  // Code unique de parrainage - IMMUTABLE
  // Format: 3 lettres prénom + 6 chars hash (ex: "wil7f8e3a")
  affiliateCode: string;
  
  // UID du parrain (null si inscription directe) - IMMUTABLE
  referredBy: string | null;
  
  // ═══════════════════════════════════════════════════════════════════
  // TAUX PERSONNEL (FIGÉ À VIE)
  // ═══════════════════════════════════════════════════════════════════
  
  // Taux capturé à l'inscription - NE CHANGE JAMAIS
  // Valeur entre 0 et 1 (ex: 0.75 = 75%)
  affiliateCommissionRate: number;
  
  // ═══════════════════════════════════════════════════════════════════
  // TIRELIRE
  // ═══════════════════════════════════════════════════════════════════
  
  // Total cumulé historique en CENTIMES - Ne diminue jamais
  affiliateBalance: number;
  
  // Disponible au retrait en CENTIMES - Remis à 0 après retrait
  pendingAffiliateBalance: number;
  
  // Nombre de filleuls parrainés
  referralCount: number;
  
  // ═══════════════════════════════════════════════════════════════════
  // COORDONNÉES BANCAIRES (pour Wise)
  // ═══════════════════════════════════════════════════════════════════
  
  bankDetails: {
    // Nom complet du titulaire
    accountHolderName: string;
    
    // Type de compte: 'iban' | 'sort_code' | 'aba'
    accountType: string;
    
    // IBAN (Europe) - CHIFFRÉ en base
    iban?: string;
    
    // Sort Code (UK) - CHIFFRÉ
    sortCode?: string;
    
    // Account Number - CHIFFRÉ  
    accountNumber?: string;
    
    // Routing Number (US)
    routingNumber?: string;
    
    // BIC/SWIFT
    bic?: string;
    
    // Code pays ISO (FR, GB, US...)
    country: string;
    
    // Devise de retrait (EUR, GBP, USD...)
    currency: string;
    
    // Date premier retrait réussi (vérifie les coordonnées)
    verifiedAt: Timestamp | null;
    
    updatedAt: Timestamp;
  } | null;
  
  // ═══════════════════════════════════════════════════════════════════
  // RETRAIT EN COURS
  // ═══════════════════════════════════════════════════════════════════
  
  // ID du payout en cours (bloque nouveaux retraits)
  pendingPayoutId: string | null;
}
```

## 4.2 Collection `affiliate_commissions`

```typescript
// Collection: affiliate_commissions/{commissionId}

interface AffiliateCommission {
  // ID auto-généré
  id: string;
  
  // ═══════════════════════════════════════════════════════════════════
  // ACTEURS
  // ═══════════════════════════════════════════════════════════════════
  
  // Parrain qui GAGNE la commission
  referrerId: string;
  referrerEmail: string;  // Snapshot
  
  // Filleul qui a GÉNÉRÉ la commission
  refereeId: string;
  refereeEmail: string;   // Snapshot
  
  // ═══════════════════════════════════════════════════════════════════
  // SOURCE
  // ═══════════════════════════════════════════════════════════════════
  
  // Session d'appel
  callSessionId: string;
  
  // Paiement
  paymentId: string;
  paymentSource: 'stripe' | 'paypal';
  
  // ═══════════════════════════════════════════════════════════════════
  // MONTANTS
  // ═══════════════════════════════════════════════════════════════════
  
  // Type de prestataire
  providerType: 'lawyer' | 'helper';
  
  // Frais de connexion (base) en CENTIMES
  connectionFee: number;  // 3500 ou 2500
  
  // Taux appliqué (taux PERSONNEL du parrain)
  commissionRate: number;  // 0.75, 0.60, etc.
  
  // Montant commission en CENTIMES
  commissionAmount: number;  // connectionFee × commissionRate
  
  currency: 'EUR';
  
  // ═══════════════════════════════════════════════════════════════════
  // STATUT
  // ═══════════════════════════════════════════════════════════════════
  
  // 'pending'   : En attente (si holdPeriod > 0)
  // 'available' : Disponible dans la tirelire
  // 'paid'      : Incluse dans un payout
  // 'cancelled' : Annulée (remboursement appel)
  status: 'pending' | 'available' | 'paid' | 'cancelled';
  
  // Si annulée
  cancellationReason?: string;
  
  // ═══════════════════════════════════════════════════════════════════
  // PAYOUT
  // ═══════════════════════════════════════════════════════════════════
  
  // Rempli quand status = 'paid'
  payoutId: string | null;
  paidAt: Timestamp | null;
  
  // ═══════════════════════════════════════════════════════════════════
  // DATES
  // ═══════════════════════════════════════════════════════════════════
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 4.3 Collection `affiliate_payouts`

```typescript
// Collection: affiliate_payouts/{payoutId}

interface AffiliatePayout {
  id: string;
  
  // ═══════════════════════════════════════════════════════════════════
  // BÉNÉFICIAIRE
  // ═══════════════════════════════════════════════════════════════════
  
  userId: string;
  userEmail: string;     // Snapshot
  userName: string;      // Snapshot
  
  // ═══════════════════════════════════════════════════════════════════
  // MONTANT
  // ═══════════════════════════════════════════════════════════════════
  
  // Montant demandé en centimes EUR
  amountRequested: number;
  sourceCurrency: 'EUR';
  
  // Après conversion Wise
  amountConverted: number | null;
  targetCurrency: string;  // EUR, GBP, USD...
  exchangeRate: number | null;
  wiseFee: number | null;
  
  // ═══════════════════════════════════════════════════════════════════
  // WISE
  // ═══════════════════════════════════════════════════════════════════
  
  wiseTransferId: string | null;
  wiseRecipientId: string | null;
  wiseQuoteId: string | null;
  wiseStatus: string | null;
  
  // ═══════════════════════════════════════════════════════════════════
  // BANQUE (snapshot)
  // ═══════════════════════════════════════════════════════════════════
  
  bankAccountHolder: string;
  bankAccountLast4: string;  // 4 derniers caractères
  bankCountry: string;
  
  // ═══════════════════════════════════════════════════════════════════
  // COMMISSIONS
  // ═══════════════════════════════════════════════════════════════════
  
  commissionIds: string[];  // IDs des commissions incluses
  commissionCount: number;
  
  // ═══════════════════════════════════════════════════════════════════
  // STATUT
  // ═══════════════════════════════════════════════════════════════════
  
  // 'pending'    : Demande créée
  // 'processing' : Wise transfer en cours
  // 'completed'  : Wise confirme l'envoi
  // 'paid'       : Fonds reçus (confirmation finale)
  // 'failed'     : Échec
  // 'cancelled'  : Annulé
  status: 'pending' | 'processing' | 'completed' | 'paid' | 'failed' | 'cancelled';
  
  failureReason: string | null;
  
  // ═══════════════════════════════════════════════════════════════════
  // DATES
  // ═══════════════════════════════════════════════════════════════════
  
  requestedAt: Timestamp;
  processingStartedAt: Timestamp | null;
  completedAt: Timestamp | null;
  paidAt: Timestamp | null;
  failedAt: Timestamp | null;
  
  // ═══════════════════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════════════════
  
  processedBy: string | null;  // UID admin si manuel
  adminNotes: string | null;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## 4.4 Collection `affiliate_config`

```typescript
// Collection: affiliate_config/current
// UN SEUL DOCUMENT

interface AffiliateConfig {
  id: 'current';
  
  // ═══════════════════════════════════════════════════════════════════
  // TAUX
  // ═══════════════════════════════════════════════════════════════════
  
  // Taux pour les NOUVEAUX inscrits (0-1)
  currentCommissionRate: number;  // 0.75 = 75%
  
  // ═══════════════════════════════════════════════════════════════════
  // FRAIS DE CONNEXION
  // ═══════════════════════════════════════════════════════════════════
  
  lawyerConnectionFee: number;  // 3500 = 35€
  helperConnectionFee: number;  // 2500 = 25€
  
  // ═══════════════════════════════════════════════════════════════════
  // RÈGLES RETRAIT
  // ═══════════════════════════════════════════════════════════════════
  
  minimumWithdrawal: number;  // 3000 = 30€
  holdPeriodHours: number;    // 0 = immédiat
  
  // ═══════════════════════════════════════════════════════════════════
  // ACTIVATION
  // ═══════════════════════════════════════════════════════════════════
  
  isActive: boolean;           // Système actif
  withdrawalsEnabled: boolean; // Retraits autorisés
  
  // ═══════════════════════════════════════════════════════════════════
  // DEVISES WISE
  // ═══════════════════════════════════════════════════════════════════
  
  supportedCurrencies: string[];  // ['EUR', 'GBP', 'USD', ...]
  
  // ═══════════════════════════════════════════════════════════════════
  // HISTORIQUE DES TAUX
  // ═══════════════════════════════════════════════════════════════════
  
  rateHistory: Array<{
    rate: number;
    effectiveFrom: Timestamp;
    changedBy: string;
    changedByEmail: string;
    reason: string;
  }>;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  updatedBy: string;
}
```

## 4.5 Index Firestore Requis

```json
{
  "indexes": [
    {
      "collectionGroup": "affiliate_commissions",
      "fields": [
        { "fieldPath": "referrerId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "affiliate_commissions",
      "fields": [
        { "fieldPath": "referrerId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "affiliate_payouts",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "requestedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "affiliate_payouts",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "requestedAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "fields": [
        { "fieldPath": "referredBy", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

# 5. BACKEND - CLOUD FUNCTIONS

## 5.1 Structure des Fichiers

```
functions/
├── src/
│   ├── index.ts                     # Exports
│   │
│   ├── affiliate/
│   │   ├── types.ts                 # Types TypeScript
│   │   ├── utils.ts                 # Utilitaires
│   │   │
│   │   ├── triggers/
│   │   │   └── onUserCreate.ts      # Setup affilié à l'inscription
│   │   │
│   │   ├── commissions/
│   │   │   └── createCommission.ts  # Création commission
│   │   │
│   │   ├── payouts/
│   │   │   ├── requestWithdrawal.ts # Demande retrait
│   │   │   ├── processWisePayout.ts # Traitement Wise
│   │   │   └── wiseWebhook.ts       # Webhook Wise
│   │   │
│   │   ├── admin/
│   │   │   ├── updateRate.ts        # Modifier taux
│   │   │   ├── listAffiliates.ts    # Liste affiliés
│   │   │   └── getStats.ts          # Statistiques
│   │   │
│   │   └── user/
│   │       ├── getMyData.ts         # Mes données affilié
│   │       ├── getMyCommissions.ts  # Mes commissions
│   │       └── updateBankDetails.ts # MAJ coordonnées
│   │
│   └── services/
│       └── wise/
│           ├── client.ts            # Client API
│           ├── recipient.ts         # Gestion recipients
│           ├── quote.ts             # Devis
│           └── transfer.ts          # Transferts
│
├── package.json
└── .env
```

## 5.2 Utilitaires (`utils.ts`)

```typescript
// functions/src/affiliate/utils.ts

import * as crypto from 'crypto';
import * as admin from 'firebase-admin';
import { AffiliateConfig } from './types';

const db = admin.firestore();

/**
 * Génère un code affilié unique
 * Format: 3 lettres prénom + 6 chars hash
 */
export function generateAffiliateCode(email: string, firstName: string): string {
  const cleanName = firstName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z]/g, '');
  
  const base = cleanName.slice(0, 3) || 'usr';
  const uniqueString = email + Date.now() + Math.random().toString(36);
  const hash = crypto.createHash('sha256').update(uniqueString).digest('hex').slice(0, 6);
  
  return base + hash;
}

/**
 * Génère un code unique (vérifie les collisions)
 */
export async function ensureUniqueCode(email: string, firstName: string): Promise<string> {
  let code = generateAffiliateCode(email, firstName);
  let attempts = 0;
  
  while (attempts < 5) {
    const existing = await db.collection('users')
      .where('affiliateCode', '==', code)
      .limit(1).get();
    
    if (existing.empty) return code;
    
    code = generateAffiliateCode(email + attempts, firstName);
    attempts++;
  }
  
  return 'usr' + crypto.randomUUID().slice(0, 6);
}

/**
 * Résout un code affilié vers un userId
 */
export async function resolveAffiliateCode(code: string): Promise<string | null> {
  if (!code || code.length < 4) return null;
  
  const snapshot = await db.collection('users')
    .where('affiliateCode', '==', code.toLowerCase().trim())
    .limit(1).get();
  
  return snapshot.empty ? null : snapshot.docs[0].id;
}

/**
 * Récupère la configuration (avec cache)
 */
let configCache: { data: AffiliateConfig | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 60000; // 1 minute

export async function getAffiliateConfig(): Promise<AffiliateConfig> {
  const now = Date.now();
  
  if (configCache.data && (now - configCache.ts) < CACHE_TTL) {
    return configCache.data;
  }
  
  const doc = await db.collection('affiliate_config').doc('current').get();
  
  if (!doc.exists) {
    // Config par défaut
    const defaultConfig: AffiliateConfig = {
      id: 'current',
      currentCommissionRate: 0.75,
      lawyerConnectionFee: 3500,
      helperConnectionFee: 2500,
      minimumWithdrawal: 3000,
      holdPeriodHours: 0,
      isActive: true,
      withdrawalsEnabled: true,
      supportedCurrencies: ['EUR', 'USD', 'GBP', 'CHF'],
      rateHistory: [],
      createdAt: admin.firestore.Timestamp.now(),
      updatedAt: admin.firestore.Timestamp.now(),
      updatedBy: 'system'
    };
    
    await db.collection('affiliate_config').doc('current').set(defaultConfig);
    configCache = { data: defaultConfig, ts: now };
    return defaultConfig;
  }
  
  const config = { id: doc.id, ...doc.data() } as AffiliateConfig;
  configCache = { data: config, ts: now };
  return config;
}

/**
 * Formate un montant en centimes
 */
export function formatAmount(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency
  }).format(cents / 100);
}
```

## 5.3 Auth Trigger - Setup Affilié

```typescript
// functions/src/affiliate/triggers/onUserCreate.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { ensureUniqueCode, resolveAffiliateCode, getAffiliateConfig } from '../utils';

const db = admin.firestore();

export const onUserCreateSetupAffiliate = functions
  .region('europe-west1')
  .auth.user()
  .onCreate(async (user) => {
    const { uid, email, displayName } = user;
    console.log(`[Affiliate] Setup for user: ${uid}`);
    
    // Attendre le document user (créé par frontend)
    await new Promise(r => setTimeout(r, 2000));
    
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};
    
    // Éviter double setup
    if (userData.affiliateCode) {
      console.log(`[Affiliate] Already setup: ${uid}`);
      return;
    }
    
    try {
      const config = await getAffiliateConfig();
      
      if (!config.isActive) {
        console.log('[Affiliate] System disabled');
        return;
      }
      
      // 1. Générer code unique
      const firstName = userData.firstName || displayName?.split(' ')[0] || 'user';
      const affiliateCode = await ensureUniqueCode(email || uid, firstName);
      
      // 2. Résoudre le parrain
      const referralCode = userData.pendingReferralCode;
      let referredBy: string | null = null;
      
      if (referralCode) {
        referredBy = await resolveAffiliateCode(referralCode);
        if (referredBy === uid) referredBy = null; // Pas self-referral
      }
      
      // 3. CAPTURER LE TAUX ACTUEL (FIGÉ À VIE)
      const affiliateCommissionRate = config.currentCommissionRate;
      
      // 4. Mise à jour atomique
      const batch = db.batch();
      
      batch.update(userRef, {
        affiliateCode,
        referredBy,
        affiliateCommissionRate,  // TAUX FIGÉ À VIE
        affiliateBalance: 0,
        pendingAffiliateBalance: 0,
        referralCount: 0,
        bankDetails: null,
        pendingPayoutId: null,
        pendingReferralCode: admin.firestore.FieldValue.delete()
      });
      
      // Incrémenter compteur parrain
      if (referredBy) {
        batch.update(db.collection('users').doc(referredBy), {
          referralCount: admin.firestore.FieldValue.increment(1)
        });
      }
      
      await batch.commit();
      
      console.log(`[Affiliate] Setup OK: ${uid}, code=${affiliateCode}, rate=${affiliateCommissionRate}`);
      
      // Notifier le parrain
      if (referredBy) {
        await db.collection('message_events').add({
          type: 'affiliate_new_referral',
          userId: referredBy,
          data: { refereeEmail: email },
          channels: ['email', 'push', 'in_app'],
          status: 'pending',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
    } catch (error) {
      console.error(`[Affiliate] Error: ${uid}`, error);
      throw error;
    }
  });
```

## 5.4 Création de Commission

```typescript
// functions/src/affiliate/commissions/createCommission.ts

import * as admin from 'firebase-admin';
import { getAffiliateConfig } from '../utils';

const db = admin.firestore();

interface CallSession {
  id: string;
  clientId: string;
  providerType: 'lawyer' | 'helper';
  paymentId: string;
  paymentSource: 'stripe' | 'paypal';
  duration: number;
}

/**
 * Crée une commission d'affiliation
 * UTILISE LE TAUX PERSONNEL DU PARRAIN (pas le taux global)
 */
export async function createAffiliateCommission(callSession: CallSession): Promise<void> {
  console.log(`[Affiliate] Commission for session: ${callSession.id}`);
  
  // 1. Récupérer le client
  const clientDoc = await db.collection('users').doc(callSession.clientId).get();
  if (!clientDoc.exists) return;
  
  const client = clientDoc.data()!;
  
  // 2. Vérifier parrain
  if (!client.referredBy) {
    console.log(`[Affiliate] No referrer for ${callSession.clientId}`);
    return;
  }
  
  // 3. Récupérer parrain
  const referrerRef = db.collection('users').doc(client.referredBy);
  const referrerDoc = await referrerRef.get();
  if (!referrerDoc.exists) return;
  
  const referrer = referrerDoc.data()!;
  
  // 4. Config
  const config = await getAffiliateConfig();
  if (!config.isActive) return;
  
  // 5. TAUX DU PARRAIN (FIGÉ À VIE)
  const commissionRate = referrer.affiliateCommissionRate;
  if (!commissionRate || commissionRate <= 0) return;
  
  // 6. Frais de connexion
  const connectionFee = callSession.providerType === 'lawyer'
    ? config.lawyerConnectionFee
    : config.helperConnectionFee;
  
  // 7. Calculer commission
  const commissionAmount = Math.floor(connectionFee * commissionRate);
  if (commissionAmount < 1) return;
  
  // 8. Vérifier doublon
  const existing = await db.collection('affiliate_commissions')
    .where('callSessionId', '==', callSession.id)
    .limit(1).get();
  
  if (!existing.empty) {
    console.warn(`[Affiliate] Duplicate: ${callSession.id}`);
    return;
  }
  
  // 9. Transaction atomique
  await db.runTransaction(async (tx) => {
    const commRef = db.collection('affiliate_commissions').doc();
    const now = admin.firestore.Timestamp.now();
    
    tx.set(commRef, {
      referrerId: client.referredBy,
      referrerEmail: referrer.email,
      refereeId: callSession.clientId,
      refereeEmail: client.email,
      callSessionId: callSession.id,
      paymentId: callSession.paymentId,
      paymentSource: callSession.paymentSource,
      providerType: callSession.providerType,
      connectionFee,
      commissionRate,
      commissionAmount,
      currency: 'EUR',
      status: 'available',  // Immédiat
      payoutId: null,
      paidAt: null,
      createdAt: now,
      updatedAt: now
    });
    
    // MAJ tirelire
    tx.update(referrerRef, {
      affiliateBalance: admin.firestore.FieldValue.increment(commissionAmount),
      pendingAffiliateBalance: admin.firestore.FieldValue.increment(commissionAmount)
    });
  });
  
  console.log(`[Affiliate] Commission: ${commissionAmount/100}€ for ${client.referredBy}`);
  
  // Notifier
  await db.collection('message_events').add({
    type: 'affiliate_commission_earned',
    userId: client.referredBy,
    data: { amount: commissionAmount, providerType: callSession.providerType },
    channels: ['email', 'push', 'in_app'],
    status: 'pending',
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });
}
```

## 5.5 Intégration executeCallTask

```typescript
// MODIFIER: functions/src/calls/executeCallTask.ts

import { createAffiliateCommission } from '../affiliate/commissions/createCommission';

async function processCompletedCall(callSession: CallSession): Promise<void> {
  if (callSession.duration < 120) {
    await processRefund(callSession);
    return;
  }
  
  // 1. Capture paiement
  await capturePayment(callSession);
  
  // 2. Factures
  await generateInvoices(callSession);
  
  // 3. COMMISSION AFFILIÉ
  try {
    await createAffiliateCommission(callSession);
  } catch (e) {
    console.error('[Call] Affiliate error:', e);
  }
  
  // 4. Notifications
  await sendCompletionNotifications(callSession);
}
```

## 5.6 Demande de Retrait

```typescript
// functions/src/affiliate/payouts/requestWithdrawal.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getAffiliateConfig, formatAmount } from '../utils';

const db = admin.firestore();

export const requestAffiliateWithdrawal = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // 1. Auth
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Connexion requise');
    }
    
    const userId = context.auth.uid;
    
    // 2. Récupérer user et config
    const [userDoc, config] = await Promise.all([
      db.collection('users').doc(userId).get(),
      getAffiliateConfig()
    ]);
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Utilisateur non trouvé');
    }
    
    const user = userDoc.data()!;
    
    // 3. Validations
    if (!config.isActive || !config.withdrawalsEnabled) {
      throw new functions.https.HttpsError('failed-precondition', 'Retraits désactivés');
    }
    
    if (user.pendingPayoutId) {
      throw new functions.https.HttpsError('failed-precondition', 'Retrait déjà en cours');
    }
    
    const amount = user.pendingAffiliateBalance || 0;
    
    if (amount < config.minimumWithdrawal) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Minimum ${formatAmount(config.minimumWithdrawal)}. Solde: ${formatAmount(amount)}`
      );
    }
    
    if (!user.bankDetails?.accountHolderName) {
      throw new functions.https.HttpsError('failed-precondition', 'Coordonnées bancaires requises');
    }
    
    // 4. Récupérer commissions
    const commissionsSnap = await db.collection('affiliate_commissions')
      .where('referrerId', '==', userId)
      .where('status', '==', 'available')
      .get();
    
    const commissionIds = commissionsSnap.docs.map(d => d.id);
    
    if (commissionIds.length === 0) {
      throw new functions.https.HttpsError('failed-precondition', 'Aucune commission disponible');
    }
    
    // 5. Transaction
    const payoutId = await db.runTransaction(async (tx) => {
      const currentUser = (await tx.get(db.collection('users').doc(userId))).data()!;
      
      if (currentUser.pendingPayoutId) {
        throw new Error('Retrait déjà en cours');
      }
      
      const payoutRef = db.collection('affiliate_payouts').doc();
      const now = admin.firestore.Timestamp.now();
      
      // Créer payout
      tx.set(payoutRef, {
        userId,
        userEmail: user.email,
        userName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        amountRequested: amount,
        sourceCurrency: 'EUR',
        amountConverted: null,
        targetCurrency: user.bankDetails.currency,
        exchangeRate: null,
        wiseFee: null,
        wiseTransferId: null,
        wiseRecipientId: null,
        wiseQuoteId: null,
        wiseStatus: null,
        bankAccountHolder: user.bankDetails.accountHolderName,
        bankAccountLast4: (user.bankDetails.iban || user.bankDetails.accountNumber || '').slice(-4),
        bankCountry: user.bankDetails.country,
        commissionIds,
        commissionCount: commissionIds.length,
        status: 'pending',
        failureReason: null,
        requestedAt: now,
        processingStartedAt: null,
        completedAt: null,
        paidAt: null,
        failedAt: null,
        processedBy: null,
        adminNotes: null,
        createdAt: now,
        updatedAt: now
      });
      
      // Marquer commissions
      for (const id of commissionIds) {
        tx.update(db.collection('affiliate_commissions').doc(id), {
          status: 'paid',
          payoutId: payoutRef.id,
          paidAt: now,
          updatedAt: now
        });
      }
      
      // MAJ user
      tx.update(db.collection('users').doc(userId), {
        pendingAffiliateBalance: 0,
        pendingPayoutId: payoutRef.id
      });
      
      return payoutRef.id;
    });
    
    // 6. Déclencher traitement Wise (async)
    processWisePayoutAsync(payoutId);
    
    return {
      success: true,
      payoutId,
      amount,
      message: `Retrait de ${formatAmount(amount)} en cours`
    };
  });

async function processWisePayoutAsync(payoutId: string) {
  // Import et appel async (ne pas attendre)
  const { processWisePayout } = require('./processWisePayout');
  processWisePayout(payoutId).catch((e: Error) => {
    console.error(`[Payout] Wise error ${payoutId}:`, e);
  });
}
```

---

# 6. INTÉGRATION WISE

## 6.1 Configuration

```typescript
// functions/src/services/wise/client.ts

import axios from 'axios';
import * as functions from 'firebase-functions';

const WISE_URL = functions.config().wise?.sandbox === 'true'
  ? 'https://api.sandbox.transferwise.tech'
  : 'https://api.transferwise.com';

const WISE_TOKEN = functions.config().wise?.api_token;
const WISE_PROFILE = functions.config().wise?.profile_id;

export const wiseApi = axios.create({
  baseURL: WISE_URL,
  headers: {
    'Authorization': `Bearer ${WISE_TOKEN}`,
    'Content-Type': 'application/json'
  },
  timeout: 30000
});

export const getProfileId = () => WISE_PROFILE;
```

## 6.2 Traitement Payout Wise

```typescript
// functions/src/affiliate/payouts/processWisePayout.ts

import * as admin from 'firebase-admin';
import { wiseApi, getProfileId } from '../../services/wise/client';

const db = admin.firestore();

export async function processWisePayout(payoutId: string): Promise<void> {
  console.log(`[Wise] Processing payout: ${payoutId}`);
  
  const payoutRef = db.collection('affiliate_payouts').doc(payoutId);
  const payoutDoc = await payoutRef.get();
  
  if (!payoutDoc.exists) {
    throw new Error('Payout not found');
  }
  
  const payout = payoutDoc.data()!;
  
  if (payout.status !== 'pending') {
    console.log(`[Wise] Payout not pending: ${payout.status}`);
    return;
  }
  
  try {
    // MAJ statut
    await payoutRef.update({
      status: 'processing',
      processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Récupérer user pour coordonnées bancaires
    const userDoc = await db.collection('users').doc(payout.userId).get();
    const user = userDoc.data()!;
    
    // 1. Créer recipient Wise
    const recipient = await createWiseRecipient(user.bankDetails);
    
    // 2. Créer quote
    const quote = await createWiseQuote(
      payout.amountRequested / 100, // Centimes -> EUR
      'EUR',
      payout.targetCurrency
    );
    
    // 3. Créer transfer
    const transfer = await createWiseTransfer(quote.id, recipient.id, payoutId);
    
    // 4. Financer le transfer
    await fundWiseTransfer(transfer.id);
    
    // MAJ payout
    await payoutRef.update({
      wiseRecipientId: recipient.id.toString(),
      wiseQuoteId: quote.id.toString(),
      wiseTransferId: transfer.id.toString(),
      wiseStatus: transfer.status,
      amountConverted: Math.round(quote.targetAmount * 100),
      exchangeRate: quote.rate,
      wiseFee: Math.round(quote.fee * 100),
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // MAJ user
    await db.collection('users').doc(payout.userId).update({
      pendingPayoutId: null,
      'bankDetails.verifiedAt': admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`[Wise] Payout completed: ${payoutId}`);
    
    // Notification
    await db.collection('message_events').add({
      type: 'affiliate_payout_sent',
      userId: payout.userId,
      data: {
        amount: payout.amountRequested,
        targetAmount: Math.round(quote.targetAmount * 100),
        currency: payout.targetCurrency
      },
      channels: ['email'],
      status: 'pending',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
  } catch (error: any) {
    console.error(`[Wise] Error: ${payoutId}`, error);
    
    await payoutRef.update({
      status: 'failed',
      failureReason: error.message || 'Erreur Wise',
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Restaurer les commissions
    await restoreCommissions(payout.commissionIds, payout.amountRequested, payout.userId);
    
    // MAJ user
    await db.collection('users').doc(payout.userId).update({
      pendingPayoutId: null
    });
    
    throw error;
  }
}

async function createWiseRecipient(bankDetails: any) {
  const payload: any = {
    currency: bankDetails.currency,
    type: bankDetails.accountType,
    profile: getProfileId(),
    accountHolderName: bankDetails.accountHolderName,
    details: { legalType: 'PRIVATE' }
  };
  
  if (bankDetails.accountType === 'iban') {
    payload.details.IBAN = bankDetails.iban.replace(/\s/g, '');
    if (bankDetails.bic) payload.details.BIC = bankDetails.bic;
  } else if (bankDetails.accountType === 'sort_code') {
    payload.details.sortCode = bankDetails.sortCode;
    payload.details.accountNumber = bankDetails.accountNumber;
  } else if (bankDetails.accountType === 'aba') {
    payload.details.abartn = bankDetails.routingNumber;
    payload.details.accountNumber = bankDetails.accountNumber;
    payload.details.accountType = 'CHECKING';
  }
  
  const { data } = await wiseApi.post('/v1/accounts', payload);
  return data;
}

async function createWiseQuote(amount: number, source: string, target: string) {
  const { data } = await wiseApi.post('/v3/profiles/' + getProfileId() + '/quotes', {
    sourceCurrency: source,
    targetCurrency: target,
    sourceAmount: amount,
    payOut: 'BANK_TRANSFER'
  });
  return data;
}

async function createWiseTransfer(quoteId: string, recipientId: number, reference: string) {
  const { data } = await wiseApi.post('/v1/transfers', {
    targetAccount: recipientId,
    quoteUuid: quoteId,
    customerTransactionId: reference,
    details: { reference: 'SOS-Expat Affiliate Payout' }
  });
  return data;
}

async function fundWiseTransfer(transferId: number) {
  const { data } = await wiseApi.post(
    `/v3/profiles/${getProfileId()}/transfers/${transferId}/payments`,
    { type: 'BALANCE' }
  );
  return data;
}

async function restoreCommissions(ids: string[], amount: number, userId: string) {
  const batch = db.batch();
  
  for (const id of ids) {
    batch.update(db.collection('affiliate_commissions').doc(id), {
      status: 'available',
      payoutId: null,
      paidAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }
  
  batch.update(db.collection('users').doc(userId), {
    pendingAffiliateBalance: admin.firestore.FieldValue.increment(amount)
  });
  
  await batch.commit();
}
```

## 6.3 Webhook Wise

```typescript
// functions/src/affiliate/payouts/wiseWebhook.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const wiseWebhook = functions
  .region('europe-west1')
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).send('Method not allowed');
      return;
    }
    
    // TODO: Vérifier signature Wise
    // const signature = req.headers['x-signature-sha256'];
    
    const event = req.body;
    console.log('[Wise Webhook]', event.event_type, event.data?.resource?.id);
    
    try {
      if (event.event_type === 'transfers#state-change') {
        const transferId = event.data.resource.id.toString();
        const status = event.data.current_state;
        
        // Trouver le payout
        const payoutsSnap = await db.collection('affiliate_payouts')
          .where('wiseTransferId', '==', transferId)
          .limit(1)
          .get();
        
        if (payoutsSnap.empty) {
          console.warn('[Wise Webhook] Payout not found:', transferId);
          res.status(200).send('OK');
          return;
        }
        
        const payoutDoc = payoutsSnap.docs[0];
        const updates: any = {
          wiseStatus: status,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (status === 'outgoing_payment_sent') {
          updates.status = 'paid';
          updates.paidAt = admin.firestore.FieldValue.serverTimestamp();
          
          // Notification finale
          await db.collection('message_events').add({
            type: 'affiliate_payout_received',
            userId: payoutDoc.data().userId,
            data: { amount: payoutDoc.data().amountRequested },
            channels: ['email'],
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
        } else if (status === 'cancelled' || status === 'funds_refunded') {
          updates.status = 'failed';
          updates.failureReason = `Wise: ${status}`;
          updates.failedAt = admin.firestore.FieldValue.serverTimestamp();
          
          // Restaurer commissions
          const payout = payoutDoc.data();
          await restoreCommissions(payout.commissionIds, payout.amountRequested, payout.userId);
        }
        
        await payoutDoc.ref.update(updates);
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error('[Wise Webhook] Error:', error);
      res.status(500).send('Error');
    }
  });

// Copie de restoreCommissions (ou import)
async function restoreCommissions(ids: string[], amount: number, userId: string) {
  const batch = db.batch();
  
  for (const id of ids) {
    batch.update(db.collection('affiliate_commissions').doc(id), {
      status: 'available',
      payoutId: null,
      paidAt: null
    });
  }
  
  batch.update(db.collection('users').doc(userId), {
    pendingAffiliateBalance: admin.firestore.FieldValue.increment(amount),
    pendingPayoutId: null
  });
  
  await batch.commit();
}
```

---

# 7. FRONTEND - ESPACE UTILISATEUR

## 7.1 Structure des Fichiers

```
src/
├── pages/
│   ├── auth/
│   │   └── SignUp.tsx              # Capture code affilié
│   └── dashboard/
│       ├── AffiliateAccount.tsx    # Dashboard + tirelire
│       └── AffiliateBankDetails.tsx # Coordonnées bancaires
│
├── components/affiliate/
│   ├── PiggyBank.tsx               # Tirelire visuelle
│   ├── AffiliateLink.tsx           # Lien de partage
│   ├── CommissionsList.tsx         # Liste commissions
│   └── WithdrawalButton.tsx        # Bouton retrait
│
└── hooks/
    └── useAffiliate.ts             # Hook données affilié
```

## 7.2 Capture Code à l'Inscription

```tsx
// src/pages/auth/SignUp.tsx

import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export default function SignUp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Capturer code depuis URL
  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      setReferralCode(code);
      localStorage.setItem('pendingReferralCode', code);
    } else {
      const stored = localStorage.getItem('pendingReferralCode');
      if (stored) setReferralCode(stored);
    }
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    try {
      const { user } = await createUserWithEmailAndPassword(
        auth,
        formData.get('email') as string,
        formData.get('password') as string
      );
      
      // Créer document avec code parrainage
      await setDoc(doc(db, 'users', user.uid), {
        email: formData.get('email'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        role: formData.get('role'),
        pendingReferralCode: referralCode, // Pour le trigger
        createdAt: new Date()
      });
      
      localStorage.removeItem('pendingReferralCode');
      navigate('/dashboard');
    } catch (error) {
      console.error('Signup error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-md mx-auto p-6">
      {referralCode && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-green-800 font-medium">
            🎉 Vous avez été invité par un membre SOS-Expat !
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="firstName" placeholder="Prénom" required className="w-full px-4 py-2 border rounded-lg" />
        <input name="lastName" placeholder="Nom" required className="w-full px-4 py-2 border rounded-lg" />
        <input name="email" type="email" placeholder="Email" required className="w-full px-4 py-2 border rounded-lg" />
        <input name="password" type="password" placeholder="Mot de passe" required className="w-full px-4 py-2 border rounded-lg" />
        <select name="role" required className="w-full px-4 py-2 border rounded-lg">
          <option value="">Je suis...</option>
          <option value="client">Un expatrié / voyageur</option>
          <option value="provider">Un professionnel</option>
        </select>
        <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold">
          {loading ? 'Inscription...' : 'S\'inscrire'}
        </button>
      </form>
    </div>
  );
}
```

## 7.3 Dashboard Affilié avec Tirelire

```tsx
// src/pages/dashboard/AffiliateAccount.tsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { Copy, Users, Euro, Wallet } from 'lucide-react';
import { toast } from 'sonner';

export default function AffiliateAccount() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [withdrawing, setWithdrawing] = useState(false);
  
  useEffect(() => {
    if (!user) return;
    
    const unsubUser = onSnapshot(doc(db, 'users', user.uid), (doc) => {
      if (doc.exists()) setData(doc.data());
    });
    
    const q = query(
      collection(db, 'affiliate_commissions'),
      where('referrerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubComm = onSnapshot(q, (snap) => {
      setCommissions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    return () => { unsubUser(); unsubComm(); };
  }, [user]);
  
  const copyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/signup?code=${data?.affiliateCode}`);
    toast.success('Lien copié !');
  };
  
  const handleWithdraw = async () => {
    if (!data || data.pendingAffiliateBalance < 3000 || !data.bankDetails) {
      toast.error('Vérifiez votre solde et vos coordonnées bancaires');
      return;
    }
    setWithdrawing(true);
    try {
      const withdraw = httpsCallable(functions, 'requestAffiliateWithdrawal');
      const result = await withdraw({});
      toast.success((result.data as any).message);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setWithdrawing(false);
    }
  };
  
  if (!data) return <div>Chargement...</div>;
  
  const withdrawn = data.affiliateBalance - data.pendingAffiliateBalance;
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Banner lien */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-500 rounded-2xl p-8 text-white">
        <h1 className="text-2xl font-bold mb-2">Programme d'Affiliation</h1>
        <p className="text-blue-100 mb-4">
          Gagnez {(data.affiliateCommissionRate * 100).toFixed(0)}% sur chaque appel de vos filleuls !
        </p>
        <div className="flex gap-3">
          <input
            value={`${window.location.origin}/signup?code=${data.affiliateCode}`}
            readOnly
            className="flex-1 px-4 py-3 rounded-lg text-gray-800"
          />
          <button onClick={copyLink} className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold flex items-center gap-2">
            <Copy size={18} /> Copier
          </button>
        </div>
        <p className="text-blue-200 text-sm mt-3">Code : <span className="font-mono font-bold">{data.affiliateCode}</span></p>
      </div>
      
      {/* Tirelire */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-amber-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="text-4xl">🐷</div>
          <h2 className="text-xl font-bold">Ma Tirelire</h2>
        </div>
        
        <div className="grid grid-cols-3 gap-6 mb-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Total gagné</p>
            <p className="text-2xl font-bold">{(data.affiliateBalance / 100).toFixed(2)}€</p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-sm">Déjà retiré</p>
            <p className="text-2xl font-bold text-gray-600">{(withdrawn / 100).toFixed(2)}€</p>
          </div>
          <div className="text-center bg-amber-50 rounded-lg p-3">
            <p className="text-amber-700 text-sm font-medium">Disponible</p>
            <p className="text-3xl font-bold text-amber-600">{(data.pendingAffiliateBalance / 100).toFixed(2)}€</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-gray-500">
            {data.bankDetails ? (
              <span className="text-green-600">✓ Compte configuré</span>
            ) : (
              <a href="/dashboard/bank-details" className="text-blue-600 underline">Configurer mon compte</a>
            )}
          </div>
          <button
            onClick={handleWithdraw}
            disabled={withdrawing || data.pendingAffiliateBalance < 3000 || !data.bankDetails || data.pendingPayoutId}
            className="bg-amber-500 text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-2"
          >
            <Wallet size={20} />
            {withdrawing ? 'Traitement...' : data.pendingPayoutId ? 'En cours...' : 'Retirer via Wise'}
          </button>
        </div>
        {data.pendingAffiliateBalance < 3000 && (
          <p className="text-sm text-gray-500 mt-2 text-right">Minimum : 30€</p>
        )}
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
          <Users className="text-blue-600" />
          <div>
            <p className="text-gray-500 text-xs">Filleuls</p>
            <p className="font-bold text-lg">{data.referralCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
          <Euro className="text-green-600" />
          <div>
            <p className="text-gray-500 text-xs">Commissions</p>
            <p className="font-bold text-lg">{commissions.length}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
          <div className="text-purple-600 font-bold text-xl">%</div>
          <div>
            <p className="text-gray-500 text-xs">Mon taux</p>
            <p className="font-bold text-lg">{(data.affiliateCommissionRate * 100).toFixed(0)}%</p>
          </div>
        </div>
      </div>
      
      {/* Historique */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-semibold">Historique des commissions</h3></div>
        <div className="divide-y max-h-96 overflow-auto">
          {commissions.length === 0 ? (
            <p className="p-6 text-center text-gray-500">Partagez votre lien pour gagner des commissions !</p>
          ) : (
            commissions.map(c => (
              <div key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{c.providerType === 'lawyer' ? '👨‍⚖️ Avocat' : '🤝 Helper'}</p>
                  <p className="text-sm text-gray-500">{c.createdAt?.toDate?.()?.toLocaleDateString('fr-FR')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-green-600">+{(c.commissionAmount / 100).toFixed(2)}€</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${c.status === 'paid' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {c.status === 'paid' ? 'Retiré' : 'Disponible'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
```

## 7.4 Formulaire Coordonnées Bancaires

```tsx
// src/pages/dashboard/AffiliateBankDetails.tsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';

export default function AffiliateBankDetails() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState<'iban' | 'sort_code' | 'aba'>('iban');
  const [form, setForm] = useState({
    accountHolderName: '', country: 'FR', currency: 'EUR',
    iban: '', bic: '', sortCode: '', accountNumber: '', routingNumber: ''
  });
  
  useEffect(() => {
    if (!user) return;
    getDoc(doc(db, 'users', user.uid)).then(d => {
      const bank = d.data()?.bankDetails;
      if (bank) {
        setAccountType(bank.accountType || 'iban');
        setForm({ ...form, ...bank });
      }
    });
  }, [user]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    
    try {
      const bankDetails: any = {
        accountHolderName: form.accountHolderName,
        accountType, country: form.country, currency: form.currency,
        updatedAt: new Date(), verifiedAt: null
      };
      
      if (accountType === 'iban') {
        bankDetails.iban = form.iban.replace(/\s/g, '').toUpperCase();
        if (form.bic) bankDetails.bic = form.bic.toUpperCase();
      } else if (accountType === 'sort_code') {
        bankDetails.sortCode = form.sortCode;
        bankDetails.accountNumber = form.accountNumber;
      } else {
        bankDetails.routingNumber = form.routingNumber;
        bankDetails.accountNumber = form.accountNumber;
      }
      
      await updateDoc(doc(db, 'users', user.uid), { bankDetails });
      toast.success('Coordonnées enregistrées');
    } catch (e) {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Coordonnées Bancaires</h1>
      <p className="text-gray-600 mb-6">Pour recevoir vos gains via Wise.</p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nom du titulaire</label>
          <input value={form.accountHolderName} onChange={e => setForm({...form, accountHolderName: e.target.value})}
                 required className="w-full px-4 py-2 border rounded-lg" />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Type de compte</label>
          <select value={accountType} onChange={e => setAccountType(e.target.value as any)} className="w-full px-4 py-2 border rounded-lg">
            <option value="iban">IBAN (Europe)</option>
            <option value="sort_code">Sort Code (UK)</option>
            <option value="aba">Routing Number (US)</option>
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Pays</label>
            <select value={form.country} onChange={e => setForm({...form, country: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
              <option value="FR">France</option><option value="DE">Allemagne</option>
              <option value="GB">UK</option><option value="US">USA</option>
              <option value="CH">Suisse</option><option value="CA">Canada</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Devise</label>
            <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full px-4 py-2 border rounded-lg">
              <option value="EUR">EUR</option><option value="GBP">GBP</option>
              <option value="USD">USD</option><option value="CHF">CHF</option>
            </select>
          </div>
        </div>
        
        {accountType === 'iban' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">IBAN</label>
              <input value={form.iban} onChange={e => setForm({...form, iban: e.target.value})}
                     required className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="FR76 1234 5678..." />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">BIC (optionnel)</label>
              <input value={form.bic} onChange={e => setForm({...form, bic: e.target.value})}
                     className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="BNPAFRPP" />
            </div>
          </>
        )}
        
        {accountType === 'sort_code' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Sort Code</label>
              <input value={form.sortCode} onChange={e => setForm({...form, sortCode: e.target.value})}
                     required className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="12-34-56" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <input value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})}
                     required className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="12345678" />
            </div>
          </>
        )}
        
        {accountType === 'aba' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Routing Number</label>
              <input value={form.routingNumber} onChange={e => setForm({...form, routingNumber: e.target.value})}
                     required className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="123456789" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Account Number</label>
              <input value={form.accountNumber} onChange={e => setForm({...form, accountNumber: e.target.value})}
                     required className="w-full px-4 py-2 border rounded-lg font-mono" placeholder="1234567890" />
            </div>
          </>
        )}
        
        <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50">
          {loading ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </form>
    </div>
  );
}
```

---

# 8. FRONTEND - ADMINISTRATION

## 8.1 Dashboard Admin

```tsx
// src/pages/admin/AffiliateAdmin.tsx

import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { Users, Euro, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function AffiliateAdmin() {
  const [config, setConfig] = useState<any>(null);
  const [affiliates, setAffiliates] = useState<any[]>([]);
  const [newRate, setNewRate] = useState('');
  const [reason, setReason] = useState('');
  const [updating, setUpdating] = useState(false);
  
  useEffect(() => {
    const unsubConfig = onSnapshot(doc(db, 'affiliate_config', 'current'), d => {
      if (d.exists()) {
        setConfig(d.data());
        setNewRate((d.data().currentCommissionRate * 100).toString());
      }
    });
    
    const q = query(collection(db, 'users'), orderBy('referralCount', 'desc'));
    const unsubAff = onSnapshot(q, snap => {
      setAffiliates(snap.docs.filter(d => d.data().affiliateCode).map(d => ({ id: d.id, ...d.data() })));
    });
    
    return () => { unsubConfig(); unsubAff(); };
  }, []);
  
  const handleUpdateRate = async () => {
    const rate = parseFloat(newRate) / 100;
    if (isNaN(rate) || rate < 0 || rate > 1 || !reason.trim()) {
      toast.error('Vérifiez le taux et la raison');
      return;
    }
    setUpdating(true);
    try {
      const update = httpsCallable(functions, 'updateCommissionRate');
      await update({ newRate: rate, reason });
      toast.success('Taux mis à jour');
      setReason('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdating(false);
    }
  };
  
  if (!config) return <div>Chargement...</div>;
  
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Gestion Affiliation</h1>
      
      {/* Configuration taux */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Settings size={20} /> Configuration</h2>
        
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-amber-800">⚠️ Modifier le taux n'affecte que les <strong>nouveaux inscrits</strong>.</p>
        </div>
        
        <div className="flex items-end gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Taux actuel</label>
            <p className="text-3xl font-bold text-blue-600">{(config.currentCommissionRate * 100).toFixed(0)}%</p>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Nouveau taux (%)</label>
            <input type="number" min="0" max="100" value={newRate} onChange={e => setNewRate(e.target.value)}
                   className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Raison</label>
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Ex: Fin lancement"
                   className="w-full px-4 py-2 border rounded-lg" />
          </div>
          <button onClick={handleUpdateRate} disabled={updating} className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50">
            {updating ? '...' : 'Appliquer'}
          </button>
        </div>
        
        {config.rateHistory?.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h3 className="font-medium mb-2">Historique</h3>
            {[...config.rateHistory].reverse().slice(0, 5).map((h: any, i: number) => (
              <div key={i} className="flex justify-between text-sm py-1">
                <span>{(h.rate * 100).toFixed(0)}% - {h.reason}</span>
                <span className="text-gray-500">{h.effectiveFrom?.toDate?.()?.toLocaleDateString('fr-FR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Liste affiliés */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b"><h2 className="font-semibold">Tous les affiliés ({affiliates.filter(a => a.referralCount > 0).length} actifs)</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Taux</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Filleuls</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Gagné</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Disponible</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {affiliates.slice(0, 50).map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.firstName} {a.lastName}</p>
                    <p className="text-sm text-gray-500">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{a.affiliateCode}</td>
                  <td className="px-4 py-3"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">{(a.affiliateCommissionRate * 100).toFixed(0)}%</span></td>
                  <td className="px-4 py-3 font-semibold">{a.referralCount || 0}</td>
                  <td className="px-4 py-3">{((a.affiliateBalance || 0) / 100).toFixed(2)}€</td>
                  <td className="px-4 py-3 text-amber-600 font-semibold">{((a.pendingAffiliateBalance || 0) / 100).toFixed(2)}€</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```
affiliate_config', 'current'), (doc) => {
      if (doc.exists()) {
        setConfig(doc.data());
        setNewRate((doc.data().currentCommissionRate * 100).toString());
      }
    });
    
    // Stats via callable
    const getStats = httpsCallable(functions, 'getAffiliateGlobalStats');
    getStats({}).then((result) => {
      setStats(result.data as GlobalStats);
    });
    
    // Affiliates (users avec referralCount > 0)
    const q = query(
      collection(db, 'users'),
      orderBy('referralCount', 'desc')
    );
    
    const unsubAff = onSnapshot(q, (snap) => {
      const list = snap.docs
        .filter(d => d.data().affiliateCode)
        .map(d => ({ id: d.id, ...d.data() } as Affiliate));
      setAffiliates(list);
    });
    
    return () => {
      unsubConfig();
      unsubAff();
    };
  }, []);
  
  const handleUpdateRate = async () => {
    const rate = parseFloat(newRate) / 100;
    
    if (isNaN(rate) || rate < 0 || rate > 1) {
      toast.error('Taux invalide (0-100)');
      return;
    }
    
    if (!rateReason.trim()) {
      toast.error('Raison requise');
      return;
    }
    
    setUpdating(true);
    
    try {
      const update = httpsCallable(functions, 'updateCommissionRate');
      await update({ newRate: rate, reason: rateReason });
      toast.success('Taux mis à jour');
      setRateReason('');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUpdating(false);
    }
  };
  
  return (
    <div className="p-6 space-y-8">
      <h1 className="text-2xl font-bold">Gestion Affiliation</h1>
      
      {/* Stats globales */}
      {stats && (
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            icon={<Users />}
            label="Affiliés actifs"
            value={affiliates.filter(a => a.referralCount > 0).length}
          />
          <StatCard
            icon={<Euro />}
            label="Commissions générées"
            value={`${(stats.totalCommissions / 100).toFixed(2)}€`}
          />
          <StatCard
            icon={<TrendingUp />}
            label="Total payé"
            value={`${(stats.totalPaidOut / 100).toFixed(2)}€`}
          />
          <StatCard
            icon={<Clock />}
            label="Payouts en attente"
            value={stats.pendingPayouts}
          />
        </div>
      )}
      
      {/* Configuration taux */}
      {config && (
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings size={20} /> Configuration du Taux
          </h2>
          
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-amber-800">
              <strong>⚠️ Important :</strong> Modifier le taux n'affecte que les 
              <strong> nouveaux inscrits</strong>. Les affiliés existants conservent leur taux.
            </p>
          </div>
          
          <div className="flex items-end gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Taux actuel</label>
              <p className="text-3xl font-bold text-blue-600">
                {(config.currentCommissionRate * 100).toFixed(0)}%
              </p>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Nouveau taux (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={newRate}
                onChange={(e) => setNewRate(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Raison</label>
              <input
                value={rateReason}
                onChange={(e) => setRateReason(e.target.value)}
                placeholder="Ex: Fin période lancement"
                className="w-full px-4 py-2 border rounded-lg"
              />
            </div>
            
            <button
              onClick={handleUpdateRate}
              disabled={updating}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50"
            >
              {updating ? '...' : 'Appliquer'}
            </button>
          </div>
          
          {/* Historique des taux */}
          {config.rateHistory?.length > 0 && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-medium mb-2">Historique des taux</h3>
              <div className="space-y-2 max-h-40 overflow-auto">
                {[...config.rateHistory].reverse().map((h: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{(h.rate * 100).toFixed(0)}% - {h.reason}</span>
                    <span className="text-gray-500">
                      {h.effectiveFrom?.toDate?.()?.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Liste des affiliés */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b">
          <h2 className="font-semibold">Tous les affiliés</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Code</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Taux</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Filleuls</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Gagné</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Disponible</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Inscrit</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {affiliates.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium">{a.firstName} {a.lastName}</p>
                    <p className="text-sm text-gray-500">{a.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{a.affiliateCode}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {(a.affiliateCommissionRate * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{a.referralCount}</td>
                  <td className="px-4 py-3">{(a.affiliateBalance / 100).toFixed(2)}€</td>
                  <td className="px-4 py-3 text-amber-600 font-semibold">
                    {(a.pendingAffiliateBalance / 100).toFixed(2)}€
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {a.createdAt?.toDate?.()?.toLocaleDateString('fr-FR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: any }) {
  return (
    <div className="bg-white rounded-xl shadow p-4 flex items-center gap-3">
      <div className="p-2 bg-gray-100 rounded-lg">{icon}</div>
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="font-bold text-xl">{value}</p>
      </div>
    </div>
  );
}
```

## 8.2 Admin API - Stats Globales

```typescript
// functions/src/affiliate/admin/getStats.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

export const getAffiliateGlobalStats = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Vérifier admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Login required');
    }
    
    const userDoc = await db.collection('users').doc(context.auth.uid).get();
    if (userDoc.data()?.role !== 'admin') {
      throw new functions.https.HttpsError('permission-denied', 'Admin required');
    }
    
    // Calculer stats
    const [commissionsSnap, payoutsSnap] = await Promise.all([
      db.collection('affiliate_commissions').get(),
      db.collection('affiliate_payouts').get()
    ]);
    
    let totalCommissions = 0;
    commissionsSnap.forEach(d => {
      totalCommissions += d.data().commissionAmount || 0;
    });
    
    let totalPaidOut = 0;
    let pendingPayouts = 0;
    payoutsSnap.forEach(d => {
      const p = d.data();
      if (p.status === 'paid' || p.status === 'completed') {
        totalPaidOut += p.amountRequested || 0;
      }
      if (p.status === 'pending' || p.status === 'processing') {
        pendingPayouts++;
      }
    });
    
    return {
      totalCommissions,
      totalPaidOut,
      pendingPayouts
    };
  });
```

---

# 9. SYSTÈME DE NOTIFICATIONS

## 9.1 Types de Notifications

| Type | Destinataire | Canaux | Déclencheur |
|------|--------------|--------|-------------|
| `affiliate_new_referral` | Parrain | Email, Push, In-App | Nouveau filleul inscrit |
| `affiliate_commission_earned` | Parrain | Email, Push, In-App | Commission créée |
| `affiliate_payout_sent` | Affilié | Email | Wise transfer initié |
| `affiliate_payout_received` | Affilié | Email | Fonds reçus (webhook Wise) |
| `affiliate_payout_failed` | Affilié | Email | Échec du payout |

## 9.2 Templates Email (9 langues)

```typescript
// Exemple template FR pour commission gagnée

export const AFFILIATE_COMMISSION_EARNED = {
  fr: {
    subject: '🎉 Vous avez gagné une commission !',
    body: `
      Bonjour {{firstName}},
      
      Bonne nouvelle ! Vous avez gagné une commission de {{amountFormatted}} 
      grâce à l'activité d'un de vos filleuls.
      
      Type d'appel : {{providerType}}
      Montant : {{amountFormatted}}
      
      Votre tirelire contient maintenant {{totalAvailable}}.
      
      Consultez votre espace affiliation pour plus de détails :
      {{dashboardLink}}
      
      Merci de faire partie du programme d'affiliation SOS-Expat !
      
      L'équipe SOS-Expat
    `
  },
  en: {
    subject: '🎉 You earned a commission!',
    body: `...`
  },
  // ... autres langues
};
```

## 9.3 Intégration avec le Système Existant

```typescript
// Utiliser la collection message_events existante

await db.collection('message_events').add({
  type: 'affiliate_commission_earned',
  userId: referrerId,
  data: {
    firstName: referrer.firstName,
    amount: commissionAmount,
    amountFormatted: formatAmount(commissionAmount),
    providerType: callSession.providerType === 'lawyer' ? 'Avocat' : 'Helper',
    totalAvailable: formatAmount(referrer.pendingAffiliateBalance + commissionAmount),
    dashboardLink: 'https://sos-expat.com/dashboard/affiliate'
  },
  channels: ['email', 'push', 'in_app'],
  language: referrer.language || 'fr',
  status: 'pending',
  createdAt: admin.firestore.FieldValue.serverTimestamp()
});

// Le pipeline existant (onMessageEventCreate) traite ces événements
```

---

# 10. SÉCURITÉ

## 10.1 Règles Firestore (Résumé)

```javascript
// Points clés de sécurité

// 1. Champs immutables côté client
// affiliateCode, referredBy, affiliateCommissionRate, balances
// → Ne peuvent être modifiés que par Cloud Functions

// 2. Commissions
// → Lecture: parrain uniquement
// → Écriture: Cloud Functions uniquement

// 3. Payouts
// → Lecture: bénéficiaire uniquement
// → Écriture: Cloud Functions uniquement

// 4. Config
// → Lecture: tous les users authentifiés
// → Écriture: Cloud Functions uniquement
```

## 10.2 Validation Backend

```typescript
// Validations critiques dans les Cloud Functions

// 1. Anti self-referral
if (referredBy === uid) referredBy = null;

// 2. Vérifier que le parrain existe
const referrerDoc = await db.collection('users').doc(referredBy).get();
if (!referrerDoc.exists) referredBy = null;

// 3. Vérifier doublon commission
const existing = await db.collection('affiliate_commissions')
  .where('callSessionId', '==', callSession.id).limit(1).get();
if (!existing.empty) return;

// 4. Vérifier pas de payout en cours
if (user.pendingPayoutId) throw new Error('Payout en cours');

// 5. Valider coordonnées bancaires
if (!user.bankDetails?.accountHolderName) throw new Error('Bank details required');
```

## 10.3 Chiffrement Données Sensibles

```typescript
// Les données bancaires sensibles doivent être chiffrées
// Option 1: Firestore encryption at rest (automatique)
// Option 2: Chiffrement applicatif pour IBAN

import * as crypto from 'crypto';

const ENCRYPTION_KEY = functions.config().encryption?.key;

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}
```

---

# 11. FLUX COMPLETS

## 11.1 Flux Inscription avec Parrainage

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FLUX INSCRIPTION AVEC PARRAINAGE                         │
└─────────────────────────────────────────────────────────────────────────────┘

1. PARRAIN PARTAGE SON LIEN
   Marie (parrain) → Copie son lien : https://sos-expat.com/signup?code=mar7f8e3a
   
2. FILLEUL CLIQUE SUR LE LIEN
   Paul → Clique → Frontend capture ?code=mar7f8e3a → localStorage
   
3. FILLEUL REMPLIT LE FORMULAIRE
   Paul → email, password, prénom, nom, rôle
   
4. SOUMISSION
   Frontend → createUserWithEmailAndPassword (Firebase Auth)
            → setDoc users/{paul_uid} avec pendingReferralCode: "mar7f8e3a"
   
5. AUTH TRIGGER
   onUserCreate déclenché
   ├── Génère code: "pau6a2b1c"
   ├── Résout "mar7f8e3a" → marie_uid
   ├── Capture taux actuel: 0.75
   └── Met à jour Paul:
       {
         affiliateCode: "pau6a2b1c",
         referredBy: "marie_uid",
         affiliateCommissionRate: 0.75,  // FIGÉ À VIE
         affiliateBalance: 0,
         pendingAffiliateBalance: 0,
         referralCount: 0
       }
   
6. INCRÉMENTE COMPTEUR PARRAIN
   Marie.referralCount += 1
   
7. NOTIFICATION
   Marie reçoit email/push: "Paul s'est inscrit via votre lien !"
```

## 11.2 Flux Commission

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX COMMISSION                                     │
└─────────────────────────────────────────────────────────────────────────────┘

1. PAUL PAIE UN APPEL AVOCAT
   35€ → Stripe/PayPal → Appel planifié
   
2. APPEL EFFECTUÉ
   Durée: 25 minutes (> 2 min = valide)
   
3. executeCallTask
   ├── Vérifie durée ≥ 120s ✓
   ├── Capture paiement Stripe ✓
   ├── Génère factures ✓
   └── createAffiliateCommission()
   
4. createAffiliateCommission
   ├── Récupère Paul → referredBy = "marie_uid"
   ├── Récupère Marie → affiliateCommissionRate = 0.75
   ├── connectionFee = 3500 (35€ avocat)
   ├── commission = 3500 × 0.75 = 2625 (26.25€)
   └── Transaction:
       - Crée document affiliate_commissions
       - Marie.affiliateBalance += 2625
       - Marie.pendingAffiliateBalance += 2625
   
5. NOTIFICATION
   Marie reçoit: "Vous avez gagné 26.25€ !"
   
6. TIRELIRE MARIE
   Total: 26.25€ | Disponible: 26.25€
```

## 11.3 Flux Retrait Wise

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLUX RETRAIT WISE                                   │
└─────────────────────────────────────────────────────────────────────────────┘

1. MARIE DEMANDE UN RETRAIT
   Tirelire: 150€ disponible → Clique "Retirer"
   
2. VALIDATION FRONTEND
   ├── Balance ≥ 30€ ✓
   ├── Coordonnées bancaires ✓
   └── Pas de payout en cours ✓
   
3. APPEL requestAffiliateWithdrawal
   ├── Re-validation backend ✓
   └── Transaction:
       - Crée affiliate_payouts (status: pending)
       - Marque commissions (status: paid)
       - Marie.pendingAffiliateBalance = 0
       - Marie.pendingPayoutId = payout_id
   
4. TRAITEMENT WISE (async)
   processWisePayout()
   ├── Crée Wise Recipient (compte Marie)
   ├── Crée Quote (EUR → EUR, 150€)
   ├── Crée Transfer
   ├── Fund Transfer
   └── MAJ payout (status: completed)
   
5. NOTIFICATION
   Marie reçoit: "Votre virement de 150€ est en cours"
   
6. WEBHOOK WISE (quelques heures/jours plus tard)
   Event: transfers#state-change → outgoing_payment_sent
   ├── MAJ payout (status: paid)
   └── Notification: "Vos 150€ ont été reçus !"
   
7. ÉTAT FINAL
   Marie.affiliateBalance = 150€ (historique)
   Marie.pendingAffiliateBalance = 0
   Marie.pendingPayoutId = null
```

---

# 12. TESTS

## 12.1 Tests Unitaires

```typescript
// tests/affiliate/utils.test.ts

describe('generateAffiliateCode', () => {
  it('should generate code with 3 letter prefix', () => {
    const code = generateAffiliateCode('test@email.com', 'William');
    expect(code).toMatch(/^wil[a-z0-9]{6}$/);
  });
  
  it('should handle accented names', () => {
    const code = generateAffiliateCode('test@email.com', 'Élodie');
    expect(code).toMatch(/^elo[a-z0-9]{6}$/);
  });
  
  it('should fallback for short names', () => {
    const code = generateAffiliateCode('test@email.com', 'Jo');
    expect(code.slice(0, 2)).toBe('jo');
  });
});

describe('calculateCommission', () => {
  it('should calculate 75% of 3500 correctly', () => {
    expect(calculateCommission(3500, 0.75)).toBe(2625);
  });
  
  it('should floor the result', () => {
    expect(calculateCommission(3500, 0.333)).toBe(1165); // Not 1165.5
  });
});
```

## 12.2 Tests E2E

```typescript
// tests/e2e/affiliate-flow.test.ts

describe('Affiliate Flow E2E', () => {
  it('should complete full referral and commission flow', async () => {
    // 1. Créer un parrain
    const referrer = await createTestUser({ email: 'referrer@test.com' });
    expect(referrer.affiliateCode).toBeDefined();
    expect(referrer.affiliateCommissionRate).toBe(0.75);
    
    // 2. Créer un filleul avec le code
    const referee = await createTestUser({
      email: 'referee@test.com',
      referralCode: referrer.affiliateCode
    });
    expect(referee.referredBy).toBe(referrer.uid);
    
    // 3. Vérifier compteur parrain
    const updatedReferrer = await getUser(referrer.uid);
    expect(updatedReferrer.referralCount).toBe(1);
    
    // 4. Simuler un appel payant
    const callSession = await createTestCallSession({
      clientId: referee.uid,
      providerType: 'lawyer',
      duration: 300 // 5 minutes
    });
    
    // 5. Déclencher la commission
    await createAffiliateCommission(callSession);
    
    // 6. Vérifier la commission
    const commissions = await getCommissionsForReferrer(referrer.uid);
    expect(commissions).toHaveLength(1);
    expect(commissions[0].commissionAmount).toBe(2625);
    
    // 7. Vérifier la tirelire
    const finalReferrer = await getUser(referrer.uid);
    expect(finalReferrer.affiliateBalance).toBe(2625);
    expect(finalReferrer.pendingAffiliateBalance).toBe(2625);
  });
});
```

---

# 13. DÉPLOIEMENT

## 13.1 Variables d'Environnement

```bash
# Firebase Functions Config

firebase functions:config:set \
  wise.api_token="YOUR_WISE_API_TOKEN" \
  wise.profile_id="YOUR_WISE_PROFILE_ID" \
  wise.sandbox="false" \
  encryption.key="32_BYTES_HEX_KEY"
```

## 13.2 Déploiement

```bash
# 1. Déployer les règles Firestore
firebase deploy --only firestore:rules

# 2. Déployer les index
firebase deploy --only firestore:indexes

# 3. Déployer les functions
firebase deploy --only functions

# 4. Déployer le frontend
npm run build && firebase deploy --only hosting
```

## 13.3 Configuration Wise Webhook

```
URL: https://europe-west1-sos-urgently-ac307.cloudfunctions.net/wiseWebhook
Events: transfers#state-change
```

---

# 14. CHECKLIST D'IMPLÉMENTATION

## Phase 1 : Base de Données (2 jours)

- [ ] Ajouter champs affiliés aux documents `users`
- [ ] Créer collection `affiliate_commissions`
- [ ] Créer collection `affiliate_payouts`
- [ ] Créer document `affiliate_config/current`
- [ ] Déployer règles de sécurité Firestore
- [ ] Créer index Firestore

## Phase 2 : Backend Cloud Functions (5 jours)

- [ ] `utils.ts` - Utilitaires (generateCode, resolveCode, getConfig)
- [ ] `onUserCreate.ts` - Auth trigger setup affilié
- [ ] `createCommission.ts` - Création commission
- [ ] Modifier `executeCallTask.ts` - Intégration commission
- [ ] `requestWithdrawal.ts` - Demande de retrait
- [ ] `processWisePayout.ts` - Traitement Wise
- [ ] `wiseWebhook.ts` - Webhook Wise
- [ ] `updateRate.ts` - Admin: modifier taux
- [ ] `getStats.ts` - Admin: statistiques
- [ ] Configurer variables d'environnement Wise

## Phase 3 : Frontend Utilisateur (4 jours)

- [ ] Modifier `SignUp.tsx` - Capture code parrainage
- [ ] Créer `AffiliateAccount.tsx` - Dashboard + tirelire
- [ ] Créer `AffiliateBankDetails.tsx` - Formulaire bancaire
- [ ] Composant `PiggyBank` - Tirelire visuelle
- [ ] Composant `CommissionsList` - Liste commissions
- [ ] Composant `WithdrawalButton` - Bouton retrait
- [ ] Navigation et routing

## Phase 4 : Frontend Admin (2 jours)

- [ ] Créer `AffiliateAdmin.tsx` - Dashboard admin
- [ ] Stats globales
- [ ] Liste des affiliés
- [ ] Configuration des taux
- [ ] Historique des payouts

## Phase 5 : Notifications (1 jour)

- [ ] Templates email (9 langues) pour chaque type
- [ ] Intégration avec pipeline `message_events`
- [ ] Tests envoi emails

## Phase 6 : Tests & QA (2 jours)

- [ ] Tests unitaires utils
- [ ] Tests unitaires commissions
- [ ] Tests E2E flux complet
- [ ] Tests webhooks Wise (sandbox)
- [ ] Test multi-devises

## Phase 7 : Déploiement (1 jour)

- [ ] Déploiement staging
- [ ] Configuration Wise Production
- [ ] Déploiement production
- [ ] Vérification webhooks
- [ ] Monitoring

---

**ESTIMATION TOTALE : 17 jours ouvrés (~3.5 semaines)**

---

# ANNEXES

## A. Variables d'Environnement

```env
# Firebase Functions
WISE_API_TOKEN=xxx
WISE_PROFILE_ID=xxx
WISE_SANDBOX=false
ENCRYPTION_KEY=xxx
```

## B. URLs Wise API

```
Production: https://api.transferwise.com
Sandbox: https://api.sandbox.transferwise.tech
```

## C. Formules de Calcul

```
Commission = connectionFee × affiliateCommissionRate

Exemple Avocat (taux 75%):
  3500 × 0.75 = 2625 centimes = 26.25€

Exemple Helper (taux 60%):
  2500 × 0.60 = 1500 centimes = 15.00€

Montant retiré:
  withdrawn = affiliateBalance - pendingAffiliateBalance
```

---

**FIN DU CAHIER DES CHARGES**

*Document généré le 20 janvier 2026*
*Version 1.0 - Production Ready*

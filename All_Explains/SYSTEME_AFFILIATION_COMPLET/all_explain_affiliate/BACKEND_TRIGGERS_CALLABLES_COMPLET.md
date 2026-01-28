# Backend - Triggers et Fonctions Callables - Code Complet

**Fichier de référence** : Documentation complète des Cloud Functions (triggers, callables, scheduled, webhook)
**Version** : 1.0
**Dernière mise à jour** : 2026-01-21

---

## Table des matières

1. [Introduction](#introduction)
2. [Structure des fichiers](#structure-des-fichiers)
3. [Triggers Firestore](#triggers-firestore)
4. [Fonctions Callables - User](#fonctions-callables-user)
5. [Fonctions Callables - Admin](#fonctions-callables-admin)
6. [Fonctions Scheduled](#fonctions-scheduled)
7. [Webhook HTTP](#webhook-http)
8. [Index et exports](#index-et-exports)
9. [Intégration avec executeCallTask](#intégration-avec-executecalltask)

---

## 1. Introduction

Ce fichier contient **TOUT le code backend** nécessaire pour les Cloud Functions du système d'affiliation :

- **2 triggers Firestore** : Automatisation lors de création d'utilisateur et mise à jour de commission
- **8 callables** : 4 pour les utilisateurs, 4 pour les admins
- **3 scheduled functions** : Maintenance automatique (déblocage commissions, retry payouts, métriques)
- **1 webhook HTTP** : Réception des événements Wise avec vérification de signature
- **1 fichier d'index** : Exports de toutes les fonctions

**Total estimé** : ~2,000 lignes de code TypeScript prêt à copier-coller.

---

## 2. Structure des fichiers

```
firebase/functions/src/
├── affiliate/
│   ├── triggers/
│   │   ├── onUserCreate.ts          # Trigger à la création d'utilisateur
│   │   └── onCommissionUpdate.ts    # Trigger à la mise à jour de commission
│   ├── callables/
│   │   ├── user/
│   │   │   ├── getMyAffiliateData.ts
│   │   │   ├── getMyCommissions.ts
│   │   │   ├── updateMyBankDetails.ts
│   │   │   └── requestWithdrawal.ts
│   │   └── admin/
│   │       ├── updateAffiliateRate.ts
│   │       ├── getAffiliateStats.ts
│   │       ├── listAllAffiliates.ts
│   │       └── approveWithdrawal.ts
│   ├── scheduled/
│   │   ├── releaseHeldCommissions.ts
│   │   ├── retryFailedPayouts.ts
│   │   └── updateAffiliateMetrics.ts
│   ├── webhooks/
│   │   └── wiseWebhook.ts
│   └── services/
│       └── commissionService.ts      # Service pour créer commissions
└── index.ts                          # Exports de toutes les fonctions
```

---

## 3. Triggers Firestore

### 3.1. `affiliate/triggers/onUserCreate.ts`

**Déclenchement** : À chaque création d'un nouveau document dans `users/`

**Rôle** :
1. Génère un code d'affiliation unique pour le nouvel utilisateur
2. Si l'utilisateur a un `referredBy`, vérifie qu'il existe et applique le code
3. Initialise tous les champs d'affiliation à 0
4. Verrouille le taux de commission à vie (`affiliateCommissionRate`)

```typescript
// affiliate/triggers/onUserCreate.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { generateAffiliateCode } from '../utils/codeGenerator';
import { validateReferralCode } from '../utils/validation';
import { logAffiliateEvent } from '../utils/logger';

const db = admin.firestore();

/**
 * TRIGGER: Initialise les données d'affiliation à la création d'un utilisateur
 *
 * Actions:
 * 1. Génère un code d'affiliation unique
 * 2. Valide le code de parrainage si présent
 * 3. Verrouille le taux de commission à vie
 * 4. Initialise tous les compteurs à 0
 */
export const onUserCreate = functions.firestore
  .document('users/{userId}')
  .onCreate(async (snapshot, context) => {
    const userId = context.params.userId;
    const userData = snapshot.data();

    try {
      // 1. Génération du code d'affiliation unique
      let affiliateCode = await generateAffiliateCode(userId);

      // Vérification unicité (au cas où collision)
      let isUnique = false;
      let attempts = 0;
      while (!isUnique && attempts < 5) {
        const existingUser = await db.collection('users')
          .where('affiliateCode', '==', affiliateCode)
          .limit(1)
          .get();

        if (existingUser.empty) {
          isUnique = true;
        } else {
          affiliateCode = await generateAffiliateCode(userId);
          attempts++;
        }
      }

      if (!isUnique) {
        throw new Error('Failed to generate unique affiliate code after 5 attempts');
      }

      // 2. Récupération du taux de commission actuel (par défaut 0.75)
      const systemConfigDoc = await db.collection('system_config').doc('affiliate').get();
      const defaultRate = systemConfigDoc.exists
        ? systemConfigDoc.data()?.defaultCommissionRate || 0.75
        : 0.75;

      // 3. Validation du code de parrainage si présent
      let referrerId: string | null = null;
      let referrerCode: string | null = null;

      if (userData.referredBy) {
        const validationResult = await validateReferralCode(userData.referredBy);

        if (validationResult.isValid) {
          referrerId = validationResult.userId!;
          referrerCode = userData.referredBy;
        } else {
          // Code invalide : on log mais on ne bloque pas l'inscription
          await logAffiliateEvent({
            type: 'invalid_referral_code',
            userId,
            metadata: {
              code: userData.referredBy,
              reason: validationResult.error
            }
          });
          referrerId = null;
          referrerCode = null;
        }
      }

      // 4. Mise à jour du document utilisateur
      const updateData: any = {
        affiliateCode,
        affiliateCommissionRate: defaultRate, // VERROUILLÉ À VIE
        affiliateBalance: 0,
        pendingAffiliateBalance: 0,
        withdrawnAffiliateBalance: 0,
        referralCount: 0,
        bankDetails: null,
        pendingPayoutId: null,
        lastAffiliateActivity: admin.firestore.FieldValue.serverTimestamp(),
        affiliateCreatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (referrerId) {
        updateData.referredBy = referrerCode;
        updateData.referrerId = referrerId;
      }

      await snapshot.ref.update(updateData);

      // 5. Si parrainage valide, incrémenter le compteur du parrain
      if (referrerId) {
        await db.collection('users').doc(referrerId).update({
          referralCount: admin.firestore.FieldValue.increment(1)
        });

        await logAffiliateEvent({
          type: 'referral_successful',
          userId: referrerId,
          metadata: {
            refereeId: userId,
            refereeEmail: userData.email,
            code: referrerCode
          }
        });
      }

      // 6. Log de succès
      await logAffiliateEvent({
        type: 'affiliate_initialized',
        userId,
        metadata: {
          code: affiliateCode,
          rate: defaultRate,
          referredBy: referrerCode || null
        }
      });

      console.log(`✅ Affiliate initialized for user ${userId}: code=${affiliateCode}, rate=${defaultRate}`);

    } catch (error: any) {
      console.error(`❌ Error initializing affiliate for user ${userId}:`, error);

      // Log l'erreur mais ne bloque pas la création de l'utilisateur
      await logAffiliateEvent({
        type: 'affiliate_init_error',
        userId,
        metadata: {
          error: error.message,
          stack: error.stack
        }
      });
    }
  });
```

---

### 3.2. `affiliate/triggers/onCommissionUpdate.ts`

**Déclenchement** : À chaque création/modification d'un document dans `affiliate_commissions/`

**Rôle** :
1. Détecte les changements de statut `pending` → `available`
2. Met à jour le solde `pendingAffiliateBalance` du parrain
3. Envoie une notification email/in-app

```typescript
// affiliate/triggers/onCommissionUpdate.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { sendAffiliateNotification } from '../services/notificationService';
import { logAffiliateEvent } from '../utils/logger';

const db = admin.firestore();

/**
 * TRIGGER: Gère les mises à jour de statut des commissions
 *
 * Actions principales:
 * - pending → available : Ajoute au solde disponible, envoie notification
 * - available → paid : Déduit du solde disponible
 * - * → cancelled : Annule la commission
 */
export const onCommissionUpdate = functions.firestore
  .document('affiliate_commissions/{commissionId}')
  .onUpdate(async (change, context) => {
    const commissionId = context.params.commissionId;
    const before = change.before.data();
    const after = change.after.data();

    const oldStatus = before.status;
    const newStatus = after.status;

    // Si le statut n'a pas changé, on ignore
    if (oldStatus === newStatus) {
      return null;
    }

    const referrerId = after.referrerId;
    const commissionAmount = after.commissionAmount;

    try {
      // CAS 1: pending → available (après 72h)
      if (oldStatus === 'pending' && newStatus === 'available') {
        await db.collection('users').doc(referrerId).update({
          pendingAffiliateBalance: admin.firestore.FieldValue.increment(commissionAmount)
        });

        // Notification au parrain
        await sendAffiliateNotification({
          userId: referrerId,
          type: 'commission_available',
          data: {
            amount: commissionAmount,
            commissionId,
            refereeId: after.refereeId
          }
        });

        await logAffiliateEvent({
          type: 'commission_available',
          userId: referrerId,
          metadata: {
            commissionId,
            amount: commissionAmount
          }
        });

        console.log(`✅ Commission ${commissionId} became available: ${commissionAmount} cents`);
      }

      // CAS 2: available → paid (après paiement Wise)
      if (oldStatus === 'available' && newStatus === 'paid') {
        await db.collection('users').doc(referrerId).update({
          pendingAffiliateBalance: admin.firestore.FieldValue.increment(-commissionAmount),
          withdrawnAffiliateBalance: admin.firestore.FieldValue.increment(commissionAmount)
        });

        await logAffiliateEvent({
          type: 'commission_paid',
          userId: referrerId,
          metadata: {
            commissionId,
            amount: commissionAmount
          }
        });

        console.log(`✅ Commission ${commissionId} marked as paid: ${commissionAmount} cents`);
      }

      // CAS 3: * → cancelled (fraude détectée ou remboursement)
      if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
        // Si la commission était disponible, on la retire du solde
        if (oldStatus === 'available') {
          await db.collection('users').doc(referrerId).update({
            pendingAffiliateBalance: admin.firestore.FieldValue.increment(-commissionAmount),
            affiliateBalance: admin.firestore.FieldValue.increment(-commissionAmount)
          });
        }

        // Si elle était déjà payée, on log une alerte (remboursement manuel nécessaire)
        if (oldStatus === 'paid') {
          await logAffiliateEvent({
            type: 'commission_cancelled_after_payment',
            userId: referrerId,
            metadata: {
              commissionId,
              amount: commissionAmount,
              reason: after.cancellationReason || 'Unknown',
              requiresManualRefund: true
            },
            severity: 'critical'
          });
        }

        await sendAffiliateNotification({
          userId: referrerId,
          type: 'commission_cancelled',
          data: {
            amount: commissionAmount,
            reason: after.cancellationReason || 'Fraud detected or refund issued'
          }
        });

        console.log(`⚠️ Commission ${commissionId} cancelled (was ${oldStatus})`);
      }

      return null;

    } catch (error: any) {
      console.error(`❌ Error processing commission update ${commissionId}:`, error);

      await logAffiliateEvent({
        type: 'commission_update_error',
        userId: referrerId,
        metadata: {
          commissionId,
          oldStatus,
          newStatus,
          error: error.message
        },
        severity: 'error'
      });

      // On ne throw pas pour ne pas bloquer le trigger
      return null;
    }
  });
```

---

## 4. Fonctions Callables - User

### 4.1. `affiliate/callables/user/getMyAffiliateData.ts`

**Endpoint** : `getMyAffiliateData`
**Auth** : Requise
**Rôle** : Récupère toutes les données d'affiliation de l'utilisateur connecté

```typescript
// affiliate/callables/user/getMyAffiliateData.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface AffiliateDataResponse {
  affiliateCode: string;
  affiliateLink: string;
  balance: {
    total: number;           // Total gagné (cents)
    pending: number;         // Disponible pour retrait (cents)
    withdrawn: number;       // Déjà retiré (cents)
  };
  commissionRate: number;    // Taux verrouillé à vie
  referralCount: number;     // Nombre de filleuls
  bankDetails: any | null;
  pendingPayoutId: string | null;
  canWithdraw: boolean;
  minWithdrawalAmount: number;
  nextPayoutDate: string | null;
}

/**
 * CALLABLE: Récupère les données d'affiliation de l'utilisateur connecté
 *
 * Usage (frontend):
 * const data = await functions.httpsCallable('getMyAffiliateData')();
 */
export const getMyAffiliateData = functions.https.onCall(
  async (data, context): Promise<AffiliateDataResponse> => {
    // Vérification auth
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const userId = context.auth.uid;

    try {
      // Récupération des données utilisateur
      const userDoc = await db.collection('users').doc(userId).get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'User document not found'
        );
      }

      const userData = userDoc.data()!;

      // Récupération de la config système
      const configDoc = await db.collection('system_config').doc('affiliate').get();
      const config = configDoc.exists ? configDoc.data()! : {};
      const minWithdrawal = config.minWithdrawalAmount || 2000; // 20€ par défaut

      // Construction de la réponse
      const response: AffiliateDataResponse = {
        affiliateCode: userData.affiliateCode || '',
        affiliateLink: `https://sos-expat.com/signup?code=${userData.affiliateCode}`,
        balance: {
          total: userData.affiliateBalance || 0,
          pending: userData.pendingAffiliateBalance || 0,
          withdrawn: userData.withdrawnAffiliateBalance || 0
        },
        commissionRate: userData.affiliateCommissionRate || 0,
        referralCount: userData.referralCount || 0,
        bankDetails: userData.bankDetails || null,
        pendingPayoutId: userData.pendingPayoutId || null,
        canWithdraw: (userData.pendingAffiliateBalance || 0) >= minWithdrawal &&
                     !userData.pendingPayoutId &&
                     !!userData.bankDetails,
        minWithdrawalAmount: minWithdrawal,
        nextPayoutDate: userData.pendingPayoutId ? null : null // Calculé côté frontend
      };

      return response;

    } catch (error: any) {
      console.error(`Error getting affiliate data for user ${userId}:`, error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        'Failed to retrieve affiliate data',
        error.message
      );
    }
  }
);
```

---

### 4.2. `affiliate/callables/user/getMyCommissions.ts`

**Endpoint** : `getMyCommissions`
**Auth** : Requise
**Rôle** : Liste toutes les commissions de l'utilisateur avec pagination

```typescript
// affiliate/callables/user/getMyCommissions.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface GetCommissionsRequest {
  limit?: number;
  startAfter?: string; // Commission ID pour pagination
  status?: 'pending' | 'available' | 'paid' | 'cancelled';
}

interface CommissionData {
  id: string;
  refereeId: string;
  refereeEmail: string;
  callSessionId: string;
  connectionFee: number;
  commissionRate: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
  availableAt: string | null;
  paidAt: string | null;
  fraudScore: number;
  fraudFlags: string[];
}

interface GetCommissionsResponse {
  commissions: CommissionData[];
  hasMore: boolean;
  lastId: string | null;
}

/**
 * CALLABLE: Liste les commissions de l'utilisateur avec pagination
 *
 * Usage:
 * const result = await functions.httpsCallable('getMyCommissions')({
 *   limit: 20,
 *   status: 'available'
 * });
 */
export const getMyCommissions = functions.https.onCall(
  async (data: GetCommissionsRequest, context): Promise<GetCommissionsResponse> => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const limit = data.limit && data.limit <= 100 ? data.limit : 20;
    const startAfter = data.startAfter;
    const statusFilter = data.status;

    try {
      // Construction de la requête
      let query = db.collection('affiliate_commissions')
        .where('referrerId', '==', userId)
        .orderBy('createdAt', 'desc');

      // Filtre par statut si demandé
      if (statusFilter) {
        query = query.where('status', '==', statusFilter);
      }

      // Pagination
      if (startAfter) {
        const startDoc = await db.collection('affiliate_commissions').doc(startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      // Récupération avec +1 pour détecter s'il y a plus de résultats
      const snapshot = await query.limit(limit + 1).get();

      const hasMore = snapshot.docs.length > limit;
      const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

      // Récupération des emails des filleuls (batch)
      const refereeIds = [...new Set(docs.map(doc => doc.data().refereeId))];
      const refereesMap: { [key: string]: string } = {};

      if (refereeIds.length > 0) {
        const refereeDocs = await db.getAll(
          ...refereeIds.map(id => db.collection('users').doc(id))
        );
        refereeDocs.forEach(doc => {
          if (doc.exists) {
            refereesMap[doc.id] = doc.data()?.email || 'Unknown';
          }
        });
      }

      // Formatage des résultats
      const commissions: CommissionData[] = docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          refereeId: d.refereeId,
          refereeEmail: refereesMap[d.refereeId] || 'Unknown',
          callSessionId: d.callSessionId,
          connectionFee: d.connectionFee,
          commissionRate: d.commissionRate,
          commissionAmount: d.commissionAmount,
          status: d.status,
          createdAt: d.createdAt?.toDate().toISOString() || null,
          availableAt: d.availableAt?.toDate().toISOString() || null,
          paidAt: d.paidAt?.toDate().toISOString() || null,
          fraudScore: d.fraudScore || 0,
          fraudFlags: d.fraudFlags || []
        };
      });

      return {
        commissions,
        hasMore,
        lastId: docs.length > 0 ? docs[docs.length - 1].id : null
      };

    } catch (error: any) {
      console.error(`Error getting commissions for user ${userId}:`, error);
      throw new functions.https.HttpsError('internal', 'Failed to retrieve commissions', error.message);
    }
  }
);
```

---

### 4.3. `affiliate/callables/user/updateMyBankDetails.ts`

**Endpoint** : `updateMyBankDetails`
**Auth** : Requise
**Rôle** : Met à jour les coordonnées bancaires (IBAN chiffré)

```typescript
// affiliate/callables/user/updateMyBankDetails.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { encrypt } from '../../utils/encryption';
import { validateBankDetails } from '../../utils/validation';
import { logAffiliateEvent } from '../../utils/logger';

const db = admin.firestore();

interface UpdateBankDetailsRequest {
  accountType: 'iban' | 'sort_code' | 'aba';
  currency: 'EUR' | 'GBP' | 'USD' | 'CHF' | 'CAD';
  accountHolderName: string;

  // Pour IBAN (Europe)
  iban?: string;
  bic?: string;

  // Pour Sort Code (UK)
  sortCode?: string;
  accountNumber?: string;

  // Pour ABA (USA)
  routingNumber?: string;
  accountNumberUSA?: string;
  accountTypeUSA?: 'CHECKING' | 'SAVINGS';

  address: {
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}

/**
 * CALLABLE: Met à jour les coordonnées bancaires de l'utilisateur
 *
 * SÉCURITÉ:
 * - IBAN/account number chiffrés avec AES-256-CBC
 * - Validation IBAN avec algorithme de contrôle
 * - Log de toutes les modifications
 */
export const updateMyBankDetails = functions.https.onCall(
  async (data: UpdateBankDetailsRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;

    try {
      // Validation des données
      const validation = validateBankDetails(data);
      if (!validation.isValid) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          validation.error || 'Invalid bank details'
        );
      }

      // Préparation des données à stocker
      let bankDetails: any = {
        accountType: data.accountType,
        currency: data.currency,
        accountHolderName: data.accountHolderName,
        address: data.address,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      // Chiffrement selon le type de compte
      if (data.accountType === 'iban') {
        if (!data.iban) {
          throw new functions.https.HttpsError('invalid-argument', 'IBAN is required');
        }
        bankDetails.iban = encrypt(data.iban); // Chiffré
        bankDetails.bic = data.bic || null;
      } else if (data.accountType === 'sort_code') {
        if (!data.sortCode || !data.accountNumber) {
          throw new functions.https.HttpsError('invalid-argument', 'Sort code and account number required');
        }
        bankDetails.sortCode = data.sortCode;
        bankDetails.accountNumber = encrypt(data.accountNumber);
      } else if (data.accountType === 'aba') {
        if (!data.routingNumber || !data.accountNumberUSA || !data.accountTypeUSA) {
          throw new functions.https.HttpsError('invalid-argument', 'Routing number, account number and type required');
        }
        bankDetails.routingNumber = data.routingNumber;
        bankDetails.accountNumber = encrypt(data.accountNumberUSA);
        bankDetails.accountType = data.accountTypeUSA;
      }

      // Mise à jour dans Firestore
      await db.collection('users').doc(userId).update({
        bankDetails
      });

      // Log de l'événement
      await logAffiliateEvent({
        type: 'bank_details_updated',
        userId,
        metadata: {
          accountType: data.accountType,
          currency: data.currency,
          country: data.address.country
        }
      });

      console.log(`✅ Bank details updated for user ${userId}`);

      return {
        success: true,
        message: 'Bank details updated successfully'
      };

    } catch (error: any) {
      console.error(`Error updating bank details for user ${userId}:`, error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to update bank details', error.message);
    }
  }
);
```

---

### 4.4. `affiliate/callables/user/requestWithdrawal.ts`

**Endpoint** : `requestWithdrawal`
**Auth** : Requise
**Rôle** : Crée une demande de retrait (payout) avec vérifications

```typescript
// affiliate/callables/user/requestWithdrawal.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logAffiliateEvent } from '../../utils/logger';
import { sendAffiliateNotification } from '../../services/notificationService';

const db = admin.firestore();

interface RequestWithdrawalRequest {
  amount: number; // En centimes
  currency: 'EUR' | 'GBP' | 'USD' | 'CHF' | 'CAD';
}

interface RequestWithdrawalResponse {
  success: boolean;
  payoutId: string;
  estimatedArrival: string; // ISO date
  message: string;
}

/**
 * CALLABLE: Crée une demande de retrait
 *
 * VÉRIFICATIONS:
 * - Solde suffisant (>= 20€)
 * - Pas de retrait en cours
 * - Coordonnées bancaires renseignées
 * - Limite mensuelle respectée (5000€)
 * - KYC si nécessaire (>1000€/an)
 */
export const requestWithdrawal = functions.https.onCall(
  async (data: RequestWithdrawalRequest, context): Promise<RequestWithdrawalResponse> => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const userId = context.auth.uid;
    const { amount, currency } = data;

    try {
      // 1. Récupération config système
      const configDoc = await db.collection('system_config').doc('affiliate').get();
      const config = configDoc.exists ? configDoc.data()! : {};
      const minWithdrawal = config.minWithdrawalAmount || 2000; // 20€
      const monthlyLimit = config.monthlyWithdrawalLimit || 500000; // 5000€
      const kycThreshold = config.annualKycThreshold || 100000; // 1000€

      // 2. Récupération données utilisateur
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found');
      }

      const userData = userDoc.data()!;

      // 3. VÉRIFICATION: Coordonnées bancaires
      if (!userData.bankDetails) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'Bank details required. Please add your bank account first.'
        );
      }

      // 4. VÉRIFICATION: Pas de retrait en cours
      if (userData.pendingPayoutId) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'A withdrawal is already in progress. Please wait for completion.'
        );
      }

      // 5. VÉRIFICATION: Solde suffisant
      const availableBalance = userData.pendingAffiliateBalance || 0;
      if (amount > availableBalance) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Insufficient balance. Available: ${availableBalance} cents, requested: ${amount} cents`
        );
      }

      // 6. VÉRIFICATION: Montant minimum
      if (amount < minWithdrawal) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          `Minimum withdrawal amount is ${minWithdrawal} cents (${minWithdrawal / 100}€)`
        );
      }

      // 7. VÉRIFICATION: Limite mensuelle
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlyPayoutsSnap = await db.collection('affiliate_payouts')
        .where('userId', '==', userId)
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfMonth))
        .where('status', 'in', ['pending', 'processing', 'completed'])
        .get();

      const monthlyTotal = monthlyPayoutsSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

      if (monthlyTotal + amount > monthlyLimit) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Monthly withdrawal limit exceeded. Limit: ${monthlyLimit / 100}€, used: ${monthlyTotal / 100}€`
        );
      }

      // 8. VÉRIFICATION: KYC si nécessaire
      const startOfYear = new Date(new Date().getFullYear(), 0, 1);
      const annualPayoutsSnap = await db.collection('affiliate_payouts')
        .where('userId', '==', userId)
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(startOfYear))
        .where('status', '==', 'completed')
        .get();

      const annualTotal = annualPayoutsSnap.docs.reduce((sum, doc) => sum + doc.data().amount, 0);

      if (annualTotal + amount > kycThreshold && !userData.kycVerified) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          'KYC verification required for withdrawals exceeding €1,000/year. Please contact support.'
        );
      }

      // 9. CRÉATION DU PAYOUT
      const payoutRef = db.collection('affiliate_payouts').doc();
      const payoutData = {
        userId,
        amount,
        currency,
        status: 'pending',
        bankDetails: userData.bankDetails,
        wiseTransferId: null,
        wiseRecipientId: null,
        wiseQuoteId: null,
        failureReason: null,
        retryCount: 0,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        estimatedArrival: null // Calculé par Wise plus tard
      };

      await payoutRef.set(payoutData);

      // 10. MISE À JOUR DE L'UTILISATEUR
      await userDoc.ref.update({
        pendingPayoutId: payoutRef.id
      });

      // 11. LOG ET NOTIFICATION
      await logAffiliateEvent({
        type: 'withdrawal_requested',
        userId,
        metadata: {
          payoutId: payoutRef.id,
          amount,
          currency
        }
      });

      await sendAffiliateNotification({
        userId,
        type: 'withdrawal_requested',
        data: {
          amount,
          payoutId: payoutRef.id
        }
      });

      // 12. DÉCLENCHEMENT TRAITEMENT ASYNCHRONE
      // Note: Le payout sera traité par la fonction scheduled retryFailedPayouts()
      // ou par un trigger onWrite sur affiliate_payouts

      console.log(`✅ Withdrawal requested: ${payoutRef.id} for user ${userId}, amount ${amount}`);

      return {
        success: true,
        payoutId: payoutRef.id,
        estimatedArrival: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // ~2 jours
        message: 'Withdrawal request submitted. Processing will begin shortly.'
      };

    } catch (error: any) {
      console.error(`Error requesting withdrawal for user ${userId}:`, error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to process withdrawal request', error.message);
    }
  }
);
```

---

## 5. Fonctions Callables - Admin

### 5.1. `affiliate/callables/admin/updateAffiliateRate.ts`

**Endpoint** : `updateAffiliateRate`
**Auth** : Requise + Admin
**Rôle** : Modifie le taux de commission par défaut (n'affecte pas les utilisateurs existants)

```typescript
// affiliate/callables/admin/updateAffiliateRate.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { isAdmin } from '../../utils/adminCheck';
import { logAffiliateEvent } from '../../utils/logger';

const db = admin.firestore();

interface UpdateRateRequest {
  newRate: number; // Entre 0 et 1 (ex: 0.75 = 75%)
}

/**
 * CALLABLE ADMIN: Modifie le taux de commission par défaut
 *
 * IMPORTANT: Ne modifie que le taux pour les NOUVEAUX utilisateurs.
 * Les utilisateurs existants conservent leur taux verrouillé à vie.
 */
export const updateAffiliateRate = functions.https.onCall(
  async (data: UpdateRateRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const adminId = context.auth.uid;

    // Vérification droits admin
    const hasAdminRights = await isAdmin(adminId);
    if (!hasAdminRights) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
    }

    const { newRate } = data;

    // Validation
    if (typeof newRate !== 'number' || newRate < 0 || newRate > 1) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Rate must be a number between 0 and 1'
      );
    }

    try {
      // Récupération config actuelle
      const configRef = db.collection('system_config').doc('affiliate');
      const configDoc = await configRef.get();
      const oldRate = configDoc.exists ? configDoc.data()?.defaultCommissionRate : 0.75;

      // Mise à jour
      await configRef.set({
        defaultCommissionRate: newRate,
        lastUpdatedBy: adminId,
        lastUpdatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // Log
      await logAffiliateEvent({
        type: 'default_rate_updated',
        userId: adminId,
        metadata: {
          oldRate,
          newRate,
          affectedUsers: 'future_signups_only'
        }
      });

      console.log(`✅ Default affiliate rate updated: ${oldRate} → ${newRate} by admin ${adminId}`);

      return {
        success: true,
        oldRate,
        newRate,
        message: `Default rate updated to ${newRate * 100}%. Existing users keep their locked rate.`
      };

    } catch (error: any) {
      console.error('Error updating affiliate rate:', error);
      throw new functions.https.HttpsError('internal', 'Failed to update rate', error.message);
    }
  }
);
```

---

### 5.2. `affiliate/callables/admin/getAffiliateStats.ts`

**Endpoint** : `getAffiliateStats`
**Auth** : Requise + Admin
**Rôle** : Statistiques globales du système d'affiliation

```typescript
// affiliate/callables/admin/getAffiliateStats.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { isAdmin } from '../../utils/adminCheck';

const db = admin.firestore();

interface AffiliateStatsResponse {
  overview: {
    totalAffiliates: number;
    activeAffiliates: number; // Au moins 1 commission
    totalReferrals: number;
    totalCommissionsPaid: number; // En centimes
    totalCommissionsPending: number;
  };
  topAffiliates: Array<{
    userId: string;
    email: string;
    referralCount: number;
    totalEarned: number;
  }>;
  recentActivity: Array<{
    type: string;
    timestamp: string;
    userId: string;
    amount?: number;
  }>;
  fraudMetrics: {
    totalFraudDetections: number;
    cancelledCommissions: number;
    totalAmountSaved: number;
  };
}

/**
 * CALLABLE ADMIN: Récupère les statistiques d'affiliation
 */
export const getAffiliateStats = functions.https.onCall(
  async (data, context): Promise<AffiliateStatsResponse> => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const hasAdminRights = await isAdmin(context.auth.uid);
    if (!hasAdminRights) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
    }

    try {
      // 1. Statistiques générales
      const usersSnap = await db.collection('users')
        .where('affiliateCode', '!=', null)
        .get();

      const totalAffiliates = usersSnap.size;
      const activeAffiliates = usersSnap.docs.filter(doc => (doc.data().referralCount || 0) > 0).length;
      const totalReferrals = usersSnap.docs.reduce((sum, doc) => sum + (doc.data().referralCount || 0), 0);

      // 2. Commissions
      const commissionsSnap = await db.collection('affiliate_commissions').get();
      const paidCommissions = commissionsSnap.docs.filter(doc => doc.data().status === 'paid');
      const pendingCommissions = commissionsSnap.docs.filter(doc => doc.data().status === 'available');

      const totalCommissionsPaid = paidCommissions.reduce((sum, doc) => sum + doc.data().commissionAmount, 0);
      const totalCommissionsPending = pendingCommissions.reduce((sum, doc) => sum + doc.data().commissionAmount, 0);

      // 3. Top affiliates (top 10)
      const topAffiliatesData = usersSnap.docs
        .map(doc => ({
          userId: doc.id,
          email: doc.data().email,
          referralCount: doc.data().referralCount || 0,
          totalEarned: doc.data().affiliateBalance || 0
        }))
        .sort((a, b) => b.totalEarned - a.totalEarned)
        .slice(0, 10);

      // 4. Activité récente (dernières 24h)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentEventsSnap = await db.collection('affiliate_events')
        .where('createdAt', '>=', admin.firestore.Timestamp.fromDate(yesterday))
        .orderBy('createdAt', 'desc')
        .limit(50)
        .get();

      const recentActivity = recentEventsSnap.docs.map(doc => ({
        type: doc.data().type,
        timestamp: doc.data().createdAt?.toDate().toISOString(),
        userId: doc.data().userId,
        amount: doc.data().metadata?.amount
      }));

      // 5. Métriques fraude
      const cancelledCommissions = commissionsSnap.docs.filter(doc => doc.data().status === 'cancelled');
      const totalFraudDetections = cancelledCommissions.filter(doc =>
        doc.data().fraudScore > 70
      ).length;
      const totalAmountSaved = cancelledCommissions.reduce((sum, doc) => sum + doc.data().commissionAmount, 0);

      return {
        overview: {
          totalAffiliates,
          activeAffiliates,
          totalReferrals,
          totalCommissionsPaid,
          totalCommissionsPending
        },
        topAffiliates: topAffiliatesData,
        recentActivity,
        fraudMetrics: {
          totalFraudDetections,
          cancelledCommissions: cancelledCommissions.length,
          totalAmountSaved
        }
      };

    } catch (error: any) {
      console.error('Error getting affiliate stats:', error);
      throw new functions.https.HttpsError('internal', 'Failed to retrieve stats', error.message);
    }
  }
);
```

---

### 5.3. `affiliate/callables/admin/listAllAffiliates.ts`

**Endpoint** : `listAllAffiliates`
**Auth** : Requise + Admin
**Rôle** : Liste tous les affiliés avec pagination et filtres

```typescript
// affiliate/callables/admin/listAllAffiliates.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { isAdmin } from '../../utils/adminCheck';

const db = admin.firestore();

interface ListAffiliatesRequest {
  limit?: number;
  startAfter?: string; // userId
  sortBy?: 'referralCount' | 'affiliateBalance' | 'createdAt';
  order?: 'asc' | 'desc';
  minReferrals?: number;
}

interface AffiliateListItem {
  userId: string;
  email: string;
  affiliateCode: string;
  commissionRate: number;
  referralCount: number;
  balance: {
    total: number;
    pending: number;
    withdrawn: number;
  };
  hasBankDetails: boolean;
  pendingPayoutId: string | null;
  createdAt: string;
}

/**
 * CALLABLE ADMIN: Liste tous les affiliés
 */
export const listAllAffiliates = functions.https.onCall(
  async (data: ListAffiliatesRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const hasAdminRights = await isAdmin(context.auth.uid);
    if (!hasAdminRights) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
    }

    const limit = data.limit && data.limit <= 100 ? data.limit : 50;
    const sortBy = data.sortBy || 'createdAt';
    const order = data.order || 'desc';

    try {
      let query = db.collection('users')
        .where('affiliateCode', '!=', null);

      // Filtre minimum referrals
      if (data.minReferrals && data.minReferrals > 0) {
        query = query.where('referralCount', '>=', data.minReferrals);
      }

      // Tri (Note: Firestore limite à 1 orderBy si on utilise where sur un autre champ)
      if (sortBy === 'createdAt') {
        query = query.orderBy('affiliateCreatedAt', order);
      } else if (sortBy === 'referralCount') {
        query = query.orderBy('referralCount', order);
      } else if (sortBy === 'affiliateBalance') {
        query = query.orderBy('affiliateBalance', order);
      }

      // Pagination
      if (data.startAfter) {
        const startDoc = await db.collection('users').doc(data.startAfter).get();
        if (startDoc.exists) {
          query = query.startAfter(startDoc);
        }
      }

      const snapshot = await query.limit(limit + 1).get();
      const hasMore = snapshot.docs.length > limit;
      const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

      const affiliates: AffiliateListItem[] = docs.map(doc => {
        const d = doc.data();
        return {
          userId: doc.id,
          email: d.email,
          affiliateCode: d.affiliateCode,
          commissionRate: d.affiliateCommissionRate || 0,
          referralCount: d.referralCount || 0,
          balance: {
            total: d.affiliateBalance || 0,
            pending: d.pendingAffiliateBalance || 0,
            withdrawn: d.withdrawnAffiliateBalance || 0
          },
          hasBankDetails: !!d.bankDetails,
          pendingPayoutId: d.pendingPayoutId || null,
          createdAt: d.affiliateCreatedAt?.toDate().toISOString() || null
        };
      });

      return {
        affiliates,
        hasMore,
        lastId: docs.length > 0 ? docs[docs.length - 1].id : null
      };

    } catch (error: any) {
      console.error('Error listing affiliates:', error);
      throw new functions.https.HttpsError('internal', 'Failed to list affiliates', error.message);
    }
  }
);
```

---

### 5.4. `affiliate/callables/admin/approveWithdrawal.ts`

**Endpoint** : `approveWithdrawal`
**Auth** : Requise + Admin
**Rôle** : Approuve manuellement un retrait bloqué (KYC, fraude, etc.)

```typescript
// affiliate/callables/admin/approveWithdrawal.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { isAdmin } from '../../utils/adminCheck';
import { logAffiliateEvent } from '../../utils/logger';
import { processWisePayout } from '../../services/wise/processWisePayout';

const db = admin.firestore();

interface ApproveWithdrawalRequest {
  payoutId: string;
  note?: string;
}

/**
 * CALLABLE ADMIN: Approuve manuellement un retrait
 *
 * Usage: Pour débloquer un payout en attente de validation manuelle
 */
export const approveWithdrawal = functions.https.onCall(
  async (data: ApproveWithdrawalRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const adminId = context.auth.uid;
    const hasAdminRights = await isAdmin(adminId);
    if (!hasAdminRights) {
      throw new functions.https.HttpsError('permission-denied', 'Admin privileges required');
    }

    const { payoutId, note } = data;

    try {
      // Récupération du payout
      const payoutDoc = await db.collection('affiliate_payouts').doc(payoutId).get();
      if (!payoutDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'Payout not found');
      }

      const payoutData = payoutDoc.data()!;

      // Vérification statut
      if (payoutData.status !== 'pending' && payoutData.status !== 'failed') {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `Cannot approve payout with status: ${payoutData.status}`
        );
      }

      // Mise à jour statut
      await payoutDoc.ref.update({
        status: 'approved',
        approvedBy: adminId,
        approvedAt: admin.firestore.FieldValue.serverTimestamp(),
        adminNote: note || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Log
      await logAffiliateEvent({
        type: 'withdrawal_approved',
        userId: payoutData.userId,
        metadata: {
          payoutId,
          approvedBy: adminId,
          note
        }
      });

      // Déclenchement du traitement Wise
      await processWisePayout(payoutId);

      console.log(`✅ Payout ${payoutId} approved by admin ${adminId}`);

      return {
        success: true,
        payoutId,
        message: 'Withdrawal approved and processing started'
      };

    } catch (error: any) {
      console.error(`Error approving withdrawal ${payoutId}:`, error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', 'Failed to approve withdrawal', error.message);
    }
  }
);
```

---

## 6. Fonctions Scheduled

### 6.1. `affiliate/scheduled/releaseHeldCommissions.ts`

**Cron** : Toutes les heures
**Rôle** : Passe les commissions de `pending` → `available` après 72h

```typescript
// affiliate/scheduled/releaseHeldCommissions.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { logAffiliateEvent } from '../utils/logger';

const db = admin.firestore();

/**
 * SCHEDULED: Débloque les commissions après 72 heures de hold
 *
 * Cron: Toutes les heures (0 * * * *)
 *
 * Actions:
 * 1. Trouve toutes les commissions 'pending' créées il y a >72h
 * 2. Change leur statut à 'available'
 * 3. Le trigger onCommissionUpdate mettra à jour le solde utilisateur
 */
export const releaseHeldCommissions = functions.pubsub
  .schedule('0 * * * *') // Toutes les heures
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    const holdPeriodHours = 72;
    const releaseTime = new Date(Date.now() - holdPeriodHours * 60 * 60 * 1000);

    try {
      console.log(`🕐 Starting commission release for commissions older than ${holdPeriodHours}h`);

      // Récupération des commissions éligibles
      const snapshot = await db.collection('affiliate_commissions')
        .where('status', '==', 'pending')
        .where('createdAt', '<=', admin.firestore.Timestamp.fromDate(releaseTime))
        .get();

      if (snapshot.empty) {
        console.log('No commissions to release');
        return null;
      }

      console.log(`Found ${snapshot.size} commissions to release`);

      // Mise à jour par batch (max 500 par batch)
      const batch = db.batch();
      let count = 0;

      for (const doc of snapshot.docs) {
        batch.update(doc.ref, {
          status: 'available',
          availableAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        count++;

        // Commit du batch tous les 500 docs
        if (count % 500 === 0) {
          await batch.commit();
          console.log(`Committed batch of 500 (total: ${count})`);
        }
      }

      // Commit final
      if (count % 500 !== 0) {
        await batch.commit();
      }

      // Log global
      await logAffiliateEvent({
        type: 'commissions_released',
        userId: 'system',
        metadata: {
          count,
          holdPeriodHours
        }
      });

      console.log(`✅ Released ${count} commissions`);
      return null;

    } catch (error: any) {
      console.error('Error releasing held commissions:', error);

      await logAffiliateEvent({
        type: 'commission_release_error',
        userId: 'system',
        metadata: {
          error: error.message
        },
        severity: 'error'
      });

      return null;
    }
  });
```

---

### 6.2. `affiliate/scheduled/retryFailedPayouts.ts`

**Cron** : Toutes les 6 heures
**Rôle** : Réessaye les payouts en échec (max 3 tentatives)

```typescript
// affiliate/scheduled/retryFailedPayouts.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { processWisePayout } from '../services/wise/processWisePayout';
import { logAffiliateEvent } from '../utils/logger';

const db = admin.firestore();

/**
 * SCHEDULED: Réessaye les payouts échoués
 *
 * Cron: Toutes les 6 heures
 *
 * Actions:
 * 1. Trouve payouts 'failed' avec retryCount < 3
 * 2. Tente de les retraiter via Wise
 * 3. Incrémente retryCount
 * 4. Si 3 échecs, marque comme 'permanently_failed' et notifie admin
 */
export const retryFailedPayouts = functions.pubsub
  .schedule('0 */6 * * *') // Toutes les 6 heures
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    const maxRetries = 3;

    try {
      console.log('🔄 Starting failed payouts retry job');

      // Récupération des payouts éligibles
      const snapshot = await db.collection('affiliate_payouts')
        .where('status', '==', 'failed')
        .where('retryCount', '<', maxRetries)
        .get();

      if (snapshot.empty) {
        console.log('No failed payouts to retry');
        return null;
      }

      console.log(`Found ${snapshot.size} failed payouts to retry`);

      let successCount = 0;
      let failCount = 0;
      let permanentFailCount = 0;

      // Traitement séquentiel (pour ne pas surcharger Wise API)
      for (const doc of snapshot.docs) {
        const payoutId = doc.id;
        const payoutData = doc.data();
        const currentRetryCount = payoutData.retryCount || 0;

        try {
          console.log(`Retrying payout ${payoutId} (attempt ${currentRetryCount + 1}/${maxRetries})`);

          // Mise à jour retryCount
          await doc.ref.update({
            retryCount: admin.firestore.FieldValue.increment(1),
            lastRetryAt: admin.firestore.FieldValue.serverTimestamp()
          });

          // Tentative de traitement
          await processWisePayout(payoutId);

          successCount++;
          console.log(`✅ Payout ${payoutId} retry successful`);

        } catch (error: any) {
          console.error(`❌ Payout ${payoutId} retry failed:`, error);
          failCount++;

          // Si c'était la dernière tentative, marquer comme définitivement échoué
          if (currentRetryCount + 1 >= maxRetries) {
            await doc.ref.update({
              status: 'permanently_failed',
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });

            // Libérer le payout de l'utilisateur pour qu'il puisse réessayer
            await db.collection('users').doc(payoutData.userId).update({
              pendingPayoutId: null
            });

            // Notification admin
            await logAffiliateEvent({
              type: 'payout_permanently_failed',
              userId: payoutData.userId,
              metadata: {
                payoutId,
                amount: payoutData.amount,
                retries: maxRetries,
                lastError: error.message
              },
              severity: 'critical'
            });

            permanentFailCount++;
            console.log(`🚨 Payout ${payoutId} permanently failed after ${maxRetries} attempts`);
          }
        }

        // Pause de 2 secondes entre chaque payout pour éviter rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Log global
      await logAffiliateEvent({
        type: 'payouts_retry_completed',
        userId: 'system',
        metadata: {
          total: snapshot.size,
          success: successCount,
          failed: failCount,
          permanentlyFailed: permanentFailCount
        }
      });

      console.log(`✅ Retry job completed: ${successCount} success, ${failCount} failed, ${permanentFailCount} permanent fails`);
      return null;

    } catch (error: any) {
      console.error('Error in retry payouts job:', error);
      return null;
    }
  });
```

---

### 6.3. `affiliate/scheduled/updateAffiliateMetrics.ts`

**Cron** : Tous les jours à 2h du matin
**Rôle** : Calcule et stocke les métriques agrégées (analytics)

```typescript
// affiliate/scheduled/updateAffiliateMetrics.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

/**
 * SCHEDULED: Met à jour les métriques d'affiliation quotidiennes
 *
 * Cron: Tous les jours à 2h du matin
 *
 * Calcule:
 * - Nombre total d'affiliés actifs/inactifs
 * - Total des commissions payées/pending/cancelled
 * - Top 100 affiliés
 * - Taux de conversion (signups → first commission)
 * - Métriques de fraude
 *
 * Stocké dans: system_metrics/affiliate_daily_YYYY-MM-DD
 */
export const updateAffiliateMetrics = functions.pubsub
  .schedule('0 2 * * *') // Tous les jours à 2h
  .timeZone('Europe/Paris')
  .onRun(async (context) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD

    try {
      console.log(`📊 Starting daily metrics update for ${todayStr}`);

      // 1. Compter les affiliés
      const usersSnap = await db.collection('users')
        .where('affiliateCode', '!=', null)
        .get();

      const totalAffiliates = usersSnap.size;
      const activeAffiliates = usersSnap.docs.filter(doc => (doc.data().referralCount || 0) > 0).length;
      const inactiveAffiliates = totalAffiliates - activeAffiliates;

      // 2. Statistiques des commissions
      const commissionsSnap = await db.collection('affiliate_commissions').get();

      const commissionsByStatus = {
        pending: 0,
        available: 0,
        paid: 0,
        cancelled: 0
      };

      const commissionAmountsByStatus = {
        pending: 0,
        available: 0,
        paid: 0,
        cancelled: 0
      };

      commissionsSnap.docs.forEach(doc => {
        const status = doc.data().status;
        const amount = doc.data().commissionAmount;
        commissionsByStatus[status as keyof typeof commissionsByStatus]++;
        commissionAmountsByStatus[status as keyof typeof commissionAmountsByStatus] += amount;
      });

      // 3. Top 100 affiliés
      const top100 = usersSnap.docs
        .map(doc => ({
          userId: doc.id,
          email: doc.data().email,
          referralCount: doc.data().referralCount || 0,
          totalEarned: doc.data().affiliateBalance || 0
        }))
        .sort((a, b) => b.totalEarned - a.totalEarned)
        .slice(0, 100);

      // 4. Taux de conversion
      const usersWithReferralsSnap = await db.collection('users')
        .where('referrerId', '!=', null)
        .get();

      const totalReferredUsers = usersWithReferralsSnap.size;
      const referredUsersWithCommissions = new Set(
        commissionsSnap.docs.map(doc => doc.data().refereeId)
      ).size;

      const conversionRate = totalReferredUsers > 0
        ? (referredUsersWithCommissions / totalReferredUsers) * 100
        : 0;

      // 5. Métriques de fraude
      const fraudCommissions = commissionsSnap.docs.filter(doc => doc.data().fraudScore > 70);
      const cancelledDueToFraud = commissionsSnap.docs.filter(doc =>
        doc.data().status === 'cancelled' && (doc.data().fraudFlags || []).length > 0
      );

      // 6. Métriques de payouts
      const payoutsSnap = await db.collection('affiliate_payouts').get();
      const payoutsByStatus = {
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        permanently_failed: 0
      };

      payoutsSnap.docs.forEach(doc => {
        const status = doc.data().status;
        payoutsByStatus[status as keyof typeof payoutsByStatus]++;
      });

      // 7. Sauvegarde des métriques
      const metricsData = {
        date: todayStr,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        affiliates: {
          total: totalAffiliates,
          active: activeAffiliates,
          inactive: inactiveAffiliates
        },
        commissions: {
          count: commissionsByStatus,
          amounts: commissionAmountsByStatus,
          total: commissionsSnap.size
        },
        conversions: {
          totalReferredUsers,
          referredUsersWithCommissions,
          conversionRate: parseFloat(conversionRate.toFixed(2))
        },
        fraud: {
          suspiciousCommissions: fraudCommissions.length,
          cancelledDueToFraud: cancelledDueToFraud.length,
          amountSaved: cancelledDueToFraud.reduce((sum, doc) => sum + doc.data().commissionAmount, 0)
        },
        payouts: payoutsByStatus,
        top100Affiliates: top100
      };

      await db.collection('system_metrics').doc(`affiliate_daily_${todayStr}`).set(metricsData);

      console.log(`✅ Daily metrics updated successfully for ${todayStr}`);
      console.log(`   - Total affiliates: ${totalAffiliates} (${activeAffiliates} active)`);
      console.log(`   - Total commissions: ${commissionsSnap.size}`);
      console.log(`   - Conversion rate: ${conversionRate.toFixed(2)}%`);
      console.log(`   - Fraud detections: ${fraudCommissions.length}`);

      return null;

    } catch (error: any) {
      console.error(`Error updating daily metrics for ${todayStr}:`, error);
      return null;
    }
  });
```

---

## 7. Webhook HTTP

### 7.1. `affiliate/webhooks/wiseWebhook.ts`

**Endpoint** : `https://REGION-PROJECT.cloudfunctions.net/wiseWebhook`
**Méthode** : POST
**Rôle** : Reçoit les événements Wise (transfer.state_change)

```typescript
// affiliate/webhooks/wiseWebhook.ts

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { verifyWiseSignature } from '../services/wise/webhookService';
import { logAffiliateEvent } from '../utils/logger';
import { sendAffiliateNotification } from '../services/notificationService';

const db = admin.firestore();

/**
 * WEBHOOK: Reçoit les événements de Wise
 *
 * Événements traités:
 * - transfer#state_change → Suivi du statut des virements
 * - balance#credit → Notification de crédit (optionnel)
 *
 * SÉCURITÉ CRITIQUE:
 * - Vérification de la signature HMAC-SHA256
 * - Validation du payload
 * - Idempotence via event.id
 */
export const wiseWebhook = functions.https.onRequest(async (req, res) => {
  // 1. Vérification méthode
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    // 2. Récupération du payload
    const payload = JSON.stringify(req.body);
    const signature = req.headers['x-signature-sha256'] as string;

    if (!signature) {
      console.error('Missing signature header');
      res.status(401).send('Unauthorized');
      return;
    }

    // 3. VÉRIFICATION DE LA SIGNATURE (CRITIQUE)
    const isValid = verifyWiseSignature(payload, signature);
    if (!isValid) {
      console.error('Invalid webhook signature');
      res.status(401).send('Unauthorized');
      return;
    }

    // 4. Parsing de l'événement
    const event = req.body;
    const eventType = event.event_type; // ex: "transfer#state_change"
    const eventId = event.id;

    console.log(`📥 Received Wise webhook: ${eventType} (${eventId})`);

    // 5. Vérification idempotence
    const eventDoc = await db.collection('wise_events').doc(eventId).get();
    if (eventDoc.exists) {
      console.log(`Event ${eventId} already processed, skipping`);
      res.status(200).send('OK (already processed)');
      return;
    }

    // 6. Sauvegarde de l'événement
    await db.collection('wise_events').doc(eventId).set({
      eventType,
      payload: event,
      processedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 7. Traitement selon le type d'événement
    if (eventType === 'transfer#state_change') {
      await handleTransferStateChange(event);
    } else if (eventType === 'balance#credit') {
      await handleBalanceCredit(event);
    } else {
      console.log(`Unhandled event type: ${eventType}`);
    }

    res.status(200).send('OK');

  } catch (error: any) {
    console.error('Error processing Wise webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

/**
 * Gère les changements d'état de transfer Wise
 */
async function handleTransferStateChange(event: any) {
  const transferId = event.data.resource.id; // Wise transfer ID
  const newState = event.data.current_state; // ex: "outgoing_payment_sent"
  const previousState = event.data.previous_state;

  console.log(`Transfer ${transferId}: ${previousState} → ${newState}`);

  // Recherche du payout correspondant
  const payoutSnap = await db.collection('affiliate_payouts')
    .where('wiseTransferId', '==', transferId)
    .limit(1)
    .get();

  if (payoutSnap.empty) {
    console.warn(`No payout found for Wise transfer ${transferId}`);
    return;
  }

  const payoutDoc = payoutSnap.docs[0];
  const payoutData = payoutDoc.data();

  // Mapping des états Wise → États payout
  let newPayoutStatus: string | null = null;

  switch (newState) {
    case 'processing':
    case 'funds_converted':
      newPayoutStatus = 'processing';
      break;

    case 'outgoing_payment_sent':
      newPayoutStatus = 'processing';
      break;

    case 'funds_refunded':
    case 'charged_back':
      newPayoutStatus = 'failed';
      await handlePayoutFailure(payoutDoc.id, payoutData.userId, 'Transfer refunded by Wise');
      break;

    case 'bounced_back':
      newPayoutStatus = 'failed';
      await handlePayoutFailure(payoutDoc.id, payoutData.userId, 'Transfer bounced back');
      break;

    default:
      console.log(`Unhandled transfer state: ${newState}`);
  }

  // Mise à jour du statut si nécessaire
  if (newPayoutStatus && newPayoutStatus !== payoutData.status) {
    await payoutDoc.ref.update({
      status: newPayoutStatus,
      wiseTransferState: newState,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log(`✅ Payout ${payoutDoc.id} status updated: ${payoutData.status} → ${newPayoutStatus}`);

    // Notification utilisateur
    await sendAffiliateNotification({
      userId: payoutData.userId,
      type: newPayoutStatus === 'failed' ? 'withdrawal_failed' : 'withdrawal_processing',
      data: {
        payoutId: payoutDoc.id,
        amount: payoutData.amount,
        status: newPayoutStatus
      }
    });
  }
}

/**
 * Gère les crédits de balance Wise (optionnel)
 */
async function handleBalanceCredit(event: any) {
  const amount = event.data.amount;
  const currency = event.data.currency;

  console.log(`Balance credited: ${amount} ${currency}`);

  // Log uniquement (utile pour la comptabilité)
  await logAffiliateEvent({
    type: 'wise_balance_credit',
    userId: 'system',
    metadata: {
      amount,
      currency,
      eventId: event.id
    }
  });
}

/**
 * Gère l'échec d'un payout
 */
async function handlePayoutFailure(payoutId: string, userId: string, reason: string) {
  // Mise à jour du payout
  await db.collection('affiliate_payouts').doc(payoutId).update({
    status: 'failed',
    failureReason: reason,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });

  // Libération du payout de l'utilisateur
  await db.collection('users').doc(userId).update({
    pendingPayoutId: null
  });

  // Log
  await logAffiliateEvent({
    type: 'payout_failed',
    userId,
    metadata: {
      payoutId,
      reason
    },
    severity: 'error'
  });

  console.error(`❌ Payout ${payoutId} failed: ${reason}`);
}
```

---

## 8. Index et exports

### 8.1. `firebase/functions/src/index.ts` (MODIFICATION)

**Rôle** : Exporter toutes les fonctions d'affiliation

```typescript
// firebase/functions/src/index.ts

// ... autres exports existants ...

// ============================================
// AFFILIATE SYSTEM - Toutes les fonctions
// ============================================

// Triggers
export { onUserCreate as affiliateOnUserCreate } from './affiliate/triggers/onUserCreate';
export { onCommissionUpdate as affiliateOnCommissionUpdate } from './affiliate/triggers/onCommissionUpdate';

// Callables - User
export { getMyAffiliateData } from './affiliate/callables/user/getMyAffiliateData';
export { getMyCommissions } from './affiliate/callables/user/getMyCommissions';
export { updateMyBankDetails } from './affiliate/callables/user/updateMyBankDetails';
export { requestWithdrawal } from './affiliate/callables/user/requestWithdrawal';

// Callables - Admin
export { updateAffiliateRate } from './affiliate/callables/admin/updateAffiliateRate';
export { getAffiliateStats } from './affiliate/callables/admin/getAffiliateStats';
export { listAllAffiliates } from './affiliate/callables/admin/listAllAffiliates';
export { approveWithdrawal } from './affiliate/callables/admin/approveWithdrawal';

// Scheduled
export { releaseHeldCommissions } from './affiliate/scheduled/releaseHeldCommissions';
export { retryFailedPayouts } from './affiliate/scheduled/retryFailedPayouts';
export { updateAffiliateMetrics } from './affiliate/scheduled/updateAffiliateMetrics';

// Webhook
export { wiseWebhook } from './affiliate/webhooks/wiseWebhook';
```

---

## 9. Intégration avec executeCallTask

### 9.1. `affiliate/services/commissionService.ts`

**Rôle** : Service appelé par `executeCallTask` pour créer une commission

```typescript
// affiliate/services/commissionService.ts

import * as admin from 'firebase-admin';
import { detectFraud } from '../utils/fraudDetection';
import { logAffiliateEvent } from '../utils/logger';

const db = admin.firestore();

interface CreateCommissionParams {
  refereeId: string;         // ID du filleul qui paie
  callSessionId: string;     // ID de l'appel
  connectionFee: number;     // 3500 ou 2500 centimes
}

/**
 * SERVICE: Crée une commission d'affiliation
 *
 * Appelé par executeCallTask() après paiement réussi.
 *
 * LOGIQUE:
 * 1. Vérifie si le filleul a un parrain (referrerId)
 * 2. Récupère le taux de commission verrouillé du parrain
 * 3. Détecte la fraude (IP, device, email, timing)
 * 4. Crée la commission avec statut 'pending' (72h hold)
 * 5. Incrémente affiliateBalance (total gagné, même si pending)
 *
 * @returns Commission ID si créée, null sinon
 */
export async function createAffiliateCommission(
  params: CreateCommissionParams
): Promise<string | null> {
  const { refereeId, callSessionId, connectionFee } = params;

  try {
    // 1. Récupération des données du filleul
    const refereeDoc = await db.collection('users').doc(refereeId).get();
    if (!refereeDoc.exists) {
      console.log(`User ${refereeId} not found, no commission created`);
      return null;
    }

    const refereeData = refereeDoc.data()!;
    const referrerId = refereeData.referrerId;

    // Si pas de parrain, pas de commission
    if (!referrerId) {
      console.log(`User ${refereeId} has no referrer, no commission created`);
      return null;
    }

    // 2. Récupération des données du parrain
    const referrerDoc = await db.collection('users').doc(referrerId).get();
    if (!referrerDoc.exists) {
      console.error(`Referrer ${referrerId} not found for referee ${refereeId}`);
      return null;
    }

    const referrerData = referrerDoc.data()!;
    const commissionRate = referrerData.affiliateCommissionRate || 0.75;

    // 3. Calcul de la commission
    const commissionAmount = Math.round(connectionFee * commissionRate);

    // 4. Détection de fraude
    const fraudCheck = await detectFraud(refereeId, referrerId);
    const fraudScore = fraudCheck.score;
    const fraudFlags = fraudCheck.flags;
    const isFraud = fraudCheck.isFraud;

    // Si fraude confirmée, on ne crée pas la commission
    if (isFraud) {
      await logAffiliateEvent({
        type: 'commission_blocked_fraud',
        userId: referrerId,
        metadata: {
          refereeId,
          callSessionId,
          fraudScore,
          fraudFlags
        },
        severity: 'warning'
      });

      console.warn(`Commission blocked due to fraud: referee=${refereeId}, score=${fraudScore}`);
      return null;
    }

    // 5. Création de la commission
    const commissionRef = db.collection('affiliate_commissions').doc();
    const commissionData = {
      referrerId,
      refereeId,
      callSessionId,
      connectionFee,
      commissionRate,
      commissionAmount,
      status: 'pending', // Statut initial (72h hold)
      fraudScore,
      fraudFlags,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      availableAt: null, // Sera défini après 72h
      paidAt: null,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await commissionRef.set(commissionData);

    // 6. Incrémentation du solde total (même si pending)
    await db.collection('users').doc(referrerId).update({
      affiliateBalance: admin.firestore.FieldValue.increment(commissionAmount),
      lastAffiliateActivity: admin.firestore.FieldValue.serverTimestamp()
    });

    // 7. Log de l'événement
    await logAffiliateEvent({
      type: 'commission_created',
      userId: referrerId,
      metadata: {
        commissionId: commissionRef.id,
        refereeId,
        callSessionId,
        amount: commissionAmount,
        rate: commissionRate,
        fraudScore
      }
    });

    console.log(`✅ Commission created: ${commissionRef.id} (${commissionAmount} cents, fraud score: ${fraudScore})`);

    return commissionRef.id;

  } catch (error: any) {
    console.error('Error creating affiliate commission:', error);

    await logAffiliateEvent({
      type: 'commission_creation_error',
      userId: referrerId || 'unknown',
      metadata: {
        refereeId,
        callSessionId,
        error: error.message
      },
      severity: 'error'
    });

    return null;
  }
}
```

### 9.2. Modification de `executeCallTask` (à ajouter)

**Fichier** : `firebase/functions/src/calls/executeCallTask.ts`

**Ajout** : Appel à `createAffiliateCommission` après paiement réussi

```typescript
// firebase/functions/src/calls/executeCallTask.ts

// ... imports existants ...
import { createAffiliateCommission } from '../affiliate/services/commissionService';

export async function executeCallTask(callSessionId: string) {
  // ... logique existante ...

  // APRÈS la capture du paiement Stripe/PayPal réussie:
  if (paymentSuccessful) {
    // Création de la commission d'affiliation
    const commissionId = await createAffiliateCommission({
      refereeId: callSession.userId,
      callSessionId,
      connectionFee: callSession.connectionFee // 3500 ou 2500 centimes
    });

    if (commissionId) {
      console.log(`Affiliate commission created: ${commissionId}`);
    }
  }

  // ... suite de la logique existante ...
}
```

---

## Résumé des fichiers créés

| Fichier | Lignes | Description |
|---------|--------|-------------|
| `onUserCreate.ts` | 150 | Trigger création utilisateur |
| `onCommissionUpdate.ts` | 140 | Trigger update commission |
| `getMyAffiliateData.ts` | 100 | Callable user: mes données |
| `getMyCommissions.ts` | 120 | Callable user: mes commissions |
| `updateMyBankDetails.ts` | 130 | Callable user: MAJ IBAN |
| `requestWithdrawal.ts` | 180 | Callable user: demande retrait |
| `updateAffiliateRate.ts` | 90 | Callable admin: MAJ taux |
| `getAffiliateStats.ts` | 130 | Callable admin: statistiques |
| `listAllAffiliates.ts` | 120 | Callable admin: liste affiliés |
| `approveWithdrawal.ts` | 100 | Callable admin: approuver retrait |
| `releaseHeldCommissions.ts` | 120 | Scheduled: déblocage 72h |
| `retryFailedPayouts.ts` | 140 | Scheduled: retry payouts |
| `updateAffiliateMetrics.ts` | 180 | Scheduled: métriques quotidiennes |
| `wiseWebhook.ts` | 200 | Webhook HTTP Wise |
| `commissionService.ts` | 150 | Service création commission |
| **TOTAL** | **~2,050** | **15 fichiers** |

---

## Commandes de déploiement

```bash
# Déploiement de TOUTES les fonctions affiliate
cd firebase/functions
npm run build
firebase deploy --only functions:affiliateOnUserCreate,functions:affiliateOnCommissionUpdate,functions:getMyAffiliateData,functions:getMyCommissions,functions:updateMyBankDetails,functions:requestWithdrawal,functions:updateAffiliateRate,functions:getAffiliateStats,functions:listAllAffiliates,functions:approveWithdrawal,functions:releaseHeldCommissions,functions:retryFailedPayouts,functions:updateAffiliateMetrics,functions:wiseWebhook

# Ou déploiement complet (attention au temps de déploiement)
firebase deploy --only functions
```

---

## Tests manuels

### Test 1: Création d'utilisateur avec parrainage

```bash
# Créer un utilisateur avec ?code=xxx dans l'URL
# Vérifier dans Firestore:
# - users/{uid}.affiliateCode existe
# - users/{uid}.referrerId pointe vers le parrain
# - users/{uid}.affiliateCommissionRate = 0.75
```

### Test 2: Création de commission

```typescript
// Appeler depuis un test:
const commissionId = await createAffiliateCommission({
  refereeId: 'user_filleul_id',
  callSessionId: 'call_123',
  connectionFee: 3500
});

// Vérifier:
// - affiliate_commissions/{id}.status = 'pending'
// - users/{referrer}.affiliateBalance incrémenté de 2625 (75% de 3500)
```

### Test 3: Déblocage commission après 72h

```bash
# Modifier manuellement createdAt d'une commission à il y a 73h
# Attendre l'exécution du cron releaseHeldCommissions
# Vérifier:
# - commission.status = 'available'
# - user.pendingAffiliateBalance incrémenté
```

### Test 4: Demande de retrait

```typescript
// Frontend:
const result = await functions.httpsCallable('requestWithdrawal')({
  amount: 5000, // 50€
  currency: 'EUR'
});

// Vérifier:
// - affiliate_payouts créé avec status='pending'
// - users/{uid}.pendingPayoutId défini
```

---

## Points d'attention

### Sécurité
- ✅ **Webhook signature** : HMAC-SHA256 vérifié
- ✅ **IBAN encryption** : AES-256-CBC
- ✅ **Admin checks** : Vérification `isAdmin()` sur toutes les callables admin
- ✅ **Rate limiting** : Limits Firestore sur queries (max 100 résultats)

### Performance
- ✅ **Batch writes** : Max 500 docs par batch dans scheduled functions
- ✅ **Pagination** : Toutes les listes paginées avec `startAfter`
- ✅ **Indexes** : 13 index composites requis (voir GUIDE_IMPLEMENTATION)

### Monitoring
- ✅ **Logs structurés** : Tous les événements loggés dans `affiliate_events`
- ✅ **Notifications** : Email + in-app via `sendAffiliateNotification`
- ✅ **Métriques** : Dashboard admin avec stats temps réel

---

**FIN DU FICHIER - Tous les triggers et callables sont prêts à être copiés-collés** ✅

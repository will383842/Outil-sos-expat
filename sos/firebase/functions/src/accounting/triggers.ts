/**
 * Triggers Comptabilite - SOS-Expat OU
 *
 * Declencheurs Firestore pour la generation automatique des ecritures comptables.
 *
 * @module accounting/triggers
 */

import { onDocumentUpdated, onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { logger } from 'firebase-functions/v2';
import { accountingService } from './accountingService';
import { JournalEntry, AffiliateUserType } from './types';
import { closePeriod, reopenPeriod, generateClosingReport } from './periodClosing';
import { archivePeriod, verifyArchiveIntegrity } from './archiving';
import { backfillCommissionEntries, backfillWithdrawalEntries } from './backfillEntries';
import { fetchAndStoreDailyRates, fetchAndStoreHistoricalRates } from './ecbExchangeRateService';

// =============================================================================
// CONFIGURATION
// =============================================================================

const TRIGGER_CONFIG = {
  region: 'europe-west3',
  memory: '256MiB' as const,
  cpu: 0.083,
  timeoutSeconds: 60,
};

// =============================================================================
// TRIGGER: PAIEMENT COMPLETE
// =============================================================================

/**
 * Trigger: Generer une ecriture comptable quand un paiement passe en "captured" ou "succeeded"
 *
 * Collection: payments/{paymentId}
 * Condition: status change to 'captured' | 'succeeded' | 'paid'
 */
export const onPaymentCompleted = onDocumentUpdated(
  {
    document: 'payments/{paymentId}',
    ...TRIGGER_CONFIG,
  },
  async (event) => {
    const paymentId = event.params.paymentId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      logger.warn('onPaymentCompleted: Missing data', { paymentId });
      return;
    }

    const beforeStatus = beforeData.status;
    const afterStatus = afterData.status;

    // Verifier si le paiement vient d'etre complete
    const completedStatuses = ['captured', 'succeeded', 'paid'];
    const wasNotCompleted = !completedStatuses.includes(beforeStatus);
    const isNowCompleted = completedStatuses.includes(afterStatus);

    if (!wasNotCompleted || !isNowCompleted) {
      logger.debug('onPaymentCompleted: Status change not relevant', {
        paymentId,
        beforeStatus,
        afterStatus,
      });
      return;
    }

    logger.info('onPaymentCompleted: Payment completed, generating journal entry', {
      paymentId,
      status: afterStatus,
    });

    try {
      const entry = await accountingService.createPaymentEntry(paymentId);

      if (entry) {
        logger.info('onPaymentCompleted: Journal entry created successfully', {
          paymentId,
          entryId: entry.id,
          reference: entry.reference,
        });
      } else {
        logger.warn('onPaymentCompleted: Failed to create journal entry', { paymentId });
      }
    } catch (error) {
      logger.error('onPaymentCompleted: Error creating journal entry', {
        paymentId,
        error: error instanceof Error ? error.message : error,
      });
      // On ne throw pas pour ne pas faire echouer le trigger
    }
  }
);

// =============================================================================
// TRIGGER: REMBOURSEMENT CREE
// =============================================================================

/**
 * Trigger: Generer une ecriture comptable quand un remboursement est cree
 *
 * Collection: refunds/{refundId}
 */
export const onRefundCreated = onDocumentCreated(
  {
    document: 'refunds/{refundId}',
    ...TRIGGER_CONFIG,
  },
  async (event) => {
    const refundId = event.params.refundId;
    const refundData = event.data?.data();

    if (!refundData) {
      logger.warn('onRefundCreated: Missing data', { refundId });
      return;
    }

    // Verifier que le remboursement est confirme
    if (refundData.status !== 'completed' && refundData.status !== 'succeeded') {
      logger.debug('onRefundCreated: Refund not yet completed', {
        refundId,
        status: refundData.status,
      });
      return;
    }

    logger.info('onRefundCreated: Generating journal entry for refund', { refundId });

    try {
      const entry = await accountingService.createRefundEntry(refundId);

      if (entry) {
        logger.info('onRefundCreated: Journal entry created successfully', {
          refundId,
          entryId: entry.id,
          reference: entry.reference,
        });
      }
    } catch (error) {
      logger.error('onRefundCreated: Error creating journal entry', {
        refundId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
);

/**
 * Trigger: Generer une ecriture comptable quand un remboursement passe en completed
 */
export const onRefundCompleted = onDocumentUpdated(
  {
    document: 'refunds/{refundId}',
    ...TRIGGER_CONFIG,
  },
  async (event) => {
    const refundId = event.params.refundId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      return;
    }

    const wasNotCompleted = beforeData.status !== 'completed' && beforeData.status !== 'succeeded';
    const isNowCompleted = afterData.status === 'completed' || afterData.status === 'succeeded';

    if (!wasNotCompleted || !isNowCompleted) {
      return;
    }

    logger.info('onRefundCompleted: Refund completed, generating journal entry', { refundId });

    try {
      const entry = await accountingService.createRefundEntry(refundId);

      if (entry) {
        logger.info('onRefundCompleted: Journal entry created successfully', {
          refundId,
          entryId: entry.id,
        });
      }
    } catch (error) {
      logger.error('onRefundCompleted: Error creating journal entry', {
        refundId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
);

// =============================================================================
// TRIGGER: REVERSEMENT PRESTATAIRE COMPLETE
// =============================================================================

/**
 * Trigger: Generer une ecriture comptable quand un reversement prestataire est complete
 *
 * Collection: payouts/{payoutId}
 */
export const onPayoutCompleted = onDocumentUpdated(
  {
    document: 'payouts/{payoutId}',
    ...TRIGGER_CONFIG,
  },
  async (event) => {
    const payoutId = event.params.payoutId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      return;
    }

    const wasNotCompleted = beforeData.status !== 'completed';
    const isNowCompleted = afterData.status === 'completed';

    if (!wasNotCompleted || !isNowCompleted) {
      return;
    }

    logger.info('onPayoutCompleted: Payout completed, generating journal entry', { payoutId });

    try {
      const entry = await accountingService.createPayoutEntry(payoutId);

      if (entry) {
        logger.info('onPayoutCompleted: Journal entry created successfully', {
          payoutId,
          entryId: entry.id,
          reference: entry.reference,
        });
      }
    } catch (error) {
      logger.error('onPayoutCompleted: Error creating journal entry', {
        payoutId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
);

// =============================================================================
// TRIGGER: ABONNEMENT PAYE
// =============================================================================

/**
 * Trigger: Generer une ecriture comptable quand un paiement d'abonnement est recu
 *
 * Collection: subscriptions/{subscriptionId}
 */
export const onSubscriptionPaymentReceived = onDocumentUpdated(
  {
    document: 'subscriptions/{subscriptionId}',
    ...TRIGGER_CONFIG,
  },
  async (event) => {
    const subscriptionId = event.params.subscriptionId;
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();

    if (!beforeData || !afterData) {
      return;
    }

    // Detecter un nouveau paiement d'abonnement
    // Soit status passe a 'active', soit la date de paiement a change
    const statusChanged = beforeData.status !== 'active' && afterData.status === 'active';
    const paymentDateChanged = beforeData.currentPeriodEnd !== afterData.currentPeriodEnd;

    if (!statusChanged && !paymentDateChanged) {
      return;
    }

    logger.info('onSubscriptionPaymentReceived: Subscription payment received', {
      subscriptionId,
      statusChanged,
      paymentDateChanged,
    });

    try {
      const entry = await accountingService.createSubscriptionEntry(subscriptionId);

      if (entry) {
        logger.info('onSubscriptionPaymentReceived: Journal entry created successfully', {
          subscriptionId,
          entryId: entry.id,
          reference: entry.reference,
        });
      }
    } catch (error) {
      logger.error('onSubscriptionPaymentReceived: Error creating journal entry', {
        subscriptionId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
);

// =============================================================================
// TRIGGERS: COMMISSIONS AFFILIES
// =============================================================================

/**
 * Factorise la logique commune des triggers commission
 */
const COMMISSION_VALID_STATUSES = ['validated', 'available', 'released', 'paid', 'completed'];

async function handleCommissionCreated(
  commissionId: string,
  userType: AffiliateUserType,
  collectionName: string,
  docData?: Record<string, unknown>
): Promise<void> {
  try {
    // Verifier que la commission a un statut comptabilisable
    // (pas pending, cancelled, rejected, etc.)
    const status = (docData?.status as string) || '';
    if (!status || !COMMISSION_VALID_STATUSES.includes(status)) {
      logger.info(`onCommissionCreated[${userType}]: Skipping missing/invalid status`, { commissionId, status });
      return;
    }

    const entry = await accountingService.createCommissionEntry(commissionId, userType, collectionName);
    if (entry) {
      logger.info(`onCommissionCreated[${userType}]: Entry created`, {
        commissionId,
        entryId: entry.id,
        reference: entry.reference,
      });
    }
  } catch (error) {
    logger.error(`onCommissionCreated[${userType}]: Error`, {
      commissionId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

export const onChatterCommissionCreated = onDocumentCreated(
  { document: 'chatter_commissions/{commissionId}', ...TRIGGER_CONFIG },
  async (event) => {
    await handleCommissionCreated(event.params.commissionId, 'chatter', 'chatter_commissions', event.data?.data());
  }
);

export const onInfluencerCommissionCreated = onDocumentCreated(
  { document: 'influencer_commissions/{commissionId}', ...TRIGGER_CONFIG },
  async (event) => {
    await handleCommissionCreated(event.params.commissionId, 'influencer', 'influencer_commissions', event.data?.data());
  }
);

export const onBloggerCommissionCreated = onDocumentCreated(
  { document: 'blogger_commissions/{commissionId}', ...TRIGGER_CONFIG },
  async (event) => {
    await handleCommissionCreated(event.params.commissionId, 'blogger', 'blogger_commissions', event.data?.data());
  }
);

export const onGroupAdminCommissionCreated = onDocumentCreated(
  { document: 'group_admin_commissions/{commissionId}', ...TRIGGER_CONFIG },
  async (event) => {
    await handleCommissionCreated(event.params.commissionId, 'group_admin', 'group_admin_commissions', event.data?.data());
  }
);

export const onAffiliateCommissionCreated = onDocumentCreated(
  { document: 'affiliate_commissions/{commissionId}', ...TRIGGER_CONFIG },
  async (event) => {
    await handleCommissionCreated(event.params.commissionId, 'affiliate', 'affiliate_commissions', event.data?.data());
  }
);

// =============================================================================
// TRIGGER: RETRAIT AFFILIE COMPLETE
// =============================================================================

export const onWithdrawalCompleted = onDocumentUpdated(
  { document: 'payment_withdrawals/{withdrawalId}', ...TRIGGER_CONFIG },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return;

    const wasNotCompleted = beforeData.status !== 'completed';
    const isNowCompleted = afterData.status === 'completed';
    if (!wasNotCompleted || !isNowCompleted) return;

    logger.info('onWithdrawalCompleted: Withdrawal completed', { withdrawalId: event.params.withdrawalId });

    try {
      const entry = await accountingService.createWithdrawalEntry(event.params.withdrawalId);
      if (entry) {
        logger.info('onWithdrawalCompleted: Entry created', {
          withdrawalId: event.params.withdrawalId,
          entryId: entry.id,
        });
      }
    } catch (error) {
      logger.error('onWithdrawalCompleted: Error', {
        withdrawalId: event.params.withdrawalId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
);

// =============================================================================
// TRIGGER: TRANSFERT PRESTATAIRE COMPLETE
// =============================================================================

export const onProviderTransferCompleted = onDocumentUpdated(
  { document: 'payments/{paymentId}', ...TRIGGER_CONFIG },
  async (event) => {
    const beforeData = event.data?.before.data();
    const afterData = event.data?.after.data();
    if (!beforeData || !afterData) return;

    // Detecter quand le transfert vers le prestataire est complete
    // Le webhook Stripe ecrit transferStatus: 'completed' et transferCompletedAt
    const wasNotTransferred = beforeData.transferStatus !== 'completed';
    const isNowTransferred = afterData.transferStatus === 'completed';
    if (!wasNotTransferred || !isNowTransferred) return;

    logger.info('onProviderTransferCompleted: Transfer completed', { paymentId: event.params.paymentId });

    try {
      const entry = await accountingService.createProviderTransferEntry(event.params.paymentId);
      if (entry) {
        logger.info('onProviderTransferCompleted: Entry created', {
          paymentId: event.params.paymentId,
          entryId: entry.id,
        });
      }
    } catch (error) {
      logger.error('onProviderTransferCompleted: Error', {
        paymentId: event.params.paymentId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
);

// =============================================================================
// FONCTIONS CALLABLE (Admin)
// =============================================================================

/**
 * Fonction callable: Poster (valider) une ecriture comptable
 */
export const postJournalEntry = onCall(
  {
    ...TRIGGER_CONFIG,
    memory: '256MiB' as const,
  },
  async (request) => {
    // Verifier l'authentification
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    // Verifier les droits admin
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Droits administrateur requis');
    }

    const { entryId } = request.data;

    if (!entryId || typeof entryId !== 'string') {
      throw new HttpsError('invalid-argument', 'entryId requis');
    }

    const success = await accountingService.postEntry(entryId, request.auth.uid);

    return { success };
  }
);

/**
 * Fonction callable: Extourner une ecriture comptable
 */
export const reverseJournalEntry = onCall(
  {
    ...TRIGGER_CONFIG,
    memory: '256MiB' as const,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Droits administrateur requis');
    }

    const { entryId, reason } = request.data;

    if (!entryId || typeof entryId !== 'string') {
      throw new HttpsError('invalid-argument', 'entryId requis');
    }

    if (!reason || typeof reason !== 'string') {
      throw new HttpsError('invalid-argument', 'reason requis');
    }

    const reversalEntry = await accountingService.reverseEntry(entryId, request.auth.uid, reason);

    if (!reversalEntry) {
      throw new HttpsError('failed-precondition', 'Impossible d\'extourner cette ecriture');
    }

    return {
      success: true,
      reversalEntryId: reversalEntry.id,
      reversalReference: reversalEntry.reference,
    };
  }
);

/**
 * Fonction callable: Regenerer une ecriture comptable manquante
 */
export const regenerateJournalEntry = onCall(
  {
    ...TRIGGER_CONFIG,
    memory: '256MiB' as const,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Droits administrateur requis');
    }

    const { documentType, documentId } = request.data;

    if (!documentType || !documentId) {
      throw new HttpsError('invalid-argument', 'documentType et documentId requis');
    }

    let entry: JournalEntry | null = null;

    switch (documentType) {
      case 'PAYMENT':
        entry = await accountingService.createPaymentEntry(documentId);
        break;
      case 'REFUND':
        entry = await accountingService.createRefundEntry(documentId);
        break;
      case 'PAYOUT':
        entry = await accountingService.createPayoutEntry(documentId);
        break;
      case 'SUBSCRIPTION':
        entry = await accountingService.createSubscriptionEntry(documentId);
        break;
      case 'COMMISSION': {
        const { userType, collectionName } = request.data;
        if (!userType || !collectionName) {
          throw new HttpsError('invalid-argument', 'userType et collectionName requis pour COMMISSION');
        }
        entry = await accountingService.createCommissionEntry(documentId, userType, collectionName);
        break;
      }
      case 'WITHDRAWAL':
        entry = await accountingService.createWithdrawalEntry(documentId);
        break;
      case 'PROVIDER_TRANSFER':
        entry = await accountingService.createProviderTransferEntry(documentId);
        break;
      default:
        throw new HttpsError('invalid-argument', `documentType invalide: ${documentType}`);
    }

    if (!entry) {
      throw new HttpsError('not-found', 'Document source non trouve');
    }

    return {
      success: true,
      entryId: entry.id,
      reference: entry.reference,
    };
  }
);

/**
 * Fonction callable: Obtenir les statistiques comptables
 */
export const getAccountingStats = onCall(
  {
    ...TRIGGER_CONFIG,
    memory: '256MiB' as const,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    const isAccountant = request.auth.token.accountant === true;
    if (!isAdmin && !isAccountant) {
      throw new HttpsError('permission-denied', 'Droits administrateur ou comptable requis');
    }

    const { period } = request.data;

    if (!period || typeof period !== 'string') {
      // Periode par defaut: mois courant
      const now = new Date();
      const defaultPeriod = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
      const stats = await accountingService.getAccountingStats(defaultPeriod);
      return { period: defaultPeriod, ...stats };
    }

    const stats = await accountingService.getAccountingStats(period);
    return { period, ...stats };
  }
);

/**
 * Fonction callable: Generer la declaration TVA OSS
 */
export const generateOssVatDeclaration = onCall(
  {
    ...TRIGGER_CONFIG,
    memory: '256MiB' as const,
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    const isAccountant = request.auth.token.accountant === true;
    if (!isAdmin && !isAccountant) {
      throw new HttpsError('permission-denied', 'Droits administrateur ou comptable requis');
    }

    const { year, quarter } = request.data;

    if (!year || !quarter || quarter < 1 || quarter > 4) {
      throw new HttpsError('invalid-argument', 'year et quarter (1-4) requis');
    }

    const declaration = await accountingService.generateOssVatDeclaration(
      year,
      quarter as 1 | 2 | 3 | 4
    );

    return declaration;
  }
);

/**
 * Fonction callable: Obtenir les balances des comptes
 */
export const getAccountBalances = onCall(
  {
    ...TRIGGER_CONFIG,
    memory: '256MiB' as const,
    timeoutSeconds: 120,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentification requise');
    }

    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    const isAccountant = request.auth.token.accountant === true;
    if (!isAdmin && !isAccountant) {
      throw new HttpsError('permission-denied', 'Droits administrateur ou comptable requis');
    }

    const { period } = request.data;

    if (!period || typeof period !== 'string') {
      throw new HttpsError('invalid-argument', 'period requis (format: YYYY-MM)');
    }

    const balances = await accountingService.calculateAccountBalances(period);

    return { period, balances };
  }
);

// =============================================================================
// CALLABLES: CLOTURE DE PERIODE
// =============================================================================

/**
 * Cloturer une periode comptable
 */
export const closeAccountingPeriod = onCall(
  { ...TRIGGER_CONFIG, memory: '512MiB' as const, timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    if (!isAdmin) throw new HttpsError('permission-denied', 'Droits administrateur requis');

    const { period } = request.data;
    if (!period || typeof period !== 'string') {
      throw new HttpsError('invalid-argument', 'period requis (format: YYYY-MM)');
    }

    const result = await closePeriod(period, request.auth.uid);
    if (!result.success) {
      throw new HttpsError('failed-precondition', result.error || 'Echec cloture');
    }
    return result;
  }
);

/**
 * Reouvrir une periode cloturee (superAdmin uniquement)
 */
export const reopenAccountingPeriod = onCall(
  { ...TRIGGER_CONFIG, memory: '256MiB' as const },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
    // Admin only: reopening a closed period is a critical operation (audit logged)
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Droits administrateur requis pour reouvrir une periode');
    }

    const { period, reason } = request.data;
    if (!period || !reason) {
      throw new HttpsError('invalid-argument', 'period et reason requis');
    }

    const result = await reopenPeriod(period, request.auth.uid, reason);
    if (!result.success) {
      throw new HttpsError('failed-precondition', result.error || 'Echec reouverture');
    }
    return result;
  }
);

/**
 * Generer un rapport de cloture (sans cloturer)
 */
export const getClosingReport = onCall(
  { ...TRIGGER_CONFIG, memory: '512MiB' as const, timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    const isAccountant = request.auth.token.accountant === true;
    if (!isAdmin && !isAccountant) {
      throw new HttpsError('permission-denied', 'Droits administrateur ou comptable requis');
    }

    const { period } = request.data;
    if (!period) throw new HttpsError('invalid-argument', 'period requis');

    return await generateClosingReport(period);
  }
);

// =============================================================================
// CALLABLES: ARCHIVAGE
// =============================================================================

/**
 * Archiver une periode cloturee
 */
export const archiveAccountingPeriod = onCall(
  { ...TRIGGER_CONFIG, memory: '512MiB' as const, timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    if (!isAdmin) throw new HttpsError('permission-denied', 'Droits administrateur requis');

    const { period } = request.data;
    if (!period) throw new HttpsError('invalid-argument', 'period requis');

    const result = await archivePeriod(period, request.auth?.uid);
    if (!result.success) {
      throw new HttpsError('failed-precondition', result.error || 'Echec archivage');
    }
    return result;
  }
);

/**
 * Verifier l'integrite d'une archive
 */
export const verifyArchive = onCall(
  { ...TRIGGER_CONFIG, memory: '256MiB' as const },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    const isAccountant = request.auth.token.accountant === true;
    if (!isAdmin && !isAccountant) {
      throw new HttpsError('permission-denied', 'Droits requis');
    }

    const { period } = request.data;
    if (!period) throw new HttpsError('invalid-argument', 'period requis');

    return await verifyArchiveIntegrity(period);
  }
);

// =============================================================================
// CALLABLES: BACKFILL
// =============================================================================

/**
 * Backfill retroactif des ecritures commission
 */
export const backfillCommissions = onCall(
  { ...TRIGGER_CONFIG, memory: '512MiB' as const, timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    if (!isAdmin) throw new HttpsError('permission-denied', 'Droits administrateur requis');

    const { userType, startAfter, limit } = request.data || {};
    return await backfillCommissionEntries({ userType, startAfter, limit: limit || 50 });
  }
);

/**
 * Backfill retroactif des ecritures retrait
 */
export const backfillWithdrawals = onCall(
  { ...TRIGGER_CONFIG, memory: '512MiB' as const, timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    if (!isAdmin) throw new HttpsError('permission-denied', 'Droits administrateur requis');

    const { startAfter, limit } = request.data || {};
    return await backfillWithdrawalEntries({ startAfter, limit: limit || 50 });
  }
);

// =============================================================================
// CALLABLES: ECB EXCHANGE RATES (manual trigger)
// =============================================================================

/**
 * Forcer le fetch des taux ECB quotidiens
 */
export const triggerFetchExchangeRates = onCall(
  { ...TRIGGER_CONFIG, memory: '256MiB' as const },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    if (!isAdmin) throw new HttpsError('permission-denied', 'Droits administrateur requis');

    return await fetchAndStoreDailyRates();
  }
);

/**
 * Backfill des taux ECB historiques
 */
export const triggerFetchHistoricalRates = onCall(
  { ...TRIGGER_CONFIG, memory: '1GiB' as const, timeoutSeconds: 300 },
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Authentification requise');
    const isAdmin = request.auth.token.admin === true || request.auth.token.role === 'admin';
    if (!isAdmin) throw new HttpsError('permission-denied', 'Droits administrateur requis');

    return await fetchAndStoreHistoricalRates();
  }
);

/**
 * Service Comptabilite - SOS-Expat OU
 *
 * Service Firestore pour la gestion des ecritures comptables.
 * Gere la persistance, la validation et le reporting.
 *
 * @module accounting/accountingService
 */

import * as admin from 'firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import {
  JournalEntry,
  JournalEntryStatus,
  PaymentData,
  RefundData,
  PayoutData,
  SubscriptionData,
  CommissionData,
  WithdrawalData,
  AffiliateUserType,
  AccountBalance,
  OssVatDeclaration,
  OssCountryDetail,
  CustomerInfo,
  DEFAULT_ACCOUNTING_CONFIG,
} from './types';
import {
  generatePaymentEntry,
  generateRefundEntry,
  generatePayoutEntry,
  generateSubscriptionEntry,
  generateCommissionEntry,
  generateWithdrawalEntry,
  generateProviderTransferEntry,
  validateJournalEntry,
} from './generateJournalEntry';
import { convertCentsToEur } from './ecbExchangeRateService';

// =============================================================================
// INITIALISATION
// =============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

let _initialized = false;
function ensureInitialized() {
  if (!_initialized && !IS_DEPLOYMENT_ANALYSIS) {
    if (!admin.apps.length) {
      admin.initializeApp();
    }
    _initialized = true;
  }
}

function getDb() {
  ensureInitialized();
  return admin.firestore();
}

// Collections Firestore
const COLLECTIONS = {
  JOURNAL_ENTRIES: 'journal_entries',
  PAYMENTS: 'payments',
  REFUNDS: 'refunds',
  PAYOUTS: 'payouts',
  SUBSCRIPTIONS: 'subscriptions',
  USERS: 'users',
  ACCOUNTING_SEQUENCES: 'accounting_sequences',
  ACCOUNTING_PERIODS: 'accounting_periods',
  EXCHANGE_RATES: 'exchange_rates',
  CHATTER_COMMISSIONS: 'chatter_commissions',
  INFLUENCER_COMMISSIONS: 'influencer_commissions',
  BLOGGER_COMMISSIONS: 'blogger_commissions',
  GROUP_ADMIN_COMMISSIONS: 'group_admin_commissions',
  AFFILIATE_COMMISSIONS: 'affiliate_commissions',
  PAYMENT_WITHDRAWALS: 'payment_withdrawals',
} as const;

// Cache: period closed status (avoid repeated Firestore reads)
const closedPeriodCache: Map<string, { closed: boolean; cachedAt: number }> = new Map();
const PERIOD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// =============================================================================
// UTILITAIRES
// =============================================================================

/**
 * Arrondir a 2 decimales
 */
function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Generer le prochain numero de sequence
 */
async function getNextSequence(
  type: 'PAYMENT' | 'REFUND' | 'PAYOUT' | 'SUBSCRIPTION' | 'COMMISSION' | 'WITHDRAWAL' | 'PROVIDER_TRANSFER',
  year: number
): Promise<number> {
  const docRef = getDb().collection(COLLECTIONS.ACCOUNTING_SEQUENCES).doc(`${type}_${year}`);

  const result = await getDb().runTransaction(async (transaction) => {
    const doc = await transaction.get(docRef);

    if (!doc.exists) {
      transaction.set(docRef, {
        type,
        year,
        currentSequence: 1,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return 1;
    }

    const currentSeq = doc.data()?.currentSequence || 0;
    const nextSeq = currentSeq + 1;

    transaction.update(docRef, {
      currentSequence: nextSeq,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return nextSeq;
  });

  return result;
}

/**
 * Generer une reference unique avec sequence
 */
async function generateUniqueReference(
  type: 'PAYMENT' | 'REFUND' | 'PAYOUT' | 'SUBSCRIPTION' | 'COMMISSION' | 'WITHDRAWAL' | 'PROVIDER_TRANSFER',
  date: Date
): Promise<string> {
  const prefix = DEFAULT_ACCOUNTING_CONFIG.referencePrefix[type.toLowerCase() as keyof typeof DEFAULT_ACCOUNTING_CONFIG.referencePrefix];
  const year = date.getFullYear();
  const sequence = await getNextSequence(type, year);

  return `${prefix}-${year}-${sequence.toString().padStart(5, '0')}`;
}

// =============================================================================
// SERVICE PRINCIPAL
// =============================================================================

export class AccountingService {
  /**
   * Creer et sauvegarder une ecriture pour un paiement
   */
  async createPaymentEntry(paymentId: string): Promise<JournalEntry | null> {
    try {
      logger.info('AccountingService: Creating payment entry', { paymentId });

      // Recuperer les donnees du paiement
      const paymentDoc = await getDb().collection(COLLECTIONS.PAYMENTS).doc(paymentId).get();

      if (!paymentDoc.exists) {
        logger.error('AccountingService: Payment not found', { paymentId });
        return null;
      }

      const paymentData = paymentDoc.data();
      if (!paymentData) {
        logger.error('AccountingService: Payment data is empty', { paymentId });
        return null;
      }

      // Verifier si une ecriture existe deja
      const existingEntry = await getDb()
        .collection(COLLECTIONS.JOURNAL_ENTRIES)
        .where('sourceDocument.type', '==', 'PAYMENT')
        .where('sourceDocument.id', '==', paymentId)
        .limit(1)
        .get();

      if (!existingEntry.empty) {
        logger.info('AccountingService: Entry already exists', { paymentId });
        return existingEntry.docs[0].data() as JournalEntry;
      }

      // Verifier periode
      const payDate = paymentData.createdAt?.toDate() || new Date();
      const payPeriod = `${payDate.getFullYear()}-${(payDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (await this.isPeriodClosed(payPeriod)) {
        logger.warn('AccountingService: Period closed, skipping payment entry', { payPeriod, paymentId });
        return null;
      }

      // Recuperer les infos client
      const customerInfo = await this.getCustomerInfo(paymentData.clientId);

      // Convertir via taux ECB si devise != EUR
      const currency = (paymentData.currency || 'USD').toUpperCase();
      const paymentDate = paymentData.createdAt?.toDate() || new Date();

      const amountConv = await convertCentsToEur(paymentData.amount || 0, currency, paymentDate);
      const amountEur = amountConv.amountEur;
      const exchangeRate = amountConv.exchangeRate;
      const exchangeRateDate = amountConv.exchangeRateDate;

      const feeBreakdown = paymentData.feeBreakdown as { processingFee?: number } | undefined;
      const fallbackFixedFee = currency === 'USD' ? 0.30 : 0.25;
      const stripeFeeEur = feeBreakdown?.processingFee != null
        ? round2(feeBreakdown.processingFee / (currency !== 'EUR' ? exchangeRate : 1))
        : round2(amountEur * 0.029 + fallbackFixedFee);
      const commissionConv = await convertCentsToEur(paymentData.commissionAmount || 0, currency, paymentDate);
      const commissionEur = commissionConv.amountEur;
      const providerConv = await convertCentsToEur(paymentData.providerAmount || 0, currency, paymentDate);
      const providerAmountEur = providerConv.amountEur;

      // Preparer les donnees pour le generateur
      const data: PaymentData = {
        paymentId,
        amountCents: paymentData.amount || 0,
        amountEur,
        currency: paymentData.currency || 'EUR',
        processorFeeCents: Math.round(stripeFeeEur * 100),
        processorFeeEur: stripeFeeEur,
        commissionCents: paymentData.commissionAmount || 0,
        commissionEur,
        providerAmountCents: paymentData.providerAmount || 0,
        providerAmountEur,
        processor: 'stripe',
        serviceType: paymentData.serviceType || 'lawyer_call',
        customer: customerInfo,
        providerId: paymentData.providerId,
        callSessionId: paymentData.callSessionId,
        paymentDate: paymentData.createdAt?.toDate() || new Date(),
        processorMetadata: {
          stripePaymentIntentId: paymentData.stripePaymentIntentId,
        },
      };

      // Generer l'ecriture
      const entry = generatePaymentEntry(data);

      // Ajouter les infos de taux de change dans les metadata
      entry.metadata = {
        ...entry.metadata,
        originalCurrency: currency,
        exchangeRate,
        exchangeRateDate,
      };

      // Generer une reference unique
      entry.reference = await generateUniqueReference('PAYMENT', data.paymentDate);

      // Valider l'ecriture
      const validation = validateJournalEntry(entry);
      if (!validation.isValid) {
        logger.error('AccountingService: Invalid entry', {
          paymentId,
          errors: validation.errors,
        });
        // On sauvegarde quand meme en DRAFT avec les erreurs
        entry.metadata = {
          ...entry.metadata,
          validationErrors: validation.errors,
        };
      }

      // Sauvegarder dans Firestore
      await getDb().collection(COLLECTIONS.JOURNAL_ENTRIES).doc(entry.id).set(entry);

      logger.info('AccountingService: Payment entry created', {
        paymentId,
        entryId: entry.id,
        reference: entry.reference,
      });

      return entry;
    } catch (error) {
      logger.error('AccountingService: Error creating payment entry', {
        paymentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Creer et sauvegarder une ecriture pour un remboursement
   */
  async createRefundEntry(refundId: string): Promise<JournalEntry | null> {
    try {
      logger.info('AccountingService: Creating refund entry', { refundId });

      // Recuperer les donnees du remboursement
      const refundDoc = await getDb().collection(COLLECTIONS.REFUNDS).doc(refundId).get();

      if (!refundDoc.exists) {
        logger.error('AccountingService: Refund not found', { refundId });
        return null;
      }

      const refundData = refundDoc.data();
      if (!refundData) {
        return null;
      }

      // Verifier si une ecriture existe deja
      const existingEntry = await getDb()
        .collection(COLLECTIONS.JOURNAL_ENTRIES)
        .where('sourceDocument.type', '==', 'REFUND')
        .where('sourceDocument.id', '==', refundId)
        .limit(1)
        .get();

      if (!existingEntry.empty) {
        logger.info('AccountingService: Refund entry already exists', { refundId });
        return existingEntry.docs[0].data() as JournalEntry;
      }

      // Recuperer l'ecriture du paiement original pour les infos TVA
      const originalPaymentEntry = await this.getEntryBySourceDocument('PAYMENT', refundData.paymentId);

      // Convertir via taux ECB
      const refundCurrency = (refundData.currency || 'USD').toUpperCase();
      const refundDate = refundData.createdAt?.toDate() || new Date();
      const refundAmountConv = await convertCentsToEur(refundData.amount || 0, refundCurrency, refundDate);

      // Verifier periode
      const refundPeriod = `${refundDate.getFullYear()}-${(refundDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (await this.isPeriodClosed(refundPeriod)) {
        logger.warn('AccountingService: Period closed, skipping refund entry', { refundPeriod, refundId });
        return null;
      }

      const data: RefundData = {
        refundId,
        originalPaymentId: refundData.paymentId,
        amountCents: refundData.amount || 0,
        amountEur: refundAmountConv.amountEur,
        currency: refundCurrency,
        processor: 'stripe',
        reason: refundData.reason || 'customer_request',
        serviceType: refundData.serviceType || 'lawyer_call',
        originalVatInfo: originalPaymentEntry?.metadata?.vatRegime
          ? {
            countryCode: originalPaymentEntry.metadata.customerCountry as string,
            rate: originalPaymentEntry.metadata.vatRate as number,
            accountCode: '445202', // Default
            amount: 0,
            regime: originalPaymentEntry.metadata.vatRegime as 'OSS' | 'REVERSE_CHARGE' | 'EXEMPT' | 'DOMESTIC',
          }
          : undefined,
        refundDate: refundData.createdAt?.toDate() || new Date(),
      };

      const entry = generateRefundEntry(data);
      entry.reference = await generateUniqueReference('REFUND', data.refundDate);

      // Ajouter metadata taux de change
      entry.metadata = {
        ...entry.metadata,
        originalCurrency: refundCurrency,
        exchangeRate: refundAmountConv.exchangeRate,
        exchangeRateDate: refundAmountConv.exchangeRateDate,
      };

      const validation = validateJournalEntry(entry);
      if (!validation.isValid) {
        entry.metadata = { ...entry.metadata, validationErrors: validation.errors };
      }

      await getDb().collection(COLLECTIONS.JOURNAL_ENTRIES).doc(entry.id).set(entry);

      logger.info('AccountingService: Refund entry created', {
        refundId,
        entryId: entry.id,
        reference: entry.reference,
      });

      return entry;
    } catch (error) {
      logger.error('AccountingService: Error creating refund entry', {
        refundId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Creer et sauvegarder une ecriture pour un reversement prestataire
   */
  async createPayoutEntry(payoutId: string): Promise<JournalEntry | null> {
    try {
      logger.info('AccountingService: Creating payout entry', { payoutId });

      const payoutDoc = await getDb().collection(COLLECTIONS.PAYOUTS).doc(payoutId).get();

      if (!payoutDoc.exists) {
        logger.error('AccountingService: Payout not found', { payoutId });
        return null;
      }

      const payoutData = payoutDoc.data();
      if (!payoutData) {
        return null;
      }

      // Verifier si une ecriture existe deja
      const existingEntry = await getDb()
        .collection(COLLECTIONS.JOURNAL_ENTRIES)
        .where('sourceDocument.type', '==', 'PAYOUT')
        .where('sourceDocument.id', '==', payoutId)
        .limit(1)
        .get();

      if (!existingEntry.empty) {
        logger.info('AccountingService: Payout entry already exists', { payoutId });
        return existingEntry.docs[0].data() as JournalEntry;
      }

      // Convertir via taux ECB
      const payoutCurrency = (payoutData.currency || 'EUR').toUpperCase();
      const payoutDate = payoutData.createdAt?.toDate() || new Date();

      // Verifier periode
      const payoutPeriod = `${payoutDate.getFullYear()}-${(payoutDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (await this.isPeriodClosed(payoutPeriod)) {
        logger.warn('AccountingService: Period closed, skipping payout entry', { payoutPeriod, payoutId });
        return null;
      }

      const grossConv = await convertCentsToEur(payoutData.amount || 0, payoutCurrency, payoutDate);
      const grossAmountEur = grossConv.amountEur;

      // Frais de transfert (en EUR, provient du prestataire de paiement)
      const transferFeeEur = payoutData.transferFee || 1.00;

      const data: PayoutData = {
        payoutId,
        providerId: payoutData.providerId,
        grossAmountCents: payoutData.amount || 0,
        grossAmountEur,
        transferFeeCents: Math.round(transferFeeEur * 100),
        transferFeeEur,
        netAmountCents: payoutData.netAmount || (payoutData.amount - Math.round(transferFeeEur * 100)),
        netAmountEur: round2(grossAmountEur - transferFeeEur),
        paymentMethod: payoutData.paymentMethod || 'wise',
        payoutDate,
      };

      const entry = generatePayoutEntry(data);
      entry.reference = await generateUniqueReference('PAYOUT', data.payoutDate);

      // Ajouter metadata taux de change
      entry.metadata = {
        ...entry.metadata,
        originalCurrency: payoutCurrency,
        exchangeRate: grossConv.exchangeRate,
        exchangeRateDate: grossConv.exchangeRateDate,
      };

      const validation = validateJournalEntry(entry);
      if (!validation.isValid) {
        entry.metadata = { ...entry.metadata, validationErrors: validation.errors };
      }

      await getDb().collection(COLLECTIONS.JOURNAL_ENTRIES).doc(entry.id).set(entry);

      logger.info('AccountingService: Payout entry created', {
        payoutId,
        entryId: entry.id,
        reference: entry.reference,
      });

      return entry;
    } catch (error) {
      logger.error('AccountingService: Error creating payout entry', {
        payoutId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Creer et sauvegarder une ecriture pour un abonnement
   */
  async createSubscriptionEntry(subscriptionId: string, _paymentId?: string): Promise<JournalEntry | null> {
    try {
      logger.info('AccountingService: Creating subscription entry', { subscriptionId });

      const subDoc = await getDb().collection(COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId).get();

      if (!subDoc.exists) {
        logger.error('AccountingService: Subscription not found', { subscriptionId });
        return null;
      }

      const subData = subDoc.data();
      if (!subData) {
        return null;
      }

      // Verifier si une ecriture existe deja
      const existingEntry = await getDb()
        .collection(COLLECTIONS.JOURNAL_ENTRIES)
        .where('sourceDocument.type', '==', 'SUBSCRIPTION')
        .where('sourceDocument.id', '==', subscriptionId)
        .limit(1)
        .get();

      if (!existingEntry.empty) {
        logger.info('AccountingService: Subscription entry already exists', { subscriptionId });
        return existingEntry.docs[0].data() as JournalEntry;
      }

      const subDate = subData.paidAt?.toDate() || new Date();
      const subPeriod = `${subDate.getFullYear()}-${(subDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (await this.isPeriodClosed(subPeriod)) {
        logger.warn('AccountingService: Period closed, skipping subscription entry', { subPeriod, subscriptionId });
        return null;
      }

      const customerInfo = await this.getCustomerInfo(subData.userId);
      const subCurrency = (subData.currency || 'USD').toUpperCase();
      const amountConvSub = await convertCentsToEur(subData.amountPaid || subData.pricePerMonth || 0, subCurrency, subDate);
      const amountEur = amountConvSub.amountEur;
      const stripeFeeEur = round2(amountEur * 0.029 + 0.25);

      const data: SubscriptionData = {
        subscriptionId,
        userId: subData.userId,
        amountCents: subData.amountPaid || subData.pricePerMonth || 0,
        amountEur,
        currency: subCurrency,
        processorFeeCents: Math.round(stripeFeeEur * 100),
        processorFeeEur: stripeFeeEur,
        processor: 'stripe',
        customer: customerInfo,
        plan: subData.plan || 'premium',
        paymentDate: subData.paidAt?.toDate() || new Date(),
      };

      const entry = generateSubscriptionEntry(data);
      entry.reference = await generateUniqueReference('SUBSCRIPTION', data.paymentDate);

      // Ajouter metadata taux de change
      entry.metadata = {
        ...entry.metadata,
        originalCurrency: subCurrency,
        exchangeRate: amountConvSub.exchangeRate,
        exchangeRateDate: amountConvSub.exchangeRateDate,
      };

      const validation = validateJournalEntry(entry);
      if (!validation.isValid) {
        entry.metadata = { ...entry.metadata, validationErrors: validation.errors };
      }

      await getDb().collection(COLLECTIONS.JOURNAL_ENTRIES).doc(entry.id).set(entry);

      logger.info('AccountingService: Subscription entry created', {
        subscriptionId,
        entryId: entry.id,
        reference: entry.reference,
      });

      return entry;
    } catch (error) {
      logger.error('AccountingService: Error creating subscription entry', {
        subscriptionId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Invalider le cache de periode (appeler apres reouverture)
   */
  invalidatePeriodCache(period: string): void {
    closedPeriodCache.delete(period);
  }

  /**
   * Verifier si une periode comptable est cloturee (avec cache)
   */
  async isPeriodClosed(period: string): Promise<boolean> {
    const cached = closedPeriodCache.get(period);
    if (cached && (Date.now() - cached.cachedAt) < PERIOD_CACHE_TTL_MS) {
      return cached.closed;
    }

    try {
      const doc = await getDb().collection(COLLECTIONS.ACCOUNTING_PERIODS).doc(period).get();
      const closed = doc.exists && doc.data()?.status === 'CLOSED';
      closedPeriodCache.set(period, { closed, cachedAt: Date.now() });
      return closed;
    } catch (error) {
      // Fail-closed : en cas d'erreur Firestore, bloquer par securite
      logger.error('AccountingService: isPeriodClosed check failed, blocking by default', {
        period,
        error: error instanceof Error ? error.message : error,
      });
      return true;
    }
  }

  /**
   * Creer une ecriture pour une commission affilie
   */
  async createCommissionEntry(
    commissionId: string,
    userType: AffiliateUserType,
    collectionName: string
  ): Promise<JournalEntry | null> {
    try {
      logger.info('AccountingService: Creating commission entry', { commissionId, userType });

      // Verifier si ecriture existe deja
      const existing = await getDb()
        .collection(COLLECTIONS.JOURNAL_ENTRIES)
        .where('sourceDocument.type', '==', 'COMMISSION')
        .where('sourceDocument.id', '==', commissionId)
        .limit(1)
        .get();

      if (!existing.empty) {
        logger.info('AccountingService: Commission entry already exists', { commissionId });
        return existing.docs[0].data() as JournalEntry;
      }

      // Lire la commission
      const comDoc = await getDb().collection(collectionName).doc(commissionId).get();
      if (!comDoc.exists) {
        logger.error('AccountingService: Commission not found', { commissionId, collectionName });
        return null;
      }

      const comData = comDoc.data()!;
      const amountCents = comData.amount || comData.commissionAmount || 0;

      // Guard: rejeter les montants invalides
      if (amountCents <= 0) {
        logger.warn('AccountingService: Skipping zero/negative commission amount', { commissionId, amountCents });
        return null;
      }

      // Guard: rejeter si aucun userId identifiable
      const userId = comData.userId || comData.chatterId || comData.influencerId || comData.bloggerId || comData.groupAdminId || comData.referrerId;
      if (!userId) {
        logger.error('AccountingService: No userId found for commission', { commissionId, collectionName });
        return null;
      }

      const currency = (comData.currency || 'USD').toUpperCase();
      const comDate = comData.createdAt?.toDate() || new Date();

      // Verifier periode
      const period = `${comDate.getFullYear()}-${(comDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (await this.isPeriodClosed(period)) {
        logger.warn('AccountingService: Period closed, skipping commission entry', { period, commissionId });
        return null;
      }

      // Convertir via ECB
      const conv = await convertCentsToEur(amountCents, currency, comDate);

      const data: CommissionData = {
        commissionId,
        userType,
        userId,
        amountCents,
        amountEur: conv.amountEur,
        currency,
        exchangeRate: conv.exchangeRate,
        exchangeRateDate: conv.exchangeRateDate,
        commissionDate: comDate,
        source: comData.source || comData.type,
      };

      const entry = generateCommissionEntry(data);
      entry.reference = await generateUniqueReference('COMMISSION', comDate);
      entry.sourceDocument.collection = collectionName;

      const validation = validateJournalEntry(entry);
      if (!validation.isValid) {
        entry.metadata = { ...entry.metadata, validationErrors: validation.errors };
      }

      await getDb().collection(COLLECTIONS.JOURNAL_ENTRIES).doc(entry.id).set(entry);

      logger.info('AccountingService: Commission entry created', {
        commissionId,
        entryId: entry.id,
        reference: entry.reference,
        amountEur: conv.amountEur,
      });

      return entry;
    } catch (error) {
      logger.error('AccountingService: Error creating commission entry', {
        commissionId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Creer une ecriture pour un retrait affilie
   */
  async createWithdrawalEntry(withdrawalId: string): Promise<JournalEntry | null> {
    try {
      logger.info('AccountingService: Creating withdrawal entry', { withdrawalId });

      // Verifier si ecriture existe deja
      const existing = await getDb()
        .collection(COLLECTIONS.JOURNAL_ENTRIES)
        .where('sourceDocument.type', '==', 'WITHDRAWAL')
        .where('sourceDocument.id', '==', withdrawalId)
        .limit(1)
        .get();

      if (!existing.empty) {
        logger.info('AccountingService: Withdrawal entry already exists', { withdrawalId });
        return existing.docs[0].data() as JournalEntry;
      }

      const wdDoc = await getDb().collection(COLLECTIONS.PAYMENT_WITHDRAWALS).doc(withdrawalId).get();
      if (!wdDoc.exists) {
        logger.error('AccountingService: Withdrawal not found', { withdrawalId });
        return null;
      }

      const wdData = wdDoc.data()!;
      const amountCents = wdData.amount || 0;

      // Guard: rejeter les montants invalides
      if (amountCents <= 0) {
        logger.warn('AccountingService: Skipping zero/negative withdrawal amount', { withdrawalId, amountCents });
        return null;
      }

      const feeCents = wdData.withdrawalFee ?? 300; // Default $3 (nullish coalescing pour permettre fee=0)
      const currency = (wdData.sourceCurrency || wdData.currency || 'USD').toUpperCase();
      const wdDate = wdData.completedAt
        ? (typeof wdData.completedAt === 'string' ? new Date(wdData.completedAt) : wdData.completedAt?.toDate?.() || new Date())
        : wdData.requestedAt
          ? (typeof wdData.requestedAt === 'string' ? new Date(wdData.requestedAt) : wdData.requestedAt?.toDate?.() || new Date())
          : wdData.createdAt?.toDate?.() || new Date();

      // Verifier periode
      const period = `${wdDate.getFullYear()}-${(wdDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (await this.isPeriodClosed(period)) {
        logger.warn('AccountingService: Period closed, skipping withdrawal entry', { period, withdrawalId });
        return null;
      }

      // Convertir via ECB
      const amountConv = await convertCentsToEur(amountCents, currency, wdDate);
      const feeConv = await convertCentsToEur(feeCents, currency, wdDate);

      // Determiner le type d'affilie
      const userType: AffiliateUserType = wdData.userType || wdData.affiliateType || 'chatter';

      const data: WithdrawalData = {
        withdrawalId,
        userType,
        userId: wdData.userId || '',
        amountCents,
        amountEur: amountConv.amountEur,
        withdrawalFeeCents: feeCents,
        withdrawalFeeEur: feeConv.amountEur,
        currency,
        exchangeRate: amountConv.exchangeRate,
        exchangeRateDate: amountConv.exchangeRateDate,
        paymentMethod: wdData.methodType || wdData.provider || wdData.paymentMethod || 'wise',
        withdrawalDate: wdDate,
      };

      const entry = generateWithdrawalEntry(data);
      entry.reference = await generateUniqueReference('WITHDRAWAL', wdDate);
      entry.sourceDocument.collection = 'payment_withdrawals';

      const validation = validateJournalEntry(entry);
      if (!validation.isValid) {
        entry.metadata = { ...entry.metadata, validationErrors: validation.errors };
      }

      await getDb().collection(COLLECTIONS.JOURNAL_ENTRIES).doc(entry.id).set(entry);

      logger.info('AccountingService: Withdrawal entry created', {
        withdrawalId,
        entryId: entry.id,
        reference: entry.reference,
      });

      return entry;
    } catch (error) {
      logger.error('AccountingService: Error creating withdrawal entry', {
        withdrawalId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Creer une ecriture pour un transfert Stripe vers prestataire (liberation transit)
   */
  async createProviderTransferEntry(paymentId: string): Promise<JournalEntry | null> {
    try {
      logger.info('AccountingService: Creating provider transfer entry', { paymentId });

      // Verifier si ecriture existe deja
      const existing = await getDb()
        .collection(COLLECTIONS.JOURNAL_ENTRIES)
        .where('sourceDocument.type', '==', 'PROVIDER_TRANSFER')
        .where('sourceDocument.id', '==', paymentId)
        .limit(1)
        .get();

      if (!existing.empty) {
        logger.info('AccountingService: Transfer entry already exists', { paymentId });
        return existing.docs[0].data() as JournalEntry;
      }

      const payDoc = await getDb().collection(COLLECTIONS.PAYMENTS).doc(paymentId).get();
      if (!payDoc.exists) {
        logger.error('AccountingService: Payment not found for transfer', { paymentId });
        return null;
      }

      const payData = payDoc.data()!;
      const providerAmountCents = payData.providerAmount || 0;
      const currency = (payData.currency || 'USD').toUpperCase();
      const transferDate = payData.transferCompletedAt?.toDate() || payData.updatedAt?.toDate() || new Date();

      // Verifier periode
      const trfPeriod = `${transferDate.getFullYear()}-${(transferDate.getMonth() + 1).toString().padStart(2, '0')}`;
      if (await this.isPeriodClosed(trfPeriod)) {
        logger.warn('AccountingService: Period closed, skipping provider transfer entry', { trfPeriod, paymentId });
        return null;
      }

      const conv = await convertCentsToEur(providerAmountCents, currency, transferDate);

      const entry = generateProviderTransferEntry({
        paymentId,
        providerId: payData.providerId || '',
        amountEur: conv.amountEur,
        currency,
        exchangeRate: conv.exchangeRate,
        exchangeRateDate: conv.exchangeRateDate,
        originalAmountCents: providerAmountCents,
        transferDate,
      });

      entry.reference = await generateUniqueReference('PROVIDER_TRANSFER', transferDate);

      const validation = validateJournalEntry(entry);
      if (!validation.isValid) {
        entry.metadata = { ...entry.metadata, validationErrors: validation.errors };
      }

      await getDb().collection(COLLECTIONS.JOURNAL_ENTRIES).doc(entry.id).set(entry);

      logger.info('AccountingService: Provider transfer entry created', {
        paymentId,
        entryId: entry.id,
        reference: entry.reference,
      });

      return entry;
    } catch (error) {
      logger.error('AccountingService: Error creating provider transfer entry', {
        paymentId,
        error: error instanceof Error ? error.message : error,
      });
      throw error;
    }
  }

  /**
   * Valider (poster) une ecriture
   */
  async postEntry(entryId: string, userId: string): Promise<boolean> {
    try {
      const db = getDb();
      const entryRef = db.collection(COLLECTIONS.JOURNAL_ENTRIES).doc(entryId);

      await db.runTransaction(async (transaction) => {
        const entryDoc = await transaction.get(entryRef);

        if (!entryDoc.exists) {
          throw new Error('Entry not found');
        }

        const entry = entryDoc.data() as JournalEntry;

        if (entry.status !== 'DRAFT') {
          throw new Error(`Entry already ${entry.status}`);
        }

        // Verifier que la periode n'est pas cloturee
        if (entry.period && await this.isPeriodClosed(entry.period)) {
          throw new Error(`Period ${entry.period} is closed`);
        }

        // Revalider avant de poster
        const validation = validateJournalEntry(entry);
        if (!validation.isValid) {
          throw new Error(`Validation errors: ${validation.errors.join(', ')}`);
        }

        transaction.update(entryRef, {
          status: 'POSTED' as JournalEntryStatus,
          postedAt: Timestamp.now(),
          postedBy: userId,
        });
      });

      logger.info('AccountingService: Entry posted', { entryId, postedBy: userId });
      return true;
    } catch (error) {
      logger.error('AccountingService: Error posting entry', {
        entryId,
        error: error instanceof Error ? error.message : error,
      });
      return false;
    }
  }

  /**
   * Extourner une ecriture (reversal)
   */
  async reverseEntry(entryId: string, userId: string, reason: string): Promise<JournalEntry | null> {
    try {
      const db = getDb();
      const entryRef = db.collection(COLLECTIONS.JOURNAL_ENTRIES).doc(entryId);

      const reversalEntry = await db.runTransaction(async (transaction) => {
        const entryDoc = await transaction.get(entryRef);

        if (!entryDoc.exists) {
          throw new Error('Entry not found for reversal');
        }

        const entry = entryDoc.data() as JournalEntry;

        if (entry.status === 'REVERSED') {
          throw new Error('Entry already reversed');
        }

        // Verifier que la periode n'est pas cloturee
        if (entry.period && await this.isPeriodClosed(entry.period)) {
          throw new Error(`Period ${entry.period} is closed`);
        }

        // Creer l'ecriture d'extourne (inverser debit/credit)
        const now = Timestamp.now();
        const reversal: JournalEntry = {
          ...entry,
          id: `rev_${entry.id}`,
          reference: `REV-${entry.reference}`,
          description: `Extourne: ${entry.description} - ${reason}`,
          lines: entry.lines.map(line => ({
            ...line,
            debit: line.credit,
            credit: line.debit,
            description: `Extourne: ${line.description || ''}`,
          })),
          status: 'POSTED',
          date: now, // Date d'extourne = maintenant (pas la date originale)
          createdAt: now,
          postedAt: now,
          postedBy: userId,
          metadata: {
            ...entry.metadata,
            reversalOf: entryId,
            reversalReason: reason,
          },
        };

        // Recalculer la periode de l'extourne basee sur la date actuelle
        const nowDate = now.toDate();
        reversal.period = `${nowDate.getFullYear()}-${(nowDate.getMonth() + 1).toString().padStart(2, '0')}`;

        // Atomique : sauvegarder extourne + marquer originale
        const reversalRef = db.collection(COLLECTIONS.JOURNAL_ENTRIES).doc(reversal.id);
        transaction.set(reversalRef, reversal);
        transaction.update(entryRef, {
          status: 'REVERSED' as JournalEntryStatus,
          reversedAt: now,
          reversalEntryId: reversal.id,
        });

        return reversal;
      });

      logger.info('AccountingService: Entry reversed', {
        originalEntryId: entryId,
        reversalEntryId: reversalEntry.id,
      });

      return reversalEntry;
    } catch (error) {
      logger.error('AccountingService: Error reversing entry', {
        entryId,
        error: error instanceof Error ? error.message : error,
      });
      return null;
    }
  }

  /**
   * Obtenir les informations client
   */
  private async getCustomerInfo(userId: string): Promise<CustomerInfo> {
    try {
      const userDoc = await getDb().collection(COLLECTIONS.USERS).doc(userId).get();

      if (!userDoc.exists) {
        return {
          id: userId,
          countryCode: 'FR', // Defaut France
          type: 'B2C',
        };
      }

      const userData = userDoc.data();

      return {
        id: userId,
        countryCode: userData?.country || userData?.countryCode || 'FR',
        type: userData?.vatNumber ? 'B2B' : 'B2C',
        vatNumber: userData?.vatNumber,
        email: userData?.email,
      };
    } catch (error) {
      logger.error('AccountingService: Error getting customer info', { userId, error });
      return {
        id: userId,
        countryCode: 'FR',
        type: 'B2C',
      };
    }
  }

  /**
   * Obtenir une ecriture par document source
   */
  private async getEntryBySourceDocument(
    type: 'PAYMENT' | 'REFUND' | 'PAYOUT' | 'SUBSCRIPTION',
    documentId: string
  ): Promise<JournalEntry | null> {
    const snapshot = await getDb()
      .collection(COLLECTIONS.JOURNAL_ENTRIES)
      .where('sourceDocument.type', '==', type)
      .where('sourceDocument.id', '==', documentId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as JournalEntry;
  }

  /**
   * Obtenir toutes les ecritures d'une periode
   */
  async getEntriesByPeriod(
    period: string,
    status?: JournalEntryStatus
  ): Promise<JournalEntry[]> {
    let query = getDb()
      .collection(COLLECTIONS.JOURNAL_ENTRIES)
      .where('period', '==', period) as FirebaseFirestore.Query;

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.orderBy('date', 'asc').get();

    return snapshot.docs.map(doc => doc.data() as JournalEntry);
  }

  /**
   * Calculer la balance des comptes pour une periode
   */
  async calculateAccountBalances(period: string): Promise<AccountBalance[]> {
    const entries = await this.getEntriesByPeriod(period, 'POSTED');

    const balances: Map<string, AccountBalance> = new Map();

    entries.forEach(entry => {
      entry.lines.forEach(line => {
        const existing = balances.get(line.accountCode) || {
          accountCode: line.accountCode,
          accountName: line.accountName,
          periodDebit: 0,
          periodCredit: 0,
          periodBalance: 0,
          cumulativeDebit: 0,
          cumulativeCredit: 0,
          cumulativeBalance: 0,
        };

        existing.periodDebit = round2(existing.periodDebit + line.debit);
        existing.periodCredit = round2(existing.periodCredit + line.credit);
        existing.periodBalance = round2(existing.periodDebit - existing.periodCredit);

        balances.set(line.accountCode, existing);
      });
    });

    return Array.from(balances.values()).sort((a, b) =>
      a.accountCode.localeCompare(b.accountCode)
    );
  }

  /**
   * Generer la declaration TVA OSS pour un trimestre
   */
  async generateOssVatDeclaration(
    year: number,
    quarter: 1 | 2 | 3 | 4
  ): Promise<OssVatDeclaration> {
    // Determiner les mois du trimestre
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = quarter * 3;

    const periods: string[] = [];
    for (let m = startMonth; m <= endMonth; m++) {
      periods.push(`${year}-${m.toString().padStart(2, '0')}`);
    }

    // Recuperer toutes les ecritures du trimestre
    const allEntries: JournalEntry[] = [];
    for (const period of periods) {
      const entries = await this.getEntriesByPeriod(period, 'POSTED');
      allEntries.push(...entries);
    }

    // Agreger par pays
    const byCountry: Map<string, OssCountryDetail> = new Map();

    allEntries.forEach(entry => {
      entry.lines.forEach(line => {
        // Identifier les lignes TVA OSS (comptes 4452xx)
        if (line.accountCode.startsWith('4452') && line.countryCode) {
          const countryCode = line.countryCode;

          const existing = byCountry.get(countryCode) || {
            countryCode,
            countryName: countryCode, // A enrichir avec les noms
            vatRate: 0,
            taxableBase: 0,
            vatAmount: 0,
            transactionCount: 0,
          };

          // Le credit sur un compte TVA = TVA collectee
          if (line.credit > 0) {
            existing.vatAmount = round2(existing.vatAmount + line.credit);
            existing.transactionCount += 1;

            // Estimer la base taxable
            const vatRate = entry.metadata?.vatRate as number || 0.20;
            existing.vatRate = vatRate;
            existing.taxableBase = round2(existing.taxableBase + (line.credit / vatRate));
          }

          byCountry.set(countryCode, existing);
        }
      });
    });

    const countryDetails = Array.from(byCountry.values())
      .filter(c => c.countryCode !== 'EE') // Exclure Estonie (TVA domestique, pas OSS)
      .sort((a, b) => b.vatAmount - a.vatAmount);

    const totalVat = round2(countryDetails.reduce((sum, c) => sum + c.vatAmount, 0));

    return {
      period: `${year}-Q${quarter}`,
      startDate: new Date(year, startMonth - 1, 1),
      endDate: new Date(year, endMonth, 0),
      byCountry: countryDetails,
      totalVat,
    };
  }

  /**
   * Obtenir les statistiques comptables
   */
  async getAccountingStats(period: string): Promise<{
    totalRevenue: number;
    totalCommissions: number;
    totalVat: number;
    totalProviderPayouts: number;
    totalProcessorFees: number;
    entryCount: number;
    draftCount: number;
    postedCount: number;
  }> {
    const entries = await this.getEntriesByPeriod(period);

    let totalRevenue = 0;
    let totalCommissions = 0;
    let totalVat = 0;
    let totalProviderPayouts = 0;
    let totalProcessorFees = 0;
    let draftCount = 0;
    let postedCount = 0;

    entries.forEach(entry => {
      if (entry.status === 'DRAFT') draftCount++;
      if (entry.status === 'POSTED') postedCount++;

      entry.lines.forEach(line => {
        // Commissions (706xxx)
        if (line.accountCode.startsWith('706') && line.credit > 0) {
          totalCommissions += line.credit;
          totalRevenue += line.credit;
        }

        // Abonnements (707xxx)
        if (line.accountCode.startsWith('707') && line.credit > 0) {
          totalRevenue += line.credit;
        }

        // TVA collectee (4452xx)
        if (line.accountCode.startsWith('4452') && line.credit > 0) {
          totalVat += line.credit;
        }

        // Escrow debite = payout (467100)
        if (line.accountCode === '467100' && line.debit > 0) {
          totalProviderPayouts += line.debit;
        }

        // Frais processeurs (622xxx)
        if (line.accountCode.startsWith('622') && line.debit > 0) {
          totalProcessorFees += line.debit;
        }
      });
    });

    return {
      totalRevenue: round2(totalRevenue),
      totalCommissions: round2(totalCommissions),
      totalVat: round2(totalVat),
      totalProviderPayouts: round2(totalProviderPayouts),
      totalProcessorFees: round2(totalProcessorFees),
      entryCount: entries.length,
      draftCount,
      postedCount,
    };
  }
}

// Export une instance singleton
export const accountingService = new AccountingService();

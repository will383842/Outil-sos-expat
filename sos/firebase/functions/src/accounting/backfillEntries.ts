/**
 * Backfill des ecritures comptables - SOS-Expat OU
 *
 * Genere retroactivement les ecritures pour les commissions/retraits existants.
 * Utilise les taux ECB historiques.
 *
 * @module accounting/backfillEntries
 */

import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions/v2';
import { accountingService } from './accountingService';
import { AffiliateUserType } from './types';

// =============================================================================
// INITIALISATION
// =============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function getDb() {
  if (!IS_DEPLOYMENT_ANALYSIS && !admin.apps.length) {
    admin.initializeApp();
  }
  return admin.firestore();
}

// =============================================================================
// COMMISSION COLLECTIONS MAPPING
// =============================================================================

const COMMISSION_COLLECTIONS: Array<{
  collection: string;
  userType: AffiliateUserType;
}> = [
  { collection: 'chatter_commissions', userType: 'chatter' },
  { collection: 'influencer_commissions', userType: 'influencer' },
  { collection: 'blogger_commissions', userType: 'blogger' },
  { collection: 'group_admin_commissions', userType: 'group_admin' },
  { collection: 'affiliate_commissions', userType: 'affiliate' },
];

// =============================================================================
// BACKFILL COMMISSIONS
// =============================================================================

/**
 * Backfill des ecritures pour toutes les commissions existantes
 * Traitement par batch de 50 documents, idempotent
 */
export async function backfillCommissionEntries(options?: {
  userType?: AffiliateUserType;
  startAfter?: string;
  limit?: number;
}): Promise<{
  processed: number;
  created: number;
  skipped: number;
  errors: number;
  lastDocId?: string;
}> {
  const db = getDb();
  const batchSize = options?.limit || 50;
  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;
  let lastDocId: string | undefined;

  const collections = options?.userType
    ? COMMISSION_COLLECTIONS.filter(c => c.userType === options.userType)
    : COMMISSION_COLLECTIONS;

  for (const { collection, userType } of collections) {
    logger.info('backfillCommissionEntries: Processing', { collection, userType });

    // Ne traiter que les commissions validees (pas pending/cancelled/rejected)
    const VALID_STATUSES = ['validated', 'available', 'released', 'paid', 'completed'];

    let query = db.collection(collection)
      .where('status', 'in', VALID_STATUSES)
      .orderBy('__name__')
      .limit(batchSize) as FirebaseFirestore.Query;

    if (options?.startAfter) {
      const startDoc = await db.collection(collection).doc(options.startAfter).get();
      if (startDoc.exists) {
        query = db.collection(collection)
          .where('status', 'in', VALID_STATUSES)
          .orderBy('__name__')
          .startAfter(startDoc)
          .limit(batchSize);
      }
    }

    const snapshot = await query.get();

    for (const doc of snapshot.docs) {
      processed++;
      lastDocId = doc.id;

      try {
        // Verifier si une ecriture existe deja (idempotent)
        const existing = await db
          .collection('journal_entries')
          .where('sourceDocument.type', '==', 'COMMISSION')
          .where('sourceDocument.id', '==', doc.id)
          .limit(1)
          .get();

        if (!existing.empty) {
          skipped++;
          continue;
        }

        const entry = await accountingService.createCommissionEntry(doc.id, userType, collection);
        if (entry) {
          created++;
        } else {
          skipped++;
        }
      } catch (error) {
        errors++;
        logger.error('backfillCommissionEntries: Error processing doc', {
          collection,
          docId: doc.id,
          error: error instanceof Error ? error.message : error,
        });
      }
    }
  }

  logger.info('backfillCommissionEntries: Complete', { processed, created, skipped, errors });

  return { processed, created, skipped, errors, lastDocId };
}

/**
 * Backfill des ecritures pour les retraits existants
 */
export async function backfillWithdrawalEntries(options?: {
  startAfter?: string;
  limit?: number;
}): Promise<{
  processed: number;
  created: number;
  skipped: number;
  errors: number;
  lastDocId?: string;
}> {
  const db = getDb();
  const batchSize = options?.limit || 50;
  let processed = 0;
  let created = 0;
  let skipped = 0;
  let errors = 0;
  let lastDocId: string | undefined;

  let query = db.collection('payment_withdrawals')
    .where('status', '==', 'completed')
    .orderBy('__name__')
    .limit(batchSize) as FirebaseFirestore.Query;

  if (options?.startAfter) {
    const startDoc = await db.collection('payment_withdrawals').doc(options.startAfter).get();
    if (startDoc.exists) {
      query = db.collection('payment_withdrawals')
        .where('status', '==', 'completed')
        .orderBy('__name__')
        .startAfter(startDoc)
        .limit(batchSize);
    }
  }

  const snapshot = await query.get();

  for (const doc of snapshot.docs) {
    processed++;
    lastDocId = doc.id;

    try {
      const existing = await db
        .collection('journal_entries')
        .where('sourceDocument.type', '==', 'WITHDRAWAL')
        .where('sourceDocument.id', '==', doc.id)
        .limit(1)
        .get();

      if (!existing.empty) {
        skipped++;
        continue;
      }

      const entry = await accountingService.createWithdrawalEntry(doc.id);
      if (entry) {
        created++;
      } else {
        skipped++;
      }
    } catch (error) {
      errors++;
      logger.error('backfillWithdrawalEntries: Error processing doc', {
        docId: doc.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  logger.info('backfillWithdrawalEntries: Complete', { processed, created, skipped, errors });

  return { processed, created, skipped, errors, lastDocId };
}

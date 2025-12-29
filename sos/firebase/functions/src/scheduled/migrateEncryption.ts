/**
 * Migration script to encrypt existing phone numbers in call_sessions
 *
 * This is a one-time migration that:
 * 1. Reads all call_sessions documents
 * 2. Encrypts phone numbers that are not already encrypted
 * 3. Updates the documents with encrypted values
 *
 * Run via admin callable function: migratePhoneEncryption
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';
import {
  encryptPhoneNumber,
  isEncrypted,
  validateEncryptionConfig,
  maskPhoneNumber
} from '../utils/encryption';

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 100; // Documents per batch
const MAX_WRITES_PER_BATCH = 500; // Firestore limit

// ============================================================================
// ADMIN MIGRATION FUNCTION
// ============================================================================

/**
 * Admin callable to migrate phone numbers to encrypted format
 * Supports dry-run mode to preview changes without modifying data
 */
export const migratePhoneEncryption = functions
  .region('europe-west1')
  .runWith({
    timeoutSeconds: 540,
    memory: '512MB'
  })
  .https.onCall(async (data, context) => {
    // Verify admin authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { dryRun = true, collection = 'call_sessions' } = data as {
      dryRun?: boolean;
      collection?: string;
    };

    logger.info(`[Migration] Starting phone encryption migration for ${collection} (dryRun: ${dryRun})`);

    // Validate encryption configuration
    const configValid = validateEncryptionConfig();
    if (!configValid.valid) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        `Encryption not configured: ${configValid.error}`
      );
    }

    const db = admin.firestore();
    let processed = 0;
    let encrypted = 0;
    let skipped = 0;
    let errors = 0;

    try {
      // Get all documents
      let query = db.collection(collection).limit(BATCH_SIZE);
      let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;

      while (true) {
        // Apply pagination
        if (lastDoc) {
          query = db.collection(collection)
            .startAfter(lastDoc)
            .limit(BATCH_SIZE);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
          break;
        }

        const batch = db.batch();
        let batchCount = 0;

        for (const doc of snapshot.docs) {
          const docData = doc.data();
          const updates: Record<string, unknown> = {};
          let needsUpdate = false;

          // Check provider phone
          const providerPhone = docData.participants?.provider?.phone;
          if (providerPhone && !isEncrypted(providerPhone)) {
            updates['participants.provider.phone'] = encryptPhoneNumber(providerPhone);
            updates['participants.provider.phoneMasked'] = maskPhoneNumber(providerPhone);
            needsUpdate = true;

            if (dryRun) {
              logger.info(`[Migration] Would encrypt provider phone in ${doc.id}: ${maskPhoneNumber(providerPhone)}`);
            }
          }

          // Check client phone
          const clientPhone = docData.participants?.client?.phone;
          if (clientPhone && !isEncrypted(clientPhone)) {
            updates['participants.client.phone'] = encryptPhoneNumber(clientPhone);
            updates['participants.client.phoneMasked'] = maskPhoneNumber(clientPhone);
            needsUpdate = true;

            if (dryRun) {
              logger.info(`[Migration] Would encrypt client phone in ${doc.id}: ${maskPhoneNumber(clientPhone)}`);
            }
          }

          if (needsUpdate) {
            if (!dryRun) {
              updates['metadata.phoneEncryptedAt'] = admin.firestore.Timestamp.now();
              batch.update(doc.ref, updates);
              batchCount++;
            }
            encrypted++;
          } else {
            skipped++;
          }

          processed++;

          // Commit batch if reaching limit
          if (batchCount >= MAX_WRITES_PER_BATCH) {
            if (!dryRun) {
              await batch.commit();
            }
            batchCount = 0;
          }
        }

        // Commit remaining updates
        if (batchCount > 0 && !dryRun) {
          await batch.commit();
        }

        // Set pagination cursor
        lastDoc = snapshot.docs[snapshot.docs.length - 1];

        logger.info(`[Migration] Processed ${processed} documents, encrypted ${encrypted}, skipped ${skipped}`);
      }

      // Log the migration
      await db.collection('admin_audit_logs').add({
        action: 'PHONE_ENCRYPTION_MIGRATION',
        adminId: context.auth.uid,
        metadata: {
          collection,
          dryRun,
          processed,
          encrypted,
          skipped,
          errors
        },
        createdAt: admin.firestore.Timestamp.now()
      });

      return {
        success: true,
        dryRun,
        collection,
        stats: {
          processed,
          encrypted,
          skipped,
          errors
        },
        message: dryRun
          ? `Dry run completed. Would encrypt ${encrypted} phone numbers across ${processed} documents.`
          : `Migration completed. Encrypted ${encrypted} phone numbers across ${processed} documents.`
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[Migration] Error:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Admin function to get encryption status
 */
export const getEncryptionStatus = functions
  .region('europe-west1')
  .https.onCall(async (data, context) => {
    // Verify admin authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const { collection = 'call_sessions' } = data as { collection?: string };

    const db = admin.firestore();

    try {
      // Sample documents to check encryption status
      const sampleDocs = await db.collection(collection)
        .orderBy('metadata.createdAt', 'desc')
        .limit(100)
        .get();

      let totalSampled = 0;
      let encryptedCount = 0;
      let unencryptedCount = 0;

      for (const doc of sampleDocs.docs) {
        const docData = doc.data();
        totalSampled++;

        const providerPhone = docData.participants?.provider?.phone;
        const clientPhone = docData.participants?.client?.phone;

        const providerEncrypted = providerPhone ? isEncrypted(providerPhone) : true;
        const clientEncrypted = clientPhone ? isEncrypted(clientPhone) : true;

        if (providerEncrypted && clientEncrypted) {
          encryptedCount++;
        } else {
          unencryptedCount++;
        }
      }

      // Get total count
      const totalCount = await db.collection(collection).count().get();

      // Validate encryption config
      const configValid = validateEncryptionConfig();

      return {
        collection,
        configValid: configValid.valid,
        configError: configValid.error,
        stats: {
          totalDocuments: totalCount.data().count,
          sampleSize: totalSampled,
          encryptedInSample: encryptedCount,
          unencryptedInSample: unencryptedCount,
          estimatedUnencrypted: Math.round(
            (unencryptedCount / totalSampled) * totalCount.data().count
          )
        }
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[Encryption Status] Error:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Admin function to generate a new encryption key
 * Returns the key in base64 format (store in Firebase secrets)
 */
export const generateEncryptionKey = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Verify admin authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    const crypto = await import('crypto');
    const key = crypto.randomBytes(32).toString('base64');

    // Log the generation (but NOT the key)
    await admin.firestore().collection('admin_audit_logs').add({
      action: 'ENCRYPTION_KEY_GENERATED',
      adminId: context.auth.uid,
      metadata: {
        note: 'New encryption key generated. Store in ENCRYPTION_KEY secret.'
      },
      createdAt: admin.firestore.Timestamp.now()
    });

    return {
      key,
      instructions: [
        '1. Copy this key and store it securely',
        '2. Run: firebase functions:secrets:set ENCRYPTION_KEY',
        '3. Paste the key when prompted',
        '4. Deploy functions with: firebase deploy --only functions',
        '5. Never share or commit this key'
      ]
    };
  });

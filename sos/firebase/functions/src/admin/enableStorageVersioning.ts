/**
 * Admin function to enable Storage versioning via Cloud Function
 * Uses the service account credentials already available in Cloud Functions
 */

import * as functions from 'firebase-functions/v1';
import * as admin from 'firebase-admin';
import { logger } from 'firebase-functions';

const BUCKET_NAME = 'sos-urgently-ac307.firebasestorage.app';

/**
 * Enable versioning on the Firebase Storage bucket
 * Admin-only callable function
 */
export const enableStorageVersioning = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Vérifier l'authentification admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
      const bucket = admin.storage().bucket(BUCKET_NAME);

      // Get current metadata
      const [metadata] = await bucket.getMetadata();

      logger.info('[Storage] Current versioning status:', metadata.versioning);

      // Enable versioning
      await bucket.setMetadata({
        versioning: {
          enabled: true
        }
      });

      // Verify
      const [updatedMetadata] = await bucket.getMetadata();

      // Log admin action
      await admin.firestore().collection('admin_audit_logs').add({
        action: 'ENABLE_STORAGE_VERSIONING',
        adminId: context.auth.uid,
        targetId: BUCKET_NAME,
        metadata: {
          before: metadata.versioning,
          after: updatedMetadata.versioning
        },
        createdAt: admin.firestore.Timestamp.now()
      });

      logger.info('[Storage] Versioning enabled successfully');

      return {
        success: true,
        bucket: BUCKET_NAME,
        versioning: updatedMetadata.versioning,
        message: 'Storage versioning enabled successfully'
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[Storage] Failed to enable versioning:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Configure lifecycle policies on the Storage bucket
 * Admin-only callable function
 */
export const configureStorageLifecycle = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Vérifier l'authentification admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
      const bucket = admin.storage().bucket(BUCKET_NAME);

      // Configure lifecycle rules
      const lifecycleRules = [
        {
          action: { type: 'Delete' as const },
          condition: {
            age: 90,
            isLive: false // Delete old versions after 90 days
          }
        },
        {
          action: { type: 'SetStorageClass' as const, storageClass: 'NEARLINE' },
          condition: {
            age: 30,
            matchesPrefix: ['auth_backups/', 'twilio_backups/', 'dr_reports/']
          }
        },
        {
          action: { type: 'SetStorageClass' as const, storageClass: 'COLDLINE' },
          condition: {
            age: 90,
            matchesPrefix: ['auth_backups/', 'twilio_backups/', 'dr_reports/']
          }
        }
      ];

      await bucket.setMetadata({
        lifecycle: {
          rule: lifecycleRules
        }
      } as Record<string, unknown>);

      // Verify
      const [updatedMetadata] = await bucket.getMetadata();

      // Log admin action
      await admin.firestore().collection('admin_audit_logs').add({
        action: 'CONFIGURE_STORAGE_LIFECYCLE',
        adminId: context.auth.uid,
        targetId: BUCKET_NAME,
        metadata: {
          rules: lifecycleRules.length
        },
        createdAt: admin.firestore.Timestamp.now()
      });

      logger.info('[Storage] Lifecycle policies configured successfully');

      return {
        success: true,
        bucket: BUCKET_NAME,
        lifecycle: updatedMetadata.lifecycle,
        message: 'Storage lifecycle policies configured successfully'
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[Storage] Failed to configure lifecycle:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

/**
 * Get current Storage configuration
 * Admin-only callable function
 */
export const getStorageConfig = functions
  .region('europe-west1')
  .https.onCall(async (_data, context) => {
    // Vérifier l'authentification admin
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }

    const userDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
    const userData = userDoc.data();
    if (userData?.role !== 'admin' && userData?.role !== 'dev') {
      throw new functions.https.HttpsError('permission-denied', 'Admin access required');
    }

    try {
      const bucket = admin.storage().bucket(BUCKET_NAME);
      const [metadata] = await bucket.getMetadata();

      return {
        bucket: BUCKET_NAME,
        versioning: metadata.versioning || { enabled: false },
        lifecycle: metadata.lifecycle || { rule: [] },
        location: metadata.location,
        storageClass: metadata.storageClass,
        timeCreated: metadata.timeCreated
      };

    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      logger.error('[Storage] Failed to get config:', err);
      throw new functions.https.HttpsError('internal', err.message);
    }
  });

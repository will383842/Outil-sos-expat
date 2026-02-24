/**
 * Initialize Country Fiscal Configs
 *
 * Callable function to seed country_fiscal_configs and country_subdivisions
 * collections in Firestore.
 *
 * Usage:
 *   - Deploy: firebase deploy --only functions:initCountryConfigs
 *   - Call: firebase functions:call initCountryConfigs --data '{}'
 *   - Or via Admin SDK / HTTP trigger
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as logger from 'firebase-functions/logger';
import { db } from '../utils/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { ALL_COUNTRIES } from './seedCountryConfigs';
import { ALL_SUBDIVISIONS } from './seedSubdivisionConfigs';

// ============================================================================
// CALLABLE FUNCTION
// ============================================================================

export const initCountryConfigs = onCall(
  {
    timeoutSeconds: 300, // 5 minutes
    memory: '512MiB',
    cpu: 0.083,
    region: 'europe-west1',
  },
  async (request) => {
    // Check if caller is admin
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const isAdmin = request.auth.token.admin === true ||
                    request.auth.token.role === 'admin' ||
                    request.auth.token.role === 'SUPER_ADMIN';

    if (!isAdmin) {
      throw new HttpsError('permission-denied', 'Only admins can seed country configs');
    }

    logger.info('Starting country configs seed...', {
      calledBy: request.auth.uid,
      countriesCount: ALL_COUNTRIES.length,
      subdivisionsCount: ALL_SUBDIVISIONS.length
    });

    const results = {
      countries: { success: 0, failed: 0, total: ALL_COUNTRIES.length },
      subdivisions: { success: 0, failed: 0, total: ALL_SUBDIVISIONS.length }
    };

    // =========================================================================
    // SEED COUNTRIES
    // =========================================================================
    try {
      // Use batched writes (max 500 per batch)
      const countryBatches: FirebaseFirestore.WriteBatch[] = [];
      let currentBatch = db.batch();
      let operationsInBatch = 0;

      for (const country of ALL_COUNTRIES) {
        try {
          const docRef = db.collection('country_fiscal_configs').doc(country.countryCode);
          currentBatch.set(docRef, {
            ...country,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });

          operationsInBatch++;
          results.countries.success++;

          // Firestore limit: 500 operations per batch
          if (operationsInBatch >= 450) {
            countryBatches.push(currentBatch);
            currentBatch = db.batch();
            operationsInBatch = 0;
          }
        } catch (error) {
          logger.error(`Failed to prepare country ${country.countryCode}:`, error);
          results.countries.failed++;
        }
      }

      // Add remaining batch
      if (operationsInBatch > 0) {
        countryBatches.push(currentBatch);
      }

      // Commit all batches
      for (let i = 0; i < countryBatches.length; i++) {
        await countryBatches[i].commit();
        logger.info(`Country batch ${i + 1}/${countryBatches.length} committed`);
      }

      logger.info(`Countries seeded: ${results.countries.success} success, ${results.countries.failed} failed`);

    } catch (error) {
      logger.error('Error seeding countries:', error);
      throw new HttpsError('internal', 'Failed to seed countries');
    }

    // =========================================================================
    // SEED SUBDIVISIONS
    // =========================================================================
    try {
      const subdivisionBatch = db.batch();

      for (const subdivision of ALL_SUBDIVISIONS) {
        try {
          const docRef = db.collection('country_subdivisions').doc(subdivision.id);
          subdivisionBatch.set(docRef, {
            ...subdivision,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp()
          }, { merge: true });

          results.subdivisions.success++;
        } catch (error) {
          logger.error(`Failed to prepare subdivision ${subdivision.id}:`, error);
          results.subdivisions.failed++;
        }
      }

      await subdivisionBatch.commit();
      logger.info(`Subdivisions seeded: ${results.subdivisions.success} success, ${results.subdivisions.failed} failed`);

    } catch (error) {
      logger.error('Error seeding subdivisions:', error);
      throw new HttpsError('internal', 'Failed to seed subdivisions');
    }

    // =========================================================================
    // RETURN RESULTS
    // =========================================================================
    const summary = {
      success: true,
      message: `Seeded ${results.countries.success} countries and ${results.subdivisions.success} subdivisions`,
      details: results,
      timestamp: new Date().toISOString()
    };

    logger.info('Seed completed successfully', summary);

    return summary;
  }
);

// ============================================================================
// HTTP TRIGGER (for direct calls without auth - dev only)
// ============================================================================

import { onRequest } from 'firebase-functions/v2/https';

export const seedCountryConfigsHttp = onRequest(
  {
    timeoutSeconds: 300,
    memory: '512MiB',
    cpu: 0.083,
    region: 'europe-west1',
  },
  async (req, res) => {
    // Security: Check for secret header in production
    const authHeader = req.headers['x-seed-auth'];
    if (authHeader !== 'sos-expat-seed-2024') {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }

    logger.info('HTTP seed triggered');

    const results = {
      countries: { success: 0, failed: 0, total: ALL_COUNTRIES.length },
      subdivisions: { success: 0, failed: 0, total: ALL_SUBDIVISIONS.length }
    };

    try {
      // Seed countries
      const countryBatches: FirebaseFirestore.WriteBatch[] = [];
      let currentBatch = db.batch();
      let operationsInBatch = 0;

      for (const country of ALL_COUNTRIES) {
        const docRef = db.collection('country_fiscal_configs').doc(country.countryCode);
        currentBatch.set(docRef, {
          ...country,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        operationsInBatch++;
        results.countries.success++;

        if (operationsInBatch >= 450) {
          countryBatches.push(currentBatch);
          currentBatch = db.batch();
          operationsInBatch = 0;
        }
      }

      if (operationsInBatch > 0) {
        countryBatches.push(currentBatch);
      }

      for (const batch of countryBatches) {
        await batch.commit();
      }

      // Seed subdivisions
      const subdivisionBatch = db.batch();
      for (const subdivision of ALL_SUBDIVISIONS) {
        const docRef = db.collection('country_subdivisions').doc(subdivision.id);
        subdivisionBatch.set(docRef, {
          ...subdivision,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        results.subdivisions.success++;
      }
      await subdivisionBatch.commit();

      res.json({
        success: true,
        message: `Seeded ${results.countries.success} countries and ${results.subdivisions.success} subdivisions`,
        details: results
      });

    } catch (error) {
      logger.error('HTTP seed failed:', error);
      res.status(500).json({ error: 'Seed failed', details: String(error) });
    }
  }
);

/**
 * =============================================================================
 * ADMIN CLEANUP ORPHANED PROVIDERS
 * =============================================================================
 *
 * Callable function for admins to clean up orphaned linkedProviderIds that
 * reference non-existent providers in the multi-provider system.
 *
 * This handles:
 * 1. linkedProviderIds pointing to deleted providers
 * 2. Stale busyBySibling status when sibling no longer exists
 * 3. activeProviderId pointing to deleted provider
 *
 * Usage: Call from admin console for manual cleanup.
 */

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import { logError } from '../utils/logs/logError';
// P2-6 FIX: Use shared constants instead of magic numbers
import { FIRESTORE_PAGE_SIZE } from '../lib/constants';

interface CleanupResult {
  success: boolean;
  usersScanned: number;
  usersFixed: number;
  orphanedLinksRemoved: number;
  staleBusyStatusCleared: number;
  activeProviderReset: number;
  errors: number;
  details: Array<{
    userId: string;
    action: string;
    orphanedIds?: string[];
  }>;
}

// P1 FIX: Paginated helper to avoid loading the entire sos_profiles collection into memory
async function loadAllProviderIds(db: admin.firestore.Firestore): Promise<Set<string>> {
  const existingProviderIds = new Set<string>();
  let lastDoc: admin.firestore.DocumentSnapshot | null = null;
  let totalPages = 0;

  while (true) {
    let query = db.collection('sos_profiles').orderBy(admin.firestore.FieldPath.documentId()).limit(FIRESTORE_PAGE_SIZE);
    if (lastDoc) query = query.startAfter(lastDoc);

    const page = await query.get();
    if (page.empty) break;

    totalPages++;
    for (const doc of page.docs) {
      const data = doc.data();
      if (data.type === 'lawyer' || data.type === 'expat') {
        existingProviderIds.add(doc.id);
      }
    }

    if (page.size < FIRESTORE_PAGE_SIZE) break;
    lastDoc = page.docs[page.docs.length - 1];
  }

  console.log(`📊 Loaded ${existingProviderIds.size} existing providers from sos_profiles (${totalPages} pages)`);
  return existingProviderIds;
}

/**
 * Cleans up orphaned linkedProviderIds across all users
 */
export const adminCleanupOrphanedProviders = onCall<{ dryRun?: boolean }, Promise<CleanupResult>>(
  {
    region: 'europe-west1',
    memory: '512MiB',
    timeoutSeconds: 300,
  },
  async (request) => {
    // Verify authentication
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const db = admin.firestore();

    // Verify admin role
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    const dryRun = request.data?.dryRun ?? false;

    console.log(`🧹 [ORPHAN CLEANUP] Starting orphaned providers cleanup (dryRun: ${dryRun})`);

    const result: CleanupResult = {
      success: true,
      usersScanned: 0,
      usersFixed: 0,
      orphanedLinksRemoved: 0,
      staleBusyStatusCleared: 0,
      activeProviderReset: 0,
      errors: 0,
      details: [],
    };

    try {
      // Step 1: Get all users with linkedProviderIds
      const usersSnapshot = await db
        .collection('users')
        .where('linkedProviderIds', '!=', null)
        .get();

      result.usersScanned = usersSnapshot.size;

      // Step 2: Get all existing provider IDs from sos_profiles (paginated)
      const existingProviderIds = await loadAllProviderIds(db);

      console.log(`📊 Found ${existingProviderIds.size} existing providers in sos_profiles`);

      console.log(`📊 Scanning ${usersSnapshot.size} users for orphaned provider links`);

      // Step 3: Process each user
      for (const userDocSnap of usersSnapshot.docs) {
        const userId = userDocSnap.id;
        const data = userDocSnap.data();
        const linkedProviderIds: string[] = data.linkedProviderIds || [];
        const activeProviderId = data.activeProviderId;
        const busyBySibling = data.busyBySibling;
        const busySiblingProviderId = data.busySiblingProviderId;

        // Find orphaned IDs
        const orphanedIds = linkedProviderIds.filter(id => !existingProviderIds.has(id));

        // Check if activeProviderId is orphaned
        const activeProviderOrphaned = activeProviderId && !existingProviderIds.has(activeProviderId);

        // Check if busySiblingProviderId is orphaned
        const busySiblingOrphaned = busySiblingProviderId && !existingProviderIds.has(busySiblingProviderId);

        if (orphanedIds.length === 0 && !activeProviderOrphaned && !busySiblingOrphaned) {
          continue; // No cleanup needed for this user
        }

        try {
          const updates: Record<string, any> = {
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          const actions: string[] = [];

          // Remove orphaned linkedProviderIds
          if (orphanedIds.length > 0) {
            const validIds = linkedProviderIds.filter(id => existingProviderIds.has(id));
            updates.linkedProviderIds = validIds;
            result.orphanedLinksRemoved += orphanedIds.length;
            actions.push(`Removed ${orphanedIds.length} orphaned links`);
          }

          // Reset orphaned activeProviderId
          if (activeProviderOrphaned) {
            const validIds = linkedProviderIds.filter(id => existingProviderIds.has(id));
            updates.activeProviderId = validIds.length > 0 ? validIds[0] : admin.firestore.FieldValue.delete();
            result.activeProviderReset++;
            actions.push(`Reset activeProviderId from ${activeProviderId}`);
          }

          // Clear stale busyBySibling status
          if (busySiblingOrphaned || (busyBySibling && busySiblingProviderId && !existingProviderIds.has(busySiblingProviderId))) {
            updates.busyBySibling = admin.firestore.FieldValue.delete();
            updates.busySiblingProviderId = admin.firestore.FieldValue.delete();
            result.staleBusyStatusCleared++;
            actions.push(`Cleared stale busyBySibling from ${busySiblingProviderId}`);
          }

          if (!dryRun) {
            await userDocSnap.ref.update(updates);
          }

          result.usersFixed++;
          result.details.push({
            userId,
            action: dryRun ? `WOULD: ${actions.join(', ')}` : actions.join(', '),
            orphanedIds: orphanedIds.length > 0 ? orphanedIds : undefined,
          });

        } catch (userError) {
          result.errors++;
          result.details.push({
            userId,
            action: `ERROR: ${userError instanceof Error ? userError.message : 'Unknown error'}`,
          });
          await logError(`adminCleanupOrphanedProviders:${userId}`, userError);
        }
      }

      // Step 4: Also clean up sos_profiles for stale sibling references
      // P1 FIX: Use a targeted query instead of reloading the full collection
      console.log('🔍 Checking sos_profiles for stale sibling references...');

      const staleSiblingProfilesSnapshot = await db
        .collection('sos_profiles')
        .where('busySiblingProviderId', '!=', null)
        .get();

      for (const providerDoc of staleSiblingProfilesSnapshot.docs) {
        const data = providerDoc.data();
        const busySiblingProviderId = data.busySiblingProviderId;

        if (busySiblingProviderId && !existingProviderIds.has(busySiblingProviderId)) {
          try {
            if (!dryRun) {
              await providerDoc.ref.update({
                busyBySibling: admin.firestore.FieldValue.delete(),
                busySiblingProviderId: admin.firestore.FieldValue.delete(),
                availability: 'available', // Reset to available since sibling doesn't exist
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
            result.staleBusyStatusCleared++;
            result.details.push({
              userId: providerDoc.id,
              action: dryRun
                ? `WOULD: Clear stale busySiblingProviderId in provider`
                : `Cleared stale busySiblingProviderId in provider`,
            });
          } catch (error) {
            result.errors++;
            await logError(`adminCleanupOrphanedProviders:provider:${providerDoc.id}`, error);
          }
        }
      }

      // Log system event
      if (!dryRun && result.usersFixed > 0) {
        await db.collection('system_logs').add({
          type: 'admin_orphan_cleanup',
          adminId: request.auth.uid,
          usersScanned: result.usersScanned,
          usersFixed: result.usersFixed,
          orphanedLinksRemoved: result.orphanedLinksRemoved,
          staleBusyStatusCleared: result.staleBusyStatusCleared,
          activeProviderReset: result.activeProviderReset,
          errors: result.errors,
          timestamp: admin.firestore.Timestamp.now(),
        });
      }

      console.log(`🧹 [ORPHAN CLEANUP] Complete - Scanned: ${result.usersScanned}, Fixed: ${result.usersFixed}, Orphans removed: ${result.orphanedLinksRemoved}, Errors: ${result.errors}`);

      return result;

    } catch (error) {
      console.error('❌ [ORPHAN CLEANUP] Error:', error);
      await logError('adminCleanupOrphanedProviders', error);

      result.success = false;
      return result;
    }
  }
);

/**
 * Get statistics about orphaned providers (without cleaning)
 */
export const adminGetOrphanedProvidersStats = onCall<void, Promise<{
  totalUsers: number;
  usersWithOrphans: number;
  totalOrphanedLinks: number;
  orphanedActiveProviders: number;
  staleBusySiblings: number;
  orphanedProviderIds: string[];
}>>(
  {
    region: 'europe-west1',
    memory: '256MiB',
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Authentication required');
    }

    const db = admin.firestore();

    // Verify admin role
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
      throw new HttpsError('permission-denied', 'Admin access required');
    }

    // Get all existing provider IDs from sos_profiles (paginated — P1 FIX: no full-collection scan)
    const existingProviderIds = await loadAllProviderIds(db);

    console.log(`📊 Found ${existingProviderIds.size} existing providers in sos_profiles`);

    // Scan users
    const usersSnapshot = await db
      .collection('users')
      .where('linkedProviderIds', '!=', null)
      .get();

    const stats = {
      totalUsers: usersSnapshot.size,
      usersWithOrphans: 0,
      totalOrphanedLinks: 0,
      orphanedActiveProviders: 0,
      staleBusySiblings: 0,
      orphanedProviderIds: [] as string[],
    };

    const orphanedIdsSet = new Set<string>();

    for (const userDocSnap of usersSnapshot.docs) {
      const data = userDocSnap.data();
      const linkedProviderIds: string[] = data.linkedProviderIds || [];

      const orphanedIds = linkedProviderIds.filter(id => !existingProviderIds.has(id));

      if (orphanedIds.length > 0) {
        stats.usersWithOrphans++;
        stats.totalOrphanedLinks += orphanedIds.length;
        orphanedIds.forEach(id => orphanedIdsSet.add(id));
      }

      if (data.activeProviderId && !existingProviderIds.has(data.activeProviderId)) {
        stats.orphanedActiveProviders++;
        orphanedIdsSet.add(data.activeProviderId);
      }

      if (data.busySiblingProviderId && !existingProviderIds.has(data.busySiblingProviderId)) {
        stats.staleBusySiblings++;
      }
    }

    stats.orphanedProviderIds = Array.from(orphanedIdsSet);

    return stats;
  }
);

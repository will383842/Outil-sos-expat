/**
 * Provider Bulk Management Actions
 *
 * Cloud Functions for admin management of providers:
 * - Hide/unhide (visibility in searches)
 * - Block/unblock (ban from platform)
 * - Suspend/unsuspend (temporary restriction)
 * - Soft delete (mark as deleted)
 * - Hard delete (GDPR purge)
 * - Bulk operations
 *
 * All actions:
 * - Verify admin permissions
 * - Log to provider_action_logs collection
 * - Update both sos_profiles AND users collections atomically
 * - Send notification to affected provider
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logger } from "firebase-functions/v2";

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

// ============================================================================
// CONFIGURATION
// ============================================================================

const FUNCTION_CONFIG = {
  region: "europe-west1",
  memory: "256MiB" as const,
  cpu: 0.083,
  timeoutSeconds: 60,
};

const BULK_FUNCTION_CONFIG = {
  region: "europe-west1",
  memory: "512MiB" as const,
  cpu: 0.083,
  timeoutSeconds: 300,
};

const HARD_DELETE_CONFIG = {
  region: "europe-west1",
  memory: "512MiB" as const,
  cpu: 0.083,
  timeoutSeconds: 540, // 9 minutes for GDPR purge
};

// Collections that may contain provider sub-collections
const PROVIDER_SUB_COLLECTIONS = [
  "availability_slots",
  "calendar_events",
  "documents",
  "earnings",
  "kyc_documents",
  "notifications",
  "payout_history",
  "pending_transfers",
  "ratings",
  "reviews_received",
  "schedule",
  "settings",
  "translations",
];

// Collections that may reference providers (for anonymization)
const COLLECTIONS_TO_ANONYMIZE = [
  { collection: "call_sessions", field: "providerId" },
  { collection: "payments", field: "providerId" },
  { collection: "reviews", field: "providerId" },
  { collection: "disputes", field: "providerId" },
  { collection: "messages", field: "participants", isArray: true },
];

// ============================================================================
// TYPES
// ============================================================================

export interface ProviderActionResult {
  success: boolean;
  providerId: string;
  action: string;
  timestamp: string;
  error?: string;
}

export interface BulkActionResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  results: ProviderActionResult[];
}

export interface ProviderSuspensionFields {
  isSuspended: boolean;
  suspendedAt?: FirebaseFirestore.Timestamp | null;
  suspendedUntil?: FirebaseFirestore.Timestamp | null;
  suspendReason?: string | null;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify admin permissions from auth context
 * Checks both claims.admin (boolean) and claims.role === 'admin' for compatibility
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function assertAdmin(ctx: any): string {
  const uid = ctx?.auth?.uid;
  const claims = ctx?.auth?.token;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  const isAdmin = claims?.admin === true || claims?.role === 'admin';
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required");
  }

  return uid;
}

/**
 * Log provider action to provider_action_logs collection
 */
async function logProviderAction(
  adminUid: string,
  providerId: string,
  action: string,
  reason?: string,
  metadata?: Record<string, unknown>
): Promise<string> {
  const logId = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await getDb().collection("provider_action_logs").doc(logId).set({
    id: logId,
    adminUid,
    providerId,
    action,
    reason: reason || null,
    metadata: metadata || null,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    createdAt: new Date().toISOString(),
  });

  logger.info(`[PROVIDER_ACTION] ${action} on ${providerId} by ${adminUid}`, {
    action,
    providerId,
    adminUid,
    reason,
  });

  return logId;
}

/**
 * Send notification to provider about action taken
 */
async function notifyProvider(
  providerId: string,
  eventId: string,
  context: Record<string, unknown> = {}
): Promise<void> {
  try {
    // Get provider info for notification
    const userDoc = await getDb().collection("users").doc(providerId).get();
    const userData = userDoc.data();

    if (!userData) {
      logger.warn(`[PROVIDER_ACTION] Cannot notify provider ${providerId}: not found`);
      return;
    }

    // Create message event for notification pipeline
    await getDb().collection("message_events").add({
      eventId,
      locale: userData.preferredLanguage || "fr-FR",
      to: {
        email: userData.email || null,
        phone: userData.phone || null,
        pushToken: userData.fcmToken || null,
        uid: providerId,
      },
      context: {
        ...context,
        user: {
          email: userData.email,
          displayName: userData.displayName || userData.firstName,
          preferredLanguage: userData.preferredLanguage || "fr-FR",
        },
        provider: {
          id: providerId,
          displayName: userData.displayName || `${userData.firstName} ${userData.lastName}`,
        },
      },
      requestedBy: "system",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: "provider_action",
    });

    logger.info(`[PROVIDER_ACTION] Notification queued for ${providerId}: ${eventId}`);
  } catch (error) {
    logger.error(`[PROVIDER_ACTION] Failed to notify provider ${providerId}:`, error);
    // Don't throw - notification failure shouldn't block the action
  }
}

/**
 * Update both sos_profiles and users collections atomically
 */
async function updateProviderAtomic(
  providerId: string,
  updateData: Record<string, unknown>
): Promise<void> {
  const batch = getDb().batch();

  const userRef = getDb().collection("users").doc(providerId);
  const profileRef = getDb().collection("sos_profiles").doc(providerId);

  // Add updatedAt timestamp
  const dataWithTimestamp = {
    ...updateData,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  batch.update(userRef, dataWithTimestamp);

  // Check if profile exists before updating
  const profileDoc = await profileRef.get();
  if (profileDoc.exists) {
    batch.update(profileRef, dataWithTimestamp);
  }

  await batch.commit();
}

/**
 * Verify provider exists
 */
async function verifyProviderExists(providerId: string): Promise<boolean> {
  const userDoc = await getDb().collection("users").doc(providerId).get();
  return userDoc.exists;
}

// ============================================================================
// INDIVIDUAL ACTION FUNCTIONS
// ============================================================================

/**
 * Hide provider from searches (isVisible=false)
 */
export const hideProvider = onCall(FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerId } = req.data || {};

  if (!providerId) {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  if (!(await verifyProviderExists(providerId))) {
    throw new HttpsError("not-found", `Provider ${providerId} not found`);
  }

  try {
    await updateProviderAtomic(providerId, {
      isVisible: false,
      hiddenAt: admin.firestore.FieldValue.serverTimestamp(),
      hiddenBy: adminUid,
    });

    await logProviderAction(adminUid, providerId, "HIDE");
    await notifyProvider(providerId, "provider_hidden", { action: "hidden" });

    return {
      success: true,
      providerId,
      action: "HIDE",
      timestamp: new Date().toISOString(),
    } as ProviderActionResult;
  } catch (error) {
    logger.error(`[PROVIDER_ACTION] hideProvider failed:`, error);
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to hide provider"
    );
  }
});

/**
 * Unhide provider (isVisible=true)
 */
export const unhideProvider = onCall(FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerId } = req.data || {};

  if (!providerId) {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  if (!(await verifyProviderExists(providerId))) {
    throw new HttpsError("not-found", `Provider ${providerId} not found`);
  }

  try {
    await updateProviderAtomic(providerId, {
      isVisible: true,
      hiddenAt: admin.firestore.FieldValue.delete(),
      hiddenBy: admin.firestore.FieldValue.delete(),
    });

    await logProviderAction(adminUid, providerId, "UNHIDE");
    await notifyProvider(providerId, "provider_unhidden", { action: "unhidden" });

    return {
      success: true,
      providerId,
      action: "UNHIDE",
      timestamp: new Date().toISOString(),
    } as ProviderActionResult;
  } catch (error) {
    logger.error(`[PROVIDER_ACTION] unhideProvider failed:`, error);
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to unhide provider"
    );
  }
});

/**
 * Block provider (isBanned=true, isOnline=false, availability='offline')
 */
export const blockProvider = onCall(FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerId, reason } = req.data || {};

  if (!providerId) {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  if (!reason) {
    throw new HttpsError("invalid-argument", "reason is required for blocking");
  }

  if (!(await verifyProviderExists(providerId))) {
    throw new HttpsError("not-found", `Provider ${providerId} not found`);
  }

  try {
    await updateProviderAtomic(providerId, {
      isBanned: true,
      isOnline: false,
      availability: "offline",
      bannedAt: admin.firestore.FieldValue.serverTimestamp(),
      bannedBy: adminUid,
      banReason: reason,
    });

    await logProviderAction(adminUid, providerId, "BLOCK", reason);
    await notifyProvider(providerId, "provider_blocked", { action: "blocked", reason });

    return {
      success: true,
      providerId,
      action: "BLOCK",
      timestamp: new Date().toISOString(),
    } as ProviderActionResult;
  } catch (error) {
    logger.error(`[PROVIDER_ACTION] blockProvider failed:`, error);
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to block provider"
    );
  }
});

/**
 * Unblock provider (isBanned=false)
 */
export const unblockProvider = onCall(FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerId } = req.data || {};

  if (!providerId) {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  if (!(await verifyProviderExists(providerId))) {
    throw new HttpsError("not-found", `Provider ${providerId} not found`);
  }

  try {
    await updateProviderAtomic(providerId, {
      isBanned: false,
      bannedAt: admin.firestore.FieldValue.delete(),
      bannedBy: admin.firestore.FieldValue.delete(),
      banReason: admin.firestore.FieldValue.delete(),
    });

    await logProviderAction(adminUid, providerId, "UNBLOCK");
    await notifyProvider(providerId, "provider_unblocked", { action: "unblocked" });

    return {
      success: true,
      providerId,
      action: "UNBLOCK",
      timestamp: new Date().toISOString(),
    } as ProviderActionResult;
  } catch (error) {
    logger.error(`[PROVIDER_ACTION] unblockProvider failed:`, error);
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to unblock provider"
    );
  }
});

/**
 * Suspend provider temporarily (isSuspended=true, suspendedAt, suspendedUntil?, suspendReason)
 */
export const suspendProvider = onCall(FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerId, reason, until } = req.data || {};

  if (!providerId) {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  if (!reason) {
    throw new HttpsError("invalid-argument", "reason is required for suspension");
  }

  if (!(await verifyProviderExists(providerId))) {
    throw new HttpsError("not-found", `Provider ${providerId} not found`);
  }

  try {
    const suspensionData: Record<string, unknown> = {
      isSuspended: true,
      isOnline: false,
      availability: "offline",
      suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
      suspendedBy: adminUid,
      suspendReason: reason,
    };

    // Add suspension end date if provided
    if (until) {
      const untilDate = new Date(until);
      if (isNaN(untilDate.getTime())) {
        throw new HttpsError("invalid-argument", "Invalid 'until' date format");
      }
      suspensionData.suspendedUntil = admin.firestore.Timestamp.fromDate(untilDate);
    } else {
      suspensionData.suspendedUntil = null; // Indefinite suspension
    }

    await updateProviderAtomic(providerId, suspensionData);

    await logProviderAction(adminUid, providerId, "SUSPEND", reason, { until });
    await notifyProvider(providerId, "provider_suspended", {
      action: "suspended",
      reason,
      until: until || null,
    });

    return {
      success: true,
      providerId,
      action: "SUSPEND",
      timestamp: new Date().toISOString(),
    } as ProviderActionResult;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    logger.error(`[PROVIDER_ACTION] suspendProvider failed:`, error);
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to suspend provider"
    );
  }
});

/**
 * Unsuspend provider (isSuspended=false)
 */
export const unsuspendProvider = onCall(FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerId } = req.data || {};

  if (!providerId) {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  if (!(await verifyProviderExists(providerId))) {
    throw new HttpsError("not-found", `Provider ${providerId} not found`);
  }

  try {
    await updateProviderAtomic(providerId, {
      isSuspended: false,
      suspendedAt: admin.firestore.FieldValue.delete(),
      suspendedBy: admin.firestore.FieldValue.delete(),
      suspendedUntil: admin.firestore.FieldValue.delete(),
      suspendReason: admin.firestore.FieldValue.delete(),
    });

    await logProviderAction(adminUid, providerId, "UNSUSPEND");
    await notifyProvider(providerId, "provider_unsuspended", { action: "unsuspended" });

    return {
      success: true,
      providerId,
      action: "UNSUSPEND",
      timestamp: new Date().toISOString(),
    } as ProviderActionResult;
  } catch (error) {
    logger.error(`[PROVIDER_ACTION] unsuspendProvider failed:`, error);
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to unsuspend provider"
    );
  }
});

/**
 * Soft delete provider (mark as deleted, keep data)
 */
export const softDeleteProvider = onCall(FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerId, reason } = req.data || {};

  if (!providerId) {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  if (!(await verifyProviderExists(providerId))) {
    throw new HttpsError("not-found", `Provider ${providerId} not found`);
  }

  try {
    await updateProviderAtomic(providerId, {
      isDeleted: true,
      isVisible: false,
      isOnline: false,
      availability: "offline",
      isBanned: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: adminUid,
      deleteReason: reason || "Admin soft delete",
    });

    // Disable Firebase Auth account
    try {
      await admin.auth().updateUser(providerId, { disabled: true });
    } catch (authError) {
      logger.warn(`[PROVIDER_ACTION] Could not disable auth for ${providerId}:`, authError);
    }

    await logProviderAction(adminUid, providerId, "SOFT_DELETE", reason);
    await notifyProvider(providerId, "provider_deleted", { action: "soft_deleted", reason });

    return {
      success: true,
      providerId,
      action: "SOFT_DELETE",
      timestamp: new Date().toISOString(),
    } as ProviderActionResult;
  } catch (error) {
    logger.error(`[PROVIDER_ACTION] softDeleteProvider failed:`, error);
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to soft delete provider"
    );
  }
});

/**
 * Hard delete provider - GDPR Article 17 (Right to Erasure) purge
 *
 * This function performs a complete GDPR-compliant data deletion:
 * - Creates audit log BEFORE deletion (legal requirement)
 * - Deletes from sos_profiles, users, all sub-collections
 * - Anonymizes references in other collections (maintains data integrity)
 * - Deletes Firebase Auth account
 * - Deletes Storage files
 * - Returns detailed summary of what was deleted
 */
export const hardDeleteProvider = onCall(HARD_DELETE_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerId, confirmGdprPurge, reason } = req.data || {};

  if (!providerId) {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  if (confirmGdprPurge !== true) {
    throw new HttpsError(
      "invalid-argument",
      "confirmGdprPurge must be true to perform GDPR hard delete"
    );
  }

  // Get provider data before deletion for logging
  const userDoc = await getDb().collection("users").doc(providerId).get();
  if (!userDoc.exists) {
    throw new HttpsError("not-found", `Provider ${providerId} not found`);
  }

  const userData = userDoc.data();
  const providerEmail = userData?.email || "unknown";
  const providerName = userData?.displayName || `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() || "Unknown";
  const providerType = userData?.type || userData?.role || "unknown";

  logger.info(`[PROVIDER_ACTION] GDPR purge requested for: ${providerName} (${providerEmail})`);

  // Track what will be deleted for summary
  const deletionSummary = {
    providerId,
    deletedAt: new Date().toISOString(),
    deletedCollections: [] as string[],
    anonymizedCollections: [] as string[],
    storageDeleted: false,
    authDeleted: false,
    subCollectionsDeleted: 0,
    documentsAnonymized: 0,
  };

  // Create audit ID outside try block so it's accessible in catch
  const gdprAuditId = `gdpr_purge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    logger.info(`[PROVIDER_ACTION] Starting GDPR Article 17 hard delete for ${providerId}`);

    await getDb().collection("gdpr_audit_logs").doc(gdprAuditId).set({
      id: gdprAuditId,
      eventType: "GDPR_HARD_DELETE",
      providerId,
      providerEmailHash: Buffer.from(providerEmail).toString("base64").slice(0, 16),
      providerType,
      adminUid,
      reason: reason || "GDPR Article 17 - Admin purge request",
      status: "in_progress",
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      dataToDelete: {
        collections: ["sos_profiles", "users", "kyc_documents", "notifications"],
        subCollections: PROVIDER_SUB_COLLECTIONS,
        collectionsToAnonymize: COLLECTIONS_TO_ANONYMIZE.map((c) => c.collection),
        storageLocations: ["providers/", "profiles/", "documents/"],
        authAccount: true,
      },
      metadata: {
        providerCreatedAt: userData?.createdAt || null,
        providerCountry: userData?.country || null,
        totalCalls: userData?.totalCalls || 0,
        totalEarnings: userData?.totalEarnings || 0,
      },
    });

    logger.info(`[PROVIDER_ACTION] Created GDPR audit log ${gdprAuditId}`);

    // =========================================================================
    // STEP 1: Delete all sub-collections from sos_profiles
    // =========================================================================
    const profileRef = getDb().collection("sos_profiles").doc(providerId);
    for (const subCollection of PROVIDER_SUB_COLLECTIONS) {
      try {
        const subDocs = await profileRef.collection(subCollection).listDocuments();
        const deletePromises = subDocs.map((doc) => doc.delete());
        await Promise.all(deletePromises);
        deletionSummary.subCollectionsDeleted += subDocs.length;
        logger.info(`[PROVIDER_ACTION] Deleted ${subDocs.length} docs from sos_profiles/${providerId}/${subCollection}`);
      } catch (subError) {
        logger.warn(`[PROVIDER_ACTION] Error deleting sub-collection ${subCollection}:`, subError);
      }
    }

    // =========================================================================
    // STEP 2: Delete all sub-collections from users
    // =========================================================================
    const userRef = getDb().collection("users").doc(providerId);
    for (const subCollection of PROVIDER_SUB_COLLECTIONS) {
      try {
        const subDocs = await userRef.collection(subCollection).listDocuments();
        const deletePromises = subDocs.map((doc) => doc.delete());
        await Promise.all(deletePromises);
        deletionSummary.subCollectionsDeleted += subDocs.length;
        logger.info(`[PROVIDER_ACTION] Deleted ${subDocs.length} docs from users/${providerId}/${subCollection}`);
      } catch (subError) {
        logger.warn(`[PROVIDER_ACTION] Error deleting user sub-collection ${subCollection}:`, subError);
      }
    }

    // =========================================================================
    // STEP 3: Anonymize references in other collections (GDPR compliant)
    // We keep anonymized references to maintain data integrity for reporting
    // =========================================================================
    for (const { collection: collectionName, field, isArray } of COLLECTIONS_TO_ANONYMIZE) {
      try {
        let query: FirebaseFirestore.Query;

        if (isArray) {
          query = getDb().collection(collectionName).where(field, "array-contains", providerId);
        } else {
          query = getDb().collection(collectionName).where(field, "==", providerId);
        }

        const docs = await query.get();

        if (docs.size > 0) {
          const batch = getDb().batch();
          let count = 0;

          for (const doc of docs.docs) {
            if (isArray) {
              // Remove from array and add anonymized marker
              const participants = doc.data()[field] as string[];
              const filtered = participants.filter((p) => p !== providerId);
              filtered.push(`deleted_provider_${providerId.slice(-6)}`);
              batch.update(doc.ref, { [field]: filtered });
            } else {
              // Replace with anonymized value
              batch.update(doc.ref, {
                [field]: `deleted_provider_${providerId.slice(-6)}`,
                [`${field}_anonymized`]: true,
                [`${field}_anonymizedAt`]: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            count++;

            // Commit batch every 400 operations (Firestore limit is 500)
            if (count % 400 === 0) {
              await batch.commit();
            }
          }

          if (count % 400 !== 0) {
            await batch.commit();
          }

          deletionSummary.documentsAnonymized += count;
          if (!deletionSummary.anonymizedCollections.includes(collectionName)) {
            deletionSummary.anonymizedCollections.push(collectionName);
          }
          logger.info(`[PROVIDER_ACTION] Anonymized ${count} docs in ${collectionName}`);
        }
      } catch (anonError) {
        logger.warn(`[PROVIDER_ACTION] Error anonymizing ${collectionName}:`, anonError);
      }
    }

    // =========================================================================
    // STEP 4: Delete KYC documents
    // =========================================================================
    try {
      await getDb().collection("kyc_documents").doc(providerId).delete();
      deletionSummary.deletedCollections.push("kyc_documents");
      logger.info(`[PROVIDER_ACTION] Deleted KYC documents for ${providerId}`);
    } catch (kycError) {
      logger.warn(`[PROVIDER_ACTION] Error deleting KYC docs:`, kycError);
    }

    // =========================================================================
    // STEP 5: Delete provider notifications
    // =========================================================================
    try {
      const notificationsQuery = getDb().collection("notifications").where("userId", "==", providerId);
      const notifications = await notificationsQuery.get();
      const notifBatch = getDb().batch();
      notifications.docs.forEach((doc) => notifBatch.delete(doc.ref));
      await notifBatch.commit();
      deletionSummary.deletedCollections.push("notifications");
      logger.info(`[PROVIDER_ACTION] Deleted ${notifications.size} notifications for ${providerId}`);
    } catch (notifError) {
      logger.warn(`[PROVIDER_ACTION] Error deleting notifications:`, notifError);
    }

    // =========================================================================
    // STEP 6: Delete sos_profiles document
    // =========================================================================
    await profileRef.delete();
    deletionSummary.deletedCollections.push("sos_profiles");
    logger.info(`[PROVIDER_ACTION] Deleted sos_profiles/${providerId}`);

    // =========================================================================
    // STEP 7: Delete users document
    // =========================================================================
    await userRef.delete();
    deletionSummary.deletedCollections.push("users");
    logger.info(`[PROVIDER_ACTION] Deleted users/${providerId}`);

    // =========================================================================
    // STEP 8: Delete Firebase Auth user
    // =========================================================================
    try {
      await admin.auth().deleteUser(providerId);
      deletionSummary.authDeleted = true;
      logger.info(`[PROVIDER_ACTION] Deleted Firebase Auth user ${providerId}`);
    } catch (authError) {
      logger.warn(`[PROVIDER_ACTION] Could not delete auth user ${providerId}:`, authError);
    }

    // =========================================================================
    // STEP 9: Delete provider files from Storage
    // =========================================================================
    try {
      const bucket = admin.storage().bucket();
      await bucket.deleteFiles({ prefix: `providers/${providerId}/` });
      await bucket.deleteFiles({ prefix: `profiles/${providerId}/` });
      await bucket.deleteFiles({ prefix: `documents/${providerId}/` });
      deletionSummary.storageDeleted = true;
      logger.info(`[PROVIDER_ACTION] Deleted storage files for ${providerId}`);
    } catch (storageError) {
      logger.warn(`[PROVIDER_ACTION] Error deleting storage files:`, storageError);
    }

    // =========================================================================
    // STEP 10: Update GDPR audit log with completion status
    // =========================================================================
    await getDb().collection("gdpr_audit_logs").doc(gdprAuditId).update({
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      summary: {
        deletedCollections: deletionSummary.deletedCollections,
        anonymizedCollections: deletionSummary.anonymizedCollections,
        subCollectionsDeleted: deletionSummary.subCollectionsDeleted,
        documentsAnonymized: deletionSummary.documentsAnonymized,
        storageDeleted: deletionSummary.storageDeleted,
        authDeleted: deletionSummary.authDeleted,
      },
    });

    // Log to provider_action_logs as well (for admin dashboard)
    await logProviderAction(adminUid, providerId, "HARD_DELETE_GDPR", reason || "GDPR Article 17 purge request", {
      gdprAuditId,
      emailHash: Buffer.from(providerEmail).toString("base64").slice(0, 10) + "...",
      subCollectionsDeleted: deletionSummary.subCollectionsDeleted,
      documentsAnonymized: deletionSummary.documentsAnonymized,
      collectionsDeleted: deletionSummary.deletedCollections,
      collectionsAnonymized: deletionSummary.anonymizedCollections,
    });

    logger.info(`[PROVIDER_ACTION] GDPR Article 17 hard delete completed for ${providerId}`);

    // Return success with detailed summary
    return {
      success: true,
      providerId,
      action: "HARD_DELETE_GDPR",
      timestamp: new Date().toISOString(),
      summary: {
        providerId: deletionSummary.providerId,
        deletedAt: deletionSummary.deletedAt,
        deletedCollections: deletionSummary.deletedCollections,
        anonymizedCollections: deletionSummary.anonymizedCollections,
        storageDeleted: deletionSummary.storageDeleted,
        authDeleted: deletionSummary.authDeleted,
      },
    };
  } catch (error) {
    // Update GDPR audit log with failure status
    try {
      await getDb().collection("gdpr_audit_logs").doc(gdprAuditId).update({
        status: "failed",
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (auditUpdateError) {
      logger.error(`[PROVIDER_ACTION] Failed to update audit log:`, auditUpdateError);
    }

    logger.error(`[PROVIDER_ACTION] hardDeleteProvider failed:`, error);
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to hard delete provider"
    );
  }
});

// ============================================================================
// BULK ACTION FUNCTIONS
// ============================================================================

/**
 * Bulk hide multiple providers
 */
export const bulkHideProviders = onCall(BULK_FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerIds } = req.data || {};

  if (!Array.isArray(providerIds) || providerIds.length === 0) {
    throw new HttpsError("invalid-argument", "providerIds array is required and must not be empty");
  }

  if (providerIds.length > 100) {
    throw new HttpsError("invalid-argument", "Maximum 100 providers per bulk operation");
  }

  const results: ProviderActionResult[] = [];

  for (const providerId of providerIds) {
    try {
      if (!(await verifyProviderExists(providerId))) {
        results.push({
          success: false,
          providerId,
          action: "HIDE",
          timestamp: new Date().toISOString(),
          error: "Provider not found",
        });
        continue;
      }

      await updateProviderAtomic(providerId, {
        isVisible: false,
        hiddenAt: admin.firestore.FieldValue.serverTimestamp(),
        hiddenBy: adminUid,
      });

      await logProviderAction(adminUid, providerId, "BULK_HIDE");
      await notifyProvider(providerId, "provider_hidden", { action: "hidden", bulk: true });

      results.push({
        success: true,
        providerId,
        action: "HIDE",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      results.push({
        success: false,
        providerId,
        action: "HIDE",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    total: providerIds.length,
    successful,
    failed,
    results,
  } as BulkActionResult;
});

/**
 * Bulk block multiple providers
 */
export const bulkBlockProviders = onCall(BULK_FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerIds, reason } = req.data || {};

  if (!Array.isArray(providerIds) || providerIds.length === 0) {
    throw new HttpsError("invalid-argument", "providerIds array is required and must not be empty");
  }

  if (!reason) {
    throw new HttpsError("invalid-argument", "reason is required for blocking");
  }

  if (providerIds.length > 100) {
    throw new HttpsError("invalid-argument", "Maximum 100 providers per bulk operation");
  }

  const results: ProviderActionResult[] = [];

  for (const providerId of providerIds) {
    try {
      if (!(await verifyProviderExists(providerId))) {
        results.push({
          success: false,
          providerId,
          action: "BLOCK",
          timestamp: new Date().toISOString(),
          error: "Provider not found",
        });
        continue;
      }

      await updateProviderAtomic(providerId, {
        isBanned: true,
        isOnline: false,
        availability: "offline",
        bannedAt: admin.firestore.FieldValue.serverTimestamp(),
        bannedBy: adminUid,
        banReason: reason,
      });

      await logProviderAction(adminUid, providerId, "BULK_BLOCK", reason);
      await notifyProvider(providerId, "provider_blocked", { action: "blocked", reason, bulk: true });

      results.push({
        success: true,
        providerId,
        action: "BLOCK",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      results.push({
        success: false,
        providerId,
        action: "BLOCK",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    total: providerIds.length,
    successful,
    failed,
    results,
  } as BulkActionResult;
});

/**
 * Bulk suspend multiple providers
 */
export const bulkSuspendProviders = onCall(BULK_FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerIds, reason, until } = req.data || {};

  if (!Array.isArray(providerIds) || providerIds.length === 0) {
    throw new HttpsError("invalid-argument", "providerIds array is required and must not be empty");
  }

  if (!reason) {
    throw new HttpsError("invalid-argument", "reason is required for suspension");
  }

  if (providerIds.length > 100) {
    throw new HttpsError("invalid-argument", "Maximum 100 providers per bulk operation");
  }

  // Validate until date if provided
  let untilTimestamp: FirebaseFirestore.Timestamp | null = null;
  if (until) {
    const untilDate = new Date(until);
    if (isNaN(untilDate.getTime())) {
      throw new HttpsError("invalid-argument", "Invalid 'until' date format");
    }
    untilTimestamp = admin.firestore.Timestamp.fromDate(untilDate);
  }

  const results: ProviderActionResult[] = [];

  for (const providerId of providerIds) {
    try {
      if (!(await verifyProviderExists(providerId))) {
        results.push({
          success: false,
          providerId,
          action: "SUSPEND",
          timestamp: new Date().toISOString(),
          error: "Provider not found",
        });
        continue;
      }

      const suspensionData: Record<string, unknown> = {
        isSuspended: true,
        isOnline: false,
        availability: "offline",
        suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
        suspendedBy: adminUid,
        suspendReason: reason,
        suspendedUntil: untilTimestamp,
      };

      await updateProviderAtomic(providerId, suspensionData);

      await logProviderAction(adminUid, providerId, "BULK_SUSPEND", reason, { until });
      await notifyProvider(providerId, "provider_suspended", {
        action: "suspended",
        reason,
        until: until || null,
        bulk: true,
      });

      results.push({
        success: true,
        providerId,
        action: "SUSPEND",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      results.push({
        success: false,
        providerId,
        action: "SUSPEND",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    total: providerIds.length,
    successful,
    failed,
    results,
  } as BulkActionResult;
});

/**
 * Bulk soft delete multiple providers
 */
export const bulkDeleteProviders = onCall(BULK_FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerIds, reason } = req.data || {};

  if (!Array.isArray(providerIds) || providerIds.length === 0) {
    throw new HttpsError("invalid-argument", "providerIds array is required and must not be empty");
  }

  if (providerIds.length > 50) {
    throw new HttpsError("invalid-argument", "Maximum 50 providers per bulk delete operation");
  }

  const results: ProviderActionResult[] = [];

  for (const providerId of providerIds) {
    try {
      if (!(await verifyProviderExists(providerId))) {
        results.push({
          success: false,
          providerId,
          action: "SOFT_DELETE",
          timestamp: new Date().toISOString(),
          error: "Provider not found",
        });
        continue;
      }

      await updateProviderAtomic(providerId, {
        isDeleted: true,
        isVisible: false,
        isOnline: false,
        availability: "offline",
        isBanned: true,
        deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        deletedBy: adminUid,
        deleteReason: reason || "Bulk admin delete",
      });

      // Disable Firebase Auth account
      try {
        await admin.auth().updateUser(providerId, { disabled: true });
      } catch (authError) {
        logger.warn(`[PROVIDER_ACTION] Could not disable auth for ${providerId}:`, authError);
      }

      await logProviderAction(adminUid, providerId, "BULK_SOFT_DELETE", reason);
      await notifyProvider(providerId, "provider_deleted", {
        action: "soft_deleted",
        reason,
        bulk: true,
      });

      results.push({
        success: true,
        providerId,
        action: "SOFT_DELETE",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      results.push({
        success: false,
        providerId,
        action: "SOFT_DELETE",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    total: providerIds.length,
    successful,
    failed,
    results,
  } as BulkActionResult;
});

// ============================================================================
// BULK REVERSE ACTIONS - DISABLED TO REDUCE CLOUD RUN SERVICES
// ============================================================================
// These can be re-enabled if needed. For now, admins can unhide/unblock/unsuspend
// providers one by one using the individual functions above.

/**
 * Bulk unhide multiple providers
 * DISABLED: Use unhideProvider for individual operations
 */
/*
export const bulkUnhideProviders = onCall(BULK_FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerIds } = req.data || {};

  if (!Array.isArray(providerIds) || providerIds.length === 0) {
    throw new HttpsError("invalid-argument", "providerIds array is required and must not be empty");
  }

  if (providerIds.length > 100) {
    throw new HttpsError("invalid-argument", "Maximum 100 providers per bulk operation");
  }

  const results: ProviderActionResult[] = [];

  for (const providerId of providerIds) {
    try {
      if (!(await verifyProviderExists(providerId))) {
        results.push({
          success: false,
          providerId,
          action: "UNHIDE",
          timestamp: new Date().toISOString(),
          error: "Provider not found",
        });
        continue;
      }

      await updateProviderAtomic(providerId, {
        isVisible: true,
        hiddenAt: admin.firestore.FieldValue.delete(),
        hiddenBy: admin.firestore.FieldValue.delete(),
      });

      await logProviderAction(adminUid, providerId, "BULK_UNHIDE");
      await notifyProvider(providerId, "provider_visible", { action: "unhidden", bulk: true });

      results.push({
        success: true,
        providerId,
        action: "UNHIDE",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      results.push({
        success: false,
        providerId,
        action: "UNHIDE",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    total: providerIds.length,
    successful,
    failed,
    results,
  } as BulkActionResult;
});

// Bulk unblock multiple providers - DISABLED
export const bulkUnblockProviders = onCall(BULK_FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerIds } = req.data || {};

  if (!Array.isArray(providerIds) || providerIds.length === 0) {
    throw new HttpsError("invalid-argument", "providerIds array is required and must not be empty");
  }

  if (providerIds.length > 100) {
    throw new HttpsError("invalid-argument", "Maximum 100 providers per bulk operation");
  }

  const results: ProviderActionResult[] = [];

  for (const providerId of providerIds) {
    try {
      if (!(await verifyProviderExists(providerId))) {
        results.push({
          success: false,
          providerId,
          action: "UNBLOCK",
          timestamp: new Date().toISOString(),
          error: "Provider not found",
        });
        continue;
      }

      await updateProviderAtomic(providerId, {
        isBanned: false,
        bannedAt: admin.firestore.FieldValue.delete(),
        bannedBy: admin.firestore.FieldValue.delete(),
        banReason: admin.firestore.FieldValue.delete(),
      });

      await logProviderAction(adminUid, providerId, "BULK_UNBLOCK");
      await notifyProvider(providerId, "provider_unblocked", { action: "unblocked", bulk: true });

      results.push({
        success: true,
        providerId,
        action: "UNBLOCK",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      results.push({
        success: false,
        providerId,
        action: "UNBLOCK",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    total: providerIds.length,
    successful,
    failed,
    results,
  } as BulkActionResult;
});

// Bulk unsuspend multiple providers - DISABLED
export const bulkUnsuspendProviders = onCall(BULK_FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerIds } = req.data || {};

  if (!Array.isArray(providerIds) || providerIds.length === 0) {
    throw new HttpsError("invalid-argument", "providerIds array is required and must not be empty");
  }

  if (providerIds.length > 100) {
    throw new HttpsError("invalid-argument", "Maximum 100 providers per bulk operation");
  }

  const results: ProviderActionResult[] = [];

  for (const providerId of providerIds) {
    try {
      if (!(await verifyProviderExists(providerId))) {
        results.push({
          success: false,
          providerId,
          action: "UNSUSPEND",
          timestamp: new Date().toISOString(),
          error: "Provider not found",
        });
        continue;
      }

      await updateProviderAtomic(providerId, {
        isSuspended: false,
        suspendedAt: admin.firestore.FieldValue.delete(),
        suspendedBy: admin.firestore.FieldValue.delete(),
        suspendReason: admin.firestore.FieldValue.delete(),
        suspendedUntil: admin.firestore.FieldValue.delete(),
      });

      await logProviderAction(adminUid, providerId, "BULK_UNSUSPEND");
      await notifyProvider(providerId, "provider_unsuspended", { action: "unsuspended", bulk: true });

      results.push({
        success: true,
        providerId,
        action: "UNSUSPEND",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      results.push({
        success: false,
        providerId,
        action: "UNSUSPEND",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    success: failed === 0,
    total: providerIds.length,
    successful,
    failed,
    results,
  } as BulkActionResult;
});
*/

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get provider action logs for a specific provider
 */
export const getProviderActionLogs = onCall(FUNCTION_CONFIG, async (req) => {
  const adminUid = assertAdmin(req);
  const { providerId, limit: queryLimit = 50 } = req.data || {};

  if (!providerId) {
    throw new HttpsError("invalid-argument", "providerId is required");
  }

  try {
    const logsSnapshot = await getDb()
      .collection("provider_action_logs")
      .where("providerId", "==", providerId)
      .orderBy("timestamp", "desc")
      .limit(Math.min(queryLimit, 200))
      .get();

    const logs = logsSnapshot.docs.map((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt,
      };
    });

    // Log this access
    await logProviderAction(adminUid, providerId, "VIEW_ACTION_LOGS", undefined, {
      logsRetrieved: logs.length,
    });

    return {
      success: true,
      providerId,
      logs,
      total: logs.length,
    };
  } catch (error) {
    logger.error(`[PROVIDER_ACTION] getProviderActionLogs failed:`, error);
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to get action logs"
    );
  }
});

/**
 * Get all action logs (admin dashboard)
 */
export const getAllProviderActionLogs = onCall(FUNCTION_CONFIG, async (req) => {
  assertAdmin(req);
  const { limit: queryLimit = 100, action, startAfter } = req.data || {};

  try {
    let query: FirebaseFirestore.Query = getDb()
      .collection("provider_action_logs")
      .orderBy("timestamp", "desc");

    if (action) {
      query = query.where("action", "==", action);
    }

    if (startAfter) {
      const startDoc = await getDb().collection("provider_action_logs").doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }

    const logsSnapshot = await query.limit(Math.min(queryLimit, 500)).get();

    const logs = logsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || data.createdAt,
      };
    });

    return {
      success: true,
      logs,
      total: logs.length,
      lastId: logs.length > 0 ? logs[logs.length - 1].id : null,
    };
  } catch (error) {
    logger.error(`[PROVIDER_ACTION] getAllProviderActionLogs failed:`, error);
    throw new HttpsError(
      "internal",
      error instanceof Error ? error.message : "Failed to get action logs"
    );
  }
});

// ============================================================================
// SET PROVIDER BADGE (Featured)
// ============================================================================

/**
 * Attribue ou retire le badge "Recommandé" à un prestataire.
 * Seuls les admins peuvent appeler cette fonction.
 * Met à jour sos_profiles ET users (dénormalisation pour la liste admin).
 */
export const setProviderBadge = onCall(
  { ...FUNCTION_CONFIG, timeoutSeconds: 30 },
  async (req) => {
    const adminUid = assertAdmin(req);

    const { providerId, isFeatured } = req.data as {
      providerId: string;
      isFeatured: boolean;
    };

    if (!providerId || typeof isFeatured !== "boolean") {
      throw new HttpsError(
        "invalid-argument",
        "providerId (string) et isFeatured (boolean) sont requis"
      );
    }

    const db = getDb();
    const profileRef = db.collection("sos_profiles").doc(providerId);
    const userRef = db.collection("users").doc(providerId);

    // Vérifier que l'utilisateur existe (users est obligatoire)
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new HttpsError("not-found", `Utilisateur introuvable : ${providerId}`);
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const batch = db.batch();

    // Toujours mettre à jour users
    batch.update(userRef, {
      isFeatured,
      updatedAt: now,
    });

    // Mettre à jour sos_profiles seulement si le document existe (prestataires uniquement)
    const profileSnap = await profileRef.get();
    if (profileSnap.exists) {
      batch.update(profileRef, {
        isFeatured,
        featuredAt: isFeatured ? now : null,
        featuredBy: isFeatured ? adminUid : null,
        updatedAt: now,
      });
    }

    await batch.commit();

    // Log de l'action
    await logProviderAction(
      adminUid,
      providerId,
      isFeatured ? "badge_granted" : "badge_removed",
      undefined,
      { isFeatured }
    );

    logger.info(
      `[PROVIDER_BADGE] ${isFeatured ? "Attribué" : "Retiré"} pour ${providerId} par ${adminUid}`
    );

    return {
      success: true,
      providerId,
      isFeatured,
      timestamp: new Date().toISOString(),
    };
  }
);

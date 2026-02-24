/**
 * =============================================================================
 * PROVIDER PROFILE VALIDATION WORKFLOW
 * =============================================================================
 *
 * Cloud Functions for managing the provider profile validation workflow.
 * This module handles the complete lifecycle of profile validation from
 * submission to approval/rejection.
 *
 * VALIDATION QUEUE SCHEMA (validation_queue collection):
 * - providerId: string - Reference to sos_profiles document
 * - providerName: string - Provider's display name
 * - providerType: 'lawyer' | 'expat' - Type of provider
 * - submittedAt: Timestamp - When validation was requested
 * - status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested'
 * - assignedTo: string | null - Admin UID assigned to review
 * - assignedAt: Timestamp | null - When assigned
 * - decision: 'approved' | 'rejected' | 'changes_requested' | null
 * - decisionBy: string | null - Admin UID who made decision
 * - decisionAt: Timestamp | null - When decision was made
 * - decisionReason: string | null - Reason for decision
 * - requestedChanges: string[] - List of requested changes
 * - changeHistory: ChangeHistoryEntry[] - History of all changes
 *
 * SUB-COLLECTION: validation_queue/{validationId}/validation_history
 * - Stores audit trail of all actions taken on the validation request
 *
 * CALLABLE FUNCTIONS:
 * - submitForValidation: Creates new validation request
 * - assignValidation: Assigns validation to admin
 * - approveProfile: Approves profile and sets isApproved=true, isVisible=true
 * - rejectProfile: Rejects profile with reason
 * - requestChanges: Requests modifications from provider
 * - getValidationQueue: Gets pending validations with filters
 * - getValidationHistory: Gets validation history for a provider
 *
 * TRIGGERS:
 * - onValidationCreated: Notifies admins of new validation request
 * - onValidationDecision: Notifies provider and updates sos_profiles
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { logError } from "../utils/logs/logError";

// Lazy initialization to avoid issues during deployment analysis
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
// TYPES & INTERFACES
// ============================================================================

type ValidationStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested';
type ValidationDecision = 'approved' | 'rejected' | 'changes_requested';
type ProviderType = 'lawyer' | 'expat';

interface ChangeHistoryEntry {
  action: string;
  performedBy: string;
  performedAt: admin.firestore.Timestamp;
  details?: Record<string, unknown>;
}

interface ValidationQueueDocument {
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerType: ProviderType;
  submittedAt: admin.firestore.Timestamp;
  status: ValidationStatus;
  assignedTo: string | null;
  assignedAt: admin.firestore.Timestamp | null;
  decision: ValidationDecision | null;
  decisionBy: string | null;
  decisionAt: admin.firestore.Timestamp | null;
  decisionReason: string | null;
  requestedChanges: string[];
  changeHistory: ChangeHistoryEntry[];
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

interface ValidationHistoryEntry {
  action: string;
  performedBy: string;
  performedByEmail?: string;
  performedAt: admin.firestore.Timestamp;
  previousStatus?: ValidationStatus;
  newStatus?: ValidationStatus;
  details?: Record<string, unknown>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Validates that the caller has admin privileges
 * Checks both claims.admin (boolean) and claims.role === 'admin' for compatibility
 */
function assertAdmin(ctx: any): string {
  const uid = ctx?.auth?.uid;
  const claims = ctx?.auth?.token;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  // Check both admin claim formats for compatibility
  const isAdmin = claims?.admin === true || claims?.role === 'admin';
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Admin privileges required.");
  }

  return uid;
}

/**
 * Validates that the caller is authenticated
 */
function assertAuthenticated(ctx: any): string {
  const uid = ctx?.auth?.uid;

  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }

  return uid;
}

/**
 * Creates a validation history entry in the sub-collection
 */
async function createHistoryEntry(
  validationId: string,
  entry: Omit<ValidationHistoryEntry, 'performedAt'>
): Promise<void> {
  const db = getDb();
  await db
    .collection("validation_queue")
    .doc(validationId)
    .collection("validation_history")
    .add({
      ...entry,
      performedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}

/**
 * Sends notification via message_events system
 */
async function sendNotification(
  userId: string,
  eventId: string,
  context: Record<string, unknown>
): Promise<void> {
  const db = getDb();
  try {
    // Fetch user data for locale
    const userDoc = await db.collection("users").doc(userId).get();
    const userData = userDoc.data();
    const locale = userData?.preferredLanguage || "fr";

    const userContext = typeof context.user === 'object' && context.user !== null ? context.user : {};
    await db.collection("message_events").add({
      eventId,
      uid: userId,
      locale,
      context: {
        ...context,
        user: {
          email: userData?.email,
          preferredLanguage: locale,
          ...userContext,
        },
      },
      createdAt: new Date().toISOString(),
      source: "profileValidation",
    });
  } catch (error) {
    console.error(`[profileValidation] Failed to send notification to ${userId}:`, error);
    // Don't throw - notification failure shouldn't break the workflow
  }
}

// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================

/**
 * Submit provider profile for validation
 * Called by provider after completing their profile
 */
export const submitForValidation = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60,
  },
  async (req) => {
    const db = getDb();
    const uid = assertAuthenticated(req);
    const { providerId } = req.data || {};

    // If no providerId provided, use the caller's UID
    const targetProviderId = providerId || uid;

    // Verify the caller has permission to submit this profile
    if (targetProviderId !== uid) {
      // Only admins can submit on behalf of others
      assertAdmin(req);
    }

    console.log(`[submitForValidation] Processing submission for provider: ${targetProviderId}`);

    // Fetch provider profile
    const profileRef = db.collection("sos_profiles").doc(targetProviderId);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      throw new HttpsError("not-found", "Provider profile not found.");
    }

    const profileData = profileDoc.data()!;
    const providerType = profileData.type || profileData.role;

    if (providerType !== "lawyer" && providerType !== "expat") {
      throw new HttpsError("invalid-argument", "Only lawyer or expat profiles can be submitted for validation.");
    }

    // Check if there's already a pending validation
    const existingValidation = await db
      .collection("validation_queue")
      .where("providerId", "==", targetProviderId)
      .where("status", "in", ["pending", "in_review"])
      .limit(1)
      .get();

    if (!existingValidation.empty) {
      throw new HttpsError("already-exists", "A validation request is already pending for this profile.");
    }

    // Create validation request using transaction
    const validationRef = db.collection("validation_queue").doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    await db.runTransaction(async (transaction) => {
      // Create validation queue entry
      const validationData: Omit<ValidationQueueDocument, 'submittedAt' | 'createdAt' | 'updatedAt'> & {
        submittedAt: admin.firestore.FieldValue;
        createdAt: admin.firestore.FieldValue;
        updatedAt: admin.firestore.FieldValue;
      } = {
        providerId: targetProviderId,
        providerName: profileData.fullName || profileData.firstName || profileData.displayName || "Unknown",
        providerEmail: profileData.email || "",
        providerType: providerType as ProviderType,
        submittedAt: now,
        status: "pending",
        assignedTo: null,
        assignedAt: null,
        decision: null,
        decisionBy: null,
        decisionAt: null,
        decisionReason: null,
        requestedChanges: [],
        changeHistory: [],
        createdAt: now,
        updatedAt: now,
      };

      transaction.set(validationRef, validationData);

      // Update provider profile status
      transaction.update(profileRef, {
        validationStatus: "pending",
        validationSubmittedAt: now,
        validationId: validationRef.id,
        updatedAt: now,
      });
    });

    // Create initial history entry (outside transaction)
    await createHistoryEntry(validationRef.id, {
      action: "submitted",
      performedBy: uid,
      details: {
        providerId: targetProviderId,
        providerType,
      },
    });

    console.log(`[submitForValidation] Validation request created: ${validationRef.id}`);

    return {
      success: true,
      validationId: validationRef.id,
      message: "Profile submitted for validation successfully.",
    };
  }
);

/**
 * Assign validation request to an admin for review
 */
export const assignValidation = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60,
  },
  async (req) => {
    const db = getDb();
    const adminUid = assertAdmin(req);
    const { validationId, assignToUid } = req.data || {};

    if (!validationId) {
      throw new HttpsError("invalid-argument", "validationId is required.");
    }

    const targetAdminUid = assignToUid || adminUid;

    console.log(`[assignValidation] Assigning ${validationId} to admin: ${targetAdminUid}`);

    const validationRef = db.collection("validation_queue").doc(validationId);

    await db.runTransaction(async (transaction) => {
      const validationDoc = await transaction.get(validationRef);

      if (!validationDoc.exists) {
        throw new HttpsError("not-found", "Validation request not found.");
      }

      const validationData = validationDoc.data() as ValidationQueueDocument;

      if (validationData.status !== "pending" && validationData.status !== "in_review") {
        throw new HttpsError("failed-precondition", `Cannot assign validation with status: ${validationData.status}`);
      }

      const previousStatus = validationData.status;
      const now = admin.firestore.FieldValue.serverTimestamp();

      transaction.update(validationRef, {
        assignedTo: targetAdminUid,
        assignedAt: now,
        status: "in_review",
        updatedAt: now,
        changeHistory: admin.firestore.FieldValue.arrayUnion({
          action: "assigned",
          performedBy: adminUid,
          performedAt: new Date(),
          details: { assignedTo: targetAdminUid, previousStatus },
        }),
      });
    });

    // Create history entry
    await createHistoryEntry(validationId, {
      action: "assigned",
      performedBy: adminUid,
      previousStatus: "pending",
      newStatus: "in_review",
      details: { assignedTo: targetAdminUid },
    });

    console.log(`[assignValidation] Validation ${validationId} assigned to ${targetAdminUid}`);

    return {
      success: true,
      message: `Validation assigned to admin ${targetAdminUid}.`,
    };
  }
);

/**
 * Approve provider profile
 * Sets isApproved=true and isVisible=true on sos_profiles
 */
export const approveProfile = onCall(
  {
    region: "europe-west3",
    memory: "512MiB",
    cpu: 0.083,
    minInstances: 0,
    timeoutSeconds: 120,
  },
  async (req) => {
    const db = getDb();
    const adminUid = assertAdmin(req);
    const { validationId, reason } = req.data || {};

    if (!validationId) {
      throw new HttpsError("invalid-argument", "validationId is required.");
    }

    console.log(`[approveProfile] Approving validation: ${validationId}`);

    const validationRef = db.collection("validation_queue").doc(validationId);
    let providerId: string;
    let providerType: string;

    await db.runTransaction(async (transaction) => {
      const validationDoc = await transaction.get(validationRef);

      if (!validationDoc.exists) {
        throw new HttpsError("not-found", "Validation request not found.");
      }

      const validationData = validationDoc.data() as ValidationQueueDocument;

      if (validationData.status === "approved") {
        throw new HttpsError("failed-precondition", "Profile is already approved.");
      }

      if (validationData.status !== "in_review" && validationData.status !== "pending") {
        throw new HttpsError(
          "failed-precondition",
          `Cannot approve validation with status: ${validationData.status}`
        );
      }

      providerId = validationData.providerId;
      providerType = validationData.providerType;
      const previousStatus = validationData.status;
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Update validation queue
      transaction.update(validationRef, {
        status: "approved",
        decision: "approved",
        decisionBy: adminUid,
        decisionAt: now,
        decisionReason: reason || "Profile meets all requirements.",
        updatedAt: now,
        changeHistory: admin.firestore.FieldValue.arrayUnion({
          action: "approved",
          performedBy: adminUid,
          performedAt: new Date(),
          details: { reason, previousStatus },
        }),
      });

      // Update sos_profiles
      const profileRef = db.collection("sos_profiles").doc(providerId);
      transaction.update(profileRef, {
        isApproved: true,
        isVisible: true,
        validationStatus: "approved",
        validationDecisionAt: now,
        validationDecisionBy: adminUid,
        approvedAt: now,
        approvedBy: adminUid,
        updatedAt: now,
      });

      // Update type-specific collection (lawyers or expats)
      const collectionName = providerType === "lawyer" ? "lawyers" : "expats";
      const typeRef = db.collection(collectionName).doc(providerId);
      transaction.set(
        typeRef,
        {
          isApproved: true,
          isVisible: true,
          validationStatus: "approved",
          approvedAt: now,
          approvedBy: adminUid,
          updatedAt: now,
        },
        { merge: true }
      );
    });

    // Create history entry
    await createHistoryEntry(validationId, {
      action: "approved",
      performedBy: adminUid,
      previousStatus: "in_review",
      newStatus: "approved",
      details: { reason },
    });

    // Create audit log
    await db.collection("audit_logs").add({
      action: "profile_approved",
      resourceType: "sos_profiles",
      resourceId: providerId!,
      validationId,
      performedBy: adminUid,
      reason: reason || "Profile meets all requirements.",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[approveProfile] Profile ${providerId!} approved by ${adminUid}`);

    return {
      success: true,
      message: "Profile approved successfully. Provider is now visible on the platform.",
      providerId: providerId!,
    };
  }
);

/**
 * Reject provider profile
 */
export const rejectProfile = onCall(
  {
    region: "europe-west3",
    memory: "512MiB",
    cpu: 0.083,
    minInstances: 0,
    timeoutSeconds: 120,
  },
  async (req) => {
    const db = getDb();
    const adminUid = assertAdmin(req);
    const { validationId, reason } = req.data || {};

    if (!validationId) {
      throw new HttpsError("invalid-argument", "validationId is required.");
    }

    if (!reason || reason.trim().length < 10) {
      throw new HttpsError("invalid-argument", "A detailed reason (at least 10 characters) is required for rejection.");
    }

    console.log(`[rejectProfile] Rejecting validation: ${validationId}`);

    const validationRef = db.collection("validation_queue").doc(validationId);
    let providerId: string;

    await db.runTransaction(async (transaction) => {
      const validationDoc = await transaction.get(validationRef);

      if (!validationDoc.exists) {
        throw new HttpsError("not-found", "Validation request not found.");
      }

      const validationData = validationDoc.data() as ValidationQueueDocument;

      if (validationData.status === "rejected") {
        throw new HttpsError("failed-precondition", "Profile is already rejected.");
      }

      if (validationData.status === "approved") {
        throw new HttpsError("failed-precondition", "Cannot reject an approved profile. Use a different process.");
      }

      providerId = validationData.providerId;
      const previousStatus = validationData.status;
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Update validation queue
      transaction.update(validationRef, {
        status: "rejected",
        decision: "rejected",
        decisionBy: adminUid,
        decisionAt: now,
        decisionReason: reason,
        updatedAt: now,
        changeHistory: admin.firestore.FieldValue.arrayUnion({
          action: "rejected",
          performedBy: adminUid,
          performedAt: new Date(),
          details: { reason, previousStatus },
        }),
      });

      // Update sos_profiles
      const profileRef = db.collection("sos_profiles").doc(providerId);
      transaction.update(profileRef, {
        isApproved: false,
        isVisible: false,
        validationStatus: "rejected",
        validationDecisionAt: now,
        validationDecisionBy: adminUid,
        validationRejectionReason: reason,
        updatedAt: now,
      });
    });

    // Create history entry
    await createHistoryEntry(validationId, {
      action: "rejected",
      performedBy: adminUid,
      previousStatus: "in_review",
      newStatus: "rejected",
      details: { reason },
    });

    // Create audit log
    await db.collection("audit_logs").add({
      action: "profile_rejected",
      resourceType: "sos_profiles",
      resourceId: providerId!,
      validationId,
      performedBy: adminUid,
      reason,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[rejectProfile] Profile ${providerId!} rejected by ${adminUid}`);

    return {
      success: true,
      message: "Profile rejected. Provider has been notified.",
      providerId: providerId!,
    };
  }
);

/**
 * Request changes to provider profile
 * FIX: Updated to accept both string[] and { field, message }[] formats from frontend
 */
export const requestChanges = onCall(
  {
    region: "europe-west3",
    memory: "512MiB",
    cpu: 0.083,
    minInstances: 0,
    timeoutSeconds: 120,
  },
  async (req) => {
    const db = getDb();
    const adminUid = assertAdmin(req);
    const { validationId, changes } = req.data || {};

    if (!validationId) {
      throw new HttpsError("invalid-argument", "validationId is required.");
    }

    if (!Array.isArray(changes) || changes.length === 0) {
      throw new HttpsError("invalid-argument", "At least one change must be specified.");
    }

    // FIX: Accept both string[] and { field, message }[] formats
    const validChanges: string[] = [];
    for (const change of changes) {
      if (typeof change === "string" && change.trim().length > 0) {
        // Direct string format
        validChanges.push(change.trim());
      } else if (typeof change === "object" && change !== null) {
        // Object format from frontend: { field: string, message: string }
        const changeObj = change as { field?: string; message?: string };
        if (changeObj.message && changeObj.message.trim().length > 0) {
          const fieldLabel = changeObj.field ? `[${changeObj.field}] ` : "";
          validChanges.push(`${fieldLabel}${changeObj.message.trim()}`);
        }
      }
    }

    if (validChanges.length === 0) {
      throw new HttpsError("invalid-argument", "At least one valid change description is required.");
    }

    console.log(`[requestChanges] Requesting changes for validation: ${validationId}`);

    const validationRef = db.collection("validation_queue").doc(validationId);
    let providerId: string;

    await db.runTransaction(async (transaction) => {
      const validationDoc = await transaction.get(validationRef);

      if (!validationDoc.exists) {
        throw new HttpsError("not-found", "Validation request not found.");
      }

      const validationData = validationDoc.data() as ValidationQueueDocument;

      if (validationData.status === "approved" || validationData.status === "rejected") {
        throw new HttpsError(
          "failed-precondition",
          `Cannot request changes for validation with status: ${validationData.status}`
        );
      }

      providerId = validationData.providerId;
      const previousStatus = validationData.status;
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Update validation queue
      transaction.update(validationRef, {
        status: "changes_requested",
        decision: "changes_requested",
        decisionBy: adminUid,
        decisionAt: now,
        decisionReason: `Changes requested: ${validChanges.join("; ")}`,
        requestedChanges: validChanges,
        updatedAt: now,
        changeHistory: admin.firestore.FieldValue.arrayUnion({
          action: "changes_requested",
          performedBy: adminUid,
          performedAt: new Date(),
          details: { changes: validChanges, previousStatus },
        }),
      });

      // Update sos_profiles
      const profileRef = db.collection("sos_profiles").doc(providerId);
      transaction.update(profileRef, {
        validationStatus: "changes_requested",
        validationDecisionAt: now,
        validationDecisionBy: adminUid,
        validationRequestedChanges: validChanges,
        updatedAt: now,
      });
    });

    // Create history entry
    await createHistoryEntry(validationId, {
      action: "changes_requested",
      performedBy: adminUid,
      previousStatus: "in_review",
      newStatus: "changes_requested",
      details: { changes: validChanges },
    });

    // Create audit log
    await db.collection("audit_logs").add({
      action: "profile_changes_requested",
      resourceType: "sos_profiles",
      resourceId: providerId!,
      validationId,
      performedBy: adminUid,
      requestedChanges: validChanges,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[requestChanges] Changes requested for profile ${providerId!}`);

    return {
      success: true,
      message: "Change request sent to provider.",
      providerId: providerId!,
      requestedChanges: validChanges,
    };
  }
);

/**
 * Get validation queue with optional filters
 * FIX: Updated to match frontend expected format
 * OPTIMIZATION: Batch fetch profiles and admin data to avoid N+1 queries
 */
export const getValidationQueue = onCall(
  {
    region: "europe-west3",
    memory: "512MiB",
    cpu: 0.083,
    minInstances: 0,
    timeoutSeconds: 120,
  },
  async (req) => {
    const db = getDb();
    assertAdmin(req);

    // FIX: Accept both flat params and filters object from frontend
    const rawData = req.data || {};
    const filters = rawData.filters || rawData;
    const {
      status,
      providerType,
      assignedTo
    } = filters;
    const queryLimit = rawData.limit || 50;
    const offset = rawData.offset || 0;

    console.log(`[getValidationQueue] Fetching queue with filters:`, { status, providerType, assignedTo });

    let query: admin.firestore.Query = db.collection("validation_queue");

    // Apply filters
    if (status && status !== 'all') {
      if (Array.isArray(status)) {
        query = query.where("status", "in", status);
      } else {
        query = query.where("status", "==", status);
      }
    }

    if (providerType && providerType !== 'all') {
      query = query.where("providerType", "==", providerType);
    }

    // FIX: Handle 'unassigned' special filter value
    if (assignedTo) {
      if (assignedTo === 'unassigned') {
        query = query.where("assignedTo", "==", null);
      } else {
        query = query.where("assignedTo", "==", assignedTo);
      }
    }

    // Order by submission date and apply pagination
    query = query.orderBy("submittedAt", "desc").offset(offset).limit(queryLimit);

    const snapshot = await query.get();

    // OPTIMIZATION: Batch fetch all profiles and admins upfront to avoid N+1 queries
    // Collect unique IDs
    const providerIds = new Set<string>();
    const adminIds = new Set<string>();

    snapshot.docs.forEach((doc) => {
      const data = doc.data();
      if (data.providerId) providerIds.add(data.providerId);
      if (data.assignedTo) adminIds.add(data.assignedTo);
    });

    // Batch fetch all provider profiles (max 10 per getAll call in Firestore)
    const profilesMap = new Map<string, Record<string, unknown>>();
    if (providerIds.size > 0) {
      const providerIdArray = Array.from(providerIds);
      // Split into chunks of 10 for getAll (Firestore limit)
      for (let i = 0; i < providerIdArray.length; i += 10) {
        const chunk = providerIdArray.slice(i, i + 10);
        const profileRefs = chunk.map(id => db.collection("sos_profiles").doc(id));
        try {
          const profileDocs = await db.getAll(...profileRefs);
          profileDocs.forEach((doc) => {
            if (doc.exists) {
              profilesMap.set(doc.id, doc.data() || {});
            }
          });
        } catch (err) {
          console.warn(`[getValidationQueue] Batch profile fetch error:`, err);
        }
      }
    }

    // Batch fetch all admin users
    const adminsMap = new Map<string, { displayName?: string; email?: string }>();
    if (adminIds.size > 0) {
      const adminIdArray = Array.from(adminIds);
      for (let i = 0; i < adminIdArray.length; i += 10) {
        const chunk = adminIdArray.slice(i, i + 10);
        const adminRefs = chunk.map(id => db.collection("users").doc(id));
        try {
          const adminDocs = await db.getAll(...adminRefs);
          adminDocs.forEach((doc) => {
            if (doc.exists) {
              const data = doc.data();
              adminsMap.set(doc.id, {
                displayName: data?.displayName,
                email: data?.email,
              });
            }
          });
        } catch (err) {
          console.warn(`[getValidationQueue] Batch admin fetch error:`, err);
        }
      }
    }

    // OPTIMIZATION: Fetch validation histories in parallel for all docs
    const historyPromises = snapshot.docs.map(async (doc) => {
      try {
        const historySnapshot = await doc.ref
          .collection("validation_history")
          .orderBy("performedAt", "desc")
          .limit(20)
          .get();
        return {
          docId: doc.id,
          history: historySnapshot.docs.map((hDoc) => {
            const hData = hDoc.data();
            return {
              action: hData.action,
              by: hData.performedBy,
              byName: hData.performedByEmail || hData.performedBy,
              at: hData.performedAt,
              reason: hData.details?.reason || hData.details?.changes?.join(", "),
            };
          }),
        };
      } catch {
        return { docId: doc.id, history: [] };
      }
    });

    const historiesResults = await Promise.all(historyPromises);
    const historiesMap = new Map(historiesResults.map(r => [r.docId, r.history]));

    // Build validation items using pre-fetched data (no additional queries)
    const validationItems = snapshot.docs.map((doc) => {
      const data = doc.data();
      const profileData = profilesMap.get(data.providerId) || {};
      const adminData = data.assignedTo ? adminsMap.get(data.assignedTo) : null;
      const validationHistory = historiesMap.get(doc.id) || [];

      // Get admin name from pre-fetched data
      const assignedToName = adminData
        ? (adminData.displayName || adminData.email || data.assignedTo)
        : null;

      // Return data in format expected by frontend ValidationItem interface
      return {
        id: doc.id,
        providerId: data.providerId,
        providerName: data.providerName || profileData.fullName || profileData.displayName || "Unknown",
        providerEmail: data.providerEmail || profileData.email || "",
        providerPhone: profileData.phone || profileData.phoneNumber || undefined,
        providerType: data.providerType,
        profilePhoto: profileData.photoURL || profileData.profilePhoto || profileData.avatar || undefined,
        bio: profileData.bio || profileData.description || undefined,
        specializations: profileData.specializations || profileData.expertise || [],
        languages: profileData.languages || profileData.spokenLanguages || [],
        country: profileData.country || profileData.currentCountry || undefined,
        city: profileData.city || undefined,
        yearsExperience: profileData.yearsExperience || profileData.experience || undefined,
        barAssociation: profileData.barAssociation || profileData.barreau || undefined,
        documents: profileData.documents || [],
        kycDocuments: {
          idDocument: profileData.idDocumentUrl || profileData.kycIdDocument || undefined,
          proofOfAddress: profileData.proofOfAddressUrl || profileData.kycProofOfAddress || undefined,
          professionalLicense: profileData.professionalLicenseUrl || profileData.kycProfessionalLicense || undefined,
        },
        submittedAt: data.submittedAt,
        status: data.status,
        assignedTo: data.assignedTo,
        assignedToName,
        assignedAt: data.assignedAt,
        reviewNotes: data.decisionReason,
        requestedChanges: data.requestedChanges?.map((change: string, _idx: number) => ({
          field: "other",
          message: change,
          requestedAt: data.decisionAt || data.updatedAt,
        })) || [],
        validationHistory,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    });

    // OPTIMIZATION: Fetch all counts in parallel
    const countPromises = ['pending', 'in_review', 'approved', 'rejected', 'changes_requested'].map(async (s) => {
      const countSnapshot = await db
        .collection("validation_queue")
        .where("status", "==", s)
        .count()
        .get();
      return [s, countSnapshot.data().count];
    });

    // Get today's approved/rejected counts in parallel with status counts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [counts, approvedTodayResult, rejectedTodayResult] = await Promise.all([
      Promise.all(countPromises).then(results => Object.fromEntries(results)),
      db.collection("validation_queue")
        .where("status", "==", "approved")
        .where("decisionAt", ">=", todayStart)
        .count()
        .get()
        .then(snap => snap.data().count)
        .catch(() => 0),
      db.collection("validation_queue")
        .where("status", "==", "rejected")
        .where("decisionAt", ">=", todayStart)
        .count()
        .get()
        .then(snap => snap.data().count)
        .catch(() => 0),
    ]);

    // Return data in format expected by frontend
    return {
      success: true,
      items: validationItems,
      stats: {
        pending: counts.pending || 0,
        inReview: counts.in_review || 0,
        approvedToday: approvedTodayResult,
        rejectedToday: rejectedTodayResult,
      },
      // Also include legacy format for backward compatibility
      validations: validationItems,
      count: validationItems.length,
      totalByStatus: counts,
    };
  }
);

/**
 * Get validation history for a specific provider
 */
export const getValidationHistory = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60,
  },
  async (req) => {
    const db = getDb();
    const uid = assertAuthenticated(req);
    const { providerId } = req.data || {};

    const targetProviderId = providerId || uid;

    // Non-admins can only view their own history
    if (targetProviderId !== uid) {
      assertAdmin(req);
    }

    console.log(`[getValidationHistory] Fetching history for provider: ${targetProviderId}`);

    // Get all validation requests for this provider
    const validationsSnapshot = await db
      .collection("validation_queue")
      .where("providerId", "==", targetProviderId)
      .orderBy("submittedAt", "desc")
      .get();

    const history = await Promise.all(
      validationsSnapshot.docs.map(async (doc) => {
        const data = doc.data();

        // Get sub-collection history
        const historySnapshot = await doc.ref
          .collection("validation_history")
          .orderBy("performedAt", "desc")
          .get();

        const historyEntries = historySnapshot.docs.map((hDoc) => {
          const hData = hDoc.data();
          return {
            id: hDoc.id,
            ...hData,
            performedAt: hData.performedAt?.toDate?.()?.toISOString() || null,
          };
        });

        return {
          id: doc.id,
          ...data,
          submittedAt: data.submittedAt?.toDate?.()?.toISOString() || null,
          assignedAt: data.assignedAt?.toDate?.()?.toISOString() || null,
          decisionAt: data.decisionAt?.toDate?.()?.toISOString() || null,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
          historyEntries,
        };
      })
    );

    return {
      success: true,
      providerId: targetProviderId,
      validations: history,
      count: history.length,
    };
  }
);

// ============================================================================
// FIRESTORE TRIGGERS
// ============================================================================

/**
 * Trigger: When a new validation request is created
 * Notifies all admins about the new validation request
 */
export const onValidationCreated = onDocumentCreated(
  {
    document: "validation_queue/{validationId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const db = getDb();
    const validationId = event.params.validationId;
    const validationData = event.data?.data() as ValidationQueueDocument | undefined;

    if (!validationData) {
      console.warn(`[onValidationCreated] No data for validation ${validationId}`);
      return;
    }

    console.log(`[onValidationCreated] New validation request: ${validationId}`);

    try {
      // Get all admin users
      const adminsSnapshot = await db
        .collection("users")
        .where("isAdmin", "==", true)
        .get();

      if (adminsSnapshot.empty) {
        console.warn("[onValidationCreated] No admin users found to notify");
        return;
      }

      // Create notification for each admin
      const notifications = adminsSnapshot.docs.map((adminDoc) => {
        return sendNotification(adminDoc.id, "admin_new_validation", {
          validationId,
          providerId: validationData.providerId,
          providerName: validationData.providerName,
          providerType: validationData.providerType,
          submittedAt: validationData.submittedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });
      });

      await Promise.all(notifications);

      console.log(`[onValidationCreated] Notified ${adminsSnapshot.size} admins`);

      // Also create an in-app notification
      await db.collection("admin_notifications").add({
        type: "new_validation",
        validationId,
        providerId: validationData.providerId,
        providerName: validationData.providerName,
        providerType: validationData.providerType,
        message: `New ${validationData.providerType} profile submitted for validation: ${validationData.providerName}`,
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (error) {
      await logError("onValidationCreated", error);
      console.error(`[onValidationCreated] Error processing validation ${validationId}:`, error);
    }
  }
);

/**
 * Trigger: When a validation decision is made
 * Notifies provider and updates sos_profiles accordingly
 */
export const onValidationDecision = onDocumentUpdated(
  {
    document: "validation_queue/{validationId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const db = getDb();
    const validationId = event.params.validationId;
    const beforeData = event.data?.before.data() as ValidationQueueDocument | undefined;
    const afterData = event.data?.after.data() as ValidationQueueDocument | undefined;

    if (!beforeData || !afterData) {
      console.warn(`[onValidationDecision] Missing data for validation ${validationId}`);
      return;
    }

    // Only process if status changed to a decision state
    const decisionStates: ValidationStatus[] = ["approved", "rejected", "changes_requested"];
    const statusChanged = beforeData.status !== afterData.status;
    const isDecision = decisionStates.includes(afterData.status);

    if (!statusChanged || !isDecision) {
      return;
    }

    console.log(`[onValidationDecision] Decision made for ${validationId}: ${afterData.status}`);

    try {
      // Determine notification event based on decision
      let eventId: string;
      let context: Record<string, unknown> = {
        validationId,
        providerId: afterData.providerId,
        providerName: afterData.providerName,
        providerType: afterData.providerType,
        decisionBy: afterData.decisionBy,
        decisionReason: afterData.decisionReason,
      };

      switch (afterData.status) {
        case "approved":
          eventId = "profile_approved";
          context.message = "Congratulations! Your profile has been approved and is now visible on the platform.";
          break;
        case "rejected":
          eventId = "profile_rejected";
          context.message = `Your profile has been rejected. Reason: ${afterData.decisionReason}`;
          break;
        case "changes_requested":
          eventId = "profile_changes_requested";
          context.message = "Changes have been requested for your profile before it can be approved.";
          context.requestedChanges = afterData.requestedChanges;
          break;
        default:
          return;
      }

      // Send notification to provider
      await sendNotification(afterData.providerId, eventId, context);

      // Create in-app notification for provider
      await db.collection("notifications").add({
        userId: afterData.providerId,
        type: eventId,
        title: afterData.status === "approved"
          ? "Profile Approved!"
          : afterData.status === "rejected"
            ? "Profile Rejected"
            : "Changes Requested",
        message: context.message,
        data: {
          validationId,
          status: afterData.status,
          reason: afterData.decisionReason,
          requestedChanges: afterData.requestedChanges,
        },
        read: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`[onValidationDecision] Provider ${afterData.providerId} notified of ${afterData.status}`);
    } catch (error) {
      await logError("onValidationDecision", error);
      console.error(`[onValidationDecision] Error processing decision for ${validationId}:`, error);
    }
  }
);

// ============================================================================
// RE-SUBMIT FOR VALIDATION (after changes)
// ============================================================================

/**
 * Re-submit profile for validation after making requested changes
 */
export const resubmitForValidation = onCall(
  {
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 60,
  },
  async (req) => {
    const db = getDb();
    const uid = assertAuthenticated(req);
    const { validationId } = req.data || {};

    if (!validationId) {
      throw new HttpsError("invalid-argument", "validationId is required.");
    }

    console.log(`[resubmitForValidation] Re-submitting validation: ${validationId}`);

    const validationRef = db.collection("validation_queue").doc(validationId);

    await db.runTransaction(async (transaction) => {
      const validationDoc = await transaction.get(validationRef);

      if (!validationDoc.exists) {
        throw new HttpsError("not-found", "Validation request not found.");
      }

      const validationData = validationDoc.data() as ValidationQueueDocument;

      // Only the provider can re-submit their own profile
      if (validationData.providerId !== uid) {
        throw new HttpsError("permission-denied", "You can only re-submit your own profile.");
      }

      if (validationData.status !== "changes_requested" && validationData.status !== "rejected") {
        throw new HttpsError(
          "failed-precondition",
          `Cannot re-submit validation with status: ${validationData.status}`
        );
      }

      const previousStatus = validationData.status;
      const now = admin.firestore.FieldValue.serverTimestamp();

      // Reset validation to pending
      transaction.update(validationRef, {
        status: "pending",
        assignedTo: null,
        assignedAt: null,
        decision: null,
        decisionBy: null,
        decisionAt: null,
        decisionReason: null,
        requestedChanges: [],
        submittedAt: now,
        updatedAt: now,
        changeHistory: admin.firestore.FieldValue.arrayUnion({
          action: "resubmitted",
          performedBy: uid,
          performedAt: new Date(),
          details: { previousStatus },
        }),
      });

      // Update provider profile
      const profileRef = db.collection("sos_profiles").doc(validationData.providerId);
      transaction.update(profileRef, {
        validationStatus: "pending",
        validationSubmittedAt: now,
        validationRequestedChanges: admin.firestore.FieldValue.delete(),
        updatedAt: now,
      });
    });

    // Create history entry
    await createHistoryEntry(validationId, {
      action: "resubmitted",
      performedBy: uid,
      previousStatus: "changes_requested",
      newStatus: "pending",
    });

    console.log(`[resubmitForValidation] Validation ${validationId} re-submitted`);

    return {
      success: true,
      message: "Profile re-submitted for validation.",
    };
  }
);

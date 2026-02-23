/**
 * onInvoiceCreated.ts
 *
 * P0-3 FIX: Cloud Function triggers for invoice management
 *
 * 1. Creates admin_invoices documents when invoices are created
 * 2. Prevents duplicate invoice generation using distributed locks
 * 3. Handles audit logging for invoice operations
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logError } from "../utils/logs/logError";

/**
 * Trigger: When a new invoice_records document is created
 * Creates corresponding admin_invoices and audit_logs entries
 */
export const onInvoiceRecordCreated = onDocumentCreated(
  {
    document: "invoice_records/{invoiceId}",
    region: "europe-west3",
    cpu: 0.083,
  },
  async (event) => {
    const invoiceData = event.data?.data();
    const invoiceId = event.params.invoiceId;

    if (!invoiceData) {
      console.warn(`⚠️ [onInvoiceCreated] No data for invoice ${invoiceId}`);
      return;
    }

    console.log(`📄 [onInvoiceCreated] Processing invoice: ${invoiceId}`);

    const db = admin.firestore();

    try {
      // Idempotency check: skip if admin_invoice already exists (trigger retry protection)
      const adminInvoiceRef = db.collection("admin_invoices").doc(invoiceId);
      const existing = await adminInvoiceRef.get();
      if (existing.exists) {
        console.log(`⏭️ [onInvoiceCreated] Already processed invoice ${invoiceId}, skipping`);
        return;
      }

      const batch = db.batch();

      // 1. Create admin_invoices document
      batch.set(adminInvoiceRef, {
        invoiceNumber: invoiceData.invoiceNumber || invoiceId,
        type: invoiceData.type, // 'platform' or 'provider'
        amount: invoiceData.amount || 0,
        currency: invoiceData.currency || "EUR",
        clientId: invoiceData.clientId,
        providerId: invoiceData.providerId,
        callId: invoiceData.callId,
        callSessionId: invoiceData.callSessionId || invoiceData.callId,
        downloadUrl: invoiceData.downloadUrl,
        status: invoiceData.status || "issued",
        // Pricing breakdown
        platformFee: invoiceData.platformFee || invoiceData.connectionFee || 0,
        providerAmount: invoiceData.providerAmount || 0,
        // P0 FIX: Synchroniser les noms client/prestataire pour affichage admin
        clientName: invoiceData.clientName || null,
        clientEmail: invoiceData.clientEmail || null,
        providerName: invoiceData.providerName || null, // Format "Prénom L."
        providerEmail: invoiceData.providerEmail || null,
        // Structured data for AdminInvoices.tsx compatibility
        clientData: {
          name: invoiceData.clientName || null,
          email: invoiceData.clientEmail || null,
        },
        providerData: {
          name: invoiceData.providerName || null, // Format "Prénom L."
          email: invoiceData.providerEmail || null,
        },
        // Metadata
        sourceCollection: "invoice_records",
        sourceId: invoiceId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        syncedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // 2. Create audit log entry
      const auditLogRef = db.collection("audit_logs").doc();
      batch.set(auditLogRef, {
        action: "invoice_created",
        resourceType: "invoice",
        resourceId: invoiceId,
        invoiceNumber: invoiceData.invoiceNumber,
        callId: invoiceData.callId,
        clientId: invoiceData.clientId,
        providerId: invoiceData.providerId,
        amount: invoiceData.amount,
        currency: invoiceData.currency || "EUR",
        type: invoiceData.type,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        triggeredBy: "onInvoiceRecordCreated",
      });

      // 3. Update invoice_index if exists
      if (invoiceData.callId) {
        const indexQuery = await db
          .collection("invoice_index")
          .where("callId", "==", invoiceData.callId)
          .limit(1)
          .get();

        if (!indexQuery.empty) {
          const indexDoc = indexQuery.docs[0];
          const updateField = invoiceData.type === "platform"
            ? "platformInvoiceNumber"
            : "providerInvoiceNumber";

          batch.update(indexDoc.ref, {
            [updateField]: invoiceData.invoiceNumber,
            adminSynced: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      await batch.commit();
      console.log(`✅ [onInvoiceCreated] Admin invoice and audit log created for ${invoiceId}`);

    } catch (error) {
      console.error(`❌ [onInvoiceCreated] Error processing invoice ${invoiceId}:`, error);
      await logError("onInvoiceRecordCreated", { invoiceId, error });
    }
  }
);

/**
 * Acquire a distributed lock for invoice generation
 * Returns true if lock acquired, false if already locked
 */
export const acquireInvoiceLock = onCall(
  {
    region: "europe-west3",
    cpu: 0.25,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { callId } = request.data;

    if (!callId) {
      throw new HttpsError("invalid-argument", "callId is required");
    }

    const db = admin.firestore();
    const lockRef = db.collection("invoice_locks").doc(callId);

    try {
      const result = await db.runTransaction(async (transaction) => {
        const lockDoc = await transaction.get(lockRef);

        if (lockDoc.exists) {
          const lockData = lockDoc.data();
          const lockTime = lockData?.acquiredAt?.toDate?.() || new Date(0);
          const lockAge = Date.now() - lockTime.getTime();

          // Lock expires after 2 minutes
          if (lockAge < 2 * 60 * 1000) {
            return {
              acquired: false,
              reason: "Lock already held",
              lockedBy: lockData?.processId,
              lockedAt: lockTime.toISOString(),
            };
          }
          // Lock expired, we can take it
        }

        // Acquire the lock
        transaction.set(lockRef, {
          callId,
          acquiredAt: admin.firestore.FieldValue.serverTimestamp(),
          acquiredBy: request.auth!.uid,
          processId: `client-${request.auth!.uid}-${Date.now()}`,
          expiresAt: new Date(Date.now() + 2 * 60 * 1000),
        });

        return {
          acquired: true,
          lockId: callId,
        };
      });

      return result;
    } catch (error) {
      console.error(`❌ [acquireInvoiceLock] Error for callId ${callId}:`, error);
      throw new HttpsError("internal", "Failed to acquire lock");
    }
  }
);

/**
 * Release a distributed lock for invoice generation
 */
export const releaseInvoiceLock = onCall(
  {
    region: "europe-west3",
    cpu: 0.25,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { callId } = request.data;

    if (!callId) {
      throw new HttpsError("invalid-argument", "callId is required");
    }

    const db = admin.firestore();
    const lockRef = db.collection("invoice_locks").doc(callId);

    try {
      const lockDoc = await lockRef.get();

      if (!lockDoc.exists) {
        return { released: true, reason: "Lock did not exist" };
      }

      const lockData = lockDoc.data();

      // Only the owner can release the lock
      if (lockData?.acquiredBy !== request.auth.uid) {
        return {
          released: false,
          reason: "Not lock owner",
          lockedBy: lockData?.acquiredBy,
        };
      }

      await lockRef.delete();
      return { released: true };
    } catch (error) {
      console.error(`❌ [releaseInvoiceLock] Error for callId ${callId}:`, error);
      throw new HttpsError("internal", "Failed to release lock");
    }
  }
);

/**
 * Check if invoices already exist for a call
 * Used to prevent duplicate generation
 */
export const checkInvoicesExist = onCall(
  {
    region: "europe-west3",
    cpu: 0.25,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { callId } = request.data;

    if (!callId) {
      throw new HttpsError("invalid-argument", "callId is required");
    }

    const db = admin.firestore();

    try {
      // Check invoice_records collection
      const invoicesQuery = await db
        .collection("invoice_records")
        .where("callId", "==", callId)
        .limit(1)
        .get();

      if (!invoicesQuery.empty) {
        const invoice = invoicesQuery.docs[0].data();
        return {
          exists: true,
          invoiceNumber: invoice.invoiceNumber,
          createdAt: invoice.createdAt?.toDate?.()?.toISOString(),
        };
      }

      // Also check invoices collection (legacy)
      const legacyQuery = await db
        .collection("invoices")
        .where("callId", "==", callId)
        .limit(1)
        .get();

      if (!legacyQuery.empty) {
        const invoice = legacyQuery.docs[0].data();
        return {
          exists: true,
          invoiceNumber: invoice.invoiceNumber,
          createdAt: invoice.createdAt?.toDate?.()?.toISOString(),
          source: "legacy",
        };
      }

      return { exists: false };
    } catch (error) {
      console.error(`❌ [checkInvoicesExist] Error for callId ${callId}:`, error);
      throw new HttpsError("internal", "Failed to check invoices");
    }
  }
);

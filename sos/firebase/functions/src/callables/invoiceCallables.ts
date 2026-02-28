/**
 * invoiceCallables.ts
 *
 * AUDIT FIX 2026-02-27: Callable wrappers for invoice admin actions.
 * Frontend (AdminInvoices.tsx) calls these via httpsCallable.
 *
 * IMPORTANT: The frontend reads from BOTH collections:
 *   - admin_invoices (call session invoices with financialData format)
 *   - invoice_records (standalone invoices with flat format)
 * The invoice.id passed by the frontend can come from either collection.
 * All functions must handle both collections.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { adminConfig } from "../lib/functionConfigs";
import { resendInvoiceEmail } from "../triggers/onInvoiceCreatedSendEmail";

const db = admin.firestore();

/**
 * Find invoice in either admin_invoices or invoice_records
 */
async function findInvoice(invoiceId: string): Promise<{
  doc: admin.firestore.DocumentSnapshot;
  collection: "admin_invoices" | "invoice_records";
} | null> {
  // Try invoice_records first (used by resendInvoiceEmail)
  const irDoc = await db.collection("invoice_records").doc(invoiceId).get();
  if (irDoc.exists) return { doc: irDoc, collection: "invoice_records" };

  // Fallback to admin_invoices
  const aiDoc = await db.collection("admin_invoices").doc(invoiceId).get();
  if (aiDoc.exists) return { doc: aiDoc, collection: "admin_invoices" };

  return null;
}

/**
 * Send invoice email — callable wrapper around resendInvoiceEmail helper.
 * Handles invoices from both admin_invoices and invoice_records collections.
 */
export const sendInvoiceEmail = onCall(
  { ...adminConfig, timeoutSeconds: 30 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const claims = request.auth.token;
    if (!claims.admin && !claims.superAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { invoiceId } = request.data;
    if (!invoiceId || typeof invoiceId !== "string") {
      throw new HttpsError("invalid-argument", "invoiceId is required");
    }

    // Check if invoice exists in invoice_records (resendInvoiceEmail uses this collection)
    const found = await findInvoice(invoiceId);
    if (!found) {
      throw new HttpsError("not-found", "Invoice not found");
    }

    if (found.collection === "invoice_records") {
      // Direct path: resendInvoiceEmail works with invoice_records
      const result = await resendInvoiceEmail(invoiceId);
      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to send invoice email");
      }
      return result;
    }

    // admin_invoices path: extract email data and create message_event directly
    const data = found.doc.data()!;
    const clientEmail = data.clientData?.email || data.providerData?.email;
    if (!clientEmail) {
      throw new HttpsError("failed-precondition", "No email address found on invoice");
    }

    const messageEventRef = await db.collection("message_events").add({
      eventId: "invoice.resent",
      locale: "en",
      to: { email: clientEmail },
      context: {
        clientName: data.clientData?.name || data.providerData?.name || "Client",
        invoiceNumber: data.invoices?.platform?.number || data.invoices?.provider?.number || invoiceId,
        amount: data.financialData?.totalAmount || 0,
        currency: data.financialData?.currency || "EUR",
        downloadUrl: data.invoices?.platform?.url || data.invoices?.provider?.url || "",
      },
      channels: { email: true, sms: false, push: false, inapp: false },
      email: { subject: "Your invoice", template: "invoice_delivery" },
      metadata: { invoiceId, source: "sendInvoiceEmail_adminInvoices", isResend: true },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: "pending",
    });

    // Audit log for admin_invoices path
    await db.collection("audit_logs").add({
      action: "invoice_email_resent",
      resourceType: "invoice",
      resourceId: invoiceId,
      sourceCollection: "admin_invoices",
      adminUid: request.auth.uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, messageEventId: messageEventRef.id };
  }
);

/**
 * Regenerate invoice — re-triggers invoice generation for a call.
 * Handles invoices from both admin_invoices and invoice_records collections.
 */
export const regenerateInvoice = onCall(
  { ...adminConfig, timeoutSeconds: 60 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const claims = request.auth.token;
    if (!claims.admin && !claims.superAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { invoiceId, callId } = request.data;
    if (!invoiceId || typeof invoiceId !== "string") {
      throw new HttpsError("invalid-argument", "invoiceId is required");
    }

    try {
      const found = await findInvoice(invoiceId);
      if (!found) {
        throw new HttpsError("not-found", "Invoice not found");
      }

      // Mark old invoice as regenerated in its source collection
      await db.collection(found.collection).doc(invoiceId).update({
        status: "regenerated",
        regeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        regeneratedBy: request.auth.uid,
      });

      // Resolve callId: from parameter or from the invoice document
      const effectiveCallId = callId || found.doc.data()?.callId || found.doc.data()?.callSessionId;

      if (effectiveCallId) {
        const callDoc = await db.collection("call_sessions").doc(effectiveCallId).get();
        if (!callDoc.exists) {
          throw new HttpsError("not-found", "Call session not found");
        }

        // Re-trigger by resetting invoiceGenerated flag on call session
        await db.collection("call_sessions").doc(effectiveCallId).update({
          invoiceGenerated: false,
          invoiceRegeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
          invoiceRegeneratedBy: request.auth.uid,
        });

        // Audit log
        await db.collection("audit_logs").add({
          action: "invoice_regenerated",
          resourceType: "invoice",
          resourceId: invoiceId,
          callId: effectiveCallId,
          sourceCollection: found.collection,
          adminUid: request.auth.uid,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          success: true,
          message: `Invoice ${invoiceId} marked for regeneration`,
          callId: effectiveCallId,
        };
      }

      return { success: true, message: `Invoice ${invoiceId} marked as regenerated` };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      console.error(`[regenerateInvoice] Error:`, error);
      throw new HttpsError("internal", "Failed to regenerate invoice");
    }
  }
);

/**
 * Send bulk invoice emails — sends emails for multiple invoices.
 * Handles invoices from both admin_invoices and invoice_records collections.
 */
export const sendBulkInvoiceEmails = onCall(
  { ...adminConfig, timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const claims = request.auth.token;
    if (!claims.admin && !claims.superAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { invoices } = request.data;
    if (!Array.isArray(invoices) || invoices.length === 0) {
      throw new HttpsError("invalid-argument", "invoices array is required");
    }

    if (invoices.length > 50) {
      throw new HttpsError("invalid-argument", "Maximum 50 invoices per batch");
    }

    const results: { invoiceId: string; success: boolean; error?: string }[] = [];

    for (const inv of invoices) {
      if (!inv.invoiceId) {
        results.push({ invoiceId: "unknown", success: false, error: "Missing invoiceId" });
        continue;
      }

      try {
        // Try invoice_records first (works with resendInvoiceEmail)
        const irDoc = await db.collection("invoice_records").doc(inv.invoiceId).get();
        if (irDoc.exists) {
          const result = await resendInvoiceEmail(inv.invoiceId);
          results.push({ invoiceId: inv.invoiceId, success: result.success, error: result.error });
        } else {
          // Fallback: admin_invoices — create message_event directly
          const aiDoc = await db.collection("admin_invoices").doc(inv.invoiceId).get();
          if (!aiDoc.exists) {
            results.push({ invoiceId: inv.invoiceId, success: false, error: "Invoice not found" });
            continue;
          }
          const data = aiDoc.data()!;
          const email = data.clientData?.email || data.providerData?.email;
          if (!email) {
            results.push({ invoiceId: inv.invoiceId, success: false, error: "No email address" });
            continue;
          }

          await db.collection("message_events").add({
            eventId: "invoice.resent",
            locale: "en",
            to: { email },
            context: {
              clientName: data.clientData?.name || "Client",
              invoiceNumber: data.invoices?.platform?.number || inv.invoiceId,
              amount: data.financialData?.totalAmount || 0,
              currency: data.financialData?.currency || "EUR",
              downloadUrl: data.invoices?.platform?.url || "",
            },
            channels: { email: true, sms: false, push: false, inapp: false },
            email: { subject: "Your invoice", template: "invoice_delivery" },
            metadata: { invoiceId: inv.invoiceId, source: "bulkSend_adminInvoices" },
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            status: "pending",
          });
          results.push({ invoiceId: inv.invoiceId, success: true });
        }
      } catch (error) {
        results.push({
          invoiceId: inv.invoiceId,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // Audit log
    await db.collection("audit_logs").add({
      action: "bulk_invoice_emails_sent",
      adminUid: request.auth.uid,
      totalInvoices: invoices.length,
      successCount,
      failCount,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { success: true, results, successCount, failCount };
  }
);

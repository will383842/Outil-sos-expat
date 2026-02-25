import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { StripeManager } from "./StripeManager";
import { logError } from "./utils/logs/logError";
import { logCallRecord } from "./utils/logs/logCallRecord";
import { logger as prodLogger } from "./utils/productionLogger";
// P1-13: Sync atomique payments <-> call_sessions
import { syncPaymentStatus } from "./utils/paymentSync";

/**
 * LEGACY FUNCTION - Scheduled for deprecation
 *
 * This function was used to process pending transfers before the migration
 * to Stripe Destination Charges. With Destination Charges, transfers happen
 * automatically at payment capture time.
 *
 * TRANSITION PERIOD:
 * - Start date: January 28, 2025 (Destination Charges deployment)
 * - End date: February 27, 2025 (30 days transition)
 * - After end date: Function auto-disables and logs warning
 *
 * This function remains active during transition to process any legacy
 * pending_transfers that were created before the migration.
 *
 * @deprecated Use Destination Charges instead - transfers are now automatic
 */

// Transition period configuration
const DESTINATION_CHARGES_START_DATE = new Date("2025-01-28T00:00:00Z");
const TRANSITION_PERIOD_DAYS = 30;
const TRANSITION_END_DATE = new Date(
  DESTINATION_CHARGES_START_DATE.getTime() + TRANSITION_PERIOD_DAYS * 24 * 60 * 60 * 1000
);

export const processScheduledTransfers = onSchedule(
  {
    schedule: "0 2 * * *", // Every day at 2 AM UTC
    region: "europe-west3",
    timeoutSeconds: 540,
    memory: "128MiB", // OPTIMIZED: Reduced from 512MiB - legacy function with simple queries
    cpu: 0.083,
  },
  async () => {
    const executionId = `legacy-transfer-${Date.now()}`;
    const now = new Date();

    prodLogger.info('LEGACY_TRANSFER_START', `[${executionId}] Legacy scheduled transfers execution started`, {
      executionId,
      timestamp: now.toISOString()
    });

    // Check if transition period has ended
    if (now > TRANSITION_END_DATE) {
      console.log("========================================");
      console.log("LEGACY FUNCTION DISABLED - TRANSITION PERIOD ENDED");
      console.log("========================================");
      console.log(`Transition ended on: ${TRANSITION_END_DATE.toISOString()}`);
      console.log("New payments use Destination Charges - transfers are automatic at capture.");
      console.log("This function can now be safely removed from deployment.");
      console.log("To remove: Delete export from index.ts and remove this file.");
      console.log("========================================");

      prodLogger.info('LEGACY_TRANSFER_DISABLED', `[${executionId}] Legacy function disabled - transition ended`, {
        executionId,
        transitionEndDate: TRANSITION_END_DATE.toISOString()
      });
      return;
    }

    // Calculate days remaining in transition
    const daysRemaining = Math.ceil(
      (TRANSITION_END_DATE.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    console.log("========================================");
    console.log("LEGACY TRANSFER PROCESSING - TRANSITION MODE");
    console.log("========================================");
    console.log(`Processing legacy pending_transfers created before Destination Charges migration.`);
    console.log(`Transition period: ${daysRemaining} days remaining (ends ${TRANSITION_END_DATE.toISOString()})`);
    console.log(`Current time: ${now.toISOString()}`);

    const firestoreNow = admin.firestore.Timestamp.now();
    const db = admin.firestore();
    const stripeManager = new StripeManager();
    
    try {
      // Get all pending transfers that are due (legacy transfers only)
      // Note: Only processes transfers created BEFORE Destination Charges migration
      const pendingSnapshot = await db
        .collection("pending_transfers")
        .where("status", "==", "pending")
        .where("scheduledFor", "<=", firestoreNow)
        .where("createdAt", "<", admin.firestore.Timestamp.fromDate(DESTINATION_CHARGES_START_DATE))
        .limit(100) // Process in batches
        .get();

      console.log(`Found ${pendingSnapshot.size} legacy transfers to process`);
      prodLogger.info('LEGACY_TRANSFER_FOUND', `[${executionId}] Found ${pendingSnapshot.size} legacy transfers`, {
        executionId,
        count: pendingSnapshot.size,
        daysRemaining
      });

      if (pendingSnapshot.size === 0) {
        console.log("========================================");
        console.log("No legacy pending transfers found.");
        console.log("All pre-migration transfers have been processed.");
        console.log("Consider removing this function after transition period ends.");
        console.log("========================================");
        prodLogger.info('LEGACY_TRANSFER_NONE', `[${executionId}] No legacy transfers to process`, {
          executionId
        });
        return;
      }

      const results = {
        total: pendingSnapshot.size,
        succeeded: 0,
        failed: 0,
        totalAmount: 0,
      };

      // Process each legacy pending transfer
      for (const doc of pendingSnapshot.docs) {
        const transfer = doc.data();

        try {
          console.log(`[LEGACY] Processing transfer ${doc.id} for provider ${transfer.providerId}`);
          console.log(`[LEGACY] Amount: ${transfer.amount} EUR, Session: ${transfer.sessionId}`);
          
          // Execute the Stripe transfer
          const transferResult = await stripeManager.transferToProvider(
            transfer.providerId,
            transfer.amount,
            transfer.sessionId,
            transfer.metadata || {}
          );

          if (transferResult.success && transferResult.transferId) {
            // Transfer succeeded - update pending_transfer record
            await doc.ref.update({
              status: "completed",
              transferId: transferResult.transferId,
              completedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              processedAs: "legacy_transfer", // Mark as legacy for audit
            });

            // P1-13 FIX: Récupérer paymentId depuis call_session et sync atomique
            const sessionDoc = await db.collection("call_sessions").doc(transfer.sessionId).get();
            const sessionData = sessionDoc.data();
            const paymentId = sessionData?.paymentId || sessionData?.payment?.intentId;

            if (paymentId) {
              await syncPaymentStatus(db, paymentId, transfer.sessionId, {
                transferId: transferResult.transferId,
                transferCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
                transferStatus: "succeeded",
              });
            }
            // Mise à jour metadata séparément
            await db.collection("call_sessions").doc(transfer.sessionId).update({
              "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
            });

            // Log success
            await logCallRecord({
              callId: transfer.sessionId,
              status: "provider_payment_transferred",
              retryCount: 0,
              additionalData: {
                transferId: transferResult.transferId,
                amount: transfer.amount,
                providerId: transfer.providerId,
                pendingTransferId: doc.id,
                processedBy: "legacy_scheduled_function",
                note: "Pre-Destination Charges migration transfer",
              },
            });

            results.succeeded++;
            results.totalAmount += transfer.amount;
            console.log(`[LEGACY] Transfer ${doc.id} completed successfully`);
            prodLogger.info('LEGACY_TRANSFER_SUCCESS', `[${executionId}] Transfer succeeded`, {
              executionId,
              transferId: doc.id,
              providerId: transfer.providerId,
              amount: transfer.amount,
              sessionId: transfer.sessionId
            });
          } else {
            // Transfer failed - mark as failed
            await doc.ref.update({
              status: "failed",
              failureReason: transferResult.error || "Unknown error",
              attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              retryCount: admin.firestore.FieldValue.increment(1),
            });

            // P1-13 FIX: Sync atomique pour le statut d'échec
            const failSessionDoc = await db.collection("call_sessions").doc(transfer.sessionId).get();
            const failSessionData = failSessionDoc.data();
            const failPaymentId = failSessionData?.paymentId || failSessionData?.payment?.intentId;

            if (failPaymentId) {
              await syncPaymentStatus(db, failPaymentId, transfer.sessionId, {
                transferStatus: "failed",
                transferError: transferResult.error || "Unknown error",
              });
            }
            await db.collection("call_sessions").doc(transfer.sessionId).update({
              "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
            });

            // Log failure
            await logCallRecord({
              callId: transfer.sessionId,
              status: "provider_payment_transfer_failed",
              retryCount: 0,
              additionalData: {
                error: transferResult.error,
                amount: transfer.amount,
                providerId: transfer.providerId,
                pendingTransferId: doc.id,
                processedBy: "legacy_scheduled_function",
                note: "Pre-Destination Charges migration transfer",
              },
            });

            results.failed++;
            console.error(`[LEGACY] Transfer ${doc.id} failed: ${transferResult.error}`);
            prodLogger.error('LEGACY_TRANSFER_FAILED', `[${executionId}] Transfer failed`, {
              executionId,
              transferId: doc.id,
              providerId: transfer.providerId,
              amount: transfer.amount,
              error: transferResult.error
            });
          }
        } catch (error) {
          results.failed++;
          console.error(`[LEGACY] Error processing transfer ${doc.id}:`, error);
          prodLogger.error('LEGACY_TRANSFER_ERROR', `[${executionId}] Transfer error`, {
            executionId,
            transferId: doc.id,
            error: error instanceof Error ? error.message : String(error)
          });
          await logError("processScheduledTransfers:legacy_transfer", error);

          // Mark as failed with error details
          await doc.ref.update({
            status: "failed",
            failureReason: error instanceof Error ? error.message : "Unknown error",
            attemptedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            retryCount: admin.firestore.FieldValue.increment(1),
            processedAs: "legacy_transfer",
          });

          // P1-13 FIX: Sync atomique pour le statut d'erreur
          try {
            const errSessionDoc = await db.collection("call_sessions").doc(transfer.sessionId).get();
            const errSessionData = errSessionDoc.data();
            const errPaymentId = errSessionData?.paymentId || errSessionData?.payment?.intentId;

            if (errPaymentId) {
              await syncPaymentStatus(db, errPaymentId, transfer.sessionId, {
                transferStatus: "failed",
                transferError: error instanceof Error ? error.message : "Unknown error",
              });
            }
            await db.collection("call_sessions").doc(transfer.sessionId).update({
              "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
            });
          } catch (updateError) {
            console.error(`[LEGACY] Failed to update call_session: ${updateError}`);
          }
        }
      }

      console.log("========================================");
      console.log("LEGACY TRANSFER PROCESSING COMPLETE");
      console.log("========================================");
      console.log(`Results:`, results);
      console.log(`Total amount transferred: ${results.totalAmount} EUR`);
      console.log(`Days remaining in transition: ${daysRemaining}`);
      console.log("========================================");

      prodLogger.info('LEGACY_TRANSFER_COMPLETE', `[${executionId}] Legacy transfers processing complete`, {
        executionId,
        total: results.total,
        succeeded: results.succeeded,
        failed: results.failed,
        totalAmount: results.totalAmount,
        daysRemaining
      });
    } catch (error) {
      console.error("[LEGACY] Scheduled transfer processing failed:", error);
      prodLogger.error('LEGACY_TRANSFER_CRITICAL_ERROR', `[${executionId}] Critical error in legacy transfers`, {
        executionId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.slice(0, 500) : undefined
      });
      await logError("processScheduledTransfers:legacy", error);
      throw error;
    }
  }
);


/**
 * PendingTransferProcessor.ts
 *
 * Traite les transferts en attente lorsqu'un provider complete son KYC Stripe.
 *
 * Workflow:
 * 1. Client paie pour un appel, mais le provider n'a pas complete son KYC
 * 2. L'argent est garde sur le compte de la plateforme (escrow)
 * 3. Un record est cree dans pending_transfers avec status='pending_kyc'
 * 4. Quand le provider complete son KYC (charges_enabled=true via webhook)
 * 5. Cette fonction traite tous les pending_transfers pour ce provider
 * 6. L'argent est transfere au provider via Stripe Transfer
 */

import * as admin from "firebase-admin";
import { StripeManager } from "./StripeManager";
import { logError } from "./utils/logs/logError";
import { logCallRecord } from "./utils/logs/logCallRecord";

// Types
interface PendingTransfer {
  id: string;
  paymentIntentId: string;
  providerId: string;
  providerStripeAccountId: string | null;
  clientId: string;
  callSessionId: string | null;
  amount: number; // en centimes
  providerAmount: number; // en centimes
  commissionAmount: number; // en centimes
  currency: string;
  status: "pending_kyc" | "processing" | "completed" | "failed";
  reason: string;
  createdAt: admin.firestore.Timestamp;
  processedAt?: admin.firestore.Timestamp;
  transferId?: string;
  errorMessage?: string;
  retryCount?: number;
}

interface ProcessResult {
  transferId: string;
  pendingTransferId: string;
  success: boolean;
  error?: string;
}

/**
 * Traite tous les transferts en attente pour un provider qui vient de completer son KYC
 */
export async function processPendingTransfersForProvider(
  providerId: string,
  stripeAccountId: string,
  db?: admin.firestore.Firestore
): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  results: ProcessResult[];
}> {
  const database = db || admin.firestore();

  console.log(`[PENDING_TRANSFER] Processing pending transfers for provider ${providerId}`);
  console.log(`[PENDING_TRANSFER] Stripe account: ${stripeAccountId}`);

  const results: ProcessResult[] = [];
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  try {
    // Recuperer tous les transferts en attente de KYC pour ce provider
    const pendingSnapshot = await database
      .collection("pending_transfers")
      .where("providerId", "==", providerId)
      .where("status", "==", "pending_kyc")
      .orderBy("createdAt", "asc") // Traiter les plus anciens en premier
      .get();

    console.log(`[PENDING_TRANSFER] Found ${pendingSnapshot.size} pending transfers`);

    if (pendingSnapshot.empty) {
      console.log(`[PENDING_TRANSFER] No pending transfers found for provider ${providerId}`);
      return { processed: 0, succeeded: 0, failed: 0, results: [] };
    }

    const stripeManager = new StripeManager();

    // Traiter chaque transfert en attente
    for (const doc of pendingSnapshot.docs) {
      const transfer = { id: doc.id, ...doc.data() } as PendingTransfer;
      processed++;

      console.log(`[PENDING_TRANSFER] Processing transfer ${transfer.id}`);
      console.log(`[PENDING_TRANSFER] Amount: ${transfer.providerAmount} cents, Session: ${transfer.callSessionId}`);

      try {
        // Marquer comme en cours de traitement
        await doc.ref.update({
          status: "processing",
          processingStartedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Mettre a jour le stripeAccountId si necessaire
        if (!transfer.providerStripeAccountId) {
          await doc.ref.update({
            providerStripeAccountId: stripeAccountId,
          });
        }

        // Executer le transfert Stripe
        // Note: providerAmount est deja en centimes, mais transferToProvider attend des euros
        const providerAmountEuros = transfer.providerAmount / 100;

        const transferResult = await stripeManager.transferToProvider(
          providerId,
          providerAmountEuros,
          transfer.callSessionId || transfer.paymentIntentId,
          {
            pendingTransferId: transfer.id,
            originalPaymentIntent: transfer.paymentIntentId,
            processedAfterKyc: "true",
          }
        );

        if (transferResult.success && transferResult.transferId) {
          // Succes - mettre a jour le pending_transfer
          await doc.ref.update({
            status: "completed",
            transferId: transferResult.transferId,
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          // Mettre a jour la session d'appel si elle existe
          if (transfer.callSessionId) {
            try {
              await database.collection("call_sessions").doc(transfer.callSessionId).update({
                "payment.transferId": transferResult.transferId,
                "payment.transferredAt": admin.firestore.FieldValue.serverTimestamp(),
                "payment.transferStatus": "succeeded",
                "payment.transferredAfterKyc": true,
                "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
              });
            } catch (updateErr) {
              console.warn(`[PENDING_TRANSFER] Could not update call_session ${transfer.callSessionId}:`, updateErr);
            }
          }

          // Mettre a jour le document de paiement
          try {
            await database.collection("payments").doc(transfer.paymentIntentId).update({
              transferId: transferResult.transferId,
              transferredAt: admin.firestore.FieldValue.serverTimestamp(),
              pendingTransferResolved: true,
            });
          } catch (updateErr) {
            console.warn(`[PENDING_TRANSFER] Could not update payment ${transfer.paymentIntentId}:`, updateErr);
          }

          // Log le succes
          if (transfer.callSessionId) {
            await logCallRecord({
              callId: transfer.callSessionId,
              status: "provider_payment_transferred_after_kyc",
              retryCount: 0,
              additionalData: {
                transferId: transferResult.transferId,
                amount: transfer.providerAmount,
                providerId: transfer.providerId,
                pendingTransferId: transfer.id,
                paymentIntentId: transfer.paymentIntentId,
              },
            });
          }

          // Notifier le provider
          await database.collection("inapp_notifications").add({
            uid: providerId,
            type: "payment_received",
            title: "Paiement recu",
            message: `Vous avez recu un paiement de ${providerAmountEuros.toFixed(2)} EUR pour une consultation precedente.`,
            read: false,
            transferId: transferResult.transferId,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          succeeded++;
          results.push({
            transferId: transferResult.transferId,
            pendingTransferId: transfer.id,
            success: true,
          });

          console.log(`[PENDING_TRANSFER] Transfer ${transfer.id} completed: ${transferResult.transferId}`);
        } else {
          // Echec du transfert
          const retryCount = (transfer.retryCount || 0) + 1;

          await doc.ref.update({
            status: "failed",
            errorMessage: transferResult.error || "Unknown error",
            processedAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            retryCount: retryCount,
          });

          // Alerte admin
          await database.collection("admin_alerts").add({
            type: "pending_transfer_failed",
            priority: "high",
            title: "Transfert differe echoue",
            message: `Le transfert de ${providerAmountEuros.toFixed(2)} EUR au provider ${providerId} a echoue apres son KYC.`,
            pendingTransferId: transfer.id,
            providerId: providerId,
            amount: transfer.providerAmount,
            currency: transfer.currency,
            error: transferResult.error,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });

          failed++;
          results.push({
            transferId: "",
            pendingTransferId: transfer.id,
            success: false,
            error: transferResult.error,
          });

          console.error(`[PENDING_TRANSFER] Transfer ${transfer.id} failed: ${transferResult.error}`);
        }
      } catch (error) {
        failed++;

        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        const retryCount = (transfer.retryCount || 0) + 1;

        await doc.ref.update({
          status: "failed",
          errorMessage: errorMessage,
          processedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          retryCount: retryCount,
        });

        await logError("PendingTransferProcessor:processTransfer", error);

        results.push({
          transferId: "",
          pendingTransferId: transfer.id,
          success: false,
          error: errorMessage,
        });

        console.error(`[PENDING_TRANSFER] Error processing transfer ${transfer.id}:`, error);
      }
    }

    console.log(`[PENDING_TRANSFER] Processing complete for provider ${providerId}`);
    console.log(`[PENDING_TRANSFER] Results: ${succeeded} succeeded, ${failed} failed out of ${processed}`);

    return { processed, succeeded, failed, results };
  } catch (error) {
    console.error("[PENDING_TRANSFER] Error processing pending transfers:", error);
    await logError("PendingTransferProcessor:processPendingTransfersForProvider", error);
    throw error;
  }
}

/**
 * Recupere les statistiques des transferts en attente pour l'admin
 */
export async function getPendingTransfersStats(
  db?: admin.firestore.Firestore
): Promise<{
  pendingKyc: number;
  processing: number;
  completed: number;
  failed: number;
  totalPendingAmount: number;
}> {
  const database = db || admin.firestore();

  const [pendingKyc, processing, completed, failed] = await Promise.all([
    database.collection("pending_transfers").where("status", "==", "pending_kyc").count().get(),
    database.collection("pending_transfers").where("status", "==", "processing").count().get(),
    database.collection("pending_transfers").where("status", "==", "completed").count().get(),
    database.collection("pending_transfers").where("status", "==", "failed").count().get(),
  ]);

  // Calculer le montant total en attente
  const pendingDocs = await database
    .collection("pending_transfers")
    .where("status", "==", "pending_kyc")
    .select("providerAmount")
    .get();

  let totalPendingAmount = 0;
  pendingDocs.forEach((doc) => {
    totalPendingAmount += doc.data().providerAmount || 0;
  });

  return {
    pendingKyc: pendingKyc.data().count,
    processing: processing.data().count,
    completed: completed.data().count,
    failed: failed.data().count,
    totalPendingAmount: totalPendingAmount / 100, // Convertir en euros
  };
}

/**
 * Retente les transferts echoues pour un provider
 */
export async function retryFailedTransfersForProvider(
  providerId: string,
  db?: admin.firestore.Firestore
): Promise<{
  retried: number;
  succeeded: number;
  failed: number;
}> {
  const database = db || admin.firestore();

  console.log(`[PENDING_TRANSFER] Retrying failed transfers for provider ${providerId}`);

  // Recuperer le stripeAccountId du provider
  const providerDoc = await database.collection("users").doc(providerId).get();
  const stripeAccountId = providerDoc.data()?.stripeAccountId;

  if (!stripeAccountId) {
    throw new Error(`Provider ${providerId} has no Stripe account`);
  }

  // Verifier que le KYC est complete
  const providerData = providerDoc.data();
  if (!providerData?.chargesEnabled) {
    throw new Error(`Provider ${providerId} KYC not complete (charges not enabled)`);
  }

  // Recuperer les transferts echoues
  const failedSnapshot = await database
    .collection("pending_transfers")
    .where("providerId", "==", providerId)
    .where("status", "==", "failed")
    .where("retryCount", "<", 3) // Max 3 tentatives
    .get();

  if (failedSnapshot.empty) {
    return { retried: 0, succeeded: 0, failed: 0 };
  }

  // Remettre en pending_kyc pour retraitement
  const batch = database.batch();
  failedSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      status: "pending_kyc",
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  // Retraiter
  const result = await processPendingTransfersForProvider(providerId, stripeAccountId, database);

  return {
    retried: failedSnapshot.size,
    succeeded: result.succeeded,
    failed: result.failed,
  };
}

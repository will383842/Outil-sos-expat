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
// P1-13: Sync atomique payments <-> call_sessions
import { syncPaymentStatus } from "./utils/paymentSync";

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
    // P0 FIX: Récupérer les transferts bloqués en "processing" depuis > 1 heure
    // Race condition: si le processus crash pendant le traitement, le transfert reste bloqué
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stuckSnapshot = await database
      .collection("pending_transfers")
      .where("providerId", "==", providerId)
      .where("status", "==", "processing")
      .where("processingStartedAt", "<", oneHourAgo)
      .get();

    if (!stuckSnapshot.empty) {
      console.log(`[PENDING_TRANSFER] ⚠️ Found ${stuckSnapshot.size} stuck transfers in "processing" state`);
      const batch = database.batch();
      stuckSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "pending_kyc",
          processingStartedAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          recoveredFromStuck: true,
        });
      });
      await batch.commit();
      console.log(`[PENDING_TRANSFER] ✅ Reset ${stuckSnapshot.size} stuck transfers to "pending_kyc"`);
    }

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

          // P1-13 FIX: Sync atomique payments <-> call_sessions
          try {
            await syncPaymentStatus(database, transfer.paymentIntentId, transfer.callSessionId, {
              transferId: transferResult.transferId,
              transferCreatedAt: admin.firestore.FieldValue.serverTimestamp(),
              transferStatus: "succeeded",
              transferredAfterKyc: true,
              pendingTransferResolved: true,
            });
            // Mise à jour metadata séparément
            if (transfer.callSessionId) {
              await database.collection("call_sessions").doc(transfer.callSessionId).update({
                "metadata.updatedAt": admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          } catch (updateErr) {
            console.warn(`[PENDING_TRANSFER] Could not sync payment status:`, updateErr);
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

/**
 * P0 FIX: Récupère les transferts bloqués en "processing" depuis > 1 heure
 * À appeler depuis un scheduled job pour récupérer les transferts orphelins
 */
export async function recoverStuckTransfers(
  db?: admin.firestore.Firestore
): Promise<{
  recovered: number;
  processed: number;
  succeeded: number;
  failed: number;
}> {
  const database = db || admin.firestore();

  console.log(`[PENDING_TRANSFER] 🔄 Starting global stuck transfers recovery`);

  // Récupérer les transferts bloqués en "processing" depuis > 1 heure
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const stuckSnapshot = await database
    .collection("pending_transfers")
    .where("status", "==", "processing")
    .where("processingStartedAt", "<", oneHourAgo)
    .get();

  if (stuckSnapshot.empty) {
    console.log(`[PENDING_TRANSFER] ✅ No stuck transfers found`);
    return { recovered: 0, processed: 0, succeeded: 0, failed: 0 };
  }

  console.log(`[PENDING_TRANSFER] ⚠️ Found ${stuckSnapshot.size} stuck transfers globally`);

  // Grouper par providerId pour traiter en batch
  const providerTransfers = new Map<string, admin.firestore.QueryDocumentSnapshot[]>();
  stuckSnapshot.docs.forEach((doc) => {
    const providerId = doc.data().providerId;
    if (!providerTransfers.has(providerId)) {
      providerTransfers.set(providerId, []);
    }
    providerTransfers.get(providerId)!.push(doc);
  });

  let recovered = 0;
  let processed = 0;
  let succeeded = 0;
  let failed = 0;

  // Traiter chaque provider
  for (const [providerId, docs] of providerTransfers.entries()) {
    try {
      // Remettre en pending_kyc
      const batch = database.batch();
      docs.forEach((doc) => {
        batch.update(doc.ref, {
          status: "pending_kyc",
          processingStartedAt: admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          recoveredFromStuck: true,
          recoveredAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
      await batch.commit();
      recovered += docs.length;

      // Récupérer le stripeAccountId du provider
      const providerDoc = await database.collection("users").doc(providerId).get();
      const providerData = providerDoc.data();
      const stripeAccountId = providerData?.stripeAccountId;

      // Si le provider a un compte Stripe et KYC complété, retraiter
      if (stripeAccountId && providerData?.chargesEnabled) {
        const result = await processPendingTransfersForProvider(providerId, stripeAccountId, database);
        processed += result.processed;
        succeeded += result.succeeded;
        failed += result.failed;
      } else {
        console.log(`[PENDING_TRANSFER] Provider ${providerId} not ready for transfer (KYC incomplete)`);
      }
    } catch (error) {
      console.error(`[PENDING_TRANSFER] Error recovering transfers for provider ${providerId}:`, error);
      await logError("PendingTransferProcessor:recoverStuckTransfers", error);
    }
  }

  console.log(`[PENDING_TRANSFER] 🔄 Recovery complete: ${recovered} recovered, ${succeeded} succeeded, ${failed} failed`);

  // Alerte admin si des transferts ont été récupérés
  if (recovered > 0) {
    await database.collection("admin_alerts").add({
      type: "stuck_transfers_recovered",
      priority: "medium",
      title: "Transferts bloqués récupérés",
      message: `${recovered} transferts bloqués en "processing" ont été récupérés. ${succeeded} réussis, ${failed} échoués.`,
      recovered,
      processed,
      succeeded,
      failed,
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  return { recovered, processed, succeeded, failed };
}

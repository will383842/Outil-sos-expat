/**
 * Scheduled: reconcileStuckWithdrawals
 *
 * Every 6 hours, polls Wise/Flutterwave for withdrawals stuck in "processing" or "sent"
 * status for more than 6 hours. Fallback when webhooks are missed or delayed.
 *
 * Created 2026-04-19 as part of the influencer system audit (prevents withdrawals
 * from staying stuck indefinitely when webhooks fail).
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { WithdrawalRequest } from "../types";
import { getPaymentService } from "../services/paymentService";
import { WiseProvider } from "../providers/wiseProvider";
import { createFlutterwaveProvider } from "../providers/flutterwaveProvider";
import { WISE_SECRETS, FLUTTERWAVE_SECRETS } from "../../lib/secrets";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

const STUCK_THRESHOLD_MS = 6 * 60 * 60 * 1000;
const WITHDRAWAL_COLLECTION = "payment_withdrawals";
const BATCH_SIZE = 50;

export const reconcileStuckWithdrawals = onSchedule(
  {
    schedule: "0 */6 * * *",
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 540,
    secrets: [...WISE_SECRETS, ...FLUTTERWAVE_SECRETS],
  },
  async () => {
    ensureInitialized();
    const db = getFirestore();

    const cutoff = Timestamp.fromMillis(Date.now() - STUCK_THRESHOLD_MS);
    const stuckSnap = await db
      .collection(WITHDRAWAL_COLLECTION)
      .where("status", "in", ["processing", "sent"])
      .where("updatedAt", "<=", cutoff)
      .limit(BATCH_SIZE)
      .get();

    if (stuckSnap.empty) {
      logger.info("[reconcileStuckWithdrawals] No stuck withdrawals found");
      return;
    }

    logger.info("[reconcileStuckWithdrawals] Reconciling stuck withdrawals", {
      count: stuckSnap.size,
    });

    const paymentService = getPaymentService();
    let completed = 0;
    let failed = 0;
    let skipped = 0;
    let errors = 0;

    let wise: WiseProvider | null = null;
    let flutterwave: ReturnType<typeof createFlutterwaveProvider> | null = null;

    for (const doc of stuckSnap.docs) {
      const withdrawal = doc.data() as WithdrawalRequest;
      const withdrawalId = doc.id;

      if (!withdrawal.providerTransactionId) {
        logger.warn("[reconcileStuckWithdrawals] No providerTransactionId, skipping", {
          withdrawalId,
          provider: withdrawal.provider,
        });
        skipped++;
        continue;
      }

      try {
        if (withdrawal.provider === "wise") {
          if (!wise) wise = WiseProvider.fromSecrets();
          const status = await wise.getTransferStatus(withdrawal.providerTransactionId);

          if (status.isComplete) {
            await paymentService.completeWithdrawal(withdrawalId, {
              transactionId: status.id,
              status: status.status,
              source: "reconciliation",
            });
            completed++;
          } else if (status.isFailed) {
            await paymentService.failWithdrawal(
              withdrawalId,
              `WISE_${status.status.toUpperCase()}`,
              status.statusMessage || `Wise transfer ${status.status}`
            );
            failed++;
          } else {
            skipped++;
          }
        } else if (withdrawal.provider === "flutterwave") {
          if (!flutterwave) flutterwave = createFlutterwaveProvider();
          const status = await flutterwave.getTransferStatus(withdrawal.providerTransactionId);

          if (status.status === "SUCCESSFUL") {
            await paymentService.completeWithdrawal(withdrawalId, {
              transactionId: String(status.id),
              status: status.status,
              source: "reconciliation",
            });
            completed++;
          } else if (status.status === "FAILED") {
            await paymentService.failWithdrawal(
              withdrawalId,
              "FLUTTERWAVE_FAILED",
              status.completeMessage || "Flutterwave transfer failed"
            );
            failed++;
          } else {
            skipped++;
          }
        } else {
          skipped++;
        }
      } catch (err) {
        errors++;
        logger.error("[reconcileStuckWithdrawals] Reconciliation error", {
          withdrawalId,
          provider: withdrawal.provider,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    logger.info("[reconcileStuckWithdrawals] Done", {
      processed: stuckSnap.size,
      completed,
      failed,
      skipped,
      errors,
    });
  }
);

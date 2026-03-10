/**
 * Scheduled: cleanupExpiredWithdrawalConfirmations
 *
 * Runs every 5 minutes to expire pending withdrawal confirmations
 * that have exceeded the 15-minute timeout.
 *
 * For each expired confirmation:
 * 1. Mark confirmation as expired
 * 2. Cancel the withdrawal and refund balance
 * 3. Notify user via Telegram
 */

import * as scheduler from "firebase-functions/v2/scheduler";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { logger } from "firebase-functions/v2";
import { TELEGRAM_SECRETS } from "../lib/secrets";
import {
  TelegramWithdrawalConfirmation,
  editMessageText,
} from "./withdrawalConfirmation";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const cleanupExpiredWithdrawalConfirmations = scheduler.onSchedule(
  {
    schedule: "every 5 minutes",
    timeZone: "Europe/Paris",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
    secrets: [...TELEGRAM_SECRETS],
  },
  async () => {
    ensureInitialized();
    const db = getFirestore();
    const now = Timestamp.now();

    try {
      // Find pending confirmations that have expired
      const expiredQuery = await db
        .collection("telegram_withdrawal_confirmations")
        .where("status", "==", "pending")
        .where("expiresAt", "<", now)
        .limit(50)
        .get();

      if (expiredQuery.empty) {
        return;
      }

      logger.info("[cleanupExpiredConfirmations] Found expired confirmations", {
        count: expiredQuery.size,
      });

      for (const doc of expiredQuery.docs) {
        const confirmation = doc.data() as TelegramWithdrawalConfirmation;

        try {
          await db.runTransaction(async (transaction) => {
            // === ALL READS FIRST (Firestore requirement) ===
            // Read the withdrawal doc to get totalDebited (includes $3 fee)
            const withdrawalRef = db
              .collection(confirmation.collection)
              .doc(confirmation.withdrawalId);
            const withdrawalSnap = await transaction.get(withdrawalRef);
            const withdrawalData = withdrawalSnap.exists ? withdrawalSnap.data() : null;

            // Use totalDebited (amount + fee) for correct refund
            const refundAmount = withdrawalData?.totalDebited || confirmation.amount;

            // For affiliate role, read the payout doc to get commissionIds
            let payoutSnap: FirebaseFirestore.DocumentSnapshot | null = null;
            if (confirmation.role === "affiliate") {
              payoutSnap = await transaction.get(
                db.collection("affiliate_payouts").doc(confirmation.withdrawalId)
              );
            }

            // === ALL WRITES ===
            // 1. Mark confirmation as expired
            transaction.update(doc.ref, {
              status: "expired",
              resolvedAt: now,
            });

            // 2. Cancel withdrawal + refund balance
            transaction.update(withdrawalRef, {
              status: "cancelled",
              cancelledAt: now.toDate().toISOString(),
              telegramConfirmationPending: false,
              statusHistory: FieldValue.arrayUnion({
                status: "cancelled",
                timestamp: now.toDate().toISOString(),
                actorType: "system",
                note: "Telegram confirmation expired (15 min)",
              }),
            });

            // 3. Refund balance (using totalDebited to include the $3 fee)
            if (confirmation.role === "groupAdmin") {
              const gaRef = db.collection("group_admins").doc(confirmation.userId);
              transaction.update(gaRef, {
                availableBalance: FieldValue.increment(refundAmount),
                pendingWithdrawalId: null,
                updatedAt: now,
              });
            } else if (confirmation.role === "affiliate") {
              // Affiliate: balance is on users/{userId} doc + restore commissions
              const userRef = db.collection("users").doc(confirmation.userId);
              transaction.update(userRef, {
                availableBalance: FieldValue.increment(refundAmount),
                pendingPayoutId: null,
                updatedAt: now,
              });

              // Restore affiliate commissions to "available"
              if (payoutSnap && payoutSnap.exists) {
                const payoutData = payoutSnap.data();
                if (payoutData && payoutData.commissionIds && Array.isArray(payoutData.commissionIds)) {
                  for (const commissionId of payoutData.commissionIds) {
                    transaction.update(
                      db.collection("affiliate_commissions").doc(commissionId),
                      { status: "available", payoutId: null, paidAt: null, updatedAt: now }
                    );
                  }
                }
              }
            } else {
              // Chatter/Influencer/Blogger/Captain/Partner: refund to their collection
              const roleCollections: Record<string, string> = {
                chatter: "chatters",
                influencer: "influencers",
                blogger: "bloggers",
                captain: "chatters",
                partner: "partners",
              };
              const col = roleCollections[confirmation.role];
              if (col) {
                const roleRef = db.collection(col).doc(confirmation.userId);
                transaction.update(roleRef, {
                  availableBalance: FieldValue.increment(refundAmount),
                  pendingWithdrawalId: null,
                  updatedAt: now,
                });
              }
            }
          });

          // 4. Edit Telegram message (outside transaction)
          if (confirmation.telegramMessageId) {
            await editMessageText(
              confirmation.telegramId,
              confirmation.telegramMessageId,
              `⏰ <b>Demande expirée</b>\n\nVotre demande de retrait de <b>$${(confirmation.amount / 100).toFixed(2)}</b> a expiré (15 min).\nLe montant a été recrédité à votre solde.\n\nVeuillez réessayer depuis l'application.`
            );
          }

          logger.info("[cleanupExpiredConfirmations] Expired confirmation processed", {
            code: confirmation.code,
            withdrawalId: confirmation.withdrawalId,
            userId: confirmation.userId,
          });
        } catch (error) {
          logger.error("[cleanupExpiredConfirmations] Error processing confirmation", {
            code: confirmation.code,
            error,
          });
        }
      }
    } catch (error) {
      logger.error("[cleanupExpiredConfirmations] Error", { error });
    }
  }
);

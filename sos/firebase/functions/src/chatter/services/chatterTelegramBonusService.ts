/**
 * Chatter Telegram Bonus Service
 *
 * Handles the Telegram onboarding bonus payout:
 * - $50 bonus credited to tirelire when chatter connects Telegram
 * - Unlocked/paid when chatter reaches $150 in direct client earnings
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { Chatter, REFERRAL_CONFIG } from "../types";
import { createCommission } from "./chatterCommissionService";
import { getClientEarnings } from "./chatterReferralService";

// ============================================================================
// TELEGRAM BONUS PAYOUT
// ============================================================================

/**
 * Check and pay Telegram bonus if eligible
 *
 * The Telegram bonus ($50) is credited to the chatter's "tirelire" (piggy bank)
 * when they connect Telegram, but is only unlocked/paid when they reach
 * $150 in direct client earnings.
 *
 * This should be called after commission creation (in onCallCompleted)
 * to check if the earnings threshold has been reached.
 */
export async function checkAndPayTelegramBonus(
  chatterId: string
): Promise<{ paid: boolean; amount?: number }> {
  const db = getFirestore();

  try {
    // 1. Read chatter doc
    const chatterDoc = await db.collection("chatters").doc(chatterId).get();
    if (!chatterDoc.exists) {
      return { paid: false };
    }

    const chatter = chatterDoc.data() as Chatter;

    // 2. Check: telegramBonusCredited === true && telegramBonusPaid !== true
    if (!chatter.telegramBonusCredited || chatter.telegramBonusPaid) {
      return { paid: false };
    }

    // 3. Check: clientEarnings >= UNLOCK_THRESHOLD ($150)
    const clientEarnings = getClientEarnings(chatter);
    const threshold = REFERRAL_CONFIG.TELEGRAM_BONUS.UNLOCK_THRESHOLD;

    if (clientEarnings < threshold) {
      return { paid: false };
    }

    // 4. Create commission type "bonus_telegram"
    const bonusAmount = chatter.telegramBonusAmount || REFERRAL_CONFIG.TELEGRAM_BONUS.AMOUNT;

    const commissionResult = await createCommission({
      chatterId,
      type: "bonus_telegram",
      source: {
        id: null,
        type: "bonus",
        details: {
          bonusType: "telegram_onboarding",
          bonusReason: "Bonus connexion Telegram debloque",
        },
      },
      baseAmount: bonusAmount,
      description: `Bonus Telegram $${(bonusAmount / 100).toFixed(0)} debloque (seuil $${(threshold / 100).toFixed(0)} atteint)`,
      skipFraudCheck: true,
    });

    if (!commissionResult.success) {
      logger.error("[checkAndPayTelegramBonus] Failed to create commission", {
        chatterId,
        error: commissionResult.error,
      });
      return { paid: false };
    }

    // 5. Update chatter: telegramBonusPaid = true
    const now = Timestamp.now();
    await db.collection("chatters").doc(chatterId).update({
      telegramBonusPaid: true,
      telegramBonusPaidAt: now,
      updatedAt: now,
    });

    // 6. Create notification
    const notificationRef = db.collection("chatter_notifications").doc();
    await notificationRef.set({
      id: notificationRef.id,
      chatterId,
      type: "telegram_bonus_paid",
      title: "Bonus Telegram debloque !",
      message: `Votre bonus de $${(bonusAmount / 100).toFixed(0)} pour avoir connecte Telegram a ete debloque ! Il est maintenant disponible.`,
      data: {
        commissionId: commissionResult.commissionId,
        amount: bonusAmount,
      },
      isRead: false,
      emailSent: false,
      createdAt: now,
    });

    logger.info("[checkAndPayTelegramBonus] Telegram bonus paid", {
      chatterId,
      amount: bonusAmount,
      commissionId: commissionResult.commissionId,
      clientEarnings,
      threshold,
    });

    // 7. Return success
    return { paid: true, amount: bonusAmount };
  } catch (error) {
    logger.error("[checkAndPayTelegramBonus] Error", { chatterId, error });
    return { paid: false };
  }
}

/**
 * Telegram Trigger: onPayoutFailed
 *
 * Triggered when a payout fails (document created in paypal_payouts_failed).
 * Sends an IMMEDIATE Telegram notification to admins so they can act fast.
 *
 * Covers:
 * - INSUFFICIENT_FUNDS on the PayPal business account
 * - Invalid provider PayPal email
 * - PayPal API errors
 * - Any other payout failure
 *
 * This is critical because blocked money = provider not paid = bad UX.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";

import {
  TELEGRAM_ENGINE_URL_SECRET,
  TELEGRAM_ENGINE_API_KEY_SECRET,
} from "../../lib/secrets";
import { forwardEventToEngine } from "../forwardToEngine";

const LOG_PREFIX = "[telegramOnPayoutFailed]";
const PARIS_TIMEZONE = "Europe/Paris";

function formatDateTimeParis(date: Date): string {
  return date.toLocaleString("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const telegramOnPayoutFailed = onDocumentCreated(
  {
    region: "europe-west3",
    document: "paypal_payouts_failed/{docId}",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_ENGINE_URL_SECRET, TELEGRAM_ENGINE_API_KEY_SECRET],
  },
  async (event) => {
    const docId = event.params.docId;

    logger.info(`${LOG_PREFIX} New payout failure detected`, { docId });

    try {
      const snapshot = event.data;
      if (!snapshot) {
        logger.warn(`${LOG_PREFIX} No data in event`, { docId });
        return;
      }

      const data = snapshot.data();
      const providerId = data.providerId || "N/A";
      const providerEmail = data.providerPayPalEmail || "N/A";
      const amount = data.amount || 0;
      const currency = data.currency || "EUR";
      const sessionId = data.sessionId || "N/A";
      const error = data.error || "Erreur inconnue";
      const createdAt = data.createdAt?.toDate() || new Date();

      // Determine severity based on error type
      const isInsufficientFunds = error.toLowerCase().includes("insufficient")
        || error.toLowerCase().includes("funds")
        || error.toLowerCase().includes("balance");

      const severity = isInsufficientFunds ? "CRITIQUE" : "HAUTE";
      const emoji = isInsufficientFunds ? "\u{1F6A8}" : "\u26A0\uFE0F";

      logger.info(`${LOG_PREFIX} Forwarding to Telegram Engine`, {
        docId,
        providerId,
        amount,
        severity,
      });

      await forwardEventToEngine("payout.failed", providerId, {
        docId,
        providerId,
        providerEmail,
        amount: typeof amount === "number" ? amount.toFixed(2) : String(amount),
        currency,
        sessionId,
        error,
        severity,
        emoji,
        dateTime: formatDateTimeParis(createdAt),
        isInsufficientFunds,
      });

      logger.info(`${LOG_PREFIX} Telegram notification sent`, { docId });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      logger.error(`${LOG_PREFIX} Error sending notification`, {
        docId,
        error: errorMessage,
      });
    }
  }
);

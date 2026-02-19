/**
 * Shared Wise Webhook Utilities
 *
 * P2 FIX: Extracted from both wiseWebhook (affiliate) and paymentWebhookWise (payments)
 * to avoid code duplication. Both endpoints verify signatures the same way.
 *
 * Wise sends webhooks signed with HMAC-SHA256 in the x-signature-sha256 header.
 */

import * as crypto from "crypto";
import { logger } from "firebase-functions/v2";

/**
 * Verifies a Wise webhook signature using HMAC SHA256 (timing-safe).
 *
 * @param payload - Raw JSON string body of the webhook request
 * @param signature - Value of x-signature-sha256 header from Wise
 * @param secret - Wise webhook secret from Secret Manager
 * @returns true if valid (or if secret not configured in dev mode), false otherwise
 */
export function verifyWiseWebhookSignature(
  payload: string,
  signature: string | undefined,
  secret: string | undefined
): boolean {
  // If secret is not configured, skip verification (dev/sandbox mode)
  if (!secret || secret === "not_configured") {
    logger.warn("[WiseWebhook] Signature verification skipped — WISE_WEBHOOK_SECRET not configured");
    return true;
  }

  if (!signature) {
    logger.warn("[WiseWebhook] Missing x-signature-sha256 header");
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Use timingSafeEqual with length check to prevent timing attacks
    const sigBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expectedSignature, "utf8");

    if (sigBuffer.length !== expectedBuffer.length) return false;
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (err) {
    logger.error("[WiseWebhook] Signature verification error", err);
    return false;
  }
}

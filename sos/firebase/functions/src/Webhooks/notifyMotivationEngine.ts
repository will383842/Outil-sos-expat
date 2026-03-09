/**
 * Motivation Engine Webhook Integration
 *
 * Sends chatter lifecycle events to the Motivation Engine (Laravel)
 * for gamification, sequences, and engagement tracking.
 *
 * Security: HMAC-SHA256 signature + replay protection (timestamp)
 * Reliability: Non-blocking (never fails the calling function)
 * Idempotency: X-Idempotency-Key header prevents duplicate processing
 */

import * as functions from "firebase-functions";
import crypto from "crypto";
import { MOTIVATION_ENGINE_WEBHOOK_SECRET } from "../lib/secrets";

const MOTIVATION_ENGINE_URL =
  process.env.MOTIVATION_ENGINE_WEBHOOK_URL ||
  "https://motivation.life-expat.com/api/webhook";

// ============================================================================
// TYPES
// ============================================================================

export type MotivationEventType =
  | "chatter.registered"
  | "chatter.telegram_linked"
  | "chatter.first_sale"
  | "chatter.sale_completed"
  | "chatter.withdrawal"
  | "chatter.level_up"
  | "chatter.status_changed"
  | "chatter.profile_updated"
  | "chatter.referral_signup"
  | "chatter.referral_activated"
  | "chatter.deleted"
  | "chatter.click_tracked"
  | "chatter.training_completed"
  | "chatter.withdrawal_status_changed"
  | "chatter.zoom_attended"
  | "chatter.captain_promoted"
  | "chatter.streak_freeze_purchased";

export interface MotivationWebhookPayload {
  event: MotivationEventType;
  uid: string;
  data: Record<string, unknown>;
  occurredAt: string;
}

// ============================================================================
// HMAC SIGNATURE
// ============================================================================

function signPayload(timestamp: string, body: string, secret: string): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}

function generateIdempotencyKey(event: MotivationEventType, uid: string, data: Record<string, unknown>): string {
  // Use a unique identifier from data if available, otherwise uid + timestamp
  const uniquePart =
    (data.transactionId as string) ||
    (data.callId as string) ||
    (data.withdrawalId as string) ||
    (data.commissionId as string) ||
    (data.meetingId as string) ||
    (data.moduleId as string) ||
    uid;
  return `${event}-${uid}-${uniquePart}`;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Send a webhook event to the Motivation Engine.
 *
 * Non-blocking: catches all errors internally, never throws.
 * Call with .catch() as extra safety but it should never reject.
 */
export async function notifyMotivationEngine(
  event: MotivationEventType,
  uid: string,
  data: Record<string, unknown>
): Promise<void> {
  // Access secret at call time
  let webhookSecret: string;
  try {
    webhookSecret = MOTIVATION_ENGINE_WEBHOOK_SECRET.value();
  } catch {
    webhookSecret = process.env.MOTIVATION_ENGINE_WEBHOOK_SECRET || "";
  }

  if (!webhookSecret) {
    functions.logger.warn("[MotivationEngine] MOTIVATION_ENGINE_WEBHOOK_SECRET not configured, skipping");
    return;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const payload: MotivationWebhookPayload = {
    event,
    uid,
    data,
    occurredAt: new Date().toISOString(),
  };

  const body = JSON.stringify(payload);
  const signature = signPayload(timestamp, body, webhookSecret);
  const idempotencyKey = generateIdempotencyKey(event, uid, data);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(MOTIVATION_ENGINE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": timestamp,
        "X-Idempotency-Key": idempotencyKey,
      },
      body,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text().catch(() => "unable to read body");
      functions.logger.error("[MotivationEngine] Webhook failed", {
        event,
        uid,
        status: response.status,
        error: errorText.substring(0, 500),
      });
      return;
    }

    functions.logger.info("[MotivationEngine] Webhook sent", { event, uid });
  } catch (error) {
    functions.logger.error("[MotivationEngine] Webhook error", {
      event,
      uid,
      error: error instanceof Error ? error.message : String(error),
    });
    // Never throw — calling function must not fail because of webhook
  }
}

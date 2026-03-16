/**
 * Partner Engine Integration Triggers
 *
 * 1. handlePartnerSubscriberRegistered — Forwards user registration to Partner Engine
 *    when a new user has a partnerInviteToken (subscriber invited by a partner).
 *
 * 2. forwardCallToPartnerEngine — Forwards call-completed events to Partner Engine
 *    when the calling client is a partner subscriber.
 *
 * These handlers are called from consolidated triggers, not deployed as standalone.
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { defineSecret } from "firebase-functions/params";

// Secrets
export const PARTNER_ENGINE_URL_SECRET = defineSecret("PARTNER_ENGINE_URL");
export const PARTNER_ENGINE_API_KEY_SECRET = defineSecret("PARTNER_ENGINE_API_KEY");

// ============================================================================
// HELPER: Call Partner Engine API
// ============================================================================

async function callPartnerEngine(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<boolean> {
  const baseUrl = process.env.PARTNER_ENGINE_URL || PARTNER_ENGINE_URL_SECRET.value();
  const apiKey = process.env.PARTNER_ENGINE_API_KEY || PARTNER_ENGINE_API_KEY_SECRET.value();

  if (!baseUrl || !apiKey) {
    logger.warn("[PartnerEngine] Missing PARTNER_ENGINE_URL or PARTNER_ENGINE_API_KEY");
    return false;
  }

  const url = `${baseUrl.replace(/\/+$/, "")}${endpoint}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Engine-Secret": apiKey,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      logger.error("[PartnerEngine] API error", {
        endpoint,
        status: response.status,
        body: text.substring(0, 500),
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error("[PartnerEngine] Network error", {
      endpoint,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

// ============================================================================
// 1. HANDLER: User registered with partnerInviteToken
// ============================================================================

/**
 * Called from consolidatedOnUserCreated when a new user has partnerInviteToken.
 * Forwards the registration event to the Partner Engine so it can:
 * - Update subscriber status to "registered"
 * - Set firebase_uid on the subscriber
 * - Sync Firestore partner_subscribers doc
 */
export async function handlePartnerSubscriberRegistered(
  event: { params: { userId: string }; data?: { data: () => Record<string, unknown> | undefined } }
): Promise<void> {
  const userId = event.params.userId;
  const userData = event.data?.data();

  if (!userData) return;

  const inviteToken = userData.partnerInviteToken as string | undefined;
  if (!inviteToken) return; // Not a partner subscriber

  const email = (userData.email as string) || "";

  logger.info("[PartnerEngine] Forwarding subscriber registration", {
    userId,
    inviteToken,
    email,
  });

  const success = await callPartnerEngine("/api/webhooks/subscriber-registered", {
    firebaseUid: userId,
    email,
    inviteToken,
  });

  if (success) {
    // Update user doc to mark as processed
    try {
      const db = getFirestore();
      await db.collection("users").doc(userId).update({
        partnerSubscriberLinked: true,
        partnerSubscriberLinkedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.warn("[PartnerEngine] Could not update user doc", { userId, err });
    }
  }

  logger.info("[PartnerEngine] Subscriber registration forwarded", {
    userId,
    success,
  });
}

// ============================================================================
// 2. HANDLER: Call completed for a partner subscriber
// ============================================================================

/**
 * Called from the partner onCallCompleted handler (or consolidated trigger).
 * Forwards the call event to the Partner Engine so it can:
 * - Track subscriber activity
 * - Create commission in partner_commissions (Firestore)
 * - Update partner balance
 */
export async function forwardCallToPartnerEngine(params: {
  callSessionId: string;
  clientUid: string;
  providerType: "lawyer" | "expat";
  duration: number;
  amountPaidCents: number;
  discountAppliedCents: number;
  partnerId: string;
}): Promise<boolean> {
  logger.info("[PartnerEngine] Forwarding call-completed", {
    callSessionId: params.callSessionId,
    clientUid: params.clientUid,
    partnerId: params.partnerId,
  });

  // Check if the client is a partner subscriber (has partner_subscribers doc)
  const db = getFirestore();
  const subscriberQuery = await db
    .collection("partner_subscribers")
    .where("firebaseUid", "==", params.clientUid)
    .where("status", "in", ["registered", "active"])
    .limit(1)
    .get();

  if (subscriberQuery.empty) {
    // Not a partner subscriber — skip Partner Engine, let normal Firebase commission flow handle it
    return false;
  }

  const subscriberDoc = subscriberQuery.docs[0];
  const subscriberData = subscriberDoc.data();

  // Check agreement is not paused
  if (subscriberData.agreementPaused === true) {
    logger.info("[PartnerEngine] Agreement paused, skipping", {
      callSessionId: params.callSessionId,
      subscriberToken: subscriberDoc.id,
    });
    return false;
  }

  return callPartnerEngine("/api/webhooks/call-completed", {
    callSessionId: params.callSessionId,
    clientUid: params.clientUid,
    providerType: params.providerType,
    duration: params.duration,
    amountPaidCents: params.amountPaidCents,
    discountAppliedCents: params.discountAppliedCents,
    partnerReferredBy: params.partnerId,
    subscriberInviteToken: subscriberDoc.id,
  });
}

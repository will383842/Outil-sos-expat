/**
 * Webhook integration with Backlink Engine
 *
 * When a user registers on SOS Expat (client, blogger, provider, influencer, chatter, etc.),
 * we notify Backlink Engine to stop all prospecting campaigns for this email.
 *
 * Why? We don't prospect our own ecosystem!
 */

import * as functions from "firebase-functions";

const BACKLINK_ENGINE_WEBHOOK_URL =
  process.env.BACKLINK_ENGINE_WEBHOOK_URL ||
  "https://backlinks.life-expat.com/api/webhooks/sos-expat/user-registered";

const BACKLINK_ENGINE_WEBHOOK_SECRET =
  process.env.BACKLINK_ENGINE_WEBHOOK_SECRET ||
  "I4NMfTj2Ct8IVR9YDEcaM4NkuktzQ0b";

interface NotifyBacklinkEngineParams {
  email: string;
  userId: string;
  userType: "client" | "blogger" | "provider" | "influencer" | "chatter" | "group_admin" | "other";
  firstName?: string;
  lastName?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

interface BacklinkEngineWebhookResponse {
  actionsPerformed?: string[];
  [key: string]: unknown;
}

/**
 * Notify Backlink Engine when a user registers on SOS Expat
 * to stop all prospecting campaigns for this email
 */
export async function notifyBacklinkEngineUserRegistered(
  params: NotifyBacklinkEngineParams
): Promise<void> {
  const { email, userId, userType, firstName, lastName, phone, metadata } = params;

  if (!BACKLINK_ENGINE_WEBHOOK_SECRET) {
    functions.logger.warn("BACKLINK_ENGINE_WEBHOOK_SECRET not configured, skipping webhook");
    return;
  }

  try {
    const response = await fetch(BACKLINK_ENGINE_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-webhook-secret": BACKLINK_ENGINE_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        email,
        userId,
        userType,
        firstName,
        lastName,
        phone,
        registeredAt: new Date().toISOString(),
        metadata,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      functions.logger.error("Backlink Engine webhook failed:", {
        status: response.status,
        error: errorText,
        email,
        userType,
      });
      // Don't throw - user registration should succeed even if webhook fails
      return;
    }

    const result = await response.json() as BacklinkEngineWebhookResponse;
    functions.logger.info("Backlink Engine webhook success:", {
      email,
      userType,
      actionsPerformed: result.actionsPerformed,
    });
  } catch (error) {
    functions.logger.error("Failed to notify Backlink Engine:", {
      error: error instanceof Error ? error.message : String(error),
      email,
      userType,
    });
    // Don't throw - user registration should succeed even if webhook fails
  }
}

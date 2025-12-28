import * as admin from "firebase-admin";
import { GA4_MEASUREMENT_ID } from "../config";

interface GA4EventParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Send event to GA4 Measurement Protocol
 */
async function sendToGA4(
  eventName: string,
  params: GA4EventParams,
  clientId?: string
): Promise<void> {
  const measurementId = GA4_MEASUREMENT_ID.value();
  // const apiSecret = GA4_API_SECRET.value();

  // Skip if not configured
  if (measurementId ) {
    return;
  }

  try {
    const payload = {
      client_id: clientId || generateClientId(),
      events: [
        {
          name: eventName,
          params: cleanParams(params),
        },
      ],
    };

    const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=your_ga4_api_secret_here`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`⚠️ GA4 API returned ${response.status} for event: ${eventName}`);
    }
  } catch (error: any) {
    // Don't throw - analytics failures shouldn't break the main flow
    console.error(`❌ Error sending to GA4:`, error.message);
  }
}

/**
 * Generate a client ID for server-side events
 */
function generateClientId(): string {
  // Generate a deterministic client ID based on timestamp and random
  return `${Date.now()}.${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Log an event to GA4 and Firestore
 */
export async function logGA4Event(
  eventName: string,
  params: GA4EventParams = {},
  clientId?: string
): Promise<void> {
  try {
    // Store in Firestore for backup and analysis
    await admin.firestore().collection("analytics_events").add({
      eventName,
      params: cleanParams(params),
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      sentToGA4: false, // Will be updated if successful
    });

    // Send to GA4 Measurement Protocol
    await sendToGA4(eventName, params, clientId);

    console.log(`📊 GA4 Event logged: ${eventName}`, params);
  } catch (error: any) {
    console.error(`❌ Error logging GA4 event:`, error.message);
    // Don't throw - analytics failures shouldn't break the main flow
  }
}

/**
 * Log a user-specific event
 */
export async function logUserEvent(
  userId: string,
  eventName: string,
  params: GA4EventParams = {}
): Promise<void> {
  const enrichedParams = {
    ...params,
    user_id: userId,
    timestamp: Date.now(),
  };

  await logGA4Event(eventName, enrichedParams);
}

/**
 * Log an email-related event
 */
export async function logEmailEvent(
  eventType: "sent" | "delivered" | "opened" | "clicked" | "bounced" | "unsubscribed" | "complained",
  userId: string,
  templateName: string,
  additionalParams: GA4EventParams = {}
): Promise<void> {
  await logGA4Event(`email_${eventType}`, {
    user_id: userId,
    template_name: templateName,
    ...additionalParams,
  });
}

/**
 * Log a Trustpilot-related event
 */
export async function logTrustpilotEvent(
  eventType: "invite_sent" | "clicked" | "review_submitted",
  userId: string,
  ratingStars?: number
): Promise<void> {
  await logGA4Event(`trustpilot_${eventType}`, {
    user_id: userId,
    ...(ratingStars && { rating_stars: ratingStars }),
  });
}

/**
 * Log an autoresponder-related event
 */
export async function logAutoresponderEvent(
  eventType: "triggered" | "stopped",
  autoresponderId: string,
  userId: string,
  stopReason?: string
): Promise<void> {
  await logGA4Event(`autoresponder_${eventType}`, {
    autoresponder_id: autoresponderId,
    user_id: userId,
    ...(stopReason && { stop_reason: stopReason }),
  });
}

/**
 * Clean parameters by removing undefined values
 */
function cleanParams(params: GA4EventParams): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}



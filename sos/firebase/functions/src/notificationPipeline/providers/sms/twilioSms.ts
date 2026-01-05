import { getTwilioClient, getTwilioPhoneNumber } from "../../../lib/twilio";
import * as admin from "firebase-admin";

// ============================================================================
// P0 SECURITY: Rate limiting pour éviter les abus de coûts Twilio
// ============================================================================

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// Rate limit: 10 SMS par numéro par heure, 100 SMS globaux par heure
const SMS_RATE_LIMIT = {
  PER_NUMBER_MAX: 10,
  GLOBAL_MAX: 100,
  WINDOW_MS: 60 * 60 * 1000, // 1 heure
};

// Cache en mémoire pour rate limiting (reset à chaque cold start)
const rateLimitCache: Map<string, RateLimitEntry> = new Map();

async function checkRateLimit(to: string): Promise<{ allowed: boolean; reason?: string }> {
  const now = Date.now();
  const db = admin.firestore();

  // 1. Check rate limit par numéro de destination
  const perNumberKey = `sms:${to}`;
  const perNumberEntry = rateLimitCache.get(perNumberKey);

  if (perNumberEntry) {
    if (now - perNumberEntry.windowStart > SMS_RATE_LIMIT.WINDOW_MS) {
      // Reset window
      rateLimitCache.set(perNumberKey, { count: 1, windowStart: now });
    } else if (perNumberEntry.count >= SMS_RATE_LIMIT.PER_NUMBER_MAX) {
      console.warn(`🚫 [SMS] Rate limit exceeded for number ${to.slice(0, 5)}***: ${perNumberEntry.count}/${SMS_RATE_LIMIT.PER_NUMBER_MAX}`);
      return { allowed: false, reason: `Rate limit exceeded: max ${SMS_RATE_LIMIT.PER_NUMBER_MAX} SMS per hour per number` };
    } else {
      perNumberEntry.count++;
    }
  } else {
    rateLimitCache.set(perNumberKey, { count: 1, windowStart: now });
  }

  // 2. Check rate limit global via Firestore (persistant)
  const globalRef = db.collection("rate_limits").doc("sms_global");

  try {
    const result = await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(globalRef);
      const data = doc.data();

      if (!data || now - data.windowStart > SMS_RATE_LIMIT.WINDOW_MS) {
        // Reset window
        transaction.set(globalRef, { count: 1, windowStart: now });
        return { allowed: true };
      }

      if (data.count >= SMS_RATE_LIMIT.GLOBAL_MAX) {
        return { allowed: false, reason: `Global rate limit exceeded: max ${SMS_RATE_LIMIT.GLOBAL_MAX} SMS per hour` };
      }

      transaction.update(globalRef, { count: admin.firestore.FieldValue.increment(1) });
      return { allowed: true };
    });

    return result;
  } catch (error) {
    console.error("🚫 [SMS] Rate limit check failed:", error);
    // En cas d'erreur, permettre l'envoi mais logger
    return { allowed: true };
  }
}

export async function sendSms(to: string, text: string): Promise<string> {
  // P0 SECURITY: Check rate limit avant envoi
  const rateLimitCheck = await checkRateLimit(to);
  if (!rateLimitCheck.allowed) {
    console.error(`🚫 [SMS] BLOCKED by rate limit: ${rateLimitCheck.reason}`);
    throw new Error(`SMS rate limit exceeded: ${rateLimitCheck.reason}`);
  }

  const client = getTwilioClient();
  const from = getTwilioPhoneNumber();
  console.log(`📱 [SMS] Sending SMS to ${to.slice(0, 5)}*** from ${from}`);
  const res = await client.messages.create({ to, from, body: text });
  console.log(`✅ [SMS] Message sent with SID: ${res.sid}`);
  return res.sid;
}

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
  // ============================================================================
  // DEBUG LOGGING: Trace complet de l'envoi SMS
  // ============================================================================
  const debugId = `sms_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  console.log(`📱 [TwilioSMS][${debugId}] ========== SEND SMS START ==========`);
  console.log(`📱 [TwilioSMS][${debugId}] Destination: ${to ? `${to.slice(0, 5)}***${to.slice(-2)}` : 'NULL/UNDEFINED'}`);
  console.log(`📱 [TwilioSMS][${debugId}] Text length: ${text?.length || 0} chars`);
  console.log(`📱 [TwilioSMS][${debugId}] Text preview: ${text?.slice(0, 50)}...`);

  // Validation du numéro de destination
  if (!to || typeof to !== 'string') {
    console.error(`❌ [TwilioSMS][${debugId}] ERREUR: Numéro de destination invalide: ${to}`);
    throw new Error(`SMS destination invalide: ${to}`);
  }

  if (!to.startsWith('+')) {
    console.warn(`⚠️ [TwilioSMS][${debugId}] ATTENTION: Numéro sans préfixe international: ${to}`);
  }

  // P0 SECURITY: Check rate limit avant envoi
  console.log(`📱 [TwilioSMS][${debugId}] Step 1: Checking rate limit...`);
  const rateLimitCheck = await checkRateLimit(to);
  console.log(`📱 [TwilioSMS][${debugId}] Rate limit result: allowed=${rateLimitCheck.allowed}, reason=${rateLimitCheck.reason || 'N/A'}`);

  if (!rateLimitCheck.allowed) {
    console.error(`🚫 [TwilioSMS][${debugId}] BLOCKED by rate limit: ${rateLimitCheck.reason}`);
    throw new Error(`SMS rate limit exceeded: ${rateLimitCheck.reason}`);
  }

  console.log(`📱 [TwilioSMS][${debugId}] Step 2: Getting Twilio client...`);
  let client;
  try {
    client = getTwilioClient();
    console.log(`📱 [TwilioSMS][${debugId}] Twilio client obtained: ${client ? 'OK' : 'NULL'}`);
  } catch (clientError) {
    console.error(`❌ [TwilioSMS][${debugId}] ERREUR Twilio client:`, clientError);
    throw clientError;
  }

  console.log(`📱 [TwilioSMS][${debugId}] Step 3: Getting Twilio phone number...`);
  let from;
  try {
    from = getTwilioPhoneNumber();
    console.log(`📱 [TwilioSMS][${debugId}] From number: ${from ? `${from.slice(0, 5)}***` : 'NULL/UNDEFINED'}`);
  } catch (phoneError) {
    console.error(`❌ [TwilioSMS][${debugId}] ERREUR récupération numéro Twilio:`, phoneError);
    throw phoneError;
  }

  if (!from) {
    console.error(`❌ [TwilioSMS][${debugId}] ERREUR: Numéro Twilio source non configuré!`);
    throw new Error('TWILIO_PHONE_NUMBER non configuré');
  }

  console.log(`📱 [TwilioSMS][${debugId}] Step 4: Creating Twilio message...`);
  console.log(`📱 [TwilioSMS][${debugId}] Payload: { to: ${to.slice(0, 5)}***, from: ${from.slice(0, 5)}***, body: ${text?.length} chars }`);

  try {
    const res = await client.messages.create({ to, from, body: text });
    console.log(`✅ [TwilioSMS][${debugId}] ========== SMS SENT SUCCESSFULLY ==========`);
    console.log(`✅ [TwilioSMS][${debugId}] Message SID: ${res.sid}`);
    console.log(`✅ [TwilioSMS][${debugId}] Status: ${res.status}`);
    console.log(`✅ [TwilioSMS][${debugId}] To: ${res.to}`);
    console.log(`✅ [TwilioSMS][${debugId}] Price: ${res.price || 'pending'} ${res.priceUnit || ''}`);
    return res.sid;
  } catch (sendError: unknown) {
    console.error(`❌ [TwilioSMS][${debugId}] ========== SMS SEND FAILED ==========`);
    console.error(`❌ [TwilioSMS][${debugId}] Error type: ${(sendError as Error)?.constructor?.name}`);
    console.error(`❌ [TwilioSMS][${debugId}] Error message: ${(sendError as Error)?.message}`);
    console.error(`❌ [TwilioSMS][${debugId}] Error code: ${(sendError as {code?: number})?.code || 'N/A'}`);
    console.error(`❌ [TwilioSMS][${debugId}] Full error:`, sendError);
    throw sendError;
  }
}

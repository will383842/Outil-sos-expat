import twilio from "twilio";
import { Request, Response } from "express";
import { defineSecret } from "firebase-functions/params";

// ============================================================================
// P0 CRITICAL FIX: Use Firebase v2 defineSecret instead of process.env
// process.env does NOT work for Firebase v2 secrets!
// ============================================================================

// Define secrets using Firebase v2 params
const TWILIO_ACCOUNT_SID_SECRET = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN_SECRET = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER_SECRET = defineSecret("TWILIO_PHONE_NUMBER");

// Fallback to process.env for backwards compatibility (emulator, local dev)
function getAccountSid(): string {
  // Try Firebase v2 secret first
  try {
    const secretValue = TWILIO_ACCOUNT_SID_SECRET.value();
    if (secretValue && secretValue.length > 0) {
      console.log(`🔐 [Twilio] ACCOUNT_SID loaded from Firebase Secret (length: ${secretValue.length})`);
      return secretValue;
    }
  } catch (e) {
    console.log(`⚠️ [Twilio] Firebase Secret not available, trying process.env`);
  }

  // Fallback to process.env
  const envValue = process.env.TWILIO_ACCOUNT_SID;
  if (envValue && envValue.length > 0) {
    console.log(`🔐 [Twilio] ACCOUNT_SID loaded from process.env (length: ${envValue.length})`);
    return envValue;
  }

  console.error(`❌ [Twilio] ACCOUNT_SID NOT FOUND in Secret OR process.env`);
  return "";
}

function getAuthToken(): string {
  // Try Firebase v2 secret first
  try {
    const secretValue = TWILIO_AUTH_TOKEN_SECRET.value();
    if (secretValue && secretValue.length > 0) {
      console.log(`🔐 [Twilio] AUTH_TOKEN loaded from Firebase Secret (length: ${secretValue.length})`);
      return secretValue;
    }
  } catch (e) {
    console.log(`⚠️ [Twilio] Firebase Secret not available, trying process.env`);
  }

  // Fallback to process.env
  const envValue = process.env.TWILIO_AUTH_TOKEN;
  if (envValue && envValue.length > 0) {
    console.log(`🔐 [Twilio] AUTH_TOKEN loaded from process.env (length: ${envValue.length})`);
    return envValue;
  }

  console.error(`❌ [Twilio] AUTH_TOKEN NOT FOUND in Secret OR process.env`);
  return "";
}

function getPhoneNumber(): string {
  // Try Firebase v2 secret first
  try {
    const secretValue = TWILIO_PHONE_NUMBER_SECRET.value();
    if (secretValue && secretValue.length > 0) {
      console.log(`🔐 [Twilio] PHONE_NUMBER loaded from Firebase Secret: ${secretValue.substring(0, 5)}...`);
      return secretValue;
    }
  } catch (e) {
    console.log(`⚠️ [Twilio] Firebase Secret not available, trying process.env`);
  }

  // Fallback to process.env
  const envValue = process.env.TWILIO_PHONE_NUMBER;
  if (envValue && envValue.length > 0) {
    console.log(`🔐 [Twilio] PHONE_NUMBER loaded from process.env: ${envValue.substring(0, 5)}...`);
    return envValue;
  }

  console.error(`❌ [Twilio] PHONE_NUMBER NOT FOUND in Secret OR process.env`);
  return "";
}

export function getTwilioClient() {
  console.log(`📞 [Twilio] === getTwilioClient() CALLED ===`);

  const accountSid = getAccountSid();
  const authToken = getAuthToken();

  console.log(`📞 [Twilio] Credential check:`, {
    hasAccountSid: !!accountSid,
    accountSidLength: accountSid?.length || 0,
    accountSidPrefix: accountSid ? accountSid.substring(0, 6) : 'MISSING',
    hasAuthToken: !!authToken,
    authTokenLength: authToken?.length || 0,
  });

  if (!accountSid || !authToken) {
    console.error(`❌ [Twilio] CRITICAL: Twilio credentials missing!`);
    console.error(`❌ [Twilio] ACCOUNT_SID: ${accountSid ? 'OK' : 'MISSING'}`);
    console.error(`❌ [Twilio] AUTH_TOKEN: ${authToken ? 'OK' : 'MISSING'}`);
    throw new Error("Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN). Check Firebase Secrets.");
  }

  console.log(`✅ [Twilio] Creating Twilio client with SID: ${accountSid.substring(0, 6)}...`);
  return twilio(accountSid, authToken);
}

export function getTwilioPhoneNumber() {
  console.log(`📞 [Twilio] === getTwilioPhoneNumber() CALLED ===`);

  const phoneNumber = getPhoneNumber();

  if (!phoneNumber) {
    console.error(`❌ [Twilio] CRITICAL: TWILIO_PHONE_NUMBER missing!`);
    throw new Error("TWILIO_PHONE_NUMBER missing. Check Firebase Secrets.");
  }

  console.log(`✅ [Twilio] Phone number: ${phoneNumber.substring(0, 5)}...`);
  return phoneNumber;
}

// Export secrets for functions that need to declare them
export { TWILIO_ACCOUNT_SID_SECRET, TWILIO_AUTH_TOKEN_SECRET, TWILIO_PHONE_NUMBER_SECRET };

/**
 * Valide la signature d'un webhook Twilio
 *
 * IMPORTANT: Cette validation protege contre les attaques de spoofing
 * ou quelqu'un pourrait envoyer de faux evenements webhook.
 *
 * @param req - La requete Express/Firebase
 * @param res - La reponse Express (pour renvoyer 403 si invalide)
 * @returns true si la signature est valide, false sinon
 */
export function validateTwilioWebhookSignature(
  req: Request,
  res?: Response
): boolean {
  // En mode emulateur, on skip la validation pour faciliter le dev
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    console.log("[TWILIO_VALIDATION] Skipping validation in emulator mode");
    return true;
  }

  // P0 CRITICAL FIX: Use getAuthToken() instead of process.env.TWILIO_AUTH_TOKEN
  // process.env does NOT work for Firebase v2 secrets!
  const authToken = getAuthToken();
  if (!authToken) {
    console.error("[TWILIO_VALIDATION] Missing TWILIO_AUTH_TOKEN - getAuthToken() returned empty");
    if (res) res.status(500).send("Server configuration error");
    return false;
  }

  // Recuperer la signature du header
  const twilioSignature = req.headers["x-twilio-signature"] as string;
  if (!twilioSignature) {
    console.error("[TWILIO_VALIDATION] Missing X-Twilio-Signature header");
    if (res) res.status(403).send("Forbidden: Missing signature");
    return false;
  }

  // Construire l'URL complete du webhook
  // Firebase Functions met le protocol dans x-forwarded-proto
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host || "";

  // Firebase Functions: req.originalUrl contient le path complet
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;

  // Les parametres POST du body
  const params = req.body || {};

  // Valider avec le SDK Twilio
  const isValid = twilio.validateRequest(
    authToken,
    twilioSignature,
    fullUrl,
    params
  );

  if (!isValid) {
    console.error("[TWILIO_VALIDATION] Invalid signature", {
      url: fullUrl,
      signaturePreview: twilioSignature.slice(0, 10) + "...",
      bodyKeys: Object.keys(params),
    });
    if (res) res.status(403).send("Forbidden: Invalid signature");
    return false;
  }

  console.log("[TWILIO_VALIDATION] Signature validated successfully");
  return true;
}

/**
 * Middleware Express pour valider les webhooks Twilio
 * Utiliser avec: app.use('/twilio-webhook', twilioValidationMiddleware, ...)
 */
export function twilioValidationMiddleware(
  req: Request,
  res: Response,
  next: () => void
): void {
  if (validateTwilioWebhookSignature(req, res)) {
    next();
  }
  // Si invalide, res.status(403) est deja envoye par validateTwilioWebhookSignature
}

/** Compat: certains fichiers importent encore ces constantes */
// Note: Ces exports sont des getters dynamiques pour compatibilité
export const getTwilioAccountSid = getAccountSid;
export const getTwilioAuthToken = getAuthToken;
export const getTwilioPhoneNumberExport = getPhoneNumber;

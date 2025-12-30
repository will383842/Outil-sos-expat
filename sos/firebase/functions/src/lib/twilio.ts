import twilio from "twilio";
import { Request, Response } from "express";

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID as string;
const AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN as string;
const PHONE_NUMBER  = process.env.TWILIO_PHONE_NUMBER as string;

export function getTwilioClient() {
  // SECURITY FIX: Removed credential logging - 2025-12-23
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    throw new Error("Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).");
  }
  return twilio(ACCOUNT_SID, AUTH_TOKEN);
}

export function getTwilioPhoneNumber() {
  if (!PHONE_NUMBER) throw new Error("TWILIO_PHONE_NUMBER missing.");
  // SECURITY FIX: Removed phone number logging - 2025-12-23
  return PHONE_NUMBER;
}

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

  // Recuperer le token d'auth Twilio
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    console.error("[TWILIO_VALIDATION] Missing TWILIO_AUTH_TOKEN");
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
export const TWILIO_ACCOUNT_SID = ACCOUNT_SID;
export const TWILIO_AUTH_TOKEN  = AUTH_TOKEN;
export const TWILIO_PHONE_NUMBER = PHONE_NUMBER;

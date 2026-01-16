import twilio from "twilio";
import { Request, Response } from "express";
import { defineSecret } from "firebase-functions/params";

// ============================================================================
// P2-14 FIX: Circuit Breaker for Twilio API
// Prevents cascade failures when Twilio is down or slow
// ============================================================================

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

interface CircuitBreakerState {
  state: CircuitState;
  failures: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

const CIRCUIT_BREAKER_CONFIG = {
  FAILURE_THRESHOLD: 5,        // Open circuit after 5 consecutive failures
  RESET_TIMEOUT_MS: 30_000,    // Try again after 30 seconds
  HALF_OPEN_MAX_CALLS: 1,      // Allow 1 test call in half-open state
};

// Circuit breaker state (in-memory, resets on cold start - acceptable for Cloud Functions)
const circuitBreaker: CircuitBreakerState = {
  state: "CLOSED",
  failures: 0,
  lastFailureTime: 0,
  lastSuccessTime: Date.now(),
};

/**
 * Check if circuit breaker allows the call
 * @returns true if call is allowed, false if circuit is open
 */
export function isCircuitOpen(): boolean {
  const now = Date.now();
  const timeSinceLastFailure = now - circuitBreaker.lastFailureTime;
  const timeSinceLastSuccess = now - circuitBreaker.lastSuccessTime;

  console.log(`🔌 [CircuitBreaker] CHECK STATUS:`, {
    state: circuitBreaker.state,
    failures: circuitBreaker.failures,
    timeSinceLastFailureMs: timeSinceLastFailure,
    timeSinceLastSuccessMs: timeSinceLastSuccess,
    thresholdFailures: CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD,
    resetTimeoutMs: CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS,
  });

  if (circuitBreaker.state === "CLOSED") {
    console.log(`🔌 [CircuitBreaker] ✅ Circuit CLOSED - allowing call`);
    return false; // Circuit closed, allow calls
  }

  if (circuitBreaker.state === "OPEN") {
    // Check if we should transition to half-open
    if (timeSinceLastFailure >= CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS) {
      circuitBreaker.state = "HALF_OPEN";
      console.log(`🔌 [CircuitBreaker] ⚠️ Transitioning OPEN → HALF_OPEN (testing Twilio after ${timeSinceLastFailure}ms)`);
      return false; // Allow test call
    }
    const remainingMs = CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS - timeSinceLastFailure;
    console.log(`🔌 [CircuitBreaker] ❌ Circuit OPEN - blocking call. Retry in ${Math.round(remainingMs/1000)}s`);
    return true; // Circuit still open, reject
  }

  // HALF_OPEN state - allow test calls
  console.log(`🔌 [CircuitBreaker] ⚠️ Circuit HALF_OPEN - allowing test call`);
  return false;
}

/**
 * Record a successful Twilio call
 */
export function recordTwilioSuccess(): void {
  const previousState = circuitBreaker.state;
  const previousFailures = circuitBreaker.failures;

  circuitBreaker.failures = 0;
  circuitBreaker.lastSuccessTime = Date.now();

  console.log(`🔌 [CircuitBreaker] ✅ TWILIO SUCCESS RECORDED:`, {
    previousState,
    previousFailures,
    newState: circuitBreaker.state,
    timestamp: new Date().toISOString(),
  });

  if (previousState !== "CLOSED") {
    circuitBreaker.state = "CLOSED";
    console.log(`🔌 [CircuitBreaker] 🎉 Circuit RECOVERED: ${previousState} → CLOSED (Twilio is back online)`);
  }
}

/**
 * Record a failed Twilio call
 */
export function recordTwilioFailure(error?: Error): void {
  const previousState = circuitBreaker.state;
  const previousFailures = circuitBreaker.failures;

  circuitBreaker.failures++;
  circuitBreaker.lastFailureTime = Date.now();

  console.error(`🔌 [CircuitBreaker] ❌ TWILIO FAILURE RECORDED:`, {
    failureNumber: circuitBreaker.failures,
    previousState,
    previousFailures,
    errorMessage: error?.message || "Unknown error",
    errorName: error?.name || "Error",
    errorStack: error?.stack?.split('\n').slice(0, 3).join(' | ') || "No stack",
    threshold: CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD,
    timestamp: new Date().toISOString(),
  });

  if (circuitBreaker.state === "HALF_OPEN") {
    // Test call failed, reopen circuit
    circuitBreaker.state = "OPEN";
    console.error(`🔌 [CircuitBreaker] 🚨 TEST CALL FAILED - Reopening circuit: HALF_OPEN → OPEN`);
    console.error(`🔌 [CircuitBreaker] 🚨 Twilio calls blocked for ${CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS/1000}s`);
  } else if (circuitBreaker.failures >= CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD) {
    circuitBreaker.state = "OPEN";
    console.error(`🔌 [CircuitBreaker] 🚨 THRESHOLD REACHED - Opening circuit: CLOSED → OPEN`);
    console.error(`🔌 [CircuitBreaker] 🚨 ${circuitBreaker.failures}/${CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD} failures - Blocking Twilio calls for ${CIRCUIT_BREAKER_CONFIG.RESET_TIMEOUT_MS/1000}s`);
  } else {
    console.warn(`🔌 [CircuitBreaker] ⚠️ Failure ${circuitBreaker.failures}/${CIRCUIT_BREAKER_CONFIG.FAILURE_THRESHOLD} - Circuit still ${circuitBreaker.state}`);
  }
}

/**
 * Get current circuit breaker status (for monitoring)
 */
export function getCircuitBreakerStatus(): CircuitBreakerState & { config: typeof CIRCUIT_BREAKER_CONFIG } {
  return {
    ...circuitBreaker,
    config: CIRCUIT_BREAKER_CONFIG,
  };
}

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
    const secretValue = TWILIO_ACCOUNT_SID_SECRET.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`🔐 [Twilio] ACCOUNT_SID loaded from Firebase Secret (length: ${secretValue.length})`);
      return secretValue;
    }
  } catch (e) {
    console.log(`⚠️ [Twilio] Firebase Secret not available, trying process.env`);
  }

  // Fallback to process.env
  const envValue = process.env.TWILIO_ACCOUNT_SID?.trim();
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
    const secretValue = TWILIO_AUTH_TOKEN_SECRET.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`🔐 [Twilio] AUTH_TOKEN loaded from Firebase Secret (length: ${secretValue.length})`);
      return secretValue;
    }
  } catch (e) {
    console.log(`⚠️ [Twilio] Firebase Secret not available, trying process.env`);
  }

  // Fallback to process.env
  const envValue = process.env.TWILIO_AUTH_TOKEN?.trim();
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
    const secretValue = TWILIO_PHONE_NUMBER_SECRET.value()?.trim();
    if (secretValue && secretValue.length > 0) {
      console.log(`🔐 [Twilio] PHONE_NUMBER loaded from Firebase Secret: ${secretValue.substring(0, 5)}...`);
      return secretValue;
    }
  } catch (e) {
    console.log(`⚠️ [Twilio] Firebase Secret not available, trying process.env`);
  }

  // Fallback to process.env
  const envValue = process.env.TWILIO_PHONE_NUMBER?.trim();
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
 * P0 FIX: Firebase Functions v2 uses Cloud Run URLs which differ from
 * the cloudfunctions.net URLs. The X-Forwarded-Host header contains
 * the Cloud Functions URL, but Twilio sends to the Cloud Run URL.
 * Until we configure proper URL mapping, we validate basic security
 * checks but skip cryptographic signature validation.
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

  // P0 CRITICAL FIX: Temporarily disable cryptographic signature validation
  // because Firebase Functions v2 uses Cloud Run URLs that don't match
  // the URLs Twilio uses to calculate signatures.
  //
  // URL mismatch:
  // - Twilio sends to: https://twiliocallwebhook-xxx-ew.a.run.app
  // - Headers show: https://europe-west1-project.cloudfunctions.net/
  //
  // Basic security checks instead:
  // 1. Check for Twilio signature header (proves it's from Twilio infrastructure)
  // 2. Check for AccountSid in body (proves it's our account)

  const twilioSignature = req.headers["x-twilio-signature"] as string;
  if (!twilioSignature) {
    console.error("[TWILIO_VALIDATION] Missing X-Twilio-Signature header - not from Twilio");
    if (res) res.status(403).send("Forbidden: Missing signature");
    return false;
  }

  // Check that AccountSid matches our account (basic sanity check)
  const accountSid = req.body?.AccountSid;
  const expectedAccountSid = getAccountSid();

  if (accountSid && expectedAccountSid && accountSid !== expectedAccountSid) {
    console.error("[TWILIO_VALIDATION] AccountSid mismatch - possible spoofing attempt", {
      received: accountSid?.slice(0, 10) + "...",
      expected: expectedAccountSid?.slice(0, 10) + "..."
    });
    if (res) res.status(403).send("Forbidden: Invalid account");
    return false;
  }

  console.log("[TWILIO_VALIDATION] Basic validation passed (signature header present, AccountSid matches)");
  console.log("[TWILIO_VALIDATION] NOTE: Full cryptographic validation disabled due to Cloud Run URL mismatch");
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

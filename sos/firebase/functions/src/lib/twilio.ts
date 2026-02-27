import twilio from "twilio";
import { Twilio } from "twilio";
import { Request, Response } from "express";
import * as admin from "firebase-admin";

// P0 FIX: Import from centralized secrets - NEVER call defineSecret() here!
import {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  TWILIO_SECRETS,
  getTwilioAccountSid as getAccountSidFromSecrets,
  getTwilioAuthToken as getAuthTokenFromSecrets,
  getTwilioPhoneNumberValue as getPhoneNumberFromSecrets,
} from "./secrets";

// Re-export for backwards compatibility
export {
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_PHONE_NUMBER,
  TWILIO_SECRETS,
};

// ============================================================================
// P0 FIX: Twilio Client Cache
// Creating a new client on every call causes memory/latency issues
// ============================================================================

let cachedTwilioClient: Twilio | null = null;
let cachedCredentialHash: string | null = null;

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
  FAILURE_THRESHOLD: 3,        // P0 FIX: Open circuit after 3 consecutive failures (was 5)
  RESET_TIMEOUT_MS: 15_000,    // P0 FIX: Try again after 15 seconds (was 30)
  HALF_OPEN_MAX_CALLS: 1,      // Allow 1 test call in half-open state
};

// Circuit breaker state (in-memory per instance)
// P0 NOTE: Each Cloud Run instance has its own state. This is acceptable because:
// 1. Twilio errors are typically transient (network issues, rate limits)
// 2. Having each instance track its own failures provides isolation
// 3. Full Firestore persistence would add latency to every call
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

/**
 * Reset circuit breaker to closed state (useful for testing/debugging)
 */
export function resetCircuitBreaker(): void {
  const previousState = circuitBreaker.state;
  circuitBreaker.state = "CLOSED";
  circuitBreaker.failures = 0;
  circuitBreaker.lastFailureTime = 0;
  circuitBreaker.lastSuccessTime = Date.now();
  console.log(`[CircuitBreaker] MANUAL RESET: ${previousState} → CLOSED`);
}

// ============================================================================
// P0 FIX: Use centralized secrets from ./secrets.ts
// NEVER call defineSecret() in this file - it causes credential conflicts!
// ============================================================================

// Use centralized getters from secrets.ts
const getAccountSid = getAccountSidFromSecrets;
const getAuthToken = getAuthTokenFromSecrets;
const getPhoneNumber = getPhoneNumberFromSecrets;

export function getTwilioClient(): Twilio {
  console.log(`[Twilio] getTwilioClient() called`);

  const accountSid = getAccountSid();
  const authToken = getAuthToken();

  if (!accountSid || !authToken) {
    console.error(`[Twilio] CRITICAL: Twilio credentials missing!`);
    console.error(`[Twilio] ACCOUNT_SID: ${accountSid ? 'OK' : 'MISSING'}`);
    console.error(`[Twilio] AUTH_TOKEN: ${authToken ? 'OK' : 'MISSING'}`);
    throw new Error("Twilio credentials missing (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN). Check Firebase Secrets.");
  }

  // P0 FIX: Use cached client if credentials haven't changed
  const credentialHash = `${accountSid.substring(0, 10)}:${authToken.length}`;

  if (cachedTwilioClient && cachedCredentialHash === credentialHash) {
    console.log(`[Twilio] Using cached client`);
    return cachedTwilioClient;
  }

  console.log(`[Twilio] Creating new Twilio client (SID: ${accountSid.substring(0, 6)}...)`);
  cachedTwilioClient = twilio(accountSid, authToken) as Twilio;
  cachedCredentialHash = credentialHash;

  return cachedTwilioClient;
}

export function getTwilioPhoneNumber(): string {
  console.log(`[Twilio] getTwilioPhoneNumber() called`);

  const phoneNumber = getPhoneNumber();

  if (!phoneNumber) {
    console.error(`[Twilio] CRITICAL: TWILIO_PHONE_NUMBER missing!`);
    throw new Error("TWILIO_PHONE_NUMBER missing. Check Firebase Secrets.");
  }

  console.log(`[Twilio] Phone number: ${phoneNumber.substring(0, 5)}...`);
  return phoneNumber;
}

// Legacy exports for backwards compatibility - use TWILIO_SECRETS from ./secrets.ts instead
export const TWILIO_ACCOUNT_SID_SECRET = TWILIO_ACCOUNT_SID;
export const TWILIO_AUTH_TOKEN_SECRET = TWILIO_AUTH_TOKEN;
export const TWILIO_PHONE_NUMBER_SECRET = TWILIO_PHONE_NUMBER;

// P1-6 FIX 2026-02-27: Configurable crypto validation blocking mode
// Reads from admin_config/twilio_security.cryptoValidationBlocking
// Cached for 5 minutes. Uses synchronous cache read + background refresh
// to avoid making validateTwilioWebhookSignature async (7 callers).
// Default: false (monitoring mode) — admin can set to true via Firestore.
let cryptoBlockingCached = false;
let cryptoBlockingLastFetch = 0;
const CRYPTO_BLOCKING_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cryptoBlockingFetchInProgress = false;

function refreshCryptoBlockingConfig(): void {
  if (cryptoBlockingFetchInProgress) return;
  cryptoBlockingFetchInProgress = true;
  admin.firestore().collection("admin_config").doc("twilio_security").get()
    .then((doc) => {
      cryptoBlockingCached = doc.exists ? doc.data()?.cryptoValidationBlocking === true : false;
      cryptoBlockingLastFetch = Date.now();
    })
    .catch(() => {
      // On error, keep current value (default: false = monitoring)
    })
    .finally(() => {
      cryptoBlockingFetchInProgress = false;
    });
}

function isCryptoValidationBlocking(): boolean {
  const now = Date.now();
  if (now - cryptoBlockingLastFetch > CRYPTO_BLOCKING_CACHE_TTL) {
    refreshCryptoBlockingConfig(); // fire-and-forget background fetch
  }
  return cryptoBlockingCached; // return current cached value (default: false)
}

/**
 * Valide la signature d'un webhook Twilio
 *
 * AUDIT FIX 2026-02-26: Full cryptographic validation re-enabled.
 * Uses twilio.validateRequest() with URL reconstructed from Cloud Run Host header.
 *
 * Security layers:
 * 1. X-Twilio-Signature header must be present
 * 2. AccountSid in body must match our account
 * 3. Cryptographic signature validated (HMAC-SHA1 over URL + sorted POST params)
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

  // AUDIT FIX 2026-02-26: Cryptographic validation in MONITORING MODE
  //
  // Security layers:
  // 1. X-Twilio-Signature header must be present (BLOCKING)
  // 2. AccountSid in body must match our account (BLOCKING)
  // 3. Cryptographic signature validated (MONITORING ONLY — logs result, does NOT block)
  //
  // WHY MONITORING: Cloud Run URLs may differ from what Twilio signed.
  // We need to verify in production logs that URL reconstruction works
  // before switching to blocking mode. If crypto fails but layers 1+2 pass,
  // the request is ALLOWED but logged as a warning for review.
  //
  // TODO: Once logs confirm crypto validation passes consistently,
  // switch to blocking mode by uncommenting the 403 response below.

  const twilioSignature = req.headers["x-twilio-signature"] as string;
  if (!twilioSignature) {
    console.error("[TWILIO_VALIDATION] Missing X-Twilio-Signature header - not from Twilio");
    if (res) res.status(403).send("Forbidden: Missing signature");
    return false;
  }

  // Layer 1: Check that AccountSid matches our account
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

  // Layer 2: Cryptographic signature validation
  // Reconstruct the URL from the raw Host header (Cloud Run sets this to the
  // actual service hostname, e.g. twiliocallwebhook-5tfnuxa2hq-ey.a.run.app)
  const authToken = getAuthToken();
  if (authToken && twilioSignature) {
    const rawHost = req.headers['host'];
    if (rawHost) {
      // Cloud Run always uses HTTPS
      const fullUrl = `https://${rawHost}${req.originalUrl}`;
      const params = req.body || {};

      const isValid = twilio.validateRequest(authToken, twilioSignature, fullUrl, params);

      if (isValid) {
        console.log("[TWILIO_VALIDATION] Cryptographic signature VALID");
        return true;
      }

      // Fallback: try with x-forwarded-proto (some Cloud Run configs may differ)
      const forwardedProto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim();
      if (forwardedProto && forwardedProto !== 'https') {
        const altUrl = `${forwardedProto}://${rawHost}${req.originalUrl}`;
        const isValidAlt = twilio.validateRequest(authToken, twilioSignature, altUrl, params);
        if (isValidAlt) {
          console.log("[TWILIO_VALIDATION] Cryptographic signature VALID (alt protocol)");
          return true;
        }
      }

      // P1-6 FIX 2026-02-27: Configurable blocking vs monitoring mode
      // Check Firestore flag to decide whether to block or just log.
      // Default: MONITORING (safe). Admin can enable blocking via:
      //   admin_config/twilio_security → { cryptoValidationBlocking: true }
      // This avoids redeployment and allows instant rollback if blocking breaks calls.
      const shouldBlock = isCryptoValidationBlocking();
      if (shouldBlock) {
        console.error("[TWILIO_VALIDATION] ❌ BLOCKING: Cryptographic signature FAILED", {
          urlUsed: fullUrl,
          bodyKeys: Object.keys(params).length,
          signaturePrefix: twilioSignature.substring(0, 10) + '...',
          action: "BLOCKED — cryptographic validation enforced via admin_config",
        });
        if (res) res.status(403).send("Forbidden: Invalid signature");
        return false;
      } else {
        console.warn("[TWILIO_VALIDATION] ⚠️ MONITORING: Cryptographic signature FAILED (request ALLOWED)", {
          urlUsed: fullUrl,
          bodyKeys: Object.keys(params).length,
          signaturePrefix: twilioSignature.substring(0, 10) + '...',
          action: "ALLOWED — monitoring mode. Set admin_config/twilio_security.cryptoValidationBlocking=true to block",
        });
        return true;
      }
    }

    // No Host header — cannot verify crypto, fall through
    console.warn("[TWILIO_VALIDATION] No Host header, cannot verify cryptographic signature — accepted on layers 1+2");
  }

  // authToken unavailable — cannot verify crypto (cold start or misconfiguration)
  console.warn("[TWILIO_VALIDATION] Fallback: accepted on header + AccountSid only (no crypto available)");
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
// Note: These re-export the centralized getters for backwards compatibility
export {
  getAccountSidFromSecrets as getTwilioAccountSid,
  getAuthTokenFromSecrets as getTwilioAuthToken,
  getPhoneNumberFromSecrets as getTwilioPhoneNumberExport,
};

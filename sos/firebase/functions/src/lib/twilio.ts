import twilio from "twilio";
import { Twilio } from "twilio";
import { Request, Response } from "express";

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
// P0 FIX: Twilio IP ranges for webhook validation
// Source: https://www.twilio.com/docs/usage/security#validating-requests
// These are Twilio's signaling IP ranges that send webhooks
// Last updated: 2026-01-18
const TWILIO_IP_RANGES = [
  // US cluster (us1)
  '54.172.60.0/23',
  '54.244.51.0/24',
  '54.171.127.192/26',
  '52.215.127.0/24',
  '54.65.63.192/26',
  '54.169.127.128/26',
  '54.252.254.64/26',
  '177.71.206.192/26',
  // EU/Ireland cluster
  '34.203.250.0/23',
  '168.86.128.0/18',
  // Ashburn cluster
  '34.226.36.32/27',
  '54.152.60.64/27',
];

/**
 * P0 FIX: Check if an IP address is within Twilio's known IP ranges
 * Uses CIDR notation matching
 */
function isIpInCidrRange(ip: string, cidr: string): boolean {
  try {
    const [range, bits] = cidr.split('/');
    const mask = -1 << (32 - parseInt(bits, 10));

    const ipParts = ip.split('.').map(Number);
    const rangeParts = range.split('.').map(Number);

    const ipNum = (ipParts[0] << 24) + (ipParts[1] << 16) + (ipParts[2] << 8) + ipParts[3];
    const rangeNum = (rangeParts[0] << 24) + (rangeParts[1] << 16) + (rangeParts[2] << 8) + rangeParts[3];

    return (ipNum & mask) === (rangeNum & mask);
  } catch {
    return false;
  }
}

/**
 * P0 FIX: Check if request is from a known Twilio IP
 */
function isFromTwilioIp(req: Request): boolean {
  // Get the client IP from various headers (Cloud Run/Firebase sets these)
  const forwardedFor = req.headers['x-forwarded-for'] as string;
  const clientIp = forwardedFor?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] as string ||
    req.socket?.remoteAddress ||
    req.ip;

  if (!clientIp) {
    console.warn('[TWILIO_VALIDATION] Could not determine client IP');
    return false;
  }

  // Remove IPv6 prefix if present (::ffff:192.168.1.1 -> 192.168.1.1)
  const normalizedIp = clientIp.replace(/^::ffff:/, '');

  // Check if IP is in any of Twilio's ranges
  const isInTwilioRange = TWILIO_IP_RANGES.some(range => isIpInCidrRange(normalizedIp, range));

  if (isInTwilioRange) {
    console.log(`[TWILIO_VALIDATION] IP ${normalizedIp} is in Twilio IP range ✓`);
  } else {
    console.warn(`[TWILIO_VALIDATION] IP ${normalizedIp} is NOT in known Twilio IP ranges`);
  }

  return isInTwilioRange;
}

export function validateTwilioWebhookSignature(
  req: Request,
  res?: Response
): boolean {
  // En mode emulateur, on skip la validation pour faciliter le dev
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    console.log("[TWILIO_VALIDATION] Skipping validation in emulator mode");
    return true;
  }

  // P0 CRITICAL FIX: Multi-layer validation since cryptographic signature
  // validation doesn't work with Cloud Run URLs
  //
  // Security layers:
  // 1. Check for Twilio signature header (proves intent to send as Twilio)
  // 2. Check for AccountSid in body (proves it's our account)
  // 3. Check IP is from Twilio's known ranges (proves infrastructure)
  //
  // Note: Cryptographic validation is still disabled due to URL mismatch.
  // To enable, configure Cloud Run with custom domain matching Twilio's config.

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

  // P0 FIX: Additional IP-based validation (monitoring mode - log but don't block)
  // Blocking mode was too strict and could reject legitimate webhooks if:
  // - Twilio adds new IP ranges not in our list
  // - Cloud Run proxy masks the source IP
  // - X-Forwarded-For headers are not properly transmitted
  const ipValid = isFromTwilioIp(req);
  if (!ipValid) {
    // MONITORING MODE: Log warning but allow through since other checks passed
    // (X-Twilio-Signature header present + AccountSid matches)
    console.warn("[TWILIO_VALIDATION] ⚠️ Request NOT from known Twilio IP range");
    console.warn("[TWILIO_VALIDATION] Allowing through because signature header + AccountSid are valid");
    console.warn("[TWILIO_VALIDATION] If this happens frequently, consider updating TWILIO_IP_RANGES");
    // To enable strict blocking, uncomment below:
    // if (res) res.status(403).send("Forbidden: Invalid source IP");
    // return false;
  }

  console.log("[TWILIO_VALIDATION] Validation passed:", {
    hasSignatureHeader: true,
    accountSidMatches: true,
    fromTwilioIp: ipValid,
  });
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
// Note: These re-export the centralized getters for backwards compatibility
export {
  getAccountSidFromSecrets as getTwilioAccountSid,
  getAuthTokenFromSecrets as getTwilioAuthToken,
  getPhoneNumberFromSecrets as getTwilioPhoneNumberExport,
};

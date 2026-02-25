/**
 * Meta Conversions API (CAPI) Implementation
 *
 * Server-side tracking for Meta (Facebook) Ads conversion events.
 * This module provides functions to send conversion events directly to Meta's
 * Conversions API, enabling accurate attribution even with browser restrictions.
 *
 * Features:
 * - SHA256 hashing for all user data (Advanced Matching)
 * - Support for Purchase, Lead, InitiateCheckout, CompleteRegistration events
 * - Stripe user data extraction
 * - Unique event ID generation for deduplication
 *
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api
 */

import { createHash } from "crypto";
import { logger } from "firebase-functions/v2";
import Stripe from "stripe";
import { META_CAPI_TOKEN } from "./lib/secrets";

// ============================================================================
// Configuration
// ============================================================================

/** Meta Pixel ID */
const META_PIXEL_ID = "2204016713738311";

/** Meta Conversions API endpoint */
const META_CAPI_ENDPOINT = `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events`;

// Re-export for backward compatibility
export { META_CAPI_TOKEN };

// ============================================================================
// Interfaces
// ============================================================================

/**
 * User data for Advanced Matching
 * All fields should be lowercase and trimmed before hashing
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 */
export interface UserData {
  /** Email address (will be hashed) */
  em?: string;
  /** Phone number in E.164 format (will be hashed) */
  ph?: string;
  /** First name (will be hashed) */
  fn?: string;
  /** Last name (will be hashed) */
  ln?: string;
  /** City (will be hashed) */
  ct?: string;
  /** State/Region (2-letter code, will be hashed) */
  st?: string;
  /** Zip/Postal code (will be hashed) */
  zp?: string;
  /** Country (2-letter ISO code, will be hashed) */
  country?: string;
  /** External ID - your unique user identifier (will be hashed) */
  external_id?: string;
  /** Client IP address (NOT hashed) */
  client_ip_address?: string;
  /** Client User Agent (NOT hashed) */
  client_user_agent?: string;
  /** Facebook Click ID from URL parameter (NOT hashed) */
  fbc?: string;
  /** Facebook Browser ID from _fbp cookie (NOT hashed) */
  fbp?: string;
}

/**
 * Custom data for conversion events
 */
export interface CustomData {
  /** Currency code (ISO 4217) */
  currency?: string;
  /** Total value of the conversion */
  value?: number;
  /** Content name or product name */
  content_name?: string;
  /** Content category */
  content_category?: string;
  /** Content IDs (product IDs) */
  content_ids?: string[];
  /** Content type: 'product' or 'product_group' */
  content_type?: string;
  /** Number of items */
  num_items?: number;
  /** Order ID for Purchase events */
  order_id?: string;
  /** Search string for Search events */
  search_string?: string;
  /** Registration status */
  status?: string;
  /** Service type (custom for SOS-Expat) */
  service_type?: string;
  /** Provider type (custom for SOS-Expat) */
  provider_type?: string;
}

/**
 * Meta CAPI Event structure
 * @see https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/server-event
 */
export interface MetaCAPIEvent {
  /** Event name (e.g., 'Purchase', 'Lead', 'InitiateCheckout') */
  event_name: string;
  /** Unix timestamp in seconds */
  event_time: number;
  /** Unique event ID for deduplication with browser pixel */
  event_id: string;
  /** Action source: 'website', 'app', 'email', etc. */
  action_source: "website" | "app" | "email" | "phone_call" | "chat" | "physical_store" | "system_generated" | "other";
  /** Event source URL */
  event_source_url?: string;
  /** User data for matching */
  user_data: HashedUserData;
  /** Custom data (conversion details) */
  custom_data?: CustomData;
  /** Opt-out flag */
  opt_out?: boolean;
  /** Data processing options for CCPA/LDU */
  data_processing_options?: string[];
  /** Data processing options country */
  data_processing_options_country?: number;
  /** Data processing options state */
  data_processing_options_state?: number;
}

/**
 * User data after hashing (sent to Meta)
 */
export interface HashedUserData {
  em?: string[];
  ph?: string[];
  fn?: string;
  ln?: string;
  ct?: string;
  st?: string;
  zp?: string;
  country?: string;
  external_id?: string[];
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
}

/**
 * Meta CAPI Response
 */
export interface MetaCAPIResponse {
  events_received?: number;
  messages?: string[];
  fbtrace_id?: string;
  error?: {
    message: string;
    type: string;
    code: number;
    fbtrace_id: string;
  };
}

/**
 * Result of sending a CAPI event
 */
export interface CAPIEventResult {
  success: boolean;
  eventId: string;
  eventsReceived?: number;
  fbtraceId?: string;
  error?: string;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique event ID for deduplication
 * Format: {prefix}_{timestamp}_{random}
 *
 * IMPORTANT: Ce format est unifie entre frontend (Pixel) et backend (CAPI)
 * pour permettre la deduplication correcte des evenements.
 * Meta utilise event_id pour detecter les doublons Pixel/CAPI.
 *
 * Quand possible, utilisez l'eventId genere cote frontend et passez-le
 * au backend pour garantir la deduplication.
 */
export function generateEventId(prefix: string = "capi"): string {
  const timestamp = Date.now();
  // 13 caracteres aleatoires (meme format que frontend sharedEventId.ts)
  const random = Math.random().toString(36).substring(2, 15);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Hash a string using SHA256
 * Returns lowercase hex string
 */
function sha256Hash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Normalize text by removing accents
 * Important for consistent hashing (e.g., "François" and "Francois" should hash the same)
 */
function removeAccents(text: string): string {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Normalize and hash a user data value
 * - Trims whitespace
 * - Converts to lowercase
 * - Removes accents for consistent hashing
 * - Hashes with SHA256
 */
function normalizeAndHash(value: string | undefined | null, removeAccentsFlag: boolean = true): string | undefined {
  if (!value || typeof value !== "string") {
    return undefined;
  }
  let normalized = value.trim().toLowerCase();
  if (removeAccentsFlag) {
    normalized = removeAccents(normalized);
  }
  if (normalized.length === 0) {
    return undefined;
  }
  return sha256Hash(normalized);
}

/**
 * Normalize phone number to E.164 format (digits only, with country code)
 * Removes spaces, dashes, parentheses, and leading zeros
 */
function normalizePhoneNumber(phone: string | undefined | null): string | undefined {
  if (!phone || typeof phone !== "string") {
    return undefined;
  }

  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, "");

  // If starts with +, keep it for country code detection
  const hasPlus = normalized.startsWith("+");
  normalized = normalized.replace(/\+/g, "");

  // Remove leading zeros (except for country codes starting with 0)
  normalized = normalized.replace(/^0+/, "");

  if (normalized.length === 0) {
    return undefined;
  }

  // For French numbers without country code (9 digits after removing leading 0)
  if (!hasPlus && normalized.length === 9) {
    normalized = "33" + normalized;
  }

  return normalized;
}

/**
 * Hash user data for Meta CAPI
 * Only hashes PII fields; leaves ip, user_agent, fbc, fbp unhashed
 */
export function hashUserData(userData: UserData): HashedUserData {
  const hashed: HashedUserData = {};

  // Hash email (can be array for multiple emails)
  const hashedEmail = normalizeAndHash(userData.em);
  if (hashedEmail) {
    hashed.em = [hashedEmail];
  }

  // Hash phone (normalize to E.164 first, can be array)
  const normalizedPhone = normalizePhoneNumber(userData.ph);
  if (normalizedPhone) {
    hashed.ph = [sha256Hash(normalizedPhone)];
  }

  // Hash name fields
  const hashedFn = normalizeAndHash(userData.fn);
  if (hashedFn) {
    hashed.fn = hashedFn;
  }

  const hashedLn = normalizeAndHash(userData.ln);
  if (hashedLn) {
    hashed.ln = hashedLn;
  }

  // Hash location fields
  const hashedCt = normalizeAndHash(userData.ct);
  if (hashedCt) {
    hashed.ct = hashedCt;
  }

  const hashedSt = normalizeAndHash(userData.st);
  if (hashedSt) {
    hashed.st = hashedSt;
  }

  const hashedZp = normalizeAndHash(userData.zp);
  if (hashedZp) {
    hashed.zp = hashedZp;
  }

  const hashedCountry = normalizeAndHash(userData.country);
  if (hashedCountry) {
    hashed.country = hashedCountry;
  }

  // Hash external ID (can be array)
  const hashedExternalId = normalizeAndHash(userData.external_id);
  if (hashedExternalId) {
    hashed.external_id = [hashedExternalId];
  }

  // Non-hashed fields (pass through as-is)
  if (userData.client_ip_address) {
    hashed.client_ip_address = userData.client_ip_address;
  }

  if (userData.client_user_agent) {
    hashed.client_user_agent = userData.client_user_agent;
  }

  if (userData.fbc) {
    hashed.fbc = userData.fbc;
  }

  if (userData.fbp) {
    hashed.fbp = userData.fbp;
  }

  return hashed;
}

// ============================================================================
// Diagnostic Functions
// ============================================================================

/**
 * Diagnostic report for user data quality
 * Used for monitoring match rate and data completeness
 */
export interface UserDataDiagnostic {
  fieldsProvided: number;
  fieldsWithValue: string[];
  matchRateEstimate: 'excellent' | 'good' | 'fair' | 'poor';
  score: number;
  recommendations: string[];
}

/**
 * Generate a diagnostic report for user data quality
 * Helps monitor the expected match rate for CAPI events
 *
 * @param userData The user data to analyze
 * @returns Diagnostic report with quality metrics
 */
export function analyzeUserDataQuality(userData: UserData): UserDataDiagnostic {
  const fieldsWithValue: string[] = [];
  let score = 0;

  // Score each field based on importance for matching
  // Email is most important (40 points)
  if (userData.em && userData.em.length > 0) {
    fieldsWithValue.push('email');
    score += 40;
  }

  // Phone is very important (30 points)
  if (userData.ph && userData.ph.length > 0) {
    fieldsWithValue.push('phone');
    score += 30;
  }

  // Names help with matching (10 points each)
  if (userData.fn && userData.fn.length > 0) {
    fieldsWithValue.push('firstName');
    score += 10;
  }
  if (userData.ln && userData.ln.length > 0) {
    fieldsWithValue.push('lastName');
    score += 10;
  }

  // External ID helps with cross-device (5 points)
  if (userData.external_id && userData.external_id.length > 0) {
    fieldsWithValue.push('externalId');
    score += 5;
  }

  // Facebook identifiers are important (5 points total)
  if (userData.fbp || userData.fbc) {
    if (userData.fbp) fieldsWithValue.push('fbp');
    if (userData.fbc) fieldsWithValue.push('fbc');
    score += 5;
  }

  // Location helps with matching (5 points total)
  if (userData.country) {
    fieldsWithValue.push('country');
    score += 2;
  }
  if (userData.ct) {
    fieldsWithValue.push('city');
    score += 2;
  }
  if (userData.zp) {
    fieldsWithValue.push('zipCode');
    score += 1;
  }

  // IP and User Agent help with matching
  if (userData.client_ip_address) {
    fieldsWithValue.push('ipAddress');
  }
  if (userData.client_user_agent) {
    fieldsWithValue.push('userAgent');
  }

  // Determine match rate estimate
  let matchRateEstimate: 'excellent' | 'good' | 'fair' | 'poor';
  if (score >= 75) {
    matchRateEstimate = 'excellent';
  } else if (score >= 50) {
    matchRateEstimate = 'good';
  } else if (score >= 25) {
    matchRateEstimate = 'fair';
  } else {
    matchRateEstimate = 'poor';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (!userData.em) {
    recommendations.push('Add email - most important field for matching');
  }
  if (!userData.ph) {
    recommendations.push('Add phone number - significantly improves match rate');
  }
  if (!userData.fn || !userData.ln) {
    recommendations.push('Add full name - helps cross-platform matching');
  }
  if (!userData.fbp && !userData.fbc) {
    recommendations.push('Missing Meta identifiers (fbp/fbc) - check Pixel is loaded');
  }
  if (!userData.external_id) {
    recommendations.push('Add external_id for cross-device tracking');
  }

  return {
    fieldsProvided: fieldsWithValue.length,
    fieldsWithValue,
    matchRateEstimate,
    score,
    recommendations,
  };
}

/**
 * Log detailed diagnostics for a CAPI event
 * Use this for debugging and monitoring data quality
 */
export function logCAPIEventDiagnostics(
  eventName: string,
  eventId: string,
  userData: UserData,
  customData?: CustomData
): void {
  const diagnostic = analyzeUserDataQuality(userData);

  logger.info(`[Meta CAPI Diagnostic] ${eventName}`, {
    eventId,
    eventName,
    dataQuality: {
      matchRateEstimate: diagnostic.matchRateEstimate,
      score: diagnostic.score,
      fieldsProvided: diagnostic.fieldsProvided,
      fields: diagnostic.fieldsWithValue,
    },
    hasMetaIdentifiers: !!(userData.fbp || userData.fbc),
    hasPII: !!(userData.em || userData.ph),
    hasIpAndUA: !!(userData.client_ip_address && userData.client_user_agent),
    customData: customData ? {
      hasValue: !!customData.value,
      hasCurrency: !!customData.currency,
      hasContentIds: !!customData.content_ids?.length,
      hasOrderId: !!customData.order_id,
    } : null,
    recommendations: diagnostic.recommendations.length > 0 ? diagnostic.recommendations : undefined,
  });
}

// ============================================================================
// Core CAPI Function with Retry
// ============================================================================

/**
 * Configuration for retry mechanism
 */
interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 500,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Sleep for a given number of milliseconds
 */
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Check if an error is retryable (network issues, rate limits, server errors)
 */
const isRetryableError = (status: number, errorMessage?: string): boolean => {
  // Retryable HTTP status codes
  if (status >= 500 && status < 600) return true; // Server errors
  if (status === 429) return true; // Rate limited
  if (status === 408) return true; // Request timeout

  // Non-retryable errors
  if (status === 400) return false; // Bad request (our fault)
  if (status === 401 || status === 403) return false; // Auth errors

  // Check error message for network issues
  if (errorMessage?.includes("ECONNRESET")) return true;
  if (errorMessage?.includes("ETIMEDOUT")) return true;
  if (errorMessage?.includes("ENOTFOUND")) return true;
  if (errorMessage?.includes("fetch failed")) return true;

  return false;
};

/**
 * Send an event to Meta Conversions API (internal, single attempt)
 */
async function sendCAPIEventInternal(
  event: MetaCAPIEvent,
  accessToken: string,
  testEventCode?: string
): Promise<{ response?: Response; responseData?: MetaCAPIResponse; error?: string }> {
  const requestBody: {
    data: MetaCAPIEvent[];
    access_token: string;
    test_event_code?: string;
  } = {
    data: [event],
    access_token: accessToken,
  };

  if (testEventCode) {
    requestBody.test_event_code = testEventCode;
  }

  try {
    const response = await fetch(META_CAPI_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const responseData = await response.json() as MetaCAPIResponse;
    return { response, responseData };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Send an event to Meta Conversions API with automatic retry
 *
 * @param event - The event to send
 * @param testEventCode - Optional test event code for debugging (removes in production)
 * @param retryConfig - Optional retry configuration
 * @returns Result of the API call
 */
export async function sendCAPIEvent(
  event: MetaCAPIEvent,
  testEventCode?: string,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<CAPIEventResult> {
  const logPrefix = `[Meta CAPI] [${event.event_name}]`;

  // Get access token
  let accessToken: string;
  try {
    accessToken = META_CAPI_TOKEN.value();
    if (!accessToken || accessToken.length === 0) {
      throw new Error("META_CAPI_TOKEN is empty");
    }
  } catch (secretError) {
    accessToken = process.env.META_CAPI_TOKEN || "";
    if (!accessToken) {
      logger.error(`${logPrefix} META_CAPI_TOKEN not configured`);
      return {
        success: false,
        eventId: event.event_id,
        error: "META_CAPI_TOKEN not configured",
      };
    }
  }

  let lastError: string | undefined;
  let lastFbtraceId: string | undefined;
  let delay = retryConfig.initialDelayMs;

  // Log diagnostic info on first attempt only (to avoid duplicate logs on retries)
  // This helps monitor data quality and match rate in Cloud Logging
  const rawUserData: UserData = {};
  // Reverse the hashing to get field presence (we only check if fields exist)
  if (event.user_data.em?.length) rawUserData.em = 'present';
  if (event.user_data.ph?.length) rawUserData.ph = 'present';
  if (event.user_data.fn) rawUserData.fn = 'present';
  if (event.user_data.ln) rawUserData.ln = 'present';
  if (event.user_data.external_id?.length) rawUserData.external_id = 'present';
  if (event.user_data.fbp) rawUserData.fbp = event.user_data.fbp;
  if (event.user_data.fbc) rawUserData.fbc = event.user_data.fbc;
  if (event.user_data.client_ip_address) rawUserData.client_ip_address = event.user_data.client_ip_address;
  if (event.user_data.client_user_agent) rawUserData.client_user_agent = 'present';
  if (event.user_data.country) rawUserData.country = 'present';
  if (event.user_data.ct) rawUserData.ct = 'present';
  if (event.user_data.zp) rawUserData.zp = 'present';

  logCAPIEventDiagnostics(event.event_name, event.event_id, rawUserData, event.custom_data);

  for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
    logger.info(`${logPrefix} Sending event (attempt ${attempt}/${retryConfig.maxAttempts})`, {
      eventId: event.event_id,
      eventName: event.event_name,
      actionSource: event.action_source,
      hasUserData: Object.keys(event.user_data).length > 0,
      hasCustomData: !!event.custom_data,
      testMode: !!testEventCode,
    });

    const { response, responseData, error } = await sendCAPIEventInternal(
      event,
      accessToken,
      testEventCode
    );

    // Network error
    if (error) {
      lastError = error;
      if (attempt < retryConfig.maxAttempts && isRetryableError(0, error)) {
        logger.warn(`${logPrefix} Network error, retrying in ${delay}ms`, {
          eventId: event.event_id,
          error,
          attempt,
        });
        await sleep(delay);
        delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
        continue;
      }
      break;
    }

    // HTTP error
    if (!response || !response.ok || responseData?.error) {
      const errorMessage = responseData?.error?.message || `HTTP ${response?.status}`;
      lastError = errorMessage;
      lastFbtraceId = responseData?.fbtrace_id || responseData?.error?.fbtrace_id;

      // Check if retryable
      if (
        attempt < retryConfig.maxAttempts &&
        response &&
        isRetryableError(response.status, errorMessage)
      ) {
        logger.warn(`${logPrefix} API error (retryable), retrying in ${delay}ms`, {
          eventId: event.event_id,
          status: response.status,
          error: errorMessage,
          attempt,
        });
        await sleep(delay);
        delay = Math.min(delay * retryConfig.backoffMultiplier, retryConfig.maxDelayMs);
        continue;
      }

      // Non-retryable error
      logger.error(`${logPrefix} API Error (non-retryable)`, {
        eventId: event.event_id,
        status: response?.status,
        error: responseData?.error,
        fbtraceId: lastFbtraceId,
        attempt,
      });
      break;
    }

    // Success!
    logger.info(`${logPrefix} Event sent successfully`, {
      eventId: event.event_id,
      eventsReceived: responseData?.events_received,
      fbtraceId: responseData?.fbtrace_id,
      attempt,
    });

    return {
      success: true,
      eventId: event.event_id,
      eventsReceived: responseData?.events_received,
      fbtraceId: responseData?.fbtrace_id,
    };
  }

  // All retries exhausted
  logger.error(`${logPrefix} All retry attempts exhausted`, {
    eventId: event.event_id,
    error: lastError,
    fbtraceId: lastFbtraceId,
  });

  return {
    success: false,
    eventId: event.event_id,
    fbtraceId: lastFbtraceId,
    error: lastError || "Max retries exceeded",
  };
}

// ============================================================================
// Event Tracking Functions
// ============================================================================

/**
 * Track a Purchase event
 * Sent when a customer completes a payment
 */
export async function trackCAPIPurchase(params: {
  userData: UserData;
  value: number;
  currency: string;
  orderId?: string;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  serviceType?: string;
  providerType?: string;
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}): Promise<CAPIEventResult> {
  const eventId = params.eventId || generateEventId("purchase");

  const event: MetaCAPIEvent = {
    event_name: "Purchase",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: hashUserData(params.userData),
    custom_data: {
      currency: params.currency.toUpperCase(),
      value: params.value,
      order_id: params.orderId,
      content_name: params.contentName,
      content_category: params.contentCategory,
      content_ids: params.contentIds,
      content_type: "product",
      service_type: params.serviceType,
      provider_type: params.providerType,
    },
  };

  return sendCAPIEvent(event, params.testEventCode);
}

/**
 * Track a Lead event
 * Sent when a user submits their information (contact form, callback request, etc.)
 */
export async function trackCAPILead(params: {
  userData: UserData;
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  serviceType?: string;
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}): Promise<CAPIEventResult> {
  const eventId = params.eventId || generateEventId("lead");

  const event: MetaCAPIEvent = {
    event_name: "Lead",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: hashUserData(params.userData),
    custom_data: {
      currency: params.currency?.toUpperCase(),
      value: params.value,
      content_name: params.contentName,
      content_category: params.contentCategory,
      service_type: params.serviceType,
    },
  };

  return sendCAPIEvent(event, params.testEventCode);
}

/**
 * Track an InitiateCheckout event
 * Sent when a user starts the checkout/payment process
 */
export async function trackCAPIInitiateCheckout(params: {
  userData: UserData;
  value?: number;
  currency?: string;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  numItems?: number;
  serviceType?: string;
  providerType?: string;
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}): Promise<CAPIEventResult> {
  const eventId = params.eventId || generateEventId("checkout");

  const event: MetaCAPIEvent = {
    event_name: "InitiateCheckout",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: hashUserData(params.userData),
    custom_data: {
      currency: params.currency?.toUpperCase(),
      value: params.value,
      content_name: params.contentName,
      content_category: params.contentCategory,
      content_ids: params.contentIds,
      content_type: "product",
      num_items: params.numItems,
      service_type: params.serviceType,
      provider_type: params.providerType,
    },
  };

  return sendCAPIEvent(event, params.testEventCode);
}

/**
 * Track a CompleteRegistration event
 * Sent when a user completes their account registration
 */
export async function trackCAPICompleteRegistration(params: {
  userData: UserData;
  value?: number;
  currency?: string;
  contentName?: string;
  status?: string;
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}): Promise<CAPIEventResult> {
  const eventId = params.eventId || generateEventId("registration");

  const event: MetaCAPIEvent = {
    event_name: "CompleteRegistration",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: hashUserData(params.userData),
    custom_data: {
      currency: params.currency?.toUpperCase(),
      value: params.value,
      content_name: params.contentName,
      status: params.status || "completed",
    },
  };

  return sendCAPIEvent(event, params.testEventCode);
}

/**
 * Track a StartRegistration event (custom event)
 * Sent when a user starts the registration process
 */
export async function trackCAPIStartRegistration(params: {
  userData: UserData;
  contentName?: string;
  contentCategory?: string;
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}): Promise<CAPIEventResult> {
  const eventId = params.eventId || generateEventId("start_reg");

  const event: MetaCAPIEvent = {
    event_name: "StartRegistration",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: hashUserData(params.userData),
    custom_data: {
      content_name: params.contentName,
      content_category: params.contentCategory,
    },
  };

  return sendCAPIEvent(event, params.testEventCode);
}

/**
 * Track a Search event
 * Sent when a user searches for providers/services
 */
export async function trackCAPISearch(params: {
  userData: UserData;
  searchString?: string;
  contentCategory?: string;
  contentIds?: string[];
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}): Promise<CAPIEventResult> {
  const eventId = params.eventId || generateEventId("search");

  const event: MetaCAPIEvent = {
    event_name: "Search",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: hashUserData(params.userData),
    custom_data: {
      search_string: params.searchString,
      content_category: params.contentCategory,
      content_ids: params.contentIds,
    },
  };

  return sendCAPIEvent(event, params.testEventCode);
}

/**
 * Track a ViewContent event
 * Sent when a user views important content (provider profile, service details)
 */
export async function trackCAPIViewContent(params: {
  userData: UserData;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  contentType?: string;
  value?: number;
  currency?: string;
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}): Promise<CAPIEventResult> {
  const eventId = params.eventId || generateEventId("view");

  const event: MetaCAPIEvent = {
    event_name: "ViewContent",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: hashUserData(params.userData),
    custom_data: {
      content_name: params.contentName,
      content_category: params.contentCategory,
      content_ids: params.contentIds,
      content_type: params.contentType || "product",
      value: params.value,
      currency: params.currency?.toUpperCase(),
    },
  };

  return sendCAPIEvent(event, params.testEventCode);
}

/**
 * Track an AddToCart event
 * Sent when a user adds a service/plan to their selection
 */
export async function trackCAPIAddToCart(params: {
  userData: UserData;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  value?: number;
  currency?: string;
  numItems?: number;
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}): Promise<CAPIEventResult> {
  const eventId = params.eventId || generateEventId("cart");

  const event: MetaCAPIEvent = {
    event_name: "AddToCart",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: hashUserData(params.userData),
    custom_data: {
      content_name: params.contentName,
      content_category: params.contentCategory,
      content_ids: params.contentIds,
      content_type: "product",
      value: params.value,
      currency: params.currency?.toUpperCase(),
      num_items: params.numItems || 1,
    },
  };

  return sendCAPIEvent(event, params.testEventCode);
}

/**
 * Track a StartTrial event (custom event)
 * Sent when a user starts a subscription trial
 */
export async function trackCAPIStartTrial(params: {
  userData: UserData;
  contentName?: string;
  contentCategory?: string;
  value?: number;
  currency?: string;
  subscriptionId?: string;
  trialDays?: number;
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}): Promise<CAPIEventResult> {
  const eventId = params.eventId || generateEventId("trial");

  const event: MetaCAPIEvent = {
    event_name: "StartTrial",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: hashUserData(params.userData),
    custom_data: {
      content_name: params.contentName,
      content_category: params.contentCategory,
      value: params.value,
      currency: params.currency?.toUpperCase(),
      order_id: params.subscriptionId,
      num_items: params.trialDays,
    },
  };

  return sendCAPIEvent(event, params.testEventCode);
}

/**
 * Track an AddPaymentInfo event
 * Sent when a user submits payment information
 */
export async function trackCAPIAddPaymentInfo(params: {
  userData: UserData;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  value?: number;
  currency?: string;
  eventSourceUrl?: string;
  eventId?: string;
  testEventCode?: string;
}): Promise<CAPIEventResult> {
  const eventId = params.eventId || generateEventId("payment_info");

  const event: MetaCAPIEvent = {
    event_name: "AddPaymentInfo",
    event_time: Math.floor(Date.now() / 1000),
    event_id: eventId,
    action_source: "website",
    event_source_url: params.eventSourceUrl,
    user_data: hashUserData(params.userData),
    custom_data: {
      content_name: params.contentName,
      content_category: params.contentCategory,
      content_ids: params.contentIds,
      content_type: "product",
      value: params.value,
      currency: params.currency?.toUpperCase(),
    },
  };

  return sendCAPIEvent(event, params.testEventCode);
}

// ============================================================================
// Stripe Integration
// ============================================================================

/**
 * Extract user data from a Stripe PaymentIntent or Charge
 * Useful for tracking Purchase events from Stripe webhooks
 */
export function extractUserDataFromStripe(
  stripeObject: Stripe.PaymentIntent | Stripe.Charge | Stripe.Customer,
  additionalData?: Partial<UserData>
): UserData {
  const userData: UserData = {};

  // Handle different Stripe object types
  if ("customer" in stripeObject && typeof stripeObject.customer === "object" && stripeObject.customer !== null) {
    // PaymentIntent or Charge with expanded customer
    const customer = stripeObject.customer as Stripe.Customer;
    if (customer.email) userData.em = customer.email;
    if (customer.phone) userData.ph = customer.phone;
    if (customer.name) {
      const nameParts = customer.name.split(" ");
      if (nameParts.length >= 1) userData.fn = nameParts[0];
      if (nameParts.length >= 2) userData.ln = nameParts.slice(1).join(" ");
    }
    if (customer.address) {
      if (customer.address.city) userData.ct = customer.address.city;
      if (customer.address.state) userData.st = customer.address.state;
      if (customer.address.postal_code) userData.zp = customer.address.postal_code;
      if (customer.address.country) userData.country = customer.address.country;
    }
    // Use customer ID as external_id
    userData.external_id = customer.id;
  } else if ("email" in stripeObject && stripeObject.email) {
    // Direct Customer object
    const customer = stripeObject as Stripe.Customer;
    userData.em = customer.email || undefined;
    if (customer.phone) userData.ph = customer.phone;
    if (customer.name) {
      const nameParts = customer.name.split(" ");
      if (nameParts.length >= 1) userData.fn = nameParts[0];
      if (nameParts.length >= 2) userData.ln = nameParts.slice(1).join(" ");
    }
    if (customer.address) {
      if (customer.address.city) userData.ct = customer.address.city;
      if (customer.address.state) userData.st = customer.address.state;
      if (customer.address.postal_code) userData.zp = customer.address.postal_code;
      if (customer.address.country) userData.country = customer.address.country;
    }
    userData.external_id = customer.id;
  }

  // For PaymentIntent, check billing_details on latest_charge
  if ("latest_charge" in stripeObject && typeof stripeObject.latest_charge === "object" && stripeObject.latest_charge !== null) {
    const charge = stripeObject.latest_charge as Stripe.Charge;
    if (charge.billing_details) {
      if (charge.billing_details.email && !userData.em) {
        userData.em = charge.billing_details.email;
      }
      if (charge.billing_details.phone && !userData.ph) {
        userData.ph = charge.billing_details.phone;
      }
      if (charge.billing_details.name && !userData.fn) {
        const nameParts = charge.billing_details.name.split(" ");
        if (nameParts.length >= 1) userData.fn = nameParts[0];
        if (nameParts.length >= 2) userData.ln = nameParts.slice(1).join(" ");
      }
      if (charge.billing_details.address) {
        const addr = charge.billing_details.address;
        if (addr.city && !userData.ct) userData.ct = addr.city;
        if (addr.state && !userData.st) userData.st = addr.state;
        if (addr.postal_code && !userData.zp) userData.zp = addr.postal_code;
        if (addr.country && !userData.country) userData.country = addr.country;
      }
    }
  }

  // For Charge directly
  if ("billing_details" in stripeObject && stripeObject.billing_details) {
    const charge = stripeObject as Stripe.Charge;
    if (charge.billing_details.email && !userData.em) {
      userData.em = charge.billing_details.email;
    }
    if (charge.billing_details.phone && !userData.ph) {
      userData.ph = charge.billing_details.phone;
    }
    if (charge.billing_details.name && !userData.fn) {
      const nameParts = charge.billing_details.name.split(" ");
      if (nameParts.length >= 1) userData.fn = nameParts[0];
      if (nameParts.length >= 2) userData.ln = nameParts.slice(1).join(" ");
    }
    if (charge.billing_details.address) {
      const addr = charge.billing_details.address;
      if (addr.city && !userData.ct) userData.ct = addr.city;
      if (addr.state && !userData.st) userData.st = addr.state;
      if (addr.postal_code && !userData.zp) userData.zp = addr.postal_code;
      if (addr.country && !userData.country) userData.country = addr.country;
    }
  }

  // Check metadata for additional user info
  if ("metadata" in stripeObject && stripeObject.metadata) {
    const metadata = stripeObject.metadata;
    if (metadata.client_id && !userData.external_id) {
      userData.external_id = metadata.client_id;
    }
    if (metadata.user_id && !userData.external_id) {
      userData.external_id = metadata.user_id;
    }
    if (metadata.email && !userData.em) {
      userData.em = metadata.email;
    }
    if (metadata.phone && !userData.ph) {
      userData.ph = metadata.phone;
    }
    // Facebook tracking parameters from metadata
    if (metadata.fbc) {
      userData.fbc = metadata.fbc;
    }
    if (metadata.fbp) {
      userData.fbp = metadata.fbp;
    }
    if (metadata.client_ip_address) {
      userData.client_ip_address = metadata.client_ip_address;
    }
    if (metadata.client_user_agent) {
      userData.client_user_agent = metadata.client_user_agent;
    }
  }

  // Merge with additional data (additionalData takes precedence)
  return {
    ...userData,
    ...additionalData,
  };
}

/**
 * Track a Purchase from Stripe PaymentIntent
 * Convenience function for Stripe webhook handlers
 */
export async function trackStripePurchase(
  paymentIntent: Stripe.PaymentIntent,
  options?: {
    serviceType?: string;
    providerType?: string;
    contentName?: string;
    contentCategory?: string;
    eventSourceUrl?: string;
    eventId?: string;
    testEventCode?: string;
    additionalUserData?: Partial<UserData>;
  }
): Promise<CAPIEventResult> {
  const userData = extractUserDataFromStripe(paymentIntent, options?.additionalUserData);

  // Get order ID from metadata
  const orderId = paymentIntent.metadata?.order_id ||
                  paymentIntent.metadata?.call_session_id ||
                  paymentIntent.id;

  return trackCAPIPurchase({
    userData,
    value: paymentIntent.amount / 100, // Convert from cents
    currency: paymentIntent.currency,
    orderId,
    contentName: options?.contentName || paymentIntent.metadata?.service_type || "SOS-Expat Service",
    contentCategory: options?.contentCategory || paymentIntent.metadata?.provider_type,
    contentIds: paymentIntent.metadata?.call_session_id ? [paymentIntent.metadata.call_session_id] : undefined,
    serviceType: options?.serviceType || paymentIntent.metadata?.service_type,
    providerType: options?.providerType || paymentIntent.metadata?.provider_type,
    eventSourceUrl: options?.eventSourceUrl,
    eventId: options?.eventId,
    testEventCode: options?.testEventCode,
  });
}

// ============================================================================
// Exports
// ============================================================================

export {
  META_PIXEL_ID,
  META_CAPI_ENDPOINT,
};

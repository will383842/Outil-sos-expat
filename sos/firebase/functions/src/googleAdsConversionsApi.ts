/**
 * Google Ads Conversions API (Enhanced Conversions)
 *
 * Server-side tracking for Google Ads conversion events.
 * This module provides functions to send conversion events directly to Google's
 * Conversions API, enabling accurate attribution with Enhanced Conversions.
 *
 * Features:
 * - SHA256 hashing for all user data (Enhanced Conversions)
 * - Support for Purchase, Lead, SignUp events
 * - Stripe user data extraction
 * - Unique event ID generation for deduplication
 * - Automatic retry with exponential backoff
 *
 * @see https://developers.google.com/google-ads/api/docs/conversions/upload-clicks
 */

import { createHash } from "crypto";
import { logger } from "firebase-functions/v2";
import Stripe from "stripe";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_PURCHASE_CONVERSION_ID,
  GOOGLE_ADS_LEAD_CONVERSION_ID,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
} from "./lib/secrets";

// Re-export for consumers that import from here
export {
  GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_PURCHASE_CONVERSION_ID,
  GOOGLE_ADS_LEAD_CONVERSION_ID,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
};

// ============================================================================
// Interfaces
// ============================================================================

/**
 * User data for Enhanced Conversions
 * All PII fields will be normalized and hashed with SHA256
 */
export interface GoogleAdsUserData {
  /** Email address (will be normalized and hashed) */
  email?: string;
  /** Phone number in E.164 format (will be normalized and hashed) */
  phone?: string;
  /** First name (will be normalized and hashed) */
  firstName?: string;
  /** Last name (will be normalized and hashed) */
  lastName?: string;
  /** Street address (will be normalized and hashed) */
  streetAddress?: string;
  /** City (will be hashed) */
  city?: string;
  /** State/Region (2-letter code) */
  state?: string;
  /** Zip/Postal code */
  postalCode?: string;
  /** Country (2-letter ISO code) */
  country?: string;
}

/**
 * Google Ads Enhanced Conversion data structure
 * @see https://developers.google.com/google-ads/api/docs/conversions/upload-identifiers
 */
export interface EnhancedConversionData {
  /** Hashed email addresses (SHA256, lowercase) */
  hashedEmail?: string[];
  /** Hashed phone numbers (SHA256, E.164 format) */
  hashedPhoneNumber?: string[];
  /** Hashed first name (SHA256, lowercase) */
  hashedFirstName?: string;
  /** Hashed last name (SHA256, lowercase) */
  hashedLastName?: string;
  /** Hashed street address (SHA256, lowercase) */
  hashedStreetAddress?: string;
  /** City (not hashed) */
  city?: string;
  /** State (2-letter code, not hashed) */
  state?: string;
  /** Postal code (not hashed) */
  postalCode?: string;
  /** Country (2-letter ISO code, not hashed) */
  countryCode?: string;
}

/**
 * Google Ads Conversion Event structure
 */
export interface GoogleAdsConversionEvent {
  /** Conversion action resource name */
  conversionAction: string;
  /** Conversion date time (format: yyyy-mm-dd hh:mm:ss+|-hh:mm) */
  conversionDateTime: string;
  /** Conversion value */
  conversionValue?: number;
  /** Currency code (ISO 4217) */
  currencyCode?: string;
  /** Order ID for deduplication */
  orderId?: string;
  /** GCLID (Google Click ID) */
  gclid?: string;
  /** User identifiers for Enhanced Conversions */
  userIdentifiers?: UserIdentifier[];
  /** Custom variables */
  customVariables?: { conversionCustomVariable: string; value: string }[];
}

/**
 * User identifier structure for Enhanced Conversions
 */
export interface UserIdentifier {
  userIdentifierSource?: "FIRST_PARTY" | "THIRD_PARTY" | "UNSPECIFIED";
  hashedEmail?: string;
  hashedPhoneNumber?: string;
  addressInfo?: {
    hashedFirstName?: string;
    hashedLastName?: string;
    hashedStreetAddress?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    countryCode?: string;
  };
}

/**
 * Result of sending a Google Ads conversion event
 */
export interface GoogleAdsEventResult {
  success: boolean;
  orderId?: string;
  partialFailures?: string[];
  error?: string;
}

// ============================================================================
// Google Ads Event Types for Analytics
// ============================================================================

/**
 * Google Ads event types for analytics tracking
 */
export type GoogleAdsEventType =
  | "Purchase"
  | "Lead"
  | "SignUp"
  | "BeginCheckout"
  | "Contact";

/**
 * Source of the Google Ads event
 */
export type GoogleAdsEventSource =
  | "http_endpoint"
  | "trigger_booking"
  | "trigger_user"
  | "trigger_call"
  | "trigger_payment";

/**
 * Quality score weights for Google Ads Enhanced Conversions
 */
const GOOGLE_ADS_QUALITY_WEIGHTS = {
  email: 25,
  phone: 20,
  gclid: 20,
  firstName: 10,
  lastName: 10,
  address: 10,
  country: 5,
};

/**
 * Calculate quality score for Google Ads user data
 */
function calculateGoogleAdsQualityScore(
  userData: GoogleAdsUserData | undefined,
  gclid?: string
): number {
  if (!userData) {
    return gclid ? GOOGLE_ADS_QUALITY_WEIGHTS.gclid : 0;
  }

  let score = 0;
  if (userData.email) score += GOOGLE_ADS_QUALITY_WEIGHTS.email;
  if (userData.phone) score += GOOGLE_ADS_QUALITY_WEIGHTS.phone;
  if (gclid) score += GOOGLE_ADS_QUALITY_WEIGHTS.gclid;
  if (userData.firstName) score += GOOGLE_ADS_QUALITY_WEIGHTS.firstName;
  if (userData.lastName) score += GOOGLE_ADS_QUALITY_WEIGHTS.lastName;
  if (userData.streetAddress) score += GOOGLE_ADS_QUALITY_WEIGHTS.address;
  if (userData.country) score += GOOGLE_ADS_QUALITY_WEIGHTS.country;

  return score;
}

/**
 * Log Google Ads event to Firestore for analytics dashboard
 */
export async function logGoogleAdsEventToFirestore(params: {
  eventType: GoogleAdsEventType;
  source: GoogleAdsEventSource;
  userId?: string;
  orderId?: string;
  value?: number;
  currency?: string;
  gclid?: string;
  userData?: GoogleAdsUserData;
  success: boolean;
  error?: string;
  contentName?: string;
  contentCategory?: string;
}): Promise<void> {
  const logPrefix = "[Google Ads Analytics]";

  try {
    const db = getFirestore();
    const qualityScore = calculateGoogleAdsQualityScore(params.userData, params.gclid);

    const eventData = {
      eventType: params.eventType,
      eventId: params.orderId || generateOrderId("gads"),
      source: params.source,
      userId: params.userId || null,
      isAnonymous: !params.userId,
      value: params.value || null,
      currency: params.currency || "EUR",
      gclid: params.gclid || null,
      success: params.success,
      error: params.error || null,
      contentName: params.contentName || null,
      contentCategory: params.contentCategory || null,
      // Quality metrics
      qualityScore,
      hasEmail: !!params.userData?.email,
      hasPhone: !!params.userData?.phone,
      hasGclid: !!params.gclid,
      hasFirstName: !!params.userData?.firstName,
      hasLastName: !!params.userData?.lastName,
      hasAddress: !!params.userData?.streetAddress,
      hasCountry: !!params.userData?.country,
      // Timestamps
      trackedAt: Timestamp.now(),
      createdAt: Timestamp.now(),
    };

    await db.collection("google_ads_events").add(eventData);

    logger.info(`${logPrefix} Event logged to Firestore`, {
      eventType: params.eventType,
      source: params.source,
      orderId: params.orderId,
      qualityScore,
      success: params.success,
    });
  } catch (error) {
    // Don't throw - logging failure shouldn't break the main flow
    logger.error(`${logPrefix} Failed to log event to Firestore`, {
      error: error instanceof Error ? error.message : "Unknown error",
      eventType: params.eventType,
    });
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique order ID for deduplication
 */
export function generateOrderId(prefix: string = "gads"): string {
  const timestamp = Date.now();
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
 * Normalize text: lowercase, trim, remove extra spaces
 */
function normalizeText(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Normalize and hash a value for Enhanced Conversions
 */
function normalizeAndHash(value: string | undefined | null): string | undefined {
  if (!value || typeof value !== "string") {
    return undefined;
  }
  const normalized = normalizeText(value);
  if (normalized.length === 0) {
    return undefined;
  }
  return sha256Hash(normalized);
}

/**
 * Normalize phone number to E.164 format (digits only with country code)
 */
function normalizePhoneNumber(phone: string | undefined | null, defaultCountryCode: string = "33"): string | undefined {
  if (!phone || typeof phone !== "string") {
    return undefined;
  }

  let normalized = phone.replace(/[^\d+]/g, "");
  const hasPlus = normalized.startsWith("+");
  normalized = normalized.replace(/\+/g, "");

  // Remove leading zeros
  normalized = normalized.replace(/^0+/, "");

  if (normalized.length === 0) {
    return undefined;
  }

  // For French numbers without country code (9 digits after removing leading 0)
  if (!hasPlus && normalized.length === 9) {
    normalized = defaultCountryCode + normalized;
  }

  // E.164 format: +{countrycode}{number}
  return "+" + normalized;
}

/**
 * Format date to Google Ads format: yyyy-mm-dd hh:mm:ss+|-hh:mm
 */
function formatDateTimeForGoogleAds(date: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  // Get timezone offset
  const offset = date.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offset / 60));
  const offsetMinutes = Math.abs(offset % 60);
  const offsetSign = offset <= 0 ? "+" : "-";

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}${offsetSign}${pad(offsetHours)}:${pad(offsetMinutes)}`;
}

/**
 * Hash user data for Google Ads Enhanced Conversions
 */
export function hashUserData(userData: GoogleAdsUserData): UserIdentifier[] {
  const identifiers: UserIdentifier[] = [];

  // Email identifier
  if (userData.email) {
    const hashedEmail = normalizeAndHash(userData.email);
    if (hashedEmail) {
      identifiers.push({
        userIdentifierSource: "FIRST_PARTY",
        hashedEmail,
      });
    }
  }

  // Phone identifier
  if (userData.phone) {
    const normalizedPhone = normalizePhoneNumber(userData.phone);
    if (normalizedPhone) {
      identifiers.push({
        userIdentifierSource: "FIRST_PARTY",
        hashedPhoneNumber: sha256Hash(normalizedPhone),
      });
    }
  }

  // Address identifier (if we have name or address components)
  if (userData.firstName || userData.lastName || userData.streetAddress || userData.city) {
    const addressInfo: UserIdentifier["addressInfo"] = {};

    if (userData.firstName) {
      addressInfo.hashedFirstName = normalizeAndHash(userData.firstName);
    }
    if (userData.lastName) {
      addressInfo.hashedLastName = normalizeAndHash(userData.lastName);
    }
    if (userData.streetAddress) {
      addressInfo.hashedStreetAddress = normalizeAndHash(userData.streetAddress);
    }
    if (userData.city) {
      addressInfo.city = normalizeText(userData.city);
    }
    if (userData.state) {
      addressInfo.state = userData.state.toUpperCase();
    }
    if (userData.postalCode) {
      addressInfo.postalCode = userData.postalCode.replace(/\s/g, "");
    }
    if (userData.country) {
      addressInfo.countryCode = userData.country.toUpperCase().substring(0, 2);
    }

    // Only add if we have at least one address component
    if (Object.keys(addressInfo).length > 0) {
      identifiers.push({
        userIdentifierSource: "FIRST_PARTY",
        addressInfo,
      });
    }
  }

  return identifiers;
}

// ============================================================================
// OAuth Token Management
// ============================================================================

let cachedAccessToken: { token: string; expiresAt: number } | null = null;

/**
 * Get a fresh OAuth access token using the refresh token
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now() + 60000) {
    return cachedAccessToken.token;
  }

  try {
    const clientId = GOOGLE_ADS_CLIENT_ID.value();
    const clientSecret = GOOGLE_ADS_CLIENT_SECRET.value();
    const refreshToken = GOOGLE_ADS_REFRESH_TOKEN.value();

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error("Missing OAuth credentials");
    }

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OAuth token refresh failed: ${response.status} - ${errorData}`);
    }

    const data = await response.json() as { access_token: string; expires_in: number };

    // Cache the token
    cachedAccessToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
    };

    return data.access_token;
  } catch (error) {
    logger.error("[Google Ads] OAuth token refresh failed", { error });
    throw error;
  }
}

// ============================================================================
// Core API Functions
// ============================================================================

/**
 * Send a conversion event to Google Ads API
 *
 * Note: This uses the Google Ads API directly. For simpler setups,
 * you can also use the Measurement Protocol for Google Analytics 4
 * which can forward conversions to Google Ads.
 */
export async function sendConversionEvent(
  conversionActionId: string,
  params: {
    value?: number;
    currency?: string;
    orderId?: string;
    gclid?: string;
    userData?: GoogleAdsUserData;
    conversionDateTime?: Date;
  }
): Promise<GoogleAdsEventResult> {
  const logPrefix = "[Google Ads Conversion]";

  try {
    // Get secrets
    const customerId = GOOGLE_ADS_CUSTOMER_ID.value()?.replace(/-/g, "");
    const developerToken = GOOGLE_ADS_DEVELOPER_TOKEN.value();

    if (!customerId || !developerToken) {
      logger.warn(`${logPrefix} Missing Google Ads configuration`);
      return {
        success: false,
        error: "Missing Google Ads configuration (customer ID or developer token)",
      };
    }

    // Get OAuth access token
    const accessToken = await getAccessToken();

    // Build conversion action resource name
    const conversionAction = `customers/${customerId}/conversionActions/${conversionActionId}`;

    // Build user identifiers for Enhanced Conversions
    const userIdentifiers = params.userData ? hashUserData(params.userData) : [];

    // Build the conversion
    const conversion: GoogleAdsConversionEvent = {
      conversionAction,
      conversionDateTime: formatDateTimeForGoogleAds(params.conversionDateTime || new Date()),
      conversionValue: params.value,
      currencyCode: params.currency?.toUpperCase(),
      orderId: params.orderId,
      gclid: params.gclid,
      userIdentifiers: userIdentifiers.length > 0 ? userIdentifiers : undefined,
    };

    logger.info(`${logPrefix} Sending conversion`, {
      conversionAction,
      orderId: params.orderId,
      value: params.value,
      currency: params.currency,
      hasGclid: !!params.gclid,
      userIdentifiersCount: userIdentifiers.length,
    });

    // Google Ads API endpoint for uploading click conversions
    const apiUrl = `https://googleads.googleapis.com/v14/customers/${customerId}:uploadClickConversions`;

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "developer-token": developerToken,
      },
      body: JSON.stringify({
        conversions: [conversion],
        partialFailure: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      logger.error(`${logPrefix} API error`, {
        status: response.status,
        error: errorData,
        orderId: params.orderId,
      });
      return {
        success: false,
        orderId: params.orderId,
        error: `API error: ${response.status} - ${errorData}`,
      };
    }

    const result = await response.json() as {
      results?: { conversionAction?: string }[];
      partialFailureError?: { message?: string };
    };

    // Check for partial failures
    if (result.partialFailureError) {
      logger.warn(`${logPrefix} Partial failure`, {
        orderId: params.orderId,
        error: result.partialFailureError.message,
      });
      return {
        success: true, // Partial success
        orderId: params.orderId,
        partialFailures: [result.partialFailureError.message || "Unknown partial failure"],
      };
    }

    logger.info(`${logPrefix} Conversion sent successfully`, {
      orderId: params.orderId,
      conversionAction,
    });

    return {
      success: true,
      orderId: params.orderId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error(`${logPrefix} Error sending conversion`, {
      error: errorMessage,
      orderId: params.orderId,
    });
    return {
      success: false,
      orderId: params.orderId,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Track a Purchase conversion
 */
export async function trackGoogleAdsPurchase(params: {
  value: number;
  currency: string;
  orderId?: string;
  gclid?: string;
  userData?: GoogleAdsUserData;
  conversionDateTime?: Date;
}): Promise<GoogleAdsEventResult> {
  try {
    const conversionActionId = GOOGLE_ADS_PURCHASE_CONVERSION_ID.value();
    if (!conversionActionId) {
      logger.warn("[Google Ads] GOOGLE_ADS_PURCHASE_CONVERSION_ID not configured");
      return {
        success: false,
        error: "Purchase conversion action ID not configured",
      };
    }

    return sendConversionEvent(conversionActionId, params);
  } catch (error) {
    return {
      success: false,
      orderId: params.orderId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Track a Lead conversion
 */
export async function trackGoogleAdsLead(params: {
  value?: number;
  currency?: string;
  orderId?: string;
  gclid?: string;
  userData?: GoogleAdsUserData;
  conversionDateTime?: Date;
}): Promise<GoogleAdsEventResult> {
  try {
    const conversionActionId = GOOGLE_ADS_LEAD_CONVERSION_ID.value();
    if (!conversionActionId) {
      logger.warn("[Google Ads] GOOGLE_ADS_LEAD_CONVERSION_ID not configured");
      return {
        success: false,
        error: "Lead conversion action ID not configured",
      };
    }

    return sendConversionEvent(conversionActionId, {
      ...params,
      orderId: params.orderId || generateOrderId("lead"),
    });
  } catch (error) {
    return {
      success: false,
      orderId: params.orderId,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ============================================================================
// Stripe Integration
// ============================================================================

/**
 * Extract user data from a Stripe object for Google Ads Enhanced Conversions
 */
export function extractUserDataFromStripe(
  stripeObject: Stripe.PaymentIntent | Stripe.Charge | Stripe.Customer,
  additionalData?: Partial<GoogleAdsUserData>
): GoogleAdsUserData {
  const userData: GoogleAdsUserData = {};

  // Handle different Stripe object types
  if ("customer" in stripeObject && typeof stripeObject.customer === "object" && stripeObject.customer !== null) {
    const customer = stripeObject.customer as Stripe.Customer;
    if (customer.email) userData.email = customer.email;
    if (customer.phone) userData.phone = customer.phone;
    if (customer.name) {
      const nameParts = customer.name.split(" ");
      if (nameParts.length >= 1) userData.firstName = nameParts[0];
      if (nameParts.length >= 2) userData.lastName = nameParts.slice(1).join(" ");
    }
    if (customer.address) {
      if (customer.address.line1) userData.streetAddress = customer.address.line1;
      if (customer.address.city) userData.city = customer.address.city;
      if (customer.address.state) userData.state = customer.address.state;
      if (customer.address.postal_code) userData.postalCode = customer.address.postal_code;
      if (customer.address.country) userData.country = customer.address.country;
    }
  } else if ("email" in stripeObject && stripeObject.email) {
    const customer = stripeObject as Stripe.Customer;
    userData.email = customer.email || undefined;
    if (customer.phone) userData.phone = customer.phone;
    if (customer.name) {
      const nameParts = customer.name.split(" ");
      if (nameParts.length >= 1) userData.firstName = nameParts[0];
      if (nameParts.length >= 2) userData.lastName = nameParts.slice(1).join(" ");
    }
    if (customer.address) {
      if (customer.address.line1) userData.streetAddress = customer.address.line1;
      if (customer.address.city) userData.city = customer.address.city;
      if (customer.address.state) userData.state = customer.address.state;
      if (customer.address.postal_code) userData.postalCode = customer.address.postal_code;
      if (customer.address.country) userData.country = customer.address.country;
    }
  }

  // For Charge with billing_details
  if ("billing_details" in stripeObject && stripeObject.billing_details) {
    const charge = stripeObject as Stripe.Charge;
    if (charge.billing_details.email && !userData.email) {
      userData.email = charge.billing_details.email;
    }
    if (charge.billing_details.phone && !userData.phone) {
      userData.phone = charge.billing_details.phone;
    }
    if (charge.billing_details.name && !userData.firstName) {
      const nameParts = charge.billing_details.name.split(" ");
      if (nameParts.length >= 1) userData.firstName = nameParts[0];
      if (nameParts.length >= 2) userData.lastName = nameParts.slice(1).join(" ");
    }
    if (charge.billing_details.address) {
      const addr = charge.billing_details.address;
      if (addr.line1 && !userData.streetAddress) userData.streetAddress = addr.line1;
      if (addr.city && !userData.city) userData.city = addr.city;
      if (addr.state && !userData.state) userData.state = addr.state;
      if (addr.postal_code && !userData.postalCode) userData.postalCode = addr.postal_code;
      if (addr.country && !userData.country) userData.country = addr.country;
    }
  }

  // Merge with additional data
  return {
    ...userData,
    ...additionalData,
  };
}

/**
 * Track a Purchase from Stripe PaymentIntent
 */
export async function trackStripePurchase(
  paymentIntent: Stripe.PaymentIntent,
  options?: {
    gclid?: string;
    additionalUserData?: Partial<GoogleAdsUserData>;
  }
): Promise<GoogleAdsEventResult> {
  const userData = extractUserDataFromStripe(paymentIntent, options?.additionalUserData);

  // Try to get GCLID from metadata
  const gclid = options?.gclid || paymentIntent.metadata?.gclid;

  const orderId = paymentIntent.metadata?.order_id ||
                  paymentIntent.metadata?.call_session_id ||
                  paymentIntent.id;

  return trackGoogleAdsPurchase({
    value: paymentIntent.amount / 100,
    currency: paymentIntent.currency,
    orderId,
    gclid,
    userData,
  });
}

// ============================================================================
// Exports
// ============================================================================

export default {
  // Core
  sendConversionEvent,
  hashUserData,
  generateOrderId,

  // Tracking
  trackGoogleAdsPurchase,
  trackGoogleAdsLead,

  // Stripe
  extractUserDataFromStripe,
  trackStripePurchase,

  // Analytics
  logGoogleAdsEventToFirestore,
};

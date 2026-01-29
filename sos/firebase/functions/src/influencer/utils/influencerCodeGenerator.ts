/**
 * Influencer Code Generator
 *
 * Generates unique affiliate codes for influencers:
 * - Client codes: e.g., "MARIE123"
 * - Recruitment codes: e.g., "REC-MARIE123"
 */

import { getFirestore } from "firebase-admin/firestore";
import * as crypto from "crypto";

// ============================================================================
// CODE GENERATION
// ============================================================================

/**
 * Generate a unique client affiliate code
 * Format: FIRSTNAME + 3-4 random digits
 * e.g., "MARIE123", "JEAN4567"
 */
export async function generateClientCode(firstName: string): Promise<string> {
  const db = getFirestore();
  const cleanName = firstName
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^A-Z]/g, "") // Keep only letters
    .substring(0, 8); // Max 8 chars

  const baseName = cleanName || "USER";

  // Try to generate a unique code
  for (let attempt = 0; attempt < 10; attempt++) {
    const randomSuffix = generateRandomDigits(attempt < 5 ? 3 : 4);
    const code = `${baseName}${randomSuffix}`;

    // Check if code is unique
    const existingQuery = await db
      .collection("influencers")
      .where("affiliateCodeClient", "==", code)
      .limit(1)
      .get();

    if (existingQuery.empty) {
      return code;
    }
  }

  // Fallback: use full random code
  const fallbackCode = `${baseName}${generateRandomDigits(6)}`;
  return fallbackCode;
}

/**
 * Generate a recruitment code from a client code
 * Format: REC-CLIENTCODE
 * e.g., "REC-MARIE123"
 */
export function generateRecruitmentCode(clientCode: string): string {
  return `REC-${clientCode}`;
}

/**
 * Generate random digits
 */
function generateRandomDigits(length: number): string {
  const bytes = crypto.randomBytes(Math.ceil(length / 2));
  const number = parseInt(bytes.toString("hex"), 16) % Math.pow(10, length);
  return number.toString().padStart(length, "0");
}

// ============================================================================
// TRACKING URL GENERATION
// ============================================================================

const BASE_URL = "https://sos-expat.com";

/**
 * Generate a client referral link with 5% discount
 * Format: https://sos-expat.com/ref/i/CODE
 */
export function generateClientReferralLink(code: string): string {
  return `${BASE_URL}/ref/i/${code}`;
}

/**
 * Generate a provider recruitment link
 * Format: https://sos-expat.com/rec/i/CODE
 */
export function generateRecruitmentLink(code: string): string {
  return `${BASE_URL}/rec/i/${code}`;
}

/**
 * Generate links with UTM parameters
 */
export function generateLinkWithUtm(
  baseLink: string,
  utm: {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
  }
): string {
  const url = new URL(baseLink);

  if (utm.source) url.searchParams.set("utm_source", utm.source);
  if (utm.medium) url.searchParams.set("utm_medium", utm.medium);
  if (utm.campaign) url.searchParams.set("utm_campaign", utm.campaign);
  if (utm.content) url.searchParams.set("utm_content", utm.content);

  return url.toString();
}

// ============================================================================
// CODE VALIDATION
// ============================================================================

/**
 * Validate a client code format
 */
export function isValidClientCode(code: string): boolean {
  // Format: 2-8 letters + 3-6 digits
  return /^[A-Z]{2,8}\d{3,6}$/.test(code);
}

/**
 * Validate a recruitment code format
 */
export function isValidRecruitmentCode(code: string): boolean {
  // Format: REC- + client code
  return /^REC-[A-Z]{2,8}\d{3,6}$/.test(code);
}

/**
 * Extract client code from recruitment code
 */
export function extractClientCode(recruitmentCode: string): string | null {
  if (!isValidRecruitmentCode(recruitmentCode)) {
    return null;
  }
  return recruitmentCode.replace("REC-", "");
}

// ============================================================================
// IP HASHING
// ============================================================================

/**
 * Hash an IP address for privacy
 */
export function hashIP(ip: string): string {
  return crypto
    .createHash("sha256")
    .update(ip + process.env.IP_SALT || "influencer-salt")
    .digest("hex")
    .substring(0, 32);
}

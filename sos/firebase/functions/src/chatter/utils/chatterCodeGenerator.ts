/**
 * Chatter Code Generator
 *
 * Generates unique affiliate codes for chatters:
 * - Client referral codes: FIRSTNAME123 (e.g., JEAN456)
 * - Recruitment codes: REC-FIRSTNAME123 (e.g., REC-JEAN456)
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

/**
 * Generate a unique client affiliate code
 * Format: FIRSTNAME + 3 random digits (e.g., JEAN456)
 */
export async function generateChatterClientCode(
  firstName: string,
  email: string
): Promise<string> {
  const db = getFirestore();
  const chattersRef = db.collection("chatters");

  // Normalize first name: uppercase, remove accents, keep only letters
  const normalizedName = normalizeForCode(firstName);

  // Try to generate a unique code
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    // Generate random 3-digit suffix
    const suffix = Math.floor(100 + Math.random() * 900).toString();
    const code = `${normalizedName}${suffix}`;

    // Check if code already exists
    const existingQuery = await chattersRef
      .where("affiliateCodeClient", "==", code)
      .limit(1)
      .get();

    if (existingQuery.empty) {
      logger.info("[generateChatterClientCode] Generated unique code", {
        code,
        firstName,
        attempts: attempts + 1,
      });
      return code;
    }

    attempts++;
  }

  // Fallback: use email prefix + random 4-digit string, with uniqueness check
  const emailPrefix = email.split("@")[0].toUpperCase().slice(0, 4);
  const normalizedPrefix = normalizeForCode(emailPrefix);

  for (let fallbackAttempt = 0; fallbackAttempt < 5; fallbackAttempt++) {
    const fallbackSuffix = Math.floor(1000 + Math.random() * 9000).toString();
    const fallbackCode = `${normalizedPrefix}${fallbackSuffix}`;

    const fallbackCheck = await chattersRef
      .where("affiliateCodeClient", "==", fallbackCode)
      .limit(1)
      .get();

    if (fallbackCheck.empty) {
      logger.warn("[generateChatterClientCode] Using fallback code generation", {
        fallbackCode,
        firstName,
        email,
        fallbackAttempt: fallbackAttempt + 1,
      });
      return fallbackCode;
    }
  }

  // Ultimate fallback: timestamp-based code (virtually unique)
  const ultimateCode = `${normalizedPrefix}${Date.now().toString(36).toUpperCase().slice(-5)}`;
  logger.error("[generateChatterClientCode] All fallback attempts exhausted, using timestamp code", {
    ultimateCode,
    firstName,
    email,
  });
  return ultimateCode;
}

/**
 * Generate recruitment code from client code
 * Format: REC-CLIENTCODE (e.g., REC-JEAN456)
 */
export function generateChatterRecruitmentCode(clientCode: string): string {
  return `REC-${clientCode}`;
}

/**
 * Normalize string for code generation
 * - Convert to uppercase
 * - Remove accents
 * - Keep only A-Z letters
 * - Truncate to max 8 characters
 */
export function normalizeForCode(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toUpperCase()
    .replace(/[^A-Z]/g, "") // Keep only letters
    .slice(0, 8); // Max 8 characters
}

/**
 * Validate a client affiliate code format
 */
export function isValidClientCode(code: string): boolean {
  // Format: 1-8 letters + 3-4 digits
  return /^[A-Z]{1,8}\d{3,4}$/.test(code);
}

/**
 * Validate a recruitment code format
 */
export function isValidRecruitmentCode(code: string): boolean {
  // Format: REC- + client code
  if (!code.startsWith("REC-")) {
    return false;
  }
  return isValidClientCode(code.slice(4));
}

/**
 * Extract client code from recruitment code
 */
export function getClientCodeFromRecruitmentCode(
  recruitmentCode: string
): string | null {
  if (!recruitmentCode.startsWith("REC-")) {
    return null;
  }
  return recruitmentCode.slice(4);
}

/**
 * Normalize code for lookup (uppercase, trim)
 */
export function normalizeCodeForLookup(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Find chatter by client affiliate code
 */
export async function findChatterByClientCode(
  code: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> {
  const db = getFirestore();
  const normalizedCode = normalizeCodeForLookup(code);

  const query = await db
    .collection("chatters")
    .where("affiliateCodeClient", "==", normalizedCode)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (query.empty) {
    return null;
  }

  return query.docs[0];
}

/**
 * Find chatter by recruitment code
 */
export async function findChatterByRecruitmentCode(
  code: string
): Promise<FirebaseFirestore.DocumentSnapshot | null> {
  const db = getFirestore();
  const normalizedCode = normalizeCodeForLookup(code);

  const query = await db
    .collection("chatters")
    .where("affiliateCodeRecruitment", "==", normalizedCode)
    .where("status", "==", "active")
    .limit(1)
    .get();

  if (query.empty) {
    return null;
  }

  return query.docs[0];
}

/**
 * Check if a code (client or recruitment) is valid and find the chatter
 */
export async function resolveChatterCode(code: string): Promise<{
  valid: boolean;
  type: "client" | "recruitment" | null;
  chatterId: string | null;
  chatterCode: string | null;
}> {
  const normalizedCode = normalizeCodeForLookup(code);

  // Check if it's a recruitment code
  if (normalizedCode.startsWith("REC-")) {
    const chatter = await findChatterByRecruitmentCode(normalizedCode);
    if (chatter) {
      return {
        valid: true,
        type: "recruitment",
        chatterId: chatter.id,
        chatterCode: normalizedCode,
      };
    }
    return {
      valid: false,
      type: "recruitment",
      chatterId: null,
      chatterCode: null,
    };
  }

  // Check if it's a client code
  const chatter = await findChatterByClientCode(normalizedCode);
  if (chatter) {
    return {
      valid: true,
      type: "client",
      chatterId: chatter.id,
      chatterCode: normalizedCode,
    };
  }

  return {
    valid: false,
    type: null,
    chatterId: null,
    chatterCode: null,
  };
}

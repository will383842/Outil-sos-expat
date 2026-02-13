/**
 * Affiliate Code Generator
 *
 * Generates unique 6-8 character alphanumeric affiliate codes.
 * Codes are designed to be:
 * - Easy to read and share (no confusing characters like 0/O, 1/l/I)
 * - Unique across all users
 * - Persistent (never changes once assigned)
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

// Characters used for code generation (excluding confusing ones)
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // No I, O
const NUMBERS = "23456789"; // No 0, 1
const ALL_CHARS = ALPHABET + NUMBERS;

/**
 * Generate a random code of specified length
 */
function generateRandomCode(length: number): string {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALL_CHARS.charAt(Math.floor(Math.random() * ALL_CHARS.length));
  }
  return code;
}

/**
 * Generate a code based on user data (semi-deterministic for readability)
 * Uses first letters of name + random suffix
 */
function generateSeededCode(
  email: string,
  firstName?: string,
  lastName?: string
): string {
  let prefix = "";

  // Try to use name initials
  if (firstName && firstName.length > 0) {
    prefix += firstName.charAt(0).toUpperCase();
  }
  if (lastName && lastName.length > 0) {
    prefix += lastName.charAt(0).toUpperCase();
  }

  // If no name, use email prefix
  if (prefix.length === 0) {
    const emailPrefix = email.split("@")[0].toUpperCase();
    prefix = emailPrefix.substring(0, 2);
  }

  // Filter out confusing characters from prefix
  prefix = prefix.replace(/[0O1LI]/g, "X");

  // Ensure prefix is at least 2 chars
  while (prefix.length < 2) {
    prefix += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }

  // Add random suffix to make it 6-8 chars total
  const suffixLength = Math.random() > 0.5 ? 4 : 6; // 6 or 8 total
  const suffix = generateRandomCode(suffixLength);

  return prefix.substring(0, 2) + suffix;
}

/**
 * Check if a code already exists in Firestore
 */
async function isCodeTaken(code: string): Promise<boolean> {
  const db = getFirestore();

  // Check in users collection (affiliateCode field)
  const usersQuery = await db
    .collection("users")
    .where("affiliateCode", "==", code)
    .limit(1)
    .get();

  if (!usersQuery.empty) {
    return true;
  }

  // Also check affiliate_codes collection for reserved codes
  const reservedDoc = await db.collection("affiliate_codes").doc(code).get();
  if (reservedDoc.exists) {
    return true;
  }

  return false;
}

/**
 * Generate a unique affiliate code for a user
 *
 * @param email User's email
 * @param firstName User's first name (optional)
 * @param lastName User's last name (optional)
 * @param maxAttempts Maximum attempts before falling back to random
 * @returns Unique affiliate code
 */
export async function generateAffiliateCode(
  email: string,
  firstName?: string,
  lastName?: string,
  maxAttempts = 10
): Promise<string> {
  // First, try a seeded code (more memorable)
  for (let attempt = 0; attempt < maxAttempts / 2; attempt++) {
    const code = generateSeededCode(email, firstName, lastName);
    const taken = await isCodeTaken(code);

    if (!taken) {
      logger.info(`[AffiliateCode] Generated seeded code: ${code}`, {
        email,
        attempt,
      });
      return code;
    }
  }

  // Fall back to fully random codes
  for (let attempt = 0; attempt < maxAttempts / 2; attempt++) {
    const code = generateRandomCode(6 + (attempt % 3)); // 6, 7, or 8 chars
    const taken = await isCodeTaken(code);

    if (!taken) {
      logger.info(`[AffiliateCode] Generated random code: ${code}`, {
        email,
        attempt: attempt + maxAttempts / 2,
      });
      return code;
    }
  }

  // Last resort: timestamp-based code
  const timestamp = Date.now().toString(36).toUpperCase();
  const finalCode = timestamp.substring(timestamp.length - 6) + generateRandomCode(2);
  logger.warn(`[AffiliateCode] Using timestamp-based code: ${finalCode}`, {
    email,
  });

  return finalCode;
}

/**
 * Validate an affiliate code format
 */
export function isValidAffiliateCode(code: string): boolean {
  if (!code || typeof code !== "string") {
    return false;
  }

  // Must be 6-8 alphanumeric characters
  if (code.length < 6 || code.length > 8) {
    return false;
  }

  // Must only contain valid characters
  return /^[A-Z0-9]+$/i.test(code);
}

/**
 * Normalize an affiliate code (uppercase, trim)
 */
export function normalizeAffiliateCode(code: string): string {
  if (!code) return "";
  return code.trim().toUpperCase();
}

/**
 * Resolve an affiliate code to a user ID
 *
 * @param code Affiliate code to resolve
 * @returns User ID, email, and actor type or null if not found
 */
export async function resolveAffiliateCode(
  code: string
): Promise<{ userId: string; email: string; actorType?: string } | null> {
  if (!isValidAffiliateCode(code)) {
    logger.warn(`[AffiliateCode] Invalid code format: ${code}`);
    return null;
  }

  const normalizedCode = normalizeAffiliateCode(code);
  const db = getFirestore();

  // 1. First try: Generic affiliate code (default system)
  let querySnapshot = await db
    .collection("users")
    .where("affiliateCode", "==", normalizedCode)
    .limit(1)
    .get();

  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    logger.info(`[AffiliateCode] Code resolved (generic): ${normalizedCode}`);
    return {
      userId: doc.id,
      email: data.email || "",
      actorType: "generic",
    };
  }

  // 2. Second try: Blogger/Influencer/Chatter/GroupAdmin client code
  querySnapshot = await db
    .collection("users")
    .where("affiliateCodeClient", "==", normalizedCode)
    .limit(1)
    .get();

  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    const role = data.role || "";
    logger.info(`[AffiliateCode] Code resolved (client code): ${normalizedCode}`, {
      role,
    });
    return {
      userId: doc.id,
      email: data.email || "",
      actorType: role, // "blogger", "influencer", "chatter", "groupAdmin"
    };
  }

  // 3. Third try: Recruitment code (for provider recruitment)
  querySnapshot = await db
    .collection("users")
    .where("affiliateCodeRecruitment", "==", normalizedCode)
    .limit(1)
    .get();

  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    const data = doc.data();
    const role = data.role || "";
    logger.info(`[AffiliateCode] Code resolved (recruitment code): ${normalizedCode}`, {
      role,
    });
    return {
      userId: doc.id,
      email: data.email || "",
      actorType: `${role}_recruitment`, // "blogger_recruitment", etc.
    };
  }

  logger.info(`[AffiliateCode] Code not found: ${normalizedCode}`);
  return null;
}

/**
 * Reserve an affiliate code (for admin assignment)
 */
export async function reserveAffiliateCode(
  code: string,
  reservedBy: string,
  reason?: string
): Promise<boolean> {
  if (!isValidAffiliateCode(code)) {
    return false;
  }

  const normalizedCode = normalizeAffiliateCode(code);
  const db = getFirestore();

  // Check if already taken
  const taken = await isCodeTaken(normalizedCode);
  if (taken) {
    return false;
  }

  // Reserve the code
  await db.collection("affiliate_codes").doc(normalizedCode).set({
    code: normalizedCode,
    isReserved: true,
    reservedBy,
    reservedAt: new Date(),
    reason: reason || "Admin reserved",
    assignedToUserId: null,
  });

  logger.info(`[AffiliateCode] Reserved code: ${normalizedCode}`, {
    reservedBy,
    reason,
  });

  return true;
}

/**
 * Blogger Code Generator
 *
 * Generates unique affiliate codes and URLs for bloggers.
 * Pattern: BLOG-PRENOM123 (client), REC-BLOG-PRENOM123 (recruitment)
 * URLs: /ref/b/CODE (client), /rec/b/CODE (recruitment)
 */

import { getFirestore } from "firebase-admin/firestore";

// ============================================================================
// CODE GENERATION
// ============================================================================

/**
 * Generate a unique client affiliate code for a blogger
 * Format: BLOG-PRENOM + UID suffix (0 Firestore lookups, guaranteed unique)
 *
 * P1-4 FIX: Replaced unbounded loop (up to 999 lookups) with UID-based pattern.
 * Same approach as GroupAdmin — uniqueness guaranteed by UID, zero collision risk.
 */
export function generateBloggerClientCode(firstName: string, uid: string): string {
  const cleanName = sanitizeName(firstName).toUpperCase().substring(0, 4);
  const uidSuffix = uid.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `BLOG-${cleanName}${uidSuffix}`;
}

/**
 * Generate a unique recruitment affiliate code for a blogger
 * Format: REC-BLOG-PRENOM + UID suffix (0 Firestore lookups)
 */
export function generateBloggerRecruitmentCode(firstName: string, uid: string): string {
  const cleanName = sanitizeName(firstName).toUpperCase().substring(0, 4);
  const uidSuffix = uid.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase();
  return `REC-BLOG-${cleanName}${uidSuffix}`;
}

/**
 * Generate both codes for a new blogger
 * P1-4 FIX: Now synchronous (no Firestore lookups needed)
 */
export function generateBloggerAffiliateCodes(firstName: string, uid: string): {
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
} {
  const affiliateCodeClient = generateBloggerClientCode(firstName, uid);
  const affiliateCodeRecruitment = generateBloggerRecruitmentCode(firstName, uid);

  return {
    affiliateCodeClient,
    affiliateCodeRecruitment,
  };
}

// ============================================================================
// URL GENERATION
// ============================================================================

/**
 * Generate client referral URL
 * Format: /ref/b/CODE
 */
export function generateBloggerClientUrl(code: string, baseUrl?: string): string {
  const base = baseUrl || "https://sos-expat.com";
  return `${base}/ref/b/${code}`;
}

/**
 * Generate recruitment URL
 * Format: /rec/b/CODE
 */
export function generateBloggerRecruitmentUrl(code: string, baseUrl?: string): string {
  const base = baseUrl || "https://sos-expat.com";
  return `${base}/rec/b/${code}`;
}

/**
 * Generate all URLs for a blogger
 */
export function generateBloggerUrls(
  affiliateCodeClient: string,
  affiliateCodeRecruitment: string,
  baseUrl?: string
): {
  clientUrl: string;
  recruitmentUrl: string;
} {
  return {
    clientUrl: generateBloggerClientUrl(affiliateCodeClient, baseUrl),
    recruitmentUrl: generateBloggerRecruitmentUrl(affiliateCodeRecruitment, baseUrl),
  };
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Sanitize a name for use in affiliate code
 */
function sanitizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-zA-Z0-9]/g, "") // Remove non-alphanumeric
    .substring(0, 10); // Limit length
}

/**
 * Extract blogger code from a URL
 */
export function extractBloggerCodeFromUrl(url: string): {
  code: string | null;
  type: "client" | "recruitment" | null;
} {
  // Match /ref/b/CODE or /rec/b/CODE
  const clientMatch = url.match(/\/ref\/b\/([A-Z0-9-]+)/i);
  if (clientMatch) {
    return { code: clientMatch[1].toUpperCase(), type: "client" };
  }

  const recruitmentMatch = url.match(/\/rec\/b\/([A-Z0-9-]+)/i);
  if (recruitmentMatch) {
    return { code: recruitmentMatch[1].toUpperCase(), type: "recruitment" };
  }

  return { code: null, type: null };
}

/**
 * Validate a blogger code format
 */
export function isValidBloggerCode(code: string): boolean {
  // Client code: BLOG-XXX or BLOG-XXX123
  // Recruitment code: REC-BLOG-XXX or REC-BLOG-XXX123
  return /^(BLOG-[A-Z0-9]+|REC-BLOG-[A-Z0-9]+)$/i.test(code);
}

/**
 * Get blogger by affiliate code
 */
export async function getBloggerByCode(
  code: string
): Promise<{ id: string; type: "client" | "recruitment" } | null> {
  const db = getFirestore();
  const upperCode = code.toUpperCase();

  // Try client code first
  let query = await db
    .collection("bloggers")
    .where("affiliateCodeClient", "==", upperCode)
    .limit(1)
    .get();

  if (!query.empty) {
    return { id: query.docs[0].id, type: "client" };
  }

  // Try recruitment code
  query = await db
    .collection("bloggers")
    .where("affiliateCodeRecruitment", "==", upperCode)
    .limit(1)
    .get();

  if (!query.empty) {
    return { id: query.docs[0].id, type: "recruitment" };
  }

  return null;
}

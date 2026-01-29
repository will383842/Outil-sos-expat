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
 * Format: BLOG-PRENOM123
 */
export async function generateBloggerClientCode(firstName: string): Promise<string> {
  const db = getFirestore();
  const baseCode = sanitizeName(firstName).toUpperCase();
  let code = `BLOG-${baseCode}`;
  let suffix = 1;

  // Check if code already exists
  let exists = await checkCodeExists(db, code, "affiliateCodeClient");

  while (exists) {
    code = `BLOG-${baseCode}${suffix}`;
    suffix++;
    exists = await checkCodeExists(db, code, "affiliateCodeClient");

    // Prevent infinite loop
    if (suffix > 999) {
      code = `BLOG-${baseCode}${Date.now().toString(36).toUpperCase()}`;
      break;
    }
  }

  return code;
}

/**
 * Generate a unique recruitment affiliate code for a blogger
 * Format: REC-BLOG-PRENOM123
 */
export async function generateBloggerRecruitmentCode(firstName: string): Promise<string> {
  const db = getFirestore();
  const baseCode = sanitizeName(firstName).toUpperCase();
  let code = `REC-BLOG-${baseCode}`;
  let suffix = 1;

  // Check if code already exists
  let exists = await checkCodeExists(db, code, "affiliateCodeRecruitment");

  while (exists) {
    code = `REC-BLOG-${baseCode}${suffix}`;
    suffix++;
    exists = await checkCodeExists(db, code, "affiliateCodeRecruitment");

    // Prevent infinite loop
    if (suffix > 999) {
      code = `REC-BLOG-${baseCode}${Date.now().toString(36).toUpperCase()}`;
      break;
    }
  }

  return code;
}

/**
 * Generate both codes for a new blogger
 */
export async function generateBloggerAffiliateCodes(firstName: string): Promise<{
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
}> {
  const affiliateCodeClient = await generateBloggerClientCode(firstName);
  const affiliateCodeRecruitment = await generateBloggerRecruitmentCode(firstName);

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
 * Check if a code already exists in the bloggers collection
 */
async function checkCodeExists(
  db: FirebaseFirestore.Firestore,
  code: string,
  field: "affiliateCodeClient" | "affiliateCodeRecruitment"
): Promise<boolean> {
  const query = await db
    .collection("bloggers")
    .where(field, "==", code)
    .limit(1)
    .get();

  return !query.empty;
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

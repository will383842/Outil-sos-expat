/**
 * Unified Affiliate Code Generator
 *
 * Generates a single unique affiliate code per user.
 * Replaces 3 codes × 6 roles = 18 code types with 1 universal code.
 *
 * Format: PRENOM (2-4 chars, cleaned) + UID suffix (6 chars)
 * Example: "JEAN1A2B3C" — deterministic, 0 Firestore lookups, guaranteed unique via UID.
 *
 * The unified link is: /r/CODE (replaces /ref/b/, /rec/b/, /prov/b/, etc.)
 */

/**
 * Generate a unified affiliate code from firstName and UID.
 * Synchronous — no Firestore lookups needed (UID guarantees uniqueness).
 *
 * @param firstName - User's first name (any script)
 * @param uid - Firebase UID (guarantees uniqueness)
 * @param emailFallback - Optional email to derive prefix when firstName is 100%
 *   non-Latin (e.g. "李小明") and would otherwise produce a generic "XX" prefix.
 */
export function generateUnifiedAffiliateCode(firstName: string, uid: string, emailFallback?: string): string {
  // Clean and normalize first name: strip diacritics, keep only Latin letters
  const cleanName = firstName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics (é→e, ñ→n)
    .replace(/[^A-Za-z]/g, "")       // Keep only letters
    .toUpperCase()
    .slice(0, 4);

  // Prefix selection:
  //   - primary: normalized first name (≥2 chars)
  //   - fallback: email local-part (before @), cleaned the same way
  //   - last resort: "XX"
  let prefix: string;
  if (cleanName.length >= 2) {
    prefix = cleanName;
  } else if (emailFallback) {
    const localPart = emailFallback.split("@")[0] || "";
    const cleanEmail = localPart
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z]/g, "")
      .toUpperCase()
      .slice(0, 4);
    prefix = cleanEmail.length >= 2 ? cleanEmail : (cleanName + "XX").slice(0, 2);
  } else {
    prefix = (cleanName + "XX").slice(0, 2);
  }

  // Take last 6 alphanumeric chars of UID (guaranteed unique)
  const uidSuffix = uid
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-6)
    .toUpperCase();

  return prefix + uidSuffix;
}

/**
 * Validate a unified affiliate code format.
 * Returns true if the code matches the new unified format.
 */
export function isValidUnifiedCode(code: string): boolean {
  if (!code || typeof code !== "string") return false;
  if (code.length < 6 || code.length > 12) return false;
  // New format has no dashes (old formats use REC-, PROV-, BLOG-, GROUP-)
  if (code.includes("-")) return false;
  return /^[A-Z0-9]+$/i.test(code);
}

/**
 * Check if a code is in legacy format (has prefixes like REC-, PROV-, BLOG-, GROUP-).
 */
export function isLegacyCode(code: string): boolean {
  if (!code) return false;
  const upper = code.toUpperCase();
  return (
    upper.startsWith("REC-") ||
    upper.startsWith("PROV-") ||
    upper.startsWith("BLOG-") ||
    upper.startsWith("GROUP-")
  );
}

/**
 * Derive the base client code from any legacy format.
 *
 * Examples:
 *   "REC-JEAN456"          → "JEAN456"
 *   "PROV-JEAN456"         → "JEAN456"
 *   "PROV-INF-MARIE123"    → "MARIE123"
 *   "PROV-BLOG-JEAN1A2B3C" → "BLOG-JEAN1A2B3C"  (keeps BLOG- as it's the client format)
 *   "PROV-GROUP-JANE789"   → "GROUP-JANE789"     (keeps GROUP- as it's the client format)
 *   "REC-BLOG-JEAN456"     → "BLOG-JEAN456"
 *   "REC-GROUP-JANE789"    → "GROUP-JANE789"
 *   "JEAN1A2B3C"           → "JEAN1A2B3C" (already base)
 */
export function deriveBaseCode(code: string): string {
  if (!code) return code;
  const upper = code.toUpperCase();

  // Order matters — check longer prefixes first
  if (upper.startsWith("PROV-INF-")) return code.slice(9);
  if (upper.startsWith("PROV-BLOG-")) return "BLOG-" + code.slice(10);
  if (upper.startsWith("PROV-GROUP-")) return "GROUP-" + code.slice(11);
  if (upper.startsWith("REC-BLOG-")) return "BLOG-" + code.slice(9);
  if (upper.startsWith("REC-GROUP-")) return "GROUP-" + code.slice(10);
  if (upper.startsWith("PROV-")) return code.slice(5);
  if (upper.startsWith("REC-")) return code.slice(4);

  return code;
}

/**
 * Detect the code type from a legacy code format.
 */
export function detectLegacyCodeType(
  code: string
): { codeType: "client" | "recruitment" | "provider"; roleHint?: string } {
  if (!code) return { codeType: "client" };
  const upper = code.toUpperCase();

  if (upper.startsWith("PROV-INF-")) return { codeType: "provider", roleHint: "influencer" };
  if (upper.startsWith("PROV-BLOG-")) return { codeType: "provider", roleHint: "blogger" };
  if (upper.startsWith("PROV-GROUP-")) return { codeType: "provider", roleHint: "groupAdmin" };
  if (upper.startsWith("REC-BLOG-")) return { codeType: "recruitment", roleHint: "blogger" };
  if (upper.startsWith("REC-GROUP-")) return { codeType: "recruitment", roleHint: "groupAdmin" };
  if (upper.startsWith("PROV-")) return { codeType: "provider" };
  if (upper.startsWith("REC-")) return { codeType: "recruitment" };
  if (upper.startsWith("BLOG-")) return { codeType: "client", roleHint: "blogger" };
  if (upper.startsWith("GROUP-")) return { codeType: "client", roleHint: "groupAdmin" };

  return { codeType: "client" };
}

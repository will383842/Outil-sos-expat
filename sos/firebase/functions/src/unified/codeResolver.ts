/**
 * Unified Code Resolver
 *
 * Resolves ANY affiliate code (new unified or legacy) to the referrer's userId and role.
 * Searches across all collections in priority order to find the code owner.
 *
 * Resolution order (most recent system first):
 *   1. users.affiliateCode (new unified system)
 *   2. users.affiliateCode = baseCode (if code had prefix)
 *   3. users.affiliateCodeClient (legacy)
 *   4. users.affiliateCodeClient = baseCode
 *   5. users.affiliateCodeRecruitment
 *   6. users.affiliateCodeProvider
 *   7. chatters.affiliateCodeClient / affiliateCodeRecruitment / affiliateCodeProvider
 *   8. influencers.affiliateCodeClient / affiliateCodeRecruitment / affiliateCodeProvider
 *   9. bloggers.affiliateCodeClient / affiliateCodeRecruitment / affiliateCodeProvider
 *  10. group_admins.affiliateCodeClient / affiliateCodeRecruitment / affiliateCodeProvider
 *  11. partners.affiliateCode / affiliateCodeProvider
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { deriveBaseCode } from "./codeGenerator";

export interface CodeResolution {
  /** The user who owns this code */
  userId: string;
  /** The user's email */
  email: string;
  /** The affiliate role */
  role: string;
  /** What type of code was used */
  codeType: "client" | "recruitment" | "provider" | "unified";
  /** The unified affiliate code (for commission plan resolution) */
  affiliateCode: string;
  /** Commission plan ID (if set on user doc) */
  commissionPlanId?: string;
  /** Locked rates (if set on user doc) */
  lockedRates?: Record<string, number>;
  /** Individual discount config (if set) */
  discountConfig?: Record<string, unknown>;
  /** Which collection/method resolved the code */
  resolvedVia: string;
}

/**
 * Resolve an affiliate code to find the referrer.
 * Supports both new unified codes and all legacy formats.
 *
 * @param code - The affiliate code to resolve (any format)
 * @returns CodeResolution or null if not found
 */
export async function resolveCode(code: string): Promise<CodeResolution | null> {
  if (!code || typeof code !== "string") return null;

  const normalizedCode = code.trim().toUpperCase();
  if (!normalizedCode) return null;

  const db = getFirestore();
  const baseCode = deriveBaseCode(normalizedCode);
  // 1. New unified system: users.affiliateCode
  const unified = await queryFirst(db, "users", "affiliateCode", normalizedCode);
  if (unified) return buildResolution(unified, "unified", "users.affiliateCode");

  // 2. Users.affiliateCode with baseCode (if code had prefix)
  if (baseCode !== normalizedCode) {
    const unifiedBase = await queryFirst(db, "users", "affiliateCode", baseCode);
    if (unifiedBase) return buildResolution(unifiedBase, "unified", "users.affiliateCode(base)");
  }

  // 3. Legacy: users.affiliateCodeClient
  const userClient = await queryFirst(db, "users", "affiliateCodeClient", normalizedCode);
  if (userClient) return buildResolution(userClient, "client", "users.affiliateCodeClient");

  // 4. Users.affiliateCodeClient with baseCode
  if (baseCode !== normalizedCode) {
    const userClientBase = await queryFirst(db, "users", "affiliateCodeClient", baseCode);
    if (userClientBase) return buildResolution(userClientBase, "client", "users.affiliateCodeClient(base)");
  }

  // 5. Legacy: users.affiliateCodeRecruitment
  const userRec = await queryFirst(db, "users", "affiliateCodeRecruitment", normalizedCode);
  if (userRec) return buildResolution(userRec, "recruitment", "users.affiliateCodeRecruitment");

  // 6. Legacy: users.affiliateCodeProvider
  const userProv = await queryFirst(db, "users", "affiliateCodeProvider", normalizedCode);
  if (userProv) return buildResolution(userProv, "provider", "users.affiliateCodeProvider");

  // 7-10. Role-specific collections (chatters, influencers, bloggers, group_admins)
  const roleCollections = [
    { collection: "chatters", role: "chatter" },
    { collection: "influencers", role: "influencer" },
    { collection: "bloggers", role: "blogger" },
    { collection: "group_admins", role: "groupAdmin" },
  ];

  for (const { collection, role } of roleCollections) {
    // Try exact code match on all 3 code fields
    const codeFields = ["affiliateCodeClient", "affiliateCodeRecruitment", "affiliateCodeProvider"];
    for (const field of codeFields) {
      const result = await queryFirst(db, collection, field, normalizedCode);
      if (result) {
        const ct = field === "affiliateCodeClient" ? "client"
          : field === "affiliateCodeRecruitment" ? "recruitment"
          : "provider";
        return buildResolution(result, ct, `${collection}.${field}`, role);
      }
    }

    // Try baseCode on all 3 code fields
    if (baseCode !== normalizedCode) {
      for (const field of codeFields) {
        const baseResult = await queryFirst(db, collection, field, baseCode);
        if (baseResult) {
          const ct = field === "affiliateCodeClient" ? "client"
            : field === "affiliateCodeRecruitment" ? "recruitment"
            : "provider";
          return buildResolution(baseResult, ct, `${collection}.${field}(base)`, role);
        }
      }
    }
  }

  // 11. Partners
  const partner = await queryFirst(db, "partners", "affiliateCode", normalizedCode);
  if (partner) return buildResolution(partner, "unified", "partners.affiliateCode", "partner");

  if (baseCode !== normalizedCode) {
    const partnerBase = await queryFirst(db, "partners", "affiliateCode", baseCode);
    if (partnerBase) return buildResolution(partnerBase, "unified", "partners.affiliateCode(base)", "partner");
  }

  const partnerProv = await queryFirst(db, "partners", "affiliateCodeProvider", normalizedCode);
  if (partnerProv) return buildResolution(partnerProv, "provider", "partners.affiliateCodeProvider", "partner");

  logger.info(`Code "${normalizedCode}" not found in any collection`);
  return null;
}

// ============================================================================
// HELPERS
// ============================================================================

interface DocResult {
  id: string;
  data: Record<string, unknown>;
}

async function queryFirst(
  db: FirebaseFirestore.Firestore,
  collection: string,
  field: string,
  value: string
): Promise<DocResult | null> {
  const snap = await db
    .collection(collection)
    .where(field, "==", value)
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as Record<string, unknown> };
}

function buildResolution(
  doc: DocResult,
  codeType: "client" | "recruitment" | "provider" | "unified",
  resolvedVia: string,
  roleOverride?: string
): CodeResolution {
  const data = doc.data;

  return {
    userId: doc.id,
    email: (data.email as string) || "",
    role: roleOverride || (data.role as string) || (data.affiliateRole as string) || "unknown",
    codeType,
    affiliateCode:
      (data.affiliateCode as string) ||
      (data.affiliateCodeClient as string) ||
      (data.affiliateCodeRecruitment as string) ||
      (data.affiliateCodeProvider as string) ||
      "",
    commissionPlanId: data.commissionPlanId as string | undefined,
    lockedRates: data.lockedRates as Record<string, number> | undefined,
    discountConfig: data.discountConfig as Record<string, unknown> | undefined,
    resolvedVia,
  };
}

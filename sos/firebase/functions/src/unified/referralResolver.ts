/**
 * Unified Referral Resolver
 *
 * Finds who referred a given user, supports both the new unified system
 * and all legacy referral fields. Also builds cascade chains (N1/N2/N3)
 * for recruitment commissions with circular reference protection.
 *
 * All amounts in CENTS (USD).
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ReferralResolution, CascadeNode } from "./types";

// ============================================================================
// FIND REFERRER — Who referred this user?
// ============================================================================

/**
 * Find who referred a given user.
 *
 * Priority:
 *   1. users/{userId}.referredByUserId (new unified field)
 *   2. Legacy fields: referredByChatterId, referredByInfluencerId,
 *      referredByBlogger, referredByGroupAdmin, partnerReferredById
 *
 * @returns ReferralResolution with referrer profile, plan, and lockedRates
 */
export async function findReferrer(userId: string): Promise<ReferralResolution | null> {
  if (!userId) return null;

  const db = getFirestore();
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) return null;

  const userData = userSnap.data()!;

  // 1. New unified field
  if (userData.referredByUserId) {
    const referrer = await loadReferrerProfile(db, userData.referredByUserId as string);
    if (referrer) return { ...referrer, resolvedVia: "unified" };
  }

  // 2. Legacy: referredByChatterId
  if (userData.referredByChatterId) {
    const referrer = await loadReferrerProfile(db, userData.referredByChatterId as string, "chatter");
    if (referrer) return { ...referrer, resolvedVia: "legacy_client" };
  }

  // 3. Legacy: referredByInfluencerId
  if (userData.referredByInfluencerId) {
    const referrer = await loadReferrerProfile(db, userData.referredByInfluencerId as string, "influencer");
    if (referrer) return { ...referrer, resolvedVia: "legacy_client" };
  }

  // 4. Legacy: referredByBlogger
  if (userData.referredByBlogger) {
    const referrer = await loadReferrerProfile(db, userData.referredByBlogger as string, "blogger");
    if (referrer) return { ...referrer, resolvedVia: "legacy_client" };
  }

  // 5. Legacy: referredByGroupAdmin
  if (userData.referredByGroupAdmin) {
    const referrer = await loadReferrerProfile(db, userData.referredByGroupAdmin as string, "groupAdmin");
    if (referrer) return { ...referrer, resolvedVia: "legacy_client" };
  }

  // 6. Legacy: partnerReferredById
  if (userData.partnerReferredById) {
    const referrer = await loadReferrerProfile(db, userData.partnerReferredById as string, "partner");
    if (referrer) return { ...referrer, resolvedVia: "partner" };
  }

  return null;
}

// ============================================================================
// FIND PROVIDER RECRUITER — Who recruited this provider?
// ============================================================================

interface ProviderRecruiterResult {
  recruiterId: string;
  recruiterRole: string;
  recruiterCode: string;
  commissionPlanId: string;
  lockedRates?: Record<string, number>;
  windowEnd: Timestamp;
  providerId: string;
  providerType: "lawyer" | "expat";
}

/**
 * Find who recruited a given provider.
 *
 * Search order:
 *   1. recruited_providers (new unified collection)
 *   2. Legacy: chatter_recruited_providers
 *   3. Legacy: blogger_recruited_providers
 *   4. Legacy: influencer_referrals (different naming!)
 *   5. Legacy: group_admin_recruited_providers
 *
 * Only returns recruiters within their commission window.
 */
export async function findProviderRecruiter(
  providerId: string
): Promise<ProviderRecruiterResult | null> {
  if (!providerId) return null;

  const db = getFirestore();
  const now = Timestamp.now();

  // 1. New unified collection
  const unified = await db
    .collection("recruited_providers")
    .where("providerId", "==", providerId)
    .where("isActive", "==", true)
    .where("windowEnd", ">", now)
    .limit(1)
    .get();

  if (!unified.empty) {
    const doc = unified.docs[0].data();
    return {
      recruiterId: doc.recruiterId,
      recruiterRole: doc.recruiterRole,
      recruiterCode: doc.recruiterCode,
      commissionPlanId: doc.commissionPlanId || "",
      lockedRates: doc.lockedRates,
      windowEnd: doc.windowEnd,
      providerId,
      providerType: doc.providerType,
    };
  }

  // 2-5. Legacy collections
  const legacyCollections = [
    { collection: "chatter_recruited_providers", role: "chatter" },
    { collection: "blogger_recruited_providers", role: "blogger" },
    { collection: "influencer_referrals", role: "influencer" },
    { collection: "group_admin_recruited_providers", role: "groupAdmin" },
  ];

  for (const { collection, role } of legacyCollections) {
    const snap = await db
      .collection(collection)
      .where("providerId", "==", providerId)
      .where("windowEnd", ">", now)
      .limit(1)
      .get();

    if (!snap.empty) {
      const doc = snap.docs[0].data();
      const recruiterId = (doc.recruiterId || doc.chatterId || doc.bloggerId ||
        doc.influencerId || doc.groupAdminId) as string;

      if (!recruiterId) continue;

      // Load recruiter profile to get plan + lockedRates
      const recruiter = await loadReferrerProfile(db, recruiterId, role);
      if (!recruiter) continue;

      return {
        recruiterId,
        recruiterRole: role,
        recruiterCode: recruiter.affiliateCode,
        commissionPlanId: recruiter.commissionPlanId,
        lockedRates: recruiter.lockedRates,
        windowEnd: doc.windowEnd as Timestamp,
        providerId,
        providerType: (doc.providerType || "expat") as "lawyer" | "expat",
      };
    }
  }

  return null;
}

// ============================================================================
// BUILD CASCADE CHAIN — N1/N2/N3 referral chain
// ============================================================================

/**
 * Build a cascade chain starting from a user, going up the referral tree.
 *
 * Example: If user A referred B who referred C:
 *   buildCascadeChain(C.referrerId, 2) → [B (depth=1, N1), A (depth=2, N2)]
 *
 * Protection:
 *   - Circular reference detection (Set of visited userIds)
 *   - Max depth enforcement
 *   - Stops at first missing/deleted user
 *
 * @param startUserId - The referrer of the original user (N1 candidate)
 * @param maxDepth - Maximum cascade depth (from the referrer's plan)
 * @returns Array of CascadeNode in order [N1, N2, N3...]
 */
export async function buildCascadeChain(
  startUserId: string,
  maxDepth: number
): Promise<CascadeNode[]> {
  if (!startUserId || maxDepth <= 0) return [];

  const db = getFirestore();
  const chain: CascadeNode[] = [];
  const visited = new Set<string>();
  let currentUserId = startUserId;

  for (let depth = 1; depth <= maxDepth; depth++) {
    // Circular protection
    if (visited.has(currentUserId)) {
      logger.warn(`Circular referral detected at depth ${depth}: ${currentUserId} already visited`);
      break;
    }
    visited.add(currentUserId);

    // Load referrer's profile
    const userSnap = await db.collection("users").doc(currentUserId).get();
    if (!userSnap.exists) break;

    const userData = userSnap.data()!;

    chain.push({
      userId: currentUserId,
      role: (userData.affiliateRole || userData.role || "unknown") as string,
      affiliateCode: (userData.affiliateCode || userData.affiliateCodeClient || "") as string,
      commissionPlanId: (userData.commissionPlanId || "") as string,
      lockedRates: userData.lockedRates as Record<string, number> | undefined,
      isCaptain: userData.isCaptain === true,
      depth,
    });

    // Find next referrer up the chain
    const nextReferrerId = (userData.referredByUserId ||
      userData.referredByChatterId ||
      userData.referredByInfluencerId ||
      userData.referredByBlogger ||
      userData.referredByGroupAdmin) as string | undefined;

    if (!nextReferrerId) break;
    currentUserId = nextReferrerId;
  }

  return chain;
}

// ============================================================================
// HELPERS
// ============================================================================

async function loadReferrerProfile(
  db: FirebaseFirestore.Firestore,
  userId: string,
  roleOverride?: string
): Promise<ReferralResolution | null> {
  const userSnap = await db.collection("users").doc(userId).get();
  if (!userSnap.exists) {
    logger.warn(`Referrer ${userId} not found in users collection`);
    return null;
  }

  const data = userSnap.data()!;

  return {
    userId,
    email: (data.email || "") as string,
    role: roleOverride || (data.affiliateRole || data.role || "unknown") as string,
    affiliateCode: (data.affiliateCode || data.affiliateCodeClient || "") as string,
    commissionPlanId: (data.commissionPlanId || "") as string,
    lockedRates: data.lockedRates as Record<string, number> | undefined,
    monthlyTopMultiplier: data.monthlyTopMultiplier as number | undefined,
    discountConfig: data.discountConfig as ReferralResolution["discountConfig"],
    resolvedVia: "unified",
  };
}

/**
 * Referral Migration — Phase 10
 *
 * Normalizes legacy referral fields to the unified `referredByUserId` field.
 * Scans users for legacy fields and writes the unified field if missing.
 *
 * Safe to run multiple times (idempotent).
 * NEVER deletes legacy fields (backward compatibility).
 */

import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";

export interface ReferralMigrationResult {
  userId: string;
  status: "skipped" | "migrated" | "error";
  referredByUserId?: string;
  resolvedVia?: string;
  reason?: string;
}

/**
 * Legacy referral fields, in priority order.
 * Each entry maps to the field name on the user doc.
 */
const LEGACY_REFERRAL_FIELDS = [
  { field: "referredByChatterId", via: "chatter" },
  { field: "referredByInfluencerId", via: "influencer" },
  { field: "referredByBlogger", via: "blogger" },
  { field: "referredByGroupAdmin", via: "groupAdmin" },
  { field: "partnerReferredById", via: "partner" },
  { field: "chatterReferredBy", via: "chatter_alt" },
  { field: "influencerReferredBy", via: "influencer_alt" },
  { field: "bloggerReferredBy", via: "blogger_alt" },
  { field: "groupAdminReferredBy", via: "groupAdmin_alt" },
  { field: "partnerReferredBy", via: "partner_alt" },
  { field: "referredBy", via: "generic" },
];

/**
 * Migrate a single user's referral to unified field.
 */
export async function migrateUserReferral(userId: string): Promise<ReferralMigrationResult> {
  const db = getFirestore();

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return { userId, status: "error", reason: "User not found" };
    }

    const data = userDoc.data()!;

    // Already has unified field
    if (data.referredByUserId) {
      return {
        userId,
        status: "skipped",
        referredByUserId: data.referredByUserId,
        reason: "Already has referredByUserId",
      };
    }

    // Search legacy fields
    for (const { field, via } of LEGACY_REFERRAL_FIELDS) {
      const value = data[field] as string | undefined;
      if (value && typeof value === "string" && value.trim()) {
        // Value could be a userId or a code — need to resolve
        const referrerId = await resolveReferrerId(db, value.trim(), via);
        if (referrerId) {
          await db.collection("users").doc(userId).update({
            referredByUserId: referrerId,
          });

          return {
            userId,
            status: "migrated",
            referredByUserId: referrerId,
            resolvedVia: `${field} (${via})`,
          };
        }
      }
    }

    // No legacy referral found
    return { userId, status: "skipped", reason: "No legacy referral field found" };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { userId, status: "error", reason: message };
  }
}

/**
 * Resolve a referrer value (could be userId or code) to a userId.
 */
async function resolveReferrerId(
  db: FirebaseFirestore.Firestore,
  value: string,
  via: string
): Promise<string | null> {
  // First check if it's a valid userId (exists in users)
  const directDoc = await db.collection("users").doc(value).get();
  if (directDoc.exists) return value;

  // It might be an affiliate code — search for it
  const codeSearch = await db
    .collection("users")
    .where("affiliateCode", "==", value.toUpperCase())
    .limit(1)
    .get();
  if (!codeSearch.empty) return codeSearch.docs[0].id;

  // Try legacy code fields
  const legacyCodeSearch = await db
    .collection("users")
    .where("affiliateCodeClient", "==", value.toUpperCase())
    .limit(1)
    .get();
  if (!legacyCodeSearch.empty) return legacyCodeSearch.docs[0].id;

  // Try role-specific collections
  const roleCollections: Record<string, string> = {
    chatter: "chatters",
    chatter_alt: "chatters",
    influencer: "influencers",
    influencer_alt: "influencers",
    blogger: "bloggers",
    blogger_alt: "bloggers",
    groupAdmin: "group_admins",
    groupAdmin_alt: "group_admins",
    partner: "partners",
    partner_alt: "partners",
  };

  const roleCol = roleCollections[via];
  if (roleCol) {
    const roleDoc = await db.collection(roleCol).doc(value).get();
    if (roleDoc.exists) return value;
  }

  logger.warn(`Could not resolve referrer: "${value}" (via: ${via})`);
  return null;
}

/**
 * Batch migrate all users' referral relationships.
 */
export async function batchMigrateReferrals(
  batchSize = 100,
  dryRun = false
): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: ReferralMigrationResult[];
}> {
  const db = getFirestore();
  const results: ReferralMigrationResult[] = [];

  // Process ALL users that have any legacy referral field but no unified field
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
  let hasMore = true;

  while (hasMore) {
    let query = db
      .collection("users")
      .orderBy("__name__")
      .limit(batchSize);

    if (lastDoc) {
      query = query.startAfter(lastDoc);
    }

    const snap = await query.get();
    if (snap.empty) {
      hasMore = false;
      break;
    }

    for (const doc of snap.docs) {
      const data = doc.data();

      // Skip if already has unified field
      if (data.referredByUserId) {
        continue;
      }

      // Check if any legacy field exists
      const hasLegacy = LEGACY_REFERRAL_FIELDS.some(
        ({ field }) => data[field] && typeof data[field] === "string" && data[field].trim()
      );

      if (!hasLegacy) continue;

      if (dryRun) {
        // Find which field would be used
        for (const { field, via } of LEGACY_REFERRAL_FIELDS) {
          if (data[field] && typeof data[field] === "string" && data[field].trim()) {
            results.push({
              userId: doc.id,
              status: "migrated",
              referredByUserId: data[field],
              resolvedVia: `${field} (${via})`,
              reason: "dry-run",
            });
            break;
          }
        }
      } else {
        const result = await migrateUserReferral(doc.id);
        if (result.status !== "skipped" || result.reason !== "No legacy referral field found") {
          results.push(result);
        }
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < batchSize) hasMore = false;
  }

  const summary = {
    total: results.length,
    migrated: results.filter((r) => r.status === "migrated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    details: results,
  };

  logger.info(
    `Referral migration: ${summary.total} total, ${summary.migrated} migrated, ` +
    `${summary.skipped} skipped, ${summary.errors} errors`
  );

  return summary;
}

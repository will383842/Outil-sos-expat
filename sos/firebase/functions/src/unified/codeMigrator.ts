/**
 * Unified Code Migrator
 *
 * Migrates a user's affiliate codes from the legacy multi-code system
 * to the unified single-code system.
 *
 * Rules:
 *   1. If user already has a unified `affiliateCode` (no dashes) → skip
 *   2. Otherwise: use `affiliateCodeClient` as the base code
 *   3. If no existing code: generate new via `generateUnifiedAffiliateCode()`
 *   4. Write `affiliateCode` + `commissionPlanId` on user doc
 *   5. Snapshot `lockedRates` if not already present
 *   6. NEVER delete old fields (backward compatibility)
 */

import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { generateUnifiedAffiliateCode, isValidUnifiedCode } from "./codeGenerator";
import { snapshotLockedRatesUnified, resolvePlanForUser } from "./planService";

export interface MigrationResult {
  userId: string;
  status: "skipped" | "migrated" | "error";
  affiliateCode?: string;
  reason?: string;
}

/**
 * Migrate a single user's affiliate code to the unified system.
 *
 * @param userId - The user ID to migrate
 * @returns MigrationResult with status and details
 */
export async function migrateUserAffiliateCode(userId: string): Promise<MigrationResult> {
  const db = getFirestore();

  try {
    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      return { userId, status: "error", reason: "User document not found" };
    }

    const data = userDoc.data()!;

    // Check if already has a unified code (no dashes = new format)
    const existingCode = data.affiliateCode as string | undefined;
    if (existingCode && isValidUnifiedCode(existingCode)) {
      return { userId, status: "skipped", affiliateCode: existingCode, reason: "Already has unified code" };
    }

    // Determine the best code to use
    let unifiedCode: string;

    // Priority: existing affiliateCodeClient (most common, shared with clients)
    const clientCode = data.affiliateCodeClient as string | undefined;
    if (clientCode && isValidUnifiedCode(clientCode)) {
      unifiedCode = clientCode.toUpperCase();
    } else {
      // Generate new code
      const firstName = (data.firstName as string) || (data.email as string)?.split("@")[0] || "USER";
      unifiedCode = generateUnifiedAffiliateCode(firstName, userId);
    }

    // Check for collision with other users
    const collision = await db
      .collection("users")
      .where("affiliateCode", "==", unifiedCode)
      .limit(1)
      .get();

    if (!collision.empty && collision.docs[0].id !== userId) {
      // Extremely rare: UID-based codes collide only if different UIDs share last 6 chars
      // Append extra char to resolve
      unifiedCode = unifiedCode + userId.slice(-2).toUpperCase();
      logger.warn(`Code collision for user ${userId}, extended to ${unifiedCode}`);
    }

    // Prepare update
    const update: Record<string, unknown> = {
      affiliateCode: unifiedCode,
      affiliateCodeMigratedAt: Timestamp.now(),
    };

    // Resolve and assign commission plan if not present
    const role = (data.role as string) || (data.affiliateRole as string) || "client";
    if (!data.commissionPlanId) {
      const plan = await resolvePlanForUser(role);
      if (plan) {
        update.commissionPlanId = plan.id;
        update.commissionPlanName = plan.name;
      }
    }

    // Snapshot locked rates if not already present
    if (!data.lockedRates) {
      const snapshot = await snapshotLockedRatesUnified(role);
      if (snapshot) {
        update.lockedRates = snapshot.lockedRates;
        update.rateLockDate = snapshot.rateLockDate;
      }
    }

    // Write update (NEVER delete old fields)
    await db.collection("users").doc(userId).update(update);

    // Also update role-specific collection if it exists
    const roleCollectionMap: Record<string, string> = {
      chatter: "chatters",
      captainChatter: "chatters",
      influencer: "influencers",
      blogger: "bloggers",
      groupAdmin: "group_admins",
      partner: "partners",
    };

    const roleCollection = roleCollectionMap[role];
    if (roleCollection) {
      const roleDoc = await db.collection(roleCollection).doc(userId).get();
      if (roleDoc.exists) {
        await db.collection(roleCollection).doc(userId).update({
          affiliateCode: unifiedCode,
          affiliateCodeMigratedAt: Timestamp.now(),
        });
      }
    }

    logger.info(`Migrated user ${userId} (${role}) → code: ${unifiedCode}`);
    return { userId, status: "migrated", affiliateCode: unifiedCode };

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`Migration failed for user ${userId}: ${message}`);
    return { userId, status: "error", reason: message };
  }
}

/**
 * Batch migrate all users with affiliate roles to the unified code system.
 * Safe to run multiple times (skips already-migrated users).
 *
 * @param batchSize - Number of users to process per batch (default 100)
 * @param dryRun - If true, only log what would happen without writing
 * @returns Summary of migration results
 */
export async function batchMigrateAffiliateCodes(
  batchSize = 100,
  dryRun = false
): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: MigrationResult[];
}> {
  const db = getFirestore();
  const results: MigrationResult[] = [];

  // Roles that need affiliate codes
  // Only affiliate roles — clients/lawyers/expats don't have affiliate codes by default
  const affiliateRoles = ["chatter", "captainChatter", "influencer", "blogger", "groupAdmin", "partner"];

  for (const role of affiliateRoles) {
    let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | undefined;
    let hasMore = true;

    while (hasMore) {
      let query = db
        .collection("users")
        .where("role", "==", role)
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
        if (dryRun) {
          const data = doc.data();
          const existing = data.affiliateCode;
          const hasUnified = existing && isValidUnifiedCode(existing);
          results.push({
            userId: doc.id,
            status: hasUnified ? "skipped" : "migrated",
            affiliateCode: existing || "(would generate)",
            reason: dryRun ? "dry-run" : undefined,
          });
        } else {
          const result = await migrateUserAffiliateCode(doc.id);
          results.push(result);
        }
      }

      lastDoc = snap.docs[snap.docs.length - 1];
      if (snap.size < batchSize) hasMore = false;
    }
  }

  const summary = {
    total: results.length,
    migrated: results.filter((r) => r.status === "migrated").length,
    skipped: results.filter((r) => r.status === "skipped").length,
    errors: results.filter((r) => r.status === "error").length,
    details: results,
  };

  logger.info(
    `Batch migration complete: ${summary.total} total, ` +
    `${summary.migrated} migrated, ${summary.skipped} skipped, ${summary.errors} errors`
  );

  return summary;
}

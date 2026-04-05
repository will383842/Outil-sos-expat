/**
 * Migration Script: Sync referredByUserId to users collection
 *
 * Problem: registerChatter/Influencer/Blogger/GroupAdmin wrote `recruitedBy` to
 * role-specific collections but never synced `referredByUserId` to users/{uid}.
 * This caused the unified affiliate dashboard to show empty referrals.
 *
 * What this does:
 * 1. Scans all role collections (chatters, influencers, bloggers, group_admins)
 * 2. For each doc with recruitedBy, checks if users/{uid} has referredByUserId
 * 3. If missing, writes referredByUserId + referredBy + referredAt to users/{uid}
 *
 * Usage:
 *   node sos/scripts/migrate-sync-referredByUserId.cjs [--dry-run]
 *
 * Options:
 *   --dry-run   Preview changes without writing to Firestore
 */

const admin = require("firebase-admin");
const path = require("path");

// Initialize Firebase Admin
const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
  ? path.resolve(process.env.GOOGLE_APPLICATION_CREDENTIALS)
  : path.join(__dirname, "..", "..", "serviceAccount.json");

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(serviceAccountPath)),
  });
} catch {
  // Already initialized
}

const db = admin.firestore();
const isDryRun = process.argv.includes("--dry-run");

const ROLE_COLLECTIONS = [
  { name: "chatters", label: "Chatter" },
  { name: "influencers", label: "Influencer" },
  { name: "bloggers", label: "Blogger" },
  { name: "group_admins", label: "GroupAdmin" },
];

async function migrate() {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`  Migration: Sync referredByUserId to users collection`);
  console.log(`  Mode: ${isDryRun ? "DRY RUN (no writes)" : "LIVE"}`);
  console.log(`${"=".repeat(60)}\n`);

  let totalScanned = 0;
  let totalMissing = 0;
  let totalFixed = 0;
  let totalErrors = 0;

  for (const { name, label } of ROLE_COLLECTIONS) {
    console.log(`\n--- Scanning ${label} (${name}) ---`);

    const snapshot = await db
      .collection(name)
      .where("recruitedBy", "!=", null)
      .get();

    console.log(`  Found ${snapshot.size} docs with recruitedBy`);
    totalScanned += snapshot.size;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const userId = doc.id;
      const recruitedBy = data.recruitedBy;
      const recruitedByCode = data.recruitedByCode || null;
      const recruitedAt = data.recruitedAt || data.createdAt || null;

      if (!recruitedBy) continue;

      try {
        // Check if users/{uid} already has referredByUserId
        const userDoc = await db.collection("users").doc(userId).get();

        if (!userDoc.exists) {
          console.log(`  [SKIP] ${userId} — no users doc exists`);
          continue;
        }

        const userData = userDoc.data();

        if (userData.referredByUserId) {
          // Already has referredByUserId — check consistency
          if (userData.referredByUserId !== recruitedBy) {
            console.log(
              `  [MISMATCH] ${userId} — users.referredByUserId=${userData.referredByUserId} vs ${name}.recruitedBy=${recruitedBy}`
            );
          }
          continue; // Already set, skip
        }

        // Missing referredByUserId — fix it
        totalMissing++;
        console.log(
          `  [FIX] ${userId} (${data.email || "?"}) — adding referredByUserId=${recruitedBy}`
        );

        if (!isDryRun) {
          await db.collection("users").doc(userId).update({
            referredByUserId: recruitedBy,
            referredBy: recruitedByCode,
            referredAt: recruitedAt,
            updatedAt: admin.firestore.Timestamp.now(),
          });
          totalFixed++;
        }
      } catch (err) {
        console.error(`  [ERROR] ${userId}: ${err.message}`);
        totalErrors++;
      }
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`  SUMMARY`);
  console.log(`  Scanned: ${totalScanned}`);
  console.log(`  Missing referredByUserId: ${totalMissing}`);
  console.log(`  Fixed: ${isDryRun ? `${totalMissing} (would fix)` : totalFixed}`);
  console.log(`  Errors: ${totalErrors}`);
  console.log(`${"=".repeat(60)}\n`);

  if (isDryRun && totalMissing > 0) {
    console.log("  Run without --dry-run to apply changes.\n");
  }
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

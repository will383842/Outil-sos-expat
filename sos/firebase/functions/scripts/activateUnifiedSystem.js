/**
 * Activate Unified Commission System
 *
 * Steps:
 *   1. Migrate affiliate codes (existing users → unified code)
 *   2. Migrate referrals (legacy referral fields → referredByUserId)
 *   3. Activate unified system (enabled: true, shadowMode: false)
 *
 * Safe to re-run: all operations are idempotent.
 *
 * Usage: node scripts/activateUnifiedSystem.js
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
}
const db = admin.firestore();

// ============================================================================
// STEP 1: Migrate affiliate codes
// ============================================================================

async function migrateAffiliateCodes() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  STEP 1 — Migrate Affiliate Codes               ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  const affiliateRoles = ["chatter", "captainChatter", "influencer", "blogger", "groupAdmin", "partner"];
  let migrated = 0, skipped = 0, errors = 0;

  for (const role of affiliateRoles) {
    const snap = await db.collection("users").where("role", "==", role).get();
    console.log(`  📋 Role "${role}": ${snap.size} users`);

    for (const doc of snap.docs) {
      const data = doc.data();
      const existingCode = data.affiliateCode;

      // Already has a unified code (no dashes = unified format)
      if (existingCode && !existingCode.includes("-")) {
        skipped++;
        continue;
      }

      // Use affiliateCodeClient as base, or generate from name
      let unifiedCode;
      const clientCode = data.affiliateCodeClient;
      if (clientCode && !clientCode.includes("-")) {
        unifiedCode = clientCode.toUpperCase();
      } else {
        // Generate: FIRSTNAME + last 6 of UID
        const firstName = (data.firstName || data.email?.split("@")[0] || "USER")
          .replace(/[^A-Za-z0-9]/g, "")
          .substring(0, 8)
          .toUpperCase();
        const suffix = doc.id.slice(-6).toUpperCase();
        unifiedCode = `${firstName}${suffix}`;
      }

      // Check collision
      const collision = await db.collection("users")
        .where("affiliateCode", "==", unifiedCode)
        .limit(1)
        .get();

      if (!collision.empty && collision.docs[0].id !== doc.id) {
        unifiedCode = unifiedCode + doc.id.slice(-2).toUpperCase();
      }

      // Resolve commission plan
      let planUpdate = {};
      if (!data.commissionPlanId) {
        const planQuery = await db.collection("commission_plans")
          .where("targetRoles", "array-contains", role)
          .where("isDefault", "==", true)
          .limit(1)
          .get();

        if (!planQuery.empty) {
          const plan = planQuery.docs[0];
          planUpdate = {
            commissionPlanId: plan.id,
            commissionPlanName: plan.data().name,
          };
        }
      }

      try {
        await db.collection("users").doc(doc.id).update({
          affiliateCode: unifiedCode,
          affiliateCodeMigratedAt: admin.firestore.Timestamp.now(),
          ...planUpdate,
        });

        // Also update role-specific collection
        const roleCollMap = {
          chatter: "chatters", captainChatter: "chatters",
          influencer: "influencers", blogger: "bloggers",
          groupAdmin: "group_admins", partner: "partners",
        };
        const coll = roleCollMap[role];
        if (coll) {
          const roleDoc = await db.collection(coll).doc(doc.id).get();
          if (roleDoc.exists) {
            await db.collection(coll).doc(doc.id).update({
              affiliateCode: unifiedCode,
              affiliateCodeMigratedAt: admin.firestore.Timestamp.now(),
            });
          }
        }

        migrated++;
        console.log(`    ✅ ${doc.id} → ${unifiedCode} (${role})${planUpdate.commissionPlanId ? ` [plan: ${planUpdate.commissionPlanId}]` : ""}`);
      } catch (err) {
        errors++;
        console.error(`    ❌ ${doc.id}: ${err.message}`);
      }
    }
  }

  console.log(`\n  📊 Codes: ${migrated} migrated, ${skipped} already done, ${errors} errors`);
  return { migrated, skipped, errors };
}

// ============================================================================
// STEP 2: Migrate referrals (legacy fields → referredByUserId)
// ============================================================================

async function migrateReferrals() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  STEP 2 — Migrate Referral Links                ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // Legacy referral fields to check (priority order)
  const legacyFields = [
    "referredByChatterId",
    "referredByInfluencerId",
    "referredByBlogger",
    "referredByGroupAdmin",
    "partnerReferredById",
    "chatterReferredBy",
    "providerRecruitedByChatter",
    "providerRecruitedByBlogger",
    "providerRecruitedByGroupAdmin",
    "recruitedByInfluencer",
    "referredByCode",
    "pendingReferralCode",
  ];

  let migrated = 0, skipped = 0, errors = 0, noRef = 0;
  let lastDoc = null;
  const batchSize = 200;
  let processed = 0;

  while (true) {
    let query = db.collection("users").orderBy("__name__").limit(batchSize);
    if (lastDoc) query = query.startAfter(lastDoc);

    const snap = await query.get();
    if (snap.empty) break;

    for (const doc of snap.docs) {
      processed++;
      const data = doc.data();

      // Already has unified referral → skip
      if (data.referredByUserId) {
        skipped++;
        continue;
      }

      // Check legacy fields
      let referrerId = null;
      let resolvedVia = null;

      for (const field of legacyFields) {
        const value = data[field];
        if (!value) continue;

        // Boolean fields (recruitedByInfluencer)
        if (typeof value === "boolean") continue;

        // Could be a userId or a code
        const maybeUserId = String(value);

        // Try as direct userId
        const userCheck = await db.collection("users").doc(maybeUserId).get();
        if (userCheck.exists) {
          referrerId = maybeUserId;
          resolvedVia = field;
          break;
        }

        // Try as affiliate code
        const codeCheck = await db.collection("users")
          .where("affiliateCode", "==", maybeUserId)
          .limit(1)
          .get();
        if (!codeCheck.empty) {
          referrerId = codeCheck.docs[0].id;
          resolvedVia = `${field}→code`;
          break;
        }

        // Try legacy code fields
        for (const codeField of ["affiliateCodeClient", "affiliateCodeRecruitment", "affiliateCodeProvider"]) {
          const legacyCodeCheck = await db.collection("users")
            .where(codeField, "==", maybeUserId)
            .limit(1)
            .get();
          if (!legacyCodeCheck.empty) {
            referrerId = legacyCodeCheck.docs[0].id;
            resolvedVia = `${field}→${codeField}`;
            break;
          }
        }
        if (referrerId) break;
      }

      if (!referrerId) {
        noRef++;
        continue;
      }

      try {
        await db.collection("users").doc(doc.id).update({
          referredByUserId: referrerId,
          referralMigratedAt: admin.firestore.Timestamp.now(),
          referralMigratedVia: resolvedVia,
        });
        migrated++;
        if (migrated <= 20) {
          console.log(`    ✅ ${doc.id} → referredBy: ${referrerId} (via ${resolvedVia})`);
        }
      } catch (err) {
        errors++;
        console.error(`    ❌ ${doc.id}: ${err.message}`);
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < batchSize) break;
  }

  if (migrated > 20) console.log(`    ... et ${migrated - 20} de plus`);
  console.log(`\n  📊 Referrals: ${migrated} migrated, ${skipped} already done, ${noRef} no referral, ${errors} errors`);
  console.log(`  📊 Total users processed: ${processed}`);
  return { migrated, skipped, noRef, errors, processed };
}

// ============================================================================
// STEP 3: Activate unified system
// ============================================================================

async function activateSystem() {
  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  STEP 3 — Activate Unified Commission System    ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // First check current state
  const configDoc = await db.collection("unified_commission_system").doc("config").get();
  if (configDoc.exists) {
    console.log("  📋 Current config:", JSON.stringify(configDoc.data(), null, 2));
  } else {
    console.log("  📋 No config exists yet — will create");
  }

  // Set enabled=true, shadowMode=false
  await db.collection("unified_commission_system").doc("config").set({
    enabled: true,
    shadowMode: false,
    activatedAt: admin.firestore.Timestamp.now(),
    activatedBy: "migration-script",
    updatedAt: admin.firestore.Timestamp.now(),
  }, { merge: true });

  // Verify
  const verify = await db.collection("unified_commission_system").doc("config").get();
  console.log("\n  ✅ System activated:", JSON.stringify(verify.data(), null, 2));
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════════╗");
  console.log("║  UNIFIED COMMISSION SYSTEM — Full Migration & Activation   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝");

  const step1 = await migrateAffiliateCodes();
  const step2 = await migrateReferrals();
  await activateSystem();

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║  RÉSUMÉ FINAL                                              ║");
  console.log("╠══════════════════════════════════════════════════════════════╣");
  console.log(`║  Codes affiliés:  ${step1.migrated} migrés, ${step1.skipped} déjà faits, ${step1.errors} erreurs`);
  console.log(`║  Referrals:       ${step2.migrated} migrés, ${step2.skipped} déjà faits, ${step2.errors} erreurs`);
  console.log("║  Système unifié:  ✅ ACTIVÉ (enabled=true, shadowMode=false) ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");
  console.log("  ⚡ Rollback rapide si problème:");
  console.log("     Firestore → unified_commission_system/config → enabled: false");
  console.log("     Les legacy handlers reprennent instantanément.\n");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

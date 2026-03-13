/**
 * PROMO — $10/call for ALL provider types (lawyer + expat) until Aug 31, 2026
 *
 * This script:
 * 1. Updates all 4 affiliate commission plans (chatter, captain, influencer, blogger)
 *    to set client_call amounts to $10/$10 (1000/1000 cents)
 * 2. Updates lockedRates for ALL existing affiliates so they benefit from the promo
 * 3. GroupAdmin stays at $5/$3 (different rate structure, confirm with user if needed)
 *
 * Usage: node scripts/applyPromo10PerCall.js
 * Run from: sos/firebase/functions/
 *
 * NOTE: After Aug 31, 2026, run a reverse script to set plans back to $5/$3.
 *       Users registered before that date KEEP $10/$10 forever (lockedRates).
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
}
const db = admin.firestore();

const PROMO_AMOUNT_LAWYER = 1000; // $10
const PROMO_AMOUNT_EXPAT = 1000;  // $10
const PROMO_END_DATE = "2026-08-31";

// Plans to update (all affiliate roles get $10/$10)
const PLAN_IDS = ["chatter_v1", "captain_v1", "influencer_v1", "blogger_v1", "groupadmin_v1"];

// Collections where affiliates are stored
const AFFILIATE_COLLECTIONS = [
  { collection: "chatters", roleLabel: "Chatter" },
  { collection: "influencers", roleLabel: "Influencer" },
  { collection: "bloggers", roleLabel: "Blogger" },
  { collection: "group_admins", roleLabel: "GroupAdmin" },
];

async function main() {
  console.log("╔═══════════════════════════════════════════════════════════╗");
  console.log("║  PROMO — $10/call (lawyer+expat) until Aug 31, 2026     ║");
  console.log("╚═══════════════════════════════════════════════════════════╝\n");

  const now = admin.firestore.Timestamp.now();

  // ========================================================================
  // STEP 1: Update commission plans
  // ========================================================================
  console.log("  📋 STEP 1: Update commission plans\n");

  for (const planId of PLAN_IDS) {
    const docRef = db.collection("commission_plans").doc(planId);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`  ❌ MISSING: ${planId}`);
      continue;
    }

    const data = doc.data();
    const oldAmounts = data.rules?.client_call?.amounts;

    await docRef.update({
      "rules.client_call.amounts.lawyer": PROMO_AMOUNT_LAWYER,
      "rules.client_call.amounts.expat": PROMO_AMOUNT_EXPAT,
      updatedAt: now,
      updatedBy: "promo-script",
      promoNote: `Promo $10/call until ${PROMO_END_DATE}`,
    });

    console.log(`  ✅ ${planId}: lawyer $${(oldAmounts?.lawyer || 0)/100}→$${PROMO_AMOUNT_LAWYER/100}, expat $${(oldAmounts?.expat || 0)/100}→$${PROMO_AMOUNT_EXPAT/100}`);
  }

  // ========================================================================
  // STEP 2: Update lockedRates for ALL existing affiliates
  // ========================================================================
  console.log("\n  📋 STEP 2: Update lockedRates for all existing affiliates\n");

  let totalUpdated = 0;
  let totalSkipped = 0;

  for (const { collection, roleLabel } of AFFILIATE_COLLECTIONS) {
    const snapshot = await db.collection(collection).get();
    let updated = 0;
    let skipped = 0;

    // Batch updates (max 500 per batch)
    const batches = [];
    let currentBatch = db.batch();
    let opCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const lockedRates = data.lockedRates || {};

      // Check if already at $10/$10
      if (lockedRates.client_call_lawyer === PROMO_AMOUNT_LAWYER &&
          lockedRates.client_call_expat === PROMO_AMOUNT_EXPAT) {
        skipped++;
        continue;
      }

      // Update lockedRates
      const updateData = {
        "lockedRates.client_call_lawyer": PROMO_AMOUNT_LAWYER,
        "lockedRates.client_call_expat": PROMO_AMOUNT_EXPAT,
        updatedAt: now,
      };

      currentBatch.update(doc.ref, updateData);
      opCount++;
      updated++;

      if (opCount >= 500) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) {
      batches.push(currentBatch);
    }

    // Commit all batches
    for (const batch of batches) {
      await batch.commit();
    }

    console.log(`  ✅ ${roleLabel}: ${updated} updated, ${skipped} already at $10/$10 (total: ${snapshot.size})`);
    totalUpdated += updated;
    totalSkipped += skipped;
  }

  // ========================================================================
  // VERIFICATION
  // ========================================================================
  console.log("\n  📋 VERIFICATION\n");

  // Verify plans
  for (const planId of PLAN_IDS) {
    const doc = await db.collection("commission_plans").doc(planId).get();
    const amounts = doc.data()?.rules?.client_call?.amounts;
    console.log(`  → ${planId}: lawyer=$${amounts?.lawyer/100}, expat=$${amounts?.expat/100}`);
  }

  // Sample verify a few affiliates
  for (const { collection, roleLabel } of AFFILIATE_COLLECTIONS) {
    const sample = await db.collection(collection).limit(2).get();
    for (const doc of sample.docs) {
      const lr = doc.data()?.lockedRates;
      if (lr) {
        console.log(`  → ${roleLabel} ${doc.id.substring(0, 8)}...: lawyer=$${(lr.client_call_lawyer || 0)/100}, expat=$${(lr.client_call_expat || 0)/100}`);
      }
    }
  }

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Plans updated: ${PLAN_IDS.length}`);
  console.log(`  Users updated: ${totalUpdated}`);
  console.log(`  Users already at $10: ${totalSkipped}`);
  console.log(`  Promo valid until: ${PROMO_END_DATE}`);
  console.log(`═══════════════════════════════════════════════\n`);
  console.log("  ✅ Promo applied.\n");
  console.log("  ⚠️  REMINDER: After Aug 31 2026, update plans back to $5/$3.");
  console.log("     New users registered BEFORE that date keep $10/$10 forever (lockedRates).\n");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

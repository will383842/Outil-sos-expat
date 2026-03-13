/**
 * FIX — Correct commission plan amounts in Firestore
 *
 * The initial seed used wrong amounts ($10/$5 instead of $5/$3).
 * This script updates the 4 affected plans + captain tier thresholds + quality bonus.
 *
 * Usage: node scripts/fixCommissionPlanAmounts.js
 * Run from: sos/firebase/functions/
 */

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
}
const db = admin.firestore();

const FIXES = [
  {
    id: "chatter_v1",
    path: "rules.client_call.amounts",
    oldValue: { lawyer: 1000, expat: 500 },
    newValue: { lawyer: 500, expat: 300 },
  },
  {
    id: "captain_v1",
    path: "rules.client_call.amounts",
    oldValue: { lawyer: 1000, expat: 500 },
    newValue: { lawyer: 500, expat: 300 },
  },
  {
    id: "captain_v1",
    path: "rules.captain_bonus.tiers",
    description: "Fix captain tier minTeamCalls (50/100/200/500/1000 → 20/50/100/200/400)",
    newValue: [
      { name: "Bronze", minTeamCalls: 20, bonusAmount: 2500 },
      { name: "Argent", minTeamCalls: 50, bonusAmount: 5000 },
      { name: "Or", minTeamCalls: 100, bonusAmount: 10000 },
      { name: "Platine", minTeamCalls: 200, bonusAmount: 20000 },
      { name: "Diamant", minTeamCalls: 400, bonusAmount: 40000 },
    ],
  },
  {
    id: "captain_v1",
    path: "rules.captain_bonus.qualityBonus.amount",
    oldValue: 2000,
    newValue: 10000,
    description: "Fix quality bonus $20 → $100",
  },
  {
    id: "influencer_v1",
    path: "rules.client_call.amounts",
    oldValue: { lawyer: 1000, expat: 500 },
    newValue: { lawyer: 500, expat: 300 },
  },
  {
    id: "blogger_v1",
    path: "rules.client_call.amounts",
    oldValue: { lawyer: 1000, expat: 500 },
    newValue: { lawyer: 500, expat: 300 },
  },
];

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║  FIX — Correct Commission Plan Amounts in Firestore ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const now = admin.firestore.Timestamp.now();

  for (const fix of FIXES) {
    const docRef = db.collection("commission_plans").doc(fix.id);
    const doc = await docRef.get();

    if (!doc.exists) {
      console.log(`  ❌ MISSING: ${fix.id} — plan not found`);
      continue;
    }

    const updateData = {
      [fix.path]: fix.newValue,
      updatedAt: now,
      updatedBy: "fix-script",
    };

    await docRef.update(updateData);
    const desc = fix.description || `${fix.path}: ${JSON.stringify(fix.oldValue)} → ${JSON.stringify(fix.newValue)}`;
    console.log(`  ✅ FIXED: ${fix.id} — ${desc}`);
  }

  // Verify all plans
  console.log("\n  📋 Verification des montants client_call après correction:\n");
  const plans = await db.collection("commission_plans").get();
  for (const doc of plans.docs) {
    const data = doc.data();
    const amounts = data.rules?.client_call?.amounts;
    const rate = data.rules?.client_call?.rate;
    if (amounts) {
      console.log(`     → ${doc.id}: lawyer=$${amounts.lawyer/100}, expat=$${amounts.expat/100}`);
    } else if (rate) {
      console.log(`     → ${doc.id}: ${rate * 100}% commission`);
    }

    // Show captain tiers if present
    if (data.rules?.captain_bonus?.enabled) {
      const tiers = data.rules.captain_bonus.tiers || [];
      console.log(`       Captain tiers: ${tiers.map(t => `${t.name}(${t.minTeamCalls})`).join(', ')}`);
      console.log(`       Quality bonus: $${(data.rules.captain_bonus.qualityBonus?.amount || 0) / 100}`);
    }
  }

  console.log("\n  ✅ Fix complete.\n");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

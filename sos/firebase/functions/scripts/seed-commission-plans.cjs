/**
 * Seed Script: Commission Plans
 *
 * Creates the initial commission plans in Firestore:
 * 1. "Offre Lancement" — $10/appel pour tous, valide avant le 31 mars 2026
 * 2. "Standard" — $5 lawyer / $3 expat (rates par defaut), actif apres le 31 mars
 *
 * Usage: node scripts/seed-commission-plans.cjs
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin
const serviceAccount = require("../serviceAccountKey.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function seedCommissionPlans() {
  console.log("Seeding commission plans...");

  const now = admin.firestore.Timestamp.now();

  // ============================================================================
  // PLAN 1: Offre Lancement (before March 31, 2026)
  // ALL affiliates get $10 per client call regardless of provider type
  // ============================================================================
  const launchPlan = {
    name: "Offre Lancement Mars 2026",
    description:
      "Offre speciale de lancement : $10 par appel client, quel que soit le type de prestataire (avocat ou expatrie). Valable pour toutes les inscriptions avant le 31 mars 2026. Ces tarifs sont verrouilles a vie pour les inscrits.",
    startDate: admin.firestore.Timestamp.fromDate(new Date("2026-01-01T00:00:00Z")),
    endDate: admin.firestore.Timestamp.fromDate(new Date("2026-03-31T23:59:59Z")),
    isActive: true,
    priority: 10, // High priority (overrides Standard)

    chatterRates: {
      commissionClientCallAmount: 1000, // $10 flat (no lawyer/expat split)
      commissionN1CallAmount: 100, // $1
      commissionN2CallAmount: 50, // $0.50
      commissionActivationBonusAmount: 500, // $5
      commissionN1RecruitBonusAmount: 100, // $1
      commissionProviderCallAmount: 500, // $5
      // NOTE: No commissionClientCallAmountLawyer/Expat = $10 for ALL
    },

    influencerRates: {
      commissionClientAmount: 1000, // $10 flat (no lawyer/expat split)
      commissionRecruitmentAmount: 500, // $5
      // NOTE: No commissionClientAmountLawyer/Expat = $10 for ALL
    },

    bloggerRates: {
      commissionClientAmount: 1000, // $10 flat (no lawyer/expat split)
      commissionRecruitmentAmount: 500, // $5
    },

    groupAdminRates: {
      commissionClientCallAmount: 1000, // $10 flat (no lawyer/expat split)
      commissionN1CallAmount: 100, // $1
      commissionN2CallAmount: 50, // $0.50
      commissionActivationBonusAmount: 500, // $5
      commissionN1RecruitBonusAmount: 100, // $1
    },

    affiliateRates: {
      signupBonus: 100, // $1
      callCommissionRate: 0, // No percentage
      callFixedBonus: 1000, // $10 per call (flat, same as specialized affiliates)
      subscriptionRate: 0,
      subscriptionFixedBonus: 500, // $5
      providerValidationBonus: 500, // $5
    },

    createdAt: now,
    createdBy: "system-seed",
    updatedAt: now,
    updatedBy: "system-seed",
  };

  // ============================================================================
  // PLAN 2: Standard (after March 31, 2026)
  // Default rates: $5 lawyer / $3 expat for chatters & groupAdmins
  // $10 for influencers & bloggers (as before)
  // ============================================================================
  const standardPlan = {
    name: "Standard",
    description:
      "Tarifs standard apres la periode de lancement. Commission differenciee selon le type de prestataire.",
    startDate: admin.firestore.Timestamp.fromDate(new Date("2026-04-01T00:00:00Z")),
    endDate: admin.firestore.Timestamp.fromDate(new Date("2030-12-31T23:59:59Z")),
    isActive: true,
    priority: 1, // Low priority (base plan)

    chatterRates: {
      commissionClientCallAmount: 300, // $3 fallback
      commissionClientCallAmountLawyer: 500, // $5 for lawyer
      commissionClientCallAmountExpat: 300, // $3 for expat
      commissionN1CallAmount: 100,
      commissionN2CallAmount: 50,
      commissionActivationBonusAmount: 500,
      commissionN1RecruitBonusAmount: 100,
      commissionProviderCallAmount: 500,
      commissionProviderCallAmountLawyer: 500,
      commissionProviderCallAmountExpat: 300,
    },

    influencerRates: {
      commissionClientAmount: 1000, // $10 fallback
      commissionClientAmountLawyer: 500, // $5
      commissionClientAmountExpat: 300, // $3
      commissionRecruitmentAmount: 500,
      commissionRecruitmentAmountLawyer: 500,
      commissionRecruitmentAmountExpat: 300,
    },

    bloggerRates: {
      commissionClientAmount: 1000, // $10 fallback
      commissionClientAmountLawyer: 500, // $5
      commissionClientAmountExpat: 300, // $3
      commissionRecruitmentAmount: 500,
      commissionRecruitmentAmountLawyer: 500,
      commissionRecruitmentAmountExpat: 300,
    },

    groupAdminRates: {
      commissionClientCallAmount: 300,
      commissionClientAmountLawyer: 500,
      commissionClientAmountExpat: 300,
      commissionN1CallAmount: 100,
      commissionN2CallAmount: 50,
      commissionActivationBonusAmount: 500,
      commissionN1RecruitBonusAmount: 100,
    },

    affiliateRates: {
      signupBonus: 100, // $1
      callCommissionRate: 0.75, // 75% of call fee
      callFixedBonus: 0, // No fixed bonus
      subscriptionRate: 0.25, // 25% of subscription
      subscriptionFixedBonus: 0,
      providerValidationBonus: 300, // $3
    },

    createdAt: now,
    createdBy: "system-seed",
    updatedAt: now,
    updatedBy: "system-seed",
  };

  // Create plans
  const launchRef = db.collection("commission_plans").doc("launch-march-2026");
  const standardRef = db.collection("commission_plans").doc("standard");

  await launchRef.set(launchPlan);
  console.log("Created: Offre Lancement Mars 2026 (launch-march-2026)");

  await standardRef.set(standardPlan);
  console.log("Created: Standard (standard)");

  // ============================================================================
  // MIGRATION: Tag existing affiliates with the launch plan
  // All existing active chatters/influencers/bloggers/groupAdmins registered
  // before this script get the launch plan locked rates
  // ============================================================================
  console.log("\nMigrating existing affiliates...");

  const collections = [
    { name: "chatters", rates: launchPlan.chatterRates },
    { name: "influencers", rates: launchPlan.influencerRates },
    { name: "bloggers", rates: launchPlan.bloggerRates },
    { name: "group_admins", rates: launchPlan.groupAdminRates },
  ];

  let totalMigrated = 0;

  for (const { name, rates } of collections) {
    const snapshot = await db
      .collection(name)
      .where("status", "==", "active")
      .get();

    let count = 0;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Skip if already has lockedRates
      if (data.lockedRates) continue;

      batch.update(doc.ref, {
        commissionPlanId: "launch-march-2026",
        commissionPlanName: "Offre Lancement Mars 2026",
        rateLockDate: new Date().toISOString(),
        lockedRates: rates,
      });
      count++;
      batchCount++;

      // Firestore batch limit is 500
      if (batchCount === 500) {
        await batch.commit();
        console.log(`  ${name}: committed batch of 500`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) {
      await batch.commit();
    }
    console.log(`  ${name}: migrated ${count} affiliates`);
    totalMigrated += count;
  }

  console.log(`\nDone! Total migrated: ${totalMigrated} affiliates`);
  console.log("Plans created: launch-march-2026, standard");
  process.exit(0);
}

seedCommissionPlans().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});

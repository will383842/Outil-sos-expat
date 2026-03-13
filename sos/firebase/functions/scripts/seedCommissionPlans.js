/**
 * Seed Script — Write 8 Default Commission Plans to Firestore
 *
 * Creates the unified commission_plans collection with all default plans.
 * Safe to re-run: uses set() with merge, so existing fields are preserved.
 *
 * Usage: node scripts/seedCommissionPlans.js
 *
 * Prerequisites:
 *   - Firebase CLI logged in (firebase login)
 *   - OR Application Default Credentials configured
 *   - Run from: sos/firebase/functions/
 */

const admin = require("firebase-admin");
const path = require("path");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
}
const db = admin.firestore();

// ============================================================================
// DEFAULT PLANS — Mirrors src/unified/defaultPlans.ts
// ============================================================================

const DISABLED_SIGNUP = { enabled: false, amount: 0 };
const DISABLED_RECRUITMENT = { enabled: false, depth: 0, depthAmounts: [] };
const DISABLED_ACTIVATION = { enabled: false, amount: 0, afterNthCall: 2 };
const DISABLED_PROVIDER = { enabled: false, amounts: { lawyer: 0, expat: 0 }, windowMonths: 6 };
const DISABLED_RECRUIT_BONUS = { enabled: false, amount: 0 };
const DISABLED_SUBSCRIPTION = { enabled: false, type: "fixed", firstMonthAmount: 0, renewalAmount: 0, maxMonths: 0 };
const DISABLED_MILESTONES = { enabled: false, qualificationThreshold: 0, milestones: [] };
const DISABLED_CAPTAIN = {
  enabled: false, callAmount: 0, tiers: [],
  qualityBonus: { enabled: false, amount: 0, minActiveRecruits: 0, minTeamCommissions: 0 },
};
const DISABLED_PROMO = { enabled: false };
const DISABLED_BONUSES = {
  levels: false, streaks: false,
  top3: { enabled: false, type: "cash", cashAmounts: [], multipliers: [] },
  captain: false, weeklyChallenges: false,
  telegramBonus: { enabled: false, amount: 0, unlockThreshold: 0 },
};
const DISABLED_DISCOUNT = { enabled: false, type: "fixed", value: 0 };
const DEFAULT_WITHDRAWAL = { minimumAmount: 3000, fee: 300, holdPeriodHours: 24 };

const CHATTER_MILESTONES = [
  { minQualifiedReferrals: 5, bonusAmount: 1500, name: "5 filleuls" },
  { minQualifiedReferrals: 10, bonusAmount: 3500, name: "10 filleuls" },
  { minQualifiedReferrals: 20, bonusAmount: 7500, name: "20 filleuls" },
  { minQualifiedReferrals: 50, bonusAmount: 25000, name: "50 filleuls" },
  { minQualifiedReferrals: 100, bonusAmount: 60000, name: "100 filleuls" },
  { minQualifiedReferrals: 500, bonusAmount: 400000, name: "500 filleuls" },
];

const CAPTAIN_TIERS = [
  { name: "Bronze", minTeamCalls: 50, bonusAmount: 2500 },
  { name: "Argent", minTeamCalls: 100, bonusAmount: 5000 },
  { name: "Or", minTeamCalls: 200, bonusAmount: 10000 },
  { name: "Platine", minTeamCalls: 500, bonusAmount: 20000 },
  { name: "Diamant", minTeamCalls: 1000, bonusAmount: 40000 },
];

const PLANS = [
  {
    id: "client_v1",
    name: "Plan Client Standard",
    description: "Plan par défaut pour les clients qui parrainent d'autres clients",
    targetRoles: ["client"],
    isDefault: true,
    rules: {
      signup_bonus: { enabled: true, amount: 200 },
      client_call: { enabled: true, type: "fixed", amounts: { lawyer: 200, expat: 100 } },
      recruitment_call: DISABLED_RECRUITMENT,
      activation_bonus: DISABLED_ACTIVATION,
      provider_recruitment: DISABLED_PROVIDER,
      recruit_bonus: DISABLED_RECRUIT_BONUS,
      n1_recruit_bonus: DISABLED_RECRUIT_BONUS,
      subscription_commission: DISABLED_SUBSCRIPTION,
      referral_milestones: DISABLED_MILESTONES,
      captain_bonus: DISABLED_CAPTAIN,
      promo_multiplier: DISABLED_PROMO,
    },
    bonuses: DISABLED_BONUSES,
    discount: DISABLED_DISCOUNT,
    withdrawal: DEFAULT_WITHDRAWAL,
  },
  {
    id: "provider_v1",
    name: "Plan Prestataire Standard",
    description: "Plan par défaut pour les avocats et expatriés aidants",
    targetRoles: ["lawyer", "expat", "provider"],
    isDefault: true,
    rules: {
      signup_bonus: { enabled: true, amount: 200 },
      client_call: { enabled: true, type: "fixed", amounts: { lawyer: 200, expat: 100 } },
      recruitment_call: DISABLED_RECRUITMENT,
      activation_bonus: DISABLED_ACTIVATION,
      provider_recruitment: DISABLED_PROVIDER,
      recruit_bonus: DISABLED_RECRUIT_BONUS,
      n1_recruit_bonus: DISABLED_RECRUIT_BONUS,
      subscription_commission: DISABLED_SUBSCRIPTION,
      referral_milestones: DISABLED_MILESTONES,
      captain_bonus: DISABLED_CAPTAIN,
      promo_multiplier: DISABLED_PROMO,
    },
    bonuses: DISABLED_BONUSES,
    discount: DISABLED_DISCOUNT,
    withdrawal: DEFAULT_WITHDRAWAL,
  },
  {
    id: "chatter_v1",
    name: "Plan Chatter Standard",
    description: "Plan complet pour les chatters avec cascade N1/N2, milestones, top 3 cash",
    targetRoles: ["chatter"],
    isDefault: true,
    rules: {
      signup_bonus: { enabled: true, amount: 200 },
      client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } },
      recruitment_call: { enabled: true, depth: 2, depthAmounts: [100, 50] },
      activation_bonus: { enabled: true, amount: 500, afterNthCall: 2 },
      provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 },
      recruit_bonus: { enabled: true, amount: 100 },
      n1_recruit_bonus: { enabled: true, amount: 100 },
      subscription_commission: DISABLED_SUBSCRIPTION,
      referral_milestones: {
        enabled: true,
        qualificationThreshold: 2000,
        milestones: CHATTER_MILESTONES,
      },
      captain_bonus: DISABLED_CAPTAIN,
      promo_multiplier: DISABLED_PROMO,
    },
    bonuses: {
      levels: true, streaks: true,
      top3: { enabled: true, type: "cash", cashAmounts: [20000, 10000, 5000], minTotalEarned: 2000 },
      captain: true, weeklyChallenges: true,
      telegramBonus: { enabled: true, amount: 5000, unlockThreshold: 15000 },
    },
    discount: DISABLED_DISCOUNT,
    withdrawal: DEFAULT_WITHDRAWAL,
  },
  {
    id: "captain_v1",
    name: "Plan Captain Chatter",
    description: "Plan pour les captains avec tiers mensuels, quality bonus, et commissions d'équipe",
    targetRoles: ["captainChatter"],
    isDefault: true,
    rules: {
      signup_bonus: { enabled: true, amount: 200 },
      client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } },
      recruitment_call: { enabled: true, depth: 2, depthAmounts: [100, 50] },
      activation_bonus: { enabled: true, amount: 500, afterNthCall: 2 },
      provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 },
      recruit_bonus: { enabled: true, amount: 100 },
      n1_recruit_bonus: { enabled: true, amount: 100 },
      subscription_commission: DISABLED_SUBSCRIPTION,
      referral_milestones: {
        enabled: true,
        qualificationThreshold: 2000,
        milestones: CHATTER_MILESTONES,
      },
      captain_bonus: {
        enabled: true,
        callAmount: 300,
        tiers: CAPTAIN_TIERS,
        qualityBonus: { enabled: true, amount: 2000, minActiveRecruits: 10, minTeamCommissions: 10000 },
      },
      promo_multiplier: DISABLED_PROMO,
    },
    bonuses: {
      levels: true, streaks: true,
      top3: { enabled: true, type: "cash", cashAmounts: [20000, 10000, 5000], minTotalEarned: 2000 },
      captain: true, weeklyChallenges: true,
      telegramBonus: { enabled: true, amount: 5000, unlockThreshold: 15000 },
    },
    discount: DISABLED_DISCOUNT,
    withdrawal: DEFAULT_WITHDRAWAL,
  },
  {
    id: "influencer_v1",
    name: "Plan Influenceur Standard",
    description: "Plan influenceur avec top 3 multiplicateur et 5% discount client",
    targetRoles: ["influencer"],
    isDefault: true,
    rules: {
      signup_bonus: { enabled: true, amount: 200 },
      client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } },
      recruitment_call: DISABLED_RECRUITMENT,
      activation_bonus: DISABLED_ACTIVATION,
      provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 },
      recruit_bonus: DISABLED_RECRUIT_BONUS,
      n1_recruit_bonus: DISABLED_RECRUIT_BONUS,
      subscription_commission: DISABLED_SUBSCRIPTION,
      referral_milestones: DISABLED_MILESTONES,
      captain_bonus: DISABLED_CAPTAIN,
      promo_multiplier: DISABLED_PROMO,
    },
    bonuses: {
      levels: true, streaks: true,
      top3: { enabled: true, type: "multiplier", multipliers: [2.0, 1.5, 1.15] },
      captain: false, weeklyChallenges: false,
      telegramBonus: { enabled: true, amount: 5000, unlockThreshold: 15000 },
    },
    discount: {
      enabled: true, type: "percentage", value: 5,
      label: "Remise affilié",
      labelTranslations: { fr: "5% de remise", en: "5% discount" },
    },
    withdrawal: DEFAULT_WITHDRAWAL,
  },
  {
    id: "blogger_v1",
    name: "Plan Bloggeur Standard",
    description: "Plan bloggeur avec commissions fixes, pas de discount client",
    targetRoles: ["blogger"],
    isDefault: true,
    rules: {
      signup_bonus: { enabled: true, amount: 200 },
      client_call: { enabled: true, type: "fixed", amounts: { lawyer: 1000, expat: 500 } },
      recruitment_call: DISABLED_RECRUITMENT,
      activation_bonus: DISABLED_ACTIVATION,
      provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 },
      recruit_bonus: DISABLED_RECRUIT_BONUS,
      n1_recruit_bonus: DISABLED_RECRUIT_BONUS,
      subscription_commission: DISABLED_SUBSCRIPTION,
      referral_milestones: DISABLED_MILESTONES,
      captain_bonus: DISABLED_CAPTAIN,
      promo_multiplier: DISABLED_PROMO,
    },
    bonuses: DISABLED_BONUSES,
    discount: DISABLED_DISCOUNT,
    withdrawal: DEFAULT_WITHDRAWAL,
  },
  {
    id: "groupadmin_v1",
    name: "Plan Admin Groupe Standard",
    description: "Plan admin groupe avec cascade N1/N2, promo multiplier, et $5 discount client",
    targetRoles: ["groupAdmin"],
    isDefault: true,
    rules: {
      signup_bonus: { enabled: true, amount: 200 },
      client_call: { enabled: true, type: "fixed", amounts: { lawyer: 500, expat: 300 } },
      recruitment_call: { enabled: true, depth: 2, depthAmounts: [100, 50] },
      activation_bonus: { enabled: true, amount: 500, afterNthCall: 2 },
      provider_recruitment: { enabled: true, amounts: { lawyer: 500, expat: 300 }, windowMonths: 6 },
      recruit_bonus: { enabled: true, amount: 100 },
      n1_recruit_bonus: { enabled: true, amount: 100 },
      subscription_commission: DISABLED_SUBSCRIPTION,
      referral_milestones: DISABLED_MILESTONES,
      captain_bonus: DISABLED_CAPTAIN,
      promo_multiplier: { enabled: true },
    },
    bonuses: DISABLED_BONUSES,
    discount: {
      enabled: true, type: "fixed", value: 500,
      label: "Remise groupe",
      labelTranslations: { fr: "5$ de remise", en: "$5 discount" },
    },
    withdrawal: DEFAULT_WITHDRAWAL,
  },
  {
    id: "partner_v1",
    name: "Plan Partenaire Standard",
    description: "Plan partenaire avec commission en pourcentage. Discount géré individuellement.",
    targetRoles: ["partner"],
    isDefault: true,
    rules: {
      signup_bonus: { enabled: false, amount: 0 },
      client_call: { enabled: true, type: "percentage", rate: 0.15 },
      recruitment_call: DISABLED_RECRUITMENT,
      activation_bonus: DISABLED_ACTIVATION,
      provider_recruitment: DISABLED_PROVIDER,
      recruit_bonus: DISABLED_RECRUIT_BONUS,
      n1_recruit_bonus: DISABLED_RECRUIT_BONUS,
      subscription_commission: DISABLED_SUBSCRIPTION,
      referral_milestones: DISABLED_MILESTONES,
      captain_bonus: DISABLED_CAPTAIN,
      promo_multiplier: DISABLED_PROMO,
    },
    bonuses: DISABLED_BONUSES,
    discount: DISABLED_DISCOUNT,
    withdrawal: DEFAULT_WITHDRAWAL,
  },
];

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║  SEED — Write 8 Default Commission Plans to Firestore  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  const now = admin.firestore.Timestamp.now();
  let created = 0;
  let updated = 0;

  for (const plan of PLANS) {
    const docRef = db.collection("commission_plans").doc(plan.id);
    const existing = await docRef.get();

    const docData = {
      ...plan,
      updatedAt: now,
      updatedBy: "system",
      version: 1,
    };

    if (!existing.exists) {
      docData.createdAt = now;
      await docRef.set(docData);
      console.log(`  ✅ CREATED: ${plan.id} — ${plan.name} (roles: ${plan.targetRoles.join(", ")})`);
      created++;
    } else {
      // Don't overwrite existing plans — only update if explicitly requested
      console.log(`  ⏭️  EXISTS:  ${plan.id} — ${plan.name} (skipped, already exists)`);
      updated++;
    }
  }

  console.log(`\n═══════════════════════════════════════════════`);
  console.log(`  Created: ${created} | Already existed: ${updated}`);
  console.log(`  Total plans in collection: ${created + updated}`);
  console.log(`═══════════════════════════════════════════════\n`);

  // Verify
  const verify = await db.collection("commission_plans").get();
  console.log(`  📋 Verification: ${verify.size} documents in commission_plans collection`);

  for (const doc of verify.docs) {
    const data = doc.data();
    console.log(`     → ${doc.id}: "${data.name}" (roles: ${(data.targetRoles || []).join(", ")}, default: ${data.isDefault})`);
  }

  console.log("\n  ✅ Seed complete.\n");
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

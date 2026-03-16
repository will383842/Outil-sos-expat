/**
 * One-shot script: Propagate the active commission plan to {role}_config/current docs
 * This triggers the same logic as manageCommissionPlans when creating/updating a plan.
 *
 * Usage: node scripts/propagate-active-plan.cjs
 */

const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function main() {
  // 1. Find active commission plan
  console.log("🔍 Searching for active commission plan...");
  const now = admin.firestore.Timestamp.now();
  const snapshot = await db
    .collection("commission_plans")
    .where("isActive", "==", true)
    .get();

  const activePlans = snapshot.docs
    .filter((doc) => {
      const data = doc.data();
      return data.startDate <= now && data.endDate >= now;
    })
    .sort((a, b) => (b.data().priority || 0) - (a.data().priority || 0));

  if (activePlans.length === 0) {
    console.log("❌ No active commission plan found. Config docs will keep their current values.");
    console.log("\n📋 All plans in collection:");
    const allPlans = await db.collection("commission_plans").get();
    allPlans.forEach((doc) => {
      const d = doc.data();
      console.log(`  - ${doc.id}: "${d.name}" | active=${d.isActive} | ${d.startDate?.toDate?.()?.toISOString()} → ${d.endDate?.toDate?.()?.toISOString()}`);
    });
    process.exit(0);
  }

  const planDoc = activePlans[0];
  const plan = planDoc.data();
  console.log(`✅ Active plan found: "${plan.name}" (${planDoc.id})`);
  console.log(`   Priority: ${plan.priority}, Active: ${plan.isActive}`);
  console.log(`   Period: ${plan.startDate.toDate().toISOString()} → ${plan.endDate.toDate().toISOString()}`);

  // 2. Show rates that will be propagated
  console.log("\n📊 Rates to propagate:");
  console.log("   Chatter:", JSON.stringify(plan.chatterRates, null, 2));
  console.log("   Influencer:", JSON.stringify(plan.influencerRates, null, 2));
  console.log("   Blogger:", JSON.stringify(plan.bloggerRates, null, 2));
  console.log("   GroupAdmin:", JSON.stringify(plan.groupAdminRates, null, 2));
  if (plan.affiliateRates) {
    console.log("   Affiliate:", JSON.stringify(plan.affiliateRates, null, 2));
  }

  // 3. Propagate to config docs
  console.log("\n🚀 Propagating to config docs...");
  const batch = db.batch();
  const propagatedAt = admin.firestore.Timestamp.now();

  // Chatter
  const chatterRef = db.doc("chatter_config/current");
  batch.set(chatterRef, {
    ...plan.chatterRates,
    _activePlanName: plan.name,
    _propagatedAt: propagatedAt,
  }, { merge: true });
  console.log("   ✅ chatter_config/current");

  // Influencer
  const influencerRef = db.doc("influencer_config/current");
  batch.set(influencerRef, {
    commissionClientAmount: plan.influencerRates.commissionClientAmount,
    commissionClientAmountLawyer: plan.influencerRates.commissionClientAmountLawyer ?? null,
    commissionClientAmountExpat: plan.influencerRates.commissionClientAmountExpat ?? null,
    commissionRecruitmentAmount: plan.influencerRates.commissionRecruitmentAmount,
    commissionRecruitmentAmountLawyer: plan.influencerRates.commissionRecruitmentAmountLawyer ?? null,
    commissionRecruitmentAmountExpat: plan.influencerRates.commissionRecruitmentAmountExpat ?? null,
    _activePlanName: plan.name,
    _propagatedAt: propagatedAt,
  }, { merge: true });
  console.log("   ✅ influencer_config/current");

  // Blogger
  const bloggerRef = db.doc("blogger_config/current");
  batch.set(bloggerRef, {
    commissionClientAmount: plan.bloggerRates.commissionClientAmount,
    commissionClientAmountLawyer: plan.bloggerRates.commissionClientAmountLawyer ?? null,
    commissionClientAmountExpat: plan.bloggerRates.commissionClientAmountExpat ?? null,
    commissionRecruitmentAmount: plan.bloggerRates.commissionRecruitmentAmount,
    commissionRecruitmentAmountLawyer: plan.bloggerRates.commissionRecruitmentAmountLawyer ?? null,
    commissionRecruitmentAmountExpat: plan.bloggerRates.commissionRecruitmentAmountExpat ?? null,
    _activePlanName: plan.name,
    _propagatedAt: propagatedAt,
  }, { merge: true });
  console.log("   ✅ blogger_config/current");

  // GroupAdmin
  const groupAdminRef = db.doc("group_admin_config/current");
  batch.set(groupAdminRef, {
    commissionClientCallAmount: plan.groupAdminRates.commissionClientCallAmount ?? null,
    commissionClientAmountLawyer: plan.groupAdminRates.commissionClientAmountLawyer ?? null,
    commissionClientAmountExpat: plan.groupAdminRates.commissionClientAmountExpat ?? null,
    commissionN1CallAmount: plan.groupAdminRates.commissionN1CallAmount,
    commissionN2CallAmount: plan.groupAdminRates.commissionN2CallAmount,
    commissionActivationBonusAmount: plan.groupAdminRates.commissionActivationBonusAmount,
    commissionN1RecruitBonusAmount: plan.groupAdminRates.commissionN1RecruitBonusAmount,
    _activePlanName: plan.name,
    _propagatedAt: propagatedAt,
  }, { merge: true });
  console.log("   ✅ group_admin_config/current");

  await batch.commit();
  console.log("\n🎉 Done! All 4 config docs updated.");
  console.log("   Landing pages will show the new rates within 5 minutes (cache TTL).");

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});

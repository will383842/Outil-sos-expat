/**
 * Phase 0 — Snapshot des configurations de discount et commissions
 *
 * Exporte toutes les configs de discount (GroupAdmin, Influencer, Partner),
 * les configs de commission par rôle, les commission_plans, et les coupons actifs.
 *
 * Usage: node scripts/audit/snapshotDiscountConfig.js
 * Output: scripts/audit/snapshots/snapshot_discounts_YYYYMMDD.json
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
}
const db = admin.firestore();

async function getDocSafe(docRef) {
  try {
    const snap = await docRef.get();
    return snap.exists ? snap.data() : null;
  } catch (err) {
    console.log(`    ⚠️  Error reading ${docRef.path}: ${err.message}`);
    return null;
  }
}

async function snapshotRoleConfigs() {
  console.log("  Scanning role-specific configs...");

  const configs = {};

  // GroupAdmin config
  const gaConfig = await getDocSafe(db.doc("group_admin_config/current"));
  configs.groupAdmin = gaConfig
    ? {
        clientDiscountAmount: gaConfig.clientDiscountAmount,
        commissionClientAmountLawyer: gaConfig.commissionClientAmountLawyer,
        commissionClientAmountExpat: gaConfig.commissionClientAmountExpat,
        commissionN1CallAmount: gaConfig.commissionN1CallAmount,
        commissionN2CallAmount: gaConfig.commissionN2CallAmount,
        commissionActivationBonusAmount: gaConfig.commissionActivationBonusAmount,
        commissionN1RecruitBonusAmount: gaConfig.commissionN1RecruitBonusAmount,
        validationHoldPeriodDays: gaConfig.validationHoldPeriodDays,
        minimumWithdrawalAmount: gaConfig.minimumWithdrawalAmount,
      }
    : null;
  console.log(`    → group_admin_config: ${gaConfig ? "found" : "NOT FOUND"}`);

  // Influencer config
  const infConfig = await getDocSafe(db.doc("influencer_config/current"));
  configs.influencer = infConfig
    ? {
        clientDiscountPercent: infConfig.clientDiscountPercent,
        commissionClientAmount: infConfig.commissionClientAmount,
        commissionClientAmountLawyer: infConfig.commissionClientAmountLawyer,
        commissionClientAmountExpat: infConfig.commissionClientAmountExpat,
        commissionRecruitmentAmount: infConfig.commissionRecruitmentAmount,
        validationHoldPeriodDays: infConfig.validationHoldPeriodDays,
        minimumWithdrawalAmount: infConfig.minimumWithdrawalAmount,
      }
    : null;
  console.log(`    → influencer_config: ${infConfig ? "found" : "NOT FOUND"}`);

  // Chatter config
  const chatConfig = await getDocSafe(db.doc("chatter_config/current"));
  configs.chatter = chatConfig
    ? {
        commissionClientCallAmount: chatConfig.commissionClientCallAmount,
        commissionClientCallAmountLawyer: chatConfig.commissionClientCallAmountLawyer,
        commissionClientCallAmountExpat: chatConfig.commissionClientCallAmountExpat,
        commissionN1CallAmount: chatConfig.commissionN1CallAmount,
        commissionN2CallAmount: chatConfig.commissionN2CallAmount,
        commissionActivationBonusAmount: chatConfig.commissionActivationBonusAmount,
        commissionN1RecruitBonusAmount: chatConfig.commissionN1RecruitBonusAmount,
        commissionProviderCallAmount: chatConfig.commissionProviderCallAmount,
        captainCallAmountLawyer: chatConfig.captainCallAmountLawyer,
        captainCallAmountExpat: chatConfig.captainCallAmountExpat,
        validationHoldPeriodDays: chatConfig.validationHoldPeriodDays,
        minimumWithdrawalAmount: chatConfig.minimumWithdrawalAmount,
      }
    : null;
  console.log(`    → chatter_config: ${chatConfig ? "found" : "NOT FOUND"}`);

  // Blogger config
  const blogConfig = await getDocSafe(db.doc("blogger_config/current"));
  configs.blogger = blogConfig
    ? {
        clientDiscountPercent: blogConfig.clientDiscountPercent,
        commissionClientAmount: blogConfig.commissionClientAmount,
        commissionClientAmountLawyer: blogConfig.commissionClientAmountLawyer,
        commissionClientAmountExpat: blogConfig.commissionClientAmountExpat,
        commissionRecruitmentAmount: blogConfig.commissionRecruitmentAmount,
        validationHoldPeriodDays: blogConfig.validationHoldPeriodDays,
        minimumWithdrawalAmount: blogConfig.minimumWithdrawalAmount,
      }
    : null;
  console.log(`    → blogger_config: ${blogConfig ? "found" : "NOT FOUND"}`);

  // Affiliate config (generic)
  const affConfig = await getDocSafe(db.doc("affiliate_config/current"));
  configs.affiliate = affConfig
    ? {
        isSystemActive: affConfig.isSystemActive,
        withdrawalsEnabled: affConfig.withdrawalsEnabled,
        newAffiliatesEnabled: affConfig.newAffiliatesEnabled,
        defaultRates: affConfig.defaultRates,
        commissionRules: affConfig.commissionRules,
        withdrawal: affConfig.withdrawal,
        antiFraud: affConfig.antiFraud,
      }
    : null;
  console.log(`    → affiliate_config: ${affConfig ? "found" : "NOT FOUND"}`);

  // Fee config
  const feeConfig = await getDocSafe(db.doc("admin_config/fees"));
  configs.fees = feeConfig
    ? {
        withdrawalFees: feeConfig.withdrawalFees,
      }
    : null;
  console.log(`    → admin_config/fees: ${feeConfig ? "found" : "NOT FOUND"}`);

  return configs;
}

async function snapshotPartnerDiscounts() {
  console.log("\n  Scanning partner discount configs...");
  const snap = await db.collection("partners").get();
  const partners = [];

  snap.forEach((doc) => {
    const data = doc.data();
    if (data.discountConfig) {
      partners.push({
        partnerId: doc.id,
        email: data.email || "",
        status: data.status || "unknown",
        affiliateCode: data.affiliateCode || null,
        discountConfig: data.discountConfig,
      });
    }
  });

  console.log(`    → ${partners.length} partners with discount config (of ${snap.size} total)`);
  return partners;
}

async function snapshotCommissionPlans() {
  console.log("\n  Scanning commission_plans...");
  const snap = await db.collection("commission_plans").get();
  const plans = [];

  snap.forEach((doc) => {
    const data = doc.data();
    plans.push({
      id: doc.id,
      name: data.name || "",
      isActive: data.isActive || false,
      priority: data.priority || 0,
      startDate: data.startDate ? data.startDate.toDate?.()?.toISOString() : null,
      endDate: data.endDate ? data.endDate.toDate?.()?.toISOString() : null,
      chatterRates: data.chatterRates || null,
      influencerRates: data.influencerRates || null,
      bloggerRates: data.bloggerRates || null,
      groupAdminRates: data.groupAdminRates || null,
      affiliateRates: data.affiliateRates || null,
      createdBy: data.createdBy || null,
    });
  });

  console.log(`    → ${plans.length} commission plans`);
  return plans;
}

async function snapshotActiveCoupons() {
  console.log("\n  Scanning active coupons...");
  const snap = await db.collection("coupons").where("active", "==", true).get();
  const coupons = [];

  snap.forEach((doc) => {
    const data = doc.data();
    coupons.push({
      id: doc.id,
      code: data.code || doc.id,
      type: data.type || "unknown",
      amount: data.amount || 0,
      maxDiscount: data.maxDiscount || null,
      services: data.services || [],
      maxUsesTotal: data.max_uses_total || data.maxUsesTotal || null,
      maxUsesPerUser: data.max_uses_per_user || data.maxUsesPerUser || null,
      validFrom: data.valid_from ? data.valid_from.toDate?.()?.toISOString() : null,
      validUntil: data.valid_until ? data.valid_until.toDate?.()?.toISOString() : null,
    });
  });

  console.log(`    → ${coupons.length} active coupons`);
  return coupons;
}

async function snapshotTelegramBonuses() {
  console.log("\n  Scanning chatter_telegram_bonus...");
  let total = 0;
  let earned = 0;
  let locked = 0;
  let unlocked = 0;

  try {
    const snap = await db.collection("chatter_telegram_bonus").get();
    snap.forEach((doc) => {
      const data = doc.data();
      total++;
      if (data.status === "earned" || data.status === "locked") locked++;
      if (data.status === "unlocked") unlocked++;
      earned++;
    });
  } catch {
    console.log("    → Collection not found or empty");
  }

  console.log(`    → ${total} telegram bonuses (${locked} locked, ${unlocked} unlocked)`);
  return { total, locked, unlocked };
}

async function main() {
  console.log("=== PHASE 0: Snapshot Discount & Commission Config ===\n");
  const startTime = Date.now();

  const roleConfigs = await snapshotRoleConfigs();
  const partnerDiscounts = await snapshotPartnerDiscounts();
  const commissionPlans = await snapshotCommissionPlans();
  const activeCoupons = await snapshotActiveCoupons();
  const telegramBonuses = await snapshotTelegramBonuses();

  const output = {
    snapshotDate: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    summary: {
      discountSources: {
        groupAdmin: roleConfigs.groupAdmin
          ? `$${(roleConfigs.groupAdmin.clientDiscountAmount || 0) / 100} fixed`
          : "no config",
        influencer: roleConfigs.influencer
          ? `${roleConfigs.influencer.clientDiscountPercent || 0}%`
          : "no config",
        partnersWithDiscount: partnerDiscounts.length,
        activeCoupons: activeCoupons.length,
      },
      commissionPlans: commissionPlans.length,
      telegramBonuses: telegramBonuses.total,
    },
    roleConfigs,
    partnerDiscounts,
    commissionPlans,
    activeCoupons,
    telegramBonuses,
  };

  const snapshotsDir = path.join(__dirname, "snapshots");
  if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outPath = path.join(snapshotsDir, `snapshot_discounts_${dateStr}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n=== DONE ===`);
  console.log(`  Output: ${outPath}`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

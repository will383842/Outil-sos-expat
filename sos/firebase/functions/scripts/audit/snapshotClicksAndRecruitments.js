/**
 * Phase 0 — Snapshot des clics affiliés + recruited providers
 *
 * Exporte tous les clics sur liens affiliés et les recrutements de providers.
 * NOTE: influencer uses "influencer_referrals" (different naming convention).
 *
 * Usage: node scripts/audit/snapshotClicksAndRecruitments.js
 * Output: scripts/audit/snapshots/snapshot_clicks_YYYYMMDD.json
 *         scripts/audit/snapshots/snapshot_recruited_providers_YYYYMMDD.json
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
}
const db = admin.firestore();

const CLICK_COLLECTIONS = [
  "chatter_affiliate_clicks",
  "influencer_affiliate_clicks",
  "blogger_affiliate_clicks",
  "group_admin_clicks", // Different naming!
];

const RECRUITED_PROVIDERS_COLLECTIONS = [
  { name: "chatter_recruited_providers", roleField: "chatterId", role: "chatter" },
  { name: "influencer_referrals", roleField: "influencerId", role: "influencer" }, // Different name!
  { name: "blogger_recruited_providers", roleField: "bloggerId", role: "blogger" },
  { name: "group_admin_recruited_providers", roleField: "groupAdminId", role: "groupAdmin" },
];

const RECRUITED_AFFILIATES_COLLECTIONS = [
  { name: "chatter_recruited_chatters", role: "chatter" },
  { name: "blogger_recruited_bloggers", role: "blogger" },
  { name: "group_admin_recruited_admins", role: "groupAdmin" },
];

async function snapshotClicks() {
  const results = {};

  for (const collName of CLICK_COLLECTIONS) {
    console.log(`  Scanning ${collName}...`);
    const snap = await db.collection(collName).get();

    const byType = {};
    let converted = 0;
    let total = 0;

    snap.forEach((doc) => {
      const data = doc.data();
      total++;
      const linkType = data.linkType || data.clickType || "unknown";
      if (!byType[linkType]) byType[linkType] = { count: 0, converted: 0 };
      byType[linkType].count++;
      if (data.converted) {
        byType[linkType].converted++;
        converted++;
      }
    });

    results[collName] = { total, converted, conversionRate: total > 0 ? Number((converted / total * 100).toFixed(1)) : 0, byType };
    console.log(`    → ${total} clicks, ${converted} converted (${results[collName].conversionRate}%)`);
  }

  return results;
}

async function snapshotRecruitedProviders() {
  const results = {};

  for (const { name, roleField, role } of RECRUITED_PROVIDERS_COLLECTIONS) {
    console.log(`  Scanning ${name}...`);
    const snap = await db.collection(name).get();

    let active = 0;
    let expired = 0;
    let totalCommissions = 0;
    const entries = [];

    snap.forEach((doc) => {
      const data = doc.data();
      const windowEnd = data.commissionWindowEndsAt || data.commissionWindowEnd;
      const isExpired = windowEnd && windowEnd.toDate ? windowEnd.toDate() < new Date() : false;

      if (data.isActive && !isExpired) {
        active++;
      } else {
        expired++;
      }

      totalCommissions += data.callsWithCommission || data.totalCommissions || 0;

      entries.push({
        id: doc.id,
        recruiterId: data[roleField] || data.recruiterId || null,
        providerId: data.providerId || null,
        providerType: data.providerType || null,
        isActive: !!data.isActive,
        isExpired,
        callsWithCommission: data.callsWithCommission || 0,
        recruitedAt: data.recruitedAt ? data.recruitedAt.toDate?.()?.toISOString() : null,
        windowEnd: windowEnd ? windowEnd.toDate?.()?.toISOString() : null,
      });
    });

    results[name] = {
      total: snap.size,
      active,
      expired,
      totalCommissions,
      entries,
    };
    console.log(`    → ${snap.size} docs (${active} active, ${expired} expired)`);
  }

  return results;
}

async function snapshotRecruitedAffiliates() {
  const results = {};

  for (const { name, role } of RECRUITED_AFFILIATES_COLLECTIONS) {
    console.log(`  Scanning ${name}...`);
    const snap = await db.collection(name).get();

    const entries = [];
    snap.forEach((doc) => {
      const data = doc.data();
      entries.push({
        id: doc.id,
        recruiterId: data.recruiterId || null,
        recruitedId: data.recruitedId || null,
        commissionPaid: data.commissionPaid || false,
        recruitedAt: data.recruitedAt ? data.recruitedAt.toDate?.()?.toISOString() : null,
      });
    });

    results[name] = { total: snap.size, entries };
    console.log(`    → ${snap.size} recruited ${role}s`);
  }

  return results;
}

async function main() {
  console.log("=== PHASE 0: Snapshot Clicks & Recruitments ===\n");
  const startTime = Date.now();

  console.log("--- Affiliate Clicks ---");
  const clicks = await snapshotClicks();

  console.log("\n--- Recruited Providers ---");
  const recruitedProviders = await snapshotRecruitedProviders();

  console.log("\n--- Recruited Affiliates ---");
  const recruitedAffiliates = await snapshotRecruitedAffiliates();

  const snapshotsDir = path.join(__dirname, "snapshots");
  if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  // Clicks output
  const clicksOutput = {
    snapshotDate: new Date().toISOString(),
    summary: {
      totalClicks: Object.values(clicks).reduce((sum, c) => sum + c.total, 0),
      totalConverted: Object.values(clicks).reduce((sum, c) => sum + c.converted, 0),
    },
    collections: clicks,
  };
  const clicksPath = path.join(snapshotsDir, `snapshot_clicks_${dateStr}.json`);
  fs.writeFileSync(clicksPath, JSON.stringify(clicksOutput, null, 2), "utf-8");

  // Recruited providers output
  const rpOutput = {
    snapshotDate: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    summary: {
      totalRecruitedProviders: Object.values(recruitedProviders).reduce((sum, r) => sum + r.total, 0),
      activeRecruitedProviders: Object.values(recruitedProviders).reduce((sum, r) => sum + r.active, 0),
      totalRecruitedAffiliates: Object.values(recruitedAffiliates).reduce((sum, r) => sum + r.total, 0),
      byCollection: {
        ...Object.fromEntries(Object.entries(recruitedProviders).map(([k, v]) => [k, v.total])),
        ...Object.fromEntries(Object.entries(recruitedAffiliates).map(([k, v]) => [k, v.total])),
      },
    },
    recruitedProviders,
    recruitedAffiliates,
  };
  const rpPath = path.join(snapshotsDir, `snapshot_recruited_providers_${dateStr}.json`);
  fs.writeFileSync(rpPath, JSON.stringify(rpOutput, null, 2), "utf-8");

  console.log(`\n=== DONE ===`);
  console.log(`  Clicks: ${clicksPath}`);
  console.log(`  Recruited providers: ${rpPath}`);
  console.log(`  Duration: ${Date.now() - startTime}ms`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

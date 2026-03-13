/**
 * Phase 0 — Snapshot des commissions existantes
 *
 * Exporte toutes les commissions de toutes les collections vers un fichier JSON.
 * Calcule les totaux par statut, par type, et par affilié.
 *
 * Usage: node scripts/audit/snapshotCommissions.js
 * Output: scripts/audit/snapshots/snapshot_commissions_YYYYMMDD.json
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
}
const db = admin.firestore();

const COMMISSION_COLLECTIONS = [
  { name: "chatter_commissions", ownerField: "chatterId", roleLabel: "chatter" },
  { name: "chatter_referral_commissions", ownerField: "chatterId", roleLabel: "chatter_legacy" },
  { name: "influencer_commissions", ownerField: "influencerId", roleLabel: "influencer" },
  { name: "blogger_commissions", ownerField: "bloggerId", roleLabel: "blogger" },
  { name: "group_admin_commissions", ownerField: "groupAdminId", roleLabel: "groupAdmin" },
  { name: "affiliate_commissions", ownerField: "referrerId", roleLabel: "affiliate" },
  { name: "partner_commissions", ownerField: "partnerId", roleLabel: "partner" },
];

async function snapshotCollection(collectionDef) {
  const { name, ownerField, roleLabel } = collectionDef;
  console.log(`  Scanning ${name}...`);

  const snapshot = await db.collection(name).get();
  const byStatus = {};
  const byType = {};
  const byOwner = {};
  let totalAmount = 0;
  let count = 0;

  snapshot.forEach((doc) => {
    const data = doc.data();
    count++;

    const status = data.status || "unknown";
    const type = data.type || data.actionType || "unknown";
    const amount = data.amount || data.commissionAmount || 0;
    const ownerId = data[ownerField] || data.userId || "unknown";

    // By status
    if (!byStatus[status]) byStatus[status] = { count: 0, totalAmount: 0 };
    byStatus[status].count++;
    byStatus[status].totalAmount += amount;

    // By type
    if (!byType[type]) byType[type] = { count: 0, totalAmount: 0 };
    byType[type].count++;
    byType[type].totalAmount += amount;

    // By owner (aggregate)
    if (!byOwner[ownerId]) {
      byOwner[ownerId] = { count: 0, totalAmount: 0, types: {} };
    }
    byOwner[ownerId].count++;
    byOwner[ownerId].totalAmount += amount;
    if (!byOwner[ownerId].types[type]) byOwner[ownerId].types[type] = 0;
    byOwner[ownerId].types[type]++;

    totalAmount += amount;
  });

  console.log(`    → ${count} documents, total: $${(totalAmount / 100).toFixed(2)}`);

  return {
    collection: name,
    roleLabel,
    ownerField,
    count,
    totalAmountCents: totalAmount,
    totalAmountDollars: Number((totalAmount / 100).toFixed(2)),
    byStatus,
    byType,
    uniqueOwners: Object.keys(byOwner).length,
    topOwners: Object.entries(byOwner)
      .sort((a, b) => b[1].totalAmount - a[1].totalAmount)
      .slice(0, 20)
      .map(([id, data]) => ({ userId: id, ...data })),
  };
}

async function snapshotAffiliateProfiles() {
  console.log("\n  Scanning affiliate profiles...");

  const roleDocs = [
    { collection: "chatters", role: "chatter" },
    { collection: "influencers", role: "influencer" },
    { collection: "bloggers", role: "blogger" },
    { collection: "group_admins", role: "groupAdmin" },
  ];

  const profiles = [];

  for (const { collection, role } of roleDocs) {
    const snap = await db.collection(collection).get();
    snap.forEach((doc) => {
      const d = doc.data();
      profiles.push({
        userId: doc.id,
        role,
        email: d.email || "",
        totalEarned: d.totalEarned || 0,
        availableBalance: d.availableBalance || 0,
        pendingBalance: d.pendingBalance || 0,
        validatedBalance: d.validatedBalance || 0,
        totalCommissions: d.totalCommissions || 0,
        totalClients: d.totalClients || 0,
        totalRecruits: d.totalRecruits || 0,
        hasLockedRates: !!d.lockedRates,
        commissionPlanId: d.commissionPlanId || null,
        monthlyTopMultiplier: d.monthlyTopMultiplier || null,
        status: d.status || "unknown",
      });
    });
    console.log(`    → ${collection}: ${snap.size} profiles`);
  }

  // Also scan partners
  const partnerSnap = await db.collection("partners").get();
  partnerSnap.forEach((doc) => {
    const d = doc.data();
    profiles.push({
      userId: doc.id,
      role: "partner",
      email: d.email || "",
      totalEarned: d.totalEarned || 0,
      availableBalance: d.availableBalance || 0,
      pendingBalance: d.pendingBalance || 0,
      status: d.status || "unknown",
    });
  });
  console.log(`    → partners: ${partnerSnap.size} profiles`);

  // Also scan generic affiliates in users collection
  const affiliateSnap = await db
    .collection("users")
    .where("affiliateCode", "!=", null)
    .get();
  let genericCount = 0;
  affiliateSnap.forEach((doc) => {
    const d = doc.data();
    // Skip if already captured as a specific role
    if (
      d.role === "chatter" ||
      d.role === "influencer" ||
      d.role === "blogger" ||
      d.role === "groupAdmin"
    ) {
      return;
    }
    genericCount++;
    profiles.push({
      userId: doc.id,
      role: d.role || "client",
      email: d.email || "",
      totalEarned: d.totalEarned || d.affiliateStats?.totalEarned || 0,
      availableBalance: d.availableBalance || d.affiliateStats?.availableBalance || 0,
      hasLockedRates: !!d.lockedRates,
      commissionPlanId: d.commissionPlanId || null,
      status: "active",
    });
  });
  console.log(`    → generic affiliates (users with affiliateCode): ${genericCount}`);

  return profiles;
}

async function main() {
  console.log("=== PHASE 0: Snapshot Commissions ===\n");
  const startTime = Date.now();

  const results = [];
  for (const collDef of COMMISSION_COLLECTIONS) {
    const result = await snapshotCollection(collDef);
    results.push(result);
  }

  const profiles = await snapshotAffiliateProfiles();

  // Global totals
  const globalTotals = {
    totalCommissions: results.reduce((sum, r) => sum + r.count, 0),
    totalAmountCents: results.reduce((sum, r) => sum + r.totalAmountCents, 0),
    totalAmountDollars: Number(
      (results.reduce((sum, r) => sum + r.totalAmountCents, 0) / 100).toFixed(2)
    ),
    totalUniqueOwners: results.reduce((sum, r) => sum + r.uniqueOwners, 0),
    totalAffiliateProfiles: profiles.length,
    byCollection: results.map((r) => ({
      collection: r.collection,
      count: r.count,
      totalDollars: r.totalAmountDollars,
    })),
  };

  const output = {
    snapshotDate: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    globalTotals,
    collections: results,
    affiliateProfiles: {
      count: profiles.length,
      byRole: profiles.reduce((acc, p) => {
        if (!acc[p.role]) acc[p.role] = 0;
        acc[p.role]++;
        return acc;
      }, {}),
      profiles,
    },
  };

  // Write output
  const snapshotsDir = path.join(__dirname, "snapshots");
  if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outPath = path.join(snapshotsDir, `snapshot_commissions_${dateStr}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n=== DONE ===`);
  console.log(`  Total commissions: ${globalTotals.totalCommissions}`);
  console.log(`  Total amount: $${globalTotals.totalAmountDollars}`);
  console.log(`  Affiliate profiles: ${profiles.length}`);
  console.log(`  Output: ${outPath}`);
  console.log(`  Duration: ${Date.now() - startTime}ms`);
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

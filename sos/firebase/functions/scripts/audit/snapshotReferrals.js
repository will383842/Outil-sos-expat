/**
 * Phase 0 — Snapshot des referrals
 *
 * Exporte tous les liens de parrainage (qui a référé qui)
 * et vérifie l'intégrité (self-referrals, orphelins, circulaires).
 *
 * Usage: node scripts/audit/snapshotReferrals.js
 * Output: scripts/audit/snapshots/snapshot_referrals_YYYYMMDD.json
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
}
const db = admin.firestore();

// All referral fields that can exist on a user doc
const REFERRAL_FIELDS = [
  "referredBy",
  "referredByUserId",
  "referredByChatterId",
  "chatterReferredBy",
  "referredByInfluencerId",
  "influencerReferredBy",
  "referredByBlogger",
  "bloggerReferredBy",
  "referredByGroupAdmin",
  "groupAdminReferredBy",
  "partnerReferredBy",
  "partnerReferredById",
  "providerRecruitedByChatter",
  "providerRecruitedByChatterId",
  "providerRecruitedByBlogger",
  "providerRecruitedByBloggerId",
  "providerRecruitedByGroupAdmin",
  "providerRecruitedByGroupAdminId",
  "recruitedByInfluencer",
  "influencerCode",
  "recruitedBy",
  "recruitedByCode",
  "pendingReferralCode",
];

async function scanUsersReferrals() {
  console.log("  Scanning users collection for referral fields...");
  const snap = await db.collection("users").get();
  const entries = [];

  snap.forEach((doc) => {
    const data = doc.data();
    const refs = {};
    let hasRef = false;

    for (const field of REFERRAL_FIELDS) {
      if (data[field] !== undefined && data[field] !== null && data[field] !== "") {
        refs[field] = data[field];
        hasRef = true;
      }
    }

    if (hasRef) {
      entries.push({
        userId: doc.id,
        role: data.role || "unknown",
        email: data.email || "",
        ...refs,
      });
    }
  });

  console.log(`    → ${entries.length} users with referral data (of ${snap.size} total)`);
  return { entries, totalUsers: snap.size };
}

async function scanRoleReferrals(collectionName, role) {
  console.log(`  Scanning ${collectionName} for recruitment data...`);
  const snap = await db.collection(collectionName).get();
  const entries = [];

  snap.forEach((doc) => {
    const data = doc.data();
    if (data.recruitedBy || data.recruitedByCode || data.referredBy) {
      entries.push({
        userId: doc.id,
        role,
        recruitedBy: data.recruitedBy || null,
        recruitedByCode: data.recruitedByCode || null,
        recruiterCommissionPaid: data.recruiterCommissionPaid || false,
        parrainNiveau2Id: data.parrainNiveau2Id || null,
      });
    }
  });

  console.log(`    → ${entries.length} referred ${role}s`);
  return entries;
}

async function scanReferralsCollection() {
  console.log("  Scanning referrals collection (generic)...");
  const snap = await db.collection("referrals").get();
  const entries = [];

  snap.forEach((doc) => {
    const data = doc.data();
    entries.push({
      id: doc.id,
      referrerId: data.referrerId || null,
      refereeId: data.refereeId || data.referredUserId || null,
      status: data.status || "unknown",
      firstActionAt: data.firstActionAt ? data.firstActionAt.toDate?.()?.toISOString() : null,
      createdAt: data.createdAt ? data.createdAt.toDate?.()?.toISOString() : null,
    });
  });

  console.log(`    → ${entries.length} referral documents`);
  return entries;
}

function checkIntegrity(userReferrals, allUserIds) {
  const issues = [];

  for (const entry of userReferrals) {
    // Self-referral check
    const referrerIds = [
      entry.referredByUserId,
      entry.referredByChatterId,
      entry.referredByInfluencerId,
      entry.partnerReferredById,
      entry.providerRecruitedByChatterId,
      entry.providerRecruitedByBloggerId,
      entry.providerRecruitedByGroupAdminId,
    ].filter(Boolean);

    for (const refId of referrerIds) {
      if (refId === entry.userId) {
        issues.push({
          severity: "CRITICAL",
          type: "self_referral",
          userId: entry.userId,
          referrerId: refId,
          role: entry.role,
        });
      }
    }

    // Orphan check (referrer doesn't exist)
    for (const refId of referrerIds) {
      if (refId && !allUserIds.has(refId)) {
        issues.push({
          severity: "WARNING",
          type: "orphan_referral",
          userId: entry.userId,
          referrerId: refId,
          role: entry.role,
          reason: "Referrer user ID not found in users collection",
        });
      }
    }
  }

  // Simple circular check (A→B→A, limited depth)
  const referralMap = {};
  for (const entry of userReferrals) {
    const refId = entry.referredByUserId || entry.referredByChatterId || entry.recruitedBy;
    if (refId) {
      referralMap[entry.userId] = refId;
    }
  }

  for (const [userId, referrerId] of Object.entries(referralMap)) {
    const visited = new Set([userId]);
    let current = referrerId;
    let depth = 0;
    while (current && depth < 10) {
      if (visited.has(current)) {
        issues.push({
          severity: "CRITICAL",
          type: "circular_referral",
          userId,
          chain: [...visited, current],
          depth,
        });
        break;
      }
      visited.add(current);
      current = referralMap[current];
      depth++;
    }
  }

  return issues;
}

async function main() {
  console.log("=== PHASE 0: Snapshot Referrals ===\n");
  const startTime = Date.now();

  // Get all user IDs for orphan check
  console.log("  Building user ID index...");
  const allUsersSnap = await db.collection("users").select().get();
  const allUserIds = new Set();
  allUsersSnap.forEach((doc) => allUserIds.add(doc.id));
  console.log(`    → ${allUserIds.size} user IDs indexed`);

  // Scan
  const { entries: userReferrals, totalUsers } = await scanUsersReferrals();
  const chatterReferrals = await scanRoleReferrals("chatters", "chatter");
  const influencerReferrals = await scanRoleReferrals("influencers", "influencer");
  const bloggerReferrals = await scanRoleReferrals("bloggers", "blogger");
  const groupAdminReferrals = await scanRoleReferrals("group_admins", "groupAdmin");
  const genericReferrals = await scanReferralsCollection();

  // Integrity checks
  console.log("\n  Running integrity checks...");
  const issues = checkIntegrity(userReferrals, allUserIds);
  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;
  console.log(`    → ${criticalCount} CRITICAL, ${warningCount} warnings`);

  const output = {
    snapshotDate: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    summary: {
      totalUsers,
      usersWithReferrals: userReferrals.length,
      referredChatters: chatterReferrals.length,
      referredInfluencers: influencerReferrals.length,
      referredBloggers: bloggerReferrals.length,
      referredGroupAdmins: groupAdminReferrals.length,
      genericReferralDocs: genericReferrals.length,
      criticalIssues: criticalCount,
      warnings: warningCount,
    },
    issues,
    userReferrals,
    roleReferrals: {
      chatters: chatterReferrals,
      influencers: influencerReferrals,
      bloggers: bloggerReferrals,
      groupAdmins: groupAdminReferrals,
    },
    genericReferrals,
  };

  const snapshotsDir = path.join(__dirname, "snapshots");
  if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outPath = path.join(snapshotsDir, `snapshot_referrals_${dateStr}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n=== DONE ===`);
  console.log(`  Output: ${outPath}`);
  if (criticalCount > 0) {
    console.log(`  ⚠️  ${criticalCount} CRITICAL issue(s) — review output!`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

/**
 * Phase 0 — Snapshot des codes affiliés
 *
 * Exporte tous les codes affiliés et vérifie les collisions.
 *
 * Usage: node scripts/audit/snapshotAffiliateCodes.js
 * Output: scripts/audit/snapshots/snapshot_codes_YYYYMMDD.json
 */

const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

if (!admin.apps.length) {
  admin.initializeApp({ projectId: "sos-urgently-ac307" });
}
const db = admin.firestore();

const CODE_FIELDS = [
  "affiliateCode",
  "affiliateCodeClient",
  "affiliateCodeRecruitment",
  "affiliateCodeProvider",
];

async function scanCollection(collectionName, idLabel) {
  console.log(`  Scanning ${collectionName}...`);
  const snap = await db.collection(collectionName).get();
  const entries = [];

  snap.forEach((doc) => {
    const data = doc.data();
    const codes = {};
    let hasCodes = false;

    for (const field of CODE_FIELDS) {
      if (data[field]) {
        codes[field] = data[field];
        hasCodes = true;
      }
    }

    if (hasCodes) {
      entries.push({
        userId: doc.id,
        collection: collectionName,
        role: data.role || idLabel,
        email: data.email || "",
        status: data.status || "unknown",
        ...codes,
      });
    }
  });

  console.log(`    → ${entries.length} entries with codes (of ${snap.size} docs)`);
  return entries;
}

async function scanPartners() {
  console.log("  Scanning partners...");
  const snap = await db.collection("partners").get();
  const entries = [];

  snap.forEach((doc) => {
    const data = doc.data();
    if (data.affiliateCode) {
      entries.push({
        userId: doc.id,
        collection: "partners",
        role: "partner",
        email: data.email || "",
        status: data.status || "unknown",
        affiliateCode: data.affiliateCode,
      });
    }
  });

  console.log(`    → ${entries.length} partners with codes`);
  return entries;
}

async function scanReservedCodes() {
  console.log("  Scanning affiliate_codes (reserved)...");
  const snap = await db.collection("affiliate_codes").get();
  const entries = [];

  snap.forEach((doc) => {
    const data = doc.data();
    entries.push({
      code: doc.id,
      isReserved: data.isReserved || false,
      assignedToUserId: data.assignedToUserId || null,
      reservedBy: data.reservedBy || null,
    });
  });

  console.log(`    → ${entries.length} reserved/tracked codes`);
  return entries;
}

function checkCollisions(allEntries) {
  const codeMap = {}; // code -> [{ userId, field, collection }]
  const issues = [];

  for (const entry of allEntries) {
    for (const field of CODE_FIELDS) {
      const code = entry[field];
      if (!code) continue;

      const upper = code.toUpperCase();
      if (!codeMap[upper]) codeMap[upper] = [];
      codeMap[upper].push({
        userId: entry.userId,
        field,
        collection: entry.collection,
        role: entry.role,
      });
    }
  }

  // Find duplicates (same code, different users)
  for (const [code, owners] of Object.entries(codeMap)) {
    const uniqueUsers = [...new Set(owners.map((o) => o.userId))];
    if (uniqueUsers.length > 1) {
      issues.push({
        severity: "CRITICAL",
        type: "collision",
        code,
        owners: owners.map((o) => ({
          userId: o.userId,
          field: o.field,
          collection: o.collection,
        })),
      });
    }
  }

  // Find active affiliates without codes
  for (const entry of allEntries) {
    const hasSomeCode = CODE_FIELDS.some((f) => entry[f]);
    if (!hasSomeCode && entry.status === "active") {
      issues.push({
        severity: "WARNING",
        type: "missing_code",
        userId: entry.userId,
        collection: entry.collection,
        role: entry.role,
      });
    }
  }

  // Validate code format
  for (const entry of allEntries) {
    for (const field of CODE_FIELDS) {
      const code = entry[field];
      if (!code) continue;
      if (typeof code !== "string" || code.length < 3 || code.length > 30) {
        issues.push({
          severity: "WARNING",
          type: "invalid_format",
          userId: entry.userId,
          field,
          code,
          reason: `Length ${code.length} outside 3-30 range`,
        });
      }
    }
  }

  return { totalUniqueCodes: Object.keys(codeMap).length, issues };
}

async function main() {
  console.log("=== PHASE 0: Snapshot Affiliate Codes ===\n");
  const startTime = Date.now();

  const allEntries = [];

  // Scan role-specific collections
  const chatters = await scanCollection("chatters", "chatter");
  const influencers = await scanCollection("influencers", "influencer");
  const bloggers = await scanCollection("bloggers", "blogger");
  const groupAdmins = await scanCollection("group_admins", "groupAdmin");
  const users = await scanCollection("users", "generic");
  const partners = await scanPartners();
  const reserved = await scanReservedCodes();

  allEntries.push(...chatters, ...influencers, ...bloggers, ...groupAdmins, ...users, ...partners);

  // Collision check
  console.log("\n  Running collision checks...");
  const { totalUniqueCodes, issues } = checkCollisions(allEntries);

  const criticalCount = issues.filter((i) => i.severity === "CRITICAL").length;
  const warningCount = issues.filter((i) => i.severity === "WARNING").length;
  console.log(`    → ${totalUniqueCodes} unique codes`);
  console.log(`    → ${criticalCount} CRITICAL issues, ${warningCount} warnings`);

  const output = {
    snapshotDate: new Date().toISOString(),
    durationMs: Date.now() - startTime,
    summary: {
      totalEntries: allEntries.length,
      totalUniqueCodes,
      criticalIssues: criticalCount,
      warnings: warningCount,
      byCollection: {
        chatters: chatters.length,
        influencers: influencers.length,
        bloggers: bloggers.length,
        group_admins: groupAdmins.length,
        users_generic: users.length,
        partners: partners.length,
        reserved_codes: reserved.length,
      },
    },
    issues,
    reservedCodes: reserved,
    entries: allEntries,
  };

  const snapshotsDir = path.join(__dirname, "snapshots");
  if (!fs.existsSync(snapshotsDir)) fs.mkdirSync(snapshotsDir, { recursive: true });

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const outPath = path.join(snapshotsDir, `snapshot_codes_${dateStr}.json`);
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");

  console.log(`\n=== DONE ===`);
  console.log(`  Output: ${outPath}`);
  if (criticalCount > 0) {
    console.log(`  ⚠️  ${criticalCount} CRITICAL collision(s) found — review output!`);
  }
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});

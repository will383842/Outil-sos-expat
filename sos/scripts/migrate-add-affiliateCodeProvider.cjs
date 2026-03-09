/**
 * Migration script: Add affiliateCodeProvider to existing affiliates
 *
 * Generates `affiliateCodeProvider` for all affiliates who have a client code
 * but no provider code yet, across all 5 affiliate collections.
 *
 * Code formats:
 *   - chatters:     PROV-{affiliateCodeClient}       (e.g., PROV-JEAN456)
 *   - influencers:  PROV-INF-{affiliateCodeClient}   (e.g., PROV-INF-MARIE123)
 *   - bloggers:     PROV-BLOG-{suffix}               (e.g., PROV-BLOG-JEAN1A2B3C)
 *   - group_admins: PROV-GROUP-{suffix}              (e.g., PROV-GROUP-JEAN1A2B3C)
 *   - partners:     PROV-{affiliateCode}             (e.g., PROV-ACME)
 *
 * Also updates the corresponding users/{id} document.
 *
 * Usage:
 *   node scripts/migrate-add-affiliateCodeProvider.cjs             # Dry-run (no writes)
 *   node scripts/migrate-add-affiliateCodeProvider.cjs --execute   # Actually write to Firestore
 *
 * Prerequisites:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to your service account key path
 *   - Or run from an environment with default Firebase credentials
 */

const admin = require("firebase-admin");

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();

const DRY_RUN = !process.argv.includes("--execute");
const BATCH_LIMIT = 500;

/**
 * Collection configs: how to derive affiliateCodeProvider for each type
 */
const COLLECTIONS = [
  {
    name: "chatters",
    clientCodeField: "affiliateCodeClient",
    generateProviderCode: (clientCode) => `PROV-${clientCode}`,
  },
  {
    name: "influencers",
    clientCodeField: "affiliateCodeClient",
    generateProviderCode: (clientCode) => `PROV-INF-${clientCode}`,
  },
  {
    name: "bloggers",
    clientCodeField: "affiliateCodeClient",
    // Client code is BLOG-XXXX, provider code is PROV-BLOG-XXXX (reuse suffix)
    generateProviderCode: (clientCode) => `PROV-BLOG-${clientCode.replace(/^BLOG-/, "")}`,
  },
  {
    name: "group_admins",
    clientCodeField: "affiliateCodeClient",
    // Client code is GROUP-XXXX, provider code is PROV-GROUP-XXXX (reuse suffix)
    generateProviderCode: (clientCode) => `PROV-GROUP-${clientCode.replace(/^GROUP-/, "")}`,
  },
  {
    name: "partners",
    clientCodeField: "affiliateCode", // Partners use a single affiliateCode
    generateProviderCode: (affiliateCode) => `PROV-${affiliateCode}`,
  },
];

async function migrate() {
  console.log("=".repeat(60));
  console.log(`  Migration: Add affiliateCodeProvider`);
  console.log(`  Mode: ${DRY_RUN ? "DRY-RUN (no writes)" : "EXECUTE (writing to Firestore)"}`);
  console.log("=".repeat(60));
  console.log();

  if (DRY_RUN) {
    console.log("  Tip: Pass --execute to actually write changes.\n");
  }

  const summary = {
    totalScanned: 0,
    totalUpdated: 0,
    totalSkipped: 0,
    totalErrors: 0,
    byCollection: {},
  };

  for (const config of COLLECTIONS) {
    console.log(`\n--- Processing collection: ${config.name} ---`);

    const collectionStats = { scanned: 0, updated: 0, skipped: 0, errors: 0 };
    summary.byCollection[config.name] = collectionStats;

    const snapshot = await db.collection(config.name).get();
    collectionStats.scanned = snapshot.size;
    summary.totalScanned += snapshot.size;

    console.log(`  Found ${snapshot.size} documents`);

    // Collect documents that need updating
    const toUpdate = [];

    for (const doc of snapshot.docs) {
      const data = doc.data();
      const clientCode = data[config.clientCodeField];

      // Skip if no client code
      if (!clientCode) {
        collectionStats.skipped++;
        summary.totalSkipped++;
        continue;
      }

      // Skip if already has affiliateCodeProvider
      if (data.affiliateCodeProvider) {
        collectionStats.skipped++;
        summary.totalSkipped++;
        continue;
      }

      const providerCode = config.generateProviderCode(clientCode);
      toUpdate.push({ docId: doc.id, providerCode, clientCode });
    }

    console.log(`  ${toUpdate.length} documents need affiliateCodeProvider`);
    console.log(`  ${collectionStats.skipped} documents skipped (already have it or no client code)`);

    if (toUpdate.length === 0) continue;

    // Process in batches of BATCH_LIMIT
    for (let i = 0; i < toUpdate.length; i += BATCH_LIMIT) {
      const batchItems = toUpdate.slice(i, i + BATCH_LIMIT);
      const batchNum = Math.floor(i / BATCH_LIMIT) + 1;
      const totalBatches = Math.ceil(toUpdate.length / BATCH_LIMIT);

      console.log(`  Batch ${batchNum}/${totalBatches} (${batchItems.length} docs)...`);

      if (!DRY_RUN) {
        const batch = db.batch();

        for (const item of batchItems) {
          const updateData = {
            affiliateCodeProvider: item.providerCode,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          // Update the affiliate collection document
          const affiliateRef = db.collection(config.name).doc(item.docId);
          batch.update(affiliateRef, updateData);

          // Also update the corresponding users/{id} document
          const userRef = db.collection("users").doc(item.docId);
          batch.update(userRef, updateData);
        }

        try {
          await batch.commit();
          collectionStats.updated += batchItems.length;
          summary.totalUpdated += batchItems.length;
          console.log(`    Committed ${batchItems.length} updates (affiliate + users docs)`);
        } catch (err) {
          console.error(`    Error committing batch: ${err.message}`);
          collectionStats.errors += batchItems.length;
          summary.totalErrors += batchItems.length;
        }
      } else {
        // Dry-run: just log what would happen
        for (const item of batchItems) {
          console.log(`    [DRY-RUN] ${config.name}/${item.docId}: ${item.clientCode} -> ${item.providerCode}`);
        }
        collectionStats.updated += batchItems.length;
        summary.totalUpdated += batchItems.length;
      }
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log(`  Migration ${DRY_RUN ? "(DRY-RUN)" : ""} Summary`);
  console.log("=".repeat(60));
  console.log(`  Total scanned:  ${summary.totalScanned}`);
  console.log(`  Total updated:  ${summary.totalUpdated}${DRY_RUN ? " (would update)" : ""}`);
  console.log(`  Total skipped:  ${summary.totalSkipped}`);
  console.log(`  Total errors:   ${summary.totalErrors}`);
  console.log();
  for (const [name, stats] of Object.entries(summary.byCollection)) {
    console.log(`  ${name}: ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors (of ${stats.scanned})`);
  }
  console.log("=".repeat(60));
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });

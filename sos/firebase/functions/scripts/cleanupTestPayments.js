/**
 * Cleanup: Delete all orphaned "authorized" payments (test data)
 * These are legacy test payments from July 2025 that were never captured/voided.
 * Stripe has already expired them (7-day auto-expiry).
 */
const admin = require("firebase-admin");

const app = admin.initializeApp({ projectId: "sos-urgently-ac307" });
const db = admin.firestore();

async function main() {
  console.log("\n========== CLEANUP: Delete Orphaned Test Payments ==========\n");

  const snap = await db.collection("payments")
    .where("status", "in", ["authorized", "requires_capture"])
    .get();

  console.log(`Found ${snap.size} payments with status authorized/requires_capture\n`);

  if (snap.size === 0) {
    console.log("Nothing to delete.");
    process.exit(0);
  }

  // Delete in batches of 500
  const BATCH_SIZE = 400;
  let deleted = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    console.log(`  🗑️  Deleting ${doc.id} (status=${data.status}, created=${data.createdAt?.toDate?.()?.toISOString() || 'unknown'})`);
    batch.delete(doc.ref);
    batchCount++;
    deleted++;

    if (batchCount >= BATCH_SIZE) {
      await batch.commit();
      console.log(`  → Batch committed (${deleted} total)`);
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  console.log(`\n✅ Done: ${deleted} test payments deleted.\n`);
  process.exit(0);
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});

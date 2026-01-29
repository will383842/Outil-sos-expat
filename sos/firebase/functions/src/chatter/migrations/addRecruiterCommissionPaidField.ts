/**
 * Migration: Add recruiterCommissionPaid field
 *
 * Adds the `recruiterCommissionPaid` boolean field to all existing chatter documents.
 * This field tracks whether the recruiter commission has been paid for this chatter's first client.
 *
 * IMPORTANT: Run this migration ONCE before deploying the updated onCallCompleted trigger.
 *
 * Usage:
 *   ts-node src/chatter/migrations/addRecruiterCommissionPaidField.ts
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

interface Chatter {
  id: string;
  recruitedBy: string | null;
  totalClients: number;
  recruiterCommissionPaid?: boolean;
}

async function addRecruiterCommissionPaidField() {
  console.log("Starting migration: addRecruiterCommissionPaidField");
  console.log("=========================================");

  try {
    // Get all chatters
    const chattersSnapshot = await db.collection("chatters").get();
    console.log(`Found ${chattersSnapshot.size} chatters to process`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    let batch = db.batch();
    let operationsInBatch = 0;

    for (const doc of chattersSnapshot.docs) {
      const chatter = doc.data() as Chatter;

      // Skip if field already exists
      if (chatter.recruiterCommissionPaid !== undefined) {
        skipped++;
        continue;
      }

      // Determine the value based on existing data:
      // - If the chatter has no recruiter, set to false (not applicable)
      // - If the chatter has a recruiter AND has 1 or more clients, assume commission was already paid
      // - If the chatter has a recruiter but no clients yet, set to false (not paid yet)
      let shouldBePaid = false;
      if (chatter.recruitedBy && chatter.totalClients >= 1) {
        // Chatter has a recruiter and already has clients
        // We assume the commission was already triggered (or should have been)
        shouldBePaid = true;
      }

      // Add the field
      batch.update(doc.ref, {
        recruiterCommissionPaid: shouldBePaid,
        updatedAt: FieldValue.serverTimestamp(),
      });

      updated++;
      operationsInBatch++;

      // Commit batch if it reaches the limit
      if (operationsInBatch >= batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${operationsInBatch} updates`);
        batch = db.batch();
        operationsInBatch = 0;
      }
    }

    // Commit remaining operations
    if (operationsInBatch > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${operationsInBatch} updates`);
    }

    console.log("\n=========================================");
    console.log("Migration completed successfully!");
    console.log(`- Updated: ${updated}`);
    console.log(`- Skipped (already migrated): ${skipped}`);
    console.log(`- Errors: ${errors}`);
    console.log("=========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
addRecruiterCommissionPaidField();

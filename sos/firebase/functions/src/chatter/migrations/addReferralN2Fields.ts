/**
 * Migration: Add Referral N2 Fields
 *
 * Adds the new 2-level referral system fields to all existing chatter documents:
 * - parrainNiveau2Id: string | null (parrain's parrain)
 * - isEarlyAdopter: boolean
 * - earlyAdopterCountry: string | null
 * - earlyAdopterDate: Timestamp | null
 * - qualifiedReferralsCount: number (filleuls N1 at 50$+)
 * - referralsN2Count: number (filleuls N2)
 * - referralEarnings: number (separate from totalEarned)
 * - referralToClientRatio: number
 * - threshold10Reached: boolean
 * - threshold50Reached: boolean
 * - tierBonusesPaid: number[]
 *
 * Also creates the chatter_early_adopter_counters collection for tracking
 * early adopter slots per country.
 *
 * IMPORTANT: Run this migration ONCE before deploying the referral system.
 *
 * Usage:
 *   ts-node src/chatter/migrations/addReferralN2Fields.ts
 */

import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp();
}

const db = getFirestore();

// Supported countries for early adopter counters - GLOBAL (109 countries)

// AFRICA (35 countries)
const AFRICA_COUNTRIES = [
  "SN", "CI", "CM", "ML", "BF", "TG", "BJ", "NE", "GN", "GA",
  "CG", "CD", "MG", "MU", "MA", "TN", "DZ", "NG", "GH", "KE",
  "ZA", "TZ", "UG", "ZW", "ZM", "RW", "MW", "BW", "NA", "GM",
  "SL", "LR", "ET", "EG", "AO",
];

// EUROPE (25 countries)
const EUROPE_COUNTRIES = [
  "FR", "GB", "DE", "ES", "IT", "PT", "NL", "BE", "CH", "AT",
  "PL", "RO", "SE", "NO", "DK", "FI", "IE", "GR", "CZ", "HU",
  "UA", "RU", "TR", "RS", "HR",
];

// AMERICAS (20 countries)
const AMERICAS_COUNTRIES = [
  "US", "CA", "MX", "BR", "AR", "CO", "CL", "PE", "VE", "EC",
  "GT", "CU", "DO", "HT", "BO", "PY", "UY", "PA", "CR", "JM",
];

// ASIA (25 countries)
const ASIA_COUNTRIES = [
  "CN", "JP", "KR", "IN", "ID", "TH", "VN", "PH", "MY", "SG",
  "PK", "BD", "AE", "SA", "IL", "LB", "JO", "IQ", "IR", "KZ",
  "UZ", "NP", "LK", "MM", "KH",
];

// OCEANIA (5 countries)
const OCEANIA_COUNTRIES = [
  "AU", "NZ", "FJ", "PG", "NC",
];

// Combined list - 110 countries total
const SUPPORTED_COUNTRIES = [
  ...AFRICA_COUNTRIES,
  ...EUROPE_COUNTRIES,
  ...AMERICAS_COUNTRIES,
  ...ASIA_COUNTRIES,
  ...OCEANIA_COUNTRIES,
];

// Early adopter quota per country (50 first pioneers per country)
const EARLY_ADOPTER_QUOTA_PER_COUNTRY = 50;

// Threshold in cents ($50 = 5000 cents)
const QUALIFIED_THRESHOLD = 5000;

interface ExistingChatter {
  id: string;
  recruitedBy: string | null;
  totalEarned: number;
  referralEarnings?: number;
  country?: string;
  parrainNiveau2Id?: string;
  isEarlyAdopter?: boolean;
  threshold10Reached?: boolean;
  threshold50Reached?: boolean;
}

async function addReferralN2Fields() {
  console.log("Starting migration: addReferralN2Fields");
  console.log("=========================================");

  try {
    // Step 1: Get all chatters
    const chattersSnapshot = await db.collection("chatters").get();
    console.log(`Found ${chattersSnapshot.size} chatters to process`);

    // Build a map of chatter IDs to their recruitedBy for N2 calculation
    const chatterMap = new Map<string, ExistingChatter>();
    for (const doc of chattersSnapshot.docs) {
      const chatter = doc.data() as ExistingChatter;
      chatter.id = doc.id;
      chatterMap.set(doc.id, chatter);
    }

    let updated = 0;
    let skipped = 0;

    // Process in batches of 500 (Firestore batch limit)
    const batchSize = 500;
    let batch = db.batch();
    let operationsInBatch = 0;

    for (const doc of chattersSnapshot.docs) {
      const chatter = doc.data() as ExistingChatter;

      // Skip if fields already exist (migration already ran)
      if (chatter.parrainNiveau2Id !== undefined && chatter.isEarlyAdopter !== undefined) {
        skipped++;
        continue;
      }

      // Calculate parrainNiveau2Id
      let parrainNiveau2Id: string | null = null;
      if (chatter.recruitedBy) {
        const parrain = chatterMap.get(chatter.recruitedBy);
        if (parrain && parrain.recruitedBy) {
          parrainNiveau2Id = parrain.recruitedBy;
        }
      }

      // Determine if threshold was already reached (based on existing earnings)
      // We use totalEarned - referralEarnings to get client earnings only
      const existingReferralEarnings = chatter.referralEarnings || 0;
      const clientEarnings = (chatter.totalEarned || 0) - existingReferralEarnings;
      const threshold10Reached = clientEarnings >= 1000; // $10
      const threshold50Reached = clientEarnings >= QUALIFIED_THRESHOLD; // $50

      // Prepare update data
      const updateData: Record<string, unknown> = {
        // N2 referral chain
        parrainNiveau2Id: parrainNiveau2Id,

        // Early adopter fields (will be set by system, default to false)
        isEarlyAdopter: chatter.isEarlyAdopter ?? false,
        earlyAdopterCountry: null,
        earlyAdopterDate: null,

        // Stats
        qualifiedReferralsCount: 0, // Will be calculated by the system
        referralsN2Count: 0, // Will be calculated by the system
        referralEarnings: existingReferralEarnings,
        referralToClientRatio: 0,

        // Threshold tracking
        threshold10Reached: threshold10Reached,
        threshold50Reached: threshold50Reached,
        tierBonusesPaid: [],

        updatedAt: FieldValue.serverTimestamp(),
      };

      batch.update(doc.ref, updateData);
      updated++;
      operationsInBatch++;

      if (operationsInBatch >= batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${operationsInBatch} chatter updates`);
        batch = db.batch();
        operationsInBatch = 0;
      }
    }

    // Commit remaining chatter updates
    if (operationsInBatch > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${operationsInBatch} chatter updates`);
    }

    // Step 2: Calculate qualifiedReferralsCount and referralsN2Count for each chatter
    console.log("\nCalculating referral counts...");

    const qualifiedCountMap = new Map<string, number>();
    const n2CountMap = new Map<string, number>();

    for (const [, chatter] of chatterMap) {
      // Check if this chatter is qualified ($50+)
      const clientEarnings = (chatter.totalEarned || 0) - (chatter.referralEarnings || 0);
      const isQualified = clientEarnings >= QUALIFIED_THRESHOLD;

      // Increment parrain's qualifiedReferralsCount
      if (chatter.recruitedBy && isQualified) {
        qualifiedCountMap.set(
          chatter.recruitedBy,
          (qualifiedCountMap.get(chatter.recruitedBy) || 0) + 1
        );
      }

      // Calculate N2 parrain and increment their referralsN2Count
      if (chatter.recruitedBy) {
        const parrain = chatterMap.get(chatter.recruitedBy);
        if (parrain?.recruitedBy) {
          n2CountMap.set(
            parrain.recruitedBy,
            (n2CountMap.get(parrain.recruitedBy) || 0) + 1
          );
        }
      }
    }

    // Update the counts
    batch = db.batch();
    operationsInBatch = 0;
    let countsUpdated = 0;

    for (const [chatterId, qualifiedCount] of qualifiedCountMap) {
      const n2Count = n2CountMap.get(chatterId) || 0;
      const chatterRef = db.collection("chatters").doc(chatterId);

      batch.update(chatterRef, {
        qualifiedReferralsCount: qualifiedCount,
        referralsN2Count: n2Count,
        updatedAt: FieldValue.serverTimestamp(),
      });

      countsUpdated++;
      operationsInBatch++;

      if (operationsInBatch >= batchSize) {
        await batch.commit();
        console.log(`Committed batch of ${operationsInBatch} count updates`);
        batch = db.batch();
        operationsInBatch = 0;
      }
    }

    // Also update chatters that only have N2 count (not in qualifiedCountMap)
    for (const [chatterId, n2Count] of n2CountMap) {
      if (!qualifiedCountMap.has(chatterId)) {
        const chatterRef = db.collection("chatters").doc(chatterId);

        batch.update(chatterRef, {
          referralsN2Count: n2Count,
          updatedAt: FieldValue.serverTimestamp(),
        });

        countsUpdated++;
        operationsInBatch++;

        if (operationsInBatch >= batchSize) {
          await batch.commit();
          console.log(`Committed batch of ${operationsInBatch} N2 count updates`);
          batch = db.batch();
          operationsInBatch = 0;
        }
      }
    }

    if (operationsInBatch > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${operationsInBatch} count updates`);
    }

    // Step 3: Create early adopter counters for all supported countries
    console.log("\nCreating early adopter counters...");

    batch = db.batch();
    operationsInBatch = 0;

    for (const countryCode of SUPPORTED_COUNTRIES) {
      const counterRef = db.collection("chatter_early_adopter_counters").doc(countryCode);
      const existingCounter = await counterRef.get();

      if (!existingCounter.exists) {
        batch.set(counterRef, {
          countryCode: countryCode,
          currentCount: 0,
          quota: EARLY_ADOPTER_QUOTA_PER_COUNTRY,
          isFull: false,
          pioneers: [],
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        operationsInBatch++;
        console.log(`Created counter for ${countryCode}`);

        if (operationsInBatch >= batchSize) {
          await batch.commit();
          batch = db.batch();
          operationsInBatch = 0;
        }
      } else {
        console.log(`Counter for ${countryCode} already exists, skipping`);
      }
    }

    if (operationsInBatch > 0) {
      await batch.commit();
    }

    console.log("\n=========================================");
    console.log("Migration completed successfully!");
    console.log(`- Chatters updated: ${updated}`);
    console.log(`- Chatters skipped (already migrated): ${skipped}`);
    console.log(`- Referral counts updated: ${countsUpdated}`);
    console.log(`- Early adopter counters created: ${SUPPORTED_COUNTRIES.length}`);
    console.log("=========================================\n");

    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

// Run the migration
addReferralN2Fields();

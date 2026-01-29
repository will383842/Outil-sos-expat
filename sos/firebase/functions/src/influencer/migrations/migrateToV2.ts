/**
 * Migration Script: Influencer System V2
 *
 * This script migrates the influencer system to V2:
 * 1. Updates InfluencerConfig with new commission rules
 * 2. Adds capturedRates to all existing influencers
 * 3. Initializes anti-fraud config
 * 4. Initializes rate history
 *
 * Run this script ONCE before deploying V2 to production.
 *
 * Usage:
 * - Import and call migrateToV2() from a Cloud Function
 * - Or run via Firebase admin SDK
 */

import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import {
  InfluencerConfig,
  InfluencerCommissionRule,
  InfluencerCapturedRates,
  DEFAULT_COMMISSION_RULES,
  DEFAULT_ANTI_FRAUD_CONFIG,
} from "../types";

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Main migration function
 */
export async function migrateToV2(): Promise<{
  success: boolean;
  configUpdated: boolean;
  influencersMigrated: number;
  errors: string[];
}> {
  const db = admin.firestore();
  const errors: string[] = [];
  let configUpdated = false;
  let influencersMigrated = 0;

  console.log("[migrateToV2] Starting migration...");

  try {
    // ========================================================================
    // STEP 1: Update InfluencerConfig
    // ========================================================================
    console.log("[migrateToV2] Step 1: Updating config...");

    const configRef = db.collection("influencer_config").doc("current");
    const configDoc = await configRef.get();

    if (!configDoc.exists) {
      // Create new config with V2 defaults
      const newConfig: InfluencerConfig = {
        id: "current",
        isSystemActive: true,
        newRegistrationsEnabled: true,
        withdrawalsEnabled: true,
        trainingEnabled: true,
        commissionClientAmount: 1000,
        commissionRecruitmentAmount: 500,
        clientDiscountPercent: 5,
        recruitmentWindowMonths: 6,
        minimumWithdrawalAmount: 5000,
        validationHoldPeriodDays: 7,
        releaseDelayHours: 24,
        attributionWindowDays: 30,
        leaderboardSize: 10,
        // V2 fields
        commissionRules: DEFAULT_COMMISSION_RULES,
        antiFraud: DEFAULT_ANTI_FRAUD_CONFIG,
        defaultHoldPeriodDays: 7,
        defaultReleaseDelayHours: 24,
        rateHistory: [],
        version: 2,
        updatedAt: Timestamp.now(),
        updatedBy: "migration_v2",
      };

      await configRef.set(newConfig);
      configUpdated = true;
      console.log("[migrateToV2] Created new config with V2 defaults");
    } else {
      // Update existing config
      const currentConfig = configDoc.data() as InfluencerConfig;

      // Only update if not already V2
      if (!currentConfig.commissionRules || currentConfig.commissionRules.length === 0) {
        // Convert existing fixed amounts to commission rules
        const commissionRules: InfluencerCommissionRule[] = [
          {
            id: "client_referral",
            type: "client_referral",
            enabled: true,
            calculationType: "fixed",
            fixedAmount: currentConfig.commissionClientAmount || 1000,
            percentageRate: 0,
            conditions: {},
            holdPeriodDays: currentConfig.validationHoldPeriodDays || 7,
            releaseDelayHours: currentConfig.releaseDelayHours || 24,
            description: "Commission par client référé",
          },
          {
            id: "recruitment",
            type: "recruitment",
            enabled: true,
            calculationType: "fixed",
            fixedAmount: currentConfig.commissionRecruitmentAmount || 500,
            percentageRate: 0,
            conditions: {},
            holdPeriodDays: currentConfig.validationHoldPeriodDays || 7,
            releaseDelayHours: currentConfig.releaseDelayHours || 24,
            description: "Commission par appel de prestataire recruté",
          },
          // Add other rules as disabled
          ...DEFAULT_COMMISSION_RULES.filter(
            (r) => !["client_referral", "recruitment"].includes(r.type)
          ),
        ];

        await configRef.update({
          commissionRules,
          antiFraud: DEFAULT_ANTI_FRAUD_CONFIG,
          defaultHoldPeriodDays: currentConfig.validationHoldPeriodDays || 7,
          defaultReleaseDelayHours: currentConfig.releaseDelayHours || 24,
          rateHistory: [],
          version: (currentConfig.version || 1) + 1,
          updatedAt: Timestamp.now(),
          updatedBy: "migration_v2",
        });

        configUpdated = true;
        console.log("[migrateToV2] Updated existing config with V2 fields");
      } else {
        console.log("[migrateToV2] Config already has V2 fields, skipping");
      }
    }

    // ========================================================================
    // STEP 2: Update all existing influencers with capturedRates
    // ========================================================================
    console.log("[migrateToV2] Step 2: Updating influencers...");

    // Get the updated config for capturedRates
    const updatedConfigDoc = await configRef.get();
    const config = updatedConfigDoc.data() as InfluencerConfig;

    // Get all influencers
    const influencersSnapshot = await db.collection("influencers").get();
    console.log(`[migrateToV2] Found ${influencersSnapshot.size} influencers to process`);

    // Process in batches of 500 (Firestore limit)
    const batchSize = 500;
    let batch = db.batch();
    let batchCount = 0;

    for (const doc of influencersSnapshot.docs) {
      const influencer = doc.data();

      // Skip if already has capturedRates
      if (influencer.capturedRates && influencer.capturedRates.rules) {
        console.log(`[migrateToV2] Influencer ${doc.id} already has capturedRates, skipping`);
        continue;
      }

      // Create capturedRates based on current config
      const capturedRates: InfluencerCapturedRates = {
        capturedAt: influencer.createdAt || Timestamp.now(),
        version: 1,
        rules: {
          client_referral: {
            calculationType: "fixed",
            fixedAmount: config.commissionClientAmount || 1000,
            percentageRate: 0,
            holdPeriodDays: config.validationHoldPeriodDays || 7,
            releaseDelayHours: config.releaseDelayHours || 24,
          },
          recruitment: {
            calculationType: "fixed",
            fixedAmount: config.commissionRecruitmentAmount || 500,
            percentageRate: 0,
            holdPeriodDays: config.validationHoldPeriodDays || 7,
            releaseDelayHours: config.releaseDelayHours || 24,
          },
        },
      };

      batch.update(doc.ref, {
        capturedRates,
        totalWithdrawn: influencer.totalWithdrawn || 0,
        updatedAt: Timestamp.now(),
      });

      batchCount++;
      influencersMigrated++;

      // Commit batch if it reaches the limit
      if (batchCount >= batchSize) {
        await batch.commit();
        console.log(`[migrateToV2] Committed batch of ${batchCount} influencers`);
        batch = db.batch();
        batchCount = 0;
      }
    }

    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`[migrateToV2] Committed final batch of ${batchCount} influencers`);
    }

    console.log("[migrateToV2] Migration completed successfully!");
    console.log(`[migrateToV2] Config updated: ${configUpdated}`);
    console.log(`[migrateToV2] Influencers migrated: ${influencersMigrated}`);

    return {
      success: true,
      configUpdated,
      influencersMigrated,
      errors,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[migrateToV2] Migration failed:", errorMessage);
    errors.push(errorMessage);

    return {
      success: false,
      configUpdated,
      influencersMigrated,
      errors,
    };
  }
}

/**
 * Verify migration was successful
 */
export async function verifyMigration(): Promise<{
  configValid: boolean;
  influencersWithRates: number;
  influencersWithoutRates: number;
  issues: string[];
}> {
  const db = admin.firestore();
  const issues: string[] = [];

  // Check config
  const configDoc = await db.collection("influencer_config").doc("current").get();
  const config = configDoc.data() as InfluencerConfig | undefined;

  const configValid = !!(
    config &&
    config.commissionRules &&
    config.commissionRules.length > 0 &&
    config.antiFraud
  );

  if (!configValid) {
    issues.push("Config missing V2 fields (commissionRules or antiFraud)");
  }

  // Check influencers
  const influencersSnapshot = await db.collection("influencers").get();
  let withRates = 0;
  let withoutRates = 0;

  for (const doc of influencersSnapshot.docs) {
    const influencer = doc.data();
    if (influencer.capturedRates && influencer.capturedRates.rules) {
      withRates++;
    } else {
      withoutRates++;
      if (withoutRates <= 10) {
        issues.push(`Influencer ${doc.id} missing capturedRates`);
      }
    }
  }

  if (withoutRates > 10) {
    issues.push(`...and ${withoutRates - 10} more influencers without capturedRates`);
  }

  return {
    configValid,
    influencersWithRates: withRates,
    influencersWithoutRates: withoutRates,
    issues,
  };
}

/**
 * Rollback migration (removes V2 fields but keeps data safe)
 * Use with caution - only for testing/development
 */
export async function rollbackMigration(): Promise<{
  success: boolean;
  message: string;
}> {
  console.warn("[rollbackMigration] WARNING: This removes V2 fields from config");
  console.warn("[rollbackMigration] Influencer capturedRates will NOT be removed (safe)");

  const db = admin.firestore();

  try {
    const configRef = db.collection("influencer_config").doc("current");

    // Remove V2-specific fields from config
    await configRef.update({
      commissionRules: admin.firestore.FieldValue.delete(),
      antiFraud: admin.firestore.FieldValue.delete(),
      defaultHoldPeriodDays: admin.firestore.FieldValue.delete(),
      defaultReleaseDelayHours: admin.firestore.FieldValue.delete(),
      rateHistory: admin.firestore.FieldValue.delete(),
      version: 1,
      updatedAt: Timestamp.now(),
      updatedBy: "rollback_v2",
    });

    return {
      success: true,
      message: "V2 fields removed from config. Influencer capturedRates preserved.",
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

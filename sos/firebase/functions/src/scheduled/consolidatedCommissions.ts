/**
 * Consolidated Commission Processing
 *
 * Replaces 8 individual scheduled functions (8 Cloud Run services) with 2:
 * - consolidatedValidateCommissions: runs at H+00, validates all modules
 * - consolidatedReleaseCommissions: runs at H+30, releases all modules
 *
 * Each module runs independently with try/catch - failure in one
 * does NOT affect the others.
 *
 * Modules consolidated:
 * - Chatter: chatter_commissions
 * - Blogger: blogger_commissions
 * - Influencer: influencer_commissions
 * - GroupAdmin: group_admin_commissions
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// Import service functions from each module
import { validatePendingCommissions as chatterValidate } from "../chatter/services";
import { releaseValidatedCommissions as chatterRelease } from "../chatter/services";
import { validatePendingBloggerCommissions as bloggerValidate } from "../blogger/services/bloggerCommissionService";
import { releaseValidatedBloggerCommissions as bloggerRelease } from "../blogger/services/bloggerCommissionService";
import {
  validatePendingCommissions as influencerValidate,
  releaseValidatedCommissions as influencerRelease,
} from "../influencer/services";
import {
  validatePendingCommissions as groupAdminValidate,
  releaseValidatedCommissions as groupAdminRelease,
} from "../groupAdmin/services/groupAdminCommissionService";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// VALIDATE ALL COMMISSIONS (replaces 4 individual scheduled functions)
// ============================================================================

export const consolidatedValidateCommissions = onSchedule(
  {
    schedule: "0 * * * *", // Every hour at minute 0
    region: "europe-west3",
    timeZone: "Europe/Paris",
    memory: "512MiB",
    cpu: 0.5,
    timeoutSeconds: 300,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    const results: Record<string, { validated?: number; errors?: number; status: string }> = {};
    logger.info("[consolidatedValidateCommissions] Starting validation for all modules");

    // 1. Chatter
    try {
      const result = await chatterValidate();
      results.chatter = { validated: result.validated, errors: result.errors, status: "ok" };
    } catch (error) {
      results.chatter = { status: "error" };
      logger.error("[consolidatedValidateCommissions] Chatter validation failed", { error });
    }

    // 2. Blogger
    try {
      const result = await bloggerValidate();
      results.blogger = { validated: result.validated, errors: result.errors, status: "ok" };
    } catch (error) {
      results.blogger = { status: "error" };
      logger.error("[consolidatedValidateCommissions] Blogger validation failed", { error });
    }

    // 3. Influencer
    try {
      const result = await influencerValidate();
      results.influencer = { validated: result.validated, errors: result.errors, status: "ok" };
    } catch (error) {
      results.influencer = { status: "error" };
      logger.error("[consolidatedValidateCommissions] Influencer validation failed", { error });
    }

    // 4. GroupAdmin
    try {
      const count = await groupAdminValidate();
      results.groupAdmin = { validated: count, status: "ok" };
    } catch (error) {
      results.groupAdmin = { status: "error" };
      logger.error("[consolidatedValidateCommissions] GroupAdmin validation failed", { error });
    }

    logger.info("[consolidatedValidateCommissions] All modules completed", { results });
  }
);

// ============================================================================
// RELEASE ALL COMMISSIONS (replaces 4 individual scheduled functions)
// ============================================================================

export const consolidatedReleaseCommissions = onSchedule(
  {
    schedule: "30 * * * *", // Every hour at minute 30
    region: "europe-west3",
    timeZone: "Europe/Paris",
    memory: "512MiB",
    cpu: 0.5,
    timeoutSeconds: 300,
    retryCount: 3,
  },
  async () => {
    ensureInitialized();

    const results: Record<string, { released?: number; errors?: number; status: string }> = {};
    logger.info("[consolidatedReleaseCommissions] Starting release for all modules");

    // 1. Chatter
    try {
      const result = await chatterRelease();
      results.chatter = { released: result.released, errors: result.errors, status: "ok" };
    } catch (error) {
      results.chatter = { status: "error" };
      logger.error("[consolidatedReleaseCommissions] Chatter release failed", { error });
    }

    // 2. Blogger
    try {
      const result = await bloggerRelease();
      results.blogger = { released: result.released, errors: result.errors, status: "ok" };
    } catch (error) {
      results.blogger = { status: "error" };
      logger.error("[consolidatedReleaseCommissions] Blogger release failed", { error });
    }

    // 3. Influencer
    try {
      const result = await influencerRelease();
      results.influencer = { released: result.released, errors: result.errors, status: "ok" };
    } catch (error) {
      results.influencer = { status: "error" };
      logger.error("[consolidatedReleaseCommissions] Influencer release failed", { error });
    }

    // 4. GroupAdmin
    try {
      const count = await groupAdminRelease();
      results.groupAdmin = { released: count, status: "ok" };
    } catch (error) {
      results.groupAdmin = { status: "error" };
      logger.error("[consolidatedReleaseCommissions] GroupAdmin release failed", { error });
    }

    logger.info("[consolidatedReleaseCommissions] All modules completed", { results });
  }
);

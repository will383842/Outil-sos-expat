/**
 * Consolidated onCallCompleted trigger
 *
 * Replaces 5 individual onDocumentUpdated triggers on "call_sessions/{sessionId}"
 * (5 Cloud Run services) with 1 single dispatcher that calls all 5 handlers.
 *
 * Each module's handler runs independently with try/catch isolation.
 * A failure in one handler does NOT affect the others.
 *
 * Modules consolidated:
 * - chatter    (chatterOnCallCompleted)     - 512MiB / 120s
 * - influencer (influencerOnCallCompleted)  - 256MiB / 60s
 * - blogger    (bloggerOnCallSessionCompleted) - default
 * - groupAdmin (onCallCompletedGroupAdmin)  - 256MiB / 60s
 * - affiliate  (affiliateOnCallCompleted)   - 256MiB / 60s
 *
 * Resource config uses the MAX of all individual triggers:
 * - memory: 512MiB (from chatter)
 * - timeout: 120s (from chatter)
 *
 * NOT consolidated (different trigger type / different collection):
 * - influencerOnProviderCallCompleted (uses onDocumentCreated, not onDocumentUpdated)
 * - telegramOnCallCompleted (separate notification system, different concerns)
 *
 * DEPLOYMENT:
 * 1. Deploy this consolidated trigger
 * 2. Comment out the 5 individual trigger exports in index.ts
 * 3. Delete the 5 old Cloud Run services via Firebase Console or CLI
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const consolidatedOnCallCompleted = onDocumentUpdated(
  {
    document: "call_sessions/{sessionId}",
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    ensureInitialized();

    const sessionId = event.params.sessionId;
    const results: Record<string, "ok" | "skipped" | string> = {};

    // Run all 5 handlers independently with try/catch isolation.
    // Dynamic imports keep cold-start overhead minimal: only the modules
    // relevant to a given call session will load their full dependency trees.

    // 1. Chatter handler
    try {
      const { handleCallCompleted: chatterHandler } = await import(
        "../chatter/triggers/onCallCompleted"
      );
      await chatterHandler(event);
      results.chatter = "ok";
    } catch (error) {
      results.chatter = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnCallCompleted] Chatter handler failed", {
        sessionId,
        error,
      });
    }

    // 2. Influencer handler
    try {
      const { handleCallCompleted: influencerHandler } = await import(
        "../influencer/triggers/onCallCompleted"
      );
      await influencerHandler(event);
      results.influencer = "ok";
    } catch (error) {
      results.influencer = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnCallCompleted] Influencer handler failed", {
        sessionId,
        error,
      });
    }

    // 3. Blogger handler
    try {
      const { handleCallCompleted: bloggerHandler } = await import(
        "../blogger/triggers/onCallCompleted"
      );
      await bloggerHandler(event);
      results.blogger = "ok";
    } catch (error) {
      results.blogger = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnCallCompleted] Blogger handler failed", {
        sessionId,
        error,
      });
    }

    // 4. GroupAdmin handler (client referral commissions)
    try {
      const { handleCallCompleted: groupAdminHandler } = await import(
        "../groupAdmin/triggers/onCallCompleted"
      );
      await groupAdminHandler(event);
      results.groupAdmin = "ok";
    } catch (error) {
      results.groupAdmin = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnCallCompleted] GroupAdmin handler failed", {
        sessionId,
        error,
      });
    }

    // 4b. GroupAdmin provider recruitment commissions
    try {
      const { handleProviderRecruitmentCommission } = await import(
        "../groupAdmin/triggers/onCallCompleted"
      );
      await handleProviderRecruitmentCommission(event);
      results.groupAdminProviderRecruit = "ok";
    } catch (error) {
      results.groupAdminProviderRecruit = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnCallCompleted] GroupAdmin provider recruitment handler failed", {
        sessionId,
        error,
      });
    }

    // 5. Affiliate handler
    try {
      const { handleCallCompleted: affiliateHandler } = await import(
        "../affiliate/triggers/onCallCompleted"
      );
      await affiliateHandler(event);
      results.affiliate = "ok";
    } catch (error) {
      results.affiliate = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnCallCompleted] Affiliate handler failed", {
        sessionId,
        error,
      });
    }

    logger.info("[consolidatedOnCallCompleted] All handlers completed", {
      sessionId,
      results,
    });
  }
);

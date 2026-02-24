/**
 * Consolidated onUserUpdated trigger
 *
 * Replaces 8 individual onDocumentUpdated triggers on "users/{userId}"
 * (8 Cloud Run services) with 1 single dispatcher that calls all 8 handlers.
 *
 * Each module's handler runs independently with try/catch isolation.
 * A failure in one handler does NOT affect the others.
 *
 * Modules consolidated:
 * - emailMktg  (profileCompletedHandler)        - default
 * - emailMktg  (userLoginHandler)               - default
 * - emailMktg  (providerOnlineStatusHandler)    - default
 * - emailMktg  (kycVerificationHandler)         - default
 * - emailMktg  (paypalConfigurationHandler)     - default
 * - syncClaims (handleSyncClaimsUpdated)        - default (CRITICAL for auth)
 * - syncEmail  (handleUserEmailUpdated)         - default
 * - syncAccess (handleUserAccessUpdated)        - default (uses secret)
 *
 * Resource config:
 * - memory: 512MiB (generous for 8 handlers)
 * - timeout: 120s (generous for sequential execution)
 *
 * DEPLOYMENT:
 * 1. Deploy this consolidated trigger
 * 2. Comment out the 8 individual trigger exports in index.ts
 * 3. Delete the 8 old Cloud Run services via Firebase Console or CLI
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// Secret import (needed for syncAccessToOutil handler)
import { OUTIL_SYNC_API_KEY } from "../lib/secrets";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const consolidatedOnUserUpdated = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "europe-west3",
    memory: "512MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
    secrets: [OUTIL_SYNC_API_KEY],
  },
  async (event) => {
    ensureInitialized();

    const userId = event.params.userId;
    const results: Record<string, "ok" | "skipped" | string> = {};

    // Run all 8 handlers independently with try/catch isolation.
    // Dynamic imports keep cold-start overhead minimal.

    // 1. Profile Completed (MailWizz update + welcome email stop)
    try {
      const { profileCompletedHandler } = await import(
        "../emailMarketing/functions/profileLifecycle"
      );
      await profileCompletedHandler(event);
      results.profileCompleted = "ok";
    } catch (error) {
      results.profileCompleted = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserUpdated] Profile completed handler failed", {
        userId,
        error,
      });
    }

    // 2. User Login (MailWizz last login update)
    try {
      const { userLoginHandler } = await import(
        "../emailMarketing/functions/profileLifecycle"
      );
      await userLoginHandler(event);
      results.userLogin = "ok";
    } catch (error) {
      results.userLogin = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserUpdated] User login handler failed", {
        userId,
        error,
      });
    }

    // 3. Provider Online Status (MailWizz online/offline update)
    try {
      const { providerOnlineStatusHandler } = await import(
        "../emailMarketing/functions/profileLifecycle"
      );
      await providerOnlineStatusHandler(event);
      results.onlineStatus = "ok";
    } catch (error) {
      results.onlineStatus = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserUpdated] Online status handler failed", {
        userId,
        error,
      });
    }

    // 4. KYC Verification (MailWizz KYC status update)
    try {
      const { kycVerificationHandler } = await import(
        "../emailMarketing/functions/profileLifecycle"
      );
      await kycVerificationHandler(event);
      results.kycVerification = "ok";
    } catch (error) {
      results.kycVerification = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserUpdated] KYC verification handler failed", {
        userId,
        error,
      });
    }

    // 5. PayPal Configuration (MailWizz PayPal status update)
    try {
      const { paypalConfigurationHandler } = await import(
        "../emailMarketing/functions/profileLifecycle"
      );
      await paypalConfigurationHandler(event);
      results.paypalConfig = "ok";
    } catch (error) {
      results.paypalConfig = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserUpdated] PayPal config handler failed", {
        userId,
        error,
      });
    }

    // 6. Sync Role Claims (CRITICAL - updates Firebase Custom Claims when role changes)
    try {
      const { handleSyncClaimsUpdated } = await import(
        "./syncRoleClaims"
      );
      await handleSyncClaimsUpdated(event);
      results.syncClaims = "ok";
    } catch (error) {
      results.syncClaims = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserUpdated] Sync claims handler failed", {
        userId,
        error,
      });
    }

    // 7. Sync User Email to sos_profiles (keeps email in sync for providers)
    try {
      const { handleUserEmailUpdated } = await import(
        "./syncUserEmailToSosProfiles"
      );
      await handleUserEmailUpdated(event);
      results.syncEmail = "ok";
    } catch (error) {
      results.syncEmail = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserUpdated] Sync email handler failed", {
        userId,
        error,
      });
    }

    // 8. Sync Access to Outil (syncs forcedAIAccess/freeTrialUntil to Outil-sos-expat)
    try {
      const { handleUserAccessUpdated } = await import(
        "./syncAccessToOutil"
      );
      await handleUserAccessUpdated(event);
      results.syncAccess = "ok";
    } catch (error) {
      results.syncAccess = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserUpdated] Sync access handler failed", {
        userId,
        error,
      });
    }

    // 9. Account Status (emails blocked/reactivated)
    try {
      const { accountStatusHandler } = await import(
        "../emailMarketing/functions/profileLifecycle"
      );
      await accountStatusHandler(event);
      results.accountStatus = "ok";
    } catch (error) {
      results.accountStatus = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserUpdated] Account status handler failed", {
        userId,
        error,
      });
    }

    logger.info("[consolidatedOnUserUpdated] All handlers completed", {
      userId,
      results,
    });
  }
);

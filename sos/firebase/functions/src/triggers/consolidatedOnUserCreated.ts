/**
 * Consolidated onUserCreated trigger
 *
 * Replaces 9 individual onDocumentCreated triggers on "users/{userId}"
 * (9 Cloud Run services) with 1 single dispatcher that calls all 9 handlers.
 *
 * Each module's handler runs independently with try/catch isolation.
 * A failure in one handler does NOT affect the others.
 *
 * Modules consolidated:
 * - affiliate    (handleAffiliateUserCreated)         - 256MiB / 60s
 * - chatter      (handleChatterProviderRegistered)    - 256MiB / 60s
 * - chatter      (handleChatterClientRegistered)      - 256MiB / 60s
 * - influencer   (handleInfluencerProviderRegistered) - 256MiB / 60s
 * - emailMktg    (handleEmailMarketingRegistration)   - default
 * - syncClaims   (handleSyncClaimsCreated)            - default
 * - googleAds    (handleGoogleAdsSignUp)              - default (uses secrets)
 * - metaCAPI     (handleCAPIRegistration)             - default (uses secrets)
 * - telegram     (handleTelegramUserRegistration)     - 256MiB / 60s (uses secrets)
 *
 * Resource config uses the MAX of all individual triggers:
 * - memory: 512MiB (generous for 9 handlers)
 * - timeout: 120s (generous for sequential execution)
 *
 * Secrets: all secrets from all handlers are declared here so they're
 * available as environment variables at runtime.
 *
 * NOT consolidated (different collection / different trigger type):
 * - influencerOnProviderCallCompleted (watches call_sessions, not users)
 * - onBloggerCreated (watches bloggers collection)
 * - onGroupAdminCreated (watches group_admins collection)
 * - chatterOnChatterCreated (watches chatters collection)
 * - influencerOnInfluencerCreated (watches influencers collection)
 *
 * DEPLOYMENT:
 * 1. Deploy this consolidated trigger
 * 2. Comment out the 9 individual trigger exports in index.ts
 * 3. Delete the 9 old Cloud Run services via Firebase Console or CLI
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

// Secret imports (needed for the secrets array in trigger config)
import { TELEGRAM_BOT_TOKEN } from "../lib/secrets";
import {
  GOOGLE_ADS_CUSTOMER_ID,
  GOOGLE_ADS_LEAD_CONVERSION_ID,
  GOOGLE_ADS_DEVELOPER_TOKEN,
  GOOGLE_ADS_REFRESH_TOKEN,
  GOOGLE_ADS_CLIENT_ID,
  GOOGLE_ADS_CLIENT_SECRET,
} from "../googleAdsConversionsApi";
import { META_CAPI_TOKEN } from "../metaConversionsApi";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const consolidatedOnUserCreated = onDocumentCreated(
  {
    document: "users/{userId}",
    region: "europe-west3",
    memory: "512MiB",
    timeoutSeconds: 120,
    secrets: [
      TELEGRAM_BOT_TOKEN,
      GOOGLE_ADS_CUSTOMER_ID,
      GOOGLE_ADS_LEAD_CONVERSION_ID,
      GOOGLE_ADS_DEVELOPER_TOKEN,
      GOOGLE_ADS_REFRESH_TOKEN,
      GOOGLE_ADS_CLIENT_ID,
      GOOGLE_ADS_CLIENT_SECRET,
      META_CAPI_TOKEN,
    ],
  },
  async (event) => {
    ensureInitialized();

    const userId = event.params.userId;
    const results: Record<string, "ok" | "skipped" | string> = {};

    // Run all 9 handlers independently with try/catch isolation.
    // Dynamic imports keep cold-start overhead minimal.

    // 1. Affiliate handler (generates affiliate code, resolves referrer, fraud detection)
    try {
      const { handleAffiliateUserCreated } = await import(
        "../affiliate/triggers/onUserCreated"
      );
      await handleAffiliateUserCreated(event);
      results.affiliate = "ok";
    } catch (error) {
      results.affiliate = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserCreated] Affiliate handler failed", {
        userId,
        error,
      });
    }

    // 2. Chatter - provider recruited (links provider to recruiting chatter)
    try {
      const { handleChatterProviderRegistered } = await import(
        "../chatter/triggers/onProviderRegistered"
      );
      await handleChatterProviderRegistered(event);
      results.chatterProvider = "ok";
    } catch (error) {
      results.chatterProvider = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserCreated] Chatter provider handler failed", {
        userId,
        error,
      });
    }

    // 3. Chatter - client referred (links client to referring chatter)
    try {
      const { handleChatterClientRegistered } = await import(
        "../chatter/triggers/onProviderRegistered"
      );
      await handleChatterClientRegistered(event);
      results.chatterClient = "ok";
    } catch (error) {
      results.chatterClient = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserCreated] Chatter client handler failed", {
        userId,
        error,
      });
    }

    // 4. Influencer - provider recruited (creates referral tracking)
    try {
      const { handleInfluencerProviderRegistered } = await import(
        "../influencer/triggers/onProviderRegistered"
      );
      await handleInfluencerProviderRegistered(event);
      results.influencer = "ok";
    } catch (error) {
      results.influencer = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserCreated] Influencer handler failed", {
        userId,
        error,
      });
    }

    // 5. Email Marketing - MailWizz subscriber + welcome email
    try {
      const { handleEmailMarketingRegistration } = await import(
        "../emailMarketing/functions/userLifecycle"
      );
      await handleEmailMarketingRegistration(event);
      results.emailMarketing = "ok";
    } catch (error) {
      results.emailMarketing = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserCreated] Email marketing handler failed", {
        userId,
        error,
      });
    }

    // 6. Sync Role Claims (CRITICAL - sets Firebase Custom Claims for auth)
    try {
      const { handleSyncClaimsCreated } = await import(
        "./syncRoleClaims"
      );
      await handleSyncClaimsCreated(event);
      results.syncClaims = "ok";
    } catch (error) {
      results.syncClaims = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserCreated] Sync claims handler failed", {
        userId,
        error,
      });
    }

    // 7. Google Ads SignUp tracking
    try {
      const { handleGoogleAdsSignUp } = await import(
        "./googleAdsTracking"
      );
      await handleGoogleAdsSignUp(event);
      results.googleAds = "ok";
    } catch (error) {
      results.googleAds = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserCreated] Google Ads handler failed", {
        userId,
        error,
      });
    }

    // 8. Meta CAPI Registration tracking
    try {
      const { handleCAPIRegistration } = await import(
        "./capiTracking"
      );
      await handleCAPIRegistration(event);
      results.metaCAPI = "ok";
    } catch (error) {
      results.metaCAPI = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserCreated] Meta CAPI handler failed", {
        userId,
        error,
      });
    }

    // 9. Telegram admin notification
    try {
      const { handleTelegramUserRegistration } = await import(
        "../telegram/triggers/onUserRegistration"
      );
      await handleTelegramUserRegistration(event);
      results.telegram = "ok";
    } catch (error) {
      results.telegram = `error: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("[consolidatedOnUserCreated] Telegram handler failed", {
        userId,
        error,
      });
    }

    logger.info("[consolidatedOnUserCreated] All handlers completed", {
      userId,
      results,
    });
  }
);

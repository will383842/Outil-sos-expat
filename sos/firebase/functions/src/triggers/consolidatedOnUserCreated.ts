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
 * - blogger      (handleBloggerProviderRegistered)    - 256MiB / 60s
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
import { TELEGRAM_BOT_TOKEN, TELEGRAM_ENGINE_URL_SECRET, TELEGRAM_ENGINE_API_KEY_SECRET } from "../lib/secrets";
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
    cpu: 0.5,
    timeoutSeconds: 120,
    secrets: [
      TELEGRAM_BOT_TOKEN,
      TELEGRAM_ENGINE_URL_SECRET,
      TELEGRAM_ENGINE_API_KEY_SECRET,
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

    // ✅ OPTIMISÉ: 3 vagues parallèles au lieu de 11 séquentiels (~5x plus rapide)
    // Chaque handler est isolé par try/catch pour éviter les cascades d'erreurs.

    // Helper pour exécuter un handler avec isolation d'erreur
    const safeRun = async (name: string, fn: () => Promise<void>) => {
      try {
        await fn();
        results[name] = "ok";
      } catch (error) {
        results[name] = `error: ${error instanceof Error ? error.message : String(error)}`;
        logger.error(`[consolidatedOnUserCreated] ${name} handler failed`, { userId, error });
      }
    };

    // VAGUE 1: Handlers critiques (Claims + Telegram + Affiliate) — tous indépendants
    await Promise.all([
      safeRun("telegram", async () => {
        const { handleTelegramUserRegistration } = await import("../telegram/triggers/onUserRegistration");
        await handleTelegramUserRegistration(event);
      }),
      safeRun("syncClaims", async () => {
        const { handleSyncClaimsCreated } = await import("./syncRoleClaims");
        await handleSyncClaimsCreated(event);
      }),
      safeRun("affiliate", async () => {
        const { handleAffiliateUserCreated } = await import("../affiliate/triggers/onUserCreated");
        await handleAffiliateUserCreated(event);
      }),
    ]);

    // VAGUE 2: Referral tracking handlers — tous indépendants entre eux
    await Promise.all([
      safeRun("chatterProvider", async () => {
        const { handleChatterProviderRegistered } = await import("../chatter/triggers/onProviderRegistered");
        await handleChatterProviderRegistered(event);
      }),
      safeRun("chatterClient", async () => {
        const { handleChatterClientRegistered } = await import("../chatter/triggers/onProviderRegistered");
        await handleChatterClientRegistered(event);
      }),
      safeRun("influencer", async () => {
        const { handleInfluencerProviderRegistered } = await import("../influencer/triggers/onProviderRegistered");
        await handleInfluencerProviderRegistered(event);
      }),
      safeRun("bloggerProvider", async () => {
        const { handleBloggerProviderRegistered } = await import("../blogger/triggers/onProviderRegistered");
        await handleBloggerProviderRegistered(event);
      }),
      safeRun("groupAdminProvider", async () => {
        const { handleGroupAdminProviderRegistered } = await import("../groupAdmin/triggers/onProviderRegistered");
        await handleGroupAdminProviderRegistered(event);
      }),
    ]);

    // VAGUE 3: Tracking externe (Email, Google Ads, Meta CAPI) — tous indépendants
    await Promise.all([
      safeRun("emailMarketing", async () => {
        const { handleEmailMarketingRegistration } = await import("../emailMarketing/functions/userLifecycle");
        await handleEmailMarketingRegistration(event);
      }),
      safeRun("googleAds", async () => {
        const { handleGoogleAdsSignUp } = await import("./googleAdsTracking");
        await handleGoogleAdsSignUp(event);
      }),
      safeRun("metaCAPI", async () => {
        const { handleCAPIRegistration } = await import("./capiTracking");
        await handleCAPIRegistration(event);
      }),
    ]);

    logger.info("[consolidatedOnUserCreated] All handlers completed", {
      userId,
      results,
    });
  }
);

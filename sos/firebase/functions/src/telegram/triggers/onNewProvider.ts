/**
 * Telegram Trigger: onNewProvider
 *
 * Triggered when a new profile document is created in the sos_profiles collection.
 * Sends a Telegram notification to admins when a provider (lawyer, expert, etc.) registers.
 *
 * Features:
 * - Filters by provider roles (excludes client)
 * - Formats date/time in Paris timezone
 * - Translates role to French for display
 * - Graceful error handling with logging
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { telegramNotificationService } from "../TelegramNotificationService";
import { ROLE_TRANSLATIONS_FR, UserRole } from "../types";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Provider roles that trigger a Telegram notification
 * These are roles that require admin validation/attention
 * Excludes 'client' as they don't need validation
 */
const PROVIDER_ROLES: string[] = [
  "lawyer",
  "expat",
  "expert",
  "chatter",
  "influencer",
  "blogger",
];

/**
 * Paris timezone for date/time formatting
 */
const PARIS_TIMEZONE = "Europe/Paris";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get Paris timezone date and time
 * @returns Object with formatted date (DD/MM/YYYY) and time (HH:MM)
 */
function getParisDateTime(): { date: string; time: string } {
  const now = new Date();

  const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return {
    date: dateFormatter.format(now),
    time: timeFormatter.format(now),
  };
}

/**
 * Translate role to French
 * @param role - The role in English
 * @returns The role translated to French
 */
function translateRoleToFrench(role: string): string {
  return ROLE_TRANSLATIONS_FR[role as UserRole] || role;
}

/**
 * Check if role is a provider type (needs validation)
 * @param role - The role to check
 * @returns True if role is a provider type
 */
function isProviderRole(role: string): boolean {
  return PROVIDER_ROLES.includes(role.toLowerCase());
}

// ============================================================================
// PROFILE DATA INTERFACE
// ============================================================================

/**
 * Profile document data structure from sos_profiles collection
 */
interface ProfileData {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  email?: string;
  phoneNumber?: string;
  phone?: string;
  country?: string;
  residenceCountry?: string;
  currentCountry?: string;
}

// ============================================================================
// TRIGGER FUNCTION
// ============================================================================

/**
 * Telegram trigger for new provider registrations
 *
 * Listens to the sos_profiles/{profileId} collection and sends a Telegram
 * notification when a new provider profile is created.
 */
export const telegramOnNewProvider = onDocumentCreated(
  {
    region: "europe-west3",
    document: "sos_profiles/{profileId}",
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    const profileId = event.params.profileId;

    logger.info("[telegramOnNewProvider] New profile created", { profileId });

    try {
      // 1. Get the new profile data from event
      const snapshot = event.data;
      if (!snapshot) {
        logger.warn("[telegramOnNewProvider] No data in event", { profileId });
        return;
      }

      const profileData = snapshot.data() as ProfileData;

      // 2. Extract profile fields
      const role = profileData.role || "client";

      // 3. Check if role is a provider type (not client)
      if (!isProviderRole(role)) {
        logger.info("[telegramOnNewProvider] Role is not a provider type, skipping notification", {
          profileId,
          role,
          providerRoles: PROVIDER_ROLES,
        });
        return;
      }

      // 4. Extract remaining fields
      const displayName = profileData.displayName ||
        [profileData.firstName, profileData.lastName].filter(Boolean).join(" ") ||
        "N/A";
      const email = profileData.email || "N/A";
      const phoneNumber = profileData.phoneNumber || profileData.phone || "N/A";
      const country = profileData.country || profileData.residenceCountry || profileData.currentCountry || "N/A";

      logger.info("[telegramOnNewProvider] Provider data extracted", {
        profileId,
        displayName,
        role,
        email,
        country,
      });

      // 5. Get Paris timezone date/time
      const { date, time } = getParisDateTime();

      // 6. Build notification variables
      const providerTypeFr = translateRoleToFrench(role);

      const variables = {
        PROVIDER_NAME: displayName,
        PROVIDER_TYPE_FR: providerTypeFr,
        EMAIL: email,
        PHONE: phoneNumber,
        COUNTRY: country,
        DATE: date,
        TIME: time,
      };

      logger.info("[telegramOnNewProvider] Sending Telegram notification", {
        profileId,
        variables,
      });

      // 7. Send notification via TelegramNotificationService
      const success = await telegramNotificationService.sendNotification(
        "new_provider",
        variables
      );

      if (success) {
        logger.info("[telegramOnNewProvider] Notification sent successfully", {
          profileId,
        });
      } else {
        logger.warn("[telegramOnNewProvider] Failed to send notification", {
          profileId,
        });
      }
    } catch (error) {
      // Graceful error handling - log but don't throw
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[telegramOnNewProvider] Error processing provider registration", {
        profileId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't rethrow - we don't want to retry on notification failures
    }
  }
);

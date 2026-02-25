/**
 * Telegram Trigger: onUserRegistration
 *
 * Triggered when a new user document is created in the users collection.
 * Sends a Telegram notification to admins about the new registration.
 *
 * Features:
 * - Filters by allowed roles (configurable)
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
 * Allowed roles that trigger a Telegram notification
 * Only these roles will generate a new_registration notification
 */
const ALLOWED_ROLES: UserRole[] = [
  "lawyer",
  "expat",
  "client",
  "chatter",
  "influencer",
  "blogger",
  "groupAdmin",
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

// ============================================================================
// USER DATA INTERFACE
// ============================================================================

/**
 * User document data structure
 */
interface UserData {
  email?: string;
  phoneNumber?: string;
  phone?: string;
  role?: string;
  country?: string;
  residenceCountry?: string;
  currentCountry?: string;
}

// ============================================================================
// TRIGGER FUNCTION
// ============================================================================

/**
 * Telegram trigger for new user registrations
 *
 * Listens to the users/{userId} collection and sends a Telegram
 * notification when a new user is created with an allowed role.
 */
export async function handleTelegramUserRegistration(event: any) {
    const userId = event.params.userId;

    logger.info("[telegramOnUserRegistration] New user created", { userId });

    try {
      // 1. Get the new user data from event
      const snapshot = event.data;
      if (!snapshot) {
        logger.warn("[telegramOnUserRegistration] No data in event", { userId });
        return;
      }

      const userData = snapshot.data() as UserData;

      // 2. Extract user fields
      const email = userData.email || "N/A";
      const phoneNumber = userData.phoneNumber || userData.phone || "N/A";
      const role = userData.role || "client";
      const country = userData.country || userData.residenceCountry || userData.currentCountry || "N/A";

      logger.info("[telegramOnUserRegistration] User data extracted", {
        userId,
        email,
        role,
        country,
      });

      // 3. Check if role is in allowed roles
      if (!ALLOWED_ROLES.includes(role as UserRole)) {
        logger.info("[telegramOnUserRegistration] Role not in allowed list, skipping notification", {
          userId,
          role,
          allowedRoles: ALLOWED_ROLES,
        });
        return;
      }

      // 4. Get Paris timezone date/time
      const { date, time } = getParisDateTime();

      // 5. Build notification variables
      const roleFr = translateRoleToFrench(role);

      const variables = {
        ROLE_FR: roleFr,
        EMAIL: email,
        PHONE: phoneNumber,
        COUNTRY: country,
        DATE: date,
        TIME: time,
      };

      logger.info("[telegramOnUserRegistration] Sending Telegram notification", {
        userId,
        variables,
      });

      // 6. Send notification via TelegramNotificationService
      const success = await telegramNotificationService.sendNotification(
        "new_registration",
        variables
      );

      if (success) {
        logger.info("[telegramOnUserRegistration] Notification sent successfully", {
          userId,
        });
      } else {
        logger.warn("[telegramOnUserRegistration] Failed to send notification", {
          userId,
        });
      }
    } catch (error) {
      // Graceful error handling - log but don't throw
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("[telegramOnUserRegistration] Error processing user registration", {
        userId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't rethrow - we don't want to retry on notification failures
    }
}

export const telegramOnUserRegistration = onDocumentCreated(
  {
    region: "europe-west3",
    document: "users/{userId}",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  handleTelegramUserRegistration
);

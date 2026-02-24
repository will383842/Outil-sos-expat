/**
 * Telegram Trigger: onCallCompleted
 *
 * Triggered when a call_session status changes to "completed".
 * Sends a Telegram notification to administrators with call details.
 *
 * Features:
 * - Listens to call_sessions/{sessionId} document updates
 * - Only triggers when status changes TO "completed" (not already completed)
 * - Applies minimum duration filter (default 60 seconds = 1 minute)
 * - Sends notification via TelegramNotificationService
 * - Handles errors gracefully without throwing
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { telegramNotificationService } from "../TelegramNotificationService";
import { getRoleFrench } from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[telegramOnCallCompleted]";

/** Default minimum duration in seconds to send notification (1 minute) */
const DEFAULT_MIN_DURATION_SECONDS = 60;

/** Paris timezone for date/time formatting */
const PARIS_TIMEZONE = "Europe/Paris";

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

/**
 * Ensure Firebase Admin is initialized before accessing Firestore
 */
function ensureInitialized(): void {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Call session data structure
 */
interface CallSessionData {
  status: string;
  clientId?: string;
  providerId?: string;
  providerType?: "lawyer" | "expat";
  duration?: number; // Duration in seconds
  durationSeconds?: number; // Alternative field name
  completedAt?: Timestamp;
  createdAt?: Timestamp;
  metadata?: {
    clientId?: string;
    providerId?: string;
    clientName?: string;
    providerName?: string;
  };
}

/**
 * User data structure
 */
interface UserData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string;
  email?: string;
}

/**
 * Provider profile data structure
 */
interface ProviderProfileData {
  firstName?: string;
  lastName?: string;
  fullName?: string;
  displayName?: string;
  email?: string;
  type?: "lawyer" | "expat";
  providerType?: "lawyer" | "expat";
}

// ============================================================================
// ROLE TRANSLATIONS (for provider types)
// ============================================================================

/**
 * Translations for provider types to French
 */
const ROLE_TRANSLATIONS: Record<string, string> = {
  lawyer: "Avocat",
  expat: "Expatrié",
};

/**
 * Get French translation for provider type
 */
function getProviderTypeFrench(providerType: string | undefined): string {
  if (!providerType) return "Prestataire";
  return ROLE_TRANSLATIONS[providerType] || getRoleFrench(providerType) || providerType;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date in Paris timezone (DD/MM/YYYY)
 */
function formatDateParis(date?: Date | Timestamp): string {
  const d = date instanceof Timestamp ? date.toDate() : (date || new Date());
  return d.toLocaleDateString("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format time in Paris timezone (HH:MM)
 */
function formatTimeParis(date?: Date | Timestamp): string {
  const d = date instanceof Timestamp ? date.toDate() : (date || new Date());
  return d.toLocaleTimeString("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get display name from user data
 */
function getDisplayName(data: UserData | ProviderProfileData | undefined): string {
  if (!data) return "Inconnu";

  if (data.displayName) return data.displayName;
  if (data.fullName) return data.fullName;
  if (data.firstName && data.lastName) return `${data.firstName} ${data.lastName}`;
  if (data.firstName) return data.firstName;
  if (data.email) return data.email.split("@")[0];

  return "Inconnu";
}

// ============================================================================
// TRIGGER
// ============================================================================

/**
 * Telegram notification trigger for completed calls
 *
 * Triggers when a call_session status changes to "completed"
 * and sends a notification to Telegram administrators.
 */
export const telegramOnCallCompleted = onDocumentUpdated(
  {
    region: "europe-west3",
    document: "call_sessions/{sessionId}",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    ensureInitialized();

    const before = event.data?.before?.data() as CallSessionData | undefined;
    const after = event.data?.after?.data() as CallSessionData | undefined;

    if (!before || !after) {
      logger.warn(`${LOG_PREFIX} Missing data in event`);
      return;
    }

    // Only process if status changed TO "completed"
    // (before.status !== "completed" && after.status === "completed")
    if (before.status === "completed" || after.status !== "completed") {
      return;
    }

    const sessionId = event.params.sessionId;

    logger.info(`${LOG_PREFIX} Processing completed call`, {
      sessionId,
      clientId: after.clientId || after.metadata?.clientId,
      providerId: after.providerId || after.metadata?.providerId,
    });

    const db = getFirestore();

    try {
      // 1. Get call duration in seconds
      const durationSeconds = after.duration || after.durationSeconds || 0;

      // 2. Check minimum duration (default 60 seconds)
      const minDurationSeconds = DEFAULT_MIN_DURATION_SECONDS;
      if (durationSeconds < minDurationSeconds) {
        logger.info(`${LOG_PREFIX} Call duration ${durationSeconds}s < min ${minDurationSeconds}s, skipping notification`, {
          sessionId,
          durationSeconds,
        });
        return;
      }

      // 3. Get client and provider IDs
      const clientId = after.metadata?.clientId || after.clientId;
      const providerId = after.metadata?.providerId || after.providerId;

      // 4. Get client name
      let clientName = after.metadata?.clientName || "Client";
      if (clientId && !after.metadata?.clientName) {
        try {
          const clientDoc = await db.collection("users").doc(clientId).get();
          if (clientDoc.exists) {
            clientName = getDisplayName(clientDoc.data() as UserData);
          }
        } catch (err) {
          logger.warn(`${LOG_PREFIX} Could not fetch client data`, { clientId, error: err });
        }
      }

      // 5. Get provider name and type
      let providerName = after.metadata?.providerName || "Prestataire";
      let providerType = after.providerType;
      if (providerId) {
        try {
          const providerDoc = await db.collection("sos_profiles").doc(providerId).get();
          if (providerDoc.exists) {
            const providerData = providerDoc.data() as ProviderProfileData;
            if (!after.metadata?.providerName) {
              providerName = getDisplayName(providerData);
            }
            if (!providerType) {
              providerType = providerData.type || providerData.providerType;
            }
          }
        } catch (err) {
          logger.warn(`${LOG_PREFIX} Could not fetch provider data`, { providerId, error: err });
        }
      }

      // 6. Calculate duration in minutes
      const durationMinutes = Math.round(durationSeconds / 60);

      // 7. Get date and time (use completedAt if available, otherwise now)
      const completedDate = after.completedAt || Timestamp.now();

      // 8. Build notification variables
      const variables = {
        CLIENT_NAME: clientName,
        PROVIDER_NAME: providerName,
        PROVIDER_TYPE_FR: getProviderTypeFrench(providerType),
        DURATION_MINUTES: durationMinutes.toString(),
        DATE: formatDateParis(completedDate),
        TIME: formatTimeParis(completedDate),
      };

      logger.info(`${LOG_PREFIX} Sending notification`, {
        sessionId,
        variables,
      });

      // 9. Send notification via TelegramNotificationService
      // The service handles config checking, template rendering, and sending
      // minDuration filter is in minutes, so convert from seconds
      const minDurationMinutes = minDurationSeconds / 60;
      const success = await telegramNotificationService.sendNotification(
        "call_completed",
        variables,
        { minDuration: minDurationMinutes }
      );

      if (success) {
        logger.info(`${LOG_PREFIX} Notification sent successfully`, { sessionId });
      } else {
        logger.warn(`${LOG_PREFIX} Notification not sent (may be disabled or filtered)`, { sessionId });
      }

    } catch (error) {
      // Handle errors gracefully - don't throw to avoid trigger retries for notification failures
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`${LOG_PREFIX} Error processing notification`, {
        sessionId,
        error: errorMessage,
      });
      // Don't rethrow - notification failures should not cause trigger retries
    }
  }
);

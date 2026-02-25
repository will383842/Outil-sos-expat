/**
 * Telegram Trigger: onSecurityAlert
 *
 * Triggered when a new security alert document is created.
 * Sends a Telegram notification to administrators about the security event.
 *
 * Features:
 * - Listens to security_alerts/{alertId} collection
 * - Translates alert types to French for display
 * - Formats date/time in Paris timezone
 * - Graceful error handling with logging
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";

import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { telegramNotificationService } from "../TelegramNotificationService";
import type { SecurityAlertVars } from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[telegramOnSecurityAlert]";

/** Paris timezone for date/time formatting */
const PARIS_TIMEZONE = "Europe/Paris";

// ============================================================================
// ALERT TYPE TRANSLATIONS
// ============================================================================

/**
 * Translations for security alert types to French
 */
const ALERT_TYPE_TRANSLATIONS_FR: Record<string, string> = {
  suspicious_login: "Connexion suspecte",
  account_blocked: "Compte bloqué",
  brute_force: "Tentative de force brute",
  password_reset: "Réinitialisation de mot de passe",
  multiple_failed_logins: "Tentatives de connexion multiples échouées",
  new_device: "Nouvel appareil détecté",
  unusual_location: "Localisation inhabituelle",
  account_locked: "Compte verrouillé",
  suspicious_activity: "Activité suspecte",
  fraud_attempt: "Tentative de fraude",
  unauthorized_access: "Accès non autorisé",
  data_export: "Export de données",
  permission_change: "Changement de permissions",
  api_abuse: "Abus de l'API",
  rate_limit_exceeded: "Limite de requêtes dépassée",
};

/**
 * Get French translation for alert type
 * @param alertType - The alert type in English
 * @returns The alert type translated to French
 */
function translateAlertTypeToFrench(alertType: string): string {
  return ALERT_TYPE_TRANSLATIONS_FR[alertType] || alertType;
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Security alert document structure from Firestore
 */
interface SecurityAlertDocument {
  alertType?: string;
  type?: string;
  userEmail?: string;
  email?: string;
  ipAddress?: string;
  ip?: string;
  country?: string;
  location?: string;
  details?: string;
  description?: string;
  message?: string;
  createdAt?: FirebaseFirestore.Timestamp;
  timestamp?: FirebaseFirestore.Timestamp;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format date in Paris timezone (DD/MM/YYYY)
 */
function formatDateParis(date: Date): string {
  return date.toLocaleDateString("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format time in Paris timezone (HH:MM)
 */
function formatTimeParis(date: Date): string {
  return date.toLocaleTimeString("fr-FR", {
    timeZone: PARIS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ============================================================================
// TRIGGER FUNCTION
// ============================================================================

/**
 * Telegram notification trigger for security alerts
 *
 * Listens to the security_alerts/{alertId} collection and sends a Telegram
 * notification when a new security alert is created.
 *
 * Notification template variables:
 * - ALERT_TYPE_FR: Alert type translated to French
 * - USER_EMAIL: Email of the affected user
 * - IP_ADDRESS: Source IP address
 * - COUNTRY: Country of origin
 * - DETAILS: Additional details/description
 * - DATE: Alert date (DD/MM/YYYY, Paris timezone)
 * - TIME: Alert time (HH:MM, Paris timezone)
 */
export const telegramOnSecurityAlert = onDocumentCreated(
  {
    region: "europe-west3",
    document: "security_alerts/{alertId}",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    const alertId = event.params.alertId;

    logger.info(`${LOG_PREFIX} New security alert created`, { alertId });

    try {
      // 1. Get the alert data from event
      const snapshot = event.data;
      if (!snapshot) {
        logger.warn(`${LOG_PREFIX} No data in event`, { alertId });
        return;
      }

      const alertData = snapshot.data() as SecurityAlertDocument;

      // 2. Extract alert fields with fallbacks for different field names
      const alertType = alertData.alertType || alertData.type || "unknown";
      const userEmail = alertData.userEmail || alertData.email || "N/A";
      const ipAddress = alertData.ipAddress || alertData.ip || "N/A";
      const country = alertData.country || alertData.location || "N/A";
      const details = alertData.details || alertData.description || alertData.message || "Aucun détail disponible";

      logger.info(`${LOG_PREFIX} Alert data extracted`, {
        alertId,
        alertType,
        userEmail,
        ipAddress,
        country,
      });

      // 3. Translate alert type to French
      const alertTypeFr = translateAlertTypeToFrench(alertType);

      // 4. Get date/time in Paris timezone
      const alertDate = alertData.createdAt?.toDate() || alertData.timestamp?.toDate() || new Date();
      const date = formatDateParis(alertDate);
      const time = formatTimeParis(alertDate);

      // 5. Build notification variables
      const variables: SecurityAlertVars = {
        ALERT_TYPE_FR: alertTypeFr,
        USER_EMAIL: userEmail,
        IP_ADDRESS: ipAddress,
        COUNTRY: country,
        DETAILS: details,
        DATE: date,
        TIME: time,
      };

      logger.info(`${LOG_PREFIX} Sending Telegram notification`, {
        alertId,
        variables,
      });

      // 6. Send notification via TelegramNotificationService
      const success = await telegramNotificationService.sendNotification(
        "security_alert",
        variables
      );

      if (success) {
        logger.info(`${LOG_PREFIX} Notification sent successfully`, {
          alertId,
        });
      } else {
        logger.warn(`${LOG_PREFIX} Failed to send notification`, {
          alertId,
        });
      }
    } catch (error) {
      // Graceful error handling - log but don't throw
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`${LOG_PREFIX} Error processing security alert`, {
        alertId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't rethrow - we don't want to retry on notification failures
    }
  }
);

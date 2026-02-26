/**
 * Telegram Test Notification Callable
 *
 * Admin-only callable function to send test notifications via Telegram.
 * Useful for testing templates and verifying the Telegram integration.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { telegramNotificationService } from "../TelegramNotificationService";
import {
  TelegramEventType,
  NewRegistrationVars,
  CallCompletedVars,
  PaymentReceivedVars,
  DailyReportVars,
  NewProviderVars,
  NewContactMessageVars,
  NegativeReviewVars,
  SecurityAlertVars,
  WithdrawalRequestVars,
} from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[telegram_sendTestNotification]";

/** Valid event types for test notifications */
const VALID_EVENT_TYPES: TelegramEventType[] = [
  "new_registration",
  "call_completed",
  "payment_received",
  "daily_report",
  "new_provider",
  "new_contact_message",
  "negative_review",
  "security_alert",
  "withdrawal_request",
];

// ============================================================================
// ADMIN CHECK
// ============================================================================

/**
 * Assert that the caller is an admin
 * Throws HttpsError if not authenticated or not an admin
 */
function assertAdmin(ctx: any): void {
  const uid = ctx?.auth?.uid;
  const claims = ctx?.auth?.token;
  if (!uid) throw new HttpsError("unauthenticated", "Auth requise.");
  const isAdmin = claims?.admin === true || claims?.role === "admin";
  if (!isAdmin) throw new HttpsError("permission-denied", "Reserve aux admins.");
}

// ============================================================================
// TEST DATA GENERATORS
// ============================================================================

/**
 * Get current date/time formatted for Paris timezone
 */
function getCurrentDateTime(): { date: string; time: string } {
  const now = new Date();
  return {
    date: now.toLocaleDateString("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    time: now.toLocaleTimeString("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

/**
 * Build test variables based on event type
 */
function buildTestVariables(eventType: TelegramEventType): NewRegistrationVars | CallCompletedVars | PaymentReceivedVars | DailyReportVars | NewProviderVars | NewContactMessageVars | NegativeReviewVars | SecurityAlertVars | WithdrawalRequestVars {
  const { date, time } = getCurrentDateTime();

  switch (eventType) {
    case "new_registration":
      return {
        ROLE: "Avocat",
        ROLE_FR: "Avocat",
        EMAIL: "test@example.com",
        PHONE: "+33612345678",
        COUNTRY: "France",
        DATE: date,
        TIME: time,
      } as NewRegistrationVars;

    case "call_completed":
      return {
        CLIENT_NAME: "Jean Dupont",
        PROVIDER_NAME: "Marie Martin",
        PROVIDER_TYPE: "Avocat",
        PROVIDER_TYPE_FR: "Avocat",
        DURATION_MINUTES: "15",
        DATE: date,
        TIME: time,
      } as CallCompletedVars;

    case "payment_received":
      return {
        TOTAL_AMOUNT: "50",
        COMMISSION_AMOUNT: "10",
        DATE: date,
        TIME: time,
      } as PaymentReceivedVars;

    case "daily_report":
      return {
        DATE: date,
        DAILY_CA: "500",
        DAILY_COMMISSION: "100",
        REGISTRATION_COUNT: "5",
        CALL_COUNT: "10",
        TIME: time,
      } as DailyReportVars;

    case "new_provider":
      return {
        PROVIDER_NAME: "Pierre Durand",
        PROVIDER_TYPE: "Avocat",
        PROVIDER_TYPE_FR: "Avocat",
        EMAIL: "pierre.durand@example.com",
        PHONE: "+33698765432",
        COUNTRY: "France",
        DATE: date,
        TIME: time,
      } as NewProviderVars;

    case "new_contact_message":
      return {
        SENDER_NAME: "Sophie Laurent",
        SENDER_EMAIL: "sophie@example.com",
        SUBJECT: "Demande d'information",
        MESSAGE_PREVIEW: "Bonjour, je souhaite en savoir plus sur vos services...",
        DATE: date,
        TIME: time,
      } as NewContactMessageVars;

    case "negative_review":
      return {
        CLIENT_NAME: "Marc Petit",
        PROVIDER_NAME: "Marie Martin",
        RATING: "2",
        COMMENT_PREVIEW: "Service decevant, temps d'attente trop long...",
        DATE: date,
        TIME: time,
      } as NegativeReviewVars;

    case "security_alert":
      return {
        ALERT_TYPE: "Connexion suspecte",
        ALERT_TYPE_FR: "Connexion suspecte",
        USER_EMAIL: "user@example.com",
        IP_ADDRESS: "192.168.1.100",
        COUNTRY: "Russie",
        DETAILS: "Tentative de connexion depuis une localisation inhabituelle",
        DATE: date,
        TIME: time,
      } as SecurityAlertVars;

    case "withdrawal_request":
      return {
        USER_NAME: "Julie Moreau",
        USER_TYPE: "Influenceur",
        USER_TYPE_FR: "Influenceur",
        AMOUNT: "150",
        PAYMENT_METHOD: "Virement bancaire",
        DATE: date,
        TIME: time,
      } as WithdrawalRequestVars;

    default:
      throw new HttpsError("invalid-argument", `Type d'evenement inconnu: ${eventType}`);
  }
}

// ============================================================================
// CALLABLE FUNCTION
// ============================================================================

/**
 * Send a test notification via Telegram
 *
 * Parameters:
 * - eventType: TelegramEventType (required) - The type of notification to test
 * - chatId: string (optional) - Override chat ID (uses config chatId if not provided)
 *
 * Returns:
 * - { success: true, messageId: number } on success
 * - { success: false, error: string } on failure
 */
export const telegram_sendTestNotification = onCall(
  {
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    // 1. Admin check
    assertAdmin(req);

    const { eventType, chatId } = req.data || {};

    console.log(`${LOG_PREFIX} Request received:`, {
      eventType,
      chatId: chatId ? "provided" : "not provided",
      caller: req.auth?.uid,
    });

    // 2. Validate eventType
    if (!eventType) {
      throw new HttpsError("invalid-argument", "eventType est requis.");
    }

    if (!VALID_EVENT_TYPES.includes(eventType as TelegramEventType)) {
      throw new HttpsError(
        "invalid-argument",
        `eventType invalide: ${eventType}. Valeurs acceptees: ${VALID_EVENT_TYPES.join(", ")}`
      );
    }

    const validEventType = eventType as TelegramEventType;

    try {
      // 3. Build test variables
      const variables = buildTestVariables(validEventType);
      console.log(`${LOG_PREFIX} Built test variables for ${validEventType}:`, variables);

      // 4. Get config to check chatId
      const config = await telegramNotificationService.getConfig();
      const targetChatId = chatId || config?.recipientChatId;

      if (!targetChatId) {
        console.error(`${LOG_PREFIX} No chat ID available`);
        return {
          success: false,
          error: "Aucun chat ID configure. Veuillez configurer le chat ID dans la configuration Telegram ou le fournir en parametre.",
        };
      }

      // 5. Get template
      const template = await telegramNotificationService.getTemplate(validEventType);
      if (!template) {
        console.error(`${LOG_PREFIX} No template found for ${validEventType}`);
        return {
          success: false,
          error: `Aucun template trouve pour ${validEventType}`,
        };
      }

      // 6. Replace variables in template
      const message = telegramNotificationService.replaceVariables(
        template.template,
        variables as unknown as Record<string, string>
      );

      // 7. Send message via Telegram
      const { sendTelegramMessage } = await import("../providers/telegramBot");
      const result = await sendTelegramMessage(targetChatId, message, {
        parseMode: "Markdown",
      });

      if (result.ok && result.messageId) {
        console.log(`${LOG_PREFIX} Test notification sent successfully, messageId: ${result.messageId}`);

        // Log the notification
        await telegramNotificationService.logNotification(
          validEventType,
          true,
          undefined,
          result.messageId,
          targetChatId
        );

        return {
          success: true,
          messageId: result.messageId,
        };
      } else {
        console.error(`${LOG_PREFIX} Failed to send test notification:`, result.error);

        // Log the failure
        await telegramNotificationService.logNotification(
          validEventType,
          false,
          result.error,
          undefined,
          targetChatId
        );

        return {
          success: false,
          error: result.error || "Erreur inconnue lors de l'envoi",
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue";
      console.error(`${LOG_PREFIX} Error:`, error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }
);

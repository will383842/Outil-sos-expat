/**
 * Telegram Trigger: onNewContactMessage
 *
 * Triggered when a new contact message document is created in the contact_messages collection.
 * Sends a Telegram notification to admins about the new message.
 *
 * Features:
 * - Formats date/time in Paris timezone
 * - Truncates message preview to 100 characters
 * - Graceful error handling with logging
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { telegramNotificationService } from "../TelegramNotificationService";
import type { NewContactMessageVars } from "../types";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[telegramOnNewContactMessage]";

/** Maximum length for message preview */
const MESSAGE_PREVIEW_MAX_LENGTH = 100;

/** Paris timezone for date/time formatting */
const PARIS_TIMEZONE = "Europe/Paris";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Contact message document structure from Firestore
 */
interface ContactMessageDocument {
  name?: string;
  email?: string;
  subject?: string;
  message?: string;
}

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
 * Truncate message to specified length with ellipsis
 * @param message - The message to truncate
 * @param maxLength - Maximum length (default: 100)
 * @returns Truncated message with ellipsis if needed
 */
function truncateMessage(message: string, maxLength: number = MESSAGE_PREVIEW_MAX_LENGTH): string {
  if (message.length <= maxLength) {
    return message;
  }
  return message.substring(0, maxLength) + "...";
}

// ============================================================================
// TRIGGER FUNCTION
// ============================================================================

/**
 * Telegram trigger for new contact messages
 *
 * Listens to the contact_messages/{messageId} collection and sends a Telegram
 * notification when a new contact message is created.
 */
export const telegramOnNewContactMessage = onDocumentCreated(
  {
    region: "europe-west3",
    document: "contact_messages/{messageId}",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    const messageId = event.params.messageId;

    logger.info(`${LOG_PREFIX} New contact message created`, { messageId });

    try {
      // 1. Get the message data from event
      const snapshot = event.data;
      if (!snapshot) {
        logger.warn(`${LOG_PREFIX} No data in event`, { messageId });
        return;
      }

      const messageData = snapshot.data() as ContactMessageDocument;

      // 2. Extract message fields
      const name = messageData.name || "N/A";
      const email = messageData.email || "N/A";
      const subject = messageData.subject || "N/A";
      const message = messageData.message || "";

      logger.info(`${LOG_PREFIX} Message data extracted`, {
        messageId,
        name,
        email,
        subject,
      });

      // 3. Truncate message to first 100 characters for preview
      const messagePreview = truncateMessage(message);

      // 4. Get Paris timezone date/time
      const { date, time } = getParisDateTime();

      // 5. Build notification variables
      const variables: NewContactMessageVars = {
        SENDER_NAME: name,
        SENDER_EMAIL: email,
        SUBJECT: subject,
        MESSAGE_PREVIEW: messagePreview,
        DATE: date,
        TIME: time,
      };

      logger.info(`${LOG_PREFIX} Sending Telegram notification`, {
        messageId,
        variables,
      });

      // 6. Send notification via TelegramNotificationService
      const success = await telegramNotificationService.sendNotification(
        "new_contact_message",
        variables
      );

      if (success) {
        logger.info(`${LOG_PREFIX} Notification sent successfully`, {
          messageId,
        });
      } else {
        logger.warn(`${LOG_PREFIX} Failed to send notification`, {
          messageId,
        });
      }
    } catch (error) {
      // Graceful error handling - log but don't throw
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`${LOG_PREFIX} Error processing contact message`, {
        messageId,
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't rethrow - we don't want to retry on notification failures
    }
  }
);

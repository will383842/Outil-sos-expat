/**
 * Telegram Trigger: onNewCaptainApplication
 *
 * Triggered when a new captain application document is created in captain_applications.
 * Sends a Telegram notification to admins.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { telegramNotificationService } from "../TelegramNotificationService";
import type { CaptainApplicationVars } from "../types";

const LOG_PREFIX = "[telegramOnNewCaptainApplication]";
const MOTIVATION_MAX_LENGTH = 100;
const PARIS_TIMEZONE = "Europe/Paris";

interface CaptainApplicationDocument {
  name?: string;
  whatsapp?: string;
  country?: string;
  motivation?: string;
  cvUrl?: string;
}

function getParisDateTime(): { date: string; time: string } {
  const now = new Date();
  return {
    date: new Intl.DateTimeFormat("fr-FR", {
      timeZone: PARIS_TIMEZONE,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(now),
    time: new Intl.DateTimeFormat("fr-FR", {
      timeZone: PARIS_TIMEZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now),
  };
}

export const telegramOnNewCaptainApplication = onDocumentCreated(
  {
    region: "europe-west3",
    document: "captain_applications/{applicationId}",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (event) => {
    const applicationId = event.params.applicationId;
    logger.info(`${LOG_PREFIX} New captain application`, { applicationId });

    try {
      const snapshot = event.data;
      if (!snapshot) {
        logger.warn(`${LOG_PREFIX} No data in event`, { applicationId });
        return;
      }

      const data = snapshot.data() as CaptainApplicationDocument;

      const name = data.name || "N/A";
      const whatsapp = data.whatsapp || "N/A";
      const country = data.country || "N/A";
      const motivation = data.motivation || "";
      const motivationPreview = motivation.length > MOTIVATION_MAX_LENGTH
        ? motivation.substring(0, MOTIVATION_MAX_LENGTH) + "..."
        : motivation || "N/A";

      const { date, time } = getParisDateTime();

      const variables: CaptainApplicationVars = {
        CANDIDATE_NAME: name,
        WHATSAPP: whatsapp,
        COUNTRY: country,
        MOTIVATION_PREVIEW: motivationPreview,
        HAS_CV: data.cvUrl ? "Oui" : "Non",
        DATE: date,
        TIME: time,
      };

      const success = await telegramNotificationService.sendNotification(
        "captain_application",
        variables
      );

      if (success) {
        logger.info(`${LOG_PREFIX} Notification sent`, { applicationId });
      } else {
        logger.warn(`${LOG_PREFIX} Failed to send notification`, { applicationId });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`${LOG_PREFIX} Error`, { applicationId, error: errorMessage });
    }
  }
);

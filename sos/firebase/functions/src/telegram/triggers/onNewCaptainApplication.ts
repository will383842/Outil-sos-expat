/**
 * Telegram Trigger: onNewCaptainApplication
 *
 * Triggered when a new captain application document is created in captain_applications.
 * Sends a Telegram notification to admins.
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { TELEGRAM_BOT_TOKEN, TELEGRAM_ENGINE_URL_SECRET, TELEGRAM_ENGINE_API_KEY_SECRET } from "../../lib/secrets";
import { forwardEventToEngine } from "../forwardToEngine";

const LOG_PREFIX = "[telegramOnNewCaptainApplication]";

interface CaptainApplicationDocument {
  name?: string;
  whatsapp?: string;
  country?: string;
  motivation?: string;
  cvUrl?: string;
}

export const telegramOnNewCaptainApplication = onDocumentCreated(
  {
    region: "europe-west3",
    document: "captain_applications/{applicationId}",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN, TELEGRAM_ENGINE_URL_SECRET, TELEGRAM_ENGINE_API_KEY_SECRET],
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

      // Forward to Telegram Engine
      await forwardEventToEngine("captain.application", undefined, {
        applicationId,
        name,
        whatsapp,
        country,
        motivation,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error(`${LOG_PREFIX} Error`, { applicationId, error: errorMessage });
    }
  }
);

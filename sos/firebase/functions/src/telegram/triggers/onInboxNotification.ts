/**
 * Admin Inbox Telegram Notifications
 *
 * Forwards inbox events to the Telegram Engine (Laravel) which routes them
 * to the correct bot(s) based on event type configuration.
 *
 * Events forwarded:
 * - contact_messages → new.contact.message (already has its own trigger, skip here)
 * - user_feedback → user.feedback
 * - captain_applications → captain.application (already has its own trigger, skip here)
 * - partner_applications → partner.application
 * - payment_withdrawals → withdrawal.request (already has its own trigger, skip here)
 *
 * Note: contact_messages, captain_applications and payment_withdrawals already have
 * dedicated triggers (onNewContactMessage, onNewCaptainApplication, onWithdrawalRequest)
 * that forward to the engine. The engine's multi-bot system handles routing to BOTH
 * the main bot AND the inbox bot based on each bot's notification config.
 *
 * This file only adds triggers for the 2 NEW event types that had no trigger before:
 * - user_feedback
 * - partner_applications
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions/v2";
import { TELEGRAM_ENGINE_URL_SECRET, TELEGRAM_ENGINE_API_KEY_SECRET } from "../../lib/secrets";
import { forwardEventToEngine } from "../forwardToEngine";

// ============================================================================
// TRIGGER CONFIG (europe-west3 like other Firestore triggers)
// ============================================================================

const TRIGGER_CONFIG = {
  region: "europe-west3" as const,
  memory: "256MiB" as const,
  cpu: 0.083,
  timeoutSeconds: 30,
  secrets: [TELEGRAM_ENGINE_URL_SECRET, TELEGRAM_ENGINE_API_KEY_SECRET],
};

// ============================================================================
// 1. USER FEEDBACK (NEW - no existing trigger)
// ============================================================================

export const inboxNotifyFeedback = onDocumentCreated(
  { ...TRIGGER_CONFIG, document: "user_feedback/{docId}" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    try {
      await forwardEventToEngine("user.feedback", undefined, {
        docId: event.params.docId,
        type: data.type || "other",
        email: data.email || "",
        pageName: data.pageName || "",
        pageUrl: data.pageUrl || "",
        description: data.description || "",
      });

      logger.info("[InboxTelegram] Feedback event forwarded to engine", { docId: event.params.docId });
    } catch (error) {
      logger.error("[InboxTelegram] Failed to forward feedback event", {
        docId: event.params.docId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
);

// ============================================================================
// 2. PARTNER APPLICATIONS (NEW - no existing trigger)
// ============================================================================

export const inboxNotifyPartner = onDocumentCreated(
  { ...TRIGGER_CONFIG, document: "partner_applications/{docId}" },
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    try {
      await forwardEventToEngine("partner.application", undefined, {
        docId: event.params.docId,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        name: data.name || "",
        email: data.email || "",
        websiteName: data.websiteName || "",
        websiteUrl: data.websiteUrl || "",
        country: data.country || "",
        message: data.message || "",
      });

      logger.info("[InboxTelegram] Partner application event forwarded to engine", { docId: event.params.docId });
    } catch (error) {
      logger.error("[InboxTelegram] Failed to forward partner application event", {
        docId: event.params.docId,
        error: error instanceof Error ? error.message : error,
      });
    }
  }
);

/**
 * Trigger: On Partner Created
 *
 * Actions when a new partner is registered:
 * - Track analytics event
 * - Create welcome notification (9 languages)
 * - Send welcome email via Zoho
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import type { Partner } from "../types";
import { sendZoho } from "../../notificationPipeline/providers/email/zohoSmtp";
import { generateWelcomeEmail } from "../../email/welcomeTemplates";
import { EMAIL_SECRETS } from "../../lib/secrets";

export const onPartnerCreated = onDocumentCreated(
  {
    document: "partners/{partnerId}",
    region: "europe-west3",
    cpu: 0.083,
    secrets: [...EMAIL_SECRETS],
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[onPartnerCreated] No data in event");
      return;
    }

    const partner = snapshot.data() as Partner;
    const partnerId = event.params.partnerId;

    logger.info("[onPartnerCreated] New partner registered", {
      partnerId,
      email: partner.email,
      websiteUrl: partner.websiteUrl,
      websiteCategory: partner.websiteCategory,
    });

    const db = getFirestore();

    try {
      // 1. Track registration for analytics
      await db.collection("analytics_events").add({
        type: "partner_registration",
        partnerId,
        email: partner.email,
        country: partner.country,
        websiteCategory: partner.websiteCategory,
        websiteTraffic: partner.websiteTraffic || null,
        websiteUrl: partner.websiteUrl,
        timestamp: Timestamp.now(),
      });

      // 2. Welcome notification is created by the callable (createPartner / convertApplicationToPartner)
      // The trigger only handles analytics + email to avoid duplicate notifications.

      // 3. Send welcome email (multilingual)
      try {
        const lang = partner.language || "fr";
        const { subject, html, text } = generateWelcomeEmail("partner", partner.firstName, lang);

        await sendZoho(partner.email, subject, html, text);

        logger.info("[onPartnerCreated] Welcome email sent", {
          partnerId,
          email: partner.email,
        });
      } catch (emailError) {
        logger.error("[onPartnerCreated] Failed to send welcome email", {
          partnerId,
          email: partner.email,
          error: emailError,
        });
      }

      logger.info("[onPartnerCreated] Partner onboarding completed", {
        partnerId,
      });
    } catch (error) {
      logger.error("[onPartnerCreated] Error in trigger", { partnerId, error });
    }
  }
);

/**
 * Trigger: onChatterQuizPassed
 *
 * Fires when a chatter's status changes to "active" (quiz passed).
 * - Generates affiliate codes (if not already)
 * - Creates first badge
 * - Sends activation email
 */

import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Chatter, ChatterNotification } from "../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const chatterOnQuizPassed = onDocumentUpdated(
  {
    document: "chatters/{chatterId}",
    region: "europe-west3",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const beforeData = event.data?.before.data() as Chatter | undefined;
    const afterData = event.data?.after.data() as Chatter | undefined;

    if (!beforeData || !afterData) {
      return;
    }

    // AUDIT-FIX m1: Quiz was removed — this trigger is now dead code.
    // Kept for safety but will never fire since pending_quiz is no longer assigned.
    if (beforeData.status === afterData.status || afterData.status !== "active") {
      return;
    }

    const chatterId = event.params.chatterId;
    const chatter = afterData;

    logger.info("[chatterOnQuizPassed] Processing quiz passed", {
      chatterId,
      email: chatter.email,
    });

    const db = getFirestore();
    const now = Timestamp.now();

    try {
      // 1. Award "first_client" badge isn't ready yet, but we can prepare
      // The first_client badge will be awarded on first commission

      // 2. Create activation notification
      const notification: ChatterNotification = {
        id: "",
        chatterId,
        type: "system",
        title: "Félicitations ! Votre compte est activé !",
        titleTranslations: {
          en: "Congratulations! Your account is activated!",
          es: "Felicidades! Tu cuenta está activada!",
          pt: "Parabéns! Sua conta está ativada!",
        },
        message: `Votre code affilié client est ${chatter.affiliateCodeClient}. Commencez à partager et gagnez des commissions !`,
        messageTranslations: {
          en: `Your client affiliate code is ${chatter.affiliateCodeClient}. Start sharing and earn commissions!`,
          es: `Tu código de afiliado es ${chatter.affiliateCodeClient}. Empieza a compartir y gana comisiones!`,
          pt: `Seu código de afiliado é ${chatter.affiliateCodeClient}. Comece a compartilhar e ganhe comissões!`,
        },
        actionUrl: "/chatter/dashboard",
        isRead: false,
        emailSent: false,
        createdAt: now,
      };

      const notificationRef = db.collection("chatter_notifications").doc();
      notification.id = notificationRef.id;
      await notificationRef.set(notification);

      // 3. Create recruitment link entry for tracking
      const recruitmentLinkRef = db.collection("chatter_recruitment_links").doc();
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

      await recruitmentLinkRef.set({
        id: recruitmentLinkRef.id,
        chatterId,
        chatterCode: chatter.affiliateCodeClient,
        code: chatter.affiliateCodeRecruitment,
        trackingUrl: `https://sos-expat.com?ref=${chatter.affiliateCodeRecruitment}`,
        usedByProviderId: null,
        usedAt: null,
        commissionPaid: false,
        commissionId: null,
        expiresAt: Timestamp.fromDate(sixMonthsLater),
        isActive: true,
        createdAt: now,
      });

      // 4. If this chatter was recruited, notify the recruiter
      // NEW SYSTEM: No commission at quiz pass. Commission comes from:
      // - $1 per call (N1 call commission)
      // - $5 activation bonus after 2nd client call
      if (chatter.recruitedBy) {
        const recruiterNotification: ChatterNotification = {
          id: "",
          chatterId: chatter.recruitedBy,
          type: "system",
          title: "Votre filleul a valid\u00e9 son quiz !",
          titleTranslations: {
            en: "Your recruit passed the quiz!",
          },
          message: `${chatter.firstName} ${chatter.lastName.charAt(0)}. est maintenant actif. Vous recevrez $1 \u00e0 chaque appel qu'il/elle g\u00e9n\u00e8re, et un bonus de $5 apr\u00e8s son 2\u00e8me appel client !`,
          messageTranslations: {
            en: `${chatter.firstName} ${chatter.lastName.charAt(0)}. is now active. You'll receive $1 for each call they generate, and a $5 bonus after their 2nd client call!`,
          },
          isRead: false,
          emailSent: false,
          createdAt: now,
        };

        const recruiterNotifRef = db.collection("chatter_notifications").doc();
        recruiterNotification.id = recruiterNotifRef.id;
        await recruiterNotifRef.set(recruiterNotification);
      }

      logger.info("[chatterOnQuizPassed] Quiz passed processing complete", {
        chatterId,
        affiliateCodeClient: chatter.affiliateCodeClient,
        affiliateCodeRecruitment: chatter.affiliateCodeRecruitment,
      });
    } catch (error) {
      logger.error("[chatterOnQuizPassed] Error", { chatterId, error });
    }
  }
);

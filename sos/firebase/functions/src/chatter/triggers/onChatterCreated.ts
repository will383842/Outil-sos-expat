/**
 * Trigger: onChatterCreated
 *
 * Fires when a new chatter document is created.
 * - Sends welcome email
 * - Creates notification
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
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

export const chatterOnChatterCreated = onDocumentCreated(
  {
    document: "chatters/{chatterId}",
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[chatterOnChatterCreated] No data in event");
      return;
    }

    const chatterId = event.params.chatterId;
    const chatter = snapshot.data() as Chatter;

    logger.info("[chatterOnChatterCreated] Processing new chatter", {
      chatterId,
      email: chatter.email,
      country: chatter.country,
    });

    const db = getFirestore();
    const now = Timestamp.now();

    try {
      // 1. Create welcome notification
      const notification: ChatterNotification = {
        id: "", // Will be set by Firestore
        chatterId,
        type: "system",
        title: "Bienvenue chez SOS-Expat Chatters !",
        titleTranslations: {
          en: "Welcome to SOS-Expat Chatters!",
          es: "Bienvenido a SOS-Expat Chatters!",
          pt: "Bem-vindo ao SOS-Expat Chatters!",
        },
        message: "Pour commencer à gagner des commissions, veuillez compléter le quiz de qualification.",
        messageTranslations: {
          en: "To start earning commissions, please complete the qualification quiz.",
          es: "Para comenzar a ganar comisiones, complete el cuestionario de calificación.",
          pt: "Para começar a ganhar comissões, complete o questionário de qualificação.",
        },
        actionUrl: "/chatter/quiz",
        isRead: false,
        emailSent: false,
        createdAt: now,
      };

      const notificationRef = db.collection("chatter_notifications").doc();
      notification.id = notificationRef.id;
      await notificationRef.set(notification);

      // 2. If recruited by another chatter, create recruitment link tracking
      if (chatter.recruitedBy) {
        // Check for existing recruitment link
        const existingLinkQuery = await db
          .collection("chatter_recruitment_links")
          .where("chatterId", "==", chatter.recruitedBy)
          .where("code", "==", chatter.recruitedByCode)
          .where("usedByProviderId", "==", null)
          .limit(1)
          .get();

        if (!existingLinkQuery.empty) {
          // Update existing link
          await existingLinkQuery.docs[0].ref.update({
            usedByProviderId: chatterId,
            usedAt: now,
          });
        }

        // Notify recruiter
        const recruiterNotification: ChatterNotification = {
          id: "",
          chatterId: chatter.recruitedBy,
          type: "system",
          title: "Nouveau chatter recruté !",
          titleTranslations: {
            en: "New chatter recruited!",
          },
          message: `${chatter.firstName} ${chatter.lastName.charAt(0)}. s'est inscrit avec votre lien de recrutement.`,
          messageTranslations: {
            en: `${chatter.firstName} ${chatter.lastName.charAt(0)}. signed up with your recruitment link.`,
          },
          isRead: false,
          emailSent: false,
          data: {
            commissionId: undefined, // Commission will be created when quiz is passed
          },
          createdAt: now,
        };

        const recruiterNotifRef = db.collection("chatter_notifications").doc();
        recruiterNotification.id = recruiterNotifRef.id;
        await recruiterNotifRef.set(recruiterNotification);
      }

      logger.info("[chatterOnChatterCreated] Chatter setup complete", {
        chatterId,
        recruitedBy: chatter.recruitedBy,
      });
    } catch (error) {
      logger.error("[chatterOnChatterCreated] Error", { chatterId, error });
    }
  }
);

/**
 * Trigger: onInfluencerCreated
 *
 * Triggered when a new influencer document is created.
 * Actions:
 * - Send welcome email
 * - Notify admin
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Influencer } from "../types";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const influencerOnInfluencerCreated = onDocumentCreated(
  {
    document: "influencers/{influencerId}",
    region: "europe-west3",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[onInfluencerCreated] No data in event");
      return;
    }

    const influencer = snapshot.data() as Influencer;
    const influencerId = event.params.influencerId;
    const db = getFirestore();

    try {
      logger.info("[onInfluencerCreated] New influencer registered", {
        influencerId,
        email: influencer.email,
        country: influencer.country,
      });

      // 1. Create welcome notification for influencer
      const welcomeNotificationRef = db.collection("influencer_notifications").doc();
      await welcomeNotificationRef.set({
        id: welcomeNotificationRef.id,
        influencerId,
        type: "system",
        title: "Bienvenue chez SOS-Expat !",
        titleTranslations: {
          en: "Welcome to SOS-Expat!",
          es: "¡Bienvenido a SOS-Expat!",
          de: "Willkommen bei SOS-Expat!",
          pt: "Bem-vindo ao SOS-Expat!",
        },
        message: `Votre compte influenceur est maintenant actif ! Votre code de parrainage est ${influencer.affiliateCodeClient}. Partagez-le pour commencer à gagner des commissions.`,
        messageTranslations: {
          en: `Your influencer account is now active! Your referral code is ${influencer.affiliateCodeClient}. Share it to start earning commissions.`,
          es: `¡Tu cuenta de influencer está activa! Tu código de referido es ${influencer.affiliateCodeClient}. Compártelo para empezar a ganar comisiones.`,
          de: `Dein Influencer-Konto ist jetzt aktiv! Dein Empfehlungscode ist ${influencer.affiliateCodeClient}. Teile ihn, um Provisionen zu verdienen.`,
          pt: `Sua conta de influenciador está ativa! Seu código de indicação é ${influencer.affiliateCodeClient}. Compartilhe para começar a ganhar comissões.`,
        },
        actionUrl: "/influencer/tableau-de-bord",
        isRead: false,
        emailSent: false,
        createdAt: Timestamp.now(),
      });

      // 2. Create admin notification about new influencer
      // Store in a general admin notifications collection
      const adminNotificationRef = db.collection("admin_notifications").doc();
      await adminNotificationRef.set({
        id: adminNotificationRef.id,
        type: "new_influencer",
        title: "Nouvel influenceur inscrit",
        message: `${influencer.firstName} ${influencer.lastName} (${influencer.email}) s'est inscrit comme influenceur depuis ${influencer.country}.`,
        data: {
          influencerId,
          email: influencer.email,
          country: influencer.country,
          platforms: influencer.platforms,
        },
        isRead: false,
        createdAt: Timestamp.now(),
      });

      logger.info("[onInfluencerCreated] Notifications created", {
        influencerId,
      });
    } catch (error) {
      logger.error("[onInfluencerCreated] Error", {
        influencerId,
        error,
      });
    }
  }
);

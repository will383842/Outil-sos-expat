/**
 * Trigger: On Blogger Created
 *
 * Actions when a new blogger is registered:
 * - Send welcome email
 * - Track registration
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { Blogger } from "../types";

export const onBloggerCreated = onDocumentCreated(
  {
    document: "bloggers/{bloggerId}",
    region: "europe-west1",
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[onBloggerCreated] No data in event");
      return;
    }

    const blogger = snapshot.data() as Blogger;
    const bloggerId = event.params.bloggerId;

    logger.info("[onBloggerCreated] New blogger registered", {
      bloggerId,
      email: blogger.email,
      blogUrl: blogger.blogUrl,
    });

    const db = getFirestore();

    try {
      // 1. Track registration for analytics
      await db.collection("analytics_events").add({
        type: "blogger_registration",
        bloggerId,
        email: blogger.email,
        country: blogger.country,
        blogTheme: blogger.blogTheme,
        blogTraffic: blogger.blogTraffic,
        timestamp: Timestamp.now(),
      });

      // 2. Create welcome notification (already done in registration, but ensure it exists)
      const existingNotification = await db
        .collection("blogger_notifications")
        .where("bloggerId", "==", bloggerId)
        .where("type", "==", "system")
        .limit(1)
        .get();

      if (existingNotification.empty) {
        await db.collection("blogger_notifications").add({
          bloggerId,
          type: "system",
          title: "Bienvenue dans le programme Blogueurs !",
          titleTranslations: {
            en: "Welcome to the Blogger Program!",
            es: "¡Bienvenido al Programa de Bloggers!",
          },
          message: `Félicitations ${blogger.firstName} ! Votre compte est actif. Explorez vos ressources exclusives et commencez à promouvoir SOS-Expat.`,
          messageTranslations: {
            en: `Congratulations ${blogger.firstName}! Your account is active. Explore your exclusive resources and start promoting SOS-Expat.`,
          },
          actionUrl: "/blogger/tableau-de-bord",
          isRead: false,
          emailSent: false,
          createdAt: Timestamp.now(),
        });
      }

      // 3. TODO: Send welcome email via email service
      // This would integrate with your email provider (SendGrid, Mailgun, etc.)
      // await sendWelcomeEmail(blogger);

      logger.info("[onBloggerCreated] Blogger onboarding completed", {
        bloggerId,
      });
    } catch (error) {
      logger.error("[onBloggerCreated] Error in trigger", { bloggerId, error });
    }
  }
);

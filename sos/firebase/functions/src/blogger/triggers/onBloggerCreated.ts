/**
 * Trigger: On Blogger Created
 *
 * Actions when a new blogger is registered:
 * - Send welcome email
 * - Track registration
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { Blogger } from "../types";
import { sendZoho } from "../../notificationPipeline/providers/email/zohoSmtp";

export const onBloggerCreated = onDocumentCreated(
  {
    document: "bloggers/{bloggerId}",
    region: "europe-west3",
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

      // 3. Send welcome email
      try {
        const welcomeHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue chez SOS-Expat Blogueurs</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #7C3AED; margin-bottom: 10px;">Salut ${blogger.firstName} ! 🎊</h1>
    <p style="font-size: 18px; color: #666;">Ton blog va devenir une machine à commissions !</p>
  </div>

  <div style="background: linear-gradient(135deg, #7C3AED 0%, #A855F7 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
    <h2 style="margin-top: 0;">✨ Bienvenue dans le programme Blogueurs !</h2>
    <p>Ton compte est activé ! Direction ton tableau de bord pour récupérer ton widget, tes bannières et tous les outils pour monétiser ton blog.</p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://sos-expat.com/blogger/tableau-de-bord" style="display: inline-block; background: white; color: #7C3AED; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Voir mes ressources →</a>
    </div>
  </div>

  <div style="background: #F5F3FF; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
    <h3 style="color: #7C3AED; margin-top: 0;">💰 Tes commissions</h3>
    <ul style="padding-left: 20px;">
      <li><strong>10$/appel</strong> — chaque visiteur de ton blog qui appelle un expert via ton widget</li>
      <li><strong>5$/appel</strong> — pour chaque appel des prestataires que tu recrutes (revenus passifs !)</li>
    </ul>
    <p style="margin-bottom: 0; font-style: italic;">Le widget s'intègre en 2 minutes. Copier-coller et c'est parti ! 🔥</p>
  </div>

  <div style="background: #FEF3C7; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
    <h3 style="color: #92400E; margin-top: 0;">💡 La recette magique</h3>
    <p style="margin-bottom: 0;">Place le widget dans tes articles qui parlent d'expatriation, de démarches administratives ou de vie à l'étranger. C'est là que tes lecteurs en ont le plus besoin — et c'est là que tu gagnes le plus !</p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
    <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} SOS-Expat — Tous droits réservés</p>
  </div>
</body>
</html>`;

        const welcomeText = `Salut ${blogger.firstName} ! 🎊

Ton blog va devenir une machine à commissions !

Bienvenue dans le programme Blogueurs ! Ton compte est activé.

TES COMMISSIONS
- 10$/appel — chaque visiteur de ton blog qui appelle un expert via ton widget
- 5$/appel — pour chaque appel des prestataires que tu recrutes (revenus passifs !)

Le widget s'intègre en 2 minutes. Copier-coller et c'est parti !

LA RECETTE MAGIQUE
Place le widget dans tes articles qui parlent d'expatriation ou de vie à l'étranger.

Voir tes ressources : https://sos-expat.com/blogger/tableau-de-bord

© ${new Date().getFullYear()} SOS-Expat — Tous droits réservés`;

        await sendZoho(
          blogger.email,
          "Ton blog va rapporter gros ! 🚀",
          welcomeHtml,
          welcomeText
        );

        logger.info("[onBloggerCreated] Welcome email sent", {
          bloggerId,
          email: blogger.email,
        });
      } catch (emailError) {
        logger.error("[onBloggerCreated] Failed to send welcome email", {
          bloggerId,
          email: blogger.email,
          error: emailError,
        });
      }

      // 4. Handle recruitment - increment recruiter's totalRecruits
      if (blogger.recruitedBy) {
        try {
          await db.collection("bloggers").doc(blogger.recruitedBy).update({
            totalRecruits: FieldValue.increment(1),
            updatedAt: Timestamp.now(),
          });
          logger.info("[onBloggerCreated] Recruiter totalRecruits incremented", {
            bloggerId,
            recruiterId: blogger.recruitedBy,
          });
        } catch (recruitError) {
          logger.error("[onBloggerCreated] Failed to increment recruiter totalRecruits", {
            bloggerId,
            recruiterId: blogger.recruitedBy,
            error: recruitError,
          });
        }
      }

      logger.info("[onBloggerCreated] Blogger onboarding completed", {
        bloggerId,
      });
    } catch (error) {
      logger.error("[onBloggerCreated] Error in trigger", { bloggerId, error });
    }
  }
);

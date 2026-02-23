/**
 * Trigger: onInfluencerCreated
 *
 * Triggered when a new influencer document is created.
 * Actions:
 * - Send welcome email
 * - Notify admin
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Influencer } from "../types";
import { sendZoho } from "../../notificationPipeline/providers/email/zohoSmtp";

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
    cpu: 0.25,
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

      // 3. Send welcome email
      try {
        const welcomeHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue chez SOS-Expat Influenceurs</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #EF4444; margin-bottom: 10px;">Hey ${influencer.firstName} ! 🎉</h1>
    <p style="font-size: 18px; color: #666;">Bienvenue dans l'aventure SOS-Expat Influenceurs !</p>
  </div>

  <div style="background: linear-gradient(135deg, #EF4444 0%, #F97316 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
    <h2 style="margin-top: 0;">🚀 Tu es officiellement dans la team !</h2>
    <p>Ton compte est actif et prêt à faire des merveilles. Ton lien d'affiliation unique est dans ton tableau de bord — il n'attend que d'être partagé !</p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://sos-expat.com/influencer/tableau-de-bord" style="display: inline-block; background: white; color: #EF4444; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Mon tableau de bord →</a>
    </div>
  </div>

  <div style="background: #FEF2F2; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
    <h3 style="color: #EF4444; margin-top: 0;">💰 Comment tu gagnes ?</h3>
    <ul style="padding-left: 20px;">
      <li><strong>10$/appel</strong> — chaque fois qu'un de tes abonnés utilise ton lien pour appeler un expert</li>
      <li><strong>5$/appel</strong> — pour chaque appel des prestataires que tu recrutes (en continu !)</li>
    </ul>
    <p style="margin-bottom: 0; font-style: italic;">Pas de limite, pas de plafond. Plus tu partages, plus ça tombe. 💪</p>
  </div>

  <div style="background: #FEF3C7; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
    <h3 style="color: #92400E; margin-top: 0;">💡 Astuce de pro</h3>
    <p style="margin-bottom: 0;">Partage ton lien dans ta bio, tes stories ou tes publications. Les expatriés qui ont besoin d'aide juridique ou administrative sont partout — et toi tu as LA solution à leur proposer !</p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
    <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} SOS-Expat — Tous droits réservés</p>
  </div>
</body>
</html>`;

        const welcomeText = `Hey ${influencer.firstName} ! 🎉

Bienvenue dans l'aventure SOS-Expat Influenceurs !

Tu es officiellement dans la team ! Ton compte est actif et prêt à faire des merveilles.

COMMENT TU GAGNES ?
- 10$/appel — chaque fois qu'un de tes abonnés utilise ton lien pour appeler un expert
- 5$/appel — pour chaque appel des prestataires que tu recrutes (en continu !)

Pas de limite, pas de plafond. Plus tu partages, plus ça tombe.

ASTUCE DE PRO
Partage ton lien dans ta bio, tes stories ou tes publications.

Accède à ton tableau de bord : https://sos-expat.com/influencer/tableau-de-bord

© ${new Date().getFullYear()} SOS-Expat — Tous droits réservés`;

        await sendZoho(
          influencer.email,
          "Bienvenue dans la team SOS-Expat ! 🚀",
          welcomeHtml,
          welcomeText
        );

        await welcomeNotificationRef.update({ emailSent: true });

        logger.info("[onInfluencerCreated] Welcome email sent", {
          influencerId,
          email: influencer.email,
        });
      } catch (emailError) {
        logger.error("[onInfluencerCreated] Failed to send welcome email", {
          influencerId,
          email: influencer.email,
          error: emailError,
        });
      }

      // 4. Handle recruitment - increment recruiter's totalRecruits
      if (influencer.recruitedBy) {
        try {
          await db.collection("influencers").doc(influencer.recruitedBy).update({
            totalRecruits: FieldValue.increment(1),
            updatedAt: Timestamp.now(),
          });
          logger.info("[onInfluencerCreated] Recruiter totalRecruits incremented", {
            influencerId,
            recruiterId: influencer.recruitedBy,
          });
        } catch (recruitError) {
          logger.error("[onInfluencerCreated] Failed to increment recruiter totalRecruits", {
            influencerId,
            recruiterId: influencer.recruitedBy,
            error: recruitError,
          });
        }
      }

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

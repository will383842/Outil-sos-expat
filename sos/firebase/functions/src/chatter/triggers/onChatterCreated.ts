/**
 * Trigger: onChatterCreated
 *
 * Fires when a new chatter document is created.
 * - Sends welcome email
 * - Creates notification
 * - Calculates parrainNiveau2Id (N2 parrain)
 * - Initializes referral system fields
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { Chatter, ChatterNotification } from "../types";
import { calculateParrainN2 } from "../services/chatterReferralService";
import { updateChatterChallengeScore } from "../scheduled/weeklyChallenges";
import { sendZoho } from "../../notificationPipeline/providers/email/zohoSmtp";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const chatterOnChatterCreated = onDocumentCreated(
  {
    document: "chatters/{chatterId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.25,
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

      // 2. Send welcome email
      try {
        const welcomeEmailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue chez SOS-Expat Chatters</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4F46E5; margin-bottom: 10px;">Bienvenue ${chatter.firstName} !</h1>
    <p style="font-size: 18px; color: #666;">Tu fais maintenant partie de l'équipe SOS-Expat Chatters</p>
  </div>

  <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
    <h2 style="margin-top: 0;">🎯 Prochaine étape : Le Quiz</h2>
    <p>Pour commencer à gagner des commissions, tu dois passer le quiz de qualification (5 questions, 85% requis).</p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://sos-expat.com/chatter/quiz" style="display: inline-block; background: white; color: #4F46E5; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Passer le Quiz →</a>
    </div>
  </div>

  <div style="background: #F3F4F6; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
    <h3 style="color: #4F46E5; margin-top: 0;">💰 Comment ça marche ?</h3>
    <ul style="padding-left: 20px;">
      <li><strong>10$/appel</strong> pour chaque client que tu apportes</li>
      <li><strong>1$/appel</strong> pour les appels de tes filleuls N1</li>
      <li><strong>0.50$/appel</strong> pour les appels de tes filleuls N2</li>
      <li><strong>5$/activation</strong> quand ton filleul fait son 2e appel</li>
      <li><strong>Bonus paliers</strong> : 15$, 35$, 90$, 250$, 600$ !</li>
    </ul>
  </div>

  <div style="background: #FEF3C7; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
    <h3 style="color: #92400E; margin-top: 0;">🚀 Astuce pour démarrer</h3>
    <p style="margin-bottom: 0;">Rejoins les groupes Facebook d'expatriés français et aide les membres qui ont des questions juridiques. Chaque mise en relation = une commission !</p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
    <p style="color: #666; font-size: 14px;">Des questions ? Réponds à cet email ou contacte ton parrain.</p>
    <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} SOS-Expat - Tous droits réservés</p>
  </div>
</body>
</html>`;

        const welcomeEmailText = `
Bienvenue ${chatter.firstName} !

Tu fais maintenant partie de l'équipe SOS-Expat Chatters.

PROCHAINE ÉTAPE : LE QUIZ
Pour commencer à gagner des commissions, tu dois passer le quiz de qualification (5 questions, 85% requis).
Passe le quiz ici : https://sos-expat.com/chatter/quiz

COMMENT ÇA MARCHE ?
- 10$/appel pour chaque client que tu apportes
- 1$/appel pour les appels de tes filleuls N1
- 0.50$/appel pour les appels de tes filleuls N2
- 5$/activation quand ton filleul fait son 2e appel
- Bonus paliers : 15$, 35$, 90$, 250$, 600$ !

ASTUCE POUR DÉMARRER
Rejoins les groupes Facebook d'expatriés français et aide les membres qui ont des questions juridiques. Chaque mise en relation = une commission !

Des questions ? Réponds à cet email ou contacte ton parrain.

© ${new Date().getFullYear()} SOS-Expat - Tous droits réservés
`;

        await sendZoho(
          chatter.email,
          "Bienvenue chez SOS-Expat Chatters ! 🎉",
          welcomeEmailHtml,
          welcomeEmailText
        );

        // Mark notification as email sent
        await notificationRef.update({ emailSent: true });

        logger.info("[chatterOnChatterCreated] Welcome email sent", {
          chatterId,
          email: chatter.email,
        });
      } catch (emailError) {
        logger.error("[chatterOnChatterCreated] Failed to send welcome email", {
          chatterId,
          email: chatter.email,
          error: emailError,
        });
        // Don't fail the entire trigger if email fails
      }

      // 3. If recruited by another chatter, handle referral chain
      if (chatter.recruitedBy) {
        // Calculate N2 parrain (parrain of parrain)
        const parrainNiveau2Id = await calculateParrainN2(chatterId);

        // Update chatter with N2 parrain
        const referralUpdates: Record<string, unknown> = {
          parrainNiveau2Id: parrainNiveau2Id || null,
          // Initialize referral system fields
          qualifiedReferralsCount: 0,
          referralsN2Count: 0,
          referralEarnings: 0,
          referralToClientRatio: 0,
          threshold10Reached: false,
          threshold50Reached: false,
          tierBonusesPaid: [],
          // NEW SIMPLIFIED COMMISSION SYSTEM (2026)
          totalClientCalls: 0,
          isActivated: false,
          activatedAt: null,
          activationBonusPaid: false,
          updatedAt: now,
        };
        await db.collection("chatters").doc(chatterId).update(referralUpdates);

        // Increment N1 parrain's totalRecruits counter
        await db.collection("chatters").doc(chatter.recruitedBy).update({
          totalRecruits: FieldValue.increment(1),
          updatedAt: now,
        });

        // Update weekly challenge score for recruit action
        await updateChatterChallengeScore(chatter.recruitedBy, "recruit");

        // If there's an N2 parrain, increment their referralsN2Count
        if (parrainNiveau2Id) {
          await db.collection("chatters").doc(parrainNiveau2Id).update({
            referralsN2Count: FieldValue.increment(1),
            updatedAt: now,
          });
        }

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

        logger.info("[chatterOnChatterCreated] Referral chain calculated", {
          chatterId,
          parrainN1: chatter.recruitedBy,
          parrainN2: parrainNiveau2Id,
        });
      } else {
        // No recruiter - still initialize referral fields
        await db.collection("chatters").doc(chatterId).update({
          parrainNiveau2Id: null,
          qualifiedReferralsCount: 0,
          referralsN2Count: 0,
          referralEarnings: 0,
          referralToClientRatio: 0,
          threshold10Reached: false,
          threshold50Reached: false,
          tierBonusesPaid: [],
          // NEW SIMPLIFIED COMMISSION SYSTEM (2026)
          totalClientCalls: 0,
          isActivated: false,
          activatedAt: null,
          activationBonusPaid: false,
          updatedAt: now,
        });
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

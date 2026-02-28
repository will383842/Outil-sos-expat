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
import { generateWelcomeEmail } from "../../email/welcomeTemplates";

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
    cpu: 0.083,
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
          fr: "Bienvenue chez SOS-Expat Chatters !",
          en: "Welcome to SOS-Expat Chatters!",
          es: "¡Bienvenido a SOS-Expat Chatters!",
          de: "Willkommen bei SOS-Expat Chatters!",
          pt: "Bem-vindo ao SOS-Expat Chatters!",
          ru: "Добро пожаловать в SOS-Expat Chatters!",
          hi: "SOS-Expat Chatters में आपका स्वागत है!",
          zh: "欢迎加入 SOS-Expat Chatters！",
          ar: "مرحبًا بك في SOS-Expat Chatters!",
        },
        message: "Votre compte est actif ! Connectez votre Telegram pour recevoir vos notifications et un bonus de 50$.",
        messageTranslations: {
          fr: "Votre compte est actif ! Connectez votre Telegram pour recevoir vos notifications et un bonus de 50$.",
          en: "Your account is active! Connect your Telegram to receive notifications and a $50 bonus.",
          es: "¡Tu cuenta está activa! Conecta tu Telegram para recibir notificaciones y un bono de $50.",
          de: "Ihr Konto ist aktiv! Verbinden Sie Ihr Telegram, um Benachrichtigungen und einen $50-Bonus zu erhalten.",
          pt: "Sua conta está ativa! Conecte seu Telegram para receber notificações e um bônus de $50.",
          ru: "Ваш аккаунт активен! Подключите Telegram, чтобы получать уведомления и бонус $50.",
          hi: "आपका खाता सक्रिय है! सूचनाएं और $50 बोनस प्राप्त करने के लिए अपना टेलीग्राम कनेक्ट करें।",
          zh: "您的账户已激活！连接您的 Telegram 以接收通知和 $50 奖金。",
          ar: "حسابك نشط! اربط حساب Telegram الخاص بك لتلقي الإشعارات ومكافأة بقيمة 50$.",
        },
        actionUrl: "/chatter/telegram",
        isRead: false,
        emailSent: false,
        createdAt: now,
      };

      const notificationRef = db.collection("chatter_notifications").doc();
      notification.id = notificationRef.id;
      await notificationRef.set(notification);

      // 2. Send welcome email (multilingual — P2 FIX 2026-02-28)
      try {
        const lang = chatter.language || "fr";
        const { subject, html, text } = generateWelcomeEmail("chatter", chatter.firstName, lang);

        await sendZoho(chatter.email, subject, html, text);

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
            fr: "Nouveau chatter recruté !",
            en: "New chatter recruited!",
            es: "¡Nuevo chatter reclutado!",
            de: "Neuer Chatter rekrutiert!",
            pt: "Novo chatter recrutado!",
            ru: "Новый чаттер привлечён!",
            hi: "नया चैटर भर्ती हुआ!",
            zh: "新聊天员已招募！",
            ar: "تم تجنيد متحدث جديد!",
          },
          message: `${chatter.firstName} ${chatter.lastName.charAt(0)}. s'est inscrit avec votre lien de recrutement.`,
          messageTranslations: {
            fr: `${chatter.firstName} ${chatter.lastName.charAt(0)}. s'est inscrit avec votre lien de recrutement.`,
            en: `${chatter.firstName} ${chatter.lastName.charAt(0)}. signed up with your recruitment link.`,
            es: `${chatter.firstName} ${chatter.lastName.charAt(0)}. se registró con tu enlace de reclutamiento.`,
            de: `${chatter.firstName} ${chatter.lastName.charAt(0)}. hat sich über Ihren Rekrutierungslink registriert.`,
            pt: `${chatter.firstName} ${chatter.lastName.charAt(0)}. inscreveu-se com o seu link de recrutamento.`,
            ru: `${chatter.firstName} ${chatter.lastName.charAt(0)}. зарегистрировался по вашей ссылке.`,
            hi: `${chatter.firstName} ${chatter.lastName.charAt(0)}. आपके रिक्रूटमेंट लिंक से साइन अप किया।`,
            zh: `${chatter.firstName} ${chatter.lastName.charAt(0)}. 通过您的招募链接注册。`,
            ar: `${chatter.firstName} ${chatter.lastName.charAt(0)}. سجّل عبر رابط التجنيد الخاص بك.`,
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

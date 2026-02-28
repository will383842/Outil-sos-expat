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
import { generateWelcomeEmail } from "../../email/welcomeTemplates";

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
    cpu: 0.083,
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
          fr: "Bienvenue chez SOS-Expat !",
          en: "Welcome to SOS-Expat!",
          es: "¡Bienvenido a SOS-Expat!",
          de: "Willkommen bei SOS-Expat!",
          pt: "Bem-vindo ao SOS-Expat!",
          ru: "Добро пожаловать в SOS-Expat!",
          hi: "SOS-Expat में आपका स्वागत है!",
          zh: "欢迎加入 SOS-Expat！",
          ar: "مرحبًا بك في SOS-Expat!",
        },
        message: `Votre compte influenceur est maintenant actif ! Votre code de parrainage est ${influencer.affiliateCodeClient}. Partagez-le pour commencer à gagner des commissions.`,
        messageTranslations: {
          fr: `Votre compte influenceur est maintenant actif ! Votre code de parrainage est ${influencer.affiliateCodeClient}. Partagez-le pour commencer à gagner des commissions.`,
          en: `Your influencer account is now active! Your referral code is ${influencer.affiliateCodeClient}. Share it to start earning commissions.`,
          es: `¡Tu cuenta de influencer está activa! Tu código de referido es ${influencer.affiliateCodeClient}. Compártelo para empezar a ganar comisiones.`,
          de: `Dein Influencer-Konto ist jetzt aktiv! Dein Empfehlungscode ist ${influencer.affiliateCodeClient}. Teile ihn, um Provisionen zu verdienen.`,
          pt: `Sua conta de influenciador está ativa! Seu código de indicação é ${influencer.affiliateCodeClient}. Compartilhe para começar a ganhar comissões.`,
          ru: `Ваш аккаунт инфлюенсера активен! Ваш реферальный код: ${influencer.affiliateCodeClient}. Поделитесь им, чтобы начать зарабатывать.`,
          hi: `आपका इन्फ्लुएंसर खाता सक्रिय है! आपका रेफरल कोड ${influencer.affiliateCodeClient} है। कमीशन कमाना शुरू करने के लिए इसे शेयर करें।`,
          zh: `您的影响者账户已激活！推荐代码是 ${influencer.affiliateCodeClient}。分享它开始赚取佣金。`,
          ar: `حسابك كمؤثر نشط الآن! رمز الإحالة الخاص بك هو ${influencer.affiliateCodeClient}. شاركه لبدء كسب العمولات.`,
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

      // 3. Send welcome email (multilingual — P2 FIX 2026-02-28)
      try {
        const lang = influencer.language || "fr";
        const { subject, html, text } = generateWelcomeEmail("influencer", influencer.firstName, lang);

        await sendZoho(influencer.email, subject, html, text);

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

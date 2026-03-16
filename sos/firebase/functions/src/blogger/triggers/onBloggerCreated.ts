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
import { generateWelcomeEmail } from "../../email/welcomeTemplates";

export const onBloggerCreated = onDocumentCreated(
  {
    document: "bloggers/{bloggerId}",
    region: "europe-west3",
    cpu: 0.083,
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
            fr: "Bienvenue dans le programme Blogueurs !",
            en: "Welcome to the Blogger Program!",
            es: "¡Bienvenido al Programa de Bloggers!",
            de: "Willkommen im Blogger-Programm!",
            pt: "Bem-vindo ao Programa de Blogueiros!",
            ru: "Добро пожаловать в программу блогеров!",
            hi: "ब्लॉगर प्रोग्राम में आपका स्वागत है!",
            zh: "欢迎加入博主计划！",
            ar: "مرحبًا بك في برنامج المدونين!",
          },
          message: `Félicitations ${blogger.firstName} ! Votre compte est actif. Explorez vos ressources exclusives et commencez à promouvoir SOS-Expat.`,
          messageTranslations: {
            fr: `Félicitations ${blogger.firstName} ! Votre compte est actif. Explorez vos ressources exclusives et commencez à promouvoir SOS-Expat.`,
            en: `Congratulations ${blogger.firstName}! Your account is active. Explore your exclusive resources and start promoting SOS-Expat.`,
            es: `¡Felicidades ${blogger.firstName}! Tu cuenta está activa. Explora tus recursos exclusivos y comienza a promover SOS-Expat.`,
            de: `Herzlichen Glückwunsch ${blogger.firstName}! Ihr Konto ist aktiv. Entdecken Sie Ihre exklusiven Ressourcen und beginnen Sie mit der Promotion.`,
            pt: `Parabéns ${blogger.firstName}! Sua conta está ativa. Explore seus recursos exclusivos e comece a promover o SOS-Expat.`,
            ru: `Поздравляем, ${blogger.firstName}! Ваш аккаунт активен. Изучите эксклюзивные ресурсы и начните продвигать SOS-Expat.`,
            hi: `बधाई ${blogger.firstName}! आपका खाता सक्रिय है। अपने विशेष संसाधन खोजें और SOS-Expat का प्रचार शुरू करें।`,
            zh: `恭喜 ${blogger.firstName}！您的账户已激活。探索专属资源并开始推广 SOS-Expat。`,
            ar: `تهانينا ${blogger.firstName}! حسابك نشط. استكشف مواردك الحصرية وابدأ بالترويج لـ SOS-Expat.`,
          },
          actionUrl: "/blogger/tableau-de-bord",
          isRead: false,
          emailSent: false,
          createdAt: Timestamp.now(),
        });
      }

      // 3. Send welcome email (multilingual — P2 FIX 2026-02-28)
      try {
        const lang = blogger.language || "fr";
        const { subject, html, text } = generateWelcomeEmail("blogger", blogger.firstName, lang);

        await sendZoho(blogger.email, subject, html, text);

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

      // 4. Handle recruitment - increment recruiter's totalRecruits + notify recruiter
      if (blogger.recruitedBy) {
        try {
          await db.collection("bloggers").doc(blogger.recruitedBy).update({
            totalRecruits: FieldValue.increment(1),
            updatedAt: Timestamp.now(),
          });

          // Notify recruiter about new recruit (aligned with Chatter behavior)
          const recruiterNotifRef = db.collection("blogger_notifications").doc();
          await recruiterNotifRef.set({
            id: recruiterNotifRef.id,
            bloggerId: blogger.recruitedBy,
            type: "system",
            title: "Nouveau blogueur recruté !",
            titleTranslations: {
              fr: "Nouveau blogueur recruté !",
              en: "New blogger recruited!",
              es: "¡Nuevo blogger reclutado!",
              de: "Neuer Blogger rekrutiert!",
              pt: "Novo blogueiro recrutado!",
              ru: "Новый блогер привлечён!",
              hi: "नया ब्लॉगर भर्ती हुआ!",
              zh: "新博主已招募！",
              ar: "تم تجنيد مدوّن جديد!",
            },
            message: `${blogger.firstName} ${(blogger.lastName || "").charAt(0)}. s'est inscrit avec votre lien de recrutement.`,
            messageTranslations: {
              fr: `${blogger.firstName} ${(blogger.lastName || "").charAt(0)}. s'est inscrit avec votre lien de recrutement.`,
              en: `${blogger.firstName} ${(blogger.lastName || "").charAt(0)}. signed up with your recruitment link.`,
              es: `${blogger.firstName} ${(blogger.lastName || "").charAt(0)}. se registró con tu enlace de reclutamiento.`,
              de: `${blogger.firstName} ${(blogger.lastName || "").charAt(0)}. hat sich über Ihren Rekrutierungslink registriert.`,
              pt: `${blogger.firstName} ${(blogger.lastName || "").charAt(0)}. inscreveu-se com o seu link de recrutamento.`,
              ru: `${blogger.firstName} ${(blogger.lastName || "").charAt(0)}. зарегистрировался по вашей ссылке.`,
              hi: `${blogger.firstName} ${(blogger.lastName || "").charAt(0)}. आपके रिक्रूटमेंट लिंक से साइन अप किया।`,
              zh: `${blogger.firstName} ${(blogger.lastName || "").charAt(0)}. 通过您的招募链接注册。`,
              ar: `${blogger.firstName} ${(blogger.lastName || "").charAt(0)}. سجّل عبر رابط التجنيد الخاص بك.`,
            },
            isRead: false,
            emailSent: false,
            createdAt: Timestamp.now(),
          });

          // Calculate and set parrainNiveau2Id (N2 grandparent)
          const recruiterDoc = await db.collection("bloggers").doc(blogger.recruitedBy).get();
          if (recruiterDoc.exists) {
            const recruiterData = recruiterDoc.data();
            if (recruiterData?.recruitedBy) {
              await db.collection("bloggers").doc(bloggerId).update({
                parrainNiveau2Id: recruiterData.recruitedBy,
                updatedAt: Timestamp.now(),
              });
              logger.info("[onBloggerCreated] Set parrainNiveau2Id", {
                bloggerId,
                parrainNiveau2Id: recruiterData.recruitedBy,
              });
            }
          }

          logger.info("[onBloggerCreated] Recruiter totalRecruits incremented + notified", {
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

/**
 * Trigger: onGroupAdminCreated
 *
 * Handles post-registration tasks when a new GroupAdmin is created:
 * - Creates welcome notification
 * - Awards recruitment commission to recruiter (if applicable)
 * - Sends welcome email
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { GroupAdmin, GroupAdminNotification } from "../types";
import { sendZoho } from "../../notificationPipeline/providers/email/zohoSmtp";
import { generateWelcomeEmail } from "../../email/welcomeTemplates";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const onGroupAdminCreated = onDocumentCreated(
  {
    document: "group_admins/{groupAdminId}",
    region: "europe-west3",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
  },
  async (event) => {
    ensureInitialized();

    const groupAdminData = event.data?.data() as GroupAdmin | undefined;

    if (!groupAdminData) {
      return;
    }

    const groupAdminId = event.params.groupAdminId;
    const db = getFirestore();

    try {
      const batch = db.batch();
      const now = Timestamp.now();

      // 1. Create welcome notification
      const welcomeNotificationRef = db.collection("group_admin_notifications").doc();
      const welcomeNotification: GroupAdminNotification = {
        id: welcomeNotificationRef.id,
        groupAdminId,
        type: "system_announcement",
        title: "Welcome to SOS-Expat Group Admin Program!",
        titleTranslations: {
          fr: "Bienvenue dans le programme Group Admin SOS-Expat !",
          en: "Welcome to SOS-Expat Group Admin Program!",
          es: "¡Bienvenido al programa Group Admin de SOS-Expat!",
          de: "Willkommen beim SOS-Expat Group Admin Programm!",
          pt: "Bem-vindo ao programa Group Admin SOS-Expat!",
          ru: "Добро пожаловать в программу Group Admin SOS-Expat!",
          hi: "SOS-Expat Group Admin कार्यक्रम में आपका स्वागत है!",
          zh: "欢迎加入 SOS-Expat Group Admin 计划！",
          ar: "!مرحبًا بك في برنامج Group Admin SOS-Expat",
        },
        message: `Congratulations ${groupAdminData.firstName}! Your account has been created. Start sharing your affiliate link with your group members to earn $10 per client.`,
        messageTranslations: {
          fr: `Félicitations ${groupAdminData.firstName} ! Votre compte a été créé. Commencez à partager votre lien d'affiliation avec les membres de votre groupe pour gagner 10$ par client.`,
          en: `Congratulations ${groupAdminData.firstName}! Your account has been created. Start sharing your affiliate link with your group members to earn $10 per client.`,
          es: `¡Felicidades ${groupAdminData.firstName}! Tu cuenta ha sido creada. Comienza a compartir tu enlace de afiliación con los miembros de tu grupo para ganar $10 por cliente.`,
          de: `Herzlichen Glückwunsch ${groupAdminData.firstName}! Ihr Konto wurde erstellt. Teilen Sie Ihren Affiliate-Link mit Ihren Gruppenmitgliedern und verdienen Sie $10 pro Kunde.`,
          pt: `Parabéns ${groupAdminData.firstName}! Sua conta foi criada. Comece a compartilhar seu link de afiliação com os membros do seu grupo para ganhar $10 por cliente.`,
          ru: `Поздравляем ${groupAdminData.firstName}! Ваш аккаунт создан. Начните делиться партнёрской ссылкой с участниками группы и зарабатывайте $10 за каждого клиента.`,
          hi: `बधाई ${groupAdminData.firstName}! आपका खाता बन गया है। अपने ग्रुप के सदस्यों के साथ अपना एफिलिएट लिंक शेयर करें और प्रति ग्राहक $10 कमाएं।`,
          zh: `恭喜 ${groupAdminData.firstName}！您的帐户已创建。开始与您的群组成员分享您的推广链接，每位客户赚取 $10。`,
          ar: `تهانينا ${groupAdminData.firstName}! تم إنشاء حسابك. ابدأ بمشاركة رابط الإحالة مع أعضاء مجموعتك لكسب 10$ لكل عميل.`,
        },
        data: {
          affiliateCodeClient: groupAdminData.affiliateCodeClient,
          affiliateCodeRecruitment: groupAdminData.affiliateCodeRecruitment,
        },
        isRead: false,
        createdAt: now,
      };
      batch.set(welcomeNotificationRef, welcomeNotification);

      // 2. Send welcome email (multilingual — P2 FIX 2026-02-28)
      try {
        const lang = groupAdminData.language || "fr";
        const { subject, html, text } = generateWelcomeEmail("groupAdmin", groupAdminData.firstName, lang);

        await sendZoho(groupAdminData.email, subject, html, text);

        logger.info("[onGroupAdminCreated] Welcome email sent", {
          groupAdminId,
          email: groupAdminData.email,
        });
      } catch (emailError) {
        logger.error("[onGroupAdminCreated] Failed to send welcome email", {
          groupAdminId,
          email: groupAdminData.email,
          error: emailError,
        });
      }

      // 3. If recruited, handle recruiter commission
      if (groupAdminData.recruitedBy) {
        // The commission is created when the recruited admin gets their first client.
        // Verify the recruitment record exists (may be delayed due to eventual consistency).
        let recruitDoc = await db
          .collection("group_admin_recruited_admins")
          .where("recruiterId", "==", groupAdminData.recruitedBy)
          .where("recruitedId", "==", groupAdminId)
          .limit(1)
          .get();

        // Retry up to 3 times with 500ms delay — Firestore writes from the
        // registration transaction may not be visible immediately to queries.
        if (recruitDoc.empty) {
          for (let retry = 0; retry < 3; retry++) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            recruitDoc = await db
              .collection("group_admin_recruited_admins")
              .where("recruiterId", "==", groupAdminData.recruitedBy)
              .where("recruitedId", "==", groupAdminId)
              .limit(1)
              .get();
            if (!recruitDoc.empty) break;
          }
        }

        if (recruitDoc.empty) {
          logger.warn("[onGroupAdminCreated] Recruitment record not found after retries", {
            groupAdminId,
            recruitedBy: groupAdminData.recruitedBy,
          });
        } else {
          // Create notification for recruiter
          const recruiterNotificationRef = db.collection("group_admin_notifications").doc();
          const recruiterNotification: GroupAdminNotification = {
            id: recruiterNotificationRef.id,
            groupAdminId: groupAdminData.recruitedBy,
            type: "system_announcement",
            title: "New Admin Recruited!",
            titleTranslations: {
              fr: "Nouvel admin recruté !",
              en: "New Admin Recruited!",
              es: "¡Nuevo admin reclutado!",
              de: "Neuer Admin rekrutiert!",
              pt: "Novo admin recrutado!",
              ru: "Новый админ рекрутирован!",
              hi: "नया एडमिन भर्ती हुआ!",
              zh: "新管理员已招募！",
              ar: "!تم تجنيد مشرف جديد",
            },
            message: `${groupAdminData.firstName} ${groupAdminData.lastName} has joined through your recruitment link! You'll earn $5 when they reach $50 in earnings.`,
            messageTranslations: {
              fr: `${groupAdminData.firstName} ${groupAdminData.lastName} a rejoint via votre lien de recrutement ! Vous gagnerez 5$ quand il atteindra 50$ de gains.`,
              en: `${groupAdminData.firstName} ${groupAdminData.lastName} has joined through your recruitment link! You'll earn $5 when they reach $50 in earnings.`,
              es: `${groupAdminData.firstName} ${groupAdminData.lastName} se unió a través de tu enlace de reclutamiento. Ganarás $5 cuando alcance $50 en ganancias.`,
              de: `${groupAdminData.firstName} ${groupAdminData.lastName} ist über Ihren Rekrutierungslink beigetreten! Sie verdienen $5, wenn er $50 an Einnahmen erreicht.`,
              pt: `${groupAdminData.firstName} ${groupAdminData.lastName} entrou pelo seu link de recrutamento! Você ganhará $5 quando ele atingir $50 em ganhos.`,
              ru: `${groupAdminData.firstName} ${groupAdminData.lastName} присоединился по вашей ссылке! Вы получите $5, когда он заработает $50.`,
              hi: `${groupAdminData.firstName} ${groupAdminData.lastName} आपके रिक्रूटमेंट लिंक से जुड़ा! जब वह $50 कमाएगा तो आपको $5 मिलेंगे।`,
              zh: `${groupAdminData.firstName} ${groupAdminData.lastName} 通过您的招募链接加入了！当他赚到 $50 时，您将获得 $5。`,
              ar: `${groupAdminData.firstName} ${groupAdminData.lastName} انضم عبر رابط التجنيد الخاص بك! ستحصل على 5$ عندما يصل إلى 50$ من الأرباح.`,
            },
            data: {
              recruitedId: groupAdminId,
              recruitedName: `${groupAdminData.firstName} ${groupAdminData.lastName}`,
              recruitedGroupName: groupAdminData.groupName,
            },
            isRead: false,
            createdAt: now,
          };
          batch.set(recruiterNotificationRef, recruiterNotification);
        }

        // Increment recruiter's totalRecruits counter
        const recruiterRef = db.collection("group_admins").doc(groupAdminData.recruitedBy);
        batch.update(recruiterRef, {
          totalRecruits: FieldValue.increment(1),
          updatedAt: now,
        });
      }

      await batch.commit();

      logger.info("[onGroupAdminCreated] Post-registration tasks completed", {
        groupAdminId,
        recruitedBy: groupAdminData.recruitedBy,
      });

      // Note: Recruitment commission is NOT paid immediately.
      // It is triggered when the recruited admin reaches $50 in totalEarned.
      // See groupAdminCommissionService.checkAndPayRecruitmentCommission()
    } catch (error) {
      logger.error("[onGroupAdminCreated] Error in post-registration tasks", {
        groupAdminId,
        error,
      });
    }
  }
);

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
import { createN1RecruitBonusCommission } from "../services/groupAdminCommissionService";

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
        message: `Congratulations ${groupAdminData.firstName}! Your account has been created. Start sharing your affiliate link to earn $5/call (lawyer) or $3/call (expat).`,
        messageTranslations: {
          fr: `Félicitations ${groupAdminData.firstName} ! Votre compte a été créé. Partagez votre lien d'affiliation pour gagner 5$/appel (avocat) ou 3$/appel (expatrié).`,
          en: `Congratulations ${groupAdminData.firstName}! Your account has been created. Start sharing your affiliate link to earn $5/call (lawyer) or $3/call (expat).`,
          es: `¡Felicidades ${groupAdminData.firstName}! Tu cuenta ha sido creada. Comparte tu enlace de afiliación para ganar $5/llamada (abogado) o $3/llamada (expat).`,
          de: `Herzlichen Glückwunsch ${groupAdminData.firstName}! Ihr Konto wurde erstellt. Teilen Sie Ihren Affiliate-Link und verdienen Sie $5/Anruf (Anwalt) oder $3/Anruf (Expat).`,
          pt: `Parabéns ${groupAdminData.firstName}! Sua conta foi criada. Compartilhe seu link de afiliação para ganhar $5/chamada (advogado) ou $3/chamada (expat).`,
          ru: `Поздравляем ${groupAdminData.firstName}! Ваш аккаунт создан. Делитесь партнёрской ссылкой и зарабатывайте $5/звонок (юрист) или $3/звонок (экспат).`,
          hi: `बधाई ${groupAdminData.firstName}! आपका खाता बन गया है। अपना एफिलिएट लिंक शेयर करें — $5/कॉल (वकील) या $3/कॉल (प्रवासी) कमाएं।`,
          zh: `恭喜 ${groupAdminData.firstName}！您的帐户已创建。分享您的推广链接，每次律师通话赚取 $5，每次外籍人士通话赚取 $3。`,
          ar: `تهانينا ${groupAdminData.firstName}! تم إنشاء حسابك. شارك رابط الإحالة لتكسب 5$/مكالمة (محامي) أو 3$/مكالمة (مغترب).`,
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
            message: `${groupAdminData.firstName} ${groupAdminData.lastName} has joined through your recruitment link! You'll earn $5 when they make their first 2 referrals, then $1 per call from their members.`,
            messageTranslations: {
              fr: `${groupAdminData.firstName} ${groupAdminData.lastName} a rejoint via votre lien de recrutement ! Vous gagnerez 5$ à leur activation (2 parrainages), puis 1$ par appel de leurs membres.`,
              en: `${groupAdminData.firstName} ${groupAdminData.lastName} has joined through your recruitment link! You'll earn $5 when they make their first 2 referrals, then $1 per call from their members.`,
              es: `${groupAdminData.firstName} ${groupAdminData.lastName} se unió a través de tu enlace. Ganarás $5 cuando hagan sus primeras 2 referencias, luego $1 por cada llamada de sus miembros.`,
              de: `${groupAdminData.firstName} ${groupAdminData.lastName} ist beigetreten! Sie verdienen $5 bei ihrer Aktivierung (2 Empfehlungen), dann $1 pro Anruf ihrer Mitglieder.`,
              pt: `${groupAdminData.firstName} ${groupAdminData.lastName} entrou pelo seu link! Você ganhará $5 na ativação deles (2 indicações), depois $1 por chamada dos membros deles.`,
              ru: `${groupAdminData.firstName} ${groupAdminData.lastName} присоединился! Вы получите $5 при активации (2 реферала), затем $1 за каждый звонок их участников.`,
              hi: `${groupAdminData.firstName} ${groupAdminData.lastName} जुड़ गए! उनके पहले 2 रेफरल पर $5 मिलेंगे, फिर उनके सदस्यों के प्रत्येक कॉल पर $1।`,
              zh: `${groupAdminData.firstName} ${groupAdminData.lastName} 已加入！他们完成首次2次推荐时您获得$5，之后每次成员通话获得$1。`,
              ar: `${groupAdminData.firstName} ${groupAdminData.lastName} انضم! ستحصل على 5$ عند تفعيلهم (إحالتان)، ثم 1$ لكل مكالمة من أعضائهم.`,
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

        // Set parrainNiveau2Id on the new GA (recruiter's own recruiter = N2 level)
        const recruiterDoc = await db.collection("group_admins").doc(groupAdminData.recruitedBy).get();
        if (recruiterDoc.exists) {
          const recruiterData = recruiterDoc.data() as GroupAdmin;
          if (recruiterData.recruitedBy) {
            batch.update(db.collection("group_admins").doc(groupAdminId), {
              parrainNiveau2Id: recruiterData.recruitedBy,
              updatedAt: now,
            });
          }
        }
      }

      await batch.commit();

      logger.info("[onGroupAdminCreated] Post-registration tasks completed", {
        groupAdminId,
        recruitedBy: groupAdminData.recruitedBy,
      });

      // N1 recruit bonus: if new GA's recruiter was itself recruited by someone,
      // that grandparent earns $1 for the new N2 joining.
      if (groupAdminData.recruitedBy) {
        const recruiterSnap = await db.collection("group_admins").doc(groupAdminData.recruitedBy).get();
        if (recruiterSnap.exists) {
          const recruiterData = recruiterSnap.data() as GroupAdmin;
          if (recruiterData.recruitedBy) {
            // N1 = groupAdminData.recruitedBy, N2 = groupAdminId
            createN1RecruitBonusCommission(recruiterData.recruitedBy, groupAdminId).catch((err) =>
              logger.warn("[onGroupAdminCreated] N1 recruit bonus failed (non-critical)", { err })
            );
          }
        }
      }
    } catch (error) {
      logger.error("[onGroupAdminCreated] Error in post-registration tasks", {
        groupAdminId,
        error,
      });
    }
  }
);

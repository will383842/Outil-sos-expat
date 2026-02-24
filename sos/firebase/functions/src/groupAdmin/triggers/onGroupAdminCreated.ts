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
        message: `Congratulations ${groupAdminData.firstName}! Your account has been created. Start sharing your affiliate link with your group members to earn $10 per client.`,
        data: {
          affiliateCodeClient: groupAdminData.affiliateCodeClient,
          affiliateCodeRecruitment: groupAdminData.affiliateCodeRecruitment,
        },
        read: false,
        createdAt: now,
      };
      batch.set(welcomeNotificationRef, welcomeNotification);

      // 2. Send welcome email
      try {
        const welcomeHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue chez SOS-Expat Group Admin</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #6366F1; margin-bottom: 10px;">${groupAdminData.firstName}, c'est parti ! 🎯</h1>
    <p style="font-size: 18px; color: #666;">Ton groupe va devenir ta source de revenus !</p>
  </div>

  <div style="background: linear-gradient(135deg, #6366F1 0%, #818CF8 100%); color: white; padding: 25px; border-radius: 12px; margin-bottom: 25px;">
    <h2 style="margin-top: 0;">🏆 Bienvenue dans le programme Group Admin !</h2>
    <p>Ton compte est prêt ! Tu as maintenant accès à ton lien d'affiliation unique et à ton code de recrutement. Partage-les dans ton groupe et regarde les commissions tomber !</p>
    <div style="text-align: center; margin-top: 20px;">
      <a href="https://sos-expat.com/group-admin/dashboard" style="display: inline-block; background: white; color: #6366F1; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: bold;">Mon tableau de bord →</a>
    </div>
  </div>

  <div style="background: #EEF2FF; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
    <h3 style="color: #6366F1; margin-top: 0;">💰 Tes commissions</h3>
    <ul style="padding-left: 20px;">
      <li><strong>10$/appel</strong> — chaque membre de ton groupe qui appelle un expert via ton lien</li>
      <li><strong>5$/admin recruté</strong> — quand un admin que tu recrutes atteint 50$ de gains</li>
    </ul>
    <p style="margin-bottom: 0; font-style: italic;">Plus ton groupe est actif, plus tes revenus sont réguliers. C'est mathématique ! 📈</p>
  </div>

  <div style="background: #FEF3C7; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
    <h3 style="color: #92400E; margin-top: 0;">💡 Ton plan d'action</h3>
    <p style="margin-bottom: 0;">Épingle ton lien d'affiliation en haut de ton groupe. Quand un membre pose une question juridique ou administrative, c'est le moment parfait de lui recommander SOS-Expat !</p>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
    <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} SOS-Expat — Tous droits réservés</p>
  </div>
</body>
</html>`;

        const welcomeText = `${groupAdminData.firstName}, c'est parti ! 🎯

Ton groupe va devenir ta source de revenus !

Bienvenue dans le programme Group Admin ! Ton compte est prêt.

TES COMMISSIONS
- 10$/appel — chaque membre de ton groupe qui appelle un expert via ton lien
- 5$/admin recruté — quand un admin que tu recrutes atteint 50$ de gains

Plus ton groupe est actif, plus tes revenus sont réguliers. C'est mathématique !

TON PLAN D'ACTION
Épingle ton lien d'affiliation en haut de ton groupe. Quand un membre pose une question juridique ou administrative, recommande SOS-Expat !

Ton tableau de bord : https://sos-expat.com/group-admin/dashboard

© ${new Date().getFullYear()} SOS-Expat — Tous droits réservés`;

        await sendZoho(
          groupAdminData.email,
          "Ton groupe va rapporter ! 🏆",
          welcomeHtml,
          welcomeText
        );

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
            message: `${groupAdminData.firstName} ${groupAdminData.lastName} has joined through your recruitment link! You'll earn $5 when they reach $50 in earnings.`,
            data: {
              recruitedId: groupAdminId,
              recruitedName: `${groupAdminData.firstName} ${groupAdminData.lastName}`,
              recruitedGroupName: groupAdminData.groupName,
            },
            read: false,
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

/**
 * Trigger: onGroupAdminCreated
 *
 * Handles post-registration tasks when a new GroupAdmin is created:
 * - Creates welcome notification
 * - Awards recruitment commission to recruiter (if applicable)
 * - Sends welcome email
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { GroupAdmin, GroupAdminNotification } from "../types";
import { createRecruitmentCommission } from "../services/groupAdminCommissionService";

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
        message: `Congratulations ${groupAdminData.firstName}! Your account has been created. Start sharing your affiliate link with your group members to earn $15 per client.`,
        data: {
          affiliateCodeClient: groupAdminData.affiliateCodeClient,
          affiliateCodeRecruitment: groupAdminData.affiliateCodeRecruitment,
        },
        read: false,
        createdAt: now,
      };
      batch.set(welcomeNotificationRef, welcomeNotification);

      // 2. If recruited, handle recruiter commission
      if (groupAdminData.recruitedBy) {
        // The commission is created when the recruited admin gets their first client
        // For now, just ensure the recruitment record exists

        const recruitDoc = await db
          .collection("group_admin_recruited_admins")
          .where("recruiterId", "==", groupAdminData.recruitedBy)
          .where("recruitedId", "==", groupAdminId)
          .limit(1)
          .get();

        if (recruitDoc.empty) {
          logger.warn("[onGroupAdminCreated] Recruitment record not found", {
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
            message: `${groupAdminData.firstName} ${groupAdminData.lastName} has joined through your recruitment link! You'll earn $5 when they activate.`,
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
      }

      await batch.commit();

      logger.info("[onGroupAdminCreated] Post-registration tasks completed", {
        groupAdminId,
        recruitedBy: groupAdminData.recruitedBy,
      });

      // 3. Award recruitment commission if recruited
      // This happens immediately upon registration (not on first client)
      if (groupAdminData.recruitedBy) {
        await createRecruitmentCommission(
          groupAdminData.recruitedBy,
          groupAdminId,
          `${groupAdminData.firstName} ${groupAdminData.lastName}`
        );
      }
    } catch (error) {
      logger.error("[onGroupAdminCreated] Error in post-registration tasks", {
        groupAdminId,
        error,
      });
    }
  }
);

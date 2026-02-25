import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { MailwizzAPI } from "../utils/mailwizz";
import { logGA4Event } from "../utils/analytics";
import { getLanguageCode } from "../config";

/**
 * FUNCTION: Handle Milestone Reached
 * Trigger: onUpdate on users/{userId} when a milestone is reached
 * Sends a congratulations email with milestone details
 *
 * Expected Firestore fields on users doc:
 *   lastMilestoneType: string  (ex: "calls_10", "earnings_100")
 *   lastMilestoneValue: string (ex: "10", "100")
 *   lastMilestoneAt: Timestamp
 */
export const handleMilestoneReached = onDocumentUpdated(
  {
    document: "users/{userId}",
    region: "europe-west3",
    memory: "128MiB" as const,
    cpu: 0.083,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 1,
  },
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    const userId = event.params.userId;

    if (!before || !after) return;

    // Only for providers
    if (after.role !== "provider" && after.role !== "lawyer") return;

    // Detect milestone change: lastMilestoneType changed or lastMilestoneAt changed
    const milestoneChanged =
      after.lastMilestoneType &&
      (before.lastMilestoneType !== after.lastMilestoneType ||
        (after.lastMilestoneAt &&
          before.lastMilestoneAt?.toMillis?.() !== after.lastMilestoneAt?.toMillis?.()));

    if (!milestoneChanged) return;

    try {
      const mailwizz = new MailwizzAPI();
      const lang = getLanguageCode(
        after.language || after.preferredLanguage || after.lang || "en"
      );

      await mailwizz.sendTransactional({
        to: after.email || userId,
        template: `TR_PRO_milestone_${lang}`,
        customFields: {
          FNAME: after.firstName || "",
          MILESTONE_TYPE: after.lastMilestoneType || "",
          MILESTONE_VALUE: (after.lastMilestoneValue || "").toString(),
          TOTAL_CALLS: (after.totalCalls || 0).toString(),
          TOTAL_EARNINGS: (after.totalEarnings || 0).toString(),
          DASHBOARD_URL: "https://sos-expat.com/dashboard",
        },
      });

      await logGA4Event("milestone_email_sent", {
        user_id: userId,
        milestone_type: after.lastMilestoneType || "",
        milestone_value: after.lastMilestoneValue || "",
      });

      console.log(`✅ Milestone email sent: ${userId} (${after.lastMilestoneType})`);
    } catch (error: any) {
      console.error(`❌ Error in handleMilestoneReached for ${userId}:`, error);
    }
  }
);

/**
 * FUNCTION: Handle Badge Unlocked
 * Trigger: onCreate on user_badges/{badgeId}
 * Sends a badge unlocked congratulations email
 *
 * Expected Firestore document structure (user_badges/{badgeId}):
 *   userId: string
 *   badgeName: string
 *   badgeIcon: string (URL)
 *   badgeDescription: string
 *   unlockedAt: Timestamp
 */
export const handleBadgeUnlocked = onDocumentCreated(
  {
    document: "user_badges/{badgeId}",
    region: "europe-west3",
    memory: "128MiB" as const,
    cpu: 0.083,
    maxInstances: 10,
    minInstances: 0,
    concurrency: 1,
  },
  async (event) => {
    const badge = event.data?.data();
    const badgeId = event.params.badgeId;

    if (!badge || !event.data) return;

    const { userId, badgeName, badgeIcon, badgeDescription } = badge;

    if (!userId) {
      console.warn(`⚠️ No userId for badge ${badgeId}`);
      return;
    }

    try {
      const mailwizz = new MailwizzAPI();

      const userDoc = await admin
        .firestore()
        .collection("users")
        .doc(userId)
        .get();

      if (!userDoc.exists) return;

      const user = userDoc.data();
      const lang = getLanguageCode(
        user?.language || user?.preferredLanguage || user?.lang || "en"
      );

      await mailwizz.sendTransactional({
        to: user?.email || userId,
        template: `TR_PRO_badge-unlocked_${lang}`,
        customFields: {
          FNAME: user?.firstName || "",
          BADGE_NAME: badgeName || "",
          BADGE_ICON: badgeIcon || "",
          BADGE_DESCRIPTION: badgeDescription || "",
          DASHBOARD_URL: "https://sos-expat.com/dashboard",
        },
      });

      // Update MailWizz subscriber with latest badge info
      try {
        await mailwizz.updateSubscriber(userId, {
          BADGE_NAME: badgeName || "",
          BADGE_ICON: badgeIcon || "",
          BADGE_DESCRIPTION: badgeDescription || "",
        });
      } catch (updateError) {
        console.error(`❌ Error updating badge fields in MailWizz:`, updateError);
      }

      await logGA4Event("badge_unlocked_email_sent", {
        user_id: userId,
        badge_id: badgeId,
        badge_name: badgeName || "",
      });

      console.log(`✅ Badge unlocked email sent: ${userId} (${badgeName})`);
    } catch (error: any) {
      console.error(`❌ Error in handleBadgeUnlocked for ${badgeId}:`, error);
    }
  }
);

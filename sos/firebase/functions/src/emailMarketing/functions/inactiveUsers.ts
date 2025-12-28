import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { MailwizzAPI } from "../utils/mailwizz";
import { logGA4Event } from "../utils/analytics";
import { getLanguageCode } from "../config";

/**
 * FUNCTION 15: Detect Inactive Users (Optional Scheduled Function)
 * 
 * Runs every 24 hours to find users inactive for 30+ days
 * and sends re-engagement emails via MailWizz
 */
export const detectInactiveUsers = onSchedule(
  {
    schedule: "every 24 hours",
    region: "europe-west1",
    timeZone: "UTC",
  },
  async (_event) => {
    console.log("🔄 Starting inactive users detection...");

    try {
      const mailwizz = new MailwizzAPI();
      const db = admin.firestore();
      const batchSize = 100;

      // Calculate 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
      let processedCount = 0;
      let emailsSent = 0;

      do {
        // Get users who haven't been active in 30+ days
        // Check both lastLoginAt and lastActivityAt fields
        let query = db
          .collection("users")
          .where("isActive", "==", true) // Only active users
          .limit(batchSize);

        if (lastDoc) {
          query = query.startAfter(lastDoc);
        }

        const snapshot = await query.get();

        if (snapshot.empty) {
          break;
        }

        for (const doc of snapshot.docs) {
          const user = doc.data();
          const userId = doc.id;

          // Determine last activity date
          let lastActivityDate: Date | null = null;

          if (user.lastActivityAt instanceof admin.firestore.Timestamp) {
            lastActivityDate = user.lastActivityAt.toDate();
          } else if (user.lastLoginAt instanceof admin.firestore.Timestamp) {
            lastActivityDate = user.lastLoginAt.toDate();
          } else if (user.lastLoginAt?.toDate) {
            lastActivityDate = user.lastLoginAt.toDate();
          } else if (user.lastActivityAt?.toDate) {
            lastActivityDate = user.lastActivityAt.toDate();
          }

          // Check if user is inactive (no activity in 30+ days)
          const isInactive = lastActivityDate && lastActivityDate < thirtyDaysAgo;

          // Skip if we've already sent re-engagement email in the last 7 days
          const lastReEngagementSent = user.lastReEngagementEmailSent;
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const alreadySentRecently = lastReEngagementSent instanceof admin.firestore.Timestamp
            ? lastReEngagementSent.toDate() > sevenDaysAgo
            : false;

          // Only process if inactive, not recently sent, has email, and lastActivityDate is not null
          if (isInactive && !alreadySentRecently && user.email && lastActivityDate) {
            try {
              // Calculate days inactive
              const daysInactive = Math.floor(
                (new Date().getTime() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
              );

              // Send re-engagement email
              const lang = getLanguageCode(
                user.language || user.preferredLanguage || user.lang || "en"
              );

              await mailwizz.sendTransactional({
                to: user.email,
                template: `TR_${user.role === "provider" ? "PRO" : "CLI"}_re-engagement_${lang}`,
                customFields: {
                  FNAME: user.firstName || "",
                  DAYS_INACTIVE: daysInactive.toString(),
                },
              });

              // Update MailWizz LAST_ACTIVITY field
              await mailwizz.updateSubscriber(userId, {
                LAST_ACTIVITY: lastActivityDate.toISOString(),
                INACTIVITY_DAYS: daysInactive.toString(),
              });

              // Mark re-engagement email as sent
              await db.collection("users").doc(userId).update({
                lastReEngagementEmailSent: admin.firestore.FieldValue.serverTimestamp(),
              });

              // Log GA4 event
              await logGA4Event("re_engagement_email_sent", {
                user_id: userId,
                role: user.role || "client",
                days_inactive: daysInactive.toString(),
              });

              emailsSent++;
              console.log(`✅ Re-engagement email sent to inactive user: ${userId}`);
            } catch (error: any) {
              console.error(`❌ Error sending re-engagement email to ${userId}:`, error);
            }
          }

          processedCount++;
        }

        lastDoc = snapshot.docs[snapshot.docs.length - 1];
      } while (lastDoc);

      console.log(
        `✅ Inactive users detection completed. Processed: ${processedCount}, Emails sent: ${emailsSent}`
      );
    } catch (error: any) {
      console.error("❌ Error in detectInactiveUsers scheduled function:", error);
      throw error;
    }
  }
);



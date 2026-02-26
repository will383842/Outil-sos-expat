import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";
import { MailwizzAPI } from "../utils/mailwizz";
import { logAutoresponderEvent } from "../utils/analytics";
// MAILWIZZ_API_KEY is now a static value from config.ts

/**
 * FUNCTION 10: Stop Autoresponders (Monitoring Function)
 * 
 * This scheduled function runs every hour to check for users who meet stop conditions
 * and automatically stops autoresponders for them.
 * 
 * Stop Conditions:
 * 1. Profile completed (profileCompleted === true)
 * 2. User became active (isActive === true)
 * 3. First call completed (totalCalls > 0)
 * 4. User went online (onlineStatus === true OR isOnline === true)
 * 5. KYC verified (kycStatus === 'verified')
 * 6. PayPal configured (paypalEmail exists)
 * 7. First login (lastLoginAt exists)
 */
/** Exported handler for consolidation */
export async function stopAutorespondersHandler(): Promise<void> {
  console.log("🔄 Starting autoresponder stop check...");

  try {
    const mailwizz = new MailwizzAPI();
    const db = admin.firestore();
    const batchSize = 100;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
    let processedCount = 0;
    let stoppedCount = 0;

    do {
      let query = db
        .collection("users")
        .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .limit(batchSize);
      if (lastDoc) { query = query.startAfter(lastDoc); }
      const snapshot = await query.get();
      if (snapshot.empty) { break; }

      for (const doc of snapshot.docs) {
        const user = doc.data();
        const userId = doc.id;
        const stopReasons: string[] = [];
        if (user.profileCompleted === true) stopReasons.push("profile_completed");
        if (user.isActive === true) stopReasons.push("user_active");
        if (user.totalCalls && user.totalCalls > 0) stopReasons.push("first_call_completed");
        if (user.isOnline === true || user.onlineStatus === true) stopReasons.push("user_online");
        if (user.kycStatus === "verified") stopReasons.push("kyc_verified");
        if (user.paypalEmail) stopReasons.push("paypal_configured");
        if (user.lastLoginAt) stopReasons.push("first_login");

        if (stopReasons.length > 0) {
          try {
            const userDoc = await db.collection("users").doc(userId).get();
            const hasStoppedAutoresponders = userDoc.data()?.autorespondersStopped === true;
            if (!hasStoppedAutoresponders) {
              await mailwizz.stopAutoresponders(userId, stopReasons.join(", "));
              await db.collection("users").doc(userId).update({
                autorespondersStopped: true,
                autorespondersStoppedAt: admin.firestore.FieldValue.serverTimestamp(),
                autorespondersStoppedReasons: stopReasons,
              });
              for (const reason of stopReasons) {
                await logAutoresponderEvent("stopped", `autoresponder_${reason}`, userId, reason);
              }
              stoppedCount++;
              console.log(`✅ Stopped autoresponders for user ${userId}: ${stopReasons.join(", ")}`);
            }
          } catch (error: any) {
            console.error(`❌ Error stopping autoresponders for ${userId}:`, error);
          }
        }
        processedCount++;
      }
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
    } while (lastDoc);

    console.log(`✅ Autoresponder stop check completed. Processed: ${processedCount}, Stopped: ${stoppedCount}`);
  } catch (error: any) {
    console.error("❌ Error in stopAutoresponders scheduled function:", error);
    throw error;
  }
}

export const stopAutoresponders = onSchedule(
  {
    schedule: "0 8 * * *",
    region: "europe-west3",
    cpu: 0.083,
    timeZone: "Europe/Paris",
  },
  stopAutorespondersHandler
);

/**
 * Helper function to stop autoresponders for a specific user
 * Can be called from other functions when a stop condition is detected
 */
export async function stopAutorespondersForUser(
  userId: string,
  reason: string,
  userData?: admin.firestore.DocumentData
): Promise<void> {
  try {
    const mailwizz = new MailwizzAPI();
    const db = admin.firestore();

    // Get user data if not provided
    if (!userData) {
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        console.warn(`⚠️ User ${userId} not found`);
        return;
      }
      userData = userDoc.data();
    }

    // Check if already stopped
    if (userData?.autorespondersStopped === true) {
      return;
    }

    // Stop autoresponders
    await mailwizz.stopAutoresponders(userId, reason);

    // Mark as stopped in Firestore
    await db.collection("users").doc(userId).update({
      autorespondersStopped: true,
      autorespondersStoppedAt: admin.firestore.FieldValue.serverTimestamp(),
      autorespondersStoppedReasons: admin.firestore.FieldValue.arrayUnion(reason),
    });

    // Log event
    await logAutoresponderEvent("stopped", `autoresponder_${reason}`, userId, reason);

    console.log(`✅ Stopped autoresponders for user ${userId}: ${reason}`);
  } catch (error: any) {
    console.error(`❌ Error stopping autoresponders for ${userId}:`, error);
  }
}


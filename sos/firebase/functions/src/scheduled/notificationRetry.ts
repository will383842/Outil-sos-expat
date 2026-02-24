/**
 * notificationRetry.ts
 *
 * P1-6 FIX: Retry mechanism for failed notifications
 *
 * Problem: When email/push notifications fail, they are lost forever.
 *
 * Solution: This scheduled function:
 * 1. Finds failed message_deliveries
 * 2. Retries them with exponential backoff
 * 3. Moves permanently failed to DLQ after max retries
 *
 * Runs every 15 minutes
 */

import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { logError } from "../utils/logs/logError";

// Configuration
const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  BACKOFF_MULTIPLIER: 2,  // Exponential backoff
  INITIAL_DELAY_MINUTES: 5,
  MAX_AGE_HOURS: 24,      // Don't retry notifications older than 24 hours
  BATCH_SIZE: 50,
};

/**
 * Scheduled retry function - runs every 4 hours
 * 2025-01-16: Garder à 4h pour notifications importantes (pas quotidien)
 */
export const notificationRetry = onSchedule(
  {
    schedule: "0 */4 * * *", // Every 4 hours (notifications = garder réactif)
    region: "europe-west3",
    timeZone: "Europe/Paris",
    timeoutSeconds: 300,
    memory: "512MiB",
    cpu: 0.083,
  },
  async () => {
    console.log("🔄 [NotificationRetry] Starting retry process...");
    const db = admin.firestore();

    const results = {
      retried: 0,
      succeeded: 0,
      movedToDLQ: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      await retryFailedNotifications(db, results);

      console.log("✅ [NotificationRetry] Retry completed:", results);

      // Log summary if any action was taken
      if (results.retried > 0 || results.movedToDLQ > 0) {
        await db.collection("admin_alerts").add({
          type: "notification_retry_summary",
          priority: results.movedToDLQ > 0 ? "medium" : "low",
          title: "Résumé retry notifications",
          message: `Retry: ${results.retried}, Succès: ${results.succeeded}, DLQ: ${results.movedToDLQ}`,
          results,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    } catch (error) {
      console.error("❌ [NotificationRetry] Retry failed:", error);
      await logError("notificationRetry", error);
    }
  }
);

/**
 * Find and retry failed notifications
 */
async function retryFailedNotifications(
  db: admin.firestore.Firestore,
  results: {
    retried: number;
    succeeded: number;
    movedToDLQ: number;
    skipped: number;
    errors: number;
  }
): Promise<void> {
  const maxAgeTime = new Date(
    Date.now() - RETRY_CONFIG.MAX_AGE_HOURS * 60 * 60 * 1000
  );

  console.log(`🔄 [NotificationRetry] Looking for failed deliveries...`);

  try {
    // Find failed deliveries that need retry
    const failedDeliveries = await db
      .collection("message_deliveries")
      .where("status", "==", "failed")
      .where("updatedAt", ">", admin.firestore.Timestamp.fromDate(maxAgeTime))
      .limit(RETRY_CONFIG.BATCH_SIZE)
      .get();

    if (failedDeliveries.empty) {
      console.log("🔄 [NotificationRetry] No failed deliveries to retry");
      return;
    }

    console.log(`🔄 [NotificationRetry] Found ${failedDeliveries.size} failed deliveries`);

    for (const deliveryDoc of failedDeliveries.docs) {
      const deliveryData = deliveryDoc.data();
      const retryCount = deliveryData.retryCount || 0;

      try {
        // Check if we should skip (already scheduled for retry)
        if (deliveryData.retryScheduledAt) {
          const scheduledTime = deliveryData.retryScheduledAt.toDate();
          if (scheduledTime > new Date()) {
            results.skipped++;
            continue;
          }
        }

        // Check if max retries exceeded
        if (retryCount >= RETRY_CONFIG.MAX_RETRIES) {
          // Move to DLQ
          await moveToDeadLetterQueue(db, deliveryDoc, deliveryData);
          results.movedToDLQ++;
          continue;
        }

        // Calculate next retry time
        const delayMinutes = RETRY_CONFIG.INITIAL_DELAY_MINUTES *
          Math.pow(RETRY_CONFIG.BACKOFF_MULTIPLIER, retryCount);

        // Create a new message_events entry to trigger the notification pipeline
        const originalEvent = await db
          .collection("message_events")
          .doc(deliveryData.eventDocId || deliveryData.messageEventId)
          .get();

        if (!originalEvent.exists) {
          console.warn(`⚠️ [NotificationRetry] Original event not found for ${deliveryDoc.id}`);
          // Mark as permanently failed
          await deliveryDoc.ref.update({
            status: "permanently_failed",
            failureReason: "Original message_events document not found",
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
          results.errors++;
          continue;
        }

        const originalEventData = originalEvent.data();

        // Create retry event
        const retryEventRef = await db.collection("message_events").add({
          ...originalEventData,
          isRetry: true,
          retryOf: deliveryData.eventDocId || deliveryData.messageEventId,
          retryCount: retryCount + 1,
          retryChannel: deliveryData.channel, // Only retry the failed channel
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Update the failed delivery
        await deliveryDoc.ref.update({
          status: "retrying",
          retryCount: retryCount + 1,
          retryEventId: retryEventRef.id,
          lastRetryAt: admin.firestore.FieldValue.serverTimestamp(),
          nextRetryAt: new Date(Date.now() + delayMinutes * 60 * 1000),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        results.retried++;
        console.log(`🔄 [NotificationRetry] Scheduled retry ${retryCount + 1} for ${deliveryDoc.id}`);

      } catch (error) {
        console.error(`❌ [NotificationRetry] Error retrying ${deliveryDoc.id}:`, error);
        results.errors++;
      }
    }
  } catch (error) {
    console.error("❌ [NotificationRetry] Error in retryFailedNotifications:", error);
    results.errors++;
  }
}

/**
 * Move permanently failed notification to Dead Letter Queue
 */
async function moveToDeadLetterQueue(
  db: admin.firestore.Firestore,
  deliveryDoc: admin.firestore.QueryDocumentSnapshot,
  deliveryData: admin.firestore.DocumentData
): Promise<void> {
  const batch = db.batch();

  // Add to DLQ
  const dlqRef = db.collection("notification_dlq").doc(deliveryDoc.id);
  batch.set(dlqRef, {
    ...deliveryData,
    movedToDLQAt: admin.firestore.FieldValue.serverTimestamp(),
    finalStatus: "permanently_failed",
    totalRetries: deliveryData.retryCount || 0,
    originalDeliveryId: deliveryDoc.id,
  });

  // Update original delivery
  batch.update(deliveryDoc.ref, {
    status: "moved_to_dlq",
    movedToDLQAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  await batch.commit();
  console.log(`📭 [NotificationRetry] Moved ${deliveryDoc.id} to DLQ after ${deliveryData.retryCount} retries`);
}

/**
 * Manual retry trigger for admin
 */
export const triggerNotificationRetry = onCall(
  {
    region: "europe-west3",
    cpu: 0.083,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Verify admin role
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || !["admin", "dev"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Only admins can trigger retry");
    }

    const results = {
      retried: 0,
      succeeded: 0,
      movedToDLQ: 0,
      skipped: 0,
      errors: 0,
    };

    try {
      await retryFailedNotifications(db, results);
      return {
        success: true,
        results,
        triggeredBy: request.auth.uid,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new HttpsError("internal", "Retry failed");
    }
  }
);

/**
 * Retry a specific failed delivery
 */
export const retrySpecificDelivery = onCall(
  {
    region: "europe-west3",
    cpu: 0.083,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { deliveryId } = request.data;

    if (!deliveryId) {
      throw new HttpsError("invalid-argument", "deliveryId is required");
    }

    // Verify admin role
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData?.role || !["admin", "dev"].includes(userData.role)) {
      throw new HttpsError("permission-denied", "Only admins can retry deliveries");
    }

    try {
      const deliveryDoc = await db.collection("message_deliveries").doc(deliveryId).get();

      if (!deliveryDoc.exists) {
        throw new HttpsError("not-found", "Delivery not found");
      }

      const deliveryData = deliveryDoc.data()!;

      // Get original event
      const originalEvent = await db
        .collection("message_events")
        .doc(deliveryData.eventDocId || deliveryData.messageEventId)
        .get();

      if (!originalEvent.exists) {
        throw new HttpsError("not-found", "Original event not found");
      }

      // Create retry event
      const retryEventRef = await db.collection("message_events").add({
        ...originalEvent.data(),
        isRetry: true,
        retryOf: deliveryData.eventDocId || deliveryData.messageEventId,
        retryCount: (deliveryData.retryCount || 0) + 1,
        manualRetry: true,
        retriedBy: request.auth.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update delivery
      await deliveryDoc.ref.update({
        status: "retrying",
        retryEventId: retryEventRef.id,
        manualRetryAt: admin.firestore.FieldValue.serverTimestamp(),
        manualRetryBy: request.auth.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        success: true,
        retryEventId: retryEventRef.id,
        deliveryId,
      };
    } catch (error) {
      console.error(`❌ [retrySpecificDelivery] Error for ${deliveryId}:`, error);
      throw new HttpsError("internal", "Retry failed");
    }
  }
);

/**
 * Get DLQ statistics
 */
export const getDLQStats = onCall(
  {
    region: "europe-west3",
    cpu: 0.083,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = admin.firestore();

    try {
      const dlqSnapshot = await db.collection("notification_dlq").get();

      const byChannel: Record<string, number> = {};
      const byEventType: Record<string, number> = {};

      dlqSnapshot.docs.forEach(doc => {
        const data = doc.data();
        const channel = data.channel || "unknown";
        const eventType = data.eventId || "unknown";

        byChannel[channel] = (byChannel[channel] || 0) + 1;
        byEventType[eventType] = (byEventType[eventType] || 0) + 1;
      });

      return {
        total: dlqSnapshot.size,
        byChannel,
        byEventType,
      };
    } catch (error) {
      console.error("❌ [getDLQStats] Error:", error);
      throw new HttpsError("internal", "Failed to get DLQ stats");
    }
  }
);

/**
 * Chatter Push Notifications using Firebase Cloud Messaging (FCM)
 *
 * This module handles all push notifications for the chatter system:
 * 1. COMMISSION_EARNED - After any commission is created
 * 2. TEAM_MEMBER_ACTIVATED - When a referral makes their 2nd call
 * 3. TEAM_MEMBER_INACTIVE - When member inactive for X days (scheduled)
 * 4. TIER_BONUS_UNLOCKED - When chatter reaches 5, 10, 25, 50, or 100 active members
 * 5. NEAR_TOP_3 - When user is close to Top 3 (scheduled)
 * 6. FLASH_BONUS_START - When admin activates flash bonus
 *
 * FCM tokens are stored in: chatters/{uid}/fcmTokens/{tokenId}
 */

import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, WriteBatch } from "firebase-admin/firestore";
import { getMessaging, MulticastMessage } from "firebase-admin/messaging";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import { triggerConfig, scheduledConfig, adminConfig } from "../lib/functionConfigs";
import { Chatter, ChatterCommission } from "./types";
import { getChatterConfig } from "./chatterConfig";

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function ensureInitialized() {
  if (!IS_DEPLOYMENT_ANALYSIS && !getApps().length) {
    initializeApp();
  }
}

function getDb() {
  ensureInitialized();
  return getFirestore();
}

function getFcmMessaging() {
  ensureInitialized();
  return getMessaging();
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Notification types for the chatter system
 */
export type ChatterNotificationType =
  | "COMMISSION_EARNED"
  | "TEAM_MEMBER_ACTIVATED"
  | "TEAM_MEMBER_INACTIVE"
  | "TIER_BONUS_UNLOCKED"
  | "NEAR_TOP_3"
  | "FLASH_BONUS_START";

/**
 * FCM Token document stored in chatters/{uid}/fcmTokens/{tokenId}
 */
export interface ChatterFcmToken {
  /** FCM token string */
  token: string;
  /** Device identifier (optional) */
  deviceId?: string;
  /** Platform: web, android, ios */
  platform: "web" | "android" | "ios";
  /** User agent string */
  userAgent?: string;
  /** When the token was registered */
  createdAt: Timestamp;
  /** When the token was last used */
  lastUsedAt: Timestamp;
  /** Whether the token is still valid */
  isValid: boolean;
}

/**
 * Notification payload structure
 */
interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  deepLink?: string;
}

// ============================================================================
// HELPER: SEND CHATTER NOTIFICATION
// ============================================================================

/**
 * Send a push notification to a chatter
 *
 * @param chatterId - The chatter's UID
 * @param payload - Notification title, body, and optional data
 * @returns Number of successful sends
 */
export async function sendChatterNotification(
  chatterId: string,
  payload: NotificationPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  const db = getDb();
  const messaging = getFcmMessaging();

  try {
    // Get all valid FCM tokens for this chatter
    const tokensSnapshot = await db
      .collection("chatters")
      .doc(chatterId)
      .collection("fcmTokens")
      .where("isValid", "==", true)
      .get();

    if (tokensSnapshot.empty) {
      logger.info("[sendChatterNotification] No valid FCM tokens found", { chatterId });
      return { success: true, sent: 0, failed: 0 };
    }

    const tokens = tokensSnapshot.docs.map((doc) => doc.data().token as string);

    // Build multicast message
    const message: MulticastMessage = {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        ...payload.data,
        type: payload.data?.type || "chatter_notification",
        deepLink: payload.deepLink || "/chatter/dashboard",
        timestamp: Date.now().toString(),
      },
      webpush: {
        fcmOptions: {
          link: payload.deepLink || "/chatter/dashboard",
        },
        notification: {
          icon: "/icons/icon-192x192.png",
          badge: "/icons/badge-72x72.png",
          vibrate: [200, 100, 200],
        },
      },
      android: {
        priority: "high",
        notification: {
          icon: "ic_notification",
          color: "#4F46E5",
          clickAction: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: {
          aps: {
            badge: 1,
            sound: "default",
          },
        },
      },
    };

    // Send multicast
    const response = await messaging.sendEachForMulticast(message);

    // Handle invalid tokens
    const invalidTokenDocs: string[] = [];
    response.responses.forEach((resp, idx) => {
      if (!resp.success) {
        const error = resp.error;
        // Mark token as invalid if it's a permanent error
        if (
          error?.code === "messaging/invalid-registration-token" ||
          error?.code === "messaging/registration-token-not-registered"
        ) {
          const tokenDoc = tokensSnapshot.docs[idx];
          invalidTokenDocs.push(tokenDoc.id);
        }
      }
    });

    // Mark invalid tokens
    if (invalidTokenDocs.length > 0) {
      const batch = db.batch();
      for (const docId of invalidTokenDocs) {
        const tokenRef = db
          .collection("chatters")
          .doc(chatterId)
          .collection("fcmTokens")
          .doc(docId);
        batch.update(tokenRef, { isValid: false });
      }
      await batch.commit();

      logger.info("[sendChatterNotification] Marked invalid tokens", {
        chatterId,
        count: invalidTokenDocs.length,
      });
    }

    logger.info("[sendChatterNotification] Notification sent", {
      chatterId,
      title: payload.title,
      sent: response.successCount,
      failed: response.failureCount,
    });

    return {
      success: true,
      sent: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    logger.error("[sendChatterNotification] Error", { chatterId, error });
    return { success: false, sent: 0, failed: 0 };
  }
}

/**
 * Send notification to multiple chatters
 */
export async function sendChatterNotificationBulk(
  chatterIds: string[],
  payload: NotificationPayload
): Promise<{ totalSent: number; totalFailed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  // Process in batches of 10 to avoid overwhelming FCM
  const batchSize = 10;
  for (let i = 0; i < chatterIds.length; i += batchSize) {
    const batch = chatterIds.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map((chatterId) => sendChatterNotification(chatterId, payload))
    );

    for (const result of results) {
      totalSent += result.sent;
      totalFailed += result.failed;
    }
  }

  return { totalSent, totalFailed };
}

// ============================================================================
// 1. COMMISSION_EARNED - Triggered when a commission is created
// ============================================================================

/**
 * Send notification when a commission is created
 */
export const chatterNotifyCommissionEarned = onDocumentCreated(
  {
    ...triggerConfig,
    document: "chatter_commissions/{commissionId}",
  },
  async (event) => {
    ensureInitialized();

    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[chatterNotifyCommissionEarned] No snapshot data");
      return;
    }

    const commission = snapshot.data() as ChatterCommission;
    const { chatterId, amount, type } = commission;

    // Format amount in dollars
    const amountFormatted = (amount / 100).toFixed(2);

    // Build reason based on commission type
    let reason = "Commission";
    switch (type) {
      case "client_call":
        reason = "Appel client";
        break;
      case "n1_call":
        reason = "Appel de votre filleul N1";
        break;
      case "n2_call":
        reason = "Appel de votre filleul N2";
        break;
      case "activation_bonus":
        reason = "Bonus activation filleul";
        break;
      case "n1_recruit_bonus":
        reason = "Bonus recrutement N1";
        break;
      case "tier_bonus":
        reason = "Bonus palier atteint";
        break;
      case "bonus_level":
        reason = "Bonus niveau";
        break;
      case "bonus_streak":
        reason = "Bonus streak";
        break;
      case "bonus_top3":
        reason = "Bonus Top 3";
        break;
      case "bonus_zoom":
        reason = "Bonus Zoom";
        break;
      case "bonus_social":
        reason = "Bonus likes reseaux sociaux";
        break;
      case "client_referral":
        reason = "Parrainage client";
        break;
      case "recruitment":
        reason = "Recrutement prestataire";
        break;
      default:
        reason = commission.description || "Commission";
    }

    await sendChatterNotification(chatterId, {
      title: "Ka-ching !",
      body: `+${amountFormatted}$ - ${reason}`,
      data: {
        type: "COMMISSION_EARNED",
        commissionId: commission.id,
        amount: amountFormatted,
        commissionType: type,
      },
      deepLink: "/chatter/dashboard",
    });
  }
);

// ============================================================================
// 2. TEAM_MEMBER_ACTIVATED - When a referral makes their 2nd call
// ============================================================================

/**
 * Send notification when a team member (filleul) is activated
 * Triggered when chatter.isActivated changes from false to true
 */
export const chatterNotifyTeamMemberActivated = onDocumentUpdated(
  {
    ...triggerConfig,
    document: "chatters/{chatterId}",
  },
  async (event) => {
    ensureInitialized();

    const beforeData = event.data?.before.data() as Chatter | undefined;
    const afterData = event.data?.after.data() as Chatter | undefined;

    if (!beforeData || !afterData) {
      return;
    }

    // Check if isActivated changed from false to true
    if (beforeData.isActivated === false && afterData.isActivated === true) {
      // This chatter just got activated - notify their recruiter
      const recruiterId = afterData.recruitedBy;

      if (!recruiterId) {
        logger.info("[chatterNotifyTeamMemberActivated] No recruiter found", {
          chatterId: event.params.chatterId,
        });
        return;
      }

      const filleulName = `${afterData.firstName} ${afterData.lastName.charAt(0)}.`;

      await sendChatterNotification(recruiterId, {
        title: "Bonus activation !",
        body: `+5$ - ${filleulName} vient de faire son 2e appel`,
        data: {
          type: "TEAM_MEMBER_ACTIVATED",
          filleulId: event.params.chatterId,
          filleulName,
        },
        deepLink: "/chatter/referrals",
      });

      logger.info("[chatterNotifyTeamMemberActivated] Notification sent", {
        recruiterId,
        filleulId: event.params.chatterId,
        filleulName,
      });
    }
  }
);

// ============================================================================
// 3. TEAM_MEMBER_INACTIVE - Scheduled function for inactive alerts
// ============================================================================

/**
 * Check for inactive team members and notify their recruiters
 * Runs daily at 10:00 AM Europe/Paris
 */
export const chatterNotifyInactiveMembers = onSchedule(
  {
    ...scheduledConfig,
    schedule: "0 10 * * *", // Every day at 10:00 AM
    timeZone: "Europe/Paris",
    timeoutSeconds: 300,
  },
  async () => {
    ensureInitialized();
    const db = getDb();

    try {
      // Get config for inactivity threshold
      const config = await getChatterConfig();
      const inactiveDays = config.thresholds?.inactiveAlertDays || 7;

      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - inactiveDays);
      const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

      // Find inactive chatters who have a recruiter
      const inactiveQuery = await db
        .collection("chatters")
        .where("status", "==", "active")
        .where("recruitedBy", "!=", null)
        .where("updatedAt", "<", cutoffTimestamp)
        .limit(100)
        .get();

      if (inactiveQuery.empty) {
        logger.info("[chatterNotifyInactiveMembers] No inactive members found");
        return;
      }

      // Group by recruiter to avoid spam
      const recruiterNotifications = new Map<
        string,
        Array<{ name: string; days: number; chatterId: string }>
      >();

      for (const doc of inactiveQuery.docs) {
        const chatter = doc.data() as Chatter;

        if (!chatter.recruitedBy) continue;

        // Check if we already sent a notification recently (within 3 days)
        const recentNotifQuery = await db
          .collection("chatter_notifications")
          .where("chatterId", "==", chatter.recruitedBy)
          .where("type", "==", "team_member_inactive")
          .where("data.filleulId", "==", doc.id)
          .where("createdAt", ">", Timestamp.fromMillis(Date.now() - 3 * 24 * 60 * 60 * 1000))
          .limit(1)
          .get();

        if (!recentNotifQuery.empty) {
          continue; // Already notified recently
        }

        // Calculate days of inactivity
        const lastUpdate = chatter.updatedAt?.toDate() || new Date(0);
        const daysSinceActivity = Math.floor(
          (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24)
        );

        const existing = recruiterNotifications.get(chatter.recruitedBy) || [];
        existing.push({
          name: `${chatter.firstName} ${chatter.lastName.charAt(0)}.`,
          days: daysSinceActivity,
          chatterId: doc.id,
        });
        recruiterNotifications.set(chatter.recruitedBy, existing);
      }

      // Send notifications to recruiters
      let notificationsSent = 0;

      for (const [recruiterId, inactiveMembers] of Array.from(recruiterNotifications.entries())) {
        // Send one notification per inactive member (up to 3 per recruiter)
        const toNotify = inactiveMembers.slice(0, 3);

        for (const member of toNotify) {
          await sendChatterNotification(recruiterId, {
            title: `${member.name} est inactif`,
            body: `Aucune activite depuis ${member.days} jours. Envoie-lui un message ?`,
            data: {
              type: "TEAM_MEMBER_INACTIVE",
              filleulId: member.chatterId,
              filleulName: member.name,
              daysSinceActivity: member.days.toString(),
            },
            deepLink: "/chatter/referrals",
          });

          // Store notification record to avoid duplicates
          await db.collection("chatter_notifications").add({
            chatterId: recruiterId,
            type: "team_member_inactive",
            title: `${member.name} est inactif`,
            message: `Aucune activite depuis ${member.days} jours.`,
            data: {
              filleulId: member.chatterId,
              filleulName: member.name,
              daysSinceActivity: member.days,
            },
            isRead: false,
            emailSent: false,
            createdAt: Timestamp.now(),
          });

          notificationsSent++;
        }
      }

      logger.info("[chatterNotifyInactiveMembers] Notifications sent", {
        recruitersNotified: recruiterNotifications.size,
        notificationsSent,
      });
    } catch (error) {
      logger.error("[chatterNotifyInactiveMembers] Error", { error });
    }
  }
);

// ============================================================================
// 4. TIER_BONUS_UNLOCKED - When chatter reaches milestone
// ============================================================================

/**
 * Notify when a chatter unlocks a tier bonus (5, 10, 25, 50, or 100 active members)
 * Triggered when tierBonusesPaid array is updated
 */
export const chatterNotifyTierBonusUnlocked = onDocumentUpdated(
  {
    ...triggerConfig,
    document: "chatters/{chatterId}",
  },
  async (event) => {
    ensureInitialized();

    const beforeData = event.data?.before.data() as Chatter | undefined;
    const afterData = event.data?.after.data() as Chatter | undefined;

    if (!beforeData || !afterData) {
      return;
    }

    const beforeTiers = beforeData.tierBonusesPaid || [];
    const afterTiers = afterData.tierBonusesPaid || [];

    // Check if a new tier was added
    const newTiers = afterTiers.filter((tier) => !beforeTiers.includes(tier));

    if (newTiers.length === 0) {
      return;
    }

    // Get config for bonus amounts
    const config = await getChatterConfig();
    const tierAmounts: Record<number, number> = config.tierBonuses || {
      5: 2500,
      10: 7500,
      25: 20000,
      50: 50000,
      100: 150000,
    };

    for (const tier of newTiers) {
      const bonusAmount = tierAmounts[tier] || 0;
      const amountFormatted = (bonusAmount / 100).toFixed(0);

      await sendChatterNotification(event.params.chatterId, {
        title: "BONUS DEBLOQUE !",
        body: `+${amountFormatted}$ pour ${tier} equipiers actifs !`,
        data: {
          type: "TIER_BONUS_UNLOCKED",
          tier: tier.toString(),
          bonusAmount: amountFormatted,
        },
        deepLink: "/chatter/referrals",
      });

      logger.info("[chatterNotifyTierBonusUnlocked] Notification sent", {
        chatterId: event.params.chatterId,
        tier,
        bonusAmount,
      });
    }
  }
);

// ============================================================================
// 5. NEAR_TOP_3 - Scheduled function for leaderboard alerts
// ============================================================================

/**
 * Check chatters who are close to Top 3 and notify them
 * Runs daily at 6:00 PM Europe/Paris
 */
export const chatterNotifyNearTop3 = onSchedule(
  {
    ...scheduledConfig,
    schedule: "0 18 * * *", // Every day at 6:00 PM
    timeZone: "Europe/Paris",
    timeoutSeconds: 300,
  },
  async () => {
    ensureInitialized();
    const db = getDb();

    try {
      // Get current month
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Get the monthly ranking (or calculate on the fly)
      const rankingDoc = await db
        .collection("chatter_monthly_rankings")
        .doc(currentMonth)
        .get();

      interface RankingEntry {
        chatterId: string;
        monthlyEarnings: number;
        monthlyClients: number;
      }

      let rankings: RankingEntry[] = [];

      if (rankingDoc.exists) {
        const data = rankingDoc.data();
        rankings = data?.rankings || [];
      } else {
        // Calculate rankings on the fly
        const startOfMonth = new Date(`${currentMonth}-01T00:00:00.000Z`);
        const endOfMonth = new Date(startOfMonth);
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);

        // Get all active chatters with their monthly commissions
        const chattersSnapshot = await db
          .collection("chatters")
          .where("status", "==", "active")
          .get();

        const earningsMap = new Map<string, { earnings: number; clients: number }>();

        // Calculate earnings for each chatter
        for (const chatterDoc of chattersSnapshot.docs) {
          const commissionsQuery = await db
            .collection("chatter_commissions")
            .where("chatterId", "==", chatterDoc.id)
            .where("createdAt", ">=", Timestamp.fromDate(startOfMonth))
            .where("createdAt", "<", Timestamp.fromDate(endOfMonth))
            .where("status", "!=", "cancelled")
            .get();

          let earnings = 0;
          let clients = 0;

          for (const commDoc of commissionsQuery.docs) {
            const comm = commDoc.data() as ChatterCommission;
            earnings += comm.amount;
            if (comm.type === "client_referral" || comm.type === "client_call") {
              clients++;
            }
          }

          if (earnings > 0) {
            earningsMap.set(chatterDoc.id, { earnings, clients });
          }
        }

        // Sort by earnings
        rankings = Array.from(earningsMap.entries())
          .map(([chatterId, data]) => ({
            chatterId,
            monthlyEarnings: data.earnings,
            monthlyClients: data.clients,
          }))
          .sort((a, b) => b.monthlyEarnings - a.monthlyEarnings);
      }

      if (rankings.length < 4) {
        logger.info("[chatterNotifyNearTop3] Not enough participants", {
          count: rankings.length,
        });
        return;
      }

      // Get Top 3 threshold (3rd place earnings)
      const top3Threshold = rankings[2]?.monthlyEarnings || 0;

      // Find chatters in positions 4-10 who are within 20% of Top 3
      const nearTop3Chatters: Array<{ chatterId: string; diff: number; rank: number }> = [];

      for (let i = 3; i < Math.min(10, rankings.length); i++) {
        const chatter = rankings[i];
        const diff = top3Threshold - chatter.monthlyEarnings;
        const diffPercent = top3Threshold > 0 ? diff / top3Threshold : 1;

        // Within 20% of Top 3
        if (diffPercent <= 0.2 && diff > 0) {
          nearTop3Chatters.push({
            chatterId: chatter.chatterId,
            diff: Math.ceil(diff / 100), // Convert to whole dollars
            rank: i + 1,
          });
        }
      }

      // Send notifications
      let notificationsSent = 0;

      for (const chatter of nearTop3Chatters) {
        // Check if we already notified today
        const recentNotifQuery = await db
          .collection("chatter_notifications")
          .where("chatterId", "==", chatter.chatterId)
          .where("type", "==", "near_top_3")
          .where("createdAt", ">", Timestamp.fromMillis(Date.now() - 24 * 60 * 60 * 1000))
          .limit(1)
          .get();

        if (!recentNotifQuery.empty) {
          continue; // Already notified today
        }

        // Using "appels d'equipe" (team calls) as proxy for earnings gap
        // Assuming ~$10 per call average
        const callsNeeded = Math.max(1, Math.ceil(chatter.diff / 10));

        await sendChatterNotification(chatter.chatterId, {
          title: "Top 3 en vue !",
          body: `Plus que ${callsNeeded} appels d'equipe pour le Top 3 !`,
          data: {
            type: "NEAR_TOP_3",
            currentRank: chatter.rank.toString(),
            callsNeeded: callsNeeded.toString(),
            amountNeeded: chatter.diff.toString(),
          },
          deepLink: "/chatter/leaderboard",
        });

        // Store notification record
        await db.collection("chatter_notifications").add({
          chatterId: chatter.chatterId,
          type: "near_top_3",
          title: "Top 3 en vue !",
          message: `Plus que ${callsNeeded} appels d'equipe pour le Top 3 !`,
          data: {
            currentRank: chatter.rank,
            callsNeeded,
            amountNeeded: chatter.diff,
          },
          isRead: false,
          emailSent: false,
          createdAt: Timestamp.now(),
        });

        notificationsSent++;
      }

      logger.info("[chatterNotifyNearTop3] Notifications sent", {
        nearTop3Count: nearTop3Chatters.length,
        notificationsSent,
      });
    } catch (error) {
      logger.error("[chatterNotifyNearTop3] Error", { error });
    }
  }
);

// ============================================================================
// 6. FLASH_BONUS_START - Admin callable to notify all chatters
// ============================================================================

/**
 * Send flash bonus notification to all active chatters
 * Called by admin when activating a flash bonus
 */
export const chatterNotifyFlashBonusStart = onCall(
  {
    ...adminConfig,
    timeoutSeconds: 300,
  },
  async (request): Promise<{ success: boolean; notified: number; error?: string }> => {
    ensureInitialized();
    const db = getDb();

    // Check admin authentication
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { multiplier, hours } = request.data as { multiplier: number; hours: number };

    if (!multiplier || !hours) {
      throw new HttpsError(
        "invalid-argument",
        "multiplier and hours are required"
      );
    }

    try {
      // Get all active chatters
      const chattersSnapshot = await db
        .collection("chatters")
        .where("status", "==", "active")
        .select() // Only get document IDs
        .get();

      const chatterIds = chattersSnapshot.docs.map((doc) => doc.id);

      if (chatterIds.length === 0) {
        return { success: true, notified: 0 };
      }

      // Send bulk notification
      const result = await sendChatterNotificationBulk(chatterIds, {
        title: "FLASH BONUS !",
        body: `x${multiplier} sur tous les gains pendant ${hours}h !`,
        data: {
          type: "FLASH_BONUS_START",
          multiplier: multiplier.toString(),
          hours: hours.toString(),
        },
        deepLink: "/chatter/dashboard",
      });

      // Store notification for each chatter (batch write)
      const now = Timestamp.now();
      const batches: WriteBatch[] = [];
      let currentBatch = db.batch();
      let operationCount = 0;

      for (const chatterId of chatterIds) {
        const notifRef = db.collection("chatter_notifications").doc();
        currentBatch.set(notifRef, {
          chatterId,
          type: "flash_bonus_start",
          title: "FLASH BONUS !",
          message: `x${multiplier} sur tous les gains pendant ${hours}h !`,
          data: {
            multiplier,
            hours,
          },
          isRead: false,
          emailSent: false,
          createdAt: now,
        });

        operationCount++;
        if (operationCount >= 500) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          operationCount = 0;
        }
      }

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      // Commit all batches
      await Promise.all(batches.map((batch) => batch.commit()));

      logger.info("[chatterNotifyFlashBonusStart] Notifications sent", {
        adminId: request.auth.uid,
        multiplier,
        hours,
        chattersNotified: chatterIds.length,
        pushSent: result.totalSent,
        pushFailed: result.totalFailed,
      });

      return { success: true, notified: chatterIds.length };
    } catch (error) {
      logger.error("[chatterNotifyFlashBonusStart] Error", { error });
      throw new HttpsError("internal", "Failed to send notifications");
    }
  }
);

// ============================================================================
// FCM TOKEN MANAGEMENT - Callables for client-side token registration
// ============================================================================

/**
 * Register an FCM token for push notifications
 */
export const chatterRegisterFcmToken = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 30,
  },
  async (request): Promise<{ success: boolean; tokenId?: string; error?: string }> => {
    ensureInitialized();
    const db = getDb();

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { token, platform, deviceId, userAgent } = request.data as {
      token: string;
      platform: "web" | "android" | "ios";
      deviceId?: string;
      userAgent?: string;
    };

    if (!token || !platform) {
      throw new HttpsError("invalid-argument", "token and platform are required");
    }

    try {
      const uid = request.auth.uid;
      const now = Timestamp.now();

      // Check if token already exists (by token value, not deviceId)
      const existingQuery = await db
        .collection("chatters")
        .doc(uid)
        .collection("fcmTokens")
        .where("token", "==", token)
        .limit(1)
        .get();

      if (!existingQuery.empty) {
        // Update existing token
        const existingDoc = existingQuery.docs[0];
        await existingDoc.ref.update({
          isValid: true,
          lastUsedAt: now,
          userAgent: userAgent || existingDoc.data().userAgent,
        });

        return { success: true, tokenId: existingDoc.id };
      }

      // Create new token
      const tokenRef = db
        .collection("chatters")
        .doc(uid)
        .collection("fcmTokens")
        .doc();

      const tokenData: ChatterFcmToken = {
        token,
        platform,
        deviceId,
        userAgent,
        createdAt: now,
        lastUsedAt: now,
        isValid: true,
      };

      await tokenRef.set(tokenData);

      logger.info("[chatterRegisterFcmToken] Token registered", {
        uid,
        platform,
        tokenId: tokenRef.id,
      });

      return { success: true, tokenId: tokenRef.id };
    } catch (error) {
      logger.error("[chatterRegisterFcmToken] Error", { error });
      throw new HttpsError("internal", "Failed to register token");
    }
  }
);

/**
 * Unregister an FCM token (logout or disable notifications)
 */
export const chatterUnregisterFcmToken = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.1,
    minInstances: 0,
    timeoutSeconds: 30,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();
    const db = getDb();

    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required");
    }

    const { token } = request.data as { token: string };

    if (!token) {
      throw new HttpsError("invalid-argument", "token is required");
    }

    try {
      const uid = request.auth.uid;

      // Find and mark token as invalid
      const tokenQuery = await db
        .collection("chatters")
        .doc(uid)
        .collection("fcmTokens")
        .where("token", "==", token)
        .limit(1)
        .get();

      if (!tokenQuery.empty) {
        await tokenQuery.docs[0].ref.update({ isValid: false });
      }

      logger.info("[chatterUnregisterFcmToken] Token unregistered", { uid });

      return { success: true };
    } catch (error) {
      logger.error("[chatterUnregisterFcmToken] Error", { error });
      throw new HttpsError("internal", "Failed to unregister token");
    }
  }
);


/**
 * Telegram Admin Query Callable Functions
 *
 * Read-only admin callables for querying Telegram notification data:
 * - telegram_getNotificationLogs: Logs with pagination + filters
 * - telegram_getQueueStats: Queue depth, daily stats, 7-day chart
 * - telegram_getSubscriberStats: Subscriber breakdown by role
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[TelegramAdminQueries]";

const FIRESTORE_PATHS = {
  LOGS: "telegram_admin_logs",
  QUEUE: "telegram_message_queue",
  RATE_MONITOR: "telegram_rate_monitor",
  USERS: "users",
} as const;

// ============================================================================
// LAZY INITIALIZATION
// ============================================================================

const IS_DEPLOYMENT_ANALYSIS =
  !process.env.K_REVISION &&
  !process.env.K_SERVICE &&
  !process.env.FUNCTION_TARGET &&
  !process.env.FUNCTIONS_EMULATOR;

function ensureInitialized(): void {
  if (!IS_DEPLOYMENT_ANALYSIS && !getApps().length) {
    initializeApp();
  }
}

function getDb() {
  ensureInitialized();
  return getFirestore();
}

// ============================================================================
// AUTH HELPER
// ============================================================================

function assertAdmin(ctx: { auth?: { uid?: string; token?: Record<string, unknown> } }): void {
  const uid = ctx?.auth?.uid;
  const claims = ctx?.auth?.token;
  if (!uid) {
    throw new HttpsError("unauthenticated", "Authentication required.");
  }
  const isAdmin = claims?.admin === true || claims?.role === "admin";
  if (!isAdmin) {
    throw new HttpsError("permission-denied", "Admin access required.");
  }
}

// ============================================================================
// telegram_getNotificationLogs
// ============================================================================

interface GetLogsRequest {
  eventType?: string;
  status?: "sent" | "failed";
  startDate?: string; // ISO string
  endDate?: string;   // ISO string
  limit?: number;
  startAfter?: string; // doc ID for cursor pagination
}

export const telegram_getNotificationLogs = onCall(
  {
    region: "europe-west1",
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    const { eventType, status, startDate, endDate, limit: reqLimit, startAfter } =
      (req.data || {}) as GetLogsRequest;

    console.log(`${LOG_PREFIX} telegram_getNotificationLogs called by ${req.auth?.uid}`);

    const db = getDb();
    const pageSize = Math.min(reqLimit || 50, 100);

    let query = db
      .collection(FIRESTORE_PATHS.LOGS)
      .orderBy("sentAt", "desc")
      .limit(pageSize);

    if (eventType) {
      query = query.where("eventType", "==", eventType);
    }

    if (status) {
      query = query.where("status", "==", status);
    }

    if (startDate) {
      query = query.where("sentAt", ">=", Timestamp.fromDate(new Date(startDate)));
    }

    if (endDate) {
      query = query.where("sentAt", "<=", Timestamp.fromDate(new Date(endDate)));
    }

    if (startAfter) {
      const cursorDoc = await db.collection(FIRESTORE_PATHS.LOGS).doc(startAfter).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();

    const logs = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        eventType: data.eventType,
        status: data.status,
        recipientChatId: data.recipientChatId || "",
        errorMessage: data.errorMessage || null,
        telegramMessageId: data.telegramMessageId || null,
        sentAt: data.sentAt?.toDate?.()?.toISOString() || null,
      };
    });

    const lastDocId = snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

    return {
      logs,
      nextCursor: logs.length === pageSize ? lastDocId : null,
      count: logs.length,
    };
  }
);

// ============================================================================
// telegram_getQueueStats
// ============================================================================

export const telegram_getQueueStats = onCall(
  {
    region: "europe-west1",
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    console.log(`${LOG_PREFIX} telegram_getQueueStats called by ${req.auth?.uid}`);

    const db = getDb();

    // 1. Queue depth (pending + sending)
    const pendingSnap = await db
      .collection(FIRESTORE_PATHS.QUEUE)
      .where("status", "==", "pending")
      .count()
      .get();
    const sendingSnap = await db
      .collection(FIRESTORE_PATHS.QUEUE)
      .where("status", "==", "sending")
      .count()
      .get();
    const deadSnap = await db
      .collection(FIRESTORE_PATHS.QUEUE)
      .where("status", "==", "dead")
      .count()
      .get();

    const pendingCount = pendingSnap.data().count;
    const sendingCount = sendingSnap.data().count;
    const deadCount = deadSnap.data().count;

    // 2. Last 7 days stats from rate monitor
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats: Array<{
      date: string;
      sent: number;
      failed: number;
    }> = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split("T")[0]; // YYYY-MM-DD

      const monitorDoc = await db
        .collection(FIRESTORE_PATHS.RATE_MONITOR)
        .doc(dateKey)
        .get();

      if (monitorDoc.exists) {
        const data = monitorDoc.data()!;
        dailyStats.push({
          date: dateKey,
          sent: data.totalSent || 0,
          failed: data.totalFailed || 0,
        });
      } else {
        dailyStats.push({ date: dateKey, sent: 0, failed: 0 });
      }
    }

    // 3. Today's hourly breakdown
    const todayKey = new Date().toISOString().split("T")[0];
    const todayDoc = await db
      .collection(FIRESTORE_PATHS.RATE_MONITOR)
      .doc(todayKey)
      .get();

    const hourlyCounts: Record<string, number> = todayDoc.exists
      ? todayDoc.data()?.hourlyCounts || {}
      : {};

    return {
      queueDepth: {
        pending: pendingCount,
        sending: sendingCount,
        dead: deadCount,
        total: pendingCount + sendingCount,
      },
      dailyStats,
      hourlyCounts,
    };
  }
);

// ============================================================================
// telegram_getSubscriberStats
// ============================================================================

export const telegram_getSubscriberStats = onCall(
  {
    region: "europe-west1",
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    console.log(`${LOG_PREFIX} telegram_getSubscriberStats called by ${req.auth?.uid}`);

    const db = getDb();

    // Count users with telegram_id set (non-empty)
    // Use single-field queries to avoid needing composite indexes
    const roles = ["chatter", "influencer", "blogger", "groupAdmin", "admin"] as const;
    const breakdown: Record<string, number> = {};
    let total = 0;

    // Get all users with telegram_id set, grouped by role
    // Single filter avoids composite index requirement
    const telegramUsersSnap = await db
      .collection(FIRESTORE_PATHS.USERS)
      .where("telegram_id", ">", "")
      .select("role")
      .get();

    for (const doc of telegramUsersSnap.docs) {
      const role = doc.data().role as string;
      breakdown[role] = (breakdown[role] || 0) + 1;
      total++;
    }

    // Ensure all roles appear in breakdown
    for (const role of roles) {
      if (!(role in breakdown)) breakdown[role] = 0;
    }

    return {
      total,
      breakdown,
      countedAt: new Date().toISOString(),
    };
  }
);

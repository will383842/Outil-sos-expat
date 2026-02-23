/**
 * Telegram Admin Action Callable Functions
 *
 * - telegram_reprocessDeadLetters: Retry dead messages (C3 fix)
 * - telegram_sendOneOff: Send ad-hoc message to specific users
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { getApps, initializeApp } from "firebase-admin/app";
import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";
import { enqueueTelegramMessage } from "../queue/enqueue";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[TelegramAdminActions]";
const QUEUE_COLLECTION = "telegram_message_queue";

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
// telegram_reprocessDeadLetters (C3 fix)
// ============================================================================

/**
 * Reprocess dead letter messages — resets them to "pending" for retry.
 * Admin-only callable.
 *
 * @param data.limit - Max number of dead letters to reprocess (default 50, max 200)
 * @param data.campaignId - Optional: only reprocess dead letters from a specific campaign
 */
export const telegram_reprocessDeadLetters = onCall(
  {
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
    memory: "256MiB",
    cpu: 0.25,
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    const { limit: reqLimit, campaignId } = (req.data || {}) as {
      limit?: number;
      campaignId?: string;
    };

    const limit = Math.min(reqLimit || 50, 200);

    console.log(`${LOG_PREFIX} telegram_reprocessDeadLetters called by ${req.auth?.uid} (limit: ${limit})`);

    const db = getDb();

    let query = db
      .collection(QUEUE_COLLECTION)
      .where("status", "==", "dead")
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (campaignId) {
      query = db
        .collection(QUEUE_COLLECTION)
        .where("status", "==", "dead")
        .where("campaignId", "==", campaignId)
        .orderBy("createdAt", "desc")
        .limit(limit);
    }

    const deadSnap = await query.get();

    if (deadSnap.empty) {
      return { ok: true, reprocessed: 0, message: "No dead letters found." };
    }

    // Reset dead messages to pending with fresh retry count
    const batch = db.batch();
    let count = 0;

    for (const doc of deadSnap.docs) {
      batch.update(doc.ref, {
        status: "pending",
        retryCount: 0,
        error: FieldValue.delete(),
        nextRetryAt: FieldValue.delete(),
        processedAt: FieldValue.delete(),
        reprocessedAt: Timestamp.now(),
        reprocessedBy: req.auth?.uid || "unknown",
      });
      count++;
    }

    await batch.commit();

    console.log(`${LOG_PREFIX} Reprocessed ${count} dead letters`);

    return {
      ok: true,
      reprocessed: count,
      message: `${count} dead letters reset to pending for retry.`,
    };
  }
);

// ============================================================================
// telegram_sendOneOff — Ad-hoc messaging to specific users
// ============================================================================

interface SendOneOffRequest {
  /** Message text (supports Markdown) */
  message: string;
  /** Recipient selection — one of the following must be provided */
  recipientUserIds?: string[]; // Firebase UIDs — will lookup telegram_id
  recipientChatIds?: (string | number)[]; // Direct Telegram chat IDs
  /** Target by role (sends to all users with that role who have telegram_id) */
  targetRoles?: string[]; // e.g. ["chatter", "influencer"]
  /** Parse mode */
  parseMode?: "Markdown" | "HTML";
}

/**
 * Send a one-off (ad-hoc) Telegram message to specific users.
 * Admin-only callable.
 *
 * Supports 3 modes:
 * 1. By Firebase UIDs → looks up telegram_id from users collection
 * 2. By Telegram chat IDs → sends directly
 * 3. By roles → queries all users with those roles who have telegram_id
 */
export const telegram_sendOneOff = onCall(
  {
    region: "europe-west1",
    cors: ALLOWED_ORIGINS,
    memory: "512MiB",
    cpu: 0.5,
    timeoutSeconds: 120,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    const {
      message,
      recipientUserIds,
      recipientChatIds,
      targetRoles,
      parseMode,
    } = (req.data || {}) as SendOneOffRequest;

    console.log(`${LOG_PREFIX} telegram_sendOneOff called by ${req.auth?.uid}`);

    // Validate message
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Message text is required.");
    }

    // Validate at least one recipient method
    const hasUserIds = recipientUserIds && recipientUserIds.length > 0;
    const hasChatIds = recipientChatIds && recipientChatIds.length > 0;
    const hasRoles = targetRoles && targetRoles.length > 0;

    if (!hasUserIds && !hasChatIds && !hasRoles) {
      throw new HttpsError(
        "invalid-argument",
        "At least one of recipientUserIds, recipientChatIds, or targetRoles must be provided."
      );
    }

    // Limit total recipients to prevent abuse
    const MAX_RECIPIENTS = 1000;

    const db = getDb();
    const chatIds: Set<string | number> = new Set();

    // Mode 1: Lookup telegram_id from UIDs
    if (hasUserIds) {
      if (recipientUserIds!.length > MAX_RECIPIENTS) {
        throw new HttpsError("invalid-argument", `Max ${MAX_RECIPIENTS} UIDs per call.`);
      }

      // Firestore getAll supports up to 100 docs at a time
      const batches = [];
      for (let i = 0; i < recipientUserIds!.length; i += 100) {
        const chunk = recipientUserIds!.slice(i, i + 100);
        const refs = chunk.map((uid) => db.collection("users").doc(uid));
        batches.push(db.getAll(...refs));
      }

      const allDocs = (await Promise.all(batches)).flat();
      for (const doc of allDocs) {
        if (doc.exists) {
          const tid = doc.data()?.telegram_id;
          if (tid) chatIds.add(tid);
        }
      }
    }

    // Mode 2: Direct chat IDs
    if (hasChatIds) {
      if (recipientChatIds!.length > MAX_RECIPIENTS) {
        throw new HttpsError("invalid-argument", `Max ${MAX_RECIPIENTS} chat IDs per call.`);
      }
      for (const cid of recipientChatIds!) {
        if (cid) chatIds.add(cid);
      }
    }

    // Mode 3: Query by roles
    if (hasRoles) {
      const validRoles = ["chatter", "influencer", "blogger", "groupAdmin", "admin"];
      for (const role of targetRoles!) {
        if (!validRoles.includes(role)) {
          throw new HttpsError("invalid-argument", `Invalid role "${role}".`);
        }
      }

      for (const role of targetRoles!) {
        const snap = await db
          .collection("users")
          .where("telegram_id", "!=", "")
          .where("role", "==", role)
          .select("telegram_id")
          .limit(MAX_RECIPIENTS)
          .get();

        for (const doc of snap.docs) {
          const tid = doc.data().telegram_id;
          if (tid) chatIds.add(tid);
        }
      }
    }

    if (chatIds.size === 0) {
      return {
        ok: true,
        enqueued: 0,
        message: "No recipients found with Telegram connected.",
      };
    }

    // Enqueue all messages
    let enqueued = 0;
    let failed = 0;

    for (const chatId of chatIds) {
      try {
        await enqueueTelegramMessage(chatId, message.trim(), {
          parseMode: parseMode || "Markdown",
          priority: "realtime",
          sourceEventType: "one_off_admin",
        });
        enqueued++;
      } catch (err) {
        console.error(`${LOG_PREFIX} Failed to enqueue for ${chatId}:`, err);
        failed++;
      }
    }

    console.log(
      `${LOG_PREFIX} One-off message: ${enqueued} enqueued, ${failed} failed out of ${chatIds.size} recipients`
    );

    return {
      ok: true,
      enqueued,
      failed,
      totalRecipients: chatIds.size,
      message: `${enqueued} messages enqueued for delivery.`,
    };
  }
);

/**
 * Telegram Campaign Callable Functions
 *
 * Admin-only callables for creating and managing Telegram campaigns:
 * - telegram_createCampaign: Create a new campaign (draft or scheduled)
 * - telegram_getCampaigns: List campaigns with filters and pagination
 * - telegram_cancelCampaign: Cancel a scheduled/draft campaign
 * - telegram_getCampaignDetail: Get campaign detail with delivery stats
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { initializeApp, getApps } from "firebase-admin/app";
import { TELEGRAM_BOT_TOKEN } from "../../lib/secrets";

// ============================================================================
// CONSTANTS
// ============================================================================

const LOG_PREFIX = "[TelegramCampaigns]";

const CAMPAIGNS_COLLECTION = "telegram_campaigns";

type CampaignStatus = "draft" | "scheduled" | "sending" | "completed" | "cancelled";

interface CampaignDoc {
  name: string;
  message: string;
  targetAudience: string; // "all" | "chatters" | "influencers" | "bloggers" | "groupAdmins"
  targetCount: number;
  sentCount: number;
  failedCount: number;
  status: CampaignStatus;
  scheduledAt: Timestamp | null;
  startedAt: Timestamp | null;
  completedAt: Timestamp | null;
  createdBy: string;
  createdAt: Timestamp;
}

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
// telegram_createCampaign
// ============================================================================

interface CreateCampaignRequest {
  name: string;
  message: string;
  targetAudience: string; // Single role or comma-separated: "chatters,bloggers"
  scheduledAt?: string; // ISO string, null = draft
}

export const telegram_createCampaign = onCall(
  {
    region: "europe-west1",
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    const { name, message, targetAudience, scheduledAt } =
      (req.data || {}) as CreateCampaignRequest;

    console.log(`${LOG_PREFIX} telegram_createCampaign called by ${req.auth?.uid}`);

    // Validate
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Campaign name is required.");
    }
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      throw new HttpsError("invalid-argument", "Campaign message is required.");
    }
    // Validate audience: supports "all", single role, or comma-separated multi-role
    const validAudiences = ["all", "chatters", "influencers", "bloggers", "groupAdmins"];
    if (!targetAudience) {
      throw new HttpsError("invalid-argument", "targetAudience is required.");
    }
    const audienceParts = targetAudience.split(",").map((s) => s.trim()).filter(Boolean);
    for (const part of audienceParts) {
      if (!validAudiences.includes(part)) {
        throw new HttpsError("invalid-argument", `Invalid audience "${part}". Must be one of: ${validAudiences.join(", ")}`);
      }
    }

    const db = getDb();

    // Count target audience (supports multi-role)
    let targetCount = 0;
    const usersRef = db.collection("users");
    const roleMap: Record<string, string> = {
      chatters: "chatter",
      influencers: "influencer",
      bloggers: "blogger",
      groupAdmins: "groupAdmin",
    };

    if (targetAudience === "all") {
      const snap = await usersRef.where("telegram_id", "!=", "").count().get();
      targetCount = snap.data().count;
    } else {
      // Count for each role and sum
      for (const part of audienceParts) {
        const role = roleMap[part] || part;
        const snap = await usersRef
          .where("telegram_id", "!=", "")
          .where("role", "==", role)
          .count()
          .get();
        targetCount += snap.data().count;
      }
    }

    const status: CampaignStatus = scheduledAt ? "scheduled" : "draft";

    const campaignData: CampaignDoc = {
      name: name.trim(),
      message: message.trim(),
      targetAudience,
      targetCount,
      sentCount: 0,
      failedCount: 0,
      status,
      scheduledAt: scheduledAt ? Timestamp.fromDate(new Date(scheduledAt)) : null,
      startedAt: null,
      completedAt: null,
      createdBy: req.auth?.uid || "unknown",
      createdAt: Timestamp.now(),
    };

    const docRef = await db.collection(CAMPAIGNS_COLLECTION).add(campaignData);

    console.log(`${LOG_PREFIX} Campaign created: ${docRef.id} (status: ${status}, targets: ${targetCount})`);

    return {
      ok: true,
      campaignId: docRef.id,
      targetCount,
      status,
    };
  }
);

// ============================================================================
// telegram_getCampaigns
// ============================================================================

interface GetCampaignsRequest {
  status?: CampaignStatus;
  limit?: number;
  startAfter?: string;
}

export const telegram_getCampaigns = onCall(
  {
    region: "europe-west1",
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    const { status, limit: reqLimit, startAfter } =
      (req.data || {}) as GetCampaignsRequest;

    console.log(`${LOG_PREFIX} telegram_getCampaigns called by ${req.auth?.uid}`);

    const db = getDb();
    const pageSize = Math.min(reqLimit || 20, 50);

    let query = db
      .collection(CAMPAIGNS_COLLECTION)
      .orderBy("createdAt", "desc")
      .limit(pageSize);

    if (status) {
      query = query.where("status", "==", status);
    }

    if (startAfter) {
      const cursorDoc = await db.collection(CAMPAIGNS_COLLECTION).doc(startAfter).get();
      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    const snapshot = await query.get();

    const campaigns = snapshot.docs.map((doc) => {
      const data = doc.data() as CampaignDoc;
      return {
        id: doc.id,
        name: data.name,
        targetAudience: data.targetAudience,
        targetCount: data.targetCount,
        sentCount: data.sentCount,
        failedCount: data.failedCount,
        status: data.status,
        scheduledAt: data.scheduledAt?.toDate?.()?.toISOString() || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        createdBy: data.createdBy,
      };
    });

    const lastDocId = snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1].id
      : null;

    return {
      campaigns,
      nextCursor: campaigns.length === pageSize ? lastDocId : null,
    };
  }
);

// ============================================================================
// telegram_cancelCampaign
// ============================================================================

export const telegram_cancelCampaign = onCall(
  {
    region: "europe-west1",
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    const { campaignId } = (req.data || {}) as { campaignId: string };

    if (!campaignId) {
      throw new HttpsError("invalid-argument", "campaignId is required.");
    }

    console.log(`${LOG_PREFIX} telegram_cancelCampaign called for ${campaignId} by ${req.auth?.uid}`);

    const db = getDb();
    const docRef = db.collection(CAMPAIGNS_COLLECTION).doc(campaignId);
    const doc = await docRef.get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Campaign not found.");
    }

    const data = doc.data() as CampaignDoc;

    if (data.status !== "draft" && data.status !== "scheduled") {
      throw new HttpsError(
        "failed-precondition",
        `Cannot cancel a campaign with status "${data.status}". Only draft or scheduled campaigns can be cancelled.`
      );
    }

    await docRef.update({
      status: "cancelled" as CampaignStatus,
      completedAt: FieldValue.serverTimestamp(),
    });

    console.log(`${LOG_PREFIX} Campaign ${campaignId} cancelled`);

    return { ok: true };
  }
);

// ============================================================================
// telegram_getCampaignDetail
// ============================================================================

export const telegram_getCampaignDetail = onCall(
  {
    region: "europe-west1",
    cors: true,
    memory: "256MiB",
    timeoutSeconds: 60,
    secrets: [TELEGRAM_BOT_TOKEN],
  },
  async (req) => {
    assertAdmin(req);

    const { campaignId } = (req.data || {}) as { campaignId: string };

    if (!campaignId) {
      throw new HttpsError("invalid-argument", "campaignId is required.");
    }

    console.log(`${LOG_PREFIX} telegram_getCampaignDetail called for ${campaignId} by ${req.auth?.uid}`);

    const db = getDb();
    const doc = await db.collection(CAMPAIGNS_COLLECTION).doc(campaignId).get();

    if (!doc.exists) {
      throw new HttpsError("not-found", "Campaign not found.");
    }

    const data = doc.data() as CampaignDoc;

    // Get delivery stats from queue
    const queueSentSnap = await db
      .collection("telegram_message_queue")
      .where("campaignId", "==", campaignId)
      .where("status", "==", "sent")
      .count()
      .get();
    const queueFailedSnap = await db
      .collection("telegram_message_queue")
      .where("campaignId", "==", campaignId)
      .where("status", "==", "failed")
      .count()
      .get();
    const queuePendingSnap = await db
      .collection("telegram_message_queue")
      .where("campaignId", "==", campaignId)
      .where("status", "==", "pending")
      .count()
      .get();

    return {
      id: doc.id,
      name: data.name,
      message: data.message,
      targetAudience: data.targetAudience,
      targetCount: data.targetCount,
      sentCount: data.sentCount,
      failedCount: data.failedCount,
      status: data.status,
      scheduledAt: data.scheduledAt?.toDate?.()?.toISOString() || null,
      startedAt: data.startedAt?.toDate?.()?.toISOString() || null,
      completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
      createdBy: data.createdBy,
      createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
      deliveryStats: {
        sent: queueSentSnap.data().count,
        failed: queueFailedSnap.data().count,
        pending: queuePendingSnap.data().count,
      },
    };
  }
);

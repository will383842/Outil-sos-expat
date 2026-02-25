/**
 * Admin Callables: Recruitment Tracking
 *
 * Provides visibility into the group_admin_recruited_admins collection
 * for the admin dashboard.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";

import { GroupAdmin, GroupAdminRecruit } from "../../types";
import { getRecruitmentCommissionThreshold } from "../../groupAdminConfig";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

/**
 * Verify the caller is an admin
 */
async function verifyAdmin(userId: string, authToken?: Record<string, unknown>): Promise<void> {
  // Check custom claims first (faster, no Firestore read)
  const tokenRole = authToken?.role as string | undefined;
  if (tokenRole === "admin" || tokenRole === "dev") {
    return;
  }

  // Fall back to Firestore check
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    throw new HttpsError("permission-denied", "User not found");
  }

  const userData = userDoc.data();
  if (!userData || !["admin", "dev"].includes(userData.role)) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

// ---------- Types ----------

type RecruitmentComputedStatus = "pending" | "eligible" | "paid" | "expired";

interface EnrichedRecruitment {
  id: string;
  recruiterId: string;
  recruiterName: string;
  recruitedId: string;
  recruitedName: string;
  recruitedEmail: string;
  recruitedGroupName: string;
  recruitedAt: string;
  commissionWindowEnd: string;
  commissionPaid: boolean;
  commissionId?: string;
  commissionPaidAt?: string;
  recruitedTotalEarned: number;
  threshold: number;
  progressPercent: number;
  computedStatus: RecruitmentComputedStatus;
}

function computeStatus(
  recruit: GroupAdminRecruit,
  recruitedTotalEarned: number,
  threshold: number,
): RecruitmentComputedStatus {
  if (recruit.commissionPaid) return "paid";
  const windowExpired = recruit.commissionWindowEnd.toDate() < new Date();
  if (windowExpired) return "expired";
  if (recruitedTotalEarned >= threshold) return "eligible";
  return "pending";
}

// ---------- adminGetRecruitmentsList ----------

interface RecruitmentsListInput {
  page?: number;
  limit?: number;
  status?: "all" | RecruitmentComputedStatus;
  search?: string;
}

/**
 * List all recruitment records with enrichment and filtering.
 */
export const adminGetRecruitmentsList = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const input = (request.data || {}) as RecruitmentsListInput;
    const page = Math.max(1, input.page || 1);
    const limit = Math.min(100, Math.max(1, input.limit || 25));
    const statusFilter = input.status || "all";
    const search = (input.search || "").trim().toLowerCase();

    try {
      const db = getFirestore();
      const threshold = await getRecruitmentCommissionThreshold();

      // Fetch all recruitment records (collection is expected to be small-to-medium)
      const recruitSnap = await db
        .collection("group_admin_recruited_admins")
        .orderBy("recruitedAt", "desc")
        .get();

      // Build a set of all GroupAdmin IDs we need to look up
      const gaIds = new Set<string>();
      for (const doc of recruitSnap.docs) {
        const d = doc.data();
        gaIds.add(d.recruiterId);
        gaIds.add(d.recruitedId);
      }

      // Batch-fetch all group_admins profiles
      const gaMap = new Map<string, GroupAdmin>();
      const idArray = Array.from(gaIds);
      // Firestore getAll supports up to 500 refs per call
      for (let i = 0; i < idArray.length; i += 500) {
        const batch = idArray.slice(i, i + 500).map(id => db.collection("group_admins").doc(id));
        const docs = await db.getAll(...batch);
        for (const d of docs) {
          if (d.exists) {
            gaMap.set(d.id, d.data() as GroupAdmin);
          }
        }
      }

      // Enrich
      const enriched: EnrichedRecruitment[] = [];
      for (const doc of recruitSnap.docs) {
        const recruit = { id: doc.id, ...doc.data() } as GroupAdminRecruit;
        const recruiter = gaMap.get(recruit.recruiterId);
        const recruited = gaMap.get(recruit.recruitedId);

        const recruitedTotalEarned = recruited?.totalEarned ?? 0;
        const cs = computeStatus(recruit, recruitedTotalEarned, threshold);

        const entry: EnrichedRecruitment = {
          id: recruit.id,
          recruiterId: recruit.recruiterId,
          recruiterName: recruiter
            ? `${recruiter.firstName} ${recruiter.lastName}`
            : recruit.recruiterId,
          recruitedId: recruit.recruitedId,
          recruitedName: recruit.recruitedName || (recruited
            ? `${recruited.firstName} ${recruited.lastName}`
            : recruit.recruitedId),
          recruitedEmail: recruit.recruitedEmail || recruited?.email || "",
          recruitedGroupName: recruit.recruitedGroupName || recruited?.groupName || "",
          recruitedAt: recruit.recruitedAt?.toDate?.().toISOString() ?? "",
          commissionWindowEnd: recruit.commissionWindowEnd?.toDate?.().toISOString() ?? "",
          commissionPaid: recruit.commissionPaid,
          commissionId: recruit.commissionId,
          commissionPaidAt: recruit.commissionPaidAt?.toDate?.().toISOString(),
          recruitedTotalEarned,
          threshold,
          progressPercent: Math.min(100, Math.round((recruitedTotalEarned / threshold) * 100)),
          computedStatus: cs,
        };

        // Filter by status
        if (statusFilter !== "all" && entry.computedStatus !== statusFilter) continue;

        // Filter by search
        if (search) {
          const haystack = `${entry.recruiterName} ${entry.recruitedName} ${entry.recruitedEmail} ${entry.recruitedGroupName}`.toLowerCase();
          if (!haystack.includes(search)) continue;
        }

        enriched.push(entry);
      }

      // Stats (on filtered set before pagination)
      const stats = {
        total: enriched.length,
        pending: enriched.filter(e => e.computedStatus === "pending").length,
        eligible: enriched.filter(e => e.computedStatus === "eligible").length,
        paid: enriched.filter(e => e.computedStatus === "paid").length,
        expired: enriched.filter(e => e.computedStatus === "expired").length,
      };

      // If status filter is "all", recount from unfiltered
      if (statusFilter !== "all") {
        // Stats reflect filtered results
      }

      // Paginate
      const start = (page - 1) * limit;
      const paginated = enriched.slice(start, start + limit);

      return {
        recruitments: paginated,
        stats,
        page,
        limit,
        hasMore: start + limit < enriched.length,
      };
    } catch (error) {
      logger.error("[adminGetRecruitmentsList] Error", { error });
      throw new HttpsError("internal", "Failed to fetch recruitments");
    }
  }
);

// ---------- adminGetGroupAdminRecruits ----------

interface GetRecruitsInput {
  recruiterId: string;
}

/**
 * Get all recruits for a specific GroupAdmin, with progression data.
 */
export const adminGetGroupAdminRecruits = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request) => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await verifyAdmin(request.auth.uid, request.auth.token);

    const input = request.data as GetRecruitsInput;
    if (!input?.recruiterId) {
      throw new HttpsError("invalid-argument", "recruiterId is required");
    }

    try {
      const db = getFirestore();
      const threshold = await getRecruitmentCommissionThreshold();

      const recruitSnap = await db
        .collection("group_admin_recruited_admins")
        .where("recruiterId", "==", input.recruiterId)
        .orderBy("recruitedAt", "desc")
        .get();

      if (recruitSnap.empty) {
        return { recruits: [], threshold };
      }

      // Fetch all recruited profiles
      const recruitedIds = recruitSnap.docs.map(d => d.data().recruitedId as string);
      const gaMap = new Map<string, GroupAdmin>();
      for (let i = 0; i < recruitedIds.length; i += 500) {
        const batch = recruitedIds.slice(i, i + 500).map(id => db.collection("group_admins").doc(id));
        const docs = await db.getAll(...batch);
        for (const d of docs) {
          if (d.exists) gaMap.set(d.id, d.data() as GroupAdmin);
        }
      }

      const recruits: EnrichedRecruitment[] = recruitSnap.docs.map(doc => {
        const recruit = { id: doc.id, ...doc.data() } as GroupAdminRecruit;
        const recruited = gaMap.get(recruit.recruitedId);
        const recruitedTotalEarned = recruited?.totalEarned ?? 0;

        return {
          id: recruit.id,
          recruiterId: recruit.recruiterId,
          recruiterName: "",
          recruitedId: recruit.recruitedId,
          recruitedName: recruit.recruitedName || (recruited
            ? `${recruited.firstName} ${recruited.lastName}`
            : recruit.recruitedId),
          recruitedEmail: recruit.recruitedEmail || recruited?.email || "",
          recruitedGroupName: recruit.recruitedGroupName || recruited?.groupName || "",
          recruitedAt: recruit.recruitedAt?.toDate?.().toISOString() ?? "",
          commissionWindowEnd: recruit.commissionWindowEnd?.toDate?.().toISOString() ?? "",
          commissionPaid: recruit.commissionPaid,
          commissionId: recruit.commissionId,
          commissionPaidAt: recruit.commissionPaidAt?.toDate?.().toISOString(),
          recruitedTotalEarned,
          threshold,
          progressPercent: Math.min(100, Math.round((recruitedTotalEarned / threshold) * 100)),
          computedStatus: computeStatus(recruit, recruitedTotalEarned, threshold),
        };
      });

      return { recruits, threshold };
    } catch (error) {
      logger.error("[adminGetGroupAdminRecruits] Error", { error });
      throw new HttpsError("internal", "Failed to fetch recruits");
    }
  }
);

// src/feedback/index.ts
// Cloud Functions pour la gestion des feedbacks utilisateur
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions";

// ==========================================
// TYPES
// ==========================================

type FeedbackType = 'bug' | 'ux_friction' | 'suggestion' | 'other';
type FeedbackPriority = 'blocking' | 'annoying' | 'minor';
type FeedbackStatus = 'new' | 'in_progress' | 'resolved' | 'wont_fix' | 'duplicate';
type UserRole = 'client' | 'lawyer' | 'expat' | 'visitor' | 'admin';

interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  os: string;
  browser: string;
  screenResolution: string;
  connectionType: string;
}

interface FeedbackData {
  email: string;
  userId?: string;
  userRole: UserRole;
  userName?: string;
  type: FeedbackType;
  priority?: FeedbackPriority;
  description: string;
  pageUrl: string;
  pageName: string;
  device: DeviceInfo;
  locale: string;
  screenshotUrl?: string;
}

interface FeedbackStats {
  total: number;
  byStatus: Record<FeedbackStatus, number>;
  byType: Record<FeedbackType, number>;
  byPriority: Record<string, number>;
  byUserRole: Record<UserRole, number>;
  recentCount: number;
}

// ==========================================
// CONFIGURATION
// ==========================================

const FEEDBACK_COLLECTION = 'user_feedback';
// Config pour notifications email (à implémenter)
// const ADMIN_NOTIFICATION_EMAIL = 'contact@sos-expat.com';

const functionConfig = {
  region: "europe-west1",
  memory: "256MiB" as const,
  cpu: 0.25,
  maxInstances: 5,
  minInstances: 0,
};

// ==========================================
// TRIGGERS
// ==========================================

/**
 * Trigger: Notification aux admins lors d'un nouveau feedback
 * Se déclenche à chaque création de document dans user_feedback
 */
export const onFeedbackCreated = onDocumentCreated(
  {
    document: `${FEEDBACK_COLLECTION}/{feedbackId}`,
    ...functionConfig,
  },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      logger.warn("[Feedback] No data in feedback document");
      return;
    }

    const feedbackData = snapshot.data() as FeedbackData & { status: FeedbackStatus };
    const feedbackId = event.params.feedbackId;

    logger.info(`[Feedback] New feedback received: ${feedbackId}`, {
      type: feedbackData.type,
      priority: feedbackData.priority,
      userRole: feedbackData.userRole,
      pageUrl: feedbackData.pageUrl,
    });

    // Si le feedback est bloquant, envoyer une notification immédiate
    if (feedbackData.priority === 'blocking') {
      logger.warn(`[Feedback] BLOCKING feedback received!`, {
        feedbackId,
        email: feedbackData.email,
        description: feedbackData.description.substring(0, 100),
      });

      // TODO: Intégrer avec le système de notification existant
      // await sendAdminNotification({
      //   subject: `[URGENT] Feedback bloquant reçu - ${feedbackData.type}`,
      //   body: `Un utilisateur a signalé un problème bloquant sur ${feedbackData.pageUrl}`,
      //   feedbackId,
      // });
    }

    // Incrémenter le compteur de feedbacks non lus (optionnel)
    try {
      const db = getFirestore();
      const statsRef = db.collection('admin_stats').doc('feedback');

      await db.runTransaction(async (transaction) => {
        const statsDoc = await transaction.get(statsRef);
        const currentStats = statsDoc.exists ? statsDoc.data() : { unreadCount: 0 };

        transaction.set(statsRef, {
          unreadCount: (currentStats?.unreadCount || 0) + 1,
          lastFeedbackAt: Timestamp.now(),
        }, { merge: true });
      });
    } catch (error) {
      logger.error("[Feedback] Failed to update stats", { error });
    }

    return { success: true, feedbackId };
  }
);

// ==========================================
// CALLABLE FUNCTIONS (Admin)
// ==========================================

/**
 * Met à jour le statut d'un feedback (admin only)
 */
export const updateFeedbackStatus = onCall(
  {
    ...functionConfig,
    enforceAppCheck: false,
  },
  async (request) => {
    // Vérifier l'authentification
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    // Vérifier le rôle admin (via custom claims ou Firestore)
    const db = getFirestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { feedbackId, status, adminNotes, resolution, assignedTo } = request.data;

    if (!feedbackId || !status) {
      throw new HttpsError("invalid-argument", "feedbackId and status are required");
    }

    const validStatuses: FeedbackStatus[] = ['new', 'in_progress', 'resolved', 'wont_fix', 'duplicate'];
    if (!validStatuses.includes(status)) {
      throw new HttpsError("invalid-argument", "Invalid status value");
    }

    try {
      const feedbackRef = db.collection(FEEDBACK_COLLECTION).doc(feedbackId);
      const updateData: Record<string, unknown> = {
        status,
        updatedAt: Timestamp.now(),
      };

      if (adminNotes !== undefined) updateData.adminNotes = adminNotes;
      if (resolution !== undefined) updateData.resolution = resolution;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

      if (status === 'resolved') {
        updateData.resolvedAt = Timestamp.now();
      }

      await feedbackRef.update(updateData);

      logger.info(`[Feedback] Status updated: ${feedbackId} -> ${status}`, {
        adminId: request.auth.uid,
      });

      return { success: true };
    } catch (error) {
      logger.error("[Feedback] Failed to update status", { error, feedbackId });
      throw new HttpsError("internal", "Failed to update feedback status");
    }
  }
);

/**
 * Récupère les statistiques des feedbacks (admin only)
 */
export const getFeedbackStats = onCall(
  {
    ...functionConfig,
    enforceAppCheck: false,
  },
  async (request) => {
    // Vérifier l'authentification admin
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    try {
      const feedbackRef = db.collection(FEEDBACK_COLLECTION);
      const snapshot = await feedbackRef.get();

      const stats: FeedbackStats = {
        total: 0,
        byStatus: { new: 0, in_progress: 0, resolved: 0, wont_fix: 0, duplicate: 0 },
        byType: { bug: 0, ux_friction: 0, suggestion: 0, other: 0 },
        byPriority: { blocking: 0, annoying: 0, minor: 0, unset: 0 },
        byUserRole: { client: 0, lawyer: 0, expat: 0, visitor: 0, admin: 0 },
        recentCount: 0,
      };

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      snapshot.forEach((doc) => {
        const data = doc.data();
        stats.total++;

        // By status
        const status = data.status as FeedbackStatus;
        if (stats.byStatus[status] !== undefined) {
          stats.byStatus[status]++;
        }

        // By type
        const type = data.type as FeedbackType;
        if (stats.byType[type] !== undefined) {
          stats.byType[type]++;
        }

        // By priority
        const priority = data.priority || 'unset';
        stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

        // By user role
        const role = data.userRole as UserRole;
        if (stats.byUserRole[role] !== undefined) {
          stats.byUserRole[role]++;
        }

        // Recent count (last 7 days)
        const createdAt = data.createdAt?.toDate?.() || new Date(0);
        if (createdAt > oneWeekAgo) {
          stats.recentCount++;
        }
      });

      return { success: true, stats };
    } catch (error) {
      logger.error("[Feedback] Failed to get stats", { error });
      throw new HttpsError("internal", "Failed to get feedback statistics");
    }
  }
);

/**
 * Supprime un feedback (admin only, soft delete)
 */
export const deleteFeedback = onCall(
  {
    ...functionConfig,
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const db = getFirestore();
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { feedbackId } = request.data;

    if (!feedbackId) {
      throw new HttpsError("invalid-argument", "feedbackId is required");
    }

    try {
      // Soft delete: move to deleted_feedback collection
      const feedbackRef = db.collection(FEEDBACK_COLLECTION).doc(feedbackId);
      const feedbackDoc = await feedbackRef.get();

      if (!feedbackDoc.exists) {
        throw new HttpsError("not-found", "Feedback not found");
      }

      const deletedRef = db.collection('deleted_feedback').doc(feedbackId);
      await deletedRef.set({
        ...feedbackDoc.data(),
        deletedAt: Timestamp.now(),
        deletedBy: request.auth.uid,
      });

      await feedbackRef.delete();

      logger.info(`[Feedback] Deleted: ${feedbackId}`, { adminId: request.auth.uid });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[Feedback] Failed to delete", { error, feedbackId });
      throw new HttpsError("internal", "Failed to delete feedback");
    }
  }
);

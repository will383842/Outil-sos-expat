/**
 * Blogger Admin Callables
 *
 * Admin functions for managing the blogger program:
 * - List/Detail bloggers
 * - Process withdrawals
 * - Update status
 * - Manage configuration
 * - CRUD resources
 * - CRUD guide content
 * - Export data
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { ALLOWED_ORIGINS } from "../../../lib/functionConfigs";
import {
  AdminGetBloggersListInput,
  AdminGetBloggersListResponse,
  AdminGetBloggerDetailResponse,
  AdminProcessBloggerWithdrawalInput,
  AdminUpdateBloggerStatusInput,
  AdminGetBloggerConfigResponse,
  AdminUpdateBloggerConfigInput,
  AdminCreateBloggerResourceInput,
  AdminUpdateBloggerResourceInput,
  AdminCreateBloggerResourceTextInput,
  AdminCreateBloggerGuideTemplateInput,
  AdminUpdateBloggerGuideTemplateInput,
  AdminCreateBloggerGuideCopyTextInput,
  AdminUpdateBloggerGuideCopyTextInput,
  AdminCreateBloggerGuideBestPracticeInput,
  AdminUpdateBloggerGuideBestPracticeInput,
  Blogger,
  BloggerCommission,
  BloggerWithdrawal,
  BloggerRecruitedProvider,
  BloggerBadgeAward,
  BloggerResource,
  BloggerResourceText,
  BloggerGuideTemplate,
  BloggerGuideCopyText,
  BloggerGuideBestPractice,
  BloggerConfigHistoryEntry,
} from "../../types";
import { processBloggerWithdrawal } from "../../services/bloggerWithdrawalService";
import {
  getBloggerConfigCached,
  updateBloggerConfig,
} from "../../utils/bloggerConfigService";

// ============================================================================
// HELPER: Check Admin
// ============================================================================

async function checkAdmin(uid: string): Promise<void> {
  const db = getFirestore();
  const adminDoc = await db.collection("admins").doc(uid).get();

  if (!adminDoc.exists) {
    throw new HttpsError("permission-denied", "Admin access required");
  }
}

// ============================================================================
// LIST BLOGGERS
// ============================================================================

export const adminGetBloggersList = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<AdminGetBloggersListResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminGetBloggersListInput;
    const db = getFirestore();

    try {
      let query: FirebaseFirestore.Query = db.collection("bloggers");

      // Apply filters
      if (input?.status) {
        query = query.where("status", "==", input.status);
      }
      if (input?.country) {
        query = query.where("country", "==", input.country);
      }
      if (input?.blogTheme) {
        query = query.where("blogTheme", "==", input.blogTheme);
      }
      if (input?.blogTraffic) {
        query = query.where("blogTraffic", "==", input.blogTraffic);
      }

      // Apply sorting
      const sortBy = input?.sortBy || "createdAt";
      const sortOrder = input?.sortOrder || "desc";
      query = query.orderBy(sortBy, sortOrder);

      // Apply pagination
      const limit = Math.min(input?.limit || 50, 100);
      query = query.limit(limit + 1); // Get one extra to check if more exist

      const snapshot = await query.get();
      const hasMore = snapshot.docs.length > limit;
      const docs = hasMore ? snapshot.docs.slice(0, limit) : snapshot.docs;

      // Fetch isFeatured from users collection (badge set by admin)
      const userRefs = docs.map((doc) => db.collection("users").doc(doc.id));
      const userDocs = docs.length > 0 ? await db.getAll(...userRefs) : [];
      const featuredMap: Record<string, boolean> = {};
      userDocs.forEach((doc) => {
        if (doc.exists) featuredMap[doc.id] = doc.data()?.isFeatured === true;
      });

      // Format response
      const bloggers = docs.map(doc => {
        const data = doc.data() as Blogger;
        return {
          id: data.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          country: data.country,
          status: data.status,
          blogUrl: data.blogUrl,
          blogName: data.blogName,
          blogTheme: data.blogTheme,
          blogTraffic: data.blogTraffic,
          totalEarned: data.totalEarned,
          totalClients: data.totalClients,
          totalRecruits: data.totalRecruits,
          currentMonthRank: data.currentMonthRank,
          createdAt: data.createdAt.toDate().toISOString(),
          isFeatured: featuredMap[doc.id] ?? false,
          isVisible: data.isVisible ?? false,
          photoUrl: data.photoUrl,
        };
      });

      // Get total count
      const countSnapshot = await db.collection("bloggers").count().get();
      const total = countSnapshot.data().count;

      logger.info("[adminGetBloggersList] List retrieved", {
        count: bloggers.length,
        total,
        hasMore,
      });

      return {
        bloggers,
        total,
        hasMore,
      };
    } catch (error) {
      logger.error("[adminGetBloggersList] Error", { error });
      throw new HttpsError("internal", "Failed to get bloggers list");
    }
  }
);

// ============================================================================
// GET BLOGGER DETAIL
// ============================================================================

export const adminGetBloggerDetail = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<AdminGetBloggerDetailResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { bloggerId } = request.data as { bloggerId: string };

    if (!bloggerId) {
      throw new HttpsError("invalid-argument", "Blogger ID is required");
    }

    const db = getFirestore();

    try {
      // Get blogger
      const bloggerDoc = await db.collection("bloggers").doc(bloggerId).get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("not-found", "Blogger not found");
      }

      const blogger = bloggerDoc.data() as Blogger;

      // Get related data
      const [commissionsSnapshot, withdrawalsSnapshot, recruitedSnapshot, badgesSnapshot] =
        await Promise.all([
          db
            .collection("blogger_commissions")
            .where("bloggerId", "==", bloggerId)
            .orderBy("createdAt", "desc")
            .limit(50)
            .get(),
          db
            .collection("blogger_withdrawals")
            .where("bloggerId", "==", bloggerId)
            .orderBy("requestedAt", "desc")
            .limit(20)
            .get(),
          db
            .collection("blogger_recruited_providers")
            .where("bloggerId", "==", bloggerId)
            .orderBy("recruitedAt", "desc")
            .limit(50)
            .get(),
          db
            .collection("blogger_badge_awards")
            .where("bloggerId", "==", bloggerId)
            .orderBy("awardedAt", "desc")
            .get(),
        ]);

      // Format commissions
      const commissions = commissionsSnapshot.docs.map(doc => {
        const data = doc.data() as BloggerCommission;
        return {
          ...data,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      // Format withdrawals
      const withdrawals = withdrawalsSnapshot.docs.map(doc => {
        const data = doc.data() as BloggerWithdrawal;
        return {
          ...data,
          requestedAt: data.requestedAt.toDate().toISOString(),
        };
      });

      // Format recruited providers
      const recruitedProviders = recruitedSnapshot.docs.map(doc => {
        const data = doc.data() as BloggerRecruitedProvider;
        return {
          ...data,
          recruitedAt: data.recruitedAt.toDate().toISOString(),
        };
      });

      // Format badges
      const badges = badgesSnapshot.docs.map(doc => {
        const data = doc.data() as BloggerBadgeAward;
        return {
          ...data,
          awardedAt: data.awardedAt.toDate().toISOString(),
        };
      });

      logger.info("[adminGetBloggerDetail] Detail retrieved", {
        bloggerId,
        commissionsCount: commissions.length,
        withdrawalsCount: withdrawals.length,
      });

      return {
        blogger,
        commissions: commissions as AdminGetBloggerDetailResponse["commissions"],
        withdrawals: withdrawals as AdminGetBloggerDetailResponse["withdrawals"],
        recruitedProviders: recruitedProviders as AdminGetBloggerDetailResponse["recruitedProviders"],
        badges: badges as AdminGetBloggerDetailResponse["badges"],
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminGetBloggerDetail] Error", { bloggerId, error });
      throw new HttpsError("internal", "Failed to get blogger detail");
    }
  }
);

// ============================================================================
// PROCESS WITHDRAWAL
// ============================================================================

export const adminProcessBloggerWithdrawal = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminProcessBloggerWithdrawalInput;

    if (!input?.withdrawalId || !input?.action) {
      throw new HttpsError("invalid-argument", "Withdrawal ID and action are required");
    }

    try {
      const result = await processBloggerWithdrawal({
        ...input,
        adminId: request.auth.uid,
      });

      if (!result.success) {
        throw new HttpsError("failed-precondition", result.error || "Failed to process withdrawal");
      }

      logger.info("[adminProcessBloggerWithdrawal] Withdrawal processed", {
        withdrawalId: input.withdrawalId,
        action: input.action,
        adminId: request.auth.uid,
      });

      return {
        success: true,
        message: `Withdrawal ${input.action}d successfully`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminProcessBloggerWithdrawal] Error", { input, error });
      throw new HttpsError("internal", "Failed to process withdrawal");
    }
  }
);

// ============================================================================
// UPDATE BLOGGER STATUS
// ============================================================================

export const adminUpdateBloggerStatus = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminUpdateBloggerStatusInput;

    if (!input?.bloggerId || !input?.status || !input?.reason) {
      throw new HttpsError("invalid-argument", "Blogger ID, status, and reason are required");
    }

    const db = getFirestore();

    try {
      const bloggerRef = db.collection("bloggers").doc(input.bloggerId);
      const bloggerDoc = await bloggerRef.get();

      if (!bloggerDoc.exists) {
        throw new HttpsError("not-found", "Blogger not found");
      }

      await bloggerRef.update({
        status: input.status,
        suspensionReason: input.status === "suspended" ? input.reason : null,
        adminNotes: `Status changed to ${input.status}: ${input.reason} (by ${request.auth.uid} on ${new Date().toISOString()})`,
        updatedAt: Timestamp.now(),
      });

      // Create notification for blogger
      await db.collection("blogger_notifications").add({
        bloggerId: input.bloggerId,
        type: "system",
        title: input.status === "active"
          ? "Votre compte a été réactivé"
          : "Mise à jour de votre compte",
        message: input.status === "active"
          ? "Votre compte blogueur est à nouveau actif."
          : `Votre compte a été ${input.status === "suspended" ? "suspendu" : "bloqué"}. Raison: ${input.reason}`,
        isRead: false,
        emailSent: false,
        createdAt: Timestamp.now(),
      });

      logger.info("[adminUpdateBloggerStatus] Status updated", {
        bloggerId: input.bloggerId,
        newStatus: input.status,
        adminId: request.auth.uid,
      });

      return {
        success: true,
        message: `Blogger status updated to ${input.status}`,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateBloggerStatus] Error", { input, error });
      throw new HttpsError("internal", "Failed to update blogger status");
    }
  }
);

// ============================================================================
// GET/UPDATE CONFIG
// ============================================================================

export const adminGetBloggerConfig = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<AdminGetBloggerConfigResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    try {
      const config = await getBloggerConfigCached();
      return { config };
    } catch (error) {
      logger.error("[adminGetBloggerConfig] Error", { error });
      throw new HttpsError("internal", "Failed to get config");
    }
  }
);

export const adminUpdateBloggerConfig = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; message: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminUpdateBloggerConfigInput;

    try {
      const result = await updateBloggerConfig(input, request.auth.uid);

      if (!result.success) {
        throw new HttpsError("internal", result.error || "Failed to update config");
      }

      logger.info("[adminUpdateBloggerConfig] Config updated", {
        updates: Object.keys(input),
        adminId: request.auth.uid,
      });

      return {
        success: true,
        message: "Configuration updated successfully",
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateBloggerConfig] Error", { input, error });
      throw new HttpsError("internal", "Failed to update config");
    }
  }
);

// ============================================================================
// CRUD RESOURCES
// ============================================================================

export const adminCreateBloggerResource = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; resourceId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminCreateBloggerResourceInput;
    const db = getFirestore();

    try {
      const resourceRef = db.collection("blogger_resources").doc();
      const now = Timestamp.now();

      const resource: BloggerResource = {
        id: resourceRef.id,
        category: input.category,
        type: input.type,
        name: input.name,
        nameTranslations: input.nameTranslations as BloggerResource["nameTranslations"],
        description: input.description,
        descriptionTranslations: input.descriptionTranslations as BloggerResource["descriptionTranslations"],
        fileUrl: input.fileUrl,
        thumbnailUrl: input.thumbnailUrl,
        fileSize: input.fileSize,
        fileFormat: input.fileFormat,
        dimensions: input.dimensions,
        isActive: true,
        order: input.order || 0,
        downloadCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: request.auth.uid,
      };

      await resourceRef.set(resource);

      logger.info("[adminCreateBloggerResource] Resource created", {
        resourceId: resourceRef.id,
        adminId: request.auth.uid,
      });

      return { success: true, resourceId: resourceRef.id };
    } catch (error) {
      logger.error("[adminCreateBloggerResource] Error", { error });
      throw new HttpsError("internal", "Failed to create resource");
    }
  }
);

export const adminUpdateBloggerResource = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminUpdateBloggerResourceInput;
    const db = getFirestore();

    if (!input?.resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      const resourceRef = db.collection("blogger_resources").doc(input.resourceId);
      const { resourceId, ...updates } = input;

      await resourceRef.update({
        ...updates,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error("[adminUpdateBloggerResource] Error", { error });
      throw new HttpsError("internal", "Failed to update resource");
    }
  }
);

export const adminDeleteBloggerResource = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { resourceId } = request.data as { resourceId: string };
    const db = getFirestore();

    if (!resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      await db.collection("blogger_resources").doc(resourceId).delete();
      return { success: true };
    } catch (error) {
      logger.error("[adminDeleteBloggerResource] Error", { error });
      throw new HttpsError("internal", "Failed to delete resource");
    }
  }
);

// Similar CRUD for resource texts
export const adminCreateBloggerResourceText = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; textId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminCreateBloggerResourceTextInput;
    const db = getFirestore();

    try {
      const textRef = db.collection("blogger_resource_texts").doc();
      const now = Timestamp.now();

      const text: BloggerResourceText = {
        id: textRef.id,
        category: input.category,
        type: input.type,
        title: input.title,
        titleTranslations: input.titleTranslations as BloggerResourceText["titleTranslations"],
        content: input.content,
        contentTranslations: input.contentTranslations as BloggerResourceText["contentTranslations"],
        isActive: true,
        order: input.order || 0,
        copyCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: request.auth.uid,
      };

      await textRef.set(text);

      return { success: true, textId: textRef.id };
    } catch (error) {
      logger.error("[adminCreateBloggerResourceText] Error", { error });
      throw new HttpsError("internal", "Failed to create resource text");
    }
  }
);

// ============================================================================
// CRUD GUIDE TEMPLATES
// ============================================================================

export const adminCreateBloggerGuideTemplate = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; templateId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminCreateBloggerGuideTemplateInput;
    const db = getFirestore();

    try {
      const templateRef = db.collection("blogger_guide_templates").doc();
      const now = Timestamp.now();

      const template: BloggerGuideTemplate = {
        id: templateRef.id,
        name: input.name,
        nameTranslations: input.nameTranslations as BloggerGuideTemplate["nameTranslations"],
        description: input.description,
        descriptionTranslations: input.descriptionTranslations as BloggerGuideTemplate["descriptionTranslations"],
        content: input.content,
        contentTranslations: input.contentTranslations as BloggerGuideTemplate["contentTranslations"],
        targetAudience: input.targetAudience,
        recommendedWordCount: input.recommendedWordCount,
        seoKeywords: input.seoKeywords,
        isActive: true,
        order: input.order || 0,
        usageCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: request.auth.uid,
      };

      await templateRef.set(template);

      return { success: true, templateId: templateRef.id };
    } catch (error) {
      logger.error("[adminCreateBloggerGuideTemplate] Error", { error });
      throw new HttpsError("internal", "Failed to create template");
    }
  }
);

export const adminUpdateBloggerGuideTemplate = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminUpdateBloggerGuideTemplateInput;
    const db = getFirestore();

    if (!input?.templateId) {
      throw new HttpsError("invalid-argument", "Template ID is required");
    }

    try {
      const { templateId, ...updates } = input;
      await db.collection("blogger_guide_templates").doc(templateId).update({
        ...updates,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error("[adminUpdateBloggerGuideTemplate] Error", { error });
      throw new HttpsError("internal", "Failed to update template");
    }
  }
);

// ============================================================================
// CRUD GUIDE COPY TEXTS
// ============================================================================

export const adminCreateBloggerGuideCopyText = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; textId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminCreateBloggerGuideCopyTextInput;
    const db = getFirestore();

    try {
      const textRef = db.collection("blogger_guide_copy_texts").doc();
      const now = Timestamp.now();

      const text: BloggerGuideCopyText = {
        id: textRef.id,
        name: input.name,
        nameTranslations: input.nameTranslations as BloggerGuideCopyText["nameTranslations"],
        category: input.category,
        content: input.content,
        contentTranslations: input.contentTranslations as BloggerGuideCopyText["contentTranslations"],
        characterCount: input.content.length,
        isActive: true,
        order: input.order || 0,
        copyCount: 0,
        createdAt: now,
        updatedAt: now,
        createdBy: request.auth.uid,
      };

      await textRef.set(text);

      return { success: true, textId: textRef.id };
    } catch (error) {
      logger.error("[adminCreateBloggerGuideCopyText] Error", { error });
      throw new HttpsError("internal", "Failed to create copy text");
    }
  }
);

export const adminUpdateBloggerGuideCopyText = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminUpdateBloggerGuideCopyTextInput;
    const db = getFirestore();

    if (!input?.textId) {
      throw new HttpsError("invalid-argument", "Text ID is required");
    }

    try {
      const { textId, content, ...otherUpdates } = input;
      const updates: Record<string, unknown> = {
        ...otherUpdates,
        updatedAt: Timestamp.now(),
      };

      if (content) {
        updates.content = content;
        updates.characterCount = content.length;
      }

      await db.collection("blogger_guide_copy_texts").doc(textId).update(updates);

      return { success: true };
    } catch (error) {
      logger.error("[adminUpdateBloggerGuideCopyText] Error", { error });
      throw new HttpsError("internal", "Failed to update copy text");
    }
  }
);

// ============================================================================
// CRUD GUIDE BEST PRACTICES
// ============================================================================

export const adminCreateBloggerGuideBestPractice = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; practiceId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminCreateBloggerGuideBestPracticeInput;
    const db = getFirestore();

    try {
      const practiceRef = db.collection("blogger_guide_best_practices").doc();
      const now = Timestamp.now();

      const practice: BloggerGuideBestPractice = {
        id: practiceRef.id,
        title: input.title,
        titleTranslations: input.titleTranslations as BloggerGuideBestPractice["titleTranslations"],
        content: input.content,
        contentTranslations: input.contentTranslations as BloggerGuideBestPractice["contentTranslations"],
        category: input.category,
        icon: input.icon,
        isActive: true,
        order: input.order || 0,
        createdAt: now,
        updatedAt: now,
        createdBy: request.auth.uid,
      };

      await practiceRef.set(practice);

      return { success: true, practiceId: practiceRef.id };
    } catch (error) {
      logger.error("[adminCreateBloggerGuideBestPractice] Error", { error });
      throw new HttpsError("internal", "Failed to create best practice");
    }
  }
);

export const adminUpdateBloggerGuideBestPractice = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const input = request.data as AdminUpdateBloggerGuideBestPracticeInput;
    const db = getFirestore();

    if (!input?.practiceId) {
      throw new HttpsError("invalid-argument", "Practice ID is required");
    }

    try {
      const { practiceId, ...updates } = input;
      await db.collection("blogger_guide_best_practices").doc(practiceId).update({
        ...updates,
        updatedAt: Timestamp.now(),
      });

      return { success: true };
    } catch (error) {
      logger.error("[adminUpdateBloggerGuideBestPractice] Error", { error });
      throw new HttpsError("internal", "Failed to update best practice");
    }
  }
);

// ============================================================================
// EXPORT BLOGGERS
// ============================================================================

export const adminExportBloggers = onCall(
  {
    region: "europe-west2",
    memory: "1GiB",
    cpu: 0.083,
    timeoutSeconds: 300,
  },
  async (request): Promise<{ success: boolean; data: string; count: number }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { format = "csv", status } = request.data as { format?: "csv" | "json"; status?: string };
    const db = getFirestore();

    try {
      let query: FirebaseFirestore.Query = db.collection("bloggers");

      if (status) {
        query = query.where("status", "==", status);
      }

      const snapshot = await query.get();
      const bloggers = snapshot.docs.map(doc => {
        const data = doc.data() as Blogger;
        return {
          id: data.id,
          email: data.email,
          firstName: data.firstName,
          lastName: data.lastName,
          country: data.country,
          status: data.status,
          blogUrl: data.blogUrl,
          blogName: data.blogName,
          blogTheme: data.blogTheme,
          blogTraffic: data.blogTraffic,
          totalEarned: data.totalEarned / 100, // Convert to dollars
          totalClients: data.totalClients,
          totalRecruits: data.totalRecruits,
          createdAt: data.createdAt.toDate().toISOString(),
        };
      });

      let data: string;

      if (format === "csv") {
        const headers = Object.keys(bloggers[0] || {}).join(",");
        const rows = bloggers.map(b => Object.values(b).join(",")).join("\n");
        data = `\uFEFF${headers}\n${rows}`; // BOM UTF-8 pour compatibilité Excel
      } else {
        data = JSON.stringify(bloggers, null, 2);
      }

      logger.info("[adminExportBloggers] Export completed", {
        count: bloggers.length,
        format,
        adminId: request.auth.uid,
      });

      return {
        success: true,
        data,
        count: bloggers.length,
      };
    } catch (error) {
      logger.error("[adminExportBloggers] Error", { error });
      throw new HttpsError("internal", "Failed to export bloggers");
    }
  }
);

// ============================================================================
// GET LEADERBOARD (ADMIN)
// ============================================================================

export const adminGetBloggerLeaderboard = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
  },
  async (request): Promise<{ rankings: unknown[]; month: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { month } = request.data as { month?: string };
    const targetMonth = month || new Date().toISOString().slice(0, 7);
    const db = getFirestore();

    try {
      const rankingDoc = await db
        .collection("blogger_monthly_rankings")
        .doc(targetMonth)
        .get();

      if (rankingDoc.exists) {
        const data = rankingDoc.data();
        return {
          rankings: data?.rankings || [],
          month: targetMonth,
        };
      }

      return { rankings: [], month: targetMonth };
    } catch (error) {
      logger.error("[adminGetBloggerLeaderboard] Error", { error });
      throw new HttpsError("internal", "Failed to get leaderboard");
    }
  }
);

// ============================================================================
// GET RESOURCES (for Admin Console)
// ============================================================================

export const adminGetBloggerResources = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ files: unknown[]; texts: unknown[] }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const db = getFirestore();

    try {
      const [filesSnapshot, textsSnapshot] = await Promise.all([
        db.collection("blogger_resources").orderBy("order", "asc").get(),
        db.collection("blogger_resource_texts").orderBy("order", "asc").get(),
      ]);

      const files = filesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
        };
      });

      const texts = textsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
        };
      });

      return { files, texts };
    } catch (error) {
      logger.error("[adminGetBloggerResources] Error", { error });
      throw new HttpsError("internal", "Failed to get resources");
    }
  }
);

// ============================================================================
// GET GUIDE (for Admin Console)
// ============================================================================

export const adminGetBloggerGuide = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{
    templates: unknown[];
    copyTexts: unknown[];
    bestPractices: unknown[];
  }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const db = getFirestore();

    try {
      const [templatesSnapshot, copyTextsSnapshot, bestPracticesSnapshot] = await Promise.all([
        db.collection("blogger_guide_templates").orderBy("order", "asc").get(),
        db.collection("blogger_guide_copy_texts").orderBy("order", "asc").get(),
        db.collection("blogger_guide_best_practices").orderBy("order", "asc").get(),
      ]);

      const templates = templatesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
        };
      });

      const copyTexts = copyTextsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
        };
      });

      const bestPractices = bestPracticesSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || "",
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || "",
        };
      });

      return { templates, copyTexts, bestPractices };
    } catch (error) {
      logger.error("[adminGetBloggerGuide] Error", { error });
      throw new HttpsError("internal", "Failed to get guide");
    }
  }
);

// ============================================================================
// SAVE RESOURCE FILE (Create OR Update)
// ============================================================================

export const adminSaveBloggerResourceFile = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; resourceId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { resource, isNew } = request.data as { resource: any; isNew: boolean };
    const db = getFirestore();

    try {
      const now = Timestamp.now();

      if (isNew) {
        // Create new resource
        const resourceRef = db.collection("blogger_resources").doc();
        const newResource: BloggerResource = {
          id: resourceRef.id,
          category: resource.category,
          type: resource.type,
          name: resource.name,
          nameTranslations: resource.nameTranslations,
          description: resource.description,
          descriptionTranslations: resource.descriptionTranslations,
          fileUrl: resource.fileUrl,
          thumbnailUrl: resource.thumbnailUrl,
          fileSize: resource.fileSize,
          fileFormat: resource.fileFormat,
          dimensions: resource.dimensions,
          isActive: resource.isActive !== false,
          order: resource.order || 0,
          downloadCount: 0,
          createdAt: now,
          updatedAt: now,
          createdBy: request.auth.uid,
        };

        await resourceRef.set(newResource);
        return { success: true, resourceId: resourceRef.id };
      } else {
        // Update existing resource
        if (!resource.id) {
          throw new HttpsError("invalid-argument", "Resource ID is required for updates");
        }

        await db.collection("blogger_resources").doc(resource.id).update({
          category: resource.category,
          type: resource.type,
          name: resource.name,
          nameTranslations: resource.nameTranslations,
          description: resource.description,
          descriptionTranslations: resource.descriptionTranslations,
          fileUrl: resource.fileUrl,
          thumbnailUrl: resource.thumbnailUrl,
          fileSize: resource.fileSize,
          fileFormat: resource.fileFormat,
          dimensions: resource.dimensions,
          isActive: resource.isActive,
          order: resource.order,
          updatedAt: now,
        });

        return { success: true, resourceId: resource.id };
      }
    } catch (error) {
      logger.error("[adminSaveBloggerResourceFile] Error", { error });
      throw new HttpsError("internal", "Failed to save resource file");
    }
  }
);

// ============================================================================
// SAVE RESOURCE TEXT (Create OR Update)
// ============================================================================

export const adminSaveBloggerResourceText = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; resourceId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { resource, isNew } = request.data as { resource: any; isNew: boolean };
    const db = getFirestore();

    try {
      const now = Timestamp.now();

      if (isNew) {
        // Create new resource text
        const textRef = db.collection("blogger_resource_texts").doc();
        const newText: BloggerResourceText = {
          id: textRef.id,
          category: resource.category,
          type: resource.type,
          title: resource.title,
          titleTranslations: resource.titleTranslations,
          content: resource.content,
          contentTranslations: resource.contentTranslations,
          isActive: resource.isActive !== false,
          order: resource.order || 0,
          copyCount: 0,
          createdAt: now,
          updatedAt: now,
          createdBy: request.auth.uid,
        };

        await textRef.set(newText);
        return { success: true, resourceId: textRef.id };
      } else {
        // Update existing resource text
        if (!resource.id) {
          throw new HttpsError("invalid-argument", "Resource ID is required for updates");
        }

        await db.collection("blogger_resource_texts").doc(resource.id).update({
          category: resource.category,
          type: resource.type,
          title: resource.title,
          titleTranslations: resource.titleTranslations,
          content: resource.content,
          contentTranslations: resource.contentTranslations,
          isActive: resource.isActive,
          order: resource.order,
          updatedAt: now,
        });

        return { success: true, resourceId: resource.id };
      }
    } catch (error) {
      logger.error("[adminSaveBloggerResourceText] Error", { error });
      throw new HttpsError("internal", "Failed to save resource text");
    }
  }
);

// ============================================================================
// DELETE RESOURCE FILE
// ============================================================================

export const adminDeleteBloggerResourceFile = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { resourceId } = request.data as { resourceId: string };
    const db = getFirestore();

    if (!resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      await db.collection("blogger_resources").doc(resourceId).delete();
      return { success: true };
    } catch (error) {
      logger.error("[adminDeleteBloggerResourceFile] Error", { error });
      throw new HttpsError("internal", "Failed to delete resource file");
    }
  }
);

// ============================================================================
// DELETE RESOURCE TEXT
// ============================================================================

export const adminDeleteBloggerResourceText = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { resourceId } = request.data as { resourceId: string };
    const db = getFirestore();

    if (!resourceId) {
      throw new HttpsError("invalid-argument", "Resource ID is required");
    }

    try {
      await db.collection("blogger_resource_texts").doc(resourceId).delete();
      return { success: true };
    } catch (error) {
      logger.error("[adminDeleteBloggerResourceText] Error", { error });
      throw new HttpsError("internal", "Failed to delete resource text");
    }
  }
);

// ============================================================================
// SAVE GUIDE TEMPLATE (Create OR Update)
// ============================================================================

export const adminSaveBloggerGuideTemplate = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; templateId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { item, isNew } = request.data as { item: any; isNew: boolean };
    const db = getFirestore();

    try {
      const now = Timestamp.now();

      if (isNew) {
        // Create new template
        const templateRef = db.collection("blogger_guide_templates").doc();
        const newTemplate: BloggerGuideTemplate = {
          id: templateRef.id,
          name: item.titleFr || item.name || "",
          nameTranslations: {
            en: item.titleEn || item.nameTranslations?.en || "",
          },
          description: item.descriptionFr || item.description,
          descriptionTranslations: {
            en: item.descriptionEn || item.descriptionTranslations?.en,
          },
          content: item.contentFr || item.content || "",
          contentTranslations: {
            en: item.contentEn || item.contentTranslations?.en || "",
          },
          targetAudience: item.targetAudience || item.category,
          recommendedWordCount: item.recommendedWordCount,
          seoKeywords: item.seoKeywords,
          isActive: item.isActive !== false,
          order: item.order || 0,
          usageCount: 0,
          createdAt: now,
          updatedAt: now,
          createdBy: request.auth.uid,
        };

        await templateRef.set(newTemplate);
        return { success: true, templateId: templateRef.id };
      } else {
        // Update existing template
        if (!item.id) {
          throw new HttpsError("invalid-argument", "Template ID is required for updates");
        }

        await db.collection("blogger_guide_templates").doc(item.id).update({
          name: item.titleFr || item.name,
          nameTranslations: {
            en: item.titleEn || item.nameTranslations?.en || "",
          },
          description: item.descriptionFr || item.description,
          descriptionTranslations: {
            en: item.descriptionEn || item.descriptionTranslations?.en,
          },
          content: item.contentFr || item.content,
          contentTranslations: {
            en: item.contentEn || item.contentTranslations?.en || "",
          },
          targetAudience: item.targetAudience || item.category,
          recommendedWordCount: item.recommendedWordCount,
          seoKeywords: item.seoKeywords,
          isActive: item.isActive,
          order: item.order,
          updatedAt: now,
        });

        return { success: true, templateId: item.id };
      }
    } catch (error) {
      logger.error("[adminSaveBloggerGuideTemplate] Error", { error });
      throw new HttpsError("internal", "Failed to save guide template");
    }
  }
);

// ============================================================================
// SAVE GUIDE COPY TEXT (Create OR Update)
// ============================================================================

export const adminSaveBloggerGuideCopyText = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; textId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { item, isNew } = request.data as { item: any; isNew: boolean };
    const db = getFirestore();

    try {
      const now = Timestamp.now();

      if (isNew) {
        // Create new copy text
        const textRef = db.collection("blogger_guide_copy_texts").doc();
        const newText: BloggerGuideCopyText = {
          id: textRef.id,
          name: item.nameFr || item.name || "",
          nameTranslations: {
            en: item.nameEn || item.nameTranslations?.en || "",
          },
          content: item.textFr || item.content || "",
          contentTranslations: {
            en: item.textEn || item.contentTranslations?.en || "",
          },
          category: item.category || item.context,
          isActive: item.isActive !== false,
          order: item.order || 0,
          copyCount: 0,
          characterCount: (item.textFr || item.content || "").length,
          createdAt: now,
          updatedAt: now,
          createdBy: request.auth.uid,
        };

        await textRef.set(newText);
        return { success: true, textId: textRef.id };
      } else {
        // Update existing copy text
        if (!item.id) {
          throw new HttpsError("invalid-argument", "Text ID is required for updates");
        }

        await db.collection("blogger_guide_copy_texts").doc(item.id).update({
          name: item.nameFr || item.name,
          nameTranslations: {
            en: item.nameEn || item.nameTranslations?.en || "",
          },
          content: item.textFr || item.content,
          contentTranslations: {
            en: item.textEn || item.contentTranslations?.en || "",
          },
          category: item.category || item.context,
          isActive: item.isActive,
          order: item.order,
          updatedAt: now,
        });

        return { success: true, textId: item.id };
      }
    } catch (error) {
      logger.error("[adminSaveBloggerGuideCopyText] Error", { error });
      throw new HttpsError("internal", "Failed to save guide copy text");
    }
  }
);

// ============================================================================
// SAVE GUIDE BEST PRACTICE (Create OR Update)
// ============================================================================

export const adminSaveBloggerGuideBestPractice = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; practiceId: string }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { item, isNew } = request.data as { item: any; isNew: boolean };
    const db = getFirestore();

    try {
      const now = Timestamp.now();

      if (isNew) {
        // Create new best practice
        const practiceRef = db.collection("blogger_guide_best_practices").doc();
        const newPractice: BloggerGuideBestPractice = {
          id: practiceRef.id,
          title: item.titleFr || item.title || "",
          titleTranslations: {
            en: item.titleEn || item.titleTranslations?.en || "",
          },
          content: item.contentFr || item.content || "",
          contentTranslations: {
            en: item.contentEn || item.contentTranslations?.en || "",
          },
          category: item.category,
          icon: item.icon,
          isActive: item.isActive !== false,
          order: item.order || 0,
          createdAt: now,
          updatedAt: now,
          createdBy: request.auth.uid,
        };

        await practiceRef.set(newPractice);
        return { success: true, practiceId: practiceRef.id };
      } else {
        // Update existing best practice
        if (!item.id) {
          throw new HttpsError("invalid-argument", "Practice ID is required for updates");
        }

        await db.collection("blogger_guide_best_practices").doc(item.id).update({
          title: item.titleFr || item.title,
          titleTranslations: {
            en: item.titleEn || item.titleTranslations?.en || "",
          },
          content: item.contentFr || item.content,
          contentTranslations: {
            en: item.contentEn || item.contentTranslations?.en || "",
          },
          category: item.category,
          icon: item.icon,
          isActive: item.isActive,
          order: item.order,
          updatedAt: now,
        });

        return { success: true, practiceId: item.id };
      }
    } catch (error) {
      logger.error("[adminSaveBloggerGuideBestPractice] Error", { error });
      throw new HttpsError("internal", "Failed to save guide best practice");
    }
  }
);

// ============================================================================
// DELETE GUIDE TEMPLATE
// ============================================================================

export const adminDeleteBloggerGuideTemplate = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { templateId } = request.data as { templateId: string };
    const db = getFirestore();

    if (!templateId) {
      throw new HttpsError("invalid-argument", "Template ID is required");
    }

    try {
      await db.collection("blogger_guide_templates").doc(templateId).delete();
      return { success: true };
    } catch (error) {
      logger.error("[adminDeleteBloggerGuideTemplate] Error", { error });
      throw new HttpsError("internal", "Failed to delete guide template");
    }
  }
);

// ============================================================================
// DELETE GUIDE COPY TEXT
// ============================================================================

export const adminDeleteBloggerGuideCopyText = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { textId } = request.data as { textId: string };
    const db = getFirestore();

    if (!textId) {
      throw new HttpsError("invalid-argument", "Text ID is required");
    }

    try {
      await db.collection("blogger_guide_copy_texts").doc(textId).delete();
      return { success: true };
    } catch (error) {
      logger.error("[adminDeleteBloggerGuideCopyText] Error", { error });
      throw new HttpsError("internal", "Failed to delete guide copy text");
    }
  }
);

// ============================================================================
// BULK ACTIONS
// ============================================================================

export const adminBulkBloggerAction = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; processed: number; errors: number }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { bloggerIds, action, reason } = request.data as {
      bloggerIds: string[];
      action: "activate" | "suspend" | "email";
      reason?: string;
    };

    if (!bloggerIds || !Array.isArray(bloggerIds) || bloggerIds.length === 0) {
      throw new HttpsError("invalid-argument", "Blogger IDs array is required");
    }
    if (!action || !["activate", "suspend", "email"].includes(action)) {
      throw new HttpsError("invalid-argument", "Action must be activate, suspend, or email");
    }
    if (bloggerIds.length > 100) {
      throw new HttpsError("invalid-argument", "Maximum 100 bloggers per bulk action");
    }

    const db = getFirestore();
    let processed = 0;
    let errors = 0;

    for (const bloggerId of bloggerIds) {
      try {
        if (action === "activate" || action === "suspend") {
          const newStatus = action === "activate" ? "active" : "suspended";
          await db.collection("bloggers").doc(bloggerId).update({
            status: newStatus,
            suspensionReason: action === "suspend" ? (reason || "Suspended by admin") : null,
            adminNotes: `Bulk ${action} by ${request.auth.uid} on ${new Date().toISOString()}`,
            updatedAt: Timestamp.now(),
          });

          await db.collection("blogger_notifications").add({
            bloggerId,
            type: "system",
            title: action === "activate" ? "Votre compte a été réactivé" : "Mise à jour de votre compte",
            message: action === "activate"
              ? "Votre compte blogueur est à nouveau actif."
              : `Votre compte a été suspendu. Raison: ${reason || "Non précisée"}`,
            isRead: false,
            emailSent: false,
            createdAt: Timestamp.now(),
          });
        }
        // "email" action: notification only (actual email sending handled separately)
        else if (action === "email") {
          await db.collection("blogger_notifications").add({
            bloggerId,
            type: "system",
            title: "Message de l'administrateur",
            message: reason || "Vous avez un message de l'administrateur.",
            isRead: false,
            emailSent: false,
            createdAt: Timestamp.now(),
          });
        }
        processed++;
      } catch (err) {
        logger.error("[adminBulkBloggerAction] Error on blogger", { bloggerId, action, err });
        errors++;
      }
    }

    logger.info("[adminBulkBloggerAction] Bulk action completed", {
      action,
      total: bloggerIds.length,
      processed,
      errors,
      adminId: request.auth.uid,
    });

    return { success: errors === 0, processed, errors };
  }
);

// ============================================================================
// DELETE GUIDE BEST PRACTICE
// ============================================================================

export const adminDeleteBloggerGuideBestPractice = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const { practiceId } = request.data as { practiceId: string };
    const db = getFirestore();

    if (!practiceId) {
      throw new HttpsError("invalid-argument", "Practice ID is required");
    }

    try {
      await db.collection("blogger_guide_best_practices").doc(practiceId).delete();
      return { success: true };
    } catch (error) {
      logger.error("[adminDeleteBloggerGuideBestPractice] Error", { error });
      throw new HttpsError("internal", "Failed to delete guide best practice");
    }
  }
);

// ============================================================================
// GET BLOGGER CONFIG HISTORY
// ============================================================================

export const adminGetBloggerConfigHistory = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ history: BloggerConfigHistoryEntry[] }> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    await checkAdmin(request.auth.uid);

    const db = getFirestore();
    try {
      const configDoc = await db.collection("blogger_config").doc("current").get();
      if (!configDoc.exists) {
        return { history: [] };
      }
      const data = configDoc.data() || {};
      const history = Array.isArray(data.configHistory) ? data.configHistory : [];
      return { history };
    } catch (error) {
      logger.error("[adminGetBloggerConfigHistory] Error", { error });
      throw new HttpsError("internal", "Failed to fetch config history");
    }
  }
);

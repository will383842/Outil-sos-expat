/**
 * Admin Callables for Training Module Management
 *
 * Allows administrators to:
 * - List all training modules
 * - Create new modules
 * - Update existing modules
 * - Delete modules
 * - Seed default modules
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  ChatterTrainingModule,
  TrainingSlide,
  TrainingQuizQuestion,
  TrainingModuleStatus,
  ChatterTrainingCategory,
} from "../types";
import { seedChatterTrainingModules } from "../seeds/trainingModulesSeed";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// Helper to check admin role
async function checkAdminRole(uid: string): Promise<boolean> {
  const db = getFirestore();
  const userDoc = await db.collection("users").doc(uid).get();
  if (!userDoc.exists) return false;
  const userData = userDoc.data();
  return userData?.role === "admin" || userData?.isAdmin === true;
}

// ============================================================================
// LIST TRAINING MODULES (Admin)
// ============================================================================

export const adminGetTrainingModules = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{
    modules: Array<ChatterTrainingModule & { studentsCount: number }>;
    total: number;
  }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const isAdmin = await checkAdminRole(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const db = getFirestore();

    try {
      const modulesQuery = await db
        .collection("chatter_training_modules")
        .orderBy("order", "asc")
        .get();

      const modules = await Promise.all(
        modulesQuery.docs.map(async (doc) => {
          const module = { id: doc.id, ...doc.data() } as ChatterTrainingModule;

          // Count students who started this module
          const progressQuery = await db
            .collectionGroup("modules")
            .where("moduleId", "==", doc.id)
            .count()
            .get();

          return {
            ...module,
            createdAt: (module.createdAt as unknown as Timestamp).toDate().toISOString() as unknown as Timestamp,
            updatedAt: (module.updatedAt as unknown as Timestamp).toDate().toISOString() as unknown as Timestamp,
            studentsCount: progressQuery.data().count,
          };
        })
      );

      return { modules, total: modules.length };
    } catch (error) {
      logger.error("[adminGetTrainingModules] Error", { error });
      throw new HttpsError("internal", "Failed to get training modules");
    }
  }
);

// ============================================================================
// CREATE TRAINING MODULE (Admin)
// ============================================================================

interface CreateModuleInput {
  title: string;
  titleTranslations?: Record<string, string>;
  description: string;
  descriptionTranslations?: Record<string, string>;
  category: ChatterTrainingCategory;
  coverImageUrl?: string;
  introVideoUrl?: string;
  estimatedMinutes: number;
  isRequired: boolean;
  prerequisites: string[];
  passingScore: number;
  slides: TrainingSlide[];
  quizQuestions: TrainingQuizQuestion[];
  status?: TrainingModuleStatus;
}

export const adminCreateTrainingModule = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; moduleId: string }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const isAdmin = await checkAdminRole(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const input = request.data as CreateModuleInput;

    // Validation
    if (!input.title || !input.description || !input.category) {
      throw new HttpsError("invalid-argument", "Title, description, and category are required");
    }

    const db = getFirestore();

    try {
      // Get next order number
      const existingModules = await db
        .collection("chatter_training_modules")
        .orderBy("order", "desc")
        .limit(1)
        .get();

      const nextOrder = existingModules.empty
        ? 1
        : (existingModules.docs[0].data().order || 0) + 1;

      const moduleRef = db.collection("chatter_training_modules").doc();
      const moduleDoc: ChatterTrainingModule = {
        id: moduleRef.id,
        order: nextOrder,
        title: input.title,
        titleTranslations: input.titleTranslations,
        description: input.description,
        descriptionTranslations: input.descriptionTranslations,
        category: input.category,
        coverImageUrl: input.coverImageUrl,
        introVideoUrl: input.introVideoUrl,
        estimatedMinutes: input.estimatedMinutes || 15,
        isRequired: input.isRequired ?? false,
        prerequisites: input.prerequisites || [],
        passingScore: input.passingScore || 80,
        slides: input.slides || [],
        quizQuestions: input.quizQuestions || [],
        status: input.status || "draft",
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: request.auth.uid,
      };

      await moduleRef.set(moduleDoc);

      logger.info("[adminCreateTrainingModule] Module created", {
        moduleId: moduleRef.id,
        title: input.title,
        createdBy: request.auth.uid,
      });

      return { success: true, moduleId: moduleRef.id };
    } catch (error) {
      logger.error("[adminCreateTrainingModule] Error", { error });
      throw new HttpsError("internal", "Failed to create training module");
    }
  }
);

// ============================================================================
// UPDATE TRAINING MODULE (Admin)
// ============================================================================

interface UpdateModuleInput {
  moduleId: string;
  title?: string;
  titleTranslations?: Record<string, string>;
  description?: string;
  descriptionTranslations?: Record<string, string>;
  category?: ChatterTrainingCategory;
  coverImageUrl?: string;
  introVideoUrl?: string;
  estimatedMinutes?: number;
  isRequired?: boolean;
  prerequisites?: string[];
  passingScore?: number;
  slides?: TrainingSlide[];
  quizQuestions?: TrainingQuizQuestion[];
  status?: TrainingModuleStatus;
  order?: number;
}

export const adminUpdateTrainingModule = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const isAdmin = await checkAdminRole(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const input = request.data as UpdateModuleInput;

    if (!input.moduleId) {
      throw new HttpsError("invalid-argument", "Module ID is required");
    }

    const db = getFirestore();

    try {
      const moduleRef = db.collection("chatter_training_modules").doc(input.moduleId);
      const moduleDoc = await moduleRef.get();

      if (!moduleDoc.exists) {
        throw new HttpsError("not-found", "Module not found");
      }

      const updateData: Partial<ChatterTrainingModule> = {
        updatedAt: Timestamp.now(),
      };

      // Only update provided fields
      if (input.title !== undefined) updateData.title = input.title;
      if (input.titleTranslations !== undefined) updateData.titleTranslations = input.titleTranslations;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.descriptionTranslations !== undefined) updateData.descriptionTranslations = input.descriptionTranslations;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.coverImageUrl !== undefined) updateData.coverImageUrl = input.coverImageUrl;
      if (input.introVideoUrl !== undefined) updateData.introVideoUrl = input.introVideoUrl;
      if (input.estimatedMinutes !== undefined) updateData.estimatedMinutes = input.estimatedMinutes;
      if (input.isRequired !== undefined) updateData.isRequired = input.isRequired;
      if (input.prerequisites !== undefined) updateData.prerequisites = input.prerequisites;
      if (input.passingScore !== undefined) updateData.passingScore = input.passingScore;
      if (input.slides !== undefined) updateData.slides = input.slides;
      if (input.quizQuestions !== undefined) updateData.quizQuestions = input.quizQuestions;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.order !== undefined) updateData.order = input.order;

      await moduleRef.update(updateData);

      logger.info("[adminUpdateTrainingModule] Module updated", {
        moduleId: input.moduleId,
        updatedBy: request.auth.uid,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateTrainingModule] Error", { error });
      throw new HttpsError("internal", "Failed to update training module");
    }
  }
);

// ============================================================================
// DELETE TRAINING MODULE (Admin)
// ============================================================================

export const adminDeleteTrainingModule = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const isAdmin = await checkAdminRole(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { moduleId } = request.data as { moduleId: string };

    if (!moduleId) {
      throw new HttpsError("invalid-argument", "Module ID is required");
    }

    const db = getFirestore();

    try {
      const moduleRef = db.collection("chatter_training_modules").doc(moduleId);
      const moduleDoc = await moduleRef.get();

      if (!moduleDoc.exists) {
        throw new HttpsError("not-found", "Module not found");
      }

      // Check if module has students
      const progressQuery = await db
        .collectionGroup("modules")
        .where("moduleId", "==", moduleId)
        .limit(1)
        .get();

      if (!progressQuery.empty) {
        // Archive instead of delete if has students
        await moduleRef.update({
          status: "archived",
          updatedAt: Timestamp.now(),
        });
        logger.info("[adminDeleteTrainingModule] Module archived (has students)", {
          moduleId,
          archivedBy: request.auth.uid,
        });
      } else {
        // Delete if no students
        await moduleRef.delete();
        logger.info("[adminDeleteTrainingModule] Module deleted", {
          moduleId,
          deletedBy: request.auth.uid,
        });
      }

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminDeleteTrainingModule] Error", { error });
      throw new HttpsError("internal", "Failed to delete training module");
    }
  }
);

// ============================================================================
// SEED TRAINING MODULES (Admin)
// ============================================================================

export const adminSeedTrainingModules = onCall(
  {
    region: "europe-west2",
    memory: "512MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean; modulesCreated: number; errors: string[] }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const isAdmin = await checkAdminRole(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    try {
      const result = await seedChatterTrainingModules(request.auth.uid);

      logger.info("[adminSeedTrainingModules] Seed completed", {
        success: result.success,
        modulesCreated: result.modulesCreated,
        seededBy: request.auth.uid,
      });

      return result;
    } catch (error) {
      logger.error("[adminSeedTrainingModules] Error", { error });
      throw new HttpsError("internal", "Failed to seed training modules");
    }
  }
);

// ============================================================================
// REORDER MODULES (Admin)
// ============================================================================

export const adminReorderTrainingModules = onCall(
  {
    region: "europe-west2",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const isAdmin = await checkAdminRole(request.auth.uid);
    if (!isAdmin) {
      throw new HttpsError("permission-denied", "Admin access required");
    }

    const { moduleIds } = request.data as { moduleIds: string[] };

    if (!moduleIds || !Array.isArray(moduleIds) || moduleIds.length === 0) {
      throw new HttpsError("invalid-argument", "Module IDs array is required");
    }

    const db = getFirestore();
    const batch = db.batch();

    try {
      moduleIds.forEach((moduleId, index) => {
        const moduleRef = db.collection("chatter_training_modules").doc(moduleId);
        batch.update(moduleRef, {
          order: index + 1,
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();

      logger.info("[adminReorderTrainingModules] Modules reordered", {
        moduleIds,
        reorderedBy: request.auth.uid,
      });

      return { success: true };
    } catch (error) {
      logger.error("[adminReorderTrainingModules] Error", { error });
      throw new HttpsError("internal", "Failed to reorder modules");
    }
  }
);

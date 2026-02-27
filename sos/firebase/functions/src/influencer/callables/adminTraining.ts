/**
 * Admin Callables for Influencer Training Module Management
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  InfluencerTrainingModule,
  TrainingSlide,
  TrainingQuizQuestion,
  TrainingModuleStatus,
  InfluencerTrainingCategory,
} from "../types";
import { seedInfluencerTrainingModules } from "../seeds/trainingModulesSeed";

function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

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

export const adminGetInfluencerTrainingModules = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 5,
  },
  async (request): Promise<{
    modules: Array<InfluencerTrainingModule & { studentsCount: number }>;
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
        .collection("influencer_training_modules")
        .orderBy("order", "asc")
        .get();

      const modules = await Promise.all(
        modulesQuery.docs.map(async (doc) => {
          const module = { id: doc.id, ...doc.data() } as InfluencerTrainingModule;

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
      logger.error("[adminGetInfluencerTrainingModules] Error", { error });
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
  category: InfluencerTrainingCategory;
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

export const adminCreateInfluencerTrainingModule = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 5,
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

    if (!input.title || !input.description || !input.category) {
      throw new HttpsError("invalid-argument", "Title, description, and category are required");
    }

    const db = getFirestore();

    try {
      const existingModules = await db
        .collection("influencer_training_modules")
        .orderBy("order", "desc")
        .limit(1)
        .get();

      const nextOrder = existingModules.empty
        ? 1
        : (existingModules.docs[0].data().order || 0) + 1;

      const moduleRef = db.collection("influencer_training_modules").doc();
      const moduleDoc: InfluencerTrainingModule = {
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

      logger.info("[adminCreateInfluencerTrainingModule] Module created", {
        moduleId: moduleRef.id,
        title: input.title,
        createdBy: request.auth.uid,
      });

      return { success: true, moduleId: moduleRef.id };
    } catch (error) {
      logger.error("[adminCreateInfluencerTrainingModule] Error", { error });
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
  category?: InfluencerTrainingCategory;
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

export const adminUpdateInfluencerTrainingModule = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 5,
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
      const moduleRef = db.collection("influencer_training_modules").doc(input.moduleId);
      const moduleDoc = await moduleRef.get();

      if (!moduleDoc.exists) {
        throw new HttpsError("not-found", "Module not found");
      }

      const updateData: Partial<InfluencerTrainingModule> = {
        updatedAt: Timestamp.now(),
      };

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

      logger.info("[adminUpdateInfluencerTrainingModule] Module updated", {
        moduleId: input.moduleId,
        updatedBy: request.auth.uid,
      });

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminUpdateInfluencerTrainingModule] Error", { error });
      throw new HttpsError("internal", "Failed to update training module");
    }
  }
);

// ============================================================================
// DELETE TRAINING MODULE (Admin)
// ============================================================================

export const adminDeleteInfluencerTrainingModule = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 5,
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
      const moduleRef = db.collection("influencer_training_modules").doc(moduleId);
      const moduleDoc = await moduleRef.get();

      if (!moduleDoc.exists) {
        throw new HttpsError("not-found", "Module not found");
      }

      const progressQuery = await db
        .collectionGroup("modules")
        .where("moduleId", "==", moduleId)
        .limit(1)
        .get();

      if (!progressQuery.empty) {
        await moduleRef.update({
          status: "archived",
          updatedAt: Timestamp.now(),
        });
        logger.info("[adminDeleteInfluencerTrainingModule] Module archived", { moduleId });
      } else {
        await moduleRef.delete();
        logger.info("[adminDeleteInfluencerTrainingModule] Module deleted", { moduleId });
      }

      return { success: true };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[adminDeleteInfluencerTrainingModule] Error", { error });
      throw new HttpsError("internal", "Failed to delete training module");
    }
  }
);

// ============================================================================
// SEED TRAINING MODULES (Admin)
// ============================================================================

export const adminSeedInfluencerTrainingModules = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 120,
    maxInstances: 5,
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
      const result = await seedInfluencerTrainingModules(request.auth.uid);

      logger.info("[adminSeedInfluencerTrainingModules] Seed completed", {
        success: result.success,
        modulesCreated: result.modulesCreated,
        seededBy: request.auth.uid,
      });

      return result;
    } catch (error) {
      logger.error("[adminSeedInfluencerTrainingModules] Error", { error });
      throw new HttpsError("internal", "Failed to seed training modules");
    }
  }
);

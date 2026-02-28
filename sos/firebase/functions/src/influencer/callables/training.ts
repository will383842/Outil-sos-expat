/**
 * Callable: Training System for Influencers
 *
 * Provides:
 * - getTrainingModules: List all training modules with progress
 * - getTrainingModuleContent: Get full module content
 * - updateTrainingProgress: Update slide progress
 * - submitTrainingQuiz: Submit quiz answers and check completion
 * - getTrainingCertificate: Get certificate details
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp, FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Influencer,
  InfluencerTrainingModule,
  InfluencerTrainingProgress,
  InfluencerTrainingCertificate,
  GetInfluencerTrainingModulesResponse,
  GetInfluencerTrainingModuleContentResponse,
  SubmitInfluencerTrainingQuizInput,
  SubmitInfluencerTrainingQuizResponse,
  GetInfluencerTrainingCertificateResponse,
} from "../types";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

// ============================================================================
// GET TRAINING MODULES
// ============================================================================

/**
 * Get all training modules with user progress
 */
export const getInfluencerTrainingModules = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetInfluencerTrainingModulesResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // Check if training is enabled in config
      const configDoc = await db.collection("influencer_config").doc("current").get();
      if (configDoc.exists) {
        const config = configDoc.data();
        if (config?.trainingEnabled === false) {
          throw new HttpsError("unavailable", "Training is currently disabled");
        }
      }

      // Check user is an influencer
      const influencerDoc = await db.collection("influencers").doc(userId).get();
      if (!influencerDoc.exists) {
        throw new HttpsError("not-found", "Influencer profile not found");
      }

      // Get all published modules
      const modulesQuery = await db
        .collection("influencer_training_modules")
        .where("status", "==", "published")
        .orderBy("order", "asc")
        .get();

      // Get user's progress for all modules
      const progressQuery = await db
        .collection("influencer_training_progress")
        .doc(userId)
        .collection("modules")
        .get();

      const progressMap = new Map<string, InfluencerTrainingProgress>();
      progressQuery.docs.forEach((doc) => {
        progressMap.set(doc.id, doc.data() as InfluencerTrainingProgress);
      });

      // Build response
      const modules = modulesQuery.docs.map((doc) => {
        const module = doc.data() as InfluencerTrainingModule;
        const progress = progressMap.get(doc.id);

        return {
          id: doc.id,
          order: module.order,
          title: module.title,
          description: module.description,
          category: module.category,
          coverImageUrl: module.coverImageUrl,
          estimatedMinutes: module.estimatedMinutes,
          isRequired: module.isRequired,
          prerequisites: module.prerequisites,
          progress: progress
            ? {
                isStarted: true,
                isCompleted: progress.isCompleted,
                currentSlideIndex: progress.currentSlideIndex,
                totalSlides: module.slides.length,
                bestScore: progress.bestScore,
              }
            : null,
        };
      });

      // Calculate overall progress
      const completedModules = Array.from(progressMap.values()).filter(
        (p) => p.isCompleted
      ).length;
      const totalModules = modules.length;

      // Check if user has full certificate
      const certQuery = await db
        .collection("influencer_training_certificates")
        .where("influencerId", "==", userId)
        .where("type", "==", "full_program")
        .limit(1)
        .get();

      const hasCertificate = !certQuery.empty;
      const certificateId = hasCertificate ? certQuery.docs[0].id : undefined;

      return {
        modules,
        overallProgress: {
          completedModules,
          totalModules,
          completionPercent:
            totalModules > 0
              ? Math.round((completedModules / totalModules) * 100)
              : 0,
          hasCertificate,
          certificateId,
        },
      };
    } catch (error) {
      logger.error("[getInfluencerTrainingModules] Error", { userId, error });
      throw new HttpsError("internal", "Failed to get training modules");
    }
  }
);

// ============================================================================
// GET MODULE CONTENT
// ============================================================================

/**
 * Get full module content with slides and quiz
 */
export const getInfluencerTrainingModuleContent = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<GetInfluencerTrainingModuleContentResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { moduleId } = request.data as { moduleId: string };

    if (!moduleId) {
      throw new HttpsError("invalid-argument", "Module ID is required");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // Check user is an influencer
      const influencerDoc = await db.collection("influencers").doc(userId).get();
      if (!influencerDoc.exists) {
        throw new HttpsError("not-found", "Influencer profile not found");
      }

      // Get module
      const moduleDoc = await db
        .collection("influencer_training_modules")
        .doc(moduleId)
        .get();

      if (!moduleDoc.exists) {
        throw new HttpsError("not-found", "Training module not found");
      }

      const module = {
        id: moduleDoc.id,
        ...moduleDoc.data(),
      } as InfluencerTrainingModule;

      if (module.status !== "published") {
        throw new HttpsError("permission-denied", "Module is not available");
      }

      // Check prerequisites
      const blockedByPrerequisites: string[] = [];

      if (module.prerequisites.length > 0) {
        const progressQuery = await db
          .collection("influencer_training_progress")
          .doc(userId)
          .collection("modules")
          .get();

        const completedModules = new Set(
          progressQuery.docs
            .filter((doc) => (doc.data() as InfluencerTrainingProgress).isCompleted)
            .map((doc) => doc.id)
        );

        for (const prereqId of module.prerequisites) {
          if (!completedModules.has(prereqId)) {
            blockedByPrerequisites.push(prereqId);
          }
        }
      }

      const canAccess = blockedByPrerequisites.length === 0;

      // Get user's progress for this module
      const progressDoc = await db
        .collection("influencer_training_progress")
        .doc(userId)
        .collection("modules")
        .doc(moduleId)
        .get();

      let progress: InfluencerTrainingProgress | null = null;

      if (progressDoc.exists) {
        progress = progressDoc.data() as InfluencerTrainingProgress;
      } else if (canAccess) {
        // Create initial progress
        const newProgress: InfluencerTrainingProgress = {
          influencerId: userId,
          moduleId,
          moduleTitle: module.title,
          startedAt: Timestamp.now(),
          currentSlideIndex: 0,
          slidesViewed: [],
          quizAttempts: [],
          bestScore: 0,
          isCompleted: false,
        };

        await db
          .collection("influencer_training_progress")
          .doc(userId)
          .collection("modules")
          .doc(moduleId)
          .set(newProgress);

        progress = newProgress;
      }

      // Don't return quiz answers if not completed (to prevent cheating)
      const moduleForResponse = { ...module };
      if (!canAccess) {
        moduleForResponse.slides = [];
        moduleForResponse.quizQuestions = [];
      } else {
        // Remove correctAnswerId from quiz questions
        moduleForResponse.quizQuestions = module.quizQuestions.map((q) => ({
          ...q,
          correctAnswerId: "", // Hidden until submitted
        }));
      }

      return {
        module: moduleForResponse,
        progress: progress
          ? {
              ...progress,
              startedAt: (progress.startedAt as unknown as Timestamp)
                .toDate()
                .toISOString() as unknown as Timestamp,
              completedAt: progress.completedAt
                ? (progress.completedAt as unknown as Timestamp)
                    .toDate()
                    .toISOString() as unknown as Timestamp
                : undefined,
            }
          : null,
        canAccess,
        blockedByPrerequisites,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getInfluencerTrainingModuleContent] Error", {
        userId,
        moduleId,
        error,
      });
      throw new HttpsError("internal", "Failed to get module content");
    }
  }
);

// ============================================================================
// UPDATE PROGRESS
// ============================================================================

/**
 * Update slide progress
 */
export const updateInfluencerTrainingProgress = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<{ success: boolean }> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { moduleId, slideIndex } = request.data as {
      moduleId: string;
      slideIndex: number;
    };

    if (!moduleId || slideIndex === undefined) {
      throw new HttpsError(
        "invalid-argument",
        "Module ID and slide index are required"
      );
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      const progressRef = db
        .collection("influencer_training_progress")
        .doc(userId)
        .collection("modules")
        .doc(moduleId);

      await progressRef.update({
        currentSlideIndex: slideIndex,
        slidesViewed: FieldValue.arrayUnion(slideIndex),
      });

      return { success: true };
    } catch (error) {
      logger.error("[updateInfluencerTrainingProgress] Error", {
        userId,
        moduleId,
        error,
      });
      throw new HttpsError("internal", "Failed to update progress");
    }
  }
);

// ============================================================================
// SUBMIT QUIZ
// ============================================================================

/**
 * Submit quiz answers and check for module completion
 */
export const submitInfluencerTrainingQuiz = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 60,
    maxInstances: 1,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<SubmitInfluencerTrainingQuizResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { moduleId, answers } = request.data as SubmitInfluencerTrainingQuizInput;

    if (!moduleId || !answers || !Array.isArray(answers)) {
      throw new HttpsError(
        "invalid-argument",
        "Module ID and answers are required"
      );
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // Get influencer
      const influencerDoc = await db.collection("influencers").doc(userId).get();
      if (!influencerDoc.exists) {
        throw new HttpsError("not-found", "Influencer profile not found");
      }
      const influencer = influencerDoc.data() as Influencer;

      // Get module
      const moduleDoc = await db
        .collection("influencer_training_modules")
        .doc(moduleId)
        .get();

      if (!moduleDoc.exists) {
        throw new HttpsError("not-found", "Training module not found");
      }

      const module = moduleDoc.data() as InfluencerTrainingModule;

      // Evaluate answers
      const results: SubmitInfluencerTrainingQuizResponse["results"] = [];
      let correctCount = 0;

      for (const answer of answers) {
        const question = module.quizQuestions.find(
          (q) => q.id === answer.questionId
        );
        if (!question) continue;

        const isCorrect = question.correctAnswerId === answer.answerId;
        if (isCorrect) correctCount++;

        results.push({
          questionId: answer.questionId,
          isCorrect,
          correctAnswerId: question.correctAnswerId,
          explanation: question.explanation,
        });
      }

      const score = Math.round(
        (correctCount / module.quizQuestions.length) * 100
      );
      const passed = score >= module.passingScore;

      // Record quiz attempt
      const attemptData = {
        attemptedAt: Timestamp.now(),
        answers: answers.map((a) => ({
          questionId: a.questionId,
          answerId: a.answerId,
          isCorrect: results.find((r) => r.questionId === a.questionId)
            ?.isCorrect ?? false,
        })),
        score,
        passed,
      };

      const progressRef = db
        .collection("influencer_training_progress")
        .doc(userId)
        .collection("modules")
        .doc(moduleId);

      const progressDoc = await progressRef.get();
      const existingProgress = progressDoc.data() as InfluencerTrainingProgress;

      const newBestScore = Math.max(existingProgress?.bestScore || 0, score);

      await progressRef.update({
        quizAttempts: FieldValue.arrayUnion(attemptData),
        bestScore: newBestScore,
        isCompleted: passed,
        completedAt: passed ? Timestamp.now() : null,
      });

      let certificateId: string | undefined;
      let rewardGranted: SubmitInfluencerTrainingQuizResponse["rewardGranted"];

      // If passed, check if this completes the full program
      if (passed) {
        // Get all modules and progress
        const allModulesQuery = await db
          .collection("influencer_training_modules")
          .where("status", "==", "published")
          .where("isRequired", "==", true)
          .get();

        const allProgressQuery = await db
          .collection("influencer_training_progress")
          .doc(userId)
          .collection("modules")
          .get();

        const completedModuleIds = new Set(
          allProgressQuery.docs
            .filter(
              (doc) =>
                (doc.data() as InfluencerTrainingProgress).isCompleted ||
                doc.id === moduleId
            )
            .map((doc) => doc.id)
        );

        const allRequiredCompleted = allModulesQuery.docs.every((doc) =>
          completedModuleIds.has(doc.id)
        );

        // Create full program certificate if all required modules completed
        if (allRequiredCompleted) {
          // Check if certificate already exists
          const existingCertQuery = await db
            .collection("influencer_training_certificates")
            .where("influencerId", "==", userId)
            .where("type", "==", "full_program")
            .limit(1)
            .get();

          if (existingCertQuery.empty) {
            // Calculate average score
            let totalScore = 0;
            let moduleCount = 0;
            for (const doc of allProgressQuery.docs) {
              const progress = doc.data() as InfluencerTrainingProgress;
              if (progress.isCompleted || doc.id === moduleId) {
                totalScore += doc.id === moduleId ? score : progress.bestScore;
                moduleCount++;
              }
            }
            const averageScore =
              moduleCount > 0 ? Math.round(totalScore / moduleCount) : 0;

            // Generate verification code
            const verificationCode = `CERT-${userId.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

            const certRef = db.collection("influencer_training_certificates").doc();
            const certificate: InfluencerTrainingCertificate = {
              id: certRef.id,
              influencerId: userId,
              influencerName: `${influencer.firstName} ${influencer.lastName}`,
              moduleId: "all",
              type: "full_program",
              title: "Programme de Formation Complet Influenceur",
              averageScore,
              modulesCompleted: moduleCount,
              issuedAt: Timestamp.now(),
              verificationCode,
            };

            await certRef.set(certificate);
            certificateId = certRef.id;

            logger.info("[submitInfluencerTrainingQuiz] Full program certificate issued", {
              userId,
              certificateId,
              averageScore,
            });
          }
        }

        // Grant module completion reward if defined
        if (module.completionReward) {
          rewardGranted = module.completionReward;

          if (module.completionReward.type === "bonus" && module.completionReward.bonusAmount) {
            try {
              const { createCommission } = await import("../services/influencerCommissionService");
              const bonusResult = await createCommission({
                influencerId: userId,
                type: "signup_bonus",
                source: {
                  id: `training_${moduleId}`,
                  type: "user",
                  details: {},
                },
                amount: module.completionReward.bonusAmount,
                description: `Training completion bonus for module: ${module.title || moduleId}`,
              });

              if (bonusResult.success) {
                logger.info("[submitInfluencerTrainingQuiz] Training bonus commission created", {
                  userId,
                  moduleId,
                  bonusAmount: module.completionReward.bonusAmount,
                  commissionId: bonusResult.commissionId,
                });
              } else {
                logger.warn("[submitInfluencerTrainingQuiz] Training bonus commission failed", {
                  userId,
                  moduleId,
                  error: bonusResult.error,
                });
              }
            } catch (bonusError) {
              logger.error("[submitInfluencerTrainingQuiz] Error creating training bonus", {
                userId,
                moduleId,
                bonusError,
              });
            }
          }
        }
      }

      return {
        success: true,
        score,
        passed,
        passingScore: module.passingScore,
        results,
        moduleCompleted: passed,
        certificateId,
        rewardGranted,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[submitInfluencerTrainingQuiz] Error", {
        userId,
        moduleId,
        error,
      });
      throw new HttpsError("internal", "Failed to submit quiz");
    }
  }
);

// ============================================================================
// GET CERTIFICATE
// ============================================================================

/**
 * Get certificate details
 */
export const getInfluencerTrainingCertificate = onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    maxInstances: 1,
  },
  async (request): Promise<GetInfluencerTrainingCertificateResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { certificateId } = request.data as { certificateId: string };

    if (!certificateId) {
      throw new HttpsError("invalid-argument", "Certificate ID is required");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      const certDoc = await db
        .collection("influencer_training_certificates")
        .doc(certificateId)
        .get();

      if (!certDoc.exists) {
        throw new HttpsError("not-found", "Certificate not found");
      }

      const certificate = certDoc.data() as InfluencerTrainingCertificate;

      // Verify ownership
      if (certificate.influencerId !== userId) {
        throw new HttpsError("permission-denied", "Not your certificate");
      }

      const verificationUrl = `https://sos-expat.com/verify-certificate/${certificate.verificationCode}`;

      return {
        certificate: {
          ...certificate,
          issuedAt: (certificate.issuedAt as unknown as Timestamp)
            .toDate()
            .toISOString() as unknown as Timestamp,
        },
        verificationUrl,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getInfluencerTrainingCertificate] Error", {
        userId,
        certificateId,
        error,
      });
      throw new HttpsError("internal", "Failed to get certificate");
    }
  }
);

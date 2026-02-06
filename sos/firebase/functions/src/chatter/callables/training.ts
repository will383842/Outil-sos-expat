/**
 * Callable: Training System for Chatters
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
  Chatter,
  ChatterTrainingModule,
  ChatterTrainingProgress,
  ChatterTrainingCertificate,
  GetTrainingModulesResponse,
  GetTrainingModuleContentResponse,
  SubmitTrainingQuizInput,
  SubmitTrainingQuizResponse,
  GetTrainingCertificateResponse,
} from "../types";

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
export const getChatterTrainingModules = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<GetTrainingModulesResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // Check if training is enabled in config
      const configDoc = await db.collection("chatter_config").doc("current").get();
      if (configDoc.exists) {
        const config = configDoc.data();
        if (config?.trainingEnabled === false) {
          throw new HttpsError("unavailable", "Training is currently disabled");
        }
      }

      // Check user is a chatter
      const chatterDoc = await db.collection("chatters").doc(userId).get();
      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter profile not found");
      }

      // Get all published modules
      const modulesQuery = await db
        .collection("chatter_training_modules")
        .where("status", "==", "published")
        .orderBy("order", "asc")
        .get();

      // Get user's progress for all modules
      const progressQuery = await db
        .collection("chatter_training_progress")
        .doc(userId)
        .collection("modules")
        .get();

      const progressMap = new Map<string, ChatterTrainingProgress>();
      progressQuery.docs.forEach((doc) => {
        progressMap.set(doc.id, doc.data() as ChatterTrainingProgress);
      });

      // Build response
      const modules = modulesQuery.docs.map((doc) => {
        const module = doc.data() as ChatterTrainingModule;
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
        .collection("chatter_training_certificates")
        .where("chatterId", "==", userId)
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
      logger.error("[getChatterTrainingModules] Error", { userId, error });
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
export const getChatterTrainingModuleContent = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<GetTrainingModuleContentResponse> => {
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
      // Check user is a chatter
      const chatterDoc = await db.collection("chatters").doc(userId).get();
      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter profile not found");
      }

      // Get module
      const moduleDoc = await db
        .collection("chatter_training_modules")
        .doc(moduleId)
        .get();

      if (!moduleDoc.exists) {
        throw new HttpsError("not-found", "Training module not found");
      }

      const moduleData = moduleDoc.data();
      if (!moduleData) {
        throw new HttpsError("not-found", "Training module data is missing");
      }

      const module = {
        id: moduleDoc.id,
        ...moduleData,
        // Ensure arrays exist with defaults
        prerequisites: moduleData.prerequisites || [],
        quizQuestions: moduleData.quizQuestions || [],
        slides: moduleData.slides || [],
      } as ChatterTrainingModule;

      if (module.status !== "published") {
        throw new HttpsError("permission-denied", "Module is not available");
      }

      // Check prerequisites
      const blockedByPrerequisites: string[] = [];

      if (module.prerequisites && module.prerequisites.length > 0) {
        const progressQuery = await db
          .collection("chatter_training_progress")
          .doc(userId)
          .collection("modules")
          .get();

        const completedModules = new Set(
          progressQuery.docs
            .filter((doc) => (doc.data() as ChatterTrainingProgress).isCompleted)
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
        .collection("chatter_training_progress")
        .doc(userId)
        .collection("modules")
        .doc(moduleId)
        .get();

      let progress: ChatterTrainingProgress | null = null;

      if (progressDoc.exists) {
        progress = progressDoc.data() as ChatterTrainingProgress;
      } else if (canAccess) {
        // Create initial progress
        const newProgress: ChatterTrainingProgress = {
          chatterId: userId,
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
          .collection("chatter_training_progress")
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
        // Remove correctAnswerId from quiz questions (with null check)
        moduleForResponse.quizQuestions = (module.quizQuestions || []).map((q) => ({
          ...q,
          correctAnswerId: "", // Hidden until submitted
        }));
      }

      // Safely convert Timestamps to ISO strings for response
      // The API returns ISO strings but types expect Timestamp (for internal use)
      let progressResponse: ChatterTrainingProgress | null = null;
      if (progress) {
        const startedAtTs = progress.startedAt as unknown as Timestamp;
        const completedAtTs = progress.completedAt as unknown as Timestamp | undefined;

        progressResponse = {
          ...progress,
          // Convert Timestamps to ISO strings for JSON serialization
          startedAt: (startedAtTs?.toDate?.()
            ? startedAtTs.toDate().toISOString()
            : progress.startedAt) as unknown as Timestamp,
          completedAt: (completedAtTs?.toDate?.()
            ? completedAtTs.toDate().toISOString()
            : progress.completedAt) as unknown as Timestamp | undefined,
        };
      }

      return {
        module: moduleForResponse,
        progress: progressResponse,
        canAccess,
        blockedByPrerequisites,
      };
    } catch (error) {
      if (error instanceof HttpsError) throw error;
      logger.error("[getChatterTrainingModuleContent] Error", {
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
export const updateChatterTrainingProgress = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
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
        .collection("chatter_training_progress")
        .doc(userId)
        .collection("modules")
        .doc(moduleId);

      await progressRef.update({
        currentSlideIndex: slideIndex,
        slidesViewed: FieldValue.arrayUnion(slideIndex),
      });

      return { success: true };
    } catch (error) {
      logger.error("[updateChatterTrainingProgress] Error", {
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
export const submitChatterTrainingQuiz = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 60,
  },
  async (request): Promise<SubmitTrainingQuizResponse> => {
    ensureInitialized();

    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const { moduleId, answers } = request.data as SubmitTrainingQuizInput;

    if (!moduleId || !answers || !Array.isArray(answers)) {
      throw new HttpsError(
        "invalid-argument",
        "Module ID and answers are required"
      );
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // Get chatter
      const chatterDoc = await db.collection("chatters").doc(userId).get();
      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter profile not found");
      }
      const chatter = chatterDoc.data() as Chatter;

      // Get module
      const moduleDoc = await db
        .collection("chatter_training_modules")
        .doc(moduleId)
        .get();

      if (!moduleDoc.exists) {
        throw new HttpsError("not-found", "Training module not found");
      }

      const moduleData = moduleDoc.data();
      if (!moduleData) {
        throw new HttpsError("not-found", "Training module data is missing");
      }

      const module = {
        ...moduleData,
        quizQuestions: moduleData.quizQuestions || [],
        passingScore: moduleData.passingScore || 70,
      } as ChatterTrainingModule;

      // Validate quiz has questions
      if (module.quizQuestions.length === 0) {
        throw new HttpsError("failed-precondition", "Module has no quiz questions");
      }

      // Evaluate answers
      const results: SubmitTrainingQuizResponse["results"] = [];
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
        .collection("chatter_training_progress")
        .doc(userId)
        .collection("modules")
        .doc(moduleId);

      const progressDoc = await progressRef.get();
      if (!progressDoc.exists) {
        throw new HttpsError("not-found", "Training progress not found. Please start the module first.");
      }
      const existingProgress = progressDoc.data() as ChatterTrainingProgress;

      const newBestScore = Math.max(existingProgress?.bestScore || 0, score);

      await progressRef.update({
        quizAttempts: FieldValue.arrayUnion(attemptData),
        bestScore: newBestScore,
        isCompleted: passed,
        completedAt: passed ? Timestamp.now() : null,
      });

      let certificateId: string | undefined;
      let rewardGranted: SubmitTrainingQuizResponse["rewardGranted"];

      // If passed, check if this completes the full program
      if (passed) {
        // Get all modules and progress
        const allModulesQuery = await db
          .collection("chatter_training_modules")
          .where("status", "==", "published")
          .where("isRequired", "==", true)
          .get();

        const allProgressQuery = await db
          .collection("chatter_training_progress")
          .doc(userId)
          .collection("modules")
          .get();

        const completedModuleIds = new Set(
          allProgressQuery.docs
            .filter(
              (doc) =>
                (doc.data() as ChatterTrainingProgress).isCompleted ||
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
            .collection("chatter_training_certificates")
            .where("chatterId", "==", userId)
            .where("type", "==", "full_program")
            .limit(1)
            .get();

          if (existingCertQuery.empty) {
            // Calculate average score
            let totalScore = 0;
            let moduleCount = 0;
            for (const doc of allProgressQuery.docs) {
              const progress = doc.data() as ChatterTrainingProgress;
              if (progress.isCompleted || doc.id === moduleId) {
                totalScore += doc.id === moduleId ? score : progress.bestScore;
                moduleCount++;
              }
            }
            const averageScore =
              moduleCount > 0 ? Math.round(totalScore / moduleCount) : 0;

            // Generate verification code
            const verificationCode = `CERT-${userId.substring(0, 4).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;

            const certRef = db.collection("chatter_training_certificates").doc();
            const certificate: ChatterTrainingCertificate = {
              id: certRef.id,
              chatterId: userId,
              chatterName: `${chatter.firstName} ${chatter.lastName}`,
              moduleId: "all",
              type: "full_program",
              title: "Programme de Formation Complet",
              averageScore,
              modulesCompleted: moduleCount,
              issuedAt: Timestamp.now(),
              verificationCode,
            };

            await certRef.set(certificate);
            certificateId = certRef.id;

            logger.info("[submitChatterTrainingQuiz] Full program certificate issued", {
              userId,
              certificateId,
              averageScore,
            });
          }
        }

        // Grant module completion reward if defined
        if (module.completionReward) {
          rewardGranted = module.completionReward;

          // Award badge or bonus here if needed
          if (module.completionReward.type === "badge" && module.completionReward.badgeType) {
            // Award badge (implementation depends on existing badge system)
            logger.info("[submitChatterTrainingQuiz] Badge reward pending", {
              userId,
              badgeType: module.completionReward.badgeType,
            });
          }

          if (module.completionReward.type === "bonus" && module.completionReward.bonusAmount) {
            // Create bonus commission (implementation depends on commission system)
            logger.info("[submitChatterTrainingQuiz] Bonus reward pending", {
              userId,
              bonusAmount: module.completionReward.bonusAmount,
            });
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
      logger.error("[submitChatterTrainingQuiz] Error", {
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
export const getChatterTrainingCertificate = onCall(
  {
    region: "europe-west1",
    memory: "256MiB",
    timeoutSeconds: 30,
  },
  async (request): Promise<GetTrainingCertificateResponse> => {
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
        .collection("chatter_training_certificates")
        .doc(certificateId)
        .get();

      if (!certDoc.exists) {
        throw new HttpsError("not-found", "Certificate not found");
      }

      const certificate = certDoc.data() as ChatterTrainingCertificate;

      // Verify ownership
      if (certificate.chatterId !== userId) {
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
      logger.error("[getChatterTrainingCertificate] Error", {
        userId,
        certificateId,
        error,
      });
      throw new HttpsError("internal", "Failed to get certificate");
    }
  }
);

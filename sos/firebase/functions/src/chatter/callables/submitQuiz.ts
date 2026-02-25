/**
 * Callable: submitQuiz
 *
 * Submits quiz answers and evaluates if chatter passes.
 * On pass: generates affiliate codes and activates account.
 * On fail: records attempt and enforces retry delay.
 */

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { getApps, initializeApp } from "firebase-admin/app";

import {
  Chatter,
  ChatterQuizQuestion,
  ChatterQuizAttempt,
  SubmitQuizInput,
  SubmitQuizResponse,
} from "../types";
import { getChatterConfigCached } from "../utils";
import {
  generateChatterClientCode,
  generateChatterRecruitmentCode,
} from "../utils";
import { ALLOWED_ORIGINS } from "../../lib/functionConfigs";

// Lazy initialization
function ensureInitialized() {
  if (!getApps().length) {
    initializeApp();
  }
}

export const submitQuiz = onCall(
  {
    region: "us-central1",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
    cors: ALLOWED_ORIGINS,
  },
  async (request): Promise<SubmitQuizResponse> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    // 2. Validate input
    const input = request.data as SubmitQuizInput;

    if (!input.answers || !Array.isArray(input.answers)) {
      throw new HttpsError("invalid-argument", "Answers array is required");
    }

    if (!input.startedAt) {
      throw new HttpsError("invalid-argument", "Start time is required");
    }

    try {
      // 3. Get chatter data
      const chatterDoc = await db.collection("chatters").doc(userId).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter profile not found. Please register first.");
      }

      const chatter = chatterDoc.data() as Chatter;

      // 4. Check chatter status
      if (chatter.status === "active") {
        throw new HttpsError("failed-precondition", "You have already passed the quiz");
      }

      if (chatter.status === "suspended" || chatter.status === "banned") {
        throw new HttpsError("permission-denied", `Your account is ${chatter.status}`);
      }

      // 5. Get config and check retry delay
      const config = await getChatterConfigCached();

      if (chatter.lastQuizAttempt) {
        const lastAttemptMs = chatter.lastQuizAttempt.toMillis();
        const retryDelayMs = config.quizRetryDelayHours * 60 * 60 * 1000;
        const canRetryAt = lastAttemptMs + retryDelayMs;

        if (Date.now() < canRetryAt) {
          const remainingMs = canRetryAt - Date.now();
          const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

          throw new HttpsError(
            "failed-precondition",
            `Please wait ${remainingHours} hour(s) before retrying the quiz`
          );
        }
      }

      // 6. Get questions and validate answers
      const questionIds = input.answers.map((a) => a.questionId);

      if (questionIds.length < config.quizQuestionsCount) {
        throw new HttpsError(
          "invalid-argument",
          `Expected ${config.quizQuestionsCount} answers, got ${questionIds.length}`
        );
      }

      // Fetch all questions
      const questionsSnapshot = await db
        .collection("chatter_quiz_questions")
        .where("isActive", "==", true)
        .get();

      const questionsMap = new Map<string, ChatterQuizQuestion>();
      questionsSnapshot.docs.forEach((doc) => {
        questionsMap.set(doc.id, doc.data() as ChatterQuizQuestion);
      });

      // Validate each answer
      const results: SubmitQuizResponse["results"] = [];
      let correctCount = 0;

      for (const answer of input.answers) {
        const question = questionsMap.get(answer.questionId);

        if (!question) {
          results.push({
            questionId: answer.questionId,
            isCorrect: false,
            correctAnswerId: "unknown",
          });
          continue;
        }

        const isCorrect = answer.answerId === question.correctAnswerId;

        if (isCorrect) {
          correctCount++;
        }

        results.push({
          questionId: answer.questionId,
          isCorrect,
          correctAnswerId: question.correctAnswerId,
          explanation: question.explanation,
        });
      }

      // 7. Calculate score
      const totalQuestions = input.answers.length;
      const score = Math.round((correctCount / totalQuestions) * 100);
      const passed = score >= config.quizPassingScore;

      // 8. Calculate duration
      const startTime = new Date(input.startedAt).getTime();
      const endTime = Date.now();
      const durationSeconds = Math.round((endTime - startTime) / 1000);

      // 9. Create quiz attempt record
      const now = Timestamp.now();
      const attemptRef = db.collection("chatter_quiz_attempts").doc();

      const attempt: ChatterQuizAttempt = {
        id: attemptRef.id,
        chatterId: userId,
        chatterEmail: chatter.email,
        questionIds,
        answers: input.answers.map((a) => ({
          questionId: a.questionId,
          answerId: a.answerId,
          isCorrect: results.find((r) => r.questionId === a.questionId)?.isCorrect || false,
        })),
        score,
        passed,
        durationSeconds,
        startedAt: Timestamp.fromDate(new Date(input.startedAt)),
        completedAt: now,
      };

      // 10. Update chatter and create attempt in transaction
      let affiliateCodeClient: string | undefined;
      let affiliateCodeRecruitment: string | undefined;

      await db.runTransaction(async (transaction) => {
        // Create attempt record
        transaction.set(attemptRef, attempt);

        // Update chatter
        const chatterRef = db.collection("chatters").doc(userId);

        if (passed) {
          // Generate affiliate codes
          affiliateCodeClient = await generateChatterClientCode(
            chatter.firstName,
            chatter.email
          );
          affiliateCodeRecruitment = generateChatterRecruitmentCode(affiliateCodeClient);

          transaction.update(chatterRef, {
            status: "active",
            affiliateCodeClient,
            affiliateCodeRecruitment,
            quizAttempts: chatter.quizAttempts + 1,
            lastQuizAttempt: now,
            quizPassedAt: now,
            badges: ["first_quiz_pass"], // Add first badge
            updatedAt: now,
          });

          // Update user document
          const userRef = db.collection("users").doc(userId);
          transaction.update(userRef, {
            chatterStatus: "active",
            updatedAt: now,
          });
        } else {
          // Just record failed attempt
          transaction.update(chatterRef, {
            quizAttempts: chatter.quizAttempts + 1,
            lastQuizAttempt: now,
            updatedAt: now,
          });
        }
      });

      logger.info("[submitQuiz] Quiz submitted", {
        chatterId: userId,
        score,
        passed,
        correctCount,
        totalQuestions,
        durationSeconds,
      });

      // 11. Build response
      const response: SubmitQuizResponse = {
        success: true,
        passed,
        score,
        correctAnswers: correctCount,
        totalQuestions,
        results,
      };

      if (passed) {
        response.affiliateCodeClient = affiliateCodeClient;
        response.affiliateCodeRecruitment = affiliateCodeRecruitment;
      } else {
        // Calculate retry time
        const retryDelayMs = config.quizRetryDelayHours * 60 * 60 * 1000;
        response.canRetryAt = new Date(Date.now() + retryDelayMs).toISOString();
      }

      return response;
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[submitQuiz] Error", { userId, error });
      throw new HttpsError("internal", "Failed to submit quiz");
    }
  }
);

/**
 * Callable: getQuizQuestions
 *
 * Gets random quiz questions for the chatter.
 */
export const getQuizQuestions = onCall(
  {
    region: "us-central1",
    memory: "128MiB",
    cpu: 0.083,
    timeoutSeconds: 30,
  },
  async (request): Promise<{
    success: boolean;
    questions: Array<{
      id: string;
      question: string;
      options: Array<{ id: string; text: string }>;
    }>;
    timeLimit: number;
  }> => {
    ensureInitialized();

    // 1. Check authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const userId = request.auth.uid;
    const db = getFirestore();

    try {
      // 2. Get chatter data
      const chatterDoc = await db.collection("chatters").doc(userId).get();

      if (!chatterDoc.exists) {
        throw new HttpsError("not-found", "Chatter profile not found");
      }

      const chatter = chatterDoc.data() as Chatter;

      // 3. Check status
      if (chatter.status === "active") {
        throw new HttpsError("failed-precondition", "You have already passed the quiz");
      }

      if (chatter.status === "suspended" || chatter.status === "banned") {
        throw new HttpsError("permission-denied", `Your account is ${chatter.status}`);
      }

      // 4. Check retry delay
      const config = await getChatterConfigCached();

      if (chatter.lastQuizAttempt) {
        const lastAttemptMs = chatter.lastQuizAttempt.toMillis();
        const retryDelayMs = config.quizRetryDelayHours * 60 * 60 * 1000;
        const canRetryAt = lastAttemptMs + retryDelayMs;

        if (Date.now() < canRetryAt) {
          const remainingMs = canRetryAt - Date.now();
          const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));

          throw new HttpsError(
            "failed-precondition",
            `Please wait ${remainingHours} hour(s) before retrying the quiz`
          );
        }
      }

      // 5. Get active questions
      const questionsSnapshot = await db
        .collection("chatter_quiz_questions")
        .where("isActive", "==", true)
        .orderBy("order", "asc")
        .get();

      if (questionsSnapshot.empty) {
        throw new HttpsError("failed-precondition", "No quiz questions available");
      }

      // 6. Select random questions
      const allQuestions = questionsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as (ChatterQuizQuestion & { id: string })[];

      // Shuffle and take required count
      const shuffled = allQuestions.sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, config.quizQuestionsCount);

      // 7. Format questions (hide correct answers)
      const questions = selected.map((q) => {
        // Get translated question if available
        const questionText =
          q.translations?.[chatter.language] || q.question;

        // Format options
        const options = q.options.map((opt) => ({
          id: opt.id,
          text: opt.translations?.[chatter.language] || opt.text,
        }));

        // Shuffle options
        const shuffledOptions = options.sort(() => Math.random() - 0.5);

        return {
          id: q.id,
          question: questionText,
          options: shuffledOptions,
        };
      });

      logger.info("[getQuizQuestions] Questions fetched", {
        chatterId: userId,
        questionCount: questions.length,
      });

      return {
        success: true,
        questions,
        timeLimit: 300, // 5 minutes
      };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }

      logger.error("[getQuizQuestions] Error", { userId, error });
      throw new HttpsError("internal", "Failed to get quiz questions");
    }
  }
);

/**
 * useChatterQuiz Hook
 *
 * React hook for managing the chatter quiz flow.
 * Provides:
 * - Quiz questions fetching
 * - Answer submission
 * - Results handling
 */

import { useState, useCallback } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useAuth } from "../contexts/AuthContext";
import {
  ChatterQuizQuestion,
  ChatterQuizResult,
  SubmitQuizInput,
} from "../types/chatter";

// ============================================================================
// TYPES
// ============================================================================

interface QuizQuestionsResponse {
  success: boolean;
  questions: ChatterQuizQuestion[];
  timeLimit: number;
}

interface SubmitQuizResponse {
  success: boolean;
  passed: boolean;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  results: ChatterQuizResult[];
  canRetryAt?: string;
  affiliateCodeClient?: string;
  affiliateCodeRecruitment?: string;
}

interface UseChatterQuizReturn {
  // State
  questions: ChatterQuizQuestion[];
  isLoadingQuestions: boolean;
  isSubmitting: boolean;
  error: string | null;
  timeLimit: number;

  // Results
  quizResult: SubmitQuizResponse | null;
  passed: boolean | null;
  score: number | null;

  // Actions
  fetchQuestions: () => Promise<void>;
  submitAnswers: (
    answers: Array<{ questionId: string; answerId: string }>
  ) => Promise<SubmitQuizResponse>;
  resetQuiz: () => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useChatterQuiz(): UseChatterQuizReturn {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<ChatterQuizQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLimit, setTimeLimit] = useState(300); // Default 5 minutes
  const [quizResult, setQuizResult] = useState<SubmitQuizResponse | null>(null);
  const [startedAt, setStartedAt] = useState<string | null>(null);

  const functions = getFunctions(undefined, "europe-west1");

  // Fetch quiz questions
  const fetchQuestions = useCallback(async () => {
    if (!user?.uid) {
      setError("You must be logged in to take the quiz");
      return;
    }

    setIsLoadingQuestions(true);
    setError(null);
    setQuizResult(null);

    try {
      const getQuestionsFn = httpsCallable<void, QuizQuestionsResponse>(
        functions,
        "getQuizQuestions"
      );

      const result = await getQuestionsFn();

      if (result.data.success) {
        setQuestions(result.data.questions);
        setTimeLimit(result.data.timeLimit);
        setStartedAt(new Date().toISOString());
      } else {
        setError("Failed to load quiz questions");
      }
    } catch (err) {
      console.error("[useChatterQuiz] Error fetching questions:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load quiz";

      // Parse Firebase error
      if (errorMessage.includes("wait")) {
        // Extract wait time from error
        setError(errorMessage);
      } else if (errorMessage.includes("already passed")) {
        setError("You have already passed the quiz!");
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoadingQuestions(false);
    }
  }, [user?.uid, functions]);

  // Submit answers
  const submitAnswers = useCallback(
    async (
      answers: Array<{ questionId: string; answerId: string }>
    ): Promise<SubmitQuizResponse> => {
      if (!user?.uid) {
        throw new Error("You must be logged in to submit the quiz");
      }

      if (!startedAt) {
        throw new Error("Quiz was not properly started");
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const submitQuizFn = httpsCallable<SubmitQuizInput, SubmitQuizResponse>(
          functions,
          "submitQuiz"
        );

        const result = await submitQuizFn({
          answers,
          startedAt,
        });

        setQuizResult(result.data);

        return result.data;
      } catch (err) {
        console.error("[useChatterQuiz] Error submitting quiz:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to submit quiz";
        setError(errorMessage);
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [user?.uid, functions, startedAt]
  );

  // Reset quiz state
  const resetQuiz = useCallback(() => {
    setQuestions([]);
    setQuizResult(null);
    setError(null);
    setStartedAt(null);
  }, []);

  // Computed values
  const passed = quizResult?.passed ?? null;
  const score = quizResult?.score ?? null;

  return {
    questions,
    isLoadingQuestions,
    isSubmitting,
    error,
    timeLimit,
    quizResult,
    passed,
    score,
    fetchQuestions,
    submitAnswers,
    resetQuiz,
  };
}

export default useChatterQuiz;

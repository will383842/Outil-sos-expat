// src/hooks/useFeedback.ts
// Hook personnalisé pour la gestion des feedbacks utilisateur
import { useState, useCallback } from 'react';
import { submitUserFeedback, uploadFeedbackScreenshot } from '../services/feedback';
import type { FeedbackData } from '../services/feedback';

interface UseFeedbackReturn {
  submitFeedback: (data: FeedbackData, screenshot?: File) => Promise<string>;
  isSubmitting: boolean;
  error: string | null;
  clearError: () => void;
}

export const useFeedback = (): UseFeedbackReturn => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitFeedback = useCallback(async (data: FeedbackData, screenshot?: File): Promise<string> => {
    setIsSubmitting(true);
    setError(null);

    console.log('[useFeedback] Starting feedback submission...', data);

    try {
      let screenshotUrl: string | undefined;

      // Upload du screenshot si présent
      if (screenshot) {
        console.log('[useFeedback] Uploading screenshot...', screenshot.name);
        try {
          screenshotUrl = await uploadFeedbackScreenshot(screenshot);
          console.log('[useFeedback] Screenshot uploaded successfully:', screenshotUrl);
        } catch (uploadError) {
          // Log l'erreur mais continue sans screenshot
          console.warn('[useFeedback] Failed to upload screenshot:', uploadError);
        }
      }

      // Soumettre le feedback
      console.log('[useFeedback] Submitting feedback to Firestore...');
      const feedbackId = await submitUserFeedback({
        ...data,
        screenshotUrl,
      });

      console.log('[useFeedback] Feedback submitted successfully with ID:', feedbackId);
      return feedbackId;
    } catch (err) {
      console.error('[useFeedback] Error during feedback submission:', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      console.error('[useFeedback] Error message:', errorMessage);
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
      console.log('[useFeedback] Submission finished (isSubmitting = false)');
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    submitFeedback,
    isSubmitting,
    error,
    clearError,
  };
};

export default useFeedback;

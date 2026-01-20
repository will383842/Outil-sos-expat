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

    try {
      let screenshotUrl: string | undefined;

      // Upload du screenshot si présent
      if (screenshot) {
        try {
          screenshotUrl = await uploadFeedbackScreenshot(screenshot);
        } catch (uploadError) {
          // Log l'erreur mais continue sans screenshot
          console.warn('Failed to upload screenshot:', uploadError);
        }
      }

      // Soumettre le feedback
      const feedbackId = await submitUserFeedback({
        ...data,
        screenshotUrl,
      });

      return feedbackId;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      setError(errorMessage);
      throw err;
    } finally {
      setIsSubmitting(false);
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

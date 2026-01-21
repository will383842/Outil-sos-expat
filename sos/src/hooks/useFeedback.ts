// src/hooks/useFeedback.ts
// Hook personnalisé pour la gestion des feedbacks utilisateur
import { useState, useCallback } from 'react';
import { submitUserFeedback, uploadFeedbackScreenshot } from '../services/feedback';
import type { FeedbackData } from '../services/feedback';
import dashboardLog from '../utils/dashboardLogger';

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
    dashboardLog.group('useFeedback.submitFeedback');
    dashboardLog.api('Starting feedback submission', {
      email: data.email,
      type: data.type,
      descriptionLength: data.description?.length,
      hasScreenshot: !!screenshot,
      userRole: data.userRole,
    });

    setIsSubmitting(true);
    setError(null);
    dashboardLog.state('State updated: isSubmitting=true, error=null');

    try {
      let screenshotUrl: string | undefined;

      // Upload du screenshot si présent
      if (screenshot) {
        dashboardLog.api('Uploading screenshot...', {
          name: screenshot.name,
          size: screenshot.size,
          type: screenshot.type,
        });
        try {
          dashboardLog.time('Screenshot upload');
          screenshotUrl = await uploadFeedbackScreenshot(screenshot);
          dashboardLog.timeEnd('Screenshot upload');
          dashboardLog.api('Screenshot uploaded successfully', { url: screenshotUrl?.substring(0, 50) + '...' });
        } catch (uploadError) {
          // Log l'erreur mais continue sans screenshot
          dashboardLog.warn('Failed to upload screenshot - continuing without it', uploadError);
        }
      }

      // Soumettre le feedback
      dashboardLog.api('Calling submitUserFeedback to Firestore...', {
        hasScreenshotUrl: !!screenshotUrl,
      });
      dashboardLog.time('Firestore submission');

      const feedbackId = await submitUserFeedback({
        ...data,
        screenshotUrl,
      });

      dashboardLog.timeEnd('Firestore submission');
      dashboardLog.api('Feedback submitted successfully!', { feedbackId });
      dashboardLog.groupEnd();
      return feedbackId;
    } catch (err) {
      dashboardLog.error('FEEDBACK SUBMISSION FAILED', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';
      dashboardLog.error('Error details', {
        message: errorMessage,
        name: err instanceof Error ? err.name : 'Unknown',
        stack: err instanceof Error ? err.stack?.substring(0, 500) : undefined,
      });
      setError(errorMessage);
      dashboardLog.groupEnd();
      throw err;
    } finally {
      setIsSubmitting(false);
      dashboardLog.state('Final state: isSubmitting=false');
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

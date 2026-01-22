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
    // ============= DEBUG LOGS - useFeedback Hook =============
    console.log('%c🪝 [useFeedback] submitFeedback() CALLED', 'background: #E91E63; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;');
    console.log('%c🪝 [useFeedback] Input data', 'background: #C2185B; color: white; padding: 2px 6px; border-radius: 3px;', {
      email: data.email,
      type: data.type,
      descriptionLength: data.description?.length,
      hasScreenshot: !!screenshot,
      screenshotSize: screenshot?.size,
      userRole: data.userRole,
      pageUrl: data.pageUrl,
      timestamp: new Date().toISOString(),
    });

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
    console.log('🪝 [useFeedback] State: isSubmitting=true, error=null');
    dashboardLog.state('State updated: isSubmitting=true, error=null');

    try {
      let screenshotUrl: string | undefined;

      // Upload du screenshot si présent
      if (screenshot) {
        console.log('%c📸 [useFeedback] Uploading screenshot...', 'background: #00BCD4; color: white; padding: 2px 6px; border-radius: 3px;', {
          name: screenshot.name,
          size: screenshot.size,
          type: screenshot.type,
        });
        dashboardLog.api('Uploading screenshot...', {
          name: screenshot.name,
          size: screenshot.size,
          type: screenshot.type,
        });
        try {
          dashboardLog.time('Screenshot upload');
          screenshotUrl = await uploadFeedbackScreenshot(screenshot);
          dashboardLog.timeEnd('Screenshot upload');
          console.log('%c✅ [useFeedback] Screenshot uploaded', 'background: #4CAF50; color: white; padding: 2px 6px; border-radius: 3px;', {
            url: screenshotUrl?.substring(0, 60) + '...',
          });
          dashboardLog.api('Screenshot uploaded successfully', { url: screenshotUrl?.substring(0, 50) + '...' });
        } catch (uploadError) {
          // Log l'erreur mais continue sans screenshot
          console.warn('%c⚠️ [useFeedback] Screenshot upload FAILED - continuing without it', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;', uploadError);
          dashboardLog.warn('Failed to upload screenshot - continuing without it', uploadError);
        }
      }

      // Soumettre le feedback
      console.log('%c📤 [useFeedback] Calling submitUserFeedback() to Firestore...', 'background: #FF5722; color: white; padding: 2px 6px; border-radius: 3px;', {
        hasScreenshotUrl: !!screenshotUrl,
        collection: 'user_feedback',
      });
      dashboardLog.api('Calling submitUserFeedback to Firestore...', {
        hasScreenshotUrl: !!screenshotUrl,
      });
      dashboardLog.time('Firestore submission');

      const feedbackId = await submitUserFeedback({
        ...data,
        screenshotUrl,
      });

      dashboardLog.timeEnd('Firestore submission');
      console.log('%c✅ [useFeedback] Firestore write SUCCESS', 'background: #4CAF50; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold;', {
        feedbackId,
        collection: 'user_feedback',
      });
      dashboardLog.api('Feedback submitted successfully!', { feedbackId });
      dashboardLog.groupEnd();
      return feedbackId;
    } catch (err) {
      // ============= DETAILED ERROR LOGGING =============
      console.error('%c❌ [useFeedback] SUBMISSION FAILED', 'background: #f44336; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold; font-size: 14px;');
      console.error('❌ [useFeedback] Raw error:', err);

      dashboardLog.error('FEEDBACK SUBMISSION FAILED', err);
      const errorMessage = err instanceof Error ? err.message : 'Une erreur est survenue';

      // Detailed error analysis
      const errorCode = (err as { code?: string }).code;
      const errorName = err instanceof Error ? err.name : 'Unknown';

      console.error('❌ [useFeedback] Error analysis:', {
        message: errorMessage,
        name: errorName,
        code: errorCode,
        isFirebaseError: errorCode?.includes('firestore') || errorCode?.includes('permission'),
      });

      // Check for specific error types
      if (errorCode === 'permission-denied' || errorMessage.toLowerCase().includes('permission')) {
        console.error('%c🔒 [useFeedback] FIRESTORE PERMISSION DENIED', 'background: #f44336; color: white; padding: 2px 6px; border-radius: 3px;');
        console.error('🔒 Possible causes:');
        console.error('   1. Firestore security rules not deployed');
        console.error('   2. Rules reject the data (email format, description size, etc.)');
        console.error('   3. User not authenticated when rules require it');
        console.error('   4. Collection "user_feedback" does not exist or is blocked');
      }

      if (errorMessage.toLowerCase().includes('network') || errorCode === 'unavailable') {
        console.error('%c🌐 [useFeedback] NETWORK ERROR - Firestore unreachable', 'background: #FF9800; color: black; padding: 2px 6px; border-radius: 3px;');
      }

      dashboardLog.error('Error details', {
        message: errorMessage,
        name: errorName,
        stack: err instanceof Error ? err.stack?.substring(0, 500) : undefined,
      });
      setError(errorMessage);
      dashboardLog.groupEnd();
      throw err;
    } finally {
      setIsSubmitting(false);
      console.log('🪝 [useFeedback] Final state: isSubmitting=false');
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

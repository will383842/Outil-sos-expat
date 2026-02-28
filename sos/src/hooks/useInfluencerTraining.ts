/**
 * useInfluencerTraining - Hook for influencer training system
 *
 * Manages training modules, progress, quizzes, and certificates
 */

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import {
  InfluencerTrainingModule,
  InfluencerTrainingProgress,
  InfluencerTrainingCertificate,
  InfluencerTrainingModuleListItem,
  InfluencerTrainingOverallProgress,
  SubmitInfluencerTrainingQuizResult,
} from '@/types/influencer';

interface UseInfluencerTrainingReturn {
  // Data
  modules: InfluencerTrainingModuleListItem[];
  overallProgress: InfluencerTrainingOverallProgress | null;
  currentModule: InfluencerTrainingModule | null;
  currentProgress: InfluencerTrainingProgress | null;
  certificate: InfluencerTrainingCertificate | null;

  // State
  isLoading: boolean;
  isLoadingModule: boolean;
  isSubmittingQuiz: boolean;
  error: string | null;

  // Actions
  loadModules: () => Promise<void>;
  loadModuleContent: (moduleId: string) => Promise<void>;
  updateProgress: (moduleId: string, slideIndex: number) => Promise<void>;
  submitQuiz: (moduleId: string, answers: Array<{ questionId: string; answerId: string }>) => Promise<SubmitInfluencerTrainingQuizResult | null>;
  loadCertificate: (certificateId: string) => Promise<void>;
}

export function useInfluencerTraining(): UseInfluencerTrainingReturn {
  const [modules, setModules] = useState<InfluencerTrainingModuleListItem[]>([]);
  const [overallProgress, setOverallProgress] = useState<InfluencerTrainingOverallProgress | null>(null);
  const [currentModule, setCurrentModule] = useState<InfluencerTrainingModule | null>(null);
  const [currentProgress, setCurrentProgress] = useState<InfluencerTrainingProgress | null>(null);
  const [certificate, setCertificate] = useState<InfluencerTrainingCertificate | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModule, setIsLoadingModule] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load all training modules
  const loadModules = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const getTrainingModules = httpsCallable(functionsAffiliate, 'getInfluencerTrainingModules');
      const result = await getTrainingModules();
      const data = result.data as {
        modules: InfluencerTrainingModuleListItem[];
        overallProgress: InfluencerTrainingOverallProgress;
      };

      setModules(data.modules);
      setOverallProgress(data.overallProgress);
    } catch (err: unknown) {
      console.error('[useInfluencerTraining] Failed to load modules:', err);
      // Check if training is disabled
      const errorCode = (err as { code?: string })?.code;
      const errorMessage = (err as { message?: string })?.message;
      if (errorCode === 'unavailable' || errorMessage?.includes('disabled')) {
        setError('La formation n\'est pas disponible pour le moment. Revenez plus tard.');
      } else {
        setError('Impossible de charger les modules de formation');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load specific module content
  const loadModuleContent = useCallback(async (moduleId: string) => {
    setIsLoadingModule(true);
    setError(null);

    try {
      const getModuleContent = httpsCallable(functionsAffiliate, 'getInfluencerTrainingModuleContent');
      const result = await getModuleContent({ moduleId });
      const data = result.data as {
        module: InfluencerTrainingModule;
        progress: InfluencerTrainingProgress | null;
        canAccess: boolean;
        blockedByPrerequisites: string[];
      };

      if (!data.canAccess) {
        setError(`Module blocked. Complete prerequisites first: ${data.blockedByPrerequisites.join(', ')}`);
        return;
      }

      setCurrentModule(data.module);
      setCurrentProgress(data.progress);
    } catch (err) {
      console.error('[useInfluencerTraining] Failed to load module:', err);
      setError('Failed to load module content');
    } finally {
      setIsLoadingModule(false);
    }
  }, []);

  // Update slide progress
  const updateProgress = useCallback(async (moduleId: string, slideIndex: number) => {
    try {
      const updateTrainingProgress = httpsCallable(functionsAffiliate, 'updateInfluencerTrainingProgress');
      await updateTrainingProgress({ moduleId, slideIndex });

      // Update local state
      if (currentProgress) {
        setCurrentProgress({
          ...currentProgress,
          currentSlideIndex: slideIndex,
          slidesViewed: [...new Set([...currentProgress.slidesViewed, slideIndex])],
        });
      }
    } catch (err) {
      console.error('[useInfluencerTraining] Failed to update progress:', err);
    }
  }, [currentProgress]);

  // Submit quiz answers
  const submitQuiz = useCallback(async (
    moduleId: string,
    answers: Array<{ questionId: string; answerId: string }>
  ): Promise<SubmitInfluencerTrainingQuizResult | null> => {
    setIsSubmittingQuiz(true);
    setError(null);

    try {
      const submitTrainingQuiz = httpsCallable(functionsAffiliate, 'submitInfluencerTrainingQuiz');
      const result = await submitTrainingQuiz({ moduleId, answers });
      const data = result.data as SubmitInfluencerTrainingQuizResult;

      // Update local progress if passed
      if (data.passed && currentProgress) {
        setCurrentProgress({
          ...currentProgress,
          isCompleted: true,
          bestScore: Math.max(currentProgress.bestScore, data.score),
        });
      }

      // Refresh modules list to get updated progress
      await loadModules();

      return data;
    } catch (err) {
      console.error('[useInfluencerTraining] Failed to submit quiz:', err);
      setError('Failed to submit quiz');
      return null;
    } finally {
      setIsSubmittingQuiz(false);
    }
  }, [currentProgress, loadModules]);

  // Load certificate
  const loadCertificate = useCallback(async (certificateId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const getCertificate = httpsCallable(functionsAffiliate, 'getInfluencerTrainingCertificate');
      const result = await getCertificate({ certificateId });
      const data = result.data as {
        certificate: InfluencerTrainingCertificate;
        verificationUrl: string;
      };

      setCertificate(data.certificate);
    } catch (err) {
      console.error('[useInfluencerTraining] Failed to load certificate:', err);
      setError('Failed to load certificate');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load modules on mount
  useEffect(() => {
    loadModules();
  }, [loadModules]);

  return {
    modules,
    overallProgress,
    currentModule,
    currentProgress,
    certificate,
    isLoading,
    isLoadingModule,
    isSubmittingQuiz,
    error,
    loadModules,
    loadModuleContent,
    updateProgress,
    submitQuiz,
    loadCertificate,
  };
}

/**
 * useChatterTraining - Hook for chatter training system
 *
 * Manages training modules, progress, quizzes, and certificates
 */

import { useState, useEffect, useCallback } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { useChatterMissions } from '@/hooks/useChatterMissions';
import {
  ChatterTrainingModule,
  ChatterTrainingProgress,
  ChatterTrainingCertificate,
  TrainingModuleListItem,
  TrainingOverallProgress,
  SubmitTrainingQuizResult,
} from '@/types/chatter';

interface UseChatterTrainingReturn {
  // Data
  modules: TrainingModuleListItem[];
  overallProgress: TrainingOverallProgress | null;
  currentModule: ChatterTrainingModule | null;
  currentProgress: ChatterTrainingProgress | null;
  certificate: ChatterTrainingCertificate | null;

  // State
  isLoading: boolean;
  isLoadingModule: boolean;
  isSubmittingQuiz: boolean;
  error: string | null;

  // Actions
  loadModules: () => Promise<void>;
  loadModuleContent: (moduleId: string) => Promise<void>;
  updateProgress: (moduleId: string, slideIndex: number) => Promise<void>;
  submitQuiz: (moduleId: string, answers: Array<{ questionId: string; answerId: string }>) => Promise<SubmitTrainingQuizResult | null>;
  loadCertificate: (certificateId: string) => Promise<void>;
}

export function useChatterTraining(): UseChatterTrainingReturn {
  const [modules, setModules] = useState<TrainingModuleListItem[]>([]);
  const [overallProgress, setOverallProgress] = useState<TrainingOverallProgress | null>(null);
  const [currentModule, setCurrentModule] = useState<ChatterTrainingModule | null>(null);
  const [currentProgress, setCurrentProgress] = useState<ChatterTrainingProgress | null>(null);
  const [certificate, setCertificate] = useState<ChatterTrainingCertificate | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingModule, setIsLoadingModule] = useState(false);
  const [isSubmittingQuiz, setIsSubmittingQuiz] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track video watched for daily missions
  const { trackVideoWatched } = useChatterMissions();

  // Load all training modules
  const loadModules = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const getTrainingModules = httpsCallable(functionsAffiliate, 'getChatterTrainingModules');
      const result = await getTrainingModules();
      const data = result.data as {
        modules: TrainingModuleListItem[];
        overallProgress: TrainingOverallProgress;
      };

      setModules(data.modules);
      setOverallProgress(data.overallProgress);
    } catch (err: unknown) {
      console.error('[useChatterTraining] Failed to load modules:', err);
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
      const getModuleContent = httpsCallable(functionsAffiliate, 'getChatterTrainingModuleContent');
      const result = await getModuleContent({ moduleId });
      const data = result.data as {
        module: ChatterTrainingModule;
        progress: ChatterTrainingProgress | null;
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
      console.error('[useChatterTraining] Failed to load module:', err);
      setError('Failed to load module content');
    } finally {
      setIsLoadingModule(false);
    }
  }, []);

  // Update slide progress
  const updateProgress = useCallback(async (moduleId: string, slideIndex: number) => {
    try {
      const updateTrainingProgress = httpsCallable(functionsAffiliate, 'updateChatterTrainingProgress');
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
      console.error('[useChatterTraining] Failed to update progress:', err);
    }
  }, [currentProgress]);

  // Submit quiz answers
  const submitQuiz = useCallback(async (
    moduleId: string,
    answers: Array<{ questionId: string; answerId: string }>
  ): Promise<SubmitTrainingQuizResult | null> => {
    setIsSubmittingQuiz(true);
    setError(null);

    try {
      const submitTrainingQuiz = httpsCallable(functionsAffiliate, 'submitChatterTrainingQuiz');
      const result = await submitTrainingQuiz({ moduleId, answers });
      const data = result.data as SubmitTrainingQuizResult;

      // Update local progress if passed
      if (data.passed && currentProgress) {
        setCurrentProgress({
          ...currentProgress,
          isCompleted: true,
          bestScore: Math.max(currentProgress.bestScore, data.score),
        });

        // Track video watched for daily missions (quiz completion = video watched)
        trackVideoWatched();
      }

      // Refresh modules list to get updated progress
      await loadModules();

      return data;
    } catch (err) {
      console.error('[useChatterTraining] Failed to submit quiz:', err);
      setError('Failed to submit quiz');
      return null;
    } finally {
      setIsSubmittingQuiz(false);
    }
  }, [currentProgress, loadModules, trackVideoWatched]);

  // Load certificate
  const loadCertificate = useCallback(async (certificateId: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const getCertificate = httpsCallable(functionsAffiliate, 'getChatterTrainingCertificate');
      const result = await getCertificate({ certificateId });
      const data = result.data as {
        certificate: ChatterTrainingCertificate;
        verificationUrl: string;
      };

      setCertificate(data.certificate);
    } catch (err) {
      console.error('[useChatterTraining] Failed to load certificate:', err);
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

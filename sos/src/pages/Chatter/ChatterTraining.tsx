/**
 * ChatterTraining - Formation page for chatters
 *
 * Connected to backend via useChatterTraining hook:
 * - Module list with real progress from Firestore
 * - Slide viewer with progress tracking
 * - Quiz submission with scoring
 * - Certificate display on completion
 */

import React, { useState, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import {
  BookOpen,
  Video,
  FileText,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Award,
  Loader2,
  RefreshCw,
  X,
  ChevronRight,
  ListChecks,
  Lightbulb,
  ImageIcon,
  Lock,
} from 'lucide-react';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';
import { useChatterTraining } from '@/hooks/useChatterTraining';
import { useApp } from '@/contexts/AppContext';
import type {
  TrainingModuleListItem,
  ChatterTrainingModule,
  TrainingSlide,
  TrainingQuizQuestion,
  SubmitTrainingQuizResult,
} from '@/types/chatter';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-xl transition-all",
  },
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  onboarding: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: 'text-green-500' },
  promotion: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: 'text-blue-500' },
  conversion: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: 'text-purple-500' },
  recruitment: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', icon: 'text-orange-500' },
  best_practices: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: 'text-yellow-500' },
};

// ============================================================================
// HELPERS
// ============================================================================

function getLocalizedText(
  base: string,
  translations?: Record<string, string>,
  locale?: string
): string {
  if (translations && locale && translations[locale]) {
    return translations[locale];
  }
  return base;
}

function getSlideIcon(type: TrainingSlide['type']) {
  switch (type) {
    case 'video': return <Video className="w-4 h-4" />;
    case 'image': return <ImageIcon className="w-4 h-4" />;
    case 'checklist': return <ListChecks className="w-4 h-4" />;
    case 'tips': return <Lightbulb className="w-4 h-4" />;
    default: return <FileText className="w-4 h-4" />;
  }
}

// ============================================================================
// SKELETON
// ============================================================================

function TrainingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className={`${UI.card} p-6`}>
        <div className="h-6 bg-gray-200 dark:bg-white/10 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-full w-full" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`${UI.card} p-5`}>
            <div className="h-5 bg-gray-200 dark:bg-white/10 rounded w-2/3 mb-3" />
            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-full mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// MODULE CARD
// ============================================================================

interface ModuleCardProps {
  module: TrainingModuleListItem;
  locale: string;
  onOpen: (id: string) => void;
  disabled?: boolean;
}

function ModuleCard({ module, locale, onOpen, disabled }: ModuleCardProps) {
  const colors = CATEGORY_COLORS[module.category] || CATEGORY_COLORS.onboarding;
  const isCompleted = module.progress?.isCompleted;
  const isStarted = module.progress?.isStarted;
  const progressPercent = module.progress
    ? Math.min(100, Math.round((module.progress.currentSlideIndex / Math.max(1, module.progress.totalSlides)) * 100))
    : 0;

  return (
    <button
      type="button"
      onClick={() => !disabled && onOpen(module.id)}
      disabled={disabled}
      className={`${UI.card} p-5 text-left w-full hover:shadow-xl transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl flex-shrink-0 ${isCompleted ? 'bg-green-100 dark:bg-green-900/30' : colors.bg}`}>
          {isCompleted ? (
            <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
          ) : disabled ? (
            <Lock className="w-6 h-6 text-gray-400" />
          ) : (
            <BookOpen className={`w-6 h-6 ${colors.icon}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${colors.bg} ${colors.text}`}>
              {module.category}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ~{module.estimatedMinutes} min
            </span>
            {module.isRequired && (
              <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                <FormattedMessage id="chatter.training.required" defaultMessage="Requis" />
              </span>
            )}
          </div>
          <h4 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">
            {module.title}
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
            {module.description}
          </p>

          {/* Progress bar for started modules */}
          {isStarted && !isCompleted && (
            <div className="mt-3">
              <div className="h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                {module.progress!.currentSlideIndex}/{module.progress!.totalSlides} slides
              </p>
            </div>
          )}

          {/* CTA */}
          <div className="flex items-center gap-1 mt-3 text-sm font-medium text-red-500 dark:text-red-400">
            {isCompleted ? (
              <FormattedMessage id="chatter.training.review" defaultMessage="Revoir" />
            ) : isStarted ? (
              <FormattedMessage id="chatter.training.continue" defaultMessage="Continuer" />
            ) : (
              <FormattedMessage id="chatter.training.start" defaultMessage="Commencer" />
            )}
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// SLIDE VIEWER
// ============================================================================

interface SlideViewerProps {
  slide: TrainingSlide;
  locale: string;
}

function SlideViewer({ slide, locale }: SlideViewerProps) {
  const title = getLocalizedText(slide.title, slide.titleTranslations, locale);
  const content = getLocalizedText(slide.content, slide.contentTranslations, locale);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
        {getSlideIcon(slide.type)}
        {title}
      </h3>

      {/* Media */}
      {slide.mediaUrl && slide.type === 'video' && (
        <div className="aspect-video rounded-xl overflow-hidden bg-black">
          <iframe
            src={slide.mediaUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={title}
          />
        </div>
      )}
      {slide.mediaUrl && slide.type === 'image' && (
        <img
          src={slide.mediaUrl}
          alt={title}
          className="w-full rounded-xl max-h-80 object-contain bg-gray-100 dark:bg-white/5"
          loading="lazy"
        />
      )}

      {/* Text content */}
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
        {content}
      </div>

      {/* Checklist */}
      {slide.type === 'checklist' && slide.checklistItems && (
        <ul className="space-y-2">
          {slide.checklistItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {getLocalizedText(item.text, item.textTranslations, locale)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Tips */}
      {slide.type === 'tips' && slide.tips && (
        <div className="space-y-2">
          {slide.tips.map((tip, idx) => (
            <div key={idx} className="flex items-start gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
              <Lightbulb className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {getLocalizedText(tip.text, tip.textTranslations, locale)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUIZ VIEW
// ============================================================================

interface QuizViewProps {
  questions: TrainingQuizQuestion[];
  locale: string;
  isSubmitting: boolean;
  onSubmit: (answers: Array<{ questionId: string; answerId: string }>) => void;
}

function QuizView({ questions, locale, isSubmitting, onSubmit }: QuizViewProps) {
  const intl = useIntl();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const allAnswered = questions.every(q => answers[q.id]);

  const handleSubmit = () => {
    const formattedAnswers = questions.map(q => ({
      questionId: q.id,
      answerId: answers[q.id] || '',
    }));
    onSubmit(formattedAnswers);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <Award className="w-6 h-6 text-red-500" />
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          <FormattedMessage id="chatter.training.quiz.title" defaultMessage="Quiz de validation" />
        </h3>
      </div>

      {questions.map((q, idx) => {
        const questionText = getLocalizedText(q.question, q.questionTranslations, locale);
        return (
          <div key={q.id} className="space-y-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {idx + 1}. {questionText}
            </p>
            <div className="space-y-2">
              {q.options?.map(opt => {
                const optText = getLocalizedText(opt.text, opt.textTranslations, locale);
                const isSelected = answers[q.id] === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setAnswers(prev => ({ ...prev, [q.id]: opt.id }))}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all text-sm ${
                      isSelected
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20 dark:border-red-500/60'
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'border-red-500 bg-red-500' : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <span className={isSelected ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-700 dark:text-gray-300'}>
                        {optText}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      <button
        onClick={handleSubmit}
        disabled={!allAnswered || isSubmitting}
        className={`${UI.button.primary} w-full py-3 flex items-center justify-center gap-2`}
      >
        {isSubmitting ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Award className="w-5 h-5" />
            <FormattedMessage id="chatter.training.quiz.submit" defaultMessage="Valider le quiz" />
          </>
        )}
      </button>
    </div>
  );
}

// ============================================================================
// QUIZ RESULTS
// ============================================================================

interface QuizResultsProps {
  result: SubmitTrainingQuizResult;
  onRetry: () => void;
  onClose: () => void;
}

function QuizResults({ result, onRetry, onClose }: QuizResultsProps) {
  return (
    <div className="text-center space-y-4 py-4">
      <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center ${
        result.passed ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
      }`}>
        {result.passed ? (
          <CheckCircle className="w-10 h-10 text-green-500" />
        ) : (
          <X className="w-10 h-10 text-red-500" />
        )}
      </div>

      <div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
          {result.passed ? (
            <FormattedMessage id="chatter.training.quiz.passed" defaultMessage="Félicitations !" />
          ) : (
            <FormattedMessage id="chatter.training.quiz.failed" defaultMessage="Pas encore..." />
          )}
        </h3>
        <p className="text-3xl font-black mt-2 text-gray-900 dark:text-white">
          {result.score}%
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <FormattedMessage
            id="chatter.training.quiz.passingScore"
            defaultMessage="Score requis : {score}%"
            values={{ score: result.passingScore }}
          />
        </p>
      </div>

      {result.rewardGranted && (
        <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl border border-yellow-200 dark:border-yellow-800/30">
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            {result.rewardGranted.type === 'bonus'
              ? <FormattedMessage
                  id="chatter.training.quiz.bonusReward"
                  defaultMessage="Bonus de ${amount} crédité !"
                  values={{ amount: ((result.rewardGranted.bonusAmount || 0) / 100).toFixed(0) }}
                />
              : <FormattedMessage id="chatter.training.quiz.badgeReward" defaultMessage="Nouveau badge débloqué !" />
            }
          </p>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {!result.passed && (
          <button onClick={onRetry} className={`${UI.button.secondary} flex-1 py-2.5`}>
            <FormattedMessage id="chatter.training.quiz.retry" defaultMessage="Réessayer" />
          </button>
        )}
        <button onClick={onClose} className={`${UI.button.primary} flex-1 py-2.5`}>
          {result.passed ? (
            <FormattedMessage id="chatter.training.quiz.continue" defaultMessage="Continuer" />
          ) : (
            <FormattedMessage id="common.close" defaultMessage="Fermer" />
          )}
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// MODULE DETAIL MODAL
// ============================================================================

interface ModuleModalProps {
  module: ChatterTrainingModule;
  slideIndex: number;
  isSubmittingQuiz: boolean;
  locale: string;
  onClose: () => void;
  onSlideChange: (index: number) => void;
  onQuizSubmit: (answers: Array<{ questionId: string; answerId: string }>) => void;
  quizResult: SubmitTrainingQuizResult | null;
  onQuizRetry: () => void;
  quizAttempt: number;
}

function ModuleModal({
  module, slideIndex, isSubmittingQuiz, locale, onClose,
  onSlideChange, onQuizSubmit, quizResult, onQuizRetry, quizAttempt,
}: ModuleModalProps) {
  const totalSlides = module.slides.length;
  const hasQuiz = module.quizQuestions.length > 0;
  const isOnQuiz = slideIndex >= totalSlides;
  const isShowingResults = quizResult !== null;

  const title = getLocalizedText(module.title, module.titleTranslations, locale);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`${UI.card} w-full max-w-2xl max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-white/10">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{title}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isOnQuiz ? (
                <FormattedMessage id="chatter.training.quiz.title" defaultMessage="Quiz de validation" />
              ) : (
                <FormattedMessage
                  id="chatter.training.slideOf"
                  defaultMessage="Slide {current} / {total}"
                  values={{ current: slideIndex + 1, total: totalSlides }}
                />
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Progress dots */}
        <div className="flex items-center gap-1 px-5 py-3 overflow-x-auto">
          {module.slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onSlideChange(idx)}
              className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                idx === slideIndex ? 'w-6 bg-red-500' :
                idx < slideIndex ? 'bg-green-500' :
                'bg-gray-300 dark:bg-white/20'
              }`}
              title={`Slide ${idx + 1}`}
            />
          ))}
          {hasQuiz && (
            <>
              <div className="w-px h-3 bg-gray-300 dark:bg-white/20 mx-1 flex-shrink-0" />
              <button
                onClick={() => onSlideChange(totalSlides)}
                className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                  isOnQuiz ? 'w-6 bg-red-500' : 'bg-gray-300 dark:bg-white/20'
                }`}
                title="Quiz"
              />
            </>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {isShowingResults ? (
            <QuizResults result={quizResult} onRetry={onQuizRetry} onClose={onClose} />
          ) : isOnQuiz ? (
            <QuizView
              key={`quiz-${quizAttempt}`}
              questions={module.quizQuestions}
              locale={locale}
              isSubmitting={isSubmittingQuiz}
              onSubmit={onQuizSubmit}
            />
          ) : (
            <SlideViewer slide={module.slides[slideIndex]} locale={locale} />
          )}
        </div>

        {/* Navigation footer (only for slides, not quiz/results) */}
        {!isOnQuiz && !isShowingResults && (
          <div className="flex items-center justify-between p-5 border-t border-gray-200 dark:border-white/10">
            <button
              onClick={() => onSlideChange(slideIndex - 1)}
              disabled={slideIndex === 0}
              className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2 text-sm disabled:opacity-30`}
            >
              <ArrowLeft className="w-4 h-4" />
              <FormattedMessage id="chatter.training.prev" defaultMessage="Précédent" />
            </button>
            <button
              onClick={() => onSlideChange(slideIndex + 1)}
              className={`${UI.button.primary} px-4 py-2 flex items-center gap-2 text-sm`}
            >
              {slideIndex === totalSlides - 1 && hasQuiz ? (
                <>
                  <Award className="w-4 h-4" />
                  <FormattedMessage id="chatter.training.goToQuiz" defaultMessage="Passer le quiz" />
                </>
              ) : slideIndex === totalSlides - 1 ? (
                <FormattedMessage id="chatter.training.finish" defaultMessage="Terminer" />
              ) : (
                <>
                  <FormattedMessage id="chatter.training.next" defaultMessage="Suivant" />
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function ChatterTraining() {
  const intl = useIntl();
  const { language } = useApp();
  const locale = language || 'fr';

  const {
    modules,
    overallProgress,
    currentModule,
    isLoading,
    isLoadingModule,
    isSubmittingQuiz,
    error,
    loadModules,
    loadModuleContent,
    updateProgress,
    submitQuiz,
  } = useChatterTraining();

  const [showModal, setShowModal] = useState(false);
  const [slideIndex, setSlideIndex] = useState(0);
  const [quizResult, setQuizResult] = useState<SubmitTrainingQuizResult | null>(null);
  const [quizAttempt, setQuizAttempt] = useState(0);

  // Open module
  const handleOpenModule = useCallback(async (moduleId: string) => {
    setQuizResult(null);
    setSlideIndex(0);
    setQuizAttempt(prev => prev + 1);
    try {
      await loadModuleContent(moduleId);
      setShowModal(true);
    } catch {
      toast.error(intl.formatMessage({ id: 'chatter.training.loadError', defaultMessage: 'Impossible de charger le module.' }));
    }
  }, [loadModuleContent, intl]);

  // Close module
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setQuizResult(null);
    setSlideIndex(0);
  }, []);

  // Navigate slides
  const handleSlideChange = useCallback(async (newIndex: number) => {
    if (!currentModule) return;
    const totalSlides = currentModule.slides.length;
    const hasQuiz = currentModule.quizQuestions.length > 0;

    // Can't go past quiz
    if (newIndex > totalSlides) return;
    // If no quiz, close on "finish"
    if (newIndex === totalSlides && !hasQuiz) {
      handleCloseModal();
      return;
    }
    // Clamp
    if (newIndex < 0) return;

    setSlideIndex(newIndex);

    // Track progress if on a slide
    if (newIndex < totalSlides) {
      await updateProgress(currentModule.id, newIndex);
    }
  }, [currentModule, updateProgress, handleCloseModal]);

  // Submit quiz
  const handleQuizSubmit = useCallback(async (answers: Array<{ questionId: string; answerId: string }>) => {
    if (!currentModule) return;
    const result = await submitQuiz(currentModule.id, answers);
    if (result) {
      setQuizResult(result);
      if (result.passed) {
        toast.success(intl.formatMessage({ id: 'chatter.training.quiz.passedToast', defaultMessage: 'Module réussi !' }));
      }
    }
  }, [currentModule, submitQuiz, intl]);

  // Retry quiz
  const handleQuizRetry = useCallback(() => {
    setQuizResult(null);
    setQuizAttempt(prev => prev + 1);
  }, []);

  // Sort modules by order
  const sortedModules = [...modules].sort((a, b) => a.order - b.order);

  // Check if module is accessible (prerequisites met)
  const completedIds = new Set(
    modules.filter(m => m.progress?.isCompleted).map(m => m.id)
  );

  // --------------------------------------------------
  // Loading
  // --------------------------------------------------
  if (isLoading) return <TrainingSkeleton />;

  // --------------------------------------------------
  // Error
  // --------------------------------------------------
  if (error && modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <BookOpen className="h-8 w-8 text-red-500" />
        </div>
        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">{error}</p>
        <button onClick={() => loadModules()} className={`${UI.button.primary} px-6 py-2.5`}>
          <FormattedMessage id="chatter.training.retry" defaultMessage="Réessayer" />
        </button>
      </div>
    );
  }

  // --------------------------------------------------
  // Empty
  // --------------------------------------------------
  if (modules.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
          <BookOpen className="h-8 w-8 text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400">
          <FormattedMessage id="chatter.training.empty" defaultMessage="Aucun module de formation disponible pour le moment." />
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">
              <FormattedMessage id="chatter.training.title" defaultMessage="Formation" />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              <FormattedMessage id="chatter.training.subtitle" defaultMessage="Apprenez les meilleures techniques pour maximiser vos gains" />
            </p>
          </div>
          <button onClick={() => loadModules()} className={`${UI.button.secondary} p-2.5`}>
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Overall Progress */}
        {overallProgress && (
          <div className={`${UI.card} p-6`}>
            <div className="flex items-center justify-between gap-4 mb-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="chatter.training.progress.title" defaultMessage="Votre progression" />
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="chatter.training.progress.subtitle"
                    defaultMessage="{completed} sur {total} modules complétés"
                    values={{ completed: overallProgress.completedModules, total: overallProgress.totalModules }}
                  />
                </p>
              </div>
              <span className="text-3xl font-black text-red-500 dark:text-red-400">
                {overallProgress.completionPercent}%
              </span>
            </div>
            <div className="h-3 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
                style={{ width: `${overallProgress.completionPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Modules Grid */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-500" />
            <FormattedMessage id="chatter.training.modules.title" defaultMessage="Modules de formation" />
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            {sortedModules.map(module => {
              const prerequisitesMet = module.prerequisites.every(p => completedIds.has(p));
              return (
                <ModuleCard
                  key={module.id}
                  module={module}
                  locale={locale}
                  onOpen={handleOpenModule}
                  disabled={!prerequisitesMet || isLoadingModule}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Loading overlay for module content */}
      {isLoadingModule && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className={`${UI.card} p-6 flex items-center gap-3`}>
            <Loader2 className="w-6 h-6 animate-spin text-red-500" />
            <span className="text-gray-900 dark:text-white font-medium">
              <FormattedMessage id="chatter.training.loadingModule" defaultMessage="Chargement du module..." />
            </span>
          </div>
        </div>
      )}

      {/* Module Modal */}
      {showModal && currentModule && (
        <ModuleModal
          module={currentModule}
          slideIndex={slideIndex}
          isSubmittingQuiz={isSubmittingQuiz}
          locale={locale}
          onClose={handleCloseModal}
          onSlideChange={handleSlideChange}
          onQuizSubmit={handleQuizSubmit}
          quizResult={quizResult}
          onQuizRetry={handleQuizRetry}
          quizAttempt={quizAttempt}
        />
      )}
    </>
  );
}

// ============================================================================
// PAGE EXPORT
// ============================================================================

export default function ChatterTrainingPage() {
  return (
    <ChatterDashboardLayout>
      <ChatterTraining />
    </ChatterDashboardLayout>
  );
}

/**
 * ChatterQuiz - Quiz page for chatter qualification
 * Handles quiz flow, timer, and submission
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useLocaleNavigate } from '@/multilingual-system';
import { getTranslatedRouteSlug, type RouteKey } from '@/multilingual-system/core/routing/localeRoutes';
import { useApp } from '@/contexts/AppContext';
import Layout from '@/components/layout/Layout';
import ChatterQuizQuestion from '@/components/Chatter/Quiz/ChatterQuizQuestion';
import ChatterQuizProgress from '@/components/Chatter/Quiz/ChatterQuizProgress';
import ChatterQuizResult from '@/components/Chatter/Quiz/ChatterQuizResult';
import { useChatterQuiz } from '@/hooks/useChatterQuiz';
import { ArrowLeft, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

const ChatterQuiz: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || 'en') as 'fr' | 'en' | 'es' | 'de' | 'ru' | 'pt' | 'ch' | 'hi' | 'ar';

  const {
    questions,
    isLoadingQuestions,
    isSubmitting,
    error,
    timeLimit,
    quizResult,
    passed,
    fetchQuestions,
    submitAnswers,
    resetQuiz,
  } = useChatterQuiz();

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);

  const dashboardRoute = `/${getTranslatedRouteSlug('chatter-dashboard' as RouteKey, langCode)}`;
  const presentationRoute = `/${getTranslatedRouteSlug('chatter-presentation' as RouteKey, langCode)}`;

  // Fetch questions on mount
  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  // Set start time when questions are loaded
  useEffect(() => {
    if (questions.length > 0 && !startedAt) {
      setStartedAt(new Date().toISOString());
    }
  }, [questions, startedAt]);

  // Handle answer selection
  const handleSelectAnswer = useCallback((questionId: string, answerId: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answerId,
    }));
  }, []);

  // Handle navigation
  const goToNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Handle quiz submission
  const handleSubmit = async () => {
    const formattedAnswers = Object.entries(answers).map(([questionId, answerId]) => ({
      questionId,
      answerId,
    }));

    try {
      await submitAnswers(formattedAnswers);
      setShowResults(true);
    } catch (err) {
      console.error('Quiz submission failed:', err);
    }
  };

  // Handle time up
  const handleTimeUp = () => {
    handleSubmit();
  };

  // Handle retry
  const handleRetry = () => {
    resetQuiz();
    setAnswers({});
    setCurrentQuestionIndex(0);
    setStartedAt(null);
    setShowResults(false);
    fetchQuestions();
  };

  // Handle continue to dashboard
  const handleContinue = () => {
    navigate(dashboardRoute);
  };

  // Loading state
  if (isLoadingQuestions) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 via-red-50/20 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black">
          <div className="text-center">
            <Loader2 className="w-12 h-12 mx-auto text-red-500 animate-spin mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.quiz.loading" defaultMessage="Chargement du quiz..." />
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  // Error state
  if (error && !showResults) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 via-red-50/20 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black px-4">
          <div className={`${UI.card} p-8 max-w-md w-full text-center`}>
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              <FormattedMessage id="chatter.quiz.error.title" defaultMessage="Erreur" />
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
            <button
              onClick={() => navigate(presentationRoute)}
              className={`${UI.button.secondary} px-6 py-3`}
            >
              <FormattedMessage id="common.back" defaultMessage="Retour" />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Results state
  if (showResults && quizResult) {
    return (
      <Layout showFooter={false}>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 via-red-50/20 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black px-4 py-12">
          <div className="max-w-md w-full">
            <ChatterQuizResult
              passed={quizResult.passed}
              score={quizResult.score}
              correctAnswers={quizResult.correctAnswers}
              totalQuestions={quizResult.totalQuestions}
              passingScore={85}
              canRetryAt={quizResult.canRetryAt}
              affiliateCodeClient={quizResult.affiliateCodeClient}
              affiliateCodeRecruitment={quizResult.affiliateCodeRecruitment}
              onRetry={handleRetry}
              onContinue={handleContinue}
            />
          </div>
        </div>
      </Layout>
    );
  }

  // Quiz state
  if (questions.length === 0) {
    return null;
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const canSubmit = answeredCount === questions.length;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  return (
    <Layout showFooter={false}>
      <div className="min-h-screen bg-gradient-to-b from-gray-50 via-red-50/20 to-white dark:from-gray-950 dark:via-gray-950 dark:to-black py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress */}
          {startedAt && (
            <div className="mb-6">
              <ChatterQuizProgress
                currentQuestion={currentQuestionIndex + 1}
                totalQuestions={questions.length}
                answeredCount={answeredCount}
                timeLimit={timeLimit}
                startedAt={startedAt}
                onTimeUp={handleTimeUp}
              />
            </div>
          )}

          {/* Question */}
          <div className="mb-6">
            <ChatterQuizQuestion
              question={currentQuestion}
              questionNumber={currentQuestionIndex + 1}
              totalQuestions={questions.length}
              selectedAnswerId={answers[currentQuestion.id] || null}
              onSelectAnswer={(answerId) => handleSelectAnswer(currentQuestion.id, answerId)}
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={goToPreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`${UI.button.secondary} px-4 py-3 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <ArrowLeft className="w-4 h-4" />
              <FormattedMessage id="common.previous" defaultMessage="Précédent" />
            </button>

            {isLastQuestion ? (
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <FormattedMessage id="chatter.quiz.submitting" defaultMessage="Envoi..." />
                  </>
                ) : (
                  <>
                    <FormattedMessage id="chatter.quiz.submit" defaultMessage="Terminer le quiz" />
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={goToNextQuestion}
                className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}
              >
                <FormattedMessage id="common.next" defaultMessage="Suivant" />
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Question Navigator */}
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {questions.map((q, idx) => (
              <button
                key={q.id}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`w-10 h-10 rounded-lg font-medium transition-all ${
                  idx === currentQuestionIndex
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                    : answers[q.id]
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ChatterQuiz;

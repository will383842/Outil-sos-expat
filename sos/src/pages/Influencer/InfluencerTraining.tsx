/**
 * InfluencerTraining - Training/Formation page for influencers
 * Provides resources, guides, and best practices for influencers
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Layout from '@/components/layout/Layout';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import { useInfluencerTraining } from '@/hooks/useInfluencerTraining';
import {
  BookOpen,
  Video,
  FileText,
  Lightbulb,
  Target,
  TrendingUp,
  MessageSquare,
  Users,
  CheckCircle,
  ArrowRight,
  Play,
  Download,
  Star,
  Award,
  Lock,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-xl transition-all",
  },
} as const;

const TIPS = [
  {
    title: 'Connaissez votre audience',
    description: 'Adaptez votre contenu aux besoins de vos followers expatriés.',
    icon: <Users className="w-5 h-5 text-purple-500" />,
  },
  {
    title: 'Soyez authentique',
    description: 'Partagez votre expérience personnelle pour créer de la confiance.',
    icon: <Star className="w-5 h-5 text-purple-500" />,
  },
  {
    title: 'Créez du contenu régulier',
    description: 'La constance est la clé. Postez régulièrement pour rester visible.',
    icon: <Target className="w-5 h-5 text-purple-500" />,
  },
  {
    title: 'Engagez votre communauté',
    description: 'Répondez aux commentaires et créez des discussions.',
    icon: <MessageSquare className="w-5 h-5 text-purple-500" />,
  },
];

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'onboarding':
      return <BookOpen className="w-6 h-6" />;
    case 'content_creation':
      return <Video className="w-6 h-6" />;
    case 'promotion':
      return <TrendingUp className="w-6 h-6" />;
    case 'analytics':
      return <Target className="w-6 h-6" />;
    case 'monetization':
      return <Award className="w-6 h-6" />;
    default:
      return <BookOpen className="w-6 h-6" />;
  }
};

const InfluencerTraining: React.FC = () => {
  const intl = useIntl();
  const {
    modules,
    overallProgress,
    currentModule,
    currentProgress,
    isLoading,
    isLoadingModule,
    isSubmittingQuiz,
    error,
    loadModuleContent,
    updateProgress,
    submitQuiz,
  } = useInfluencerTraining();

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'module' | 'quiz'>('list');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<{
    score: number;
    passed: boolean;
    results: Array<{ questionId: string; isCorrect: boolean; explanation?: string }>;
  } | null>(null);

  const handleStartModule = async (moduleId: string) => {
    setSelectedModuleId(moduleId);
    await loadModuleContent(moduleId);
    setCurrentSlide(0);
    setViewMode('module');
    setQuizAnswers({});
    setQuizResult(null);
  };

  const handleNextSlide = () => {
    if (!currentModule) return;
    const nextSlide = currentSlide + 1;
    if (nextSlide < currentModule.slides.length) {
      setCurrentSlide(nextSlide);
      updateProgress(currentModule.id, nextSlide);
    } else {
      // Show quiz
      setViewMode('quiz');
    }
  };

  const handlePrevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (!currentModule || !selectedModuleId) return;

    const answers = Object.entries(quizAnswers).map(([questionId, answerId]) => ({
      questionId,
      answerId,
    }));

    const result = await submitQuiz(selectedModuleId, answers);
    if (result) {
      setQuizResult({
        score: result.score,
        passed: result.passed,
        results: result.results,
      });
    }
  };

  const handleBackToList = () => {
    setViewMode('list');
    setSelectedModuleId(null);
    setQuizResult(null);
  };

  // Loading state
  if (isLoading && modules.length === 0) {
    return (
      <Layout showFooter={false}>
        <InfluencerDashboardLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        </InfluencerDashboardLayout>
      </Layout>
    );
  }

  // Module view
  if (viewMode === 'module' && currentModule) {
    const slide = currentModule.slides[currentSlide];
    const progress = ((currentSlide + 1) / currentModule.slides.length) * 100;

    return (
      <Layout showFooter={false}>
        <InfluencerDashboardLayout>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleBackToList}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600"
              >
                <ChevronLeft className="w-5 h-5" />
                <FormattedMessage id="common.back" defaultMessage="Retour" />
              </button>
              <span className="text-sm text-gray-500">
                {currentSlide + 1} / {currentModule.slides.length}
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Slide content */}
            <div className={`${UI.card} p-8`}>
              {isLoadingModule ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {slide?.title}
                  </h2>

                  {slide?.type === 'video' && slide.mediaUrl && (
                    <div className="aspect-video bg-gray-900 rounded-xl mb-6 overflow-hidden">
                      <iframe
                        src={slide.mediaUrl}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  )}

                  {slide?.type === 'image' && slide.mediaUrl && (
                    <img
                      src={slide.mediaUrl}
                      alt={slide.title}
                      className="w-full rounded-xl mb-6"
                    />
                  )}

                  <div className="prose dark:prose-invert max-w-none">
                    <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                      {slide?.content}
                    </p>
                  </div>

                  {slide?.type === 'checklist' && slide.checklistItems && (
                    <ul className="mt-6 space-y-3">
                      {slide.checklistItems.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
                          <span className="text-gray-700 dark:text-gray-300">{item.text}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {slide?.type === 'tips' && slide.tips && (
                    <div className="mt-6 grid gap-3">
                      {slide.tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                          <Lightbulb className="w-5 h-5 text-purple-500 mt-0.5" />
                          <span className="text-gray-700 dark:text-gray-300">{tip.text}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Navigation */}
            <div className="flex gap-4">
              <button
                onClick={handlePrevSlide}
                disabled={currentSlide === 0}
                className={`${UI.button.secondary} px-6 py-3 flex items-center gap-2`}
              >
                <ChevronLeft className="w-5 h-5" />
                <FormattedMessage id="common.previous" defaultMessage="Precedent" />
              </button>
              <button
                onClick={handleNextSlide}
                className={`${UI.button.primary} flex-1 py-3 flex items-center justify-center gap-2`}
              >
                {currentSlide < currentModule.slides.length - 1 ? (
                  <>
                    <FormattedMessage id="common.next" defaultMessage="Suivant" />
                    <ChevronRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    <FormattedMessage id="training.startQuiz" defaultMessage="Passer le quiz" />
                    <Award className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </InfluencerDashboardLayout>
      </Layout>
    );
  }

  // Quiz view
  if (viewMode === 'quiz' && currentModule) {
    return (
      <Layout showFooter={false}>
        <InfluencerDashboardLayout>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setViewMode('module')}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-purple-600"
              >
                <ChevronLeft className="w-5 h-5" />
                <FormattedMessage id="training.backToModule" defaultMessage="Retour au module" />
              </button>
            </div>

            <div className={`${UI.card} p-6`}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                <FormattedMessage id="training.quiz.title" defaultMessage="Quiz de validation" />
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                <FormattedMessage
                  id="training.quiz.subtitle"
                  defaultMessage="Repondez aux questions pour valider le module ({passingScore}% requis)"
                  values={{ passingScore: currentModule.passingScore }}
                />
              </p>

              {quizResult ? (
                // Quiz results
                <div className="space-y-6">
                  <div className={`p-6 rounded-xl text-center ${
                    quizResult.passed
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                  }`}>
                    {quizResult.passed ? (
                      <>
                        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-green-700 dark:text-green-400">
                          <FormattedMessage id="training.quiz.passed" defaultMessage="Felicitations !" />
                        </h3>
                        <p className="text-green-600 dark:text-green-500">
                          <FormattedMessage
                            id="training.quiz.passedMessage"
                            defaultMessage="Vous avez obtenu {score}% et valide ce module"
                            values={{ score: quizResult.score }}
                          />
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                        <h3 className="text-xl font-bold text-red-700 dark:text-red-400">
                          <FormattedMessage id="training.quiz.failed" defaultMessage="Pas encore..." />
                        </h3>
                        <p className="text-red-600 dark:text-red-500">
                          <FormattedMessage
                            id="training.quiz.failedMessage"
                            defaultMessage="Vous avez obtenu {score}%. Il faut {required}% pour valider."
                            values={{ score: quizResult.score, required: currentModule.passingScore }}
                          />
                        </p>
                      </>
                    )}
                  </div>

                  <div className="flex gap-4">
                    <button
                      onClick={handleBackToList}
                      className={`${UI.button.secondary} flex-1 py-3`}
                    >
                      <FormattedMessage id="training.backToModules" defaultMessage="Retour aux modules" />
                    </button>
                    {!quizResult.passed && (
                      <button
                        onClick={() => {
                          setQuizResult(null);
                          setQuizAnswers({});
                        }}
                        className={`${UI.button.primary} flex-1 py-3`}
                      >
                        <FormattedMessage id="training.quiz.retry" defaultMessage="Reessayer" />
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                // Quiz questions
                <div className="space-y-6">
                  {currentModule.quizQuestions.map((question, idx) => (
                    <div key={question.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                      <p className="font-medium text-gray-900 dark:text-white mb-3">
                        {idx + 1}. {question.question}
                      </p>
                      <div className="space-y-2">
                        {question.options.map((option) => (
                          <label
                            key={option.id}
                            className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                              quizAnswers[question.id] === option.id
                                ? 'bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700'
                                : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-gray-700 hover:border-purple-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name={question.id}
                              value={option.id}
                              checked={quizAnswers[question.id] === option.id}
                              onChange={() => setQuizAnswers({ ...quizAnswers, [question.id]: option.id })}
                              className="text-purple-600"
                            />
                            <span className="text-gray-700 dark:text-gray-300">{option.text}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={handleSubmitQuiz}
                    disabled={Object.keys(quizAnswers).length < currentModule.quizQuestions.length || isSubmittingQuiz}
                    className={`${UI.button.primary} w-full py-3 flex items-center justify-center gap-2`}
                  >
                    {isSubmittingQuiz ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <FormattedMessage id="training.quiz.submit" defaultMessage="Valider mes reponses" />
                        <CheckCircle className="w-5 h-5" />
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </InfluencerDashboardLayout>
      </Layout>
    );
  }

  // Module list view
  return (
    <Layout showFooter={false}>
      <InfluencerDashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="influencer.training.title" defaultMessage="Formation" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.training.subtitle" defaultMessage="Apprenez les meilleures techniques pour maximiser vos gains" />
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Progress Card */}
          {overallProgress && (
            <div className={`${UI.card} p-6`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    <FormattedMessage id="influencer.training.progress.title" defaultMessage="Votre progression" />
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="influencer.training.progress.subtitle"
                      defaultMessage="{completed} sur {total} modules completes"
                      values={{
                        completed: overallProgress.completedModules,
                        total: overallProgress.totalModules,
                      }}
                    />
                  </p>
                </div>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {overallProgress.completionPercent}%
                </div>
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${overallProgress.completionPercent}%` }}
                />
              </div>
              {overallProgress.hasCertificate && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center gap-3">
                  <Award className="w-6 h-6 text-green-500" />
                  <span className="text-green-700 dark:text-green-400 font-medium">
                    <FormattedMessage id="influencer.training.certificateEarned" defaultMessage="Certificat obtenu !" />
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Quick Tips */}
          <div className={`${UI.card} p-6`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-purple-500" />
              <FormattedMessage id="influencer.training.tips.title" defaultMessage="Conseils rapides" />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TIPS.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    {tip.icon}
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">{tip.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Training Modules */}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-500" />
              <FormattedMessage id="influencer.training.modules.title" defaultMessage="Modules de formation" />
            </h3>

            {modules.length === 0 ? (
              <div className={`${UI.card} p-8 text-center`}>
                <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="influencer.training.noModules" defaultMessage="Aucun module disponible pour le moment" />
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {modules.map((module) => {
                  const isCompleted = module.progress?.isCompleted;
                  const isLocked = module.prerequisites.length > 0 && !isCompleted;

                  return (
                    <div
                      key={module.id}
                      className={`${UI.card} p-4 cursor-pointer hover:shadow-xl transition-all ${
                        isLocked ? 'opacity-60' : ''
                      }`}
                      onClick={() => !isLocked && handleStartModule(module.id)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${
                          isCompleted
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                            : isLocked
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                            : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                        }`}>
                          {isCompleted ? (
                            <CheckCircle className="w-6 h-6" />
                          ) : isLocked ? (
                            <Lock className="w-6 h-6" />
                          ) : (
                            getCategoryIcon(module.category)
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">{module.estimatedMinutes} min</span>
                            {module.isRequired && (
                              <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs">
                                <FormattedMessage id="training.required" defaultMessage="Requis" />
                              </span>
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                            {module.title}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                            {module.description}
                          </p>

                          {module.progress && (
                            <div className="mt-2">
                              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                                <span>
                                  {module.progress.currentSlideIndex + 1} / {module.progress.totalSlides} slides
                                </span>
                                {module.progress.bestScore > 0 && (
                                  <span>Quiz: {module.progress.bestScore}%</span>
                                )}
                              </div>
                              <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-purple-500 rounded-full"
                                  style={{
                                    width: `${((module.progress.currentSlideIndex + 1) / module.progress.totalSlides) * 100}%`,
                                  }}
                                />
                              </div>
                            </div>
                          )}

                          <div className="flex items-center gap-2 mt-3 text-sm text-purple-600 dark:text-purple-400 font-medium">
                            {isLocked ? (
                              <FormattedMessage id="training.locked" defaultMessage="Verrouillee" />
                            ) : isCompleted ? (
                              <FormattedMessage id="training.review" defaultMessage="Revoir" />
                            ) : module.progress?.isStarted ? (
                              <FormattedMessage id="training.continue" defaultMessage="Continuer" />
                            ) : (
                              <FormattedMessage id="training.start" defaultMessage="Commencer" />
                            )}
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Resources */}
          <div className={`${UI.card} p-6`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-purple-500" />
              <FormattedMessage id="influencer.training.resources.title" defaultMessage="Ressources telechargeables" />
            </h3>
            <div className="space-y-3">
              <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      <FormattedMessage id="influencer.training.resources.guide" defaultMessage="Guide de l'Influenceur" />
                    </p>
                    <p className="text-xs text-gray-500">PDF - 3.2 MB</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </a>
              <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      <FormattedMessage id="influencer.training.resources.templates" defaultMessage="Scripts video" />
                    </p>
                    <p className="text-xs text-gray-500">DOCX - 800 KB</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </a>
              <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      <FormattedMessage id="influencer.training.resources.images" defaultMessage="Kit graphique" />
                    </p>
                    <p className="text-xs text-gray-500">ZIP - 25 MB</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>
        </div>
      </InfluencerDashboardLayout>
    </Layout>
  );
};

export default InfluencerTraining;

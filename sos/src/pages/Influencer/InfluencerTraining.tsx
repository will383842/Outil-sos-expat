/**
 * InfluencerTraining - Formation page for influencers
 *
 * Dynamic training modules loaded from backend via useInfluencerTraining hook.
 * Supports: progress tracking, quizzes, certificates.
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useInfluencerTraining } from '@/hooks/useInfluencerTraining';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import type { InfluencerTrainingModuleListItem } from '@/types/influencer';
import {
  BookOpen,
  CheckCircle,
  Clock,
  ArrowRight,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Award,
  Lock,
  Play,
  X,
  Video,
  FileText,
  Trophy,
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
} as const;

const CATEGORY_COLORS: Record<string, string> = {
  onboarding:       'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-400',
  content_creation: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
  promotion:        'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  analytics:        'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-400',
  monetization:     'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
};

const CATEGORY_LABELS: Record<string, { fr: string; en: string; es: string }> = {
  onboarding:       { fr: 'Démarrage',         en: 'Onboarding',        es: 'Inicio' },
  content_creation: { fr: 'Contenu',            en: 'Content Creation',  es: 'Contenido' },
  promotion:        { fr: 'Promotion',          en: 'Promotion',         es: 'Promoción' },
  analytics:        { fr: 'Analytiques',        en: 'Analytics',         es: 'Analíticas' },
  monetization:     { fr: 'Monétisation',       en: 'Monetization',      es: 'Monetización' },
};

const InfluencerTraining: React.FC = () => {
  const intl = useIntl();
  const locale = (intl.locale?.split('-')[0] || 'fr') as 'fr' | 'en' | 'es';

  const {
    modules,
    overallProgress,
    currentModule,
    isLoading,
    isLoadingModule,
    error,
    loadModules,
    loadModuleContent,
  } = useInfluencerTraining();

  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const handleModuleClick = async (module: InfluencerTrainingModuleListItem) => {
    setSelectedModuleId(module.id);
    await loadModuleContent(module.id);
  };

  const handleCloseModal = () => {
    setSelectedModuleId(null);
  };

  if (isLoading) {
    return (
      <InfluencerDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </InfluencerDashboardLayout>
    );
  }

  if (error && modules.length === 0) {
    return (
      <InfluencerDashboardLayout>
        <div className={`${UI.card} p-8 text-center`}>
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={loadModules}
            className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2 mx-auto`}
          >
            <RefreshCw className="w-4 h-4" />
            <FormattedMessage id="common.retry" defaultMessage="Réessayer" />
          </button>
        </div>
      </InfluencerDashboardLayout>
    );
  }

  const completedModules = overallProgress?.completedModules ?? 0;
  const totalModules = overallProgress?.totalModules ?? modules.length;
  const progressPercent = overallProgress?.completionPercent ?? 0;

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="influencer.training.title" defaultMessage="Formation" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="influencer.training.subtitle" defaultMessage="Apprenez à maximiser vos revenus" />
          </p>
        </div>

        {/* Progress Card */}
        <div className={`${UI.card} p-6`}>
          <div className="flex sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="influencer.training.progress.title" defaultMessage="Votre progression" />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="influencer.training.progress.subtitle"
                  defaultMessage="{completed} sur {total} modules complétés"
                  values={{ completed: completedModules, total: totalModules }}
                />
              </p>
            </div>
            <div className="text-3xl font-bold text-red-500 dark:text-red-400">
              {progressPercent.toFixed(0)}%
            </div>
          </div>
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Certificate Card */}
        {overallProgress?.hasCertificate && (
          <div className={`${UI.card} p-6 border-yellow-200 dark:border-yellow-700/30`}>
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl">
                <Trophy className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">
                  <FormattedMessage id="influencer.training.certificate.earned" defaultMessage="Certificat obtenu !" />
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <FormattedMessage
                    id="influencer.training.certificate.desc"
                    defaultMessage="Vous avez complété le programme de formation Influencer."
                  />
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Training Modules */}
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-red-500" />
            <FormattedMessage id="influencer.training.modules.title" defaultMessage="Modules de formation" />
          </h3>

          {modules.length === 0 ? (
            <div className={`${UI.card} p-8 text-center`}>
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">
                <FormattedMessage id="influencer.training.noModules" defaultMessage="Aucun module disponible pour le moment." />
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {modules.map((module) => {
                const progress = module.progress;
                const isCompleted = progress?.isCompleted ?? false;
                const isStarted = progress?.isStarted ?? false;
                const isLocked = module.prerequisites.length > 0 && !isStarted && !isCompleted;
                const progressPct = progress
                  ? Math.round((progress.currentSlideIndex / Math.max(progress.totalSlides - 1, 1)) * 100)
                  : 0;
                const categoryLabel =
                  CATEGORY_LABELS[module.category]?.[locale] ??
                  CATEGORY_LABELS[module.category]?.fr ??
                  module.category;
                const categoryColor =
                  CATEGORY_COLORS[module.category] ??
                  'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400';

                return (
                  <div
                    key={module.id}
                    className={`${UI.card} p-4 transition-all ${
                      isLocked
                        ? 'opacity-60 cursor-not-allowed'
                        : 'cursor-pointer hover:shadow-xl'
                    }`}
                    onClick={() => !isLocked && handleModuleClick(module)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl flex-shrink-0 ${
                        isCompleted
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                          : isLocked
                          ? 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : isLocked ? (
                          <Lock className="w-6 h-6" />
                        ) : (
                          <BookOpen className="w-6 h-6" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoryColor}`}>
                            {categoryLabel}
                          </span>
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {module.estimatedMinutes} min
                          </span>
                          {module.isRequired && (
                            <span className="text-xs px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full font-medium">
                              <FormattedMessage id="influencer.training.required" defaultMessage="Requis" />
                            </span>
                          )}
                        </div>

                        <h4 className="font-semibold text-gray-900 dark:text-white mb-1 text-sm">
                          {module.title}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2">
                          {module.description}
                        </p>

                        {isStarted && !isCompleted && progress && (
                          <div className="mb-2">
                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                          </div>
                        )}

                        {progress && progress.bestScore > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-1">
                            <Award className="w-3 h-3 text-yellow-500" />
                            <FormattedMessage
                              id="influencer.training.bestScore"
                              defaultMessage="Meilleur score : {score}%"
                              values={{ score: progress.bestScore }}
                            />
                          </div>
                        )}

                        {!isLocked && (
                          <div className="flex items-center gap-1 text-sm font-medium text-red-500 dark:text-red-400">
                            {isCompleted ? (
                              <FormattedMessage id="influencer.training.review" defaultMessage="Revoir" />
                            ) : isStarted ? (
                              <FormattedMessage id="influencer.training.continue" defaultMessage="Continuer" />
                            ) : (
                              <FormattedMessage id="influencer.training.start" defaultMessage="Commencer" />
                            )}
                            <ArrowRight className="w-4 h-4" />
                          </div>
                        )}

                        {isLocked && (
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            <FormattedMessage
                              id="influencer.training.locked"
                              defaultMessage="Complétez les modules précédents pour débloquer"
                            />
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* Module Detail Modal */}
      {selectedModuleId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className={`${UI.card} p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto`}>
            {isLoadingModule ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-red-500" />
              </div>
            ) : currentModule ? (
              <>
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white pr-4">
                    {currentModule.title}
                  </h2>
                  <button
                    onClick={handleCloseModal}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
                    aria-label={intl.formatMessage({ id: 'common.close', defaultMessage: 'Fermer' })}
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm mb-5">
                  {currentModule.description}
                </p>

                <div className="flex items-center gap-4 mb-5 text-sm text-gray-500 dark:text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {currentModule.estimatedMinutes} min
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    {currentModule.slides.length}{' '}
                    <FormattedMessage id="influencer.training.slides" defaultMessage="slides" />
                  </span>
                  {currentModule.quizQuestions.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Award className="w-4 h-4 text-yellow-500" />
                      {currentModule.quizQuestions.length}{' '}
                      <FormattedMessage id="influencer.training.questions" defaultMessage="questions" />
                    </span>
                  )}
                </div>

                {currentModule.slides.length > 0 && (
                  <div className="mb-5">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-3 text-sm">
                      <FormattedMessage id="influencer.training.content" defaultMessage="Contenu" />
                    </h3>
                    <div className="space-y-2">
                      {currentModule.slides.map((slide, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl"
                        >
                          {slide.type === 'video' ? (
                            <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                          )}
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {slide.title}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleCloseModal}
                    className={`${UI.button.secondary} flex-1 py-2.5`}
                  >
                    <FormattedMessage id="common.close" defaultMessage="Fermer" />
                  </button>
                  <button className={`${UI.button.primary} flex-1 py-2.5 flex items-center justify-center gap-2`}>
                    <Play className="w-4 h-4" />
                    <FormattedMessage id="influencer.training.start" defaultMessage="Commencer" />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <button
                  onClick={handleCloseModal}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg mb-4 mx-auto block"
                >
                  <X className="w-5 h-5" />
                </button>
                <p className="text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="influencer.training.loadError" defaultMessage="Impossible de charger ce module." />
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </InfluencerDashboardLayout>
  );
};

export default InfluencerTraining;

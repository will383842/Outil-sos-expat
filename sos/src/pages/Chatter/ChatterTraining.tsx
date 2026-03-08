/**
 * ChatterTraining - Unified Tools page (fusion Formation + Resources + How to Earn)
 * 3 sub-tabs: Comment gagner | Formation | Ressources
 * Uses useChatterData() Context + useChatterTraining() + useChatterResources()
 */

import React, { useState, useCallback, useMemo, lazy, Suspense } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import toast from 'react-hot-toast';
import {
  Briefcase, BookOpen, FolderOpen, Lightbulb,
  Share2, Phone, DollarSign, Crown, CheckCircle,
  ArrowRight, ArrowLeft, Award, Loader2, RefreshCw,
  X, ChevronRight, Lock, ImageIcon, FileText, Video,
  Calculator, ListChecks,
} from 'lucide-react';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';
import SwipeTabContainer from '@/components/Chatter/Layout/SwipeTabContainer';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { useChatterTraining } from '@/hooks/useChatterTraining';
import { useChatterResources } from '@/hooks/useChatterResources';
import { copyToClipboard } from '@/utils/clipboard';
import EmptyStateCard from '@/components/Chatter/Activation/EmptyStateCard';
import { UI, SPACING } from '@/components/Chatter/designTokens';
import { useApp } from '@/contexts/AppContext';
import type {
  TrainingModuleListItem,
  ChatterTrainingModule,
  TrainingSlide,
  TrainingQuizQuestion,
  SubmitTrainingQuizResult,
} from '@/types/chatter';

// Revenue calculator simple
const REVENUE_SCENARIOS = [
  { calls: 2, label: '2', monthly: 80 },
  { calls: 5, label: '5', monthly: 200 },
  { calls: 10, label: '10', monthly: 400 },
  { calls: 20, label: '20', monthly: 800 },
  { calls: 50, label: '50', monthly: 2000 },
];

export default function ChatterTraining() {
  return (
    <ChatterDashboardLayout activeKey="training">
      <ChatterTrainingContent />
    </ChatterDashboardLayout>
  );
}

function ChatterTrainingContent() {
  const intl = useIntl();
  const { language } = useApp();
  const { dashboardData, clientShareUrl } = useChatterData();
  const chatter = dashboardData?.chatter;

  const {
    modules,
    isLoading: trainingLoading,
    loadModuleContent,
    submitQuiz,
    currentModule,
    loadModules,
  } = useChatterTraining();

  const {
    resources: resourcesData,
    isLoading: resourcesLoading,
    fetchResources,
  } = useChatterResources();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [selectedSlide, setSelectedSlide] = useState(0);
  const [viewingModule, setViewingModule] = useState<string | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<SubmitTrainingQuizResult | null>(null);
  const [revenueSlider, setRevenueSlider] = useState(2); // index in REVENUE_SCENARIOS

  const handleCopyLink = useCallback(async () => {
    if (!clientShareUrl) return;
    const success = await copyToClipboard(clientShareUrl);
    if (success) {
      toast.success(intl.formatMessage({ id: 'chatter.linkCopied', defaultMessage: 'Lien copie !' }));
    }
  }, [clientShareUrl, intl]);

  // Open module viewer
  const handleOpenModule = useCallback(async (moduleId: string) => {
    await loadModuleContent(moduleId);
    setViewingModule(moduleId);
    setSelectedSlide(0);
    setQuizAnswers({});
    setQuizResult(null);
  }, [loadModuleContent]);

  // Tab 1: Comment gagner
  const howToEarnTab = (
    <div className="space-y-4">
      {/* Timeline steps */}
      <div className={`${UI.card} p-4 sm:p-5`}>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4">
          <FormattedMessage id="chatter.tools.howItWorks" defaultMessage="Comment ca marche" />
        </h3>
        <div className="space-y-4">
          {[
            { num: 1, title: "Inscrivez-vous", desc: "C'est fait !", done: true, color: 'bg-green-500', icon: <CheckCircle className="w-4 h-4" /> },
            { num: 2, title: "Partagez votre lien", desc: "Copiez et envoyez votre lien a des expatries", done: false, color: 'bg-blue-500', icon: <Share2 className="w-4 h-4" /> },
            { num: 3, title: "Des clients appellent", desc: "$5 (avocat) ou $3 (expatrie) par appel", done: false, color: 'bg-green-500', icon: <Phone className="w-4 h-4" /> },
            { num: 4, title: "Vous gagnez automatiquement", desc: "Commission creditee apres 48h de validation", done: false, color: 'bg-yellow-500', icon: <DollarSign className="w-4 h-4" /> },
            { num: 5, title: "Devenez Captain", desc: "Gerez une equipe et gagnez des bonus mensuels", done: false, color: 'bg-purple-500', icon: <Crown className="w-4 h-4" /> },
          ].map((step) => (
            <div key={step.num} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 ${step.done ? 'bg-green-500' : step.color} text-white rounded-full flex items-center justify-center flex-shrink-0`}>
                  {step.done ? <CheckCircle className="w-4 h-4" /> : <span className="text-sm font-bold">{step.num}</span>}
                </div>
                {step.num < 5 && <div className="w-0.5 h-full bg-slate-200 dark:bg-white/10 mt-1" />}
              </div>
              <div className="pb-4">
                <p className={`text-sm font-medium ${step.done ? 'text-green-600 dark:text-green-400' : 'text-slate-900 dark:text-white'}`}>
                  {step.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{step.desc}</p>
                {step.num === 2 && (
                  <button onClick={handleCopyLink} className={`mt-2 ${UI.button.primary} px-3 py-1.5 text-xs`}>
                    <FormattedMessage id="chatter.tools.copyLink" defaultMessage="Copier mon lien" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No spam notice */}
      <div className={`${UI.card} p-4 bg-amber-50/50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20`}>
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">
          <FormattedMessage id="chatter.tools.noSpam" defaultMessage="Partagez intelligemment, pas de spam" />
        </p>
        <p className="text-xs text-amber-700 dark:text-amber-400">
          <FormattedMessage id="chatter.tools.noSpamDesc" defaultMessage="Partagez dans des groupes pertinents, avec des personnes qui ont vraiment besoin d'aide. La qualite > la quantite." />
        </p>
      </div>

      {/* Revenue calculator */}
      <div className={`${UI.card} p-4 sm:p-5`}>
        <div className="flex items-center gap-2 mb-3">
          <Calculator className="w-5 h-5 text-slate-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            <FormattedMessage id="chatter.tools.calculator" defaultMessage="Calculateur de revenus" />
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          <FormattedMessage id="chatter.tools.calculatorDesc" defaultMessage="Si vous generez X appels par semaine :" />
        </p>
        {/* Slider */}
        <input
          type="range"
          min={0}
          max={REVENUE_SCENARIOS.length - 1}
          value={revenueSlider}
          onChange={(e) => setRevenueSlider(parseInt(e.target.value))}
          className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-red-500"
        />
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 mb-4">
          {REVENUE_SCENARIOS.map((s) => <span key={s.calls}>{s.label}</span>)}
        </div>
        <div className="text-center p-4 bg-green-50 dark:bg-green-500/10 rounded-xl">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {REVENUE_SCENARIOS[revenueSlider].calls} appels/semaine =
          </p>
          <p className="text-3xl font-extrabold text-green-500 mt-1">
            ~${REVENUE_SCENARIOS[revenueSlider].monthly}/mois
          </p>
          <p className="text-xs text-slate-400 mt-1">
            + revenus passifs de vos filleuls
          </p>
        </div>
      </div>
    </div>
  );

  // Tab 2: Formation
  const trainingTab = (
    <div className="space-y-4">
      {trainingLoading && !modules?.length && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}

      {!trainingLoading && (!modules || modules.length === 0) && (
        <EmptyStateCard
          icon={<BookOpen className="w-7 h-7" />}
          title={<FormattedMessage id="chatter.training.emptyTitle" defaultMessage="Apprenez les techniques des meilleurs chatters !" />}
          description={<FormattedMessage id="chatter.training.emptyDesc" defaultMessage="15 minutes de formation = des gains multiplies. Les modules arrivent bientot !" />}
        />
      )}

      {/* Module cards grid */}
      {modules && modules.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {modules.map((mod: TrainingModuleListItem) => (
            <button
              key={mod.id}
              onClick={() => handleOpenModule(mod.id)}
              disabled={mod.prerequisites.length > 0 && !mod.progress?.isStarted}
              className={`${UI.card} p-4 text-left transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 text-[10px] font-medium rounded-full uppercase">
                  {mod.category || 'general'}
                </span>
                {mod.prerequisites.length > 0 && !mod.progress?.isStarted ? (
                  <Lock className="w-4 h-4 text-slate-400" />
                ) : mod.progress?.isCompleted ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : null}
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">{mod.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mod.progress?.totalSlides || 0} slides · {mod.estimatedMinutes || 5}min
              </p>
              {mod.progress && mod.progress.isStarted && !mod.progress.isCompleted && mod.progress.totalSlides > 0 && (
                <div className="mt-2 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${(mod.progress.currentSlideIndex / mod.progress.totalSlides) * 100}%` }} />
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Module viewer modal */}
      {viewingModule && currentModule && (
        <ModuleViewer
          module={currentModule}
          selectedSlide={selectedSlide}
          onSlideChange={setSelectedSlide}
          quizAnswers={quizAnswers}
          onQuizAnswer={(qId, answer) => setQuizAnswers(prev => ({ ...prev, [qId]: answer }))}
          quizResult={quizResult}
          onSubmitQuiz={async () => {
            const answersArray = Object.entries(quizAnswers).map(([questionId, answerId]) => ({ questionId, answerId }));
            const result = await submitQuiz(viewingModule, answersArray);
            if (result) setQuizResult(result);
          }}
          onClose={() => { setViewingModule(null); setQuizResult(null); }}
        />
      )}
    </div>
  );

  // Derive filtered resources from resourcesData
  const allResources = useMemo(() => {
    if (!resourcesData) return [];
    const files = (resourcesData.files || []).map((f: any) => ({ ...f, _kind: 'file' as const }));
    const texts = (resourcesData.texts || []).map((t: any) => ({ ...t, _kind: 'text' as const }));
    return [...files, ...texts];
  }, [resourcesData]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    allResources.forEach((r: any) => { if (r.category) cats.add(r.category); });
    return Array.from(cats).sort();
  }, [allResources]);

  const filteredResources = useMemo(() => {
    let items = allResources;
    if (selectedCategory) items = items.filter((r: any) => r.category === selectedCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((r: any) =>
        (r.title || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.content || '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [allResources, selectedCategory, searchQuery]);

  // Tab 3: Ressources
  const resourcesTab = (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={intl.formatMessage({ id: 'chatter.resources.search', defaultMessage: 'Rechercher...' })}
        className="w-full px-4 py-3 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-base text-slate-900 dark:text-white placeholder-slate-400"
      />

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setSelectedCategory('')}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              !selectedCategory ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
            }`}
          >
            <FormattedMessage id="common.all" defaultMessage="Tout" />
          </button>
          {categories.map((cat: string) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                selectedCategory === cat ? 'bg-red-500 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Resource grid */}
      {resourcesLoading && (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        </div>
      )}

      {filteredResources.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredResources.map((resource: any) => (
            <div key={resource.id} className={`${UI.card} p-4`}>
              {resource.type === 'image' && resource.thumbnailUrl && (
                <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-32 object-cover rounded-lg mb-3" loading="lazy" />
              )}
              <div className="flex items-start gap-2">
                <div className="flex-shrink-0 w-8 h-8 bg-slate-100 dark:bg-white/10 rounded-lg flex items-center justify-center">
                  {resource._kind === 'text' ? <FileText className="w-4 h-4 text-slate-400" /> :
                   resource.type === 'image' ? <ImageIcon className="w-4 h-4 text-slate-400" /> :
                   resource.type === 'video' ? <Video className="w-4 h-4 text-slate-400" /> :
                   <FileText className="w-4 h-4 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate">{resource.title}</h4>
                  {resource.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">{resource.description}</p>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {resource.downloadUrl && (
                  <a
                    href={resource.downloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${UI.button.primary} px-3 py-1.5 text-xs flex-1 text-center`}
                  >
                    <FormattedMessage id="common.download" defaultMessage="Telecharger" />
                  </a>
                )}
                {resource.content && (
                  <button
                    onClick={async () => {
                      const success = await copyToClipboard(resource.content);
                      if (success) toast.success(intl.formatMessage({ id: 'common.copied', defaultMessage: 'Copie !' }));
                    }}
                    className={`${UI.button.secondary} px-3 py-1.5 text-xs flex-1`}
                  >
                    <FormattedMessage id="common.copy" defaultMessage="Copier" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!resourcesLoading && filteredResources.length === 0 && (
        <EmptyStateCard
          icon={<FolderOpen className="w-7 h-7" />}
          title={<FormattedMessage id="chatter.resources.emptyTitle" defaultMessage="Ressources a venir" />}
          description={<FormattedMessage id="chatter.resources.emptyDesc" defaultMessage="Images, textes pre-ecrits et outils de partage arrivent bientot !" />}
        />
      )}
    </div>
  );

  const tabs = [
    {
      key: 'how-to-earn',
      label: <FormattedMessage id="chatter.tools.tab.howToEarn" defaultMessage="Comment gagner" />,
      content: howToEarnTab,
    },
    {
      key: 'training',
      label: <FormattedMessage id="chatter.tools.tab.training" defaultMessage="Formation" />,
      content: trainingTab,
    },
    {
      key: 'resources',
      label: <FormattedMessage id="chatter.tools.tab.resources" defaultMessage="Ressources" />,
      content: resourcesTab,
    },
  ];

  return (
    <div className="px-4 py-4">
      <div className="flex items-center gap-2 mb-4">
        <Briefcase className="w-5 h-5 text-slate-400" />
        <h1 className="text-lg font-bold text-slate-900 dark:text-white">
          <FormattedMessage id="chatter.tools.title" defaultMessage="Outils" />
        </h1>
      </div>
      <SwipeTabContainer tabs={tabs} />
    </div>
  );
}

// ============================================================================
// MODULE VIEWER (inline, full-screen on mobile)
// ============================================================================

interface ModuleViewerProps {
  module: ChatterTrainingModule;
  selectedSlide: number;
  onSlideChange: (index: number) => void;
  quizAnswers: Record<string, string>;
  onQuizAnswer: (questionId: string, answer: string) => void;
  quizResult: SubmitTrainingQuizResult | null;
  onSubmitQuiz: () => void;
  onClose: () => void;
}

const ModuleViewer: React.FC<ModuleViewerProps> = ({
  module, selectedSlide, onSlideChange, quizAnswers, onQuizAnswer, quizResult, onSubmitQuiz, onClose,
}) => {
  const slides = module.slides || [];
  const quiz = module.quizQuestions?.length > 0 ? module.quizQuestions : null;
  const totalSteps = slides.length + (quiz ? 1 : 0);
  const isQuizStep = selectedSlide >= slides.length;

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-b border-slate-200 dark:border-white/10 px-4 py-3 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{module.title}</h3>
          <p className="text-xs text-slate-400">{selectedSlide + 1}/{totalSteps}</p>
        </div>
        <button onClick={onClose} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center">
          <X className="w-5 h-5 text-slate-500" />
        </button>
      </div>

      {/* Progress */}
      <div className="h-1 bg-slate-200 dark:bg-white/10">
        <div className="h-full bg-red-500 transition-all" style={{ width: `${((selectedSlide + 1) / totalSteps) * 100}%` }} />
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 max-w-2xl mx-auto">
        {!isQuizStep && slides[selectedSlide] && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">{slides[selectedSlide].title}</h2>
            {slides[selectedSlide].mediaUrl && (
              <img src={slides[selectedSlide].mediaUrl} alt="" className="w-full rounded-xl mb-4" loading="lazy" />
            )}
            <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: slides[selectedSlide].content || '' }} />
          </div>
        )}

        {isQuizStep && quiz && !quizResult && (
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Quiz</h2>
            <div className="space-y-6">
              {quiz.map((q: TrainingQuizQuestion, qi: number) => (
                <div key={q.id}>
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-2">{qi + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options?.map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => onQuizAnswer(q.id, opt.id)}
                        className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                          quizAnswers[q.id] === opt.id
                            ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'
                            : 'border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                        }`}
                      >
                        {opt.text}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={onSubmitQuiz} className={`mt-6 w-full ${UI.button.primary} py-3 text-sm`}>
              <FormattedMessage id="chatter.training.submitQuiz" defaultMessage="Valider le quiz" />
            </button>
          </div>
        )}

        {quizResult && (
          <div className="text-center py-8">
            <Award className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {quizResult.score >= 70 ? 'Felicitations !' : 'Essayez encore !'}
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-400 mt-2">
              Score: {quizResult.score}%
            </p>
            <button onClick={onClose} className={`mt-6 ${UI.button.primary} px-8 py-3 text-sm`}>
              <FormattedMessage id="common.close" defaultMessage="Fermer" />
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="sticky bottom-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-white/10 px-4 py-3 flex justify-between">
        <button
          onClick={() => onSlideChange(Math.max(0, selectedSlide - 1))}
          disabled={selectedSlide === 0}
          className={`${UI.button.secondary} px-4 py-2 text-sm disabled:opacity-30 inline-flex items-center gap-1`}
        >
          <ArrowLeft className="w-4 h-4" />
          <FormattedMessage id="common.previous" defaultMessage="Precedent" />
        </button>
        <button
          onClick={() => {
            if (selectedSlide < totalSteps - 1) {
              onSlideChange(selectedSlide + 1);
            }
          }}
          disabled={selectedSlide >= totalSteps - 1}
          className={`${UI.button.primary} px-4 py-2 text-sm disabled:opacity-30 inline-flex items-center gap-1`}
        >
          <FormattedMessage id="common.next" defaultMessage="Suivant" />
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

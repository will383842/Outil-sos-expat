/**
 * ChatterTraining - Training/Formation page for chatters
 * Provides resources, guides, and best practices for chatters
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import Layout from '@/components/layout/Layout';
import ChatterDashboardLayout from '@/components/Chatter/Layout/ChatterDashboardLayout';
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
  ExternalLink,
  Star,
  Award,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-xl transition-all",
  },
} as const;

interface TrainingModule {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  duration: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  completed?: boolean;
  lessons: {
    title: string;
    type: 'video' | 'article' | 'quiz';
    duration: string;
    completed?: boolean;
  }[];
}

const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'intro',
    title: 'Introduction au programme Chatter',
    description: 'Découvrez les bases du programme et comment maximiser vos gains.',
    icon: <BookOpen className="w-6 h-6" />,
    duration: '15 min',
    level: 'beginner',
    completed: true,
    lessons: [
      { title: 'Bienvenue dans le programme', type: 'video', duration: '3 min', completed: true },
      { title: 'Comment fonctionnent les commissions', type: 'article', duration: '5 min', completed: true },
      { title: 'Vos outils de promotion', type: 'article', duration: '5 min', completed: true },
      { title: 'Quiz de validation', type: 'quiz', duration: '2 min', completed: true },
    ],
  },
  {
    id: 'social',
    title: 'Maîtriser les réseaux sociaux',
    description: 'Techniques efficaces pour promouvoir SOS-Expat sur les réseaux sociaux.',
    icon: <MessageSquare className="w-6 h-6" />,
    duration: '30 min',
    level: 'intermediate',
    lessons: [
      { title: 'Optimiser votre profil', type: 'video', duration: '8 min' },
      { title: 'Créer du contenu engageant', type: 'video', duration: '10 min' },
      { title: 'Les meilleurs moments pour poster', type: 'article', duration: '5 min' },
      { title: 'Utiliser les hashtags efficacement', type: 'article', duration: '5 min' },
      { title: 'Quiz pratique', type: 'quiz', duration: '2 min' },
    ],
  },
  {
    id: 'groups',
    title: 'Stratégie Groupes & Forums',
    description: 'Comment identifier et exploiter les groupes d\'expatriés.',
    icon: <Users className="w-6 h-6" />,
    duration: '25 min',
    level: 'intermediate',
    lessons: [
      { title: 'Trouver les bons groupes', type: 'video', duration: '7 min' },
      { title: 'Règles des communautés', type: 'article', duration: '5 min' },
      { title: 'Interagir sans spammer', type: 'video', duration: '8 min' },
      { title: 'Mesurer votre impact', type: 'article', duration: '5 min' },
    ],
  },
  {
    id: 'conversion',
    title: 'Techniques de conversion',
    description: 'Transformez vos contacts en clients payants.',
    icon: <Target className="w-6 h-6" />,
    duration: '35 min',
    level: 'advanced',
    lessons: [
      { title: 'Comprendre le parcours client', type: 'video', duration: '10 min' },
      { title: 'Répondre aux objections', type: 'video', duration: '12 min' },
      { title: 'Créer l\'urgence', type: 'article', duration: '8 min' },
      { title: 'Suivi et relance', type: 'article', duration: '5 min' },
    ],
  },
  {
    id: 'advanced',
    title: 'Stratégies avancées',
    description: 'Techniques des top performers pour maximiser vos revenus.',
    icon: <TrendingUp className="w-6 h-6" />,
    duration: '40 min',
    level: 'advanced',
    lessons: [
      { title: 'Automatiser votre promotion', type: 'video', duration: '12 min' },
      { title: 'Recrutement de chatters', type: 'video', duration: '10 min' },
      { title: 'Analyse de vos performances', type: 'article', duration: '8 min' },
      { title: 'Scaling votre activité', type: 'video', duration: '10 min' },
    ],
  },
];

const TIPS = [
  {
    title: 'Personnalisez vos messages',
    description: 'Adaptez votre discours à chaque communauté et situation.',
    icon: <Lightbulb className="w-5 h-5 text-yellow-500" />,
  },
  {
    title: 'Soyez authentique',
    description: 'Partagez votre expérience personnelle pour créer de la confiance.',
    icon: <Star className="w-5 h-5 text-yellow-500" />,
  },
  {
    title: 'Restez régulier',
    description: 'La constance est la clé. Postez régulièrement pour rester visible.',
    icon: <Target className="w-5 h-5 text-yellow-500" />,
  },
  {
    title: 'Engagez avant de promouvoir',
    description: 'Participez aux discussions avant de partager vos liens.',
    icon: <MessageSquare className="w-5 h-5 text-yellow-500" />,
  },
];

const ChatterTraining: React.FC = () => {
  const intl = useIntl();
  const [selectedModule, setSelectedModule] = useState<TrainingModule | null>(null);

  const getLevelBadge = (level: TrainingModule['level']) => {
    switch (level) {
      case 'beginner':
        return (
          <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
            <FormattedMessage id="chatter.training.level.beginner" defaultMessage="Débutant" />
          </span>
        );
      case 'intermediate':
        return (
          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-medium">
            <FormattedMessage id="chatter.training.level.intermediate" defaultMessage="Intermédiaire" />
          </span>
        );
      case 'advanced':
        return (
          <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs font-medium">
            <FormattedMessage id="chatter.training.level.advanced" defaultMessage="Avancé" />
          </span>
        );
    }
  };

  const getLessonIcon = (type: 'video' | 'article' | 'quiz') => {
    switch (type) {
      case 'video':
        return <Video className="w-4 h-4 text-blue-500" />;
      case 'article':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'quiz':
        return <Award className="w-4 h-4 text-purple-500" />;
    }
  };

  const completedModules = TRAINING_MODULES.filter(m => m.completed).length;
  const totalModules = TRAINING_MODULES.length;
  const progressPercent = (completedModules / totalModules) * 100;

  return (
    <Layout showFooter={false}>
      <ChatterDashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="chatter.training.title" defaultMessage="Formation" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.training.subtitle" defaultMessage="Apprenez les meilleures techniques pour maximiser vos gains" />
            </p>
          </div>

          {/* Progress Card */}
          <div className={`${UI.card} p-6`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="chatter.training.progress.title" defaultMessage="Votre progression" />
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="chatter.training.progress.subtitle"
                    defaultMessage="{completed} sur {total} modules complétés"
                    values={{ completed: completedModules, total: totalModules }}
                  />
                </p>
              </div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
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

          {/* Quick Tips */}
          <div className={`${UI.card} p-6`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-red-500" />
              <FormattedMessage id="chatter.training.tips.title" defaultMessage="Conseils rapides" />
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {TIPS.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
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
              <BookOpen className="w-5 h-5 text-red-500" />
              <FormattedMessage id="chatter.training.modules.title" defaultMessage="Modules de formation" />
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TRAINING_MODULES.map((module) => (
                <div
                  key={module.id}
                  className={`${UI.card} p-4 cursor-pointer hover:shadow-xl transition-all`}
                  onClick={() => setSelectedModule(module)}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      module.completed
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                    }`}>
                      {module.completed ? <CheckCircle className="w-6 h-6" /> : module.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getLevelBadge(module.level)}
                        <span className="text-xs text-gray-500">{module.duration}</span>
                      </div>
                      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                        {module.title}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {module.description}
                      </p>
                      <div className="flex items-center gap-2 mt-3 text-sm text-red-600 dark:text-red-400 font-medium">
                        {module.completed ? (
                          <FormattedMessage id="chatter.training.review" defaultMessage="Revoir" />
                        ) : (
                          <FormattedMessage id="chatter.training.start" defaultMessage="Commencer" />
                        )}
                        <ArrowRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resources */}
          <div className={`${UI.card} p-6`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Download className="w-5 h-5 text-red-500" />
              <FormattedMessage id="chatter.training.resources.title" defaultMessage="Ressources téléchargeables" />
            </h3>
            <div className="space-y-3">
              <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      <FormattedMessage id="chatter.training.resources.guide" defaultMessage="Guide complet du Chatter" />
                    </p>
                    <p className="text-xs text-gray-500">PDF • 2.5 MB</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </a>
              <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      <FormattedMessage id="chatter.training.resources.templates" defaultMessage="Templates de messages" />
                    </p>
                    <p className="text-xs text-gray-500">DOCX • 500 KB</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </a>
              <a href="#" className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      <FormattedMessage id="chatter.training.resources.images" defaultMessage="Kit d'images promotionnelles" />
                    </p>
                    <p className="text-xs text-gray-500">ZIP • 15 MB</p>
                  </div>
                </div>
                <Download className="w-4 h-4 text-gray-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Module Detail Modal */}
        {selectedModule && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${UI.card} p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-xl ${
                    selectedModule.completed
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                  }`}>
                    {selectedModule.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {getLevelBadge(selectedModule.level)}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                      {selectedModule.title}
                    </h2>
                  </div>
                </div>
              </div>

              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {selectedModule.description}
              </p>

              <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                <FormattedMessage id="chatter.training.lessons" defaultMessage="Leçons" />
              </h3>

              <div className="space-y-2 mb-6">
                {selectedModule.lessons.map((lesson, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      {lesson.completed ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        getLessonIcon(lesson.type)
                      )}
                      <span className={`text-sm ${lesson.completed ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-white'}`}>
                        {lesson.title}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{lesson.duration}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setSelectedModule(null)}
                  className={`${UI.button.secondary} flex-1 py-2`}
                >
                  <FormattedMessage id="common.close" defaultMessage="Fermer" />
                </button>
                <button
                  className={`${UI.button.primary} flex-1 py-2 flex items-center justify-center gap-2`}
                >
                  <Play className="w-4 h-4" />
                  {selectedModule.completed ? (
                    <FormattedMessage id="chatter.training.review" defaultMessage="Revoir" />
                  ) : (
                    <FormattedMessage id="chatter.training.start" defaultMessage="Commencer" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </ChatterDashboardLayout>
    </Layout>
  );
};

export default ChatterTraining;

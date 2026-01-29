/**
 * AdminTrainingModules - Admin page for managing training modules
 * Supports both Chatter and Influencer training modules
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  GraduationCap,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  RefreshCw,
  BookOpen,
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Play,
  Sparkles,
  Save,
  X,
  FileText,
  HelpCircle,
  Award,
  Megaphone,
  MessageSquare,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
    success: "bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500",
  textarea: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none",
} as const;

// Types
type ModuleType = 'chatter' | 'influencer';
type ModuleStatus = 'draft' | 'published' | 'archived';

interface TrainingSlide {
  id: string;
  order: number;
  title: string;
  titleTranslations?: Record<string, string>;
  content: string;
  contentTranslations?: Record<string, string>;
  imageUrl?: string;
  videoUrl?: string;
}

interface TrainingQuizQuestion {
  id: string;
  order: number;
  question: string;
  questionTranslations?: Record<string, string>;
  options: string[];
  optionsTranslations?: Record<string, string[]>;
  correctOptionIndex: number;
  explanation?: string;
  explanationTranslations?: Record<string, string>;
}

interface TrainingModule {
  id: string;
  order: number;
  title: string;
  titleTranslations?: Record<string, string>;
  description: string;
  descriptionTranslations?: Record<string, string>;
  category: string;
  coverImageUrl?: string;
  introVideoUrl?: string;
  estimatedMinutes: number;
  isRequired: boolean;
  prerequisites: string[];
  passingScore: number;
  slides: TrainingSlide[];
  quizQuestions: TrainingQuizQuestion[];
  status: ModuleStatus;
  createdAt: string;
  updatedAt: string;
  studentsCount?: number;
}

// Categories for each module type
const CHATTER_CATEGORIES = [
  { value: 'getting-started', label: 'Démarrage' },
  { value: 'social-media', label: 'Réseaux Sociaux' },
  { value: 'community', label: 'Communauté' },
  { value: 'conversion', label: 'Conversion' },
  { value: 'recruitment', label: 'Recrutement' },
  { value: 'advanced', label: 'Avancé' },
];

const INFLUENCER_CATEGORIES = [
  { value: 'getting-started', label: 'Démarrage' },
  { value: 'content-creation', label: 'Création de Contenu' },
  { value: 'audience-growth', label: 'Croissance Audience' },
  { value: 'monetization', label: 'Monétisation' },
  { value: 'advanced', label: 'Avancé' },
];

const LANGUAGES = [
  { code: 'fr', name: 'Français' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'de', name: 'Deutsch' },
  { code: 'pt', name: 'Português' },
  { code: 'ar', name: 'العربية' },
  { code: 'ru', name: 'Русский' },
  { code: 'ch', name: '中文' },
  { code: 'hi', name: 'हिन्दी' },
];

const AdminTrainingModules: React.FC = () => {
  const intl = useIntl();
  const functions = getFunctions(undefined, 'europe-west1');

  // State
  const [moduleType, setModuleType] = useState<ModuleType>('chatter');
  const [modules, setModules] = useState<TrainingModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ModuleStatus | 'all'>('all');

  // Modal state
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [editingModule, setEditingModule] = useState<TrainingModule | null>(null);
  const [saving, setSaving] = useState(false);

  // Seeding state
  const [seeding, setSeeding] = useState(false);

  // Expanded module for viewing slides/quizzes
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);

  // Fetch modules
  const fetchModules = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const functionName = moduleType === 'chatter'
        ? 'adminGetTrainingModules'
        : 'adminGetInfluencerTrainingModules';

      const getModules = httpsCallable<unknown, { modules: TrainingModule[]; total: number }>(
        functions,
        functionName
      );

      const result = await getModules({});
      setModules(result.data.modules);
    } catch (err: unknown) {
      console.error('Error fetching modules:', err);
      setError((err as Error).message || 'Failed to load modules');
    } finally {
      setLoading(false);
    }
  }, [moduleType, functions]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  // Filter modules
  const filteredModules = modules.filter(m => {
    const matchesSearch = m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Handle seed modules
  const handleSeedModules = async () => {
    if (!confirm('Cela va créer les modules de formation par défaut. Continuer ?')) return;

    setSeeding(true);
    try {
      const functionName = moduleType === 'chatter'
        ? 'adminSeedTrainingModules'
        : 'adminSeedInfluencerTrainingModules';

      const seedModules = httpsCallable<unknown, { success: boolean; modulesCreated: number; errors: string[] }>(
        functions,
        functionName
      );

      const result = await seedModules({});
      alert(`${result.data.modulesCreated} modules créés avec succès!`);
      fetchModules();
    } catch (err: unknown) {
      console.error('Error seeding modules:', err);
      alert('Erreur: ' + ((err as Error).message || 'Failed to seed modules'));
    } finally {
      setSeeding(false);
    }
  };

  // Handle delete module
  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce module ? Cette action est irréversible.')) return;

    try {
      const functionName = moduleType === 'chatter'
        ? 'adminDeleteTrainingModule'
        : 'adminDeleteInfluencerTrainingModule';

      const deleteModule = httpsCallable(functions, functionName);
      await deleteModule({ moduleId });

      fetchModules();
    } catch (err: unknown) {
      console.error('Error deleting module:', err);
      alert('Erreur: ' + ((err as Error).message || 'Failed to delete module'));
    }
  };

  // Handle toggle status
  const handleToggleStatus = async (module: TrainingModule) => {
    const newStatus = module.status === 'published' ? 'draft' : 'published';

    try {
      const functionName = moduleType === 'chatter'
        ? 'adminUpdateTrainingModule'
        : 'adminUpdateInfluencerTrainingModule';

      const updateModule = httpsCallable(functions, functionName);
      await updateModule({ moduleId: module.id, status: newStatus });

      fetchModules();
    } catch (err: unknown) {
      console.error('Error updating module:', err);
      alert('Erreur: ' + ((err as Error).message || 'Failed to update module'));
    }
  };

  // Get status color
  const getStatusColor = (status: ModuleStatus) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'draft':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'archived':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Get category label
  const getCategoryLabel = (category: string) => {
    const categories = moduleType === 'chatter' ? CHATTER_CATEGORIES : INFLUENCER_CATEGORIES;
    return categories.find(c => c.value === category)?.label || category;
  };

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <GraduationCap className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
              <FormattedMessage id="admin.training.title" defaultMessage="Gestion des Formations" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.training.subtitle"
                defaultMessage="Créez et gérez les modules de formation"
              />
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSeedModules}
              disabled={seeding}
              className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
            >
              {seeding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">Initialiser modules</span>
            </button>
            <button
              onClick={fetchModules}
              className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualiser</span>
            </button>
            <button
              onClick={() => {
                setEditingModule(null);
                setShowModuleModal(true);
              }}
              className={`${UI.button.primary} px-3 py-2 flex items-center gap-2 text-sm`}
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Nouveau module</span>
            </button>
          </div>
        </div>

        {/* Module Type Selector */}
        <div className={`${UI.card} p-4`}>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex gap-2">
              <button
                onClick={() => setModuleType('chatter')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  moduleType === 'chatter'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chatters</span>
                <span className="text-xs opacity-75">({modules.length})</span>
              </button>
              <button
                onClick={() => setModuleType('influencer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  moduleType === 'influencer'
                    ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                    : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-white/20'
                }`}
              >
                <Megaphone className="w-4 h-4" />
                <span>Influenceurs</span>
              </button>
            </div>

            {/* Search and Filter */}
            <div className="flex-1 flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un module..."
                  className={`${UI.input} pl-10 text-sm`}
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ModuleStatus | 'all')}
                className={`${UI.select} text-sm`}
              >
                <option value="all">Tous les statuts</option>
                <option value="published">Publié</option>
                <option value="draft">Brouillon</option>
                <option value="archived">Archivé</option>
              </select>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Total modules</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {modules.length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Publiés</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {modules.filter(m => m.status === 'published').length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Brouillons</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {modules.filter(m => m.status === 'draft').length}
                </p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-3 sm:p-4`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">Étudiants</p>
                <p className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  {modules.reduce((acc, m) => acc + (m.studentsCount || 0), 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20`}>
            <p className="text-red-600 dark:text-red-400 text-sm sm:text-base">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          </div>
        ) : (
          /* Modules List */
          <div className="space-y-4">
            {filteredModules.length === 0 ? (
              <div className={`${UI.card} p-8 text-center`}>
                <GraduationCap className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  Aucun module trouvé
                </p>
                <button
                  onClick={() => {
                    setEditingModule(null);
                    setShowModuleModal(true);
                  }}
                  className={`${UI.button.primary} px-4 py-2 mt-4 inline-flex items-center gap-2`}
                >
                  <Plus className="w-4 h-4" />
                  Créer un module
                </button>
              </div>
            ) : (
              filteredModules.map((module, index) => (
                <div key={module.id} className={`${UI.card} overflow-hidden`}>
                  {/* Module Header */}
                  <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 text-gray-400">
                      <GripVertical className="w-5 h-5 hidden sm:block" />
                      <span className="text-sm font-medium">#{index + 1}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                          {module.title}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(module.status)}`}>
                          {module.status === 'published' ? 'Publié' : module.status === 'draft' ? 'Brouillon' : 'Archivé'}
                        </span>
                        {module.isRequired && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                            Requis
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                        {module.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {getCategoryLabel(module.category)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {module.estimatedMinutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" />
                          {module.slides?.length || 0} slides
                        </span>
                        <span className="flex items-center gap-1">
                          <HelpCircle className="w-3.5 h-3.5" />
                          {module.quizQuestions?.length || 0} questions
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {module.studentsCount || 0} étudiants
                        </span>
                        <span className="flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" />
                          {module.passingScore}% requis
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setExpandedModuleId(expandedModuleId === module.id ? null : module.id)}
                        className={`${UI.button.secondary} p-2`}
                        title="Voir détails"
                      >
                        {expandedModuleId === module.id ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleToggleStatus(module)}
                        className={`${UI.button.secondary} p-2`}
                        title={module.status === 'published' ? 'Dépublier' : 'Publier'}
                      >
                        {module.status === 'published' ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setEditingModule(module);
                          setShowModuleModal(true);
                        }}
                        className={`${UI.button.secondary} p-2`}
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteModule(module.id)}
                        className={`${UI.button.danger} p-2`}
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {expandedModuleId === module.id && (
                    <div className="border-t border-gray-200 dark:border-white/10 p-4 sm:p-5 bg-gray-50 dark:bg-white/5">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Slides */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Slides ({module.slides?.length || 0})
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {module.slides && module.slides.length > 0 ? (
                              module.slides.map((slide, idx) => (
                                <div key={slide.id} className="p-3 bg-white dark:bg-white/10 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-gray-400">{idx + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                                        {slide.title}
                                      </p>
                                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                                        {slide.content?.substring(0, 100)}...
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-400">Aucun slide</p>
                            )}
                          </div>
                        </div>

                        {/* Quiz Questions */}
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                            <HelpCircle className="w-4 h-4" />
                            Questions Quiz ({module.quizQuestions?.length || 0})
                          </h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {module.quizQuestions && module.quizQuestions.length > 0 ? (
                              module.quizQuestions.map((q, idx) => (
                                <div key={q.id} className="p-3 bg-white dark:bg-white/10 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <span className="text-xs font-medium text-gray-400">Q{idx + 1}.</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                                        {q.question}
                                      </p>
                                      <div className="mt-1 space-y-0.5">
                                        {q.options.map((opt, optIdx) => (
                                          <p
                                            key={optIdx}
                                            className={`text-xs ${
                                              optIdx === q.correctOptionIndex
                                                ? 'text-green-600 dark:text-green-400 font-medium'
                                                : 'text-gray-500 dark:text-gray-400'
                                            }`}
                                          >
                                            {optIdx === q.correctOptionIndex ? '✓' : '○'} {opt}
                                          </p>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-gray-400">Aucune question</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Module Edit Modal */}
      {showModuleModal && (
        <ModuleEditModal
          module={editingModule}
          moduleType={moduleType}
          onClose={() => {
            setShowModuleModal(false);
            setEditingModule(null);
          }}
          onSave={() => {
            setShowModuleModal(false);
            setEditingModule(null);
            fetchModules();
          }}
          functions={functions}
        />
      )}
    </AdminLayout>
  );
};

// Module Edit Modal Component
interface ModuleEditModalProps {
  module: TrainingModule | null;
  moduleType: ModuleType;
  onClose: () => void;
  onSave: () => void;
  functions: ReturnType<typeof getFunctions>;
}

const ModuleEditModal: React.FC<ModuleEditModalProps> = ({
  module,
  moduleType,
  onClose,
  onSave,
  functions,
}) => {
  const isEditing = !!module;
  const categories = moduleType === 'chatter' ? CHATTER_CATEGORIES : INFLUENCER_CATEGORIES;

  // Form state
  const [title, setTitle] = useState(module?.title || '');
  const [description, setDescription] = useState(module?.description || '');
  const [category, setCategory] = useState(module?.category || categories[0].value);
  const [estimatedMinutes, setEstimatedMinutes] = useState(module?.estimatedMinutes || 15);
  const [isRequired, setIsRequired] = useState(module?.isRequired || false);
  const [passingScore, setPassingScore] = useState(module?.passingScore || 80);
  const [status, setStatus] = useState<ModuleStatus>(module?.status || 'draft');
  const [coverImageUrl, setCoverImageUrl] = useState(module?.coverImageUrl || '');
  const [introVideoUrl, setIntroVideoUrl] = useState(module?.introVideoUrl || '');

  // Slides and quiz questions
  const [slides, setSlides] = useState<TrainingSlide[]>(module?.slides || []);
  const [quizQuestions, setQuizQuestions] = useState<TrainingQuizQuestion[]>(module?.quizQuestions || []);

  // Active tab
  const [activeTab, setActiveTab] = useState<'info' | 'slides' | 'quiz'>('info');

  const [saving, setSaving] = useState(false);

  // Add slide
  const addSlide = () => {
    const newSlide: TrainingSlide = {
      id: `slide-${Date.now()}`,
      order: slides.length + 1,
      title: '',
      content: '',
    };
    setSlides([...slides, newSlide]);
  };

  // Remove slide
  const removeSlide = (slideId: string) => {
    setSlides(slides.filter(s => s.id !== slideId));
  };

  // Update slide
  const updateSlide = (slideId: string, updates: Partial<TrainingSlide>) => {
    setSlides(slides.map(s => s.id === slideId ? { ...s, ...updates } : s));
  };

  // Add quiz question
  const addQuizQuestion = () => {
    const newQuestion: TrainingQuizQuestion = {
      id: `question-${Date.now()}`,
      order: quizQuestions.length + 1,
      question: '',
      options: ['', '', '', ''],
      correctOptionIndex: 0,
    };
    setQuizQuestions([...quizQuestions, newQuestion]);
  };

  // Remove quiz question
  const removeQuizQuestion = (questionId: string) => {
    setQuizQuestions(quizQuestions.filter(q => q.id !== questionId));
  };

  // Update quiz question
  const updateQuizQuestion = (questionId: string, updates: Partial<TrainingQuizQuestion>) => {
    setQuizQuestions(quizQuestions.map(q => q.id === questionId ? { ...q, ...updates } : q));
  };

  // Handle save
  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      alert('Titre et description sont requis');
      return;
    }

    setSaving(true);
    try {
      const functionName = isEditing
        ? (moduleType === 'chatter' ? 'adminUpdateTrainingModule' : 'adminUpdateInfluencerTrainingModule')
        : (moduleType === 'chatter' ? 'adminCreateTrainingModule' : 'adminCreateInfluencerTrainingModule');

      const saveModule = httpsCallable(functions, functionName);

      const data = {
        ...(isEditing && { moduleId: module.id }),
        title,
        description,
        category,
        estimatedMinutes,
        isRequired,
        passingScore,
        status,
        coverImageUrl: coverImageUrl || undefined,
        introVideoUrl: introVideoUrl || undefined,
        slides: slides.map((s, idx) => ({ ...s, order: idx + 1 })),
        quizQuestions: quizQuestions.map((q, idx) => ({ ...q, order: idx + 1 })),
        prerequisites: [],
      };

      await saveModule(data);
      onSave();
    } catch (err: unknown) {
      console.error('Error saving module:', err);
      alert('Erreur: ' + ((err as Error).message || 'Failed to save module'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative min-h-screen flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-white/10">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-red-500" />
              {isEditing ? 'Modifier le module' : 'Nouveau module'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-white/10 px-4 sm:px-6">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Informations
            </button>
            <button
              onClick={() => setActiveTab('slides')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'slides'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Slides ({slides.length})
            </button>
            <button
              onClick={() => setActiveTab('quiz')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'quiz'
                  ? 'border-red-500 text-red-600 dark:text-red-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              }`}
            >
              Quiz ({quizQuestions.length})
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'info' && (
              <div className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Titre *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Introduction au programme"
                    className={UI.input}
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description *
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Description détaillée du module..."
                    rows={3}
                    className={UI.textarea}
                  />
                </div>

                {/* Category & Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Catégorie
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className={`${UI.select} w-full`}
                    >
                      {categories.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Statut
                    </label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as ModuleStatus)}
                      className={`${UI.select} w-full`}
                    >
                      <option value="draft">Brouillon</option>
                      <option value="published">Publié</option>
                      <option value="archived">Archivé</option>
                    </select>
                  </div>
                </div>

                {/* Duration & Passing Score */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Durée estimée (min)
                    </label>
                    <input
                      type="number"
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(parseInt(e.target.value) || 15)}
                      min={1}
                      max={180}
                      className={UI.input}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Score requis (%)
                    </label>
                    <input
                      type="number"
                      value={passingScore}
                      onChange={(e) => setPassingScore(parseInt(e.target.value) || 80)}
                      min={50}
                      max={100}
                      className={UI.input}
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRequired}
                        onChange={(e) => setIsRequired(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-red-500 focus:ring-red-500"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Module requis
                      </span>
                    </label>
                  </div>
                </div>

                {/* Media URLs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL Image de couverture
                    </label>
                    <input
                      type="url"
                      value={coverImageUrl}
                      onChange={(e) => setCoverImageUrl(e.target.value)}
                      placeholder="https://..."
                      className={UI.input}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      URL Vidéo d'introduction
                    </label>
                    <input
                      type="url"
                      value={introVideoUrl}
                      onChange={(e) => setIntroVideoUrl(e.target.value)}
                      placeholder="https://youtube.com/..."
                      className={UI.input}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'slides' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ajoutez des slides pour votre module de formation
                  </p>
                  <button
                    onClick={addSlide}
                    className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter slide
                  </button>
                </div>

                {slides.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucun slide. Cliquez sur "Ajouter slide" pour commencer.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {slides.map((slide, idx) => (
                      <div key={slide.id} className="border border-gray-200 dark:border-white/10 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold">
                            {idx + 1}
                          </span>
                          <div className="flex-1 space-y-3">
                            <input
                              type="text"
                              value={slide.title}
                              onChange={(e) => updateSlide(slide.id, { title: e.target.value })}
                              placeholder="Titre du slide"
                              className={UI.input}
                            />
                            <textarea
                              value={slide.content}
                              onChange={(e) => updateSlide(slide.id, { content: e.target.value })}
                              placeholder="Contenu du slide (supporte le Markdown)..."
                              rows={4}
                              className={UI.textarea}
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <input
                                type="url"
                                value={slide.imageUrl || ''}
                                onChange={(e) => updateSlide(slide.id, { imageUrl: e.target.value })}
                                placeholder="URL image (optionnel)"
                                className={`${UI.input} text-sm`}
                              />
                              <input
                                type="url"
                                value={slide.videoUrl || ''}
                                onChange={(e) => updateSlide(slide.id, { videoUrl: e.target.value })}
                                placeholder="URL vidéo (optionnel)"
                                className={`${UI.input} text-sm`}
                              />
                            </div>
                          </div>
                          <button
                            onClick={() => removeSlide(slide.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'quiz' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Ajoutez des questions pour tester les connaissances
                  </p>
                  <button
                    onClick={addQuizQuestion}
                    className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter question
                  </button>
                </div>

                {quizQuestions.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Aucune question. Cliquez sur "Ajouter question" pour commencer.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {quizQuestions.map((question, idx) => (
                      <div key={question.id} className="border border-gray-200 dark:border-white/10 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-xs font-bold">
                            Q{idx + 1}
                          </span>
                          <div className="flex-1 space-y-3">
                            <input
                              type="text"
                              value={question.question}
                              onChange={(e) => updateQuizQuestion(question.id, { question: e.target.value })}
                              placeholder="Posez votre question..."
                              className={UI.input}
                            />
                            <div className="space-y-2">
                              {question.options.map((option, optIdx) => (
                                <div key={optIdx} className="flex items-center gap-2">
                                  <input
                                    type="radio"
                                    name={`correct-${question.id}`}
                                    checked={question.correctOptionIndex === optIdx}
                                    onChange={() => updateQuizQuestion(question.id, { correctOptionIndex: optIdx })}
                                    className="w-4 h-4 text-green-500 focus:ring-green-500"
                                  />
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => {
                                      const newOptions = [...question.options];
                                      newOptions[optIdx] = e.target.value;
                                      updateQuizQuestion(question.id, { options: newOptions });
                                    }}
                                    placeholder={`Option ${optIdx + 1}`}
                                    className={`${UI.input} flex-1 text-sm ${
                                      question.correctOptionIndex === optIdx
                                        ? 'border-green-500 dark:border-green-500'
                                        : ''
                                    }`}
                                  />
                                </div>
                              ))}
                              <p className="text-xs text-gray-400 mt-1">
                                Sélectionnez la bonne réponse avec le bouton radio
                              </p>
                            </div>
                            <input
                              type="text"
                              value={question.explanation || ''}
                              onChange={(e) => updateQuizQuestion(question.id, { explanation: e.target.value })}
                              placeholder="Explication (optionnel) - affichée après réponse"
                              className={`${UI.input} text-sm`}
                            />
                          </div>
                          <button
                            onClick={() => removeQuizQuestion(question.id)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-white/10">
            <button
              onClick={onClose}
              className={`${UI.button.secondary} px-4 py-2`}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {isEditing ? 'Enregistrer' : 'Créer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminTrainingModules;

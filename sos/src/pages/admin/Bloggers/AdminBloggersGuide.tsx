/**
 * AdminBloggersGuide - Admin page for managing blogger integration guide
 *
 * EXCLUSIVE to Bloggers - Manage:
 * - Article templates
 * - Copy-paste texts (with auto [LIEN] replacement)
 * - Best practices
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  BookOpen,
  Plus,
  Save,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw,
  Trash2,
  Edit2,
  FileText,
  Copy,
  Lightbulb,
  X,
  ChevronDown,
  ChevronRight,
  Link2,
  Info,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens - Purple theme for Bloggers
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white",
  select: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 dark:text-white",
} as const;

// Guide sections
const GUIDE_SECTIONS = {
  templates: {
    labelFr: 'Templates d\'articles',
    labelEn: 'Article Templates',
    description: 'Modèles d\'articles prêts à personnaliser',
    icon: FileText,
    color: 'blue',
  },
  copy_texts: {
    labelFr: 'Textes à copier',
    labelEn: 'Copy-paste Texts',
    description: 'Textes courts avec remplacement automatique du lien',
    icon: Copy,
    color: 'green',
  },
  best_practices: {
    labelFr: 'Bonnes pratiques',
    labelEn: 'Best Practices',
    description: 'Conseils et recommandations pour les blogueurs',
    icon: Lightbulb,
    color: 'yellow',
  },
};

interface GuideTemplate {
  id: string;
  titleFr: string;
  titleEn: string;
  descriptionFr?: string;
  descriptionEn?: string;
  contentFr: string;
  contentEn: string;
  category?: string;
  usageCount: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface GuideCopyText {
  id: string;
  nameFr: string;
  nameEn: string;
  textFr: string; // Contains [LIEN] placeholder
  textEn: string;
  context?: string;
  copyCount: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface GuideBestPractice {
  id: string;
  titleFr: string;
  titleEn: string;
  contentFr: string;
  contentEn: string;
  category?: string;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

type EditingItem = {
  section: 'templates' | 'copy_texts' | 'best_practices';
  isNew: boolean;
  data: Partial<GuideTemplate | GuideCopyText | GuideBestPractice>;
};

const AdminBloggersGuide: React.FC = () => {
  const intl = useIntl();
  const functions = getFunctions(undefined, 'europe-west2');

  const [templates, setTemplates] = useState<GuideTemplate[]>([]);
  const [copyTexts, setCopyTexts] = useState<GuideCopyText[]>([]);
  const [bestPractices, setBestPractices] = useState<GuideBestPractice[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['templates', 'copy_texts', 'best_practices']));
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  // Fetch guide content
  const fetchGuide = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetBloggerGuide = httpsCallable<void, {
        templates: GuideTemplate[];
        copyTexts: GuideCopyText[];
        bestPractices: GuideBestPractice[];
      }>(functions, 'adminGetBloggerGuide');

      const result = await adminGetBloggerGuide();
      setTemplates(result.data.templates || []);
      setCopyTexts(result.data.copyTexts || []);
      setBestPractices(result.data.bestPractices || []);
    } catch (err: any) {
      console.error('Error fetching guide:', err);
      setError(err.message || 'Failed to load guide');
    } finally {
      setLoading(false);
    }
  }, [functions]);

  useEffect(() => {
    fetchGuide();
  }, [fetchGuide]);

  // Toggle section expansion
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Start editing
  const startEditing = (
    item: GuideTemplate | GuideCopyText | GuideBestPractice | null,
    section: 'templates' | 'copy_texts' | 'best_practices'
  ) => {
    if (item) {
      setEditingItem({
        section,
        isNew: false,
        data: { ...item },
      });
    } else {
      const newItem: any = {
        isActive: true,
        order: 0,
      };

      if (section === 'templates') {
        newItem.titleFr = '';
        newItem.titleEn = '';
        newItem.contentFr = '';
        newItem.contentEn = '';
      } else if (section === 'copy_texts') {
        newItem.nameFr = '';
        newItem.nameEn = '';
        newItem.textFr = '';
        newItem.textEn = '';
      } else {
        newItem.titleFr = '';
        newItem.titleEn = '';
        newItem.contentFr = '';
        newItem.contentEn = '';
      }

      setEditingItem({
        section,
        isNew: true,
        data: newItem,
      });
    }
  };

  // Save item
  const saveItem = async () => {
    if (!editingItem) return;

    setSaving(true);
    setError(null);

    try {
      let functionName = '';
      switch (editingItem.section) {
        case 'templates':
          functionName = 'adminSaveBloggerGuideTemplate';
          break;
        case 'copy_texts':
          functionName = 'adminSaveBloggerGuideCopyText';
          break;
        case 'best_practices':
          functionName = 'adminSaveBloggerGuideBestPractice';
          break;
      }

      const saveFunction = httpsCallable(functions, functionName);
      await saveFunction({
        item: editingItem.data,
        isNew: editingItem.isNew,
      });

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setEditingItem(null);
      fetchGuide();
    } catch (err: any) {
      console.error('Error saving item:', err);
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // Delete item
  const deleteItem = async (
    item: GuideTemplate | GuideCopyText | GuideBestPractice,
    section: 'templates' | 'copy_texts' | 'best_practices'
  ) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) return;

    try {
      let functionName = '';
      switch (section) {
        case 'templates':
          functionName = 'adminDeleteBloggerGuideTemplate';
          break;
        case 'copy_texts':
          functionName = 'adminDeleteBloggerGuideCopyText';
          break;
        case 'best_practices':
          functionName = 'adminDeleteBloggerGuideBestPractice';
          break;
      }

      const deleteFunction = httpsCallable(functions, functionName);
      await deleteFunction({ itemId: item.id });
      fetchGuide();
    } catch (err: any) {
      console.error('Error deleting item:', err);
      setError(err.message || 'Failed to delete');
    }
  };

  // Get section color
  const getSectionColor = (section: string) => {
    const colors: Record<string, string> = {
      templates: 'blue',
      copy_texts: 'green',
      best_practices: 'yellow',
    };
    return colors[section] || 'gray';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
              <FormattedMessage id="admin.bloggers.guide.title" defaultMessage="Guide d'intégration Blogueurs" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.bloggers.guide.subtitle"
                defaultMessage="Gérer les templates, textes à copier et bonnes pratiques"
              />
            </p>
          </div>

          <button
            onClick={fetchGuide}
            className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
            </span>
          </button>
        </div>

        {/* Info Banner */}
        <div className={`${UI.card} p-4 bg-blue-50 dark:bg-blue-900/20`}>
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Placeholder [LIEN]</p>
              <p>Dans les textes à copier, utilisez le placeholder <code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">[LIEN]</code> qui sera automatiquement remplacé par le lien d'affiliation du blogueur lors de la copie.</p>
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20 flex items-center gap-3`}>
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className={`${UI.card} p-4 bg-green-50 dark:bg-green-900/20 flex items-center gap-3`}>
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-600 dark:text-green-400 text-sm">
              <FormattedMessage id="admin.guide.saved" defaultMessage="Élément enregistré avec succès" />
            </p>
          </div>
        )}

        {/* Sections */}
        <div className="space-y-4">
          {/* Templates Section */}
          <div className={`${UI.card} overflow-hidden`}>
            <button
              onClick={() => toggleSection('templates')}
              className="w-full p-4 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Templates d'articles</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Modèles d'articles prêts à personnaliser</p>
                </div>
                <span className="ml-2 px-2 py-0.5 bg-white dark:bg-white/10 rounded-full text-xs text-gray-600 dark:text-gray-400">
                  {templates.length}
                </span>
              </div>
              {expandedSections.has('templates') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('templates') && (
              <div className="p-4 space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{template.titleFr}</p>
                        {template.descriptionFr && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{template.descriptionFr}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-2">{template.usageCount} utilisations</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => startEditing(template, 'templates')}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => deleteItem(template, 'templates')}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {templates.length === 0 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                    Aucun template
                  </p>
                )}
                <button
                  onClick={() => startEditing(null, 'templates')}
                  className={`${UI.button.secondary} w-full px-4 py-2 flex items-center justify-center gap-2 text-sm`}
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un template
                </button>
              </div>
            )}
          </div>

          {/* Copy Texts Section */}
          <div className={`${UI.card} overflow-hidden`}>
            <button
              onClick={() => toggleSection('copy_texts')}
              className="w-full p-4 flex items-center justify-between bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Copy className="w-5 h-5 text-green-600 dark:text-green-400" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Textes à copier</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Textes courts avec remplacement automatique du lien</p>
                </div>
                <span className="ml-2 px-2 py-0.5 bg-white dark:bg-white/10 rounded-full text-xs text-gray-600 dark:text-gray-400">
                  {copyTexts.length}
                </span>
              </div>
              {expandedSections.has('copy_texts') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('copy_texts') && (
              <div className="p-4 space-y-3">
                {copyTexts.map((text) => (
                  <div
                    key={text.id}
                    className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{text.nameFr}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                          {text.textFr}
                        </p>
                        {text.textFr.includes('[LIEN]') && (
                          <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-2">
                            <Link2 className="w-3 h-3" />
                            Contient [LIEN]
                          </span>
                        )}
                        <p className="text-xs text-gray-400 mt-1">{text.copyCount} copies</p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => startEditing(text, 'copy_texts')}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => deleteItem(text, 'copy_texts')}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {copyTexts.length === 0 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                    Aucun texte à copier
                  </p>
                )}
                <button
                  onClick={() => startEditing(null, 'copy_texts')}
                  className={`${UI.button.secondary} w-full px-4 py-2 flex items-center justify-center gap-2 text-sm`}
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un texte
                </button>
              </div>
            )}
          </div>

          {/* Best Practices Section */}
          <div className={`${UI.card} overflow-hidden`}>
            <button
              onClick={() => toggleSection('best_practices')}
              className="w-full p-4 flex items-center justify-between bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                <div className="text-left">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Bonnes pratiques</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Conseils et recommandations pour les blogueurs</p>
                </div>
                <span className="ml-2 px-2 py-0.5 bg-white dark:bg-white/10 rounded-full text-xs text-gray-600 dark:text-gray-400">
                  {bestPractices.length}
                </span>
              </div>
              {expandedSections.has('best_practices') ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {expandedSections.has('best_practices') && (
              <div className="p-4 space-y-3">
                {bestPractices.map((practice) => (
                  <div
                    key={practice.id}
                    className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{practice.titleFr}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                          {practice.contentFr}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button
                          onClick={() => startEditing(practice, 'best_practices')}
                          className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => deleteItem(practice, 'best_practices')}
                          className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                {bestPractices.length === 0 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-4">
                    Aucune bonne pratique
                  </p>
                )}
                <button
                  onClick={() => startEditing(null, 'best_practices')}
                  className={`${UI.button.secondary} w-full px-4 py-2 flex items-center justify-center gap-2 text-sm`}
                >
                  <Plus className="w-4 h-4" />
                  Ajouter une bonne pratique
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${UI.card} w-full max-w-2xl p-6 my-8`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingItem.isNew ? 'Nouvel élément' : 'Modifier l\'élément'}
                {editingItem.section === 'templates' && ' (Template)'}
                {editingItem.section === 'copy_texts' && ' (Texte à copier)'}
                {editingItem.section === 'best_practices' && ' (Bonne pratique)'}
              </h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title/Name fields */}
              {(editingItem.section === 'templates' || editingItem.section === 'best_practices') && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Titre (FR)
                    </label>
                    <input
                      type="text"
                      value={(editingItem.data as any).titleFr || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, titleFr: e.target.value },
                      })}
                      className={UI.input}
                      placeholder="Titre en français"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Titre (EN)
                    </label>
                    <input
                      type="text"
                      value={(editingItem.data as any).titleEn || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, titleEn: e.target.value },
                      })}
                      className={UI.input}
                      placeholder="Title in English"
                    />
                  </div>
                </div>
              )}

              {editingItem.section === 'copy_texts' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nom (FR)
                    </label>
                    <input
                      type="text"
                      value={(editingItem.data as GuideCopyText).nameFr || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, nameFr: e.target.value },
                      })}
                      className={UI.input}
                      placeholder="Nom en français"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Nom (EN)
                    </label>
                    <input
                      type="text"
                      value={(editingItem.data as GuideCopyText).nameEn || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, nameEn: e.target.value },
                      })}
                      className={UI.input}
                      placeholder="Name in English"
                    />
                  </div>
                </div>
              )}

              {/* Description for templates */}
              {editingItem.section === 'templates' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description (FR)
                    </label>
                    <input
                      type="text"
                      value={(editingItem.data as GuideTemplate).descriptionFr || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, descriptionFr: e.target.value },
                      })}
                      className={UI.input}
                      placeholder="Description courte"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Description (EN)
                    </label>
                    <input
                      type="text"
                      value={(editingItem.data as GuideTemplate).descriptionEn || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, descriptionEn: e.target.value },
                      })}
                      className={UI.input}
                      placeholder="Short description"
                    />
                  </div>
                </div>
              )}

              {/* Content fields */}
              {(editingItem.section === 'templates' || editingItem.section === 'best_practices') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contenu (FR)
                    </label>
                    <textarea
                      value={(editingItem.data as any).contentFr || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, contentFr: e.target.value },
                      })}
                      className={`${UI.input} h-40 resize-none font-mono text-sm`}
                      placeholder="Contenu en français..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contenu (EN)
                    </label>
                    <textarea
                      value={(editingItem.data as any).contentEn || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, contentEn: e.target.value },
                      })}
                      className={`${UI.input} h-40 resize-none font-mono text-sm`}
                      placeholder="Content in English..."
                    />
                  </div>
                </>
              )}

              {/* Text fields for copy_texts */}
              {editingItem.section === 'copy_texts' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Texte (FR) - Utilisez [LIEN] pour le placeholder
                    </label>
                    <textarea
                      value={(editingItem.data as GuideCopyText).textFr || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, textFr: e.target.value },
                      })}
                      className={`${UI.input} h-32 resize-none`}
                      placeholder="Texte en français avec [LIEN]..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Texte (EN)
                    </label>
                    <textarea
                      value={(editingItem.data as GuideCopyText).textEn || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, textEn: e.target.value },
                      })}
                      className={`${UI.input} h-32 resize-none`}
                      placeholder="Text in English with [LIEN]..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contexte d'utilisation (optionnel)
                    </label>
                    <input
                      type="text"
                      value={(editingItem.data as GuideCopyText).context || ''}
                      onChange={(e) => setEditingItem({
                        ...editingItem,
                        data: { ...editingItem.data, context: e.target.value },
                      })}
                      className={UI.input}
                      placeholder="Ex: Pour les réseaux sociaux"
                    />
                  </div>
                </>
              )}

              {/* Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ordre d'affichage
                </label>
                <input
                  type="number"
                  value={(editingItem.data as any).order || 0}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    data: { ...editingItem.data, order: parseInt(e.target.value) || 0 },
                  })}
                  className={UI.input}
                  min="0"
                />
              </div>

              {/* Active toggle */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(editingItem.data as any).isActive !== false}
                  onChange={(e) => setEditingItem({
                    ...editingItem,
                    data: { ...editingItem.data, isActive: e.target.checked },
                  })}
                  className="w-5 h-5 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-gray-700 dark:text-gray-300 text-sm">
                  Élément actif (visible par les blogueurs)
                </span>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingItem(null)}
                className={`${UI.button.secondary} flex-1 px-4 py-2`}
              >
                <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
              </button>
              <button
                onClick={saveItem}
                disabled={saving}
                className={`${UI.button.primary} flex-1 px-4 py-2 flex items-center justify-center gap-2`}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminBloggersGuide;

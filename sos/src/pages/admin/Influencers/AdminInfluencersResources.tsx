/**
 * AdminInfluencersResources - Admin page for managing influencer resources
 *
 * Manage downloadable resources by category:
 * - SOS-Expat: Logos, images, description texts
 * - Ulixai: App resources
 * - Founder: Biography, quotes, photos
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  FolderOpen,
  Plus,
  Save,
  Loader2,
  AlertTriangle,
  Check,
  RefreshCw,
  Trash2,
  Edit2,
  Image,
  FileText,
  X,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white",
  select: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-gray-900 dark:text-white",
} as const;

const RESOURCE_CATEGORIES = {
  sos_expat: { labelFr: 'SOS-Expat', labelEn: 'SOS-Expat', description: 'Logos, images et textes de présentation', color: 'blue' },
  ulixai: { labelFr: 'Ulixai', labelEn: 'Ulixai', description: "Ressources pour l'application Ulixai", color: 'green' },
  founder: { labelFr: 'Fondateur', labelEn: 'Founder', description: 'Biographie, citations et photos du fondateur', color: 'purple' },
};

const RESOURCE_TYPES = [
  { value: 'logo', labelFr: 'Logo' },
  { value: 'image', labelFr: 'Image' },
  { value: 'text', labelFr: 'Texte' },
  { value: 'data', labelFr: 'Données' },
  { value: 'photo', labelFr: 'Photo' },
  { value: 'bio', labelFr: 'Biographie' },
  { value: 'quote', labelFr: 'Citation' },
];

interface ResourceFile {
  id: string;
  category: string;
  type: string;
  name: string;
  nameFr: string;
  nameEn: string;
  description?: string;
  fileUrl: string;
  thumbnailUrl?: string;
  format?: string;
  sizeBytes?: number;
  downloadCount: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface ResourceText {
  id: string;
  category: string;
  type: string;
  title: string;
  nameFr: string;
  nameEn: string;
  contentFr: string;
  contentEn: string;
  copyCount: number;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

type EditingResource = {
  type: 'file' | 'text';
  isNew: boolean;
  data: Partial<ResourceFile | ResourceText>;
};

const AdminInfluencersResources: React.FC = () => {
  const intl = useIntl();
  const functions = getFunctions(undefined, 'europe-west2');

  const [files, setFiles] = useState<ResourceFile[]>([]);
  const [texts, setTexts] = useState<ResourceText[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['sos_expat', 'ulixai', 'founder']));
  const [editingResource, setEditingResource] = useState<EditingResource | null>(null);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetInfluencerResources = httpsCallable<void, { files: ResourceFile[]; texts: ResourceText[] }>(
        functions,
        'adminGetInfluencerResources'
      );

      const result = await adminGetInfluencerResources();
      setFiles(result.data.files || []);
      setTexts(result.data.texts || []);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [functions]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const startEditing = (resource: ResourceFile | ResourceText | null, type: 'file' | 'text', category?: string) => {
    if (resource) {
      setEditingResource({ type, isNew: false, data: { ...resource } });
    } else {
      setEditingResource({
        type,
        isNew: true,
        data: {
          category: category || 'sos_expat',
          type: type === 'file' ? 'logo' : 'text',
          name: '',
          nameFr: '',
          nameEn: '',
          isActive: true,
          order: 0,
        },
      });
    }
  };

  const saveResource = async () => {
    if (!editingResource) return;

    setSaving(true);
    setError(null);

    try {
      if (editingResource.isNew) {
        if (editingResource.type === 'file') {
          const fn = httpsCallable(functions, 'adminCreateInfluencerResource');
          await fn(editingResource.data);
        } else {
          const fn = httpsCallable(functions, 'adminCreateInfluencerResourceText');
          await fn(editingResource.data);
        }
      } else {
        if (editingResource.type === 'file') {
          const fn = httpsCallable(functions, 'adminUpdateInfluencerResource');
          await fn({ resourceId: (editingResource.data as ResourceFile).id, ...editingResource.data });
        } else {
          const fn = httpsCallable(functions, 'adminUpdateInfluencerResourceText');
          await fn({ textId: (editingResource.data as ResourceText).id, ...editingResource.data });
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setEditingResource(null);
      fetchResources();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to save resource');
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (resource: ResourceFile | ResourceText, type: 'file' | 'text') => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette ressource ?')) return;

    try {
      if (type === 'file') {
        const fn = httpsCallable(functions, 'adminDeleteInfluencerResource');
        await fn({ resourceId: resource.id });
      } else {
        const fn = httpsCallable(functions, 'adminDeleteInfluencerResourceText');
        await fn({ textId: resource.id });
      }

      fetchResources();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Failed to delete resource');
    }
  };

  const getResourcesByCategory = (category: string) => {
    const categoryFiles = files.filter(f => f.category === category);
    const categoryTexts = texts.filter(t => t.category === category);
    return { files: categoryFiles, texts: categoryTexts };
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
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
              <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
              <FormattedMessage id="admin.influencers.resources.title" defaultMessage="Ressources Influenceurs" />
            </h1>
            <p className="mt-1 text-sm sm:text-base text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.influencers.resources.subtitle"
                defaultMessage="Gérer les fichiers et textes mis à disposition des influenceurs"
              />
            </p>
          </div>

          <div className="flex gap-2">
            <button onClick={() => startEditing(null, 'text')} className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2 text-sm`}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter texte</span>
            </button>
            <button onClick={() => startEditing(null, 'file')} className={`${UI.button.primary} px-3 py-2 flex items-center gap-2 text-sm`}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ajouter fichier</span>
            </button>
            <button onClick={fetchResources} className={`${UI.button.secondary} px-3 py-2`}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {error && (
          <div className={`${UI.card} p-4 bg-red-50 dark:bg-red-900/20 flex items-center gap-3`}>
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className={`${UI.card} p-4 bg-green-50 dark:bg-green-900/20 flex items-center gap-3`}>
            <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            <p className="text-green-600 dark:text-green-400 text-sm">Ressource enregistrée avec succès</p>
          </div>
        )}

        {/* Categories */}
        <div className="space-y-4">
          {Object.entries(RESOURCE_CATEGORIES).map(([key, cat]) => {
            const { files: categoryFiles, texts: categoryTexts } = getResourcesByCategory(key);
            const isExpanded = expandedCategories.has(key);

            return (
              <div key={key} className={`${UI.card} overflow-hidden`}>
                <button
                  onClick={() => toggleCategory(key)}
                  className="w-full p-4 flex items-center justify-between bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FolderOpen className="w-5 h-5 text-red-500" />
                    <div className="text-left">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{cat.labelFr}</h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{cat.description}</p>
                    </div>
                    <span className="ml-2 px-2 py-0.5 bg-white dark:bg-white/10 rounded-full text-xs text-gray-600 dark:text-gray-400">
                      {categoryFiles.length + categoryTexts.length} ressources
                    </span>
                  </div>
                  {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronRight className="w-5 h-5 text-gray-400" />}
                </button>

                {isExpanded && (
                  <div className="p-4 space-y-4">
                    {categoryFiles.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                          <Image className="w-4 h-4" />
                          Fichiers ({categoryFiles.length})
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {categoryFiles.map((file) => (
                            <div key={file.id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-between">
                              <div className="flex items-center gap-3 min-w-0">
                                {file.thumbnailUrl ? (
                                  <img src={file.thumbnailUrl} alt={file.nameFr || file.name} className="w-10 h-10 object-cover rounded-lg" />
                                ) : (
                                  <div className="w-10 h-10 bg-gray-200 dark:bg-white/10 rounded-lg flex items-center justify-center">
                                    <Image className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.nameFr || file.name}</p>
                                  <p className="text-xs text-gray-500 dark:text-gray-400">{file.downloadCount} téléchargements</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button onClick={() => startEditing(file, 'file')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg">
                                  <Edit2 className="w-4 h-4 text-gray-500" />
                                </button>
                                <button onClick={() => deleteResource(file, 'file')} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {categoryTexts.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Textes ({categoryTexts.length})
                        </h4>
                        <div className="space-y-2">
                          {categoryTexts.map((text) => (
                            <div key={text.id} className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-between">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{text.nameFr || text.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                  {(text as ResourceText).contentFr?.substring(0, 100)}...
                                </p>
                                <p className="text-xs text-gray-400 mt-1">{text.copyCount} copies</p>
                              </div>
                              <div className="flex items-center gap-1 ml-2">
                                <button onClick={() => startEditing(text, 'text')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded-lg">
                                  <Edit2 className="w-4 h-4 text-gray-500" />
                                </button>
                                <button onClick={() => deleteResource(text, 'text')} className="p-1.5 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg">
                                  <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {categoryFiles.length === 0 && categoryTexts.length === 0 && (
                      <div className="text-center py-6">
                        <FolderOpen className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune ressource dans cette catégorie</p>
                        <div className="flex justify-center gap-2 mt-3">
                          <button onClick={() => startEditing(null, 'file', key)} className={`${UI.button.secondary} px-3 py-1.5 text-xs`}>
                            <Plus className="w-3 h-3 mr-1" /> Fichier
                          </button>
                          <button onClick={() => startEditing(null, 'text', key)} className={`${UI.button.secondary} px-3 py-1.5 text-xs`}>
                            <Plus className="w-3 h-3 mr-1" /> Texte
                          </button>
                        </div>
                      </div>
                    )}

                    {(categoryFiles.length > 0 || categoryTexts.length > 0) && (
                      <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-white/10">
                        <button onClick={() => startEditing(null, 'file', key)} className={`${UI.button.secondary} px-3 py-1.5 text-xs flex items-center gap-1`}>
                          <Plus className="w-3 h-3" /> Ajouter fichier
                        </button>
                        <button onClick={() => startEditing(null, 'text', key)} className={`${UI.button.secondary} px-3 py-1.5 text-xs flex items-center gap-1`}>
                          <Plus className="w-3 h-3" /> Ajouter texte
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal */}
      {editingResource && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className={`${UI.card} w-full max-w-2xl p-6 my-8`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                {editingResource.isNew ? 'Nouvelle ressource' : 'Modifier la ressource'}
                {editingResource.type === 'file' ? ' (Fichier)' : ' (Texte)'}
              </h3>
              <button onClick={() => setEditingResource(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Catégorie</label>
                <select
                  value={(editingResource.data as Record<string, unknown>).category as string || 'sos_expat'}
                  onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, category: e.target.value } })}
                  className={UI.select}
                >
                  {Object.entries(RESOURCE_CATEGORIES).map(([key, cat]) => (
                    <option key={key} value={key}>{cat.labelFr}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Type</label>
                <select
                  value={(editingResource.data as Record<string, unknown>).type as string || 'logo'}
                  onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, type: e.target.value } })}
                  className={UI.select}
                >
                  {RESOURCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>{type.labelFr}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom (FR)</label>
                  <input
                    type="text"
                    value={(editingResource.data as Record<string, unknown>).nameFr as string || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, nameFr: e.target.value, name: e.target.value } })}
                    className={UI.input}
                    placeholder="Nom en français"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nom (EN)</label>
                  <input
                    type="text"
                    value={(editingResource.data as Record<string, unknown>).nameEn as string || ''}
                    onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, nameEn: e.target.value } })}
                    className={UI.input}
                    placeholder="Name in English"
                  />
                </div>
              </div>

              {editingResource.type === 'file' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL du fichier</label>
                    <input
                      type="url"
                      value={(editingResource.data as ResourceFile).fileUrl || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, fileUrl: e.target.value } })}
                      className={UI.input}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">URL de la miniature (optionnel)</label>
                    <input
                      type="url"
                      value={(editingResource.data as ResourceFile).thumbnailUrl || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, thumbnailUrl: e.target.value } })}
                      className={UI.input}
                      placeholder="https://..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description (optionnel)</label>
                    <textarea
                      value={(editingResource.data as ResourceFile).description || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, description: e.target.value } })}
                      className={`${UI.input} h-20 resize-none`}
                      placeholder="Description du fichier..."
                    />
                  </div>
                </>
              )}

              {editingResource.type === 'text' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contenu (FR)</label>
                    <textarea
                      value={(editingResource.data as ResourceText).contentFr || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, contentFr: e.target.value } })}
                      className={`${UI.input} h-32 resize-none`}
                      placeholder="Texte en français..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contenu (EN)</label>
                    <textarea
                      value={(editingResource.data as ResourceText).contentEn || ''}
                      onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, contentEn: e.target.value } })}
                      className={`${UI.input} h-32 resize-none`}
                      placeholder="Text in English..."
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ordre d'affichage</label>
                <input
                  type="number"
                  value={(editingResource.data as Record<string, unknown>).order as number || 0}
                  onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, order: parseInt(e.target.value) || 0 } })}
                  className={UI.input}
                  min="0"
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(editingResource.data as Record<string, unknown>).isActive !== false}
                  onChange={(e) => setEditingResource({ ...editingResource, data: { ...editingResource.data, isActive: e.target.checked } })}
                  className="w-5 h-5 rounded border-gray-300 text-red-500 focus:ring-red-500"
                />
                <span className="text-gray-700 dark:text-gray-300 text-sm">Ressource active (visible par les influenceurs)</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditingResource(null)} className={`${UI.button.secondary} flex-1 px-4 py-2`}>
                <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
              </button>
              <button onClick={saveResource} disabled={saving} className={`${UI.button.primary} flex-1 px-4 py-2 flex items-center justify-center gap-2`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminInfluencersResources;

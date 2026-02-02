/**
 * AdminGroupAdminsResources - Admin page for managing GroupAdmin resources
 * (banners, images, pinned posts templates, welcome messages)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Image,
  FileText,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Facebook,
  CheckCircle,
  X,
  Upload,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
} as const;

const RESOURCE_CATEGORIES = [
  { code: 'pinned_posts', name: 'Pinned Posts', icon: FileText },
  { code: 'cover_banners', name: 'Cover Banners', icon: Image },
  { code: 'post_images', name: 'Post Images', icon: Image },
  { code: 'story_images', name: 'Story Images', icon: Image },
  { code: 'badges', name: 'Partner Badges', icon: Image },
  { code: 'welcome_messages', name: 'Welcome Messages', icon: FileText },
];

const RESOURCE_TYPES = [
  { code: 'image', name: 'Image' },
  { code: 'text', name: 'Text' },
  { code: 'template', name: 'Template' },
];

const LANGUAGES = ['en', 'fr', 'es', 'pt', 'de', 'ar', 'it', 'nl', 'zh'];

interface Resource {
  id: string;
  category: string;
  type: string;
  name: string;
  nameTranslations?: Record<string, string>;
  description?: string;
  descriptionTranslations?: Record<string, string>;
  fileUrl?: string;
  thumbnailUrl?: string;
  content?: string;
  contentTranslations?: Record<string, string>;
  placeholders?: string[];
  isActive: boolean;
  order: number;
  downloadCount: number;
  copyCount: number;
  createdAt: string;
}

const AdminGroupAdminsResources: React.FC = () => {
  const functions = getFunctions(undefined, 'europe-west1');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resources, setResources] = useState<Resource[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    category: 'pinned_posts',
    type: 'text',
    name: '',
    nameTranslations: {} as Record<string, string>,
    description: '',
    descriptionTranslations: {} as Record<string, string>,
    fileUrl: '',
    content: '',
    contentTranslations: {} as Record<string, string>,
    placeholders: '',
    isActive: true,
    order: 0,
  });

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const getResources = httpsCallable(functions, 'adminGetGroupAdminResourcesList');
      const result = await getResources({
        category: categoryFilter !== 'all' ? categoryFilter : undefined,
      });
      setResources((result.data as { resources: Resource[] }).resources);
    } catch (err) {
      console.error('Error fetching resources:', err);
      setError('Failed to load resources');
    } finally {
      setLoading(false);
    }
  }, [functions, categoryFilter]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const resetForm = () => {
    setFormData({
      category: 'pinned_posts',
      type: 'text',
      name: '',
      nameTranslations: {},
      description: '',
      descriptionTranslations: {},
      fileUrl: '',
      content: '',
      contentTranslations: {},
      placeholders: '',
      isActive: true,
      order: 0,
    });
    setEditingResource(null);
    setIsCreating(false);
  };

  const handleEdit = (resource: Resource) => {
    setFormData({
      category: resource.category,
      type: resource.type,
      name: resource.name,
      nameTranslations: resource.nameTranslations || {},
      description: resource.description || '',
      descriptionTranslations: resource.descriptionTranslations || {},
      fileUrl: resource.fileUrl || '',
      content: resource.content || '',
      contentTranslations: resource.contentTranslations || {},
      placeholders: (resource.placeholders || []).join(', '),
      isActive: resource.isActive,
      order: resource.order,
    });
    setEditingResource(resource);
    setIsCreating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        ...formData,
        placeholders: formData.placeholders.split(',').map(p => p.trim()).filter(Boolean),
      };

      if (editingResource) {
        const updateResource = httpsCallable(functions, 'adminUpdateGroupAdminResource');
        await updateResource({ resourceId: editingResource.id, ...data });
      } else {
        const createResource = httpsCallable(functions, 'adminCreateGroupAdminResource');
        await createResource(data);
      }

      resetForm();
      fetchResources();
    } catch (err) {
      console.error('Error saving resource:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (resource: Resource) => {
    if (!window.confirm(`Delete resource "${resource.name}"?`)) return;

    try {
      const deleteResource = httpsCallable(functions, 'adminDeleteGroupAdminResource');
      await deleteResource({ resourceId: resource.id });
      fetchResources();
    } catch (err) {
      console.error('Error deleting resource:', err);
    }
  };

  const getCategoryIcon = (category: string) => {
    const cat = RESOURCE_CATEGORIES.find(c => c.code === category);
    return cat?.icon || FileText;
  };

  return (
    <AdminLayout>
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Facebook className="w-6 h-6 text-blue-500" />
              <FormattedMessage id="groupAdmin.admin.resources" defaultMessage="GroupAdmin Resources" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage banners, images, and text resources
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={fetchResources} className={`${UI.button.secondary} p-2`}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => {
                resetForm();
                setIsCreating(true);
              }}
              className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              Add Resource
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className={UI.card + " p-4"}>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className={UI.select}
          >
            <option value="all">All Categories</option>
            {RESOURCE_CATEGORIES.map(cat => (
              <option key={cat.code} value={cat.code}>{cat.name}</option>
            ))}
          </select>
        </div>

        {/* Create/Edit Form */}
        {(isCreating || editingResource) && (
          <div className={UI.card + " p-6"}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingResource ? 'Edit Resource' : 'Create Resource'}
              </h2>
              <button onClick={resetForm} className={`${UI.button.secondary} p-2`}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={UI.label}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className={UI.input}
                >
                  {RESOURCE_CATEGORIES.map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={UI.label}>Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className={UI.input}
                >
                  {RESOURCE_TYPES.map(type => (
                    <option key={type.code} value={type.code}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={UI.label}>Name (Default)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={UI.input}
                />
              </div>
              <div>
                <label className={UI.label}>Order</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className={UI.input}
                />
              </div>
              <div className="md:col-span-2">
                <label className={UI.label}>Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={UI.input + " h-20"}
                />
              </div>
              {formData.type === 'image' && (
                <div className="md:col-span-2">
                  <label className={UI.label}>File URL</label>
                  <input
                    type="url"
                    value={formData.fileUrl}
                    onChange={(e) => setFormData({ ...formData, fileUrl: e.target.value })}
                    className={UI.input}
                    placeholder="https://..."
                  />
                </div>
              )}
              {(formData.type === 'text' || formData.type === 'template') && (
                <div className="md:col-span-2">
                  <label className={UI.label}>Content (Default Language)</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className={UI.input + " h-32 font-mono text-sm"}
                  />
                </div>
              )}
              {formData.type === 'template' && (
                <div className="md:col-span-2">
                  <label className={UI.label}>Placeholders (comma-separated)</label>
                  <input
                    type="text"
                    value={formData.placeholders}
                    onChange={(e) => setFormData({ ...formData, placeholders: e.target.value })}
                    className={UI.input}
                    placeholder="{{AFFILIATE_LINK}}, {{GROUP_NAME}}"
                  />
                </div>
              )}
              <div className="md:col-span-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Active</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={resetForm} className={`${UI.button.secondary} px-4 py-2`}>
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.name}
                className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                {editingResource ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        )}

        {/* Resources List */}
        <div className={UI.card + " overflow-hidden"}>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-12 text-red-500">
              <AlertTriangle className="w-6 h-6 mr-2" />
              {error}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-white/10">
              {resources.map(resource => {
                const Icon = getCategoryIcon(resource.category);
                return (
                  <div
                    key={resource.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-white/5"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {resource.name}
                          {!resource.isActive && (
                            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                              Inactive
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {RESOURCE_CATEGORIES.find(c => c.code === resource.category)?.name} • {resource.type}
                        </p>
                        <p className="text-xs text-gray-400">
                          {resource.downloadCount} downloads • {resource.copyCount} copies
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(resource)}
                        className={`${UI.button.secondary} p-2`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(resource)}
                        className={`${UI.button.danger} p-2`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {resources.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                  <Image className="w-12 h-12 mb-4 opacity-50" />
                  <p>No resources found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminsResources;

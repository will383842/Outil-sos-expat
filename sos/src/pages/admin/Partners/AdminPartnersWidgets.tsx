/**
 * AdminPartnersWidgets - Premium 2026 CRUD for partner promotional widgets
 *
 * Features:
 * - List widgets with type/dimension/stats
 * - Create/edit form with HTML template and preview
 * - UTM tracking configuration
 * - Delete (soft) and reorder
 * - Active/inactive toggle
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  LayoutGrid,
  Plus,
  Loader2,
  Trash2,
  Edit3,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
  Save,
  X,
  Code,
  Image,
  AlertTriangle,
  RefreshCw,
  MousePointerClick,
  BarChart3,
  Target,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    ghost: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 dark:text-white transition-all",
  select: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 dark:text-white",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface Widget {
  id: string;
  name: string;
  description?: string;
  type: 'button' | 'banner';
  dimension: string;
  htmlTemplate: string;
  imageUrl?: string;
  buttonText?: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  isActive: boolean;
  order: number;
  views: number;
  clicks: number;
  conversions: number;
}

const DIMENSIONS = ['300x250', '728x90', '160x600', '320x50', '468x60', '970x250', 'custom'] as const;

const EMPTY_WIDGET: Omit<Widget, 'id' | 'views' | 'clicks' | 'conversions'> = {
  name: '',
  description: '',
  type: 'banner',
  dimension: '300x250',
  htmlTemplate: '',
  imageUrl: '',
  buttonText: '',
  utmSource: 'partner',
  utmMedium: 'banner',
  utmCampaign: '',
  isActive: true,
  order: 0,
};

// ============================================================================
// COMPONENT
// ============================================================================

const AdminPartnersWidgets: React.FC = () => {
  const intl = useIntl();
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingWidget, setEditingWidget] = useState<Partial<Widget> | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchWidgets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<any, { widgets: Widget[] }>(functionsAffiliate, 'adminManagePartnerWidgets');
      const res = await fn({ action: 'list' });
      setWidgets((res.data.widgets || []).sort((a, b) => a.order - b.order));
    } catch (err: any) {
      console.error('Error fetching widgets:', err);
      setError(err.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchWidgets(); }, [fetchWidgets]);

  const handleSave = async () => {
    if (!editingWidget?.name || !editingWidget?.htmlTemplate) {
      toast.error(intl.formatMessage({ id: 'admin.partners.widgets.missingFields', defaultMessage: 'Nom et template HTML requis' }));
      return;
    }
    setSaving(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminManagePartnerWidgets');
      if (isCreating) {
        await fn({ action: 'create', data: editingWidget });
      } else {
        await fn({ action: 'update', widgetId: editingWidget.id, data: editingWidget });
      }
      toast.success(
        isCreating
          ? intl.formatMessage({ id: 'admin.partners.widgets.created', defaultMessage: 'Widget cree' })
          : intl.formatMessage({ id: 'admin.partners.widgets.updated', defaultMessage: 'Widget mis a jour' })
      );
      setEditingWidget(null);
      setIsCreating(false);
      fetchWidgets();
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (widgetId: string) => {
    setActionLoading(widgetId);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminManagePartnerWidgets');
      await fn({ action: 'delete', widgetId });
      toast.success(intl.formatMessage({ id: 'admin.partners.widgets.deleted', defaultMessage: 'Widget supprime' }));
      setDeleteConfirm(null);
      fetchWidgets();
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReorder = async (widgetId: string, direction: 'up' | 'down') => {
    const idx = widgets.findIndex(w => w.id === widgetId);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= widgets.length) return;

    const newWidgets = [...widgets];
    [newWidgets[idx], newWidgets[newIdx]] = [newWidgets[newIdx], newWidgets[idx]];
    const reordered = newWidgets.map((w, i) => ({ ...w, order: i }));
    setWidgets(reordered);

    try {
      const fn = httpsCallable(functionsAffiliate, 'adminManagePartnerWidgets');
      await fn({ action: 'reorder', reorderList: reordered.map(w => ({ id: w.id, order: w.order })) });
    } catch {
      toast.error('Reorder failed');
      fetchWidgets();
    }
  };

  const startCreate = () => {
    setEditingWidget({ ...EMPTY_WIDGET, order: widgets.length });
    setIsCreating(true);
  };

  const startEdit = (widget: Widget) => {
    setEditingWidget({ ...widget });
    setIsCreating(false);
  };

  const handleField = (key: string, value: string | boolean) => {
    setEditingWidget(prev => prev ? { ...prev, [key]: value } : null);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button onClick={fetchWidgets} className={`${UI.button.secondary} inline-flex items-center gap-2`}>
            <RefreshCw className="w-4 h-4" /> <FormattedMessage id="common.retry" defaultMessage="Reessayer" />
          </button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-teal-500" />
              </div>
              <FormattedMessage id="admin.partners.widgets.title" defaultMessage="Widgets Partenaires" />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 ml-[52px]">
              <FormattedMessage id="admin.partners.widgets.subtitle" defaultMessage="Gerer les materiels promotionnels pour les partenaires" />
            </p>
          </div>
          <button onClick={startCreate} className={`${UI.button.primary} flex items-center gap-2`}>
            <Plus className="w-4 h-4" />
            <FormattedMessage id="admin.partners.widgets.create" defaultMessage="Creer un widget" />
          </button>
        </div>

        {/* Edit/Create Form */}
        {editingWidget && (
          <div className={UI.card + ' p-6'}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isCreating
                  ? <FormattedMessage id="admin.partners.widgets.createTitle" defaultMessage="Nouveau widget" />
                  : <FormattedMessage id="admin.partners.widgets.editTitle" defaultMessage="Modifier le widget" />}
              </h2>
              <button onClick={() => { setEditingWidget(null); setIsCreating(false); }} className={`${UI.button.ghost} p-2`}>
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.widgets.name" defaultMessage="Nom" /> *</label>
                <input type="text" value={editingWidget.name || ''} onChange={(e) => handleField('name', e.target.value)} className={UI.input} />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.widgets.type" defaultMessage="Type" /></label>
                <select value={editingWidget.type || 'banner'} onChange={(e) => handleField('type', e.target.value)} className={UI.select}>
                  <option value="button">{intl.formatMessage({ id: 'admin.partners.widgets.typeButton', defaultMessage: 'Bouton' })}</option>
                  <option value="banner">{intl.formatMessage({ id: 'admin.partners.widgets.typeBanner', defaultMessage: 'Banniere' })}</option>
                </select>
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.widgets.dimension" defaultMessage="Dimension" /></label>
                <select value={editingWidget.dimension || '300x250'} onChange={(e) => handleField('dimension', e.target.value)} className={UI.select}>
                  {DIMENSIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.widgets.imageUrl" defaultMessage="URL Image" /></label>
                <input type="url" value={editingWidget.imageUrl || ''} onChange={(e) => handleField('imageUrl', e.target.value)} className={UI.input} placeholder="https://..." />
              </div>
            </div>

            <div className="mb-5">
              <label className={UI.label}><FormattedMessage id="admin.partners.widgets.description" defaultMessage="Description" /></label>
              <input type="text" value={editingWidget.description || ''} onChange={(e) => handleField('description', e.target.value)} className={UI.input} />
            </div>

            <div className="mb-5">
              <label className={UI.label}><FormattedMessage id="admin.partners.widgets.htmlTemplate" defaultMessage="Template HTML" /> *</label>
              <textarea
                value={editingWidget.htmlTemplate || ''}
                onChange={(e) => handleField('htmlTemplate', e.target.value)}
                rows={6}
                className={UI.input + ' font-mono text-sm'}
                placeholder="<a href='{{affiliateLink}}'><img src='...' /></a>"
              />
            </div>

            {/* UTM Parameters */}
            <div className="mb-6">
              <p className={UI.label + ' flex items-center gap-1.5'}>
                <Target className="w-4 h-4 text-teal-500" />
                UTM Parameters
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">utm_source</label>
                  <input type="text" value={editingWidget.utmSource || ''} onChange={(e) => handleField('utmSource', e.target.value)} className={UI.input} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">utm_medium</label>
                  <input type="text" value={editingWidget.utmMedium || ''} onChange={(e) => handleField('utmMedium', e.target.value)} className={UI.input} />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">utm_campaign</label>
                  <input type="text" value={editingWidget.utmCampaign || ''} onChange={(e) => handleField('utmCampaign', e.target.value)} className={UI.input} />
                </div>
              </div>
            </div>

            {/* Preview */}
            {editingWidget.htmlTemplate && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1.5">
                  <Eye className="w-4 h-4 text-teal-500" />
                  <FormattedMessage id="admin.partners.widgets.preview" defaultMessage="Apercu" />
                </h3>
                <div className="bg-gray-100 dark:bg-white/5 rounded-xl p-4 border border-gray-200 dark:border-white/10 overflow-auto">
                  <div dangerouslySetInnerHTML={{ __html: editingWidget.htmlTemplate
                    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                    .replace(/on\w+\s*=/gi, 'data-blocked=') }} />
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end border-t border-gray-100 dark:border-white/5 pt-4">
              <button onClick={() => { setEditingWidget(null); setIsCreating(false); }} className={`${UI.button.secondary} text-sm`}>
                <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
              </button>
              <button onClick={handleSave} disabled={saving} className={`${UI.button.primary} flex items-center gap-2 text-sm`}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <FormattedMessage id="admin.partners.widgets.save" defaultMessage="Enregistrer" />
              </button>
            </div>
          </div>
        )}

        {/* Widget List */}
        {widgets.length === 0 && !editingWidget ? (
          <div className={UI.card + ' p-16 text-center'}>
            <LayoutGrid className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              <FormattedMessage id="admin.partners.widgets.empty" defaultMessage="Aucun widget" />
            </p>
            <button onClick={startCreate} className={`${UI.button.primary} inline-flex items-center gap-2`}>
              <Plus className="w-4 h-4" /> <FormattedMessage id="admin.partners.widgets.createFirst" defaultMessage="Creer le premier widget" />
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {widgets.map((widget, index) => (
              <div key={widget.id} className={`${UI.card} p-4 group hover:border-teal-200 dark:hover:border-teal-800/30 transition-colors`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Reorder */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => handleReorder(widget.id, 'up')} disabled={index === 0} className="p-1 text-gray-400 hover:text-teal-500 disabled:opacity-30 rounded transition-colors">
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleReorder(widget.id, 'down')} disabled={index === widgets.length - 1} className="p-1 text-gray-400 hover:text-teal-500 disabled:opacity-30 rounded transition-colors">
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Info */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      widget.type === 'button' ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-purple-100 dark:bg-purple-900/30'
                    }`}>
                      {widget.type === 'button' ? <Code className="w-5 h-5 text-blue-600 dark:text-blue-400" /> : <Image className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">{widget.name}</h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex-wrap">
                        <span className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{widget.type}</span>
                        <span className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">{widget.dimension}</span>
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {widget.views}</span>
                        <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {widget.clicks}</span>
                        <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {widget.conversions}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      widget.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400'
                    }`}>
                      {widget.isActive
                        ? intl.formatMessage({ id: 'admin.partners.widgets.active', defaultMessage: 'Actif' })
                        : intl.formatMessage({ id: 'admin.partners.widgets.inactive', defaultMessage: 'Inactif' })}
                    </span>
                    <button onClick={() => startEdit(widget)} className="p-2 text-gray-400 hover:text-teal-500 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {deleteConfirm === widget.id ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleDelete(widget.id)} disabled={actionLoading === widget.id} className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                          {actionLoading === widget.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                        <button onClick={() => setDeleteConfirm(null)} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(widget.id)} className="p-2 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPartnersWidgets;

/**
 * AdminBloggersWidgets - Admin page for managing blogger promo widgets
 *
 * Features:
 * - CRUD operations for widgets (buttons & banners)
 * - Multiple templates per dimension
 * - Preview functionality with live rendering
 * - Tracking configuration (UTM parameters)
 * - Multi-language support
 * - Stats: views, clicks, conversions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Plus,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  Eye,
  EyeOff,
  Code,
  Image,
  MousePointer,
  BarChart3,
  ArrowUp,
  ArrowDown,
  X,
  Save,
  Loader2,
  Target,
  RefreshCw,
  Search,
} from 'lucide-react';
import type {
  PromoWidget,
  PromoWidgetType,
  PromoWidgetTargetType,
  PromoWidgetDimension,
  PromoWidgetButtonStyle,
} from '@/types/blogger';
import {
  PROMO_WIDGET_DIMENSIONS,
  PROMO_WIDGET_BUTTON_PRESETS,
} from '@/types/blogger';

// ============================================================================
// UI STYLES
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
    ghost: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white",
  select: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-gray-900 dark:text-white",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2",
  badge: {
    success: "px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full",
    warning: "px-2 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full",
    info: "px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full",
    purple: "px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full",
  },
} as const;

// ============================================================================
// TYPES
// ============================================================================

interface WidgetFormData {
  name: string;
  description: string;
  type: PromoWidgetType;
  targetType: PromoWidgetTargetType;
  dimension: PromoWidgetDimension;
  customWidth: number;
  customHeight: number;
  buttonText: string;
  imageUrl: string;
  altText: string;
  style: PromoWidgetButtonStyle;
  htmlTemplate: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  isActive: boolean;
}

const defaultFormData: WidgetFormData = {
  name: '',
  description: '',
  type: 'button',
  targetType: 'client',
  dimension: 'custom',
  customWidth: 200,
  customHeight: 50,
  buttonText: 'Consultez un expert SOS-Expat',
  imageUrl: '',
  altText: 'SOS-Expat',
  style: PROMO_WIDGET_BUTTON_PRESETS[0].style,
  htmlTemplate: '',
  utmSource: 'blogger',
  utmMedium: 'widget',
  utmCampaign: 'promo',
  isActive: true,
};

// ============================================================================
// COMPONENT
// ============================================================================

const AdminBloggersWidgets: React.FC = () => {
  const intl = useIntl();
  const { user } = useAuth();

  // State
  const [widgets, setWidgets] = useState<PromoWidget[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<PromoWidget | null>(null);
  const [formData, setFormData] = useState<WidgetFormData>(defaultFormData);

  // Filters
  const [filterType, setFilterType] = useState<PromoWidgetType | 'all'>('all');
  const [filterTarget, setFilterTarget] = useState<PromoWidgetTargetType | 'all'>('all');
  const [filterDimension, setFilterDimension] = useState<PromoWidgetDimension | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Copy state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchWidgets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const widgetsRef = collection(db, 'blogger_promo_widgets');
      const q = query(widgetsRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);

      const widgetsList: PromoWidget[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        widgetsList.push({
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as PromoWidget);
      });

      setWidgets(widgetsList);
    } catch (err) {
      console.error('Error fetching widgets:', err);
      setError('Erreur lors du chargement des widgets');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  // ============================================================================
  // GENERATE HTML TEMPLATE
  // ============================================================================

  const generateHtmlTemplate = (data: WidgetFormData): string => {
    if (data.type === 'button') {
      const style = data.style;
      const cssStyle = `
display:inline-block;
padding:${style.padding};
background:${style.backgroundGradient || style.backgroundColor};
color:${style.textColor};
text-decoration:none;
border-radius:${style.borderRadius};
font-family:system-ui,-apple-system,sans-serif;
font-size:${style.fontSize};
font-weight:${style.fontWeight};
${style.shadow ? `box-shadow:${style.shadow};` : ''}
transition:all 0.2s ease;
      `.replace(/\n/g, '').replace(/\s+/g, ' ').trim();

      return `<a href="{{affiliateUrl}}?utm_source={{utmSource}}&utm_medium={{utmMedium}}&utm_campaign={{utmCampaign}}&utm_content={{widgetId}}&ref={{affiliateCode}}" target="_blank" rel="noopener noreferrer" style="${cssStyle}">${data.buttonText}</a>`;
    } else {
      // Banner
      const dim = PROMO_WIDGET_DIMENSIONS.find(d => d.value === data.dimension);
      const width = data.dimension === 'custom' ? data.customWidth : dim?.width || 300;
      const height = data.dimension === 'custom' ? data.customHeight : dim?.height || 250;

      return `<a href="{{affiliateUrl}}?utm_source={{utmSource}}&utm_medium={{utmMedium}}&utm_campaign={{utmCampaign}}&utm_content={{widgetId}}&ref={{affiliateCode}}" target="_blank" rel="noopener noreferrer">
  <img src="${data.imageUrl}" alt="${data.altText}" width="${width}" height="${height}" style="max-width:100%;height:auto;border-radius:8px;display:block;" />
</a>`;
    }
  };

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  const handleSaveWidget = async () => {
    if (!formData.name.trim()) {
      setError('Le nom du widget est requis');
      return;
    }

    if (formData.type === 'banner' && !formData.imageUrl.trim()) {
      setError("L'URL de l'image est requise pour les bannières");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const htmlTemplate = generateHtmlTemplate(formData);
      const now = new Date().toISOString();
      const trackingId = `widget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const widgetData: Omit<PromoWidget, 'id'> = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        targetType: formData.targetType,
        dimension: formData.dimension,
        customWidth: formData.dimension === 'custom' ? formData.customWidth : undefined,
        customHeight: formData.dimension === 'custom' ? formData.customHeight : undefined,
        buttonText: formData.type === 'button' ? formData.buttonText : undefined,
        imageUrl: formData.type === 'banner' ? formData.imageUrl : undefined,
        altText: formData.type === 'banner' ? formData.altText : undefined,
        style: formData.type === 'button' ? formData.style : undefined,
        htmlTemplate,
        trackingId: editingWidget?.trackingId || trackingId,
        utmSource: formData.utmSource,
        utmMedium: formData.utmMedium,
        utmCampaign: formData.utmCampaign,
        isActive: formData.isActive,
        order: editingWidget?.order ?? widgets.length,
        views: editingWidget?.views ?? 0,
        clicks: editingWidget?.clicks ?? 0,
        conversions: editingWidget?.conversions ?? 0,
        createdAt: editingWidget?.createdAt ?? now,
        updatedAt: now,
        createdBy: editingWidget?.createdBy ?? user?.uid ?? 'admin',
      };

      if (editingWidget) {
        // Update existing
        await updateDoc(doc(db, 'blogger_promo_widgets', editingWidget.id), {
          ...widgetData,
          updatedAt: serverTimestamp(),
        });
        setSuccess('Widget mis à jour avec succès');
      } else {
        // Create new
        const newId = `widget_${Date.now()}`;
        await setDoc(doc(db, 'blogger_promo_widgets', newId), {
          ...widgetData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setSuccess('Widget créé avec succès');
      }

      setIsModalOpen(false);
      setEditingWidget(null);
      setFormData(defaultFormData);
      await fetchWidgets();
    } catch (err) {
      console.error('Error saving widget:', err);
      setError('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWidget = async (widget: PromoWidget) => {
    if (!confirm(`Supprimer le widget "${widget.name}" ?`)) return;

    try {
      await deleteDoc(doc(db, 'blogger_promo_widgets', widget.id));
      setSuccess('Widget supprimé');
      await fetchWidgets();
    } catch (err) {
      console.error('Error deleting widget:', err);
      setError('Erreur lors de la suppression');
    }
  };

  const handleToggleActive = async (widget: PromoWidget) => {
    try {
      await updateDoc(doc(db, 'blogger_promo_widgets', widget.id), {
        isActive: !widget.isActive,
        updatedAt: serverTimestamp(),
      });
      await fetchWidgets();
    } catch (err) {
      console.error('Error toggling widget:', err);
      setError('Erreur lors de la mise à jour');
    }
  };

  const handleMoveWidget = async (widget: PromoWidget, direction: 'up' | 'down') => {
    const currentIndex = widgets.findIndex(w => w.id === widget.id);
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= widgets.length) return;

    const otherWidget = widgets[newIndex];

    try {
      await Promise.all([
        updateDoc(doc(db, 'blogger_promo_widgets', widget.id), { order: newIndex }),
        updateDoc(doc(db, 'blogger_promo_widgets', otherWidget.id), { order: currentIndex }),
      ]);
      await fetchWidgets();
    } catch (err) {
      console.error('Error reordering widgets:', err);
      setError('Erreur lors du réordonnancement');
    }
  };

  // ============================================================================
  // FORM HANDLERS
  // ============================================================================

  const openCreateModal = () => {
    setEditingWidget(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  const openEditModal = (widget: PromoWidget) => {
    setEditingWidget(widget);
    setFormData({
      name: widget.name,
      description: widget.description || '',
      type: widget.type,
      targetType: widget.targetType,
      dimension: widget.dimension,
      customWidth: widget.customWidth || 200,
      customHeight: widget.customHeight || 50,
      buttonText: widget.buttonText || 'Consultez un expert SOS-Expat',
      imageUrl: widget.imageUrl || '',
      altText: widget.altText || 'SOS-Expat',
      style: widget.style || PROMO_WIDGET_BUTTON_PRESETS[0].style,
      htmlTemplate: widget.htmlTemplate,
      utmSource: widget.utmSource,
      utmMedium: widget.utmMedium,
      utmCampaign: widget.utmCampaign,
      isActive: widget.isActive,
    });
    setIsModalOpen(true);
  };

  const handlePresetChange = (presetId: string) => {
    const preset = PROMO_WIDGET_BUTTON_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setFormData(prev => ({ ...prev, style: preset.style }));
    }
  };

  const copyWidgetCode = (widget: PromoWidget) => {
    const code = widget.htmlTemplate
      .replace(/\{\{affiliateUrl\}\}/g, 'https://sos-expat.com/call')
      .replace(/\{\{utmSource\}\}/g, widget.utmSource)
      .replace(/\{\{utmMedium\}\}/g, widget.utmMedium)
      .replace(/\{\{utmCampaign\}\}/g, widget.utmCampaign)
      .replace(/\{\{widgetId\}\}/g, widget.trackingId)
      .replace(/\{\{affiliateCode\}\}/g, 'VOTRE_CODE');

    navigator.clipboard.writeText(code);
    setCopiedId(widget.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // ============================================================================
  // FILTERING
  // ============================================================================

  const filteredWidgets = widgets.filter(widget => {
    if (filterType !== 'all' && widget.type !== filterType) return false;
    if (filterTarget !== 'all' && widget.targetType !== filterTarget) return false;
    if (filterDimension !== 'all' && widget.dimension !== filterDimension) return false;
    if (searchQuery && !widget.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  // ============================================================================
  // PREVIEW RENDERING
  // ============================================================================

  const renderPreview = (data: WidgetFormData) => {
    if (data.type === 'button') {
      const style = data.style;
      return (
        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          style={{
            display: 'inline-block',
            padding: style.padding,
            background: style.backgroundGradient || style.backgroundColor,
            color: style.textColor,
            textDecoration: 'none',
            borderRadius: style.borderRadius,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: style.fontSize,
            fontWeight: style.fontWeight as React.CSSProperties['fontWeight'],
            boxShadow: style.shadow,
            transition: 'all 0.2s ease',
          }}
        >
          {data.buttonText}
        </a>
      );
    } else {
      const dim = PROMO_WIDGET_DIMENSIONS.find(d => d.value === data.dimension);
      const width = data.dimension === 'custom' ? data.customWidth : dim?.width || 300;
      const height = data.dimension === 'custom' ? data.customHeight : dim?.height || 250;

      return data.imageUrl ? (
        <img
          src={data.imageUrl}
          alt={data.altText}
          style={{
            maxWidth: '100%',
            width: Math.min(width, 400),
            height: 'auto',
            borderRadius: '8px',
          }}
        />
      ) : (
        <div
          style={{
            width: Math.min(width, 400),
            height: Math.min(height, 300),
            background: 'linear-gradient(135deg, #e2e8f0, #cbd5e1)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
          }}
        >
          <Image className="w-12 h-12" />
        </div>
      );
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.bloggers.widgets.title" defaultMessage="Widgets Promotionnels" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.bloggers.widgets.subtitle"
                defaultMessage="Gérez les widgets disponibles pour les blogueurs"
              />
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchWidgets}
              className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openCreateModal}
              className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
            >
              <Plus className="w-4 h-4" />
              <FormattedMessage id="admin.bloggers.widgets.create" defaultMessage="Créer un widget" />
            </button>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-green-700 dark:text-green-400">
            {success}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Code className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{widgets.length}</p>
                <p className="text-xs text-gray-500">Total widgets</p>
              </div>
            </div>
          </div>
          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Eye className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {widgets.filter(w => w.isActive).length}
                </p>
                <p className="text-xs text-gray-500">Actifs</p>
              </div>
            </div>
          </div>
          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <MousePointer className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {widgets.filter(w => w.type === 'button').length}
                </p>
                <p className="text-xs text-gray-500">Boutons</p>
              </div>
            </div>
          </div>
          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                <Image className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {widgets.filter(w => w.type === 'banner').length}
                </p>
                <p className="text-xs text-gray-500">Bannières</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`${UI.card} p-4`}>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={intl.formatMessage({ id: 'admin.bloggers.widgets.search', defaultMessage: 'Rechercher...' })}
                  className={`${UI.input} pl-10`}
                />
              </div>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as PromoWidgetType | 'all')}
              className={`${UI.select} w-auto`}
            >
              <option value="all">Tous types</option>
              <option value="button">Boutons</option>
              <option value="banner">Bannières</option>
            </select>
            <select
              value={filterTarget}
              onChange={(e) => setFilterTarget(e.target.value as PromoWidgetTargetType | 'all')}
              className={`${UI.select} w-auto`}
            >
              <option value="all">Toutes cibles</option>
              <option value="client">Clients</option>
              <option value="recruitment">Partenaires</option>
            </select>
            <select
              value={filterDimension}
              onChange={(e) => setFilterDimension(e.target.value as PromoWidgetDimension | 'all')}
              className={`${UI.select} w-auto`}
            >
              <option value="all">Toutes dimensions</option>
              {PROMO_WIDGET_DIMENSIONS.map(dim => (
                <option key={dim.value} value={dim.value}>{dim.labelFr}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Widgets List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : filteredWidgets.length === 0 ? (
          <div className={`${UI.card} p-12 text-center`}>
            <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="admin.bloggers.widgets.empty"
                defaultMessage="Aucun widget trouvé"
              />
            </p>
            <button
              onClick={openCreateModal}
              className={`${UI.button.primary} px-6 py-2 mt-4`}
            >
              <FormattedMessage id="admin.bloggers.widgets.createFirst" defaultMessage="Créer le premier widget" />
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredWidgets.map((widget, index) => (
              <div key={widget.id} className={`${UI.card} p-6`}>
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl min-w-[200px] flex items-center justify-center">
                      {widget.type === 'button' ? (
                        <a
                          href="#"
                          onClick={(e) => e.preventDefault()}
                          style={{
                            display: 'inline-block',
                            padding: widget.style?.padding || '12px 24px',
                            background: widget.style?.backgroundGradient || widget.style?.backgroundColor || '#8b5cf6',
                            color: widget.style?.textColor || '#ffffff',
                            textDecoration: 'none',
                            borderRadius: widget.style?.borderRadius || '8px',
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            fontSize: widget.style?.fontSize || '14px',
                            fontWeight: (widget.style?.fontWeight || '500') as React.CSSProperties['fontWeight'],
                            boxShadow: widget.style?.shadow,
                          }}
                        >
                          {widget.buttonText}
                        </a>
                      ) : widget.imageUrl ? (
                        <img
                          src={widget.imageUrl}
                          alt={widget.altText}
                          className="max-w-[200px] max-h-[150px] object-contain rounded"
                        />
                      ) : (
                        <div className="w-[150px] h-[100px] bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                          <Image className="w-8 h-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          {widget.name}
                          {!widget.isActive && (
                            <span className={UI.badge.warning}>Inactif</span>
                          )}
                        </h3>
                        {widget.description && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {widget.description}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveWidget(widget, 'up')}
                          disabled={index === 0}
                          className={`${UI.button.ghost} p-2 disabled:opacity-30`}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleMoveWidget(widget, 'down')}
                          disabled={index === filteredWidgets.length - 1}
                          className={`${UI.button.ghost} p-2 disabled:opacity-30`}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className={widget.type === 'button' ? UI.badge.info : UI.badge.purple}>
                        {widget.type === 'button' ? 'Bouton' : 'Bannière'}
                      </span>
                      <span className={widget.targetType === 'client' ? UI.badge.success : UI.badge.warning}>
                        {widget.targetType === 'client' ? 'Clients' : 'Partenaires'}
                      </span>
                      <span className={UI.badge.info}>
                        {PROMO_WIDGET_DIMENSIONS.find(d => d.value === widget.dimension)?.labelFr || widget.dimension}
                      </span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        <span>{widget.views || 0} vues</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MousePointer className="w-4 h-4" />
                        <span>{widget.clicks || 0} clics</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="w-4 h-4" />
                        <span>{widget.conversions || 0} conversions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <BarChart3 className="w-4 h-4" />
                        <span>
                          {widget.clicks > 0
                            ? ((widget.conversions / widget.clicks) * 100).toFixed(1)
                            : 0}% CTR
                        </span>
                      </div>
                    </div>

                    {/* Tracking */}
                    <div className="text-xs text-gray-400 font-mono mb-4">
                      UTM: {widget.utmSource}/{widget.utmMedium}/{widget.utmCampaign}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => copyWidgetCode(widget)}
                        className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                      >
                        {copiedId === widget.id ? (
                          <><CheckCircle className="w-4 h-4 text-green-500" /> Copié</>
                        ) : (
                          <><Copy className="w-4 h-4" /> Code</>
                        )}
                      </button>
                      <button
                        onClick={() => openEditModal(widget)}
                        className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                      >
                        <Edit className="w-4 h-4" /> Modifier
                      </button>
                      <button
                        onClick={() => handleToggleActive(widget)}
                        className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                      >
                        {widget.isActive ? (
                          <><EyeOff className="w-4 h-4" /> Désactiver</>
                        ) : (
                          <><Eye className="w-4 h-4" /> Activer</>
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteWidget(widget)}
                        className={`${UI.button.danger} px-3 py-1.5 text-sm flex items-center gap-1.5`}
                      >
                        <Trash2 className="w-4 h-4" /> Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`${UI.card} w-full max-w-4xl max-h-[90vh] overflow-y-auto`}>
              <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingWidget ? 'Modifier le widget' : 'Créer un widget'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`${UI.button.ghost} p-2`}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Form */}
                  <div className="space-y-4">
                    {/* Name */}
                    <div>
                      <label className={UI.label}>Nom du widget *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={UI.input}
                        placeholder="Ex: Bouton violet CTA"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <label className={UI.label}>Description</label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className={UI.input}
                        placeholder="Description optionnelle"
                      />
                    </div>

                    {/* Type */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={UI.label}>Type</label>
                        <select
                          value={formData.type}
                          onChange={(e) => setFormData({ ...formData, type: e.target.value as PromoWidgetType })}
                          className={UI.select}
                        >
                          <option value="button">Bouton CTA</option>
                          <option value="banner">Bannière image</option>
                        </select>
                      </div>
                      <div>
                        <label className={UI.label}>Cible</label>
                        <select
                          value={formData.targetType}
                          onChange={(e) => setFormData({ ...formData, targetType: e.target.value as PromoWidgetTargetType })}
                          className={UI.select}
                        >
                          <option value="client">Clients ($10/appel)</option>
                          <option value="recruitment">Partenaires ($5/appel)</option>
                        </select>
                      </div>
                    </div>

                    {/* Dimension */}
                    <div>
                      <label className={UI.label}>Dimension</label>
                      <select
                        value={formData.dimension}
                        onChange={(e) => setFormData({ ...formData, dimension: e.target.value as PromoWidgetDimension })}
                        className={UI.select}
                      >
                        {PROMO_WIDGET_DIMENSIONS.map(dim => (
                          <option key={dim.value} value={dim.value}>{dim.labelFr}</option>
                        ))}
                      </select>
                    </div>

                    {formData.dimension === 'custom' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={UI.label}>Largeur (px)</label>
                          <input
                            type="number"
                            value={formData.customWidth}
                            onChange={(e) => setFormData({ ...formData, customWidth: parseInt(e.target.value) || 0 })}
                            className={UI.input}
                          />
                        </div>
                        <div>
                          <label className={UI.label}>Hauteur (px)</label>
                          <input
                            type="number"
                            value={formData.customHeight}
                            onChange={(e) => setFormData({ ...formData, customHeight: parseInt(e.target.value) || 0 })}
                            className={UI.input}
                          />
                        </div>
                      </div>
                    )}

                    {/* Button specific */}
                    {formData.type === 'button' && (
                      <>
                        <div>
                          <label className={UI.label}>Texte du bouton</label>
                          <input
                            type="text"
                            value={formData.buttonText}
                            onChange={(e) => setFormData({ ...formData, buttonText: e.target.value })}
                            className={UI.input}
                            placeholder="Consultez un expert SOS-Expat"
                          />
                        </div>

                        <div>
                          <label className={UI.label}>Style prédéfini</label>
                          <select
                            onChange={(e) => handlePresetChange(e.target.value)}
                            className={UI.select}
                          >
                            {PROMO_WIDGET_BUTTON_PRESETS.map(preset => (
                              <option key={preset.id} value={preset.id}>
                                {preset.nameTranslations.fr || preset.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={UI.label}>Couleur de fond</label>
                            <input
                              type="color"
                              value={formData.style.backgroundColor}
                              onChange={(e) => setFormData({
                                ...formData,
                                style: { ...formData.style, backgroundColor: e.target.value }
                              })}
                              className="w-full h-10 rounded-xl cursor-pointer"
                            />
                          </div>
                          <div>
                            <label className={UI.label}>Couleur du texte</label>
                            <input
                              type="color"
                              value={formData.style.textColor}
                              onChange={(e) => setFormData({
                                ...formData,
                                style: { ...formData.style, textColor: e.target.value }
                              })}
                              className="w-full h-10 rounded-xl cursor-pointer"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Banner specific */}
                    {formData.type === 'banner' && (
                      <>
                        <div>
                          <label className={UI.label}>URL de l'image *</label>
                          <input
                            type="url"
                            value={formData.imageUrl}
                            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                            className={UI.input}
                            placeholder="https://sos-expat.com/assets/banners/..."
                          />
                        </div>
                        <div>
                          <label className={UI.label}>Texte alternatif</label>
                          <input
                            type="text"
                            value={formData.altText}
                            onChange={(e) => setFormData({ ...formData, altText: e.target.value })}
                            className={UI.input}
                            placeholder="SOS-Expat - Consultez un expert"
                          />
                        </div>
                      </>
                    )}

                    {/* Tracking */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Paramètres UTM
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className={UI.label}>Source</label>
                          <input
                            type="text"
                            value={formData.utmSource}
                            onChange={(e) => setFormData({ ...formData, utmSource: e.target.value })}
                            className={UI.input}
                            placeholder="blogger"
                          />
                        </div>
                        <div>
                          <label className={UI.label}>Medium</label>
                          <input
                            type="text"
                            value={formData.utmMedium}
                            onChange={(e) => setFormData({ ...formData, utmMedium: e.target.value })}
                            className={UI.input}
                            placeholder="widget"
                          />
                        </div>
                        <div>
                          <label className={UI.label}>Campaign</label>
                          <input
                            type="text"
                            value={formData.utmCampaign}
                            onChange={(e) => setFormData({ ...formData, utmCampaign: e.target.value })}
                            className={UI.input}
                            placeholder="promo"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Active */}
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={formData.isActive}
                        onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                        className="w-5 h-5 rounded text-purple-500 focus:ring-purple-500"
                      />
                      <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                        Widget actif (visible pour les blogueurs)
                      </label>
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Aperçu
                    </h3>
                    <div className="p-8 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center min-h-[200px]">
                      {renderPreview(formData)}
                    </div>

                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mt-6 mb-3 flex items-center gap-2">
                      <Code className="w-4 h-4" />
                      Code HTML généré
                    </h3>
                    <pre className="p-4 bg-gray-900 text-gray-100 rounded-xl text-xs overflow-x-auto max-h-[200px]">
                      {generateHtmlTemplate(formData)}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className={`${UI.button.secondary} px-6 py-2`}
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveWidget}
                  disabled={isSaving}
                  className={`${UI.button.primary} px-6 py-2 flex items-center gap-2`}
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement...</>
                  ) : (
                    <><Save className="w-4 h-4" /> {editingWidget ? 'Mettre à jour' : 'Créer'}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminBloggersWidgets;

/**
 * PartnerWidgets - Widget showcase with preview and copy functionality
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { PartnerDashboardLayout } from '@/components/Partner';
import { usePartner } from '@/hooks/usePartner';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
import toast from 'react-hot-toast';
import { copyToClipboard } from '@/utils/clipboard';
import {
  Code,
  Copy,
  Loader2,
  CheckCircle,
  Search,
  MousePointer,
  Image as ImageIcon,
  Eye,
  X,
  Info,
} from 'lucide-react';

const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  button: {
    primary: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all active:scale-[0.98]',
    secondary: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all active:scale-[0.98]',
  },
} as const;

interface PromoWidget {
  id: string;
  name: string;
  nameTranslations?: Record<string, string>;
  type: 'button' | 'banner';
  htmlTemplate: string;
  previewUrl?: string;
  category?: string;
  dimension?: string;
  isActive: boolean;
  order: number;
}

type Tab = 'buttons' | 'banners';

const TABS: { id: Tab; icon: React.ReactNode; labelId: string; defaultLabel: string }[] = [
  { id: 'buttons', icon: <MousePointer className="w-4 h-4" />, labelId: 'partner.widgets.tab.buttons', defaultLabel: 'Boutons CTA' },
  { id: 'banners', icon: <ImageIcon className="w-4 h-4" />, labelId: 'partner.widgets.tab.banners', defaultLabel: 'Bannieres' },
];

const PartnerWidgets: React.FC = () => {
  const intl = useIntl();
  const { partner, affiliateLink } = usePartner();

  const [widgets, setWidgets] = useState<PromoWidget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('buttons');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewWidget, setPreviewWidget] = useState<PromoWidget | null>(null);

  useEffect(() => {
    fetchWidgets();
  }, []);

  const fetchWidgets = async () => {
    setLoading(true);
    setError(null);

    try {
      const widgetsRef = collection(db, 'partner_promo_widgets');
      const q = query(widgetsRef, where('isActive', '==', true));
      const snapshot = await getDocs(q);

      const fetched = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as PromoWidget[];

      fetched.sort((a, b) => a.order - b.order);
      setWidgets(fetched);
    } catch (err: any) {
      console.error('Error fetching widgets:', err);
      setError(err.message || 'Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (widget: PromoWidget) => {
    if (!affiliateLink) return;

    const htmlCode = widget.htmlTemplate.replace(/\{\{AFFILIATE_LINK\}\}/g, affiliateLink);

    const success = await copyToClipboard(htmlCode);
    if (success) {
      setCopiedId(widget.id);
      toast.success(intl.formatMessage({ id: 'partner.widgets.copiedToast', defaultMessage: 'Code HTML copi\u00e9 !' }));
      setTimeout(() => setCopiedId(null), 2000);
    } else {
      toast.error(intl.formatMessage({ id: 'common.copyFailed', defaultMessage: 'Copy failed' }));
    }
  };

  const filteredWidgets = widgets.filter((widget) => {
    const matchesTab = widget.type === activeTab.replace('s', '');
    const matchesSearch = widget.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <PartnerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="partner.widgets.title" defaultMessage="Widgets Promo" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="partner.widgets.subtitle"
              defaultMessage="Boutons et banni\u00e8res pr\u00eats \u00e0 int\u00e9grer sur votre site"
            />
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[48px] rounded-lg text-sm font-medium transition-all active:scale-[0.98] ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">
                <FormattedMessage id={tab.labelId} defaultMessage={tab.defaultLabel} />
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={intl.formatMessage({ id: 'partner.widgets.search', defaultMessage: 'Rechercher un widget...' })}
            className="w-full pl-10 pr-4 py-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 dark:text-blue-300">
            <p className="font-medium mb-1">
              <FormattedMessage id="partner.widgets.info.title" defaultMessage="Code HTML pr\u00eat \u00e0 l'emploi" />
            </p>
            <p>
              <FormattedMessage
                id="partner.widgets.info.message"
                defaultMessage="Copiez le code HTML et collez-le directement dans votre site. Votre lien d'affiliation est automatiquement int\u00e9gr\u00e9."
              />
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {!loading && (
          <>
            {filteredWidgets.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
                {filteredWidgets.map((widget) => (
                  <div key={widget.id} className={`${UI.card} p-4 sm:p-6`}>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 break-words">
                            {widget.nameTranslations?.[intl.locale] || widget.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2">
                            {widget.category && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                                {widget.category}
                              </span>
                            )}
                            {widget.dimension && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {widget.dimension}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewWidget(widget)}
                          className={`${UI.button.secondary} flex-1 sm:flex-none px-3 py-2 text-sm flex items-center justify-center gap-1`}
                        >
                          <Eye className="w-4 h-4" />
                          <span className="sm:hidden">
                            <FormattedMessage id="partner.widgets.preview" defaultMessage="Aper\u00e7u" />
                          </span>
                        </button>
                        <button
                          onClick={() => handleCopyCode(widget)}
                          className={`${UI.button.primary} flex-1 sm:flex-none px-3 py-2 text-sm flex items-center justify-center gap-1`}
                        >
                          {copiedId === widget.id ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <FormattedMessage id="partner.widgets.copied" defaultMessage="Copi\u00e9" />
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <FormattedMessage id="partner.widgets.copyCode" defaultMessage="Copier" />
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Preview */}
                    {widget.previewUrl ? (
                      <div className="bg-gray-50 dark:bg-white/10 rounded-xl p-4 mb-4">
                        <img src={widget.previewUrl} alt={widget.name} className="w-full h-auto rounded-lg" />
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-white/10 rounded-xl p-6 mb-4 flex items-center justify-center">
                        <div
                          className="widget-preview"
                          dangerouslySetInnerHTML={{
                            __html: widget.htmlTemplate
                              .replace(/\{\{AFFILIATE_LINK\}\}/g, affiliateLink || '#')
                              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                              .replace(/on\w+\s*=/gi, 'data-blocked='),
                          }}
                        />
                      </div>
                    )}

                    {/* Code snippet */}
                    <div className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 font-mono overflow-x-auto">
                      <code className="line-clamp-3">
                        {widget.htmlTemplate.substring(0, 100)}...
                      </code>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${UI.card} p-12 text-center`}>
                <Code className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="partner.widgets.empty" defaultMessage="Aucun widget disponible" />
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {previewWidget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {previewWidget.nameTranslations?.[intl.locale] || previewWidget.name}
                  </h3>
                  {previewWidget.dimension && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {previewWidget.dimension}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setPreviewWidget(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Full Preview */}
              <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-8 mb-4 flex items-center justify-center min-h-[200px]">
                {previewWidget.previewUrl ? (
                  <img
                    src={previewWidget.previewUrl}
                    alt={previewWidget.name}
                    className="max-w-full h-auto rounded-lg shadow-lg"
                  />
                ) : (
                  <div
                    className="widget-preview-large"
                    dangerouslySetInnerHTML={{
                      __html: previewWidget.htmlTemplate
                        .replace(/\{\{AFFILIATE_LINK\}\}/g, affiliateLink || '#')
                        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
                        .replace(/on\w+\s*=/gi, 'data-blocked='),
                    }}
                  />
                )}
              </div>

              {/* Full Code */}
              <div className="bg-gray-900 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400 font-mono">HTML</span>
                  <button
                    onClick={() => handleCopyCode(previewWidget)}
                    className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                  >
                    {copiedId === previewWidget.id ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        <FormattedMessage id="partner.widgets.copied" defaultMessage="Copi\u00e9" />
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <FormattedMessage id="partner.widgets.copyCode" defaultMessage="Copier" />
                      </>
                    )}
                  </button>
                </div>
                <pre className="text-xs text-gray-300 font-mono overflow-x-auto whitespace-pre-wrap">
                  {previewWidget.htmlTemplate}
                </pre>
              </div>

              <button
                onClick={() => setPreviewWidget(null)}
                className={`${UI.button.secondary} w-full px-4 py-3`}
              >
                <FormattedMessage id="partner.widgets.close" defaultMessage="Fermer" />
              </button>
            </div>
          </div>
        </div>
      )}
    </PartnerDashboardLayout>
  );
};

export default PartnerWidgets;

/**
 * BloggerWidgets - Widgets promo pour blogueurs
 *
 * Permet aux blogueurs de:
 * 1. Consulter les widgets disponibles (boutons CTA + bannières)
 * 2. Prévisualiser le rendu
 * 3. Copier le code HTML avec leur lien d'affiliation
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { BloggerDashboardLayout } from '@/components/Blogger';
import { useBlogger } from '@/hooks/useBlogger';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/config/firebase';
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
  Sparkles,
  Info,
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
} as const;

interface PromoWidget {
  id: string;
  name: string;
  nameTranslations?: { [key: string]: string };
  type: 'button' | 'banner';
  htmlTemplate: string;
  previewUrl?: string;
  category?: string;
  dimensions?: string;
  isActive: boolean;
  order: number;
}

type Tab = 'buttons' | 'banners';

const TABS: { id: Tab; icon: React.ReactNode; labelId: string; defaultLabel: string }[] = [
  { id: 'buttons', icon: <MousePointer className="w-4 h-4" />, labelId: 'blogger.widgets.tab.buttons', defaultLabel: 'Boutons CTA' },
  { id: 'banners', icon: <ImageIcon className="w-4 h-4" />, labelId: 'blogger.widgets.tab.banners', defaultLabel: 'Bannières' },
];

const BloggerWidgets: React.FC = () => {
  const intl = useIntl();
  const { blogger } = useBlogger();

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
      const widgetsRef = collection(db, 'blogger_promo_widgets');
      const q = query(widgetsRef, where('isActive', '==', true));
      const snapshot = await getDocs(q);

      const fetchedWidgets = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as PromoWidget[];

      // Sort by order
      fetchedWidgets.sort((a, b) => a.order - b.order);
      setWidgets(fetchedWidgets);
    } catch (err: any) {
      console.error('Error fetching widgets:', err);
      setError(err.message || 'Failed to load widgets');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCode = async (widget: PromoWidget) => {
    if (!blogger?.affiliateCodeClient) return;

    // Replace {{AFFILIATE_LINK}} with actual affiliate link
    const affiliateLink = `https://sos-expat.com/?ref=${blogger.affiliateCodeClient}`;
    const htmlCode = widget.htmlTemplate.replace(/\{\{AFFILIATE_LINK\}\}/g, affiliateLink);

    try {
      await navigator.clipboard.writeText(htmlCode);
      setCopiedId(widget.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const filteredWidgets = widgets.filter(widget => {
    const matchesTab = widget.type === activeTab.replace('s', ''); // 'buttons' -> 'button'
    const matchesSearch = widget.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="blogger.widgets.title" defaultMessage="Widgets Promo" />
          </h1>
          <p className="text-gray-700 dark:text-gray-400">
            <FormattedMessage
              id="blogger.widgets.subtitle"
              defaultMessage="Boutons et bannières prêts à intégrer sur votre blog"
            />
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-white/10 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
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
            placeholder={intl.formatMessage({ id: 'blogger.widgets.search', defaultMessage: 'Rechercher un widget...' })}
            className="w-full pl-10 pr-4 py-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Info Banner */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800 dark:text-purple-300">
            <p className="font-medium mb-1">
              <FormattedMessage id="blogger.widgets.info.title" defaultMessage="Code HTML prêt à l'emploi" />
            </p>
            <p>
              <FormattedMessage
                id="blogger.widgets.info.message"
                defaultMessage="Copiez le code HTML et collez-le directement dans votre article de blog. Votre lien d'affiliation est automatiquement intégré."
              />
            </p>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
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
                              <span className="text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded">
                                {widget.category}
                              </span>
                            )}
                            {widget.dimensions && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {widget.dimensions}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setPreviewWidget(widget)}
                          className={`${UI.button.secondary} flex-1 sm:flex-none px-3 py-2 text-sm flex items-center justify-center gap-1`}
                          aria-label="Prévisualiser"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="sm:hidden">Aperçu</span>
                        </button>
                        <button
                          onClick={() => handleCopyCode(widget)}
                          className={`${UI.button.primary} flex-1 sm:flex-none px-3 py-2 text-sm flex items-center justify-center gap-1`}
                        >
                          {copiedId === widget.id ? (
                            <><CheckCircle className="w-4 h-4" /> <FormattedMessage id="blogger.widgets.copied" defaultMessage="Copié" /></>
                          ) : (
                            <><Copy className="w-4 h-4" /> <FormattedMessage id="blogger.widgets.copyCode" defaultMessage="Copier" /></>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Preview */}
                    {widget.previewUrl ? (
                      <div className="bg-gray-50 dark:bg-white/10 rounded-xl p-4 mb-4">
                        <img
                          src={widget.previewUrl}
                          alt={widget.name}
                          className="w-full h-auto rounded-lg"
                        />
                      </div>
                    ) : (
                      <div className="bg-gray-50 dark:bg-white/10 rounded-xl p-6 mb-4 flex items-center justify-center">
                        <div
                          className="widget-preview"
                          dangerouslySetInnerHTML={{
                            __html: widget.htmlTemplate.replace(
                              /\{\{AFFILIATE_LINK\}\}/g,
                              `https://sos-expat.com/?ref=${blogger?.affiliateCodeClient || 'YOUR_CODE'}`
                            ),
                          }}
                        />
                      </div>
                    )}

                    {/* Code snippet preview */}
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
                <p className="text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.widgets.empty" defaultMessage="Aucun widget disponible" />
                </p>
              </div>
            )}
          </>
        )}

        {/* Usage Guide */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4" />
            <FormattedMessage id="blogger.widgets.usage.title" defaultMessage="Comment utiliser les widgets ?" />
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <FormattedMessage id="blogger.widgets.usage.1" defaultMessage="Choisissez un bouton ou une bannière" /></li>
            <li>• <FormattedMessage id="blogger.widgets.usage.2" defaultMessage="Prévisualisez le rendu avec l'icône œil" /></li>
            <li>• <FormattedMessage id="blogger.widgets.usage.3" defaultMessage="Cliquez sur 'Copier' pour copier le code HTML" /></li>
            <li>• <FormattedMessage id="blogger.widgets.usage.4" defaultMessage="Collez le code dans votre article WordPress/HTML" /></li>
            <li>• <FormattedMessage id="blogger.widgets.usage.5" defaultMessage="Votre lien d'affiliation est automatiquement intégré !" /></li>
          </ul>
        </div>
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
                  {previewWidget.dimensions && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {previewWidget.dimensions}
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
                      __html: previewWidget.htmlTemplate.replace(
                        /\{\{AFFILIATE_LINK\}\}/g,
                        `https://sos-expat.com/?ref=${blogger?.affiliateCodeClient || 'YOUR_CODE'}`
                      ),
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
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    {copiedId === previewWidget.id ? (
                      <><CheckCircle className="w-3 h-3" /> Copié !</>
                    ) : (
                      <><Copy className="w-3 h-3" /> Copier</>
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
                <FormattedMessage id="blogger.widgets.close" defaultMessage="Fermer" />
              </button>
            </div>
          </div>
        </div>
      )}
    </BloggerDashboardLayout>
  );
};

export default BloggerWidgets;

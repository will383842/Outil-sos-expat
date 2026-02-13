/**
 * BloggerGuide - Guide d'intégration exclusif pour blogueurs
 *
 * 3 sections:
 * 1. Templates d'articles - Modèles personnalisables
 * 2. Textes à copier - Textes courts avec remplacement automatique [LIEN]
 * 3. Bonnes pratiques - Conseils et recommandations
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useBloggerGuide } from '@/hooks/useBloggerResources';
import { BloggerDashboardLayout } from '@/components/Blogger';
import { useBlogger } from '@/hooks/useBlogger';
import {
  BookOpen,
  Copy,
  Lightbulb,
  Loader2,
  CheckCircle,
  Search,
  FileText,
  Link2,
  Info,
  Sparkles,
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
} as const;

type Tab = 'templates' | 'copy_texts' | 'best_practices';

const TABS: { id: Tab; icon: React.ReactNode; labelId: string; defaultLabel: string }[] = [
  { id: 'templates', icon: <FileText className="w-4 h-4" />, labelId: 'blogger.guide.tab.templates', defaultLabel: 'Templates d\'articles' },
  { id: 'copy_texts', icon: <Copy className="w-4 h-4" />, labelId: 'blogger.guide.tab.copyTexts', defaultLabel: 'Textes à copier' },
  { id: 'best_practices', icon: <Lightbulb className="w-4 h-4" />, labelId: 'blogger.guide.tab.bestPractices', defaultLabel: 'Bonnes pratiques' },
];

const BloggerGuide: React.FC = () => {
  const intl = useIntl();
  const { guide, isLoading, error, fetchGuide, copyWithLink } = useBloggerGuide();
  const { blogger } = useBlogger();

  const [activeTab, setActiveTab] = useState<Tab>('templates');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    if (!guide) {
      fetchGuide();
    }
  }, []);

  const handleCopy = async (id: string, type: 'template' | 'copy_text') => {
    if (!blogger?.affiliateCodeClient) return;

    setCopyingId(id);
    const affiliateLink = `https://sos-expat.com/?ref=${blogger.affiliateCodeClient}`;
    const result = await copyWithLink(id, type, affiliateLink);

    if (result.success) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
    setCopyingId(null);
  };

  const filteredTemplates = (guide?.templates || []).filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCopyTexts = (guide?.copyTexts || []).filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBestPractices = (guide?.bestPractices || []).filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="blogger.guide.title" defaultMessage="Guide d'intégration" />
          </h1>
          <p className="text-gray-700 dark:text-gray-600 dark:text-gray-400">
            <FormattedMessage
              id="blogger.guide.subtitle"
              defaultMessage="Templates, textes et conseils pour promouvoir SOS-Expat sur votre blog"
            />
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 bg-gray-100 dark:bg-white/5 rounded-xl p-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
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
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-600 dark:text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={intl.formatMessage({ id: 'blogger.guide.search', defaultMessage: 'Rechercher...' })}
            className="w-full pl-10 pr-4 py-3 rounded-xl border dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Info Banner */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-purple-800 dark:text-purple-300">
            <p className="font-medium mb-1">
              <FormattedMessage id="blogger.guide.info.title" defaultMessage="Remplacement automatique du lien" />
            </p>
            <p>
              <FormattedMessage
                id="blogger.guide.info.message"
                defaultMessage="Le placeholder [LIEN] sera automatiquement remplacé par votre lien d'affiliation personnalisé lors de la copie."
              />
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* ==================== TAB: TEMPLATES ==================== */}
        {activeTab === 'templates' && !isLoading && (
          <>
            {filteredTemplates.length > 0 ? (
              <div className="space-y-4">
                {filteredTemplates.map((template) => (
                  <div key={template.id} className={`${UI.card} p-4 sm:p-6`}>
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                          {template.title}
                        </h3>
                        {template.description && (
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {template.description}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {template.targetAudience && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                              {template.targetAudience}
                            </span>
                          )}
                          {template.recommendedWordCount && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              ~{template.recommendedWordCount} mots recommandés
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(template.id, 'template')}
                        disabled={copyingId === template.id}
                        className={`${UI.button.primary} px-4 py-2 text-sm flex items-center justify-center gap-2 w-full sm:w-auto flex-shrink-0`}
                      >
                        {copyingId === template.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : copiedId === template.id ? (
                          <><CheckCircle className="w-4 h-4" /> <FormattedMessage id="blogger.guide.copied" defaultMessage="Copié !" /></>
                        ) : (
                          <><Copy className="w-4 h-4" /> <FormattedMessage id="blogger.guide.copy" defaultMessage="Copier" /></>
                        )}
                      </button>
                    </div>
                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                      {template.content.substring(0, 800)}{template.content.length > 800 ? '...' : ''}
                    </div>
                    {template.seoKeywords && template.seoKeywords.length > 0 && (
                      <div className="mt-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-600 dark:text-gray-400">
                          SEO: {template.seoKeywords.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${UI.card} p-12 text-center`}>
                <FileText className="w-12 h-12 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.guide.noTemplates" defaultMessage="Aucun template disponible" />
                </p>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB: COPY TEXTS ==================== */}
        {activeTab === 'copy_texts' && !isLoading && (
          <>
            {filteredCopyTexts.length > 0 ? (
              <div className="grid sm:grid-cols-2 gap-4">
                {filteredCopyTexts.map((text) => (
                  <div key={text.id} className={`${UI.card} p-4`}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-white mb-1 break-words">
                          {text.title}
                        </h3>
                        {text.type && (
                          <span className="inline-block text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                            {text.type}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleCopy(text.id, 'copy_text')}
                        disabled={copyingId === text.id}
                        className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1 flex-shrink-0`}
                        aria-label="Copier le texte"
                      >
                        {copyingId === text.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : copiedId === text.id ? (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-white/5 rounded-lg p-3">
                      {text.content}
                    </p>
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-600 dark:text-gray-400">
                      <Link2 className="w-3 h-3" />
                      <FormattedMessage
                        id="blogger.guide.linkReplacement"
                        defaultMessage="[LIEN] sera remplacé automatiquement"
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${UI.card} p-12 text-center`}>
                <Copy className="w-12 h-12 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.guide.noCopyTexts" defaultMessage="Aucun texte disponible" />
                </p>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB: BEST PRACTICES ==================== */}
        {activeTab === 'best_practices' && !isLoading && (
          <>
            {filteredBestPractices.length > 0 ? (
              <div className="space-y-4">
                {filteredBestPractices.map((practice) => (
                  <div key={practice.id} className={`${UI.card} p-6`}>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Lightbulb className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                          {practice.title}
                        </h3>
                        {practice.priority && (
                          <span className="inline-block text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 px-2 py-1 rounded mb-3">
                            {practice.priority}
                          </span>
                        )}
                        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {practice.content}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={`${UI.card} p-12 text-center`}>
                <Lightbulb className="w-12 h-12 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-600 dark:text-gray-400">
                  <FormattedMessage id="blogger.guide.noBestPractices" defaultMessage="Aucune bonne pratique disponible" />
                </p>
              </div>
            )}
          </>
        )}

        {/* Usage Note */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200 mb-2 flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <FormattedMessage id="blogger.guide.usage.title" defaultMessage="Comment utiliser ce guide ?" />
          </h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <FormattedMessage id="blogger.guide.usage.1" defaultMessage="Choisissez un template ou texte adapté à votre audience" /></li>
            <li>• <FormattedMessage id="blogger.guide.usage.2" defaultMessage="Cliquez sur 'Copier' pour copier avec votre lien d'affiliation" /></li>
            <li>• <FormattedMessage id="blogger.guide.usage.3" defaultMessage="Personnalisez le contenu selon votre style" /></li>
            <li>• <FormattedMessage id="blogger.guide.usage.4" defaultMessage="Publiez sur votre blog et suivez vos commissions" /></li>
          </ul>
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerGuide;

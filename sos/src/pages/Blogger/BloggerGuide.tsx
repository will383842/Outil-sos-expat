/**
 * BloggerGuide - EXCLUSIVE integration guide for bloggers
 * Templates, copy texts, and best practices
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useBloggerGuide } from '@/hooks/useBloggerResources';
import { useBlogger } from '@/hooks/useBlogger';
import { BloggerDashboardLayout } from '@/components/Blogger';
import {
  BookOpen,
  Copy,
  CheckCircle,
  Lightbulb,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  Link,
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
} as const;

const BloggerGuide: React.FC = () => {
  const intl = useIntl();
  const { guide, isLoading, error, fetchGuide, copyWithLink } = useBloggerGuide();
  const { blogger, clientShareUrl } = useBlogger();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedTemplate, setExpandedTemplate] = useState<string | null>(null);
  const [expandedPractice, setExpandedPractice] = useState<string | null>(null);

  useEffect(() => {
    fetchGuide();
  }, []);

  const handleCopyWithLink = async (textId: string, textType: 'template' | 'copy_text') => {
    const result = await copyWithLink(textId, textType, clientShareUrl);
    if (result.success) {
      setCopiedId(textId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const toggleTemplate = (id: string) => {
    setExpandedTemplate(expandedTemplate === id ? null : id);
  };

  const togglePractice = (id: string) => {
    setExpandedPractice(expandedPractice === id ? null : id);
  };

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium rounded">
              <FormattedMessage id="blogger.guide.exclusive" defaultMessage="EXCLUSIF" />
            </span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="blogger.guide.title" defaultMessage="Guide d'intégration" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="blogger.guide.subtitle" defaultMessage="Templates d'articles, textes à copier et bonnes pratiques" />
          </p>
        </div>

        {/* Affiliate Link Reminder */}
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-start gap-3">
          <Link className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              <FormattedMessage
                id="blogger.guide.linkReminder"
                defaultMessage="Votre lien d'affiliation sera automatiquement inséré à la place de [LIEN] dans tous les textes copiés."
              />
            </p>
            <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-mono break-all">
              {clientShareUrl}
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Article Templates */}
        {!isLoading && guide?.templates && guide.templates.length > 0 && (
          <div className={`${UI.card} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-500" />
              <FormattedMessage id="blogger.guide.templates" defaultMessage="Templates d'articles" />
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <FormattedMessage
                id="blogger.guide.templatesDesc"
                defaultMessage="Structures d'articles prêtes à l'emploi. Personnalisez-les avec votre style et vos expériences."
              />
            </p>
            <div className="space-y-4">
              {guide.templates.map((template) => (
                <div
                  key={template.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => toggleTemplate(template.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{template.title}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{template.description}</p>
                    </div>
                    {expandedTemplate === template.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {expandedTemplate === template.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/30">
                      <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans mb-4 max-h-96 overflow-y-auto">
                        {template.content}
                      </pre>
                      <button
                        onClick={() => handleCopyWithLink(template.id, 'template')}
                        className={`${UI.button.primary} px-4 py-2 text-sm flex items-center gap-2`}
                      >
                        {copiedId === template.id ? (
                          <>
                            <CheckCircle className="w-4 h-4" />
                            <FormattedMessage id="blogger.guide.copied" defaultMessage="Copié avec votre lien !" />
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <FormattedMessage id="blogger.guide.copyTemplate" defaultMessage="Copier le template" />
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Copy Texts */}
        {!isLoading && guide?.copyTexts && guide.copyTexts.length > 0 && (
          <div className={`${UI.card} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Copy className="w-5 h-5 text-blue-500" />
              <FormattedMessage id="blogger.guide.copyTexts" defaultMessage="Textes à copier-coller" />
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              <FormattedMessage
                id="blogger.guide.copyTextsDesc"
                defaultMessage="Paragraphes et CTA prêts à intégrer dans vos articles. Le lien sera remplacé automatiquement."
              />
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              {guide.copyTexts.map((text) => (
                <div
                  key={text.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">{text.title}</h3>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-1 rounded">
                      {text.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 whitespace-pre-wrap">
                    {text.content.replace('[LIEN]', '🔗')}
                  </p>
                  <button
                    onClick={() => handleCopyWithLink(text.id, 'copy_text')}
                    className={`${UI.button.secondary} w-full py-2 text-sm flex items-center justify-center gap-2`}
                  >
                    {copiedId === text.id ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <FormattedMessage id="blogger.guide.copied" defaultMessage="Copié avec votre lien !" />
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <FormattedMessage id="blogger.guide.copy" defaultMessage="Copier" />
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best Practices */}
        {!isLoading && guide?.bestPractices && guide.bestPractices.length > 0 && (
          <div className={`${UI.card} p-6`}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <FormattedMessage id="blogger.guide.bestPractices" defaultMessage="Bonnes pratiques" />
            </h2>
            <div className="space-y-3">
              {guide.bestPractices.map((practice) => (
                <div
                  key={practice.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
                >
                  <button
                    onClick={() => togglePractice(practice.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        practice.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                        practice.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                        'bg-green-100 dark:bg-green-900/30 text-green-600'
                      }`}>
                        <Lightbulb className="w-4 h-4" />
                      </div>
                      <h3 className="font-medium text-gray-900 dark:text-white">{practice.title}</h3>
                    </div>
                    {expandedPractice === practice.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>

                  {expandedPractice === practice.id && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/30">
                      <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap">
                        {practice.content}
                      </p>
                      {practice.examples && practice.examples.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                            <FormattedMessage id="blogger.guide.examples" defaultMessage="Exemples" />
                          </p>
                          <ul className="space-y-1">
                            {practice.examples.map((example, idx) => (
                              <li key={idx} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                                <span className="text-purple-500">•</span>
                                {example}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !guide?.templates?.length && !guide?.copyTexts?.length && !guide?.bestPractices?.length && (
          <div className={`${UI.card} p-12 text-center`}>
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="blogger.guide.empty" defaultMessage="Le guide d'intégration sera bientôt disponible" />
            </p>
          </div>
        )}

        {/* Tips */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
          <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
            <FormattedMessage id="blogger.guide.tips.title" defaultMessage="Conseils pour maximiser vos conversions" />
          </h3>
          <ul className="text-sm text-green-700 dark:text-green-300 space-y-1">
            <li>
              • <FormattedMessage id="blogger.guide.tips.1" defaultMessage="Placez votre lien tôt dans l'article (avant le fold)" />
            </li>
            <li>
              • <FormattedMessage id="blogger.guide.tips.2" defaultMessage="Utilisez un CTA clair et engageant" />
            </li>
            <li>
              • <FormattedMessage id="blogger.guide.tips.3" defaultMessage="Partagez votre expérience personnelle pour plus d'authenticité" />
            </li>
            <li>
              • <FormattedMessage id="blogger.guide.tips.4" defaultMessage="Répétez le lien 2-3 fois dans un article long" />
            </li>
          </ul>
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerGuide;

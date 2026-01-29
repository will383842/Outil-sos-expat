/**
 * BloggerPromoTools - Promotional tools for bloggers
 * Link generator, QR codes, widgets
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useBlogger } from '@/hooks/useBlogger';
import { BloggerDashboardLayout } from '@/components/Blogger';
import {
  Link,
  Copy,
  CheckCircle,
  QrCode,
  Code,
  Wrench,
  ExternalLink,
  Loader2,
} from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500",
} as const;

const BloggerPromoTools: React.FC = () => {
  const intl = useIntl();
  const { blogger, clientShareUrl, recruitmentShareUrl, isLoading } = useBlogger();

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [customUrl, setCustomUrl] = useState('');
  const [generatedLink, setGeneratedLink] = useState('');

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const generateCustomLink = () => {
    if (!customUrl) return;
    // Add affiliate code to URL as parameter
    const separator = customUrl.includes('?') ? '&' : '?';
    const link = `${customUrl}${separator}ref=${blogger?.affiliateCodeClient}`;
    setGeneratedLink(link);
  };

  // Generate widget embed code
  const widgetCode = `<a href="${clientShareUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;background:linear-gradient(to right,#8b5cf6,#7c3aed);color:white;text-decoration:none;border-radius:8px;font-family:sans-serif;font-weight:500;">Consultez un expert SOS-Expat</a>`;

  // Generate banner embed code
  const bannerCode = `<a href="${clientShareUrl}" target="_blank" rel="noopener noreferrer">
  <img src="https://sos-expat.com/assets/banners/blogger-banner.png" alt="SOS-Expat - Consultez un expert" style="max-width:100%;height:auto;border-radius:8px;" />
</a>`;

  if (isLoading) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </BloggerDashboardLayout>
    );
  }

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="blogger.tools.title" defaultMessage="Outils promo" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="blogger.tools.subtitle" defaultMessage="Liens, QR codes et widgets pour votre blog" />
          </p>
        </div>

        {/* Affiliate Links */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Link className="w-5 h-5 text-purple-500" />
            <FormattedMessage id="blogger.tools.links" defaultMessage="Vos liens d'affiliation" />
          </h2>

          <div className="space-y-4">
            {/* Client Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="blogger.tools.clientLink" defaultMessage="Lien client ($10/appel)" />
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={clientShareUrl}
                  readOnly
                  className={UI.input}
                />
                <button
                  onClick={() => copyToClipboard(clientShareUrl, 'client')}
                  className={`${UI.button.primary} px-4 flex items-center gap-2 whitespace-nowrap`}
                >
                  {copiedField === 'client' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <FormattedMessage id="blogger.tools.copied" defaultMessage="Copié" />
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <FormattedMessage id="blogger.tools.copy" defaultMessage="Copier" />
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                <FormattedMessage id="blogger.tools.clientLinkDesc" defaultMessage="Utilisez ce lien pour référer des clients" />
              </p>
            </div>

            {/* Recruitment Link */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="blogger.tools.recruitLink" defaultMessage="Lien recrutement ($5/appel pendant 6 mois)" />
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={recruitmentShareUrl}
                  readOnly
                  className={UI.input}
                />
                <button
                  onClick={() => copyToClipboard(recruitmentShareUrl, 'recruit')}
                  className={`${UI.button.primary} px-4 flex items-center gap-2 whitespace-nowrap`}
                >
                  {copiedField === 'recruit' ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <FormattedMessage id="blogger.tools.copied" defaultMessage="Copié" />
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <FormattedMessage id="blogger.tools.copy" defaultMessage="Copier" />
                    </>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                <FormattedMessage id="blogger.tools.recruitLinkDesc" defaultMessage="Utilisez ce lien pour recruter des prestataires" />
              </p>
            </div>
          </div>
        </div>

        {/* QR Codes */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <QrCode className="w-5 h-5 text-blue-500" />
            <FormattedMessage id="blogger.tools.qrCodes" defaultMessage="QR Codes" />
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            <FormattedMessage id="blogger.tools.qrDesc" defaultMessage="Idéal pour les articles imprimés ou les présentations" />
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Client QR */}
            <div className="text-center">
              <div className="bg-white p-4 rounded-xl inline-block mb-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(clientShareUrl)}`}
                  alt="QR Code Client"
                  className="w-36 h-36"
                />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                <FormattedMessage id="blogger.tools.qrClient" defaultMessage="QR Client" />
              </p>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(clientShareUrl)}`}
                download="qr-client-sos-expat.png"
                className={`${UI.button.secondary} px-3 py-1.5 text-sm inline-flex items-center gap-1 mt-2`}
              >
                <FormattedMessage id="blogger.tools.downloadQR" defaultMessage="Télécharger HD" />
              </a>
            </div>

            {/* Recruitment QR */}
            <div className="text-center">
              <div className="bg-white p-4 rounded-xl inline-block mb-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(recruitmentShareUrl)}`}
                  alt="QR Code Recrutement"
                  className="w-36 h-36"
                />
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                <FormattedMessage id="blogger.tools.qrRecruit" defaultMessage="QR Recrutement" />
              </p>
              <a
                href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(recruitmentShareUrl)}`}
                download="qr-recrutement-sos-expat.png"
                className={`${UI.button.secondary} px-3 py-1.5 text-sm inline-flex items-center gap-1 mt-2`}
              >
                <FormattedMessage id="blogger.tools.downloadQR" defaultMessage="Télécharger HD" />
              </a>
            </div>
          </div>
        </div>

        {/* Embed Widgets */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Code className="w-5 h-5 text-green-500" />
            <FormattedMessage id="blogger.tools.widgets" defaultMessage="Widgets intégrables" />
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            <FormattedMessage id="blogger.tools.widgetsDesc" defaultMessage="Code HTML à copier-coller dans votre blog" />
          </p>

          <div className="space-y-6">
            {/* Button Widget */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="blogger.tools.buttonWidget" defaultMessage="Bouton CTA" />
              </h3>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 mb-3">
                <div dangerouslySetInnerHTML={{ __html: widgetCode }} />
              </div>
              <div className="relative">
                <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto">
                  {widgetCode}
                </pre>
                <button
                  onClick={() => copyToClipboard(widgetCode, 'widget')}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                >
                  {copiedField === 'widget' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Banner Widget */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="blogger.tools.bannerWidget" defaultMessage="Bannière" />
              </h3>
              <p className="text-xs text-gray-500 mb-3">
                <FormattedMessage id="blogger.tools.bannerNote" defaultMessage="Téléchargez les bannières depuis la page Ressources" />
              </p>
              <div className="relative">
                <pre className="text-xs bg-gray-900 text-gray-100 p-4 rounded-xl overflow-x-auto">
                  {bannerCode}
                </pre>
                <button
                  onClick={() => copyToClipboard(bannerCode, 'banner')}
                  className="absolute top-2 right-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white"
                >
                  {copiedField === 'banner' ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Link Generator */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" />
            <FormattedMessage id="blogger.tools.linkGenerator" defaultMessage="Générateur de liens personnalisés" />
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            <FormattedMessage id="blogger.tools.linkGeneratorDesc" defaultMessage="Ajoutez votre code d'affiliation à n'importe quelle URL SOS-Expat" />
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <FormattedMessage id="blogger.tools.originalUrl" defaultMessage="URL originale" />
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://sos-expat.com/services/..."
                className={UI.input}
              />
            </div>

            <button
              onClick={generateCustomLink}
              disabled={!customUrl}
              className={`${UI.button.primary} px-6 py-2 disabled:opacity-50`}
            >
              <FormattedMessage id="blogger.tools.generate" defaultMessage="Générer" />
            </button>

            {generatedLink && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <FormattedMessage id="blogger.tools.generatedLink" defaultMessage="Lien avec affiliation" />
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedLink}
                    readOnly
                    className={UI.input}
                  />
                  <button
                    onClick={() => copyToClipboard(generatedLink, 'generated')}
                    className={`${UI.button.primary} px-4 flex items-center gap-2`}
                  >
                    {copiedField === 'generated' ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                  <a
                    href={generatedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${UI.button.secondary} px-4 flex items-center`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerPromoTools;

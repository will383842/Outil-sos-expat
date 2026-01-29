/**
 * InfluencerPromoTools - Promotional tools (banners, widgets, QR codes, texts)
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useInfluencer } from '@/hooks/useInfluencer';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import InfluencerAffiliateLinks from '@/components/Influencer/Links/InfluencerAffiliateLinks';
import { Image, Code, QrCode, FileText, Copy, Check, Download } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
} as const;

type TabType = 'links' | 'banners' | 'widgets' | 'qrcode' | 'texts';

const InfluencerPromoTools: React.FC = () => {
  const intl = useIntl();
  const { dashboardData: dashboard } = useInfluencer();
  const [activeTab, setActiveTab] = useState<TabType>('links');
  const [copied, setCopied] = useState(false);

  const influencer = dashboard?.influencer;
  const config = dashboard?.config;

  const tabs = [
    { id: 'links' as TabType, label: intl.formatMessage({ id: 'influencer.tools.tabs.links', defaultMessage: 'Liens' }), icon: <Code className="w-4 h-4" /> },
    { id: 'banners' as TabType, label: intl.formatMessage({ id: 'influencer.tools.tabs.banners', defaultMessage: 'Bannières' }), icon: <Image className="w-4 h-4" /> },
    { id: 'widgets' as TabType, label: intl.formatMessage({ id: 'influencer.tools.tabs.widgets', defaultMessage: 'Widgets' }), icon: <Code className="w-4 h-4" /> },
    { id: 'qrcode' as TabType, label: intl.formatMessage({ id: 'influencer.tools.tabs.qrcode', defaultMessage: 'QR Code' }), icon: <QrCode className="w-4 h-4" /> },
    { id: 'texts' as TabType, label: intl.formatMessage({ id: 'influencer.tools.tabs.texts', defaultMessage: 'Textes' }), icon: <FileText className="w-4 h-4" /> },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clientLink = `https://sos-expat.com/ref/i/${influencer?.affiliateCodeClient || ''}`;
  const recruitLink = `https://sos-expat.com/rec/i/${influencer?.affiliateCodeRecruitment || ''}`;

  // Generate HTML code for banner
  const generateBannerCode = (size: string) => {
    return `<a href="${clientLink}" target="_blank" rel="noopener">
  <img src="https://sos-expat.com/banners/${size}.png" alt="SOS-Expat - Conseil juridique expatriés" />
</a>`;
  };

  // Generate iframe widget code
  const generateWidgetCode = () => {
    return `<iframe
  src="https://sos-expat.com/widget/search?ref=${influencer?.affiliateCodeClient || ''}"
  width="300"
  height="400"
  frameborder="0"
  style="border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"
></iframe>`;
  };

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="influencer.tools.title" defaultMessage="Outils promotionnels" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="influencer.tools.subtitle" defaultMessage="Bannières, widgets et textes pour promouvoir SOS-Expat" />
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                activeTab === tab.id
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={`${UI.card} p-6`}>
          {activeTab === 'links' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="influencer.tools.links.title" defaultMessage="Vos liens de parrainage" />
              </h2>
              <InfluencerAffiliateLinks
                clientCode={influencer?.affiliateCodeClient || ''}
                recruitmentCode={influencer?.affiliateCodeRecruitment || ''}
                clientDiscount={config?.clientDiscountPercent || 5}
              />
            </div>
          )}

          {activeTab === 'banners' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="influencer.tools.banners.title" defaultMessage="Bannières prêtes à l'emploi" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {['728x90', '300x250', '160x600', '468x60'].map((size) => (
                  <div key={size} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <div className="bg-gray-100 dark:bg-gray-800 rounded-lg mb-4 flex items-center justify-center h-32">
                      <span className="text-gray-500">{size}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(generateBannerCode(size))}
                        className={`${UI.button.secondary} px-3 py-2 flex-1 flex items-center justify-center gap-2`}
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <FormattedMessage id="influencer.tools.copyCode" defaultMessage="Copier le code" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'widgets' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="influencer.tools.widgets.title" defaultMessage="Widgets interactifs" />
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                    <FormattedMessage id="influencer.tools.widgets.search" defaultMessage="Widget de recherche" />
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <FormattedMessage
                      id="influencer.tools.widgets.searchDesc"
                      defaultMessage="Permet à vos visiteurs de rechercher des experts directement depuis votre site"
                    />
                  </p>
                  <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-xs overflow-x-auto mb-4">
                    {generateWidgetCode()}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(generateWidgetCode())}
                    className={`${UI.button.secondary} px-3 py-2 w-full flex items-center justify-center gap-2`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <FormattedMessage id="influencer.tools.copyCode" defaultMessage="Copier le code" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qrcode' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="influencer.tools.qrcode.title" defaultMessage="QR Code personnalisé" />
              </h2>
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center mb-4">
                  <QrCode className="w-24 h-24 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">
                  <FormattedMessage
                    id="influencer.tools.qrcode.desc"
                    defaultMessage="Scannez pour accéder à votre lien de parrainage"
                  />
                </p>
                <p className="font-mono text-sm text-gray-700 dark:text-gray-300 mb-4">
                  {clientLink}
                </p>
                <button className={`${UI.button.primary} px-6 py-2 flex items-center gap-2`}>
                  <Download className="w-4 h-4" />
                  <FormattedMessage id="influencer.tools.qrcode.download" defaultMessage="Télécharger le QR Code" />
                </button>
              </div>
            </div>
          )}

          {activeTab === 'texts' && (
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="influencer.tools.texts.title" defaultMessage="Textes promotionnels" />
              </h2>
              <div className="space-y-4">
                {[
                  {
                    title: intl.formatMessage({ id: 'influencer.tools.texts.social', defaultMessage: 'Post réseaux sociaux' }),
                    text: `🌍 Besoin d'un avocat ou expert local à l'étranger ? Découvrez SOS-Expat et bénéficiez de 5% de remise avec mon lien : ${clientLink}`,
                  },
                  {
                    title: intl.formatMessage({ id: 'influencer.tools.texts.bio', defaultMessage: 'Bio/Description' }),
                    text: `Partenaire SOS-Expat - 5% de remise sur votre premier appel avec mon code ${influencer?.affiliateCodeClient}`,
                  },
                  {
                    title: intl.formatMessage({ id: 'influencer.tools.texts.long', defaultMessage: 'Description longue' }),
                    text: `SOS-Expat vous connecte en moins de 5 minutes avec un avocat ou expert local qui parle votre langue, dans 197 pays. Idéal pour les expatriés, voyageurs et digital nomads. Utilisez mon lien pour obtenir 5% de remise sur votre premier appel : ${clientLink}`,
                  },
                ].map((item, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{item.text}</p>
                    <button
                      onClick={() => copyToClipboard(item.text)}
                      className={`${UI.button.secondary} px-3 py-2 flex items-center gap-2`}
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <FormattedMessage id="influencer.tools.copyText" defaultMessage="Copier" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerPromoTools;

/**
 * ChatterAffiliateLinks - Display and share affiliate links
 * Shows both client and recruitment affiliate links with copy/share functionality
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, Share2, CheckCircle, Users, UserPlus, ExternalLink, QrCode } from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

interface ChatterAffiliateLinksProps {
  affiliateCodeClient: string;
  affiliateCodeRecruitment: string;
  clientLinkUrl: string;
  recruitmentLinkUrl: string;
  totalClientConversions?: number;
  totalRecruitmentConversions?: number;
}

const ChatterAffiliateLinks: React.FC<ChatterAffiliateLinksProps> = ({
  affiliateCodeClient,
  affiliateCodeRecruitment,
  clientLinkUrl,
  recruitmentLinkUrl,
  totalClientConversions = 0,
  totalRecruitmentConversions = 0,
}) => {
  const intl = useIntl();
  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedRecruitment, setCopiedRecruitment] = useState(false);

  // Copy link to clipboard
  const copyLink = async (link: string, type: 'client' | 'recruitment') => {
    try {
      await navigator.clipboard.writeText(link);
      if (type === 'client') {
        setCopiedClient(true);
        setTimeout(() => setCopiedClient(false), 2000);
      } else {
        setCopiedRecruitment(true);
        setTimeout(() => setCopiedRecruitment(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Native share
  const shareLink = async (link: string, title: string, text: string) => {
    if (!navigator.share) return;
    try {
      await navigator.share({ title, text, url: link });
    } catch (err) {
      // User cancelled or share failed
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Client Referral Link - Mobile optimized */}
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-lg shadow-red-500/30 flex-shrink-0">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                <FormattedMessage id="chatter.links.client.title" defaultMessage="Lien Client" />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.links.client.desc" defaultMessage="Partagez pour gagner sur chaque appel payé" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:block sm:text-right bg-red-50 dark:bg-red-900/20 sm:bg-transparent rounded-xl p-3 sm:p-0">
            <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
              {totalClientConversions}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.links.conversions" defaultMessage="conversions" />
            </p>
          </div>
        </div>

        {/* Code Display - Prominent */}
        <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl border border-red-200/50 dark:border-red-800/30">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            <FormattedMessage id="chatter.links.yourCode" defaultMessage="Votre code" />
          </p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 tracking-wider">
            {affiliateCodeClient}
          </p>
        </div>

        {/* Link Display - Mobile optimized with stacked layout */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center px-4 py-3 min-h-[48px] bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {clientLinkUrl}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyLink(clientLinkUrl, 'client')}
              className={`flex-1 min-h-[48px] rounded-xl font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                copiedClient
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200'
              }`}
              title={intl.formatMessage({ id: copiedClient ? 'common.copied' : 'common.copy' })}
            >
              {copiedClient ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copiedClient ?
                <FormattedMessage id="common.copied" defaultMessage="Copié !" /> :
                <FormattedMessage id="common.copy" defaultMessage="Copier" />
              }</span>
            </button>
            {typeof navigator.share === 'function' && (
              <button
                onClick={() => shareLink(
                  clientLinkUrl,
                  intl.formatMessage({ id: 'chatter.links.share.title', defaultMessage: 'Rejoignez SOS-Expat' }),
                  intl.formatMessage({ id: 'chatter.links.share.text', defaultMessage: 'Obtenez de l\'aide de professionnels expatriés' })
                )}
                className={`${UI.button.primary} min-h-[48px] min-w-[48px] flex items-center justify-center active:scale-[0.98]`}
                title={intl.formatMessage({ id: 'common.share' })}
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Commission Info */}
        <p className="text-sm text-gray-500 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 rounded-lg px-3 py-2">
          💰 <FormattedMessage
            id="chatter.links.client.commission"
            defaultMessage="Commission : $2 par appel payé"
          />
        </p>
      </div>

      {/* Recruitment Referral Link - Mobile optimized */}
      <div className={`${UI.card} p-4 sm:p-6`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/30 flex-shrink-0">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                <FormattedMessage id="chatter.links.recruitment.title" defaultMessage="Lien Recrutement" />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.links.recruitment.desc" defaultMessage="Recrutez des prestataires, gagnez pendant 6 mois" />
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 sm:block sm:text-right bg-purple-50 dark:bg-purple-900/20 sm:bg-transparent rounded-xl p-3 sm:p-0">
            <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">
              {totalRecruitmentConversions}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.links.recruits" defaultMessage="recrutés" />
            </p>
          </div>
        </div>

        {/* Code Display - Prominent */}
        <div className="mb-4 p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200/50 dark:border-purple-800/30">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            <FormattedMessage id="chatter.links.yourCode" defaultMessage="Votre code" />
          </p>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 tracking-wider">
            {affiliateCodeRecruitment}
          </p>
        </div>

        {/* Link Display - Mobile optimized with stacked layout */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center px-4 py-3 min-h-[48px] bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10">
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {recruitmentLinkUrl}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyLink(recruitmentLinkUrl, 'recruitment')}
              className={`flex-1 min-h-[48px] rounded-xl font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98] ${
                copiedRecruitment
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200'
              }`}
              title={intl.formatMessage({ id: copiedRecruitment ? 'common.copied' : 'common.copy' })}
            >
              {copiedRecruitment ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copiedRecruitment ?
                <FormattedMessage id="common.copied" defaultMessage="Copié !" /> :
                <FormattedMessage id="common.copy" defaultMessage="Copier" />
              }</span>
            </button>
            {typeof navigator.share === 'function' && (
              <button
                onClick={() => shareLink(
                  recruitmentLinkUrl,
                  intl.formatMessage({ id: 'chatter.links.recruitment.share.title', defaultMessage: 'Devenez prestataire SOS-Expat' }),
                  intl.formatMessage({ id: 'chatter.links.recruitment.share.text', defaultMessage: 'Rejoignez notre réseau et aidez les expatriés' })
                )}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl min-h-[48px] min-w-[48px] flex items-center justify-center active:scale-[0.98] transition-all"
                title={intl.formatMessage({ id: 'common.share' })}
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Commission Info */}
        <p className="text-sm text-gray-500 dark:text-gray-400 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2">
          💰 <FormattedMessage
            id="chatter.links.recruitment.commission"
            defaultMessage="Commission : $1 par appel du prestataire recruté (pendant 6 mois)"
          />
        </p>
      </div>
    </div>
  );
};

export default ChatterAffiliateLinks;

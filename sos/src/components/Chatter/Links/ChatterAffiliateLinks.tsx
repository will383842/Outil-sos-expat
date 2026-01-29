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
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
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
    <div className="space-y-4">
      {/* Client Referral Link */}
      <div className={`${UI.card} p-6`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center">
              <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.links.client.title" defaultMessage="Lien Client" />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.links.client.desc" defaultMessage="Partagez pour gagner sur chaque appel payé" />
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {totalClientConversions}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.links.conversions" defaultMessage="conversions" />
            </p>
          </div>
        </div>

        {/* Code Display */}
        <div className="mb-4 p-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            <FormattedMessage id="chatter.links.yourCode" defaultMessage="Votre code" />
          </p>
          <p className="text-xl font-bold text-amber-600 dark:text-amber-400 tracking-wider">
            {affiliateCodeClient}
          </p>
        </div>

        {/* Link Display */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {clientLinkUrl}
            </span>
          </div>
          <button
            onClick={() => copyLink(clientLinkUrl, 'client')}
            className={`${UI.button.secondary} p-3 flex-shrink-0 ${
              copiedClient ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : ''
            }`}
            title={intl.formatMessage({ id: copiedClient ? 'common.copied' : 'common.copy' })}
          >
            {copiedClient ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          {typeof navigator.share === 'function' && (
            <button
              onClick={() => shareLink(
                clientLinkUrl,
                intl.formatMessage({ id: 'chatter.links.share.title', defaultMessage: 'Rejoignez SOS-Expat' }),
                intl.formatMessage({ id: 'chatter.links.share.text', defaultMessage: 'Obtenez de l\'aide de professionnels expatriés' })
              )}
              className={`${UI.button.primary} p-3 flex-shrink-0`}
              title={intl.formatMessage({ id: 'common.share' })}
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Commission Info */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <FormattedMessage
            id="chatter.links.client.commission"
            defaultMessage="Commission : 1 000 FCFA par appel payé"
          />
        </p>
      </div>

      {/* Recruitment Referral Link */}
      <div className={`${UI.card} p-6`}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="chatter.links.recruitment.title" defaultMessage="Lien Recrutement" />
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.links.recruitment.desc" defaultMessage="Recrutez des prestataires, gagnez pendant 6 mois" />
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {totalRecruitmentConversions}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.links.recruits" defaultMessage="recrutés" />
            </p>
          </div>
        </div>

        {/* Code Display */}
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            <FormattedMessage id="chatter.links.yourCode" defaultMessage="Votre code" />
          </p>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400 tracking-wider">
            {affiliateCodeRecruitment}
          </p>
        </div>

        {/* Link Display */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center px-4 py-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
            <span className="text-sm text-gray-600 dark:text-gray-300 truncate">
              {recruitmentLinkUrl}
            </span>
          </div>
          <button
            onClick={() => copyLink(recruitmentLinkUrl, 'recruitment')}
            className={`${UI.button.secondary} p-3 flex-shrink-0 ${
              copiedRecruitment ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : ''
            }`}
            title={intl.formatMessage({ id: copiedRecruitment ? 'common.copied' : 'common.copy' })}
          >
            {copiedRecruitment ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          {typeof navigator.share === 'function' && (
            <button
              onClick={() => shareLink(
                recruitmentLinkUrl,
                intl.formatMessage({ id: 'chatter.links.recruitment.share.title', defaultMessage: 'Devenez prestataire SOS-Expat' }),
                intl.formatMessage({ id: 'chatter.links.recruitment.share.text', defaultMessage: 'Rejoignez notre réseau et aidez les expatriés' })
              )}
              className={`${UI.button.primary} p-3 flex-shrink-0`}
              title={intl.formatMessage({ id: 'common.share' })}
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Commission Info */}
        <p className="text-xs text-gray-500 dark:text-gray-400">
          <FormattedMessage
            id="chatter.links.recruitment.commission"
            defaultMessage="Commission : 500 FCFA par appel du prestataire recruté (pendant 6 mois)"
          />
        </p>
      </div>
    </div>
  );
};

export default ChatterAffiliateLinks;

/**
 * InfluencerAffiliateLinks - Display and copy affiliate links
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { Copy, Check, ExternalLink, Percent, Users } from 'lucide-react';

interface InfluencerAffiliateLinksProps {
  clientCode: string;
  recruitmentCode: string;
  clientDiscount: number;
}

const InfluencerAffiliateLinks: React.FC<InfluencerAffiliateLinksProps> = ({
  clientCode,
  recruitmentCode,
  clientDiscount,
}) => {
  const intl = useIntl();
  const [copiedClient, setCopiedClient] = useState(false);
  const [copiedRecruit, setCopiedRecruit] = useState(false);

  const clientLink = `https://sos-expat.com/ref/i/${clientCode}`;
  const recruitLink = `https://sos-expat.com/rec/i/${recruitmentCode}`;

  const copyToClipboard = (text: string, type: 'client' | 'recruit') => {
    navigator.clipboard.writeText(text);
    if (type === 'client') {
      setCopiedClient(true);
      setTimeout(() => setCopiedClient(false), 2000);
    } else {
      setCopiedRecruit(true);
      setTimeout(() => setCopiedRecruit(false), 2000);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Client Referral Link - Mobile optimized */}
      <div className="bg-gradient-to-br from-red-50 dark:from-red-900/20 to-red-100 dark:to-red-800/10 border dark:border-red-800/30 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-red-500 flex items-center justify-center shadow-lg">
            <Percent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="influencer.links.client.title" defaultMessage="Lien parrainage client" />
            </h3>
            <p className="text-sm dark:text-green-400 font-medium">
              <FormattedMessage
                id="influencer.links.client.discount"
                defaultMessage="{discount}% de remise automatique"
                values={{ discount: clientDiscount }}
              />
            </p>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 font-bold">
            {clientCode}
          </span>
        </div>

        {/* Mobile: Stack vertically */}
        <div className="space-y-2">
          <div className="w-full bg-white dark:bg-gray-800 rounded-xl px-4 py-3 min-h-[48px] font-mono text-sm dark:text-gray-300 overflow-x-auto border dark:border-gray-700 flex items-center">
            <span className="truncate">{clientLink}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(clientLink, 'client')}
              className="flex-1 min-h-[48px] rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors items-center justify-center gap-2 font-medium active:scale-[0.98]"
              title={intl.formatMessage({ id: 'common.copy', defaultMessage: 'Copier' })}
            >
              {copiedClient ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copiedClient ?
                <FormattedMessage id="common.copied" defaultMessage="Copié !" /> :
                <FormattedMessage id="common.copy" defaultMessage="Copier" />
              }</span>
            </button>
            <a
              href={clientLink}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-center active:scale-[0.98]"
              title={intl.formatMessage({ id: 'common.openLink', defaultMessage: 'Ouvrir' })}
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Mobile code display */}
        <div className="mt-3 flex items-center gap-2 sm:hidden">
          <span className="text-sm dark:text-gray-300">
            <FormattedMessage id="influencer.links.code" defaultMessage="Code:" />
          </span>
          <span className="font-mono text-red-600 dark:text-red-400">{clientCode}</span>
        </div>
      </div>

      {/* Recruitment Link - Mobile optimized */}
      <div className="bg-gradient-to-br from-purple-50 dark:from-purple-900/20 to-purple-100 dark:to-purple-800/10 border dark:border-purple-800/30 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="influencer.links.recruit.title" defaultMessage="Lien recrutement prestataire" />
            </h3>
            <p className="text-sm dark:text-purple-400 font-medium">
              <FormattedMessage
                id="influencer.links.recruit.info"
                defaultMessage="$5 par appel reçu pendant 6 mois"
              />
            </p>
          </div>
          <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold">
            {recruitmentCode}
          </span>
        </div>

        {/* Mobile: Stack vertically */}
        <div className="space-y-2">
          <div className="w-full bg-white dark:bg-gray-800 rounded-xl px-4 py-3 min-h-[48px] font-mono text-sm dark:text-gray-300 overflow-x-auto border dark:border-gray-700 flex items-center">
            <span className="truncate">{recruitLink}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => copyToClipboard(recruitLink, 'recruit')}
              className="flex-1 min-h-[48px] rounded-xl bg-purple-500 hover:bg-purple-600 text-white transition-colors items-center justify-center gap-2 font-medium active:scale-[0.98]"
              title={intl.formatMessage({ id: 'common.copy', defaultMessage: 'Copier' })}
            >
              {copiedRecruit ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              <span>{copiedRecruit ?
                <FormattedMessage id="common.copied" defaultMessage="Copié !" /> :
                <FormattedMessage id="common.copy" defaultMessage="Copier" />
              }</span>
            </button>
            <a
              href={recruitLink}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors flex items-center justify-center active:scale-[0.98]"
              title={intl.formatMessage({ id: 'common.openLink', defaultMessage: 'Ouvrir' })}
            >
              <ExternalLink className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Mobile code display */}
        <div className="mt-3 flex items-center gap-2 sm:hidden">
          <span className="text-sm dark:text-gray-300">
            <FormattedMessage id="influencer.links.code" defaultMessage="Code:" />
          </span>
          <span className="font-mono text-purple-600 dark:text-purple-400">{recruitmentCode}</span>
        </div>
      </div>
    </div>
  );
};

export default InfluencerAffiliateLinks;

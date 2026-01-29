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
    <div className="space-y-6">
      {/* Client Referral Link */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <Percent className="w-4 h-4 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="influencer.links.client.title" defaultMessage="Lien parrainage client" />
            </h3>
            <p className="text-xs text-green-600 dark:text-green-400">
              <FormattedMessage
                id="influencer.links.client.discount"
                defaultMessage="{discount}% de remise automatique"
                values={{ discount: clientDiscount }}
              />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
            {clientLink}
          </div>
          <button
            onClick={() => copyToClipboard(clientLink, 'client')}
            className="p-3 rounded-xl bg-red-500 hover:bg-red-600 text-white transition-colors"
            title={intl.formatMessage({ id: 'common.copy', defaultMessage: 'Copier' })}
          >
            {copiedClient ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          <a
            href={clientLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            title={intl.formatMessage({ id: 'common.openLink', defaultMessage: 'Ouvrir' })}
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            <FormattedMessage id="influencer.links.code" defaultMessage="Code:" />
          </span>
          <span className="font-mono font-bold text-red-600 dark:text-red-400">{clientCode}</span>
        </div>
      </div>

      {/* Recruitment Link */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
            <Users className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="influencer.links.recruit.title" defaultMessage="Lien recrutement prestataire" />
            </h3>
            <p className="text-xs text-purple-600 dark:text-purple-400">
              <FormattedMessage
                id="influencer.links.recruit.info"
                defaultMessage="$5 par appel reçu pendant 6 mois"
              />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-xl px-4 py-3 font-mono text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
            {recruitLink}
          </div>
          <button
            onClick={() => copyToClipboard(recruitLink, 'recruit')}
            className="p-3 rounded-xl bg-purple-500 hover:bg-purple-600 text-white transition-colors"
            title={intl.formatMessage({ id: 'common.copy', defaultMessage: 'Copier' })}
          >
            {copiedRecruit ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
          <a
            href={recruitLink}
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            title={intl.formatMessage({ id: 'common.openLink', defaultMessage: 'Ouvrir' })}
          >
            <ExternalLink className="w-5 h-5" />
          </a>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            <FormattedMessage id="influencer.links.code" defaultMessage="Code:" />
          </span>
          <span className="font-mono font-bold text-purple-600 dark:text-purple-400">{recruitmentCode}</span>
        </div>
      </div>
    </div>
  );
};

export default InfluencerAffiliateLinks;

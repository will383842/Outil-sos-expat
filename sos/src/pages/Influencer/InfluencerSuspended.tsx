/**
 * InfluencerSuspended - Page shown when account is suspended
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useInfluencer } from '@/hooks/useInfluencer';
import Layout from '@/components/layout/Layout';
import { AlertTriangle, Mail } from 'lucide-react';

const InfluencerSuspended: React.FC = () => {
  const { dashboard } = useInfluencer();

  return (
    <Layout>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-black px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle className="w-10 h-10 text-red-600 dark:text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="influencer.suspended.title" defaultMessage="Compte suspendu" />
          </h1>

          <p className="text-gray-600 dark:text-gray-400 mb-6">
            <FormattedMessage
              id="influencer.suspended.message"
              defaultMessage="Votre compte influenceur a été suspendu. Si vous pensez qu'il s'agit d'une erreur, veuillez contacter notre équipe support."
            />
          </p>

          {dashboard?.influencer?.suspensionReason && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6">
              <p className="text-sm text-red-700 dark:text-red-400">
                <strong>
                  <FormattedMessage id="influencer.suspended.reason" defaultMessage="Motif :" />
                </strong>{' '}
                {dashboard.influencer.suspensionReason}
              </p>
            </div>
          )}

          <a
            href="mailto:support@sos-expat.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-colors"
          >
            <Mail className="w-5 h-5" />
            <FormattedMessage id="influencer.suspended.contact" defaultMessage="Contacter le support" />
          </a>
        </div>
      </div>
    </Layout>
  );
};

export default InfluencerSuspended;

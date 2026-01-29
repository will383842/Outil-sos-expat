/**
 * InfluencerReferrals - List of recruited providers
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import { Users, DollarSign, Calendar } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const InfluencerReferrals: React.FC = () => {
  const intl = useIntl();

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="influencer.referrals.title" defaultMessage="Mes filleuls" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="influencer.referrals.subtitle" defaultMessage="Prestataires recrutés via votre lien" />
          </p>
        </div>

        <div className={`${UI.card} p-8 text-center`}>
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="influencer.referrals.empty"
              defaultMessage="Vous n'avez pas encore recruté de prestataires. Partagez votre lien de recrutement pour gagner $5 par appel reçu pendant 6 mois."
            />
          </p>
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerReferrals;

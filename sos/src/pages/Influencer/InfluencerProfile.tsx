/**
 * InfluencerProfile - Profile settings and payment details
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useInfluencer } from '@/hooks/useInfluencer';
import type { InfluencerPlatform } from '@/types/influencer';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import { User, Globe, CreditCard, Settings } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const InfluencerProfile: React.FC = () => {
  const intl = useIntl();
  const { dashboardData: dashboard } = useInfluencer();
  const influencer = dashboard?.influencer;

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="influencer.profile.title" defaultMessage="Mon profil" />
          </h1>
          <p className="text-gray-700 dark:text-gray-700">
            <FormattedMessage id="influencer.profile.subtitle" defaultMessage="Gérez vos informations personnelles et paramètres de paiement" />
          </p>
        </div>

        {/* Personal Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-red-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="influencer.profile.personal" defaultMessage="Informations personnelles" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="influencer.profile.name" defaultMessage="Nom" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.firstName} {influencer?.lastName}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="influencer.profile.email" defaultMessage="Email" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.email}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="influencer.profile.country" defaultMessage="Pays" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.country}</p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="influencer.profile.language" defaultMessage="Langue" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.language}</p>
            </div>
          </div>
        </div>

        {/* Platforms */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="influencer.profile.platforms" defaultMessage="Plateformes" />
            </h2>
          </div>
          <div className="flex gap-2">
            {influencer?.platforms?.map((platform: InfluencerPlatform) => (
              <span
                key={platform}
                className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400"
              >
                {platform}
              </span>
            ))}
          </div>
          {influencer?.bio && (
            <div className="mt-4">
              <label className="text-sm dark:text-gray-700 block mb-1">
                <FormattedMessage id="influencer.profile.bio" defaultMessage="Bio" />
              </label>
              <p className="text-gray-700 dark:text-gray-700">{influencer.bio}</p>
            </div>
          )}
        </div>

        {/* Affiliate Codes */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="influencer.profile.codes" defaultMessage="Codes d'affiliation" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="influencer.profile.clientCode" defaultMessage="Code client (5% remise)" />
              </label>
              <p className="text-xl dark:text-red-400 font-mono">
                {influencer?.affiliateCodeClient}
              </p>
            </div>
            <div>
              <label className="text-sm dark:text-gray-700">
                <FormattedMessage id="influencer.profile.recruitCode" defaultMessage="Code recrutement" />
              </label>
              <p className="text-xl dark:text-purple-400 font-mono">
                {influencer?.affiliateCodeRecruitment}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-green-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="influencer.profile.payment" defaultMessage="Paramètres de paiement" />
            </h2>
          </div>
          <p className="text-gray-700 dark:text-gray-700">
            <FormattedMessage
              id="influencer.profile.paymentInfo"
              defaultMessage="Configurez votre méthode de paiement lors de votre première demande de retrait."
            />
          </p>
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerProfile;

/**
 * InfluencerProfile - Profile settings and payment details
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useInfluencer } from '@/hooks/useInfluencer';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import { User, Globe, CreditCard, Settings } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const InfluencerProfile: React.FC = () => {
  const intl = useIntl();
  const { dashboard } = useInfluencer();
  const influencer = dashboard?.influencer;

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="influencer.profile.title" defaultMessage="Mon profil" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="influencer.profile.subtitle" defaultMessage="Gérez vos informations personnelles et paramètres de paiement" />
          </p>
        </div>

        {/* Personal Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="influencer.profile.personal" defaultMessage="Informations personnelles" />
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="influencer.profile.name" defaultMessage="Nom" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.firstName} {influencer?.lastName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="influencer.profile.email" defaultMessage="Email" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="influencer.profile.country" defaultMessage="Pays" />
              </label>
              <p className="text-gray-900 dark:text-white">{influencer?.country}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="influencer.profile.platforms" defaultMessage="Plateformes" />
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {influencer?.platforms?.map((platform) => (
              <span
                key={platform}
                className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-sm"
              >
                {platform}
              </span>
            ))}
          </div>
          {influencer?.bio && (
            <div className="mt-4">
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="influencer.profile.bio" defaultMessage="Bio" />
              </label>
              <p className="text-gray-700 dark:text-gray-300">{influencer.bio}</p>
            </div>
          )}
        </div>

        {/* Affiliate Codes */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="influencer.profile.codes" defaultMessage="Codes d'affiliation" />
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="influencer.profile.clientCode" defaultMessage="Code client (5% remise)" />
              </label>
              <p className="text-xl font-mono font-bold text-red-600 dark:text-red-400">
                {influencer?.affiliateCodeClient}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="influencer.profile.recruitCode" defaultMessage="Code recrutement" />
              </label>
              <p className="text-xl font-mono font-bold text-purple-600 dark:text-purple-400">
                {influencer?.affiliateCodeRecruitment}
              </p>
            </div>
          </div>
        </div>

        {/* Payment Settings */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="influencer.profile.payment" defaultMessage="Paramètres de paiement" />
            </h2>
          </div>
          {influencer?.preferredPaymentMethod ? (
            <div>
              <p className="text-gray-700 dark:text-gray-300">
                <FormattedMessage id="influencer.profile.paymentMethod" defaultMessage="Méthode préférée:" />{' '}
                <span className="font-medium capitalize">{influencer.preferredPaymentMethod}</span>
              </p>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="influencer.profile.noPayment"
                defaultMessage="Aucune méthode de paiement configurée. Configurez-en une lors de votre première demande de retrait."
              />
            </p>
          )}
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerProfile;

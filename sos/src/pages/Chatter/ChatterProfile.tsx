/**
 * ChatterProfile - Profile settings and performance stats for Chatters
 * Displays personal info, platforms, affiliate codes, level, badges, and stats
 */

import React from 'react';
import { FormattedMessage } from 'react-intl';
import { useChatter } from '@/hooks/useChatter';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';
import { User, Globe, Settings, Trophy, CreditCard, Badge, Loader2 } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const ChatterProfile: React.FC = () => {
  const { dashboardData, isLoading } = useChatter();
  const chatter = dashboardData?.chatter;

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (isLoading) {
    return (
      <ChatterDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-red-500" />
        </div>
      </ChatterDashboardLayout>
    );
  }

  if (!chatter) return null;

  return (
    <ChatterDashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="chatter.profile.title" defaultMessage="Mon profil" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="chatter.profile.subtitle" defaultMessage="Vos informations personnelles et statistiques" />
          </p>
        </div>

        {/* Personal Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-red-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="chatter.profile.personal" defaultMessage="Informations personnelles" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.name" defaultMessage="Nom" />
              </label>
              <p className="text-gray-900 dark:text-white font-medium">{chatter.firstName} {chatter.lastName}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.email" defaultMessage="Email" />
              </label>
              <p className="text-gray-900 dark:text-white">{chatter.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.country" defaultMessage="Pays" />
              </label>
              <p className="text-gray-900 dark:text-white">{chatter.country}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.language" defaultMessage="Langue" />
              </label>
              <p className="text-gray-900 dark:text-white uppercase">{chatter.language}</p>
            </div>
            {chatter.phone && (
              <div>
                <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                  <FormattedMessage id="chatter.profile.phone" defaultMessage="Téléphone" />
                </label>
                <p className="text-gray-900 dark:text-white">{chatter.phone}</p>
              </div>
            )}
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.status" defaultMessage="Statut" />
              </label>
              <p className={`font-medium ${
                chatter.status === 'active' ? 'text-green-600' :
                chatter.status === 'suspended' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {chatter.status === 'active' ? 'Actif' :
                 chatter.status === 'suspended' ? 'Suspendu' : 'Bloqué'}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.memberSince" defaultMessage="Membre depuis" />
              </label>
              <p className="text-gray-900 dark:text-white">
                {new Date(chatter.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Platforms & Bio */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="chatter.profile.platforms" defaultMessage="Plateformes de promotion" />
            </h2>
          </div>
          {chatter.platforms && chatter.platforms.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-4">
              {chatter.platforms.map((platform) => (
                <span
                  key={platform}
                  className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium capitalize"
                >
                  {platform}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm mb-4">
              <FormattedMessage id="chatter.profile.noPlatforms" defaultMessage="Aucune plateforme renseignée" />
            </p>
          )}
          {chatter.bio && (
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.bio" defaultMessage="Bio" />
              </label>
              <p className="text-gray-700 dark:text-gray-300 text-sm">{chatter.bio}</p>
            </div>
          )}
        </div>

        {/* Affiliate Codes */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-5 h-5 text-purple-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="chatter.profile.codes" defaultMessage="Codes d'affiliation" />
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.clientCode" defaultMessage="Code client ($5 remise)" />
              </label>
              <p className="text-xl text-red-600 dark:text-red-400 font-mono font-bold tracking-wider">
                {chatter.affiliateCodeClient}
              </p>
            </div>
            <div>
              <label className="text-sm text-gray-500 dark:text-gray-400 block mb-1">
                <FormattedMessage id="chatter.profile.recruitCode" defaultMessage="Code recrutement" />
              </label>
              <p className="text-xl text-orange-600 dark:text-orange-400 font-mono font-bold tracking-wider">
                {chatter.affiliateCodeRecruitment}
              </p>
            </div>
          </div>
        </div>

        {/* Level & Performance */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="chatter.profile.performance" defaultMessage="Performance" />
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl text-center">
              <p className="text-2xl dark:text-white font-bold">{chatter.level}<span className="text-sm text-gray-500 dark:text-gray-400">/5</span></p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <FormattedMessage id="chatter.profile.level" defaultMessage="Niveau" />
              </p>
              <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                <div
                  className="h-1.5 bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
                  style={{ width: `${chatter.levelProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">{chatter.levelProgress}%</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
              <p className="text-2xl dark:text-white font-bold">{chatter.currentStreak}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <FormattedMessage id="chatter.profile.streak" defaultMessage="Streak actuel" />
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
              <p className="text-2xl dark:text-white font-bold">{chatter.bestStreak}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <FormattedMessage id="chatter.profile.bestStreak" defaultMessage="Meilleur streak" />
              </p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl text-center">
              <p className="text-2xl dark:text-white font-bold">
                {chatter.currentMonthRank ? `#${chatter.currentMonthRank}` : '-'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <FormattedMessage id="chatter.profile.rank" defaultMessage="Rang mensuel" />
              </p>
            </div>
          </div>

          {/* Badges */}
          {chatter.badges && chatter.badges.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className="w-4 h-4 text-yellow-500" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.profile.badges" defaultMessage="Badges débloqués" />
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {chatter.badges.map((badge) => (
                  <span
                    key={badge}
                    className="px-3 py-1 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400 rounded-full text-xs font-medium"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Stats Summary */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-5 h-5 text-green-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="chatter.profile.stats" defaultMessage="Statistiques" />
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold text-green-600 dark:text-green-400">
                {formatCurrency(chatter.totalEarned)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <FormattedMessage id="chatter.profile.totalEarned" defaultMessage="Total gagné" />
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold">{chatter.totalClients}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <FormattedMessage id="chatter.profile.clients" defaultMessage="Clients" />
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold">{chatter.totalRecruits}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <FormattedMessage id="chatter.profile.recruits" defaultMessage="Filleuls" />
              </p>
            </div>
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <p className="text-2xl dark:text-white font-bold">{formatCurrency(chatter.availableBalance)}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <FormattedMessage id="chatter.profile.available" defaultMessage="Disponible" />
              </p>
            </div>
          </div>
        </div>

        {/* Payment Info */}
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 mb-3">
            <CreditCard className="w-5 h-5 text-green-500" />
            <h2 className="text-lg dark:text-white font-semibold">
              <FormattedMessage id="chatter.profile.payment" defaultMessage="Paramètres de paiement" />
            </h2>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="chatter.profile.paymentInfo"
              defaultMessage="Configurez votre méthode de paiement lors de votre première demande de retrait dans la section Paiements."
            />
          </p>
        </div>

        {/* Telegram Status */}
        {chatter.telegram_id && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <p className="text-sm text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <span className="text-lg">✈️</span>
              <FormattedMessage
                id="chatter.profile.telegramLinked"
                defaultMessage="Telegram lié — Bonus $50 débloqué à $150 de commissions clients."
              />
            </p>
          </div>
        )}

      </div>
    </ChatterDashboardLayout>
  );
};

export default ChatterProfile;

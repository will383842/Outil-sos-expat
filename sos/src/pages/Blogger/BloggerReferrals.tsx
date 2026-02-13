/**
 * BloggerReferrals - List of recruited providers for bloggers
 */

import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { BloggerDashboardLayout } from '@/components/Blogger';
import { useBlogger } from '@/hooks/useBlogger';
import { Users, DollarSign, Calendar, Loader2, CheckCircle, Clock } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const BloggerReferrals: React.FC = () => {
  const intl = useIntl();
  const { dashboardData, isLoading, blogger } = useBlogger();

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  if (isLoading) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </BloggerDashboardLayout>
    );
  }

  const recruits = dashboardData?.recruitedProviders || [];

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white font-bold">
            <FormattedMessage id="blogger.referrals.title" defaultMessage="Mes filleuls" />
          </h1>
          <p className="text-gray-700 dark:text-gray-700">
            <FormattedMessage id="blogger.referrals.subtitle" defaultMessage="Prestataires recrutés via votre lien" />
          </p>
        </div>

        {/* Stats Summary */}
        <div className="grid md:grid-cols-3 gap-4">
          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 dark:text-gray-700">
                <FormattedMessage id="blogger.referrals.totalRecruits" defaultMessage="Total recrutés" />
              </span>
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <p className="text-2xl dark:text-white font-bold">
              {blogger?.totalRecruits || 0}
            </p>
          </div>
          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 dark:text-gray-700">
                <FormattedMessage id="blogger.referrals.activeRecruits" defaultMessage="Actifs (6 mois)" />
              </span>
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <p className="text-2xl dark:text-green-400 font-bold">
              {recruits.filter(r => r.isActive).length}
            </p>
          </div>
          <div className={`${UI.card} p-5`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-700 dark:text-gray-700">
                <FormattedMessage id="blogger.referrals.totalEarned" defaultMessage="Gains recrutement" />
              </span>
              <DollarSign className="w-5 h-5 text-purple-500" />
            </div>
            <p className="text-2xl dark:text-purple-400 font-bold">
              {formatCurrency(dashboardData?.recruitmentEarnings || 0)}
            </p>
          </div>
        </div>

        {/* Commission Explanation */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border dark:border-blue-800 rounded-xl p-4">
          <p className="text-blue-700 dark:text-blue-300">
            <FormattedMessage
              id="blogger.referrals.explanation"
              defaultMessage="Vous gagnez $5 pour chaque appel reçu par vos filleuls pendant 6 mois après leur inscription. La période de commission est calculée à partir de la date d'inscription du prestataire."
            />
          </p>
        </div>

        {/* Recruits List */}
        <div className={`${UI.card} overflow-hidden`}>
          {recruits.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left dark:text-gray-700 font-medium uppercase tracking-wider">
                      <FormattedMessage id="blogger.referrals.table.provider" defaultMessage="Prestataire" />
                    </th>
                    <th className="px-6 py-3 text-left dark:text-gray-700 font-medium uppercase tracking-wider">
                      <FormattedMessage id="blogger.referrals.table.date" defaultMessage="Date d'inscription" />
                    </th>
                    <th className="px-6 py-3 text-left dark:text-gray-700 font-medium uppercase tracking-wider">
                      <FormattedMessage id="blogger.referrals.table.expires" defaultMessage="Expire le" />
                    </th>
                    <th className="px-6 py-3 text-left dark:text-gray-700 font-medium uppercase tracking-wider">
                      <FormattedMessage id="blogger.referrals.table.status" defaultMessage="Statut" />
                    </th>
                    <th className="px-6 py-3 text-right dark:text-gray-700 font-medium uppercase tracking-wider">
                      <FormattedMessage id="blogger.referrals.table.calls" defaultMessage="Appels" />
                    </th>
                    <th className="px-6 py-3 text-right dark:text-gray-700 font-medium uppercase tracking-wider">
                      <FormattedMessage id="blogger.referrals.table.earned" defaultMessage="Gagné" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-gray-700">
                  {recruits.map((recruit) => {
                    const registrationDate = new Date(recruit.registeredAt);
                    const expirationDate = new Date(recruit.commissionExpiresAt);
                    const isExpired = !recruit.isActive;

                    return (
                      <tr key={recruit.providerId} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm dark:text-white font-medium">
                            {recruit.providerDisplayName}
                          </div>
                          <div className="text-xs dark:text-gray-600">
                            {recruit.providerSpecialty}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-700">
                          {registrationDate.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-gray-700">
                          {expirationDate.toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {recruit.isActive ? (
                            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                              <CheckCircle className="w-4 h-4" />
                              <FormattedMessage id="blogger.referrals.active" defaultMessage="Actif" />
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-700 dark:text-gray-700">
                              <Clock className="w-4 h-4" />
                              <FormattedMessage id="blogger.referrals.expired" defaultMessage="Expiré" />
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white">
                          {recruit.totalCalls || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-green-400 font-medium">
                          {formatCurrency(recruit.totalEarned || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={`p-8 text-center`}>
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-600 dark:text-gray-400" />
              <p className="text-gray-700 dark:text-gray-700">
                <FormattedMessage
                  id="blogger.referrals.empty"
                  defaultMessage="Vous n'avez pas encore recruté de prestataires. Partagez votre lien de recrutement pour gagner $5 par appel reçu pendant 6 mois."
                />
              </p>
            </div>
          )}
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerReferrals;

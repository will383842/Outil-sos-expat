/**
 * InfluencerEarnings - Detailed earnings/commissions history
 */

import React, { useEffect, useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useInfluencer } from '@/hooks/useInfluencer';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { DollarSign, Filter, Download } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
} as const;

const InfluencerEarnings: React.FC = () => {
  const intl = useIntl();
  const { dashboard, loading, refreshDashboard } = useInfluencer();
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    refreshDashboard();
  }, []);

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const commissions = dashboard?.recentCommissions || [];
  const filteredCommissions = filter === 'all'
    ? commissions
    : commissions.filter(c => c.type === filter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'validated': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'paid': return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
      case 'cancelled': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading && !dashboard) {
    return (
      <InfluencerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingSpinner size="large" color="red" />
        </div>
      </InfluencerDashboardLayout>
    );
  }

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="influencer.earnings.title" defaultMessage="Mes gains" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.earnings.subtitle" defaultMessage="Historique de toutes vos commissions" />
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.earnings.total" defaultMessage="Total gagné" />
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(dashboard?.influencer?.totalEarned || 0)}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.earnings.available" defaultMessage="Disponible" />
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(dashboard?.influencer?.availableBalance || 0)}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.earnings.pending" defaultMessage="En attente" />
            </p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency(dashboard?.influencer?.pendingBalance || 0)}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.earnings.commissions" defaultMessage="Commissions" />
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {dashboard?.influencer?.totalCommissions || 0}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className={`${UI.card} p-4`}>
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              <option value="all">
                {intl.formatMessage({ id: 'influencer.earnings.filter.all', defaultMessage: 'Toutes les commissions' })}
              </option>
              <option value="client_referral">
                {intl.formatMessage({ id: 'influencer.earnings.filter.client', defaultMessage: 'Clients référés' })}
              </option>
              <option value="recruitment">
                {intl.formatMessage({ id: 'influencer.earnings.filter.recruitment', defaultMessage: 'Recrutement' })}
              </option>
            </select>
          </div>
        </div>

        {/* Commissions List */}
        <div className={`${UI.card} overflow-hidden`}>
          {filteredCommissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FormattedMessage id="influencer.earnings.table.date" defaultMessage="Date" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FormattedMessage id="influencer.earnings.table.type" defaultMessage="Type" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FormattedMessage id="influencer.earnings.table.description" defaultMessage="Description" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FormattedMessage id="influencer.earnings.table.status" defaultMessage="Statut" />
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FormattedMessage id="influencer.earnings.table.amount" defaultMessage="Montant" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCommissions.map((commission) => (
                    <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          commission.type === 'client_referral'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {commission.type === 'client_referral'
                            ? intl.formatMessage({ id: 'influencer.type.client', defaultMessage: 'Client' })
                            : intl.formatMessage({ id: 'influencer.type.recruitment', defaultMessage: 'Recrutement' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {commission.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(commission.status)}`}>
                          {commission.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(commission.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <FormattedMessage
                id="influencer.earnings.empty"
                defaultMessage="Aucune commission pour le moment"
              />
            </div>
          )}
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerEarnings;

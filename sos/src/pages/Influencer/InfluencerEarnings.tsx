/**
 * InfluencerEarnings - Detailed earnings/commissions history
 * V2: Added CSV export and advanced filters
 */

import React, { useEffect, useState, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useInfluencer } from '@/hooks/useInfluencer';
import type { InfluencerCommission, InfluencerCommissionStatus } from '@/types/influencer';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import { DollarSign, Filter, Download, Calendar, X } from 'lucide-react';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/utils/csvExport';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
  select: "px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500",
  input: "px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500",
} as const;

const InfluencerEarnings: React.FC = () => {
  const intl = useIntl();
  const { dashboardData: dashboard, commissions: allCommissions, isLoading: loading, refreshDashboard } = useInfluencer();

  // Filters
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    refreshDashboard();
  }, []);

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Use allCommissions from subscription if available, otherwise fall back to dashboard
  const commissions: InfluencerCommission[] = allCommissions.length > 0
    ? allCommissions
    : dashboard?.recentCommissions || [];

  // Apply filters
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c: InfluencerCommission) => {
      // Type filter
      if (filterType !== 'all' && c.type !== filterType) return false;

      // Status filter
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;

      // Date from filter
      if (dateFrom) {
        const commissionDate = new Date(c.createdAt);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (commissionDate < fromDate) return false;
      }

      // Date to filter
      if (dateTo) {
        const commissionDate = new Date(c.createdAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (commissionDate > toDate) return false;
      }

      return true;
    });
  }, [commissions, filterType, filterStatus, dateFrom, dateTo]);

  // Clear all filters
  const clearFilters = () => {
    setFilterType('all');
    setFilterStatus('all');
    setDateFrom('');
    setDateTo('');
  };

  // Check if any filter is active
  const hasActiveFilters = filterType !== 'all' || filterStatus !== 'all' || dateFrom || dateTo;

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredCommissions.length === 0) return;

    const headers = [
      intl.formatMessage({ id: 'influencer.earnings.csv.date', defaultMessage: 'Date' }),
      intl.formatMessage({ id: 'influencer.earnings.csv.type', defaultMessage: 'Type' }),
      intl.formatMessage({ id: 'influencer.earnings.csv.description', defaultMessage: 'Description' }),
      intl.formatMessage({ id: 'influencer.earnings.csv.status', defaultMessage: 'Statut' }),
      intl.formatMessage({ id: 'influencer.earnings.csv.amount', defaultMessage: 'Montant ($)' }),
    ];

    const rows = filteredCommissions.map(c => [
      formatDateForCSV(c.createdAt),
      c.type === 'client_referral' ? 'Client référé' : c.type === 'recruitment' ? 'Recrutement' : c.type,
      c.referenceId || '-',
      c.status,
      formatCurrencyForCSV(c.finalAmount),
    ]);

    const filename = `commissions-${new Date().toISOString().split('T')[0]}.csv`;
    exportToCSV(headers, rows, filename);
  };

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

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available': return intl.formatMessage({ id: 'influencer.status.available', defaultMessage: 'Disponible' });
      case 'validated': return intl.formatMessage({ id: 'influencer.status.validated', defaultMessage: 'Validé' });
      case 'pending': return intl.formatMessage({ id: 'influencer.status.pending', defaultMessage: 'En attente' });
      case 'paid': return intl.formatMessage({ id: 'influencer.status.paid', defaultMessage: 'Payé' });
      case 'cancelled': return intl.formatMessage({ id: 'influencer.status.cancelled', defaultMessage: 'Annulé' });
      default: return status;
    }
  };

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    return filteredCommissions.reduce(
      (acc, c) => {
        acc.total += c.finalAmount;
        if (c.status === 'available') acc.available += c.finalAmount;
        if (c.status === 'pending' || c.status === 'validated') acc.pending += c.finalAmount;
        return acc;
      },
      { total: 0, available: 0, pending: 0 }
    );
  }, [filteredCommissions]);

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

          {/* Export Button */}
          <button
            onClick={handleExportCSV}
            disabled={filteredCommissions.length === 0}
            className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2 ${
              filteredCommissions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Download className="w-4 h-4" />
            <FormattedMessage id="influencer.earnings.export" defaultMessage="Exporter CSV" />
          </button>
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
              {formatCurrency((dashboard?.influencer?.pendingBalance || 0) + (dashboard?.influencer?.validatedBalance || 0))}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.earnings.filtered" defaultMessage="Filtré" />
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {filteredCommissions.length}
              <span className="text-sm font-normal text-gray-500 ml-1">
                <FormattedMessage id="influencer.earnings.commissions" defaultMessage="commissions" />
              </span>
            </p>
          </div>
        </div>

        {/* Filters - V2: Enhanced with status and date filters */}
        <div className={`${UI.card} p-4`}>
          <div className="flex flex-wrap items-center gap-4">
            <Filter className="w-5 h-5 text-gray-400" />

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={UI.select}
            >
              <option value="all">
                {intl.formatMessage({ id: 'influencer.earnings.filter.all', defaultMessage: 'Tous les types' })}
              </option>
              <option value="client_referral">
                {intl.formatMessage({ id: 'influencer.earnings.filter.client', defaultMessage: 'Clients référés' })}
              </option>
              <option value="recruitment">
                {intl.formatMessage({ id: 'influencer.earnings.filter.recruitment', defaultMessage: 'Recrutement' })}
              </option>
              <option value="manual_adjustment">
                {intl.formatMessage({ id: 'influencer.earnings.filter.adjustment', defaultMessage: 'Ajustements' })}
              </option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={UI.select}
            >
              <option value="all">
                {intl.formatMessage({ id: 'influencer.earnings.filter.allStatus', defaultMessage: 'Tous les statuts' })}
              </option>
              <option value="pending">
                {intl.formatMessage({ id: 'influencer.earnings.filter.pending', defaultMessage: 'En attente' })}
              </option>
              <option value="validated">
                {intl.formatMessage({ id: 'influencer.earnings.filter.validated', defaultMessage: 'Validé' })}
              </option>
              <option value="available">
                {intl.formatMessage({ id: 'influencer.earnings.filter.available', defaultMessage: 'Disponible' })}
              </option>
              <option value="paid">
                {intl.formatMessage({ id: 'influencer.earnings.filter.paid', defaultMessage: 'Payé' })}
              </option>
              <option value="cancelled">
                {intl.formatMessage({ id: 'influencer.earnings.filter.cancelled', defaultMessage: 'Annulé' })}
              </option>
            </select>

            {/* Date From */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className={UI.input}
                placeholder="Du"
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={UI.input}
                placeholder="Au"
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-red-500 hover:text-red-600"
              >
                <X className="w-4 h-4" />
                <FormattedMessage id="influencer.earnings.clearFilters" defaultMessage="Effacer" />
              </button>
            )}
          </div>

          {/* Filter Summary */}
          {hasActiveFilters && (
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="influencer.earnings.filterSummary"
                defaultMessage="{count} commission(s) - Total: {total}"
                values={{
                  count: filteredCommissions.length,
                  total: formatCurrency(filteredTotals.total),
                }}
              />
            </div>
          )}
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
                  {filteredCommissions.map((commission: InfluencerCommission) => (
                    <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          commission.type === 'client_referral'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : commission.type === 'recruitment'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {commission.type === 'client_referral'
                            ? intl.formatMessage({ id: 'influencer.type.client', defaultMessage: 'Client' })
                            : commission.type === 'recruitment'
                            ? intl.formatMessage({ id: 'influencer.type.recruitment', defaultMessage: 'Recrutement' })
                            : intl.formatMessage({ id: 'influencer.type.adjustment', defaultMessage: 'Ajustement' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {commission.referenceId || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(commission.status)}`}>
                          {getStatusLabel(commission.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(commission.finalAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {hasActiveFilters ? (
                <FormattedMessage
                  id="influencer.earnings.noResults"
                  defaultMessage="Aucune commission ne correspond aux filtres"
                />
              ) : (
                <FormattedMessage
                  id="influencer.earnings.empty"
                  defaultMessage="Aucune commission pour le moment"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerEarnings;

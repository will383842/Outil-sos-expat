/**
 * BloggerEarnings - Detailed earnings/commissions history for bloggers
 */

import React, { useEffect, useState, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useBlogger } from '@/hooks/useBlogger';
import type { BloggerCommissionType, BloggerCommissionStatus } from '@/types/blogger';
import { BloggerDashboardLayout } from '@/components/Blogger';
import { DollarSign, Filter, Download, Calendar, X, Loader2 } from 'lucide-react';
import { exportToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/utils/csvExport';

// Simplified commission type for display
interface CommissionDisplay {
  id: string;
  type: BloggerCommissionType;
  amount: number;
  status: BloggerCommissionStatus;
  description: string;
  createdAt: string;
}

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
  select: "px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500",
  input: "px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500",
} as const;

const BloggerEarnings: React.FC = () => {
  const intl = useIntl();
  const { dashboardData: dashboard, commissions: allCommissions, isLoading: loading, refreshDashboard } = useBlogger();

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
  // Note: dashboard.recentCommissions is a simplified type; allCommissions is the full type
  const commissions: CommissionDisplay[] = allCommissions.length > 0
    ? allCommissions.map(c => ({
        id: c.id,
        type: c.type,
        amount: c.amount,
        status: c.status,
        description: c.description,
        createdAt: c.createdAt,
      }))
    : (dashboard?.recentCommissions || []);

  // Apply filters
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c: CommissionDisplay) => {
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
      intl.formatMessage({ id: 'blogger.earnings.csv.date', defaultMessage: 'Date' }),
      intl.formatMessage({ id: 'blogger.earnings.csv.type', defaultMessage: 'Type' }),
      intl.formatMessage({ id: 'blogger.earnings.csv.description', defaultMessage: 'Description' }),
      intl.formatMessage({ id: 'blogger.earnings.csv.status', defaultMessage: 'Statut' }),
      intl.formatMessage({ id: 'blogger.earnings.csv.amount', defaultMessage: 'Montant ($)' }),
    ];

    const rows = filteredCommissions.map(c => [
      formatDateForCSV(c.createdAt),
      c.type === 'client_referral' ? 'Client référé' : c.type === 'recruitment' ? 'Recrutement' : c.type,
      c.description || '-',
      c.status,
      formatCurrencyForCSV(c.amount),
    ]);

    const filename = `blogger-commissions-${new Date().toISOString().split('T')[0]}.csv`;
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
      case 'available': return intl.formatMessage({ id: 'blogger.status.available', defaultMessage: 'Disponible' });
      case 'validated': return intl.formatMessage({ id: 'blogger.status.validated', defaultMessage: 'Validé' });
      case 'pending': return intl.formatMessage({ id: 'blogger.status.pending', defaultMessage: 'En attente' });
      case 'paid': return intl.formatMessage({ id: 'blogger.status.paid', defaultMessage: 'Payé' });
      case 'cancelled': return intl.formatMessage({ id: 'blogger.status.cancelled', defaultMessage: 'Annulé' });
      default: return status;
    }
  };

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    return filteredCommissions.reduce(
      (acc, c) => {
        acc.total += c.amount;
        if (c.status === 'available') acc.available += c.amount;
        if (c.status === 'pending' || c.status === 'validated') acc.pending += c.amount;
        return acc;
      },
      { total: 0, available: 0, pending: 0 }
    );
  }, [filteredCommissions]);

  if (loading && !dashboard) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </BloggerDashboardLayout>
    );
  }

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="blogger.earnings.title" defaultMessage="Mes gains" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="blogger.earnings.subtitle" defaultMessage="Historique de toutes vos commissions" />
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
            <FormattedMessage id="blogger.earnings.export" defaultMessage="Exporter CSV" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="blogger.earnings.total" defaultMessage="Total gagné" />
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(dashboard?.blogger?.totalEarned || 0)}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="blogger.earnings.available" defaultMessage="Disponible" />
            </p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(dashboard?.blogger?.availableBalance || 0)}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="blogger.earnings.pending" defaultMessage="En attente" />
            </p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {formatCurrency((dashboard?.blogger?.pendingBalance || 0) + (dashboard?.blogger?.validatedBalance || 0))}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="blogger.earnings.filtered" defaultMessage="Filtré" />
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {filteredCommissions.length}
              <span className="text-sm font-normal text-gray-500 ml-1">
                <FormattedMessage id="blogger.earnings.commissions" defaultMessage="commissions" />
              </span>
            </p>
          </div>
        </div>

        {/* Filters */}
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
                {intl.formatMessage({ id: 'blogger.earnings.filter.all', defaultMessage: 'Tous les types' })}
              </option>
              <option value="client_referral">
                {intl.formatMessage({ id: 'blogger.earnings.filter.client', defaultMessage: 'Clients référés' })}
              </option>
              <option value="recruitment">
                {intl.formatMessage({ id: 'blogger.earnings.filter.recruitment', defaultMessage: 'Recrutement' })}
              </option>
              <option value="manual_adjustment">
                {intl.formatMessage({ id: 'blogger.earnings.filter.adjustment', defaultMessage: 'Ajustements' })}
              </option>
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={UI.select}
            >
              <option value="all">
                {intl.formatMessage({ id: 'blogger.earnings.filter.allStatus', defaultMessage: 'Tous les statuts' })}
              </option>
              <option value="pending">
                {intl.formatMessage({ id: 'blogger.earnings.filter.pending', defaultMessage: 'En attente' })}
              </option>
              <option value="validated">
                {intl.formatMessage({ id: 'blogger.earnings.filter.validated', defaultMessage: 'Validé' })}
              </option>
              <option value="available">
                {intl.formatMessage({ id: 'blogger.earnings.filter.available', defaultMessage: 'Disponible' })}
              </option>
              <option value="paid">
                {intl.formatMessage({ id: 'blogger.earnings.filter.paid', defaultMessage: 'Payé' })}
              </option>
              <option value="cancelled">
                {intl.formatMessage({ id: 'blogger.earnings.filter.cancelled', defaultMessage: 'Annulé' })}
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
                className="flex items-center gap-1 text-sm text-purple-500 hover:text-purple-600"
              >
                <X className="w-4 h-4" />
                <FormattedMessage id="blogger.earnings.clearFilters" defaultMessage="Effacer" />
              </button>
            )}
          </div>

          {/* Filter Summary */}
          {hasActiveFilters && (
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="blogger.earnings.filterSummary"
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
                      <FormattedMessage id="blogger.earnings.table.date" defaultMessage="Date" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FormattedMessage id="blogger.earnings.table.type" defaultMessage="Type" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FormattedMessage id="blogger.earnings.table.description" defaultMessage="Description" />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FormattedMessage id="blogger.earnings.table.status" defaultMessage="Statut" />
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <FormattedMessage id="blogger.earnings.table.amount" defaultMessage="Montant" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCommissions.map((commission: CommissionDisplay) => (
                    <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(commission.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          commission.type === 'client_referral'
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            : commission.type === 'recruitment'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                        }`}>
                          {commission.type === 'client_referral'
                            ? intl.formatMessage({ id: 'blogger.type.client', defaultMessage: 'Client' })
                            : commission.type === 'recruitment'
                            ? intl.formatMessage({ id: 'blogger.type.recruitment', defaultMessage: 'Recrutement' })
                            : intl.formatMessage({ id: 'blogger.type.adjustment', defaultMessage: 'Ajustement' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {commission.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(commission.status)}`}>
                          {getStatusLabel(commission.status)}
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
              {hasActiveFilters ? (
                <FormattedMessage
                  id="blogger.earnings.noResults"
                  defaultMessage="Aucune commission ne correspond aux filtres"
                />
              ) : (
                <FormattedMessage
                  id="blogger.earnings.empty"
                  defaultMessage="Aucune commission pour le moment"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerEarnings;

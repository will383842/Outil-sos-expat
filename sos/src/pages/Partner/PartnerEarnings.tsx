/**
 * PartnerEarnings - Commission history with filters and CSV export
 */

import React, { useState, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { usePartner } from '@/hooks/usePartner';
import type { PartnerCommission } from '@/hooks/usePartner';
import { PartnerDashboardLayout } from '@/components/Partner';
import { DollarSign, Filter, Download, Calendar, X, Loader2 } from 'lucide-react';

const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  button: {
    primary: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all active:scale-[0.98]',
    secondary: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all active:scale-[0.98]',
    danger: 'bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all active:scale-[0.98]',
  },
  select: 'px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]',
  input: 'px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]',
} as const;

const ITEMS_PER_PAGE = 20;

const PartnerEarnings: React.FC = () => {
  const intl = useIntl();
  const { dashboardData, commissions: allCommissions, isLoading } = usePartner();

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Use allCommissions from subscription if available, otherwise dashboard
  const commissions: PartnerCommission[] = allCommissions.length > 0
    ? allCommissions
    : (dashboardData?.recentCommissions || []);

  // Apply filters
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;

      if (dateFrom) {
        const commissionDate = new Date(c.createdAt);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (commissionDate < fromDate) return false;
      }

      if (dateTo) {
        const commissionDate = new Date(c.createdAt);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (commissionDate > toDate) return false;
      }

      return true;
    });
  }, [commissions, filterStatus, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.ceil(filteredCommissions.length / ITEMS_PER_PAGE);
  const paginatedCommissions = filteredCommissions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const clearFilters = () => {
    setFilterStatus('all');
    setDateFrom('');
    setDateTo('');
    setCurrentPage(1);
  };

  const hasActiveFilters = filterStatus !== 'all' || dateFrom || dateTo;

  // Export to CSV with BOM
  const handleExportCSV = () => {
    if (filteredCommissions.length === 0) return;

    const headers = [
      intl.formatMessage({ id: 'partner.earnings.csv.date', defaultMessage: 'Date' }),
      intl.formatMessage({ id: 'partner.earnings.csv.description', defaultMessage: 'Description' }),
      intl.formatMessage({ id: 'partner.earnings.csv.amount', defaultMessage: 'Montant ($)' }),
      intl.formatMessage({ id: 'partner.earnings.csv.status', defaultMessage: 'Statut' }),
    ];

    const rows = filteredCommissions.map((c) => [
      new Date(c.createdAt).toLocaleDateString(),
      `"${(c.description || '-').replace(/"/g, '""')}"`,
      (c.amount / 100).toFixed(2),
      c.status,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `partner-commissions-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
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
      case 'available': return intl.formatMessage({ id: 'partner.status.available', defaultMessage: 'Disponible' });
      case 'validated': return intl.formatMessage({ id: 'partner.status.validated', defaultMessage: 'Valid\u00e9' });
      case 'pending': return intl.formatMessage({ id: 'partner.status.pending', defaultMessage: 'En attente' });
      case 'paid': return intl.formatMessage({ id: 'partner.status.paid', defaultMessage: 'Pay\u00e9' });
      case 'cancelled': return intl.formatMessage({ id: 'partner.status.cancelled', defaultMessage: 'Annul\u00e9' });
      default: return status;
    }
  };

  // Filtered totals
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

  if (isLoading && !dashboardData) {
    return (
      <PartnerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      </PartnerDashboardLayout>
    );
  }

  return (
    <PartnerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl dark:text-white font-bold">
              <FormattedMessage id="partner.earnings.title" defaultMessage="Mes gains" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.earnings.subtitle" defaultMessage="Historique de toutes vos commissions" />
            </p>
          </div>
          <button
            onClick={handleExportCSV}
            disabled={filteredCommissions.length === 0}
            className={`${UI.button.secondary} px-4 py-2 min-h-[48px] flex items-center gap-2 ${
              filteredCommissions.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Download className="w-4 h-4" />
            <FormattedMessage id="partner.earnings.export" defaultMessage="Exporter CSV" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.earnings.total" defaultMessage="Total gagn\u00e9" />
            </p>
            <p className="text-2xl dark:text-white font-bold">
              {formatCurrency(dashboardData?.partner?.totalEarned || 0)}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.earnings.available" defaultMessage="Disponible" />
            </p>
            <p className="text-2xl text-green-600 dark:text-green-400 font-bold">
              {formatCurrency(dashboardData?.partner?.availableBalance || 0)}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.earnings.pending" defaultMessage="En attente" />
            </p>
            <p className="text-2xl text-yellow-600 dark:text-yellow-400 font-bold">
              {formatCurrency((dashboardData?.partner?.pendingBalance || 0) + (dashboardData?.partner?.validatedBalance || 0))}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="partner.earnings.filtered" defaultMessage="Filtr\u00e9" />
            </p>
            <p className="text-2xl dark:text-white font-bold">
              {filteredCommissions.length}
              <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-1">
                <FormattedMessage id="partner.earnings.commissions" defaultMessage="commissions" />
              </span>
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className={`${UI.card} p-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-5 h-5 text-gray-500 dark:text-gray-400" />

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className={UI.select}
            >
              <option value="all">
                {intl.formatMessage({ id: 'partner.earnings.filter.allStatus', defaultMessage: 'Tous les statuts' })}
              </option>
              <option value="pending">
                {intl.formatMessage({ id: 'partner.earnings.filter.pending', defaultMessage: 'En attente' })}
              </option>
              <option value="validated">
                {intl.formatMessage({ id: 'partner.earnings.filter.validated', defaultMessage: 'Valid\u00e9' })}
              </option>
              <option value="available">
                {intl.formatMessage({ id: 'partner.earnings.filter.available', defaultMessage: 'Disponible' })}
              </option>
              <option value="paid">
                {intl.formatMessage({ id: 'partner.earnings.filter.paid', defaultMessage: 'Pay\u00e9' })}
              </option>
              <option value="cancelled">
                {intl.formatMessage({ id: 'partner.earnings.filter.cancelled', defaultMessage: 'Annul\u00e9' })}
              </option>
            </select>

            {/* Date From */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setCurrentPage(1); }}
                className={UI.input}
              />
            </div>

            {/* Date To */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setCurrentPage(1); }}
                className={UI.input}
              />
            </div>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-blue-600 min-h-[44px] px-2"
              >
                <X className="w-4 h-4" />
                <FormattedMessage id="partner.earnings.clearFilters" defaultMessage="Effacer" />
              </button>
            )}
          </div>

          {hasActiveFilters && (
            <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="partner.earnings.filterSummary"
                defaultMessage="{count} commission(s) - Total: {total}"
                values={{
                  count: filteredCommissions.length,
                  total: formatCurrency(filteredTotals.total),
                }}
              />
            </div>
          )}
        </div>

        {/* Commissions Table */}
        <div className={`${UI.card} overflow-hidden`}>
          {paginatedCommissions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                        <FormattedMessage id="partner.earnings.table.date" defaultMessage="Date" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                        <FormattedMessage id="partner.earnings.table.type" defaultMessage="Type" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                        <FormattedMessage id="partner.earnings.table.description" defaultMessage="Description" />
                      </th>
                      <th className="px-6 py-3 text-left text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                        <FormattedMessage id="partner.earnings.table.status" defaultMessage="Statut" />
                      </th>
                      <th className="px-6 py-3 text-right text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">
                        <FormattedMessage id="partner.earnings.table.amount" defaultMessage="Montant" />
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y dark:divide-gray-700">
                    {paginatedCommissions.map((commission) => (
                      <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white">
                          {new Date(commission.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            commission.type === 'client_referral'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {commission.type === 'client_referral'
                              ? intl.formatMessage({ id: 'partner.type.client_referral', defaultMessage: 'Client refere' })
                              : intl.formatMessage({ id: 'partner.type.manual_adjustment', defaultMessage: 'Ajustement' })}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                          {commission.description || '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(commission.status)}`}>
                            {getStatusLabel(commission.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 dark:text-green-400 font-medium text-right">
                          {formatCurrency(commission.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t dark:border-gray-700">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="partner.earnings.pagination"
                      defaultMessage="Page {current} sur {total}"
                      values={{ current: currentPage, total: totalPages }}
                    />
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`${UI.button.secondary} px-3 py-1 text-sm disabled:opacity-50`}
                    >
                      <FormattedMessage id="common.previous" defaultMessage="Pr\u00e9c\u00e9dent" />
                    </button>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`${UI.button.secondary} px-3 py-1 text-sm disabled:opacity-50`}
                    >
                      <FormattedMessage id="common.next" defaultMessage="Suivant" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-12">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              {hasActiveFilters ? (
                <FormattedMessage
                  id="partner.earnings.noResults"
                  defaultMessage="Aucune commission ne correspond aux filtres"
                />
              ) : (
                <FormattedMessage
                  id="partner.earnings.empty"
                  defaultMessage="Aucune commission pour le moment"
                />
              )}
            </div>
          )}
        </div>
      </div>
    </PartnerDashboardLayout>
  );
};

export default PartnerEarnings;

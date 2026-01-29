/**
 * ChatterPayments - Payments and withdrawal page for chatters
 * Shows commission history, withdrawals, and withdrawal form
 */

import React, { useState, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useChatter } from '@/hooks/useChatter';
import { useChatterWithdrawal } from '@/hooks/useChatterWithdrawal';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';
import { ChatterWithdrawalForm } from '@/components/Chatter/Forms';
import {
  Clock,
  CheckCircle,
  XCircle,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Loader2,
  AlertCircle,
} from 'lucide-react';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

type TabType = 'commissions' | 'withdrawals' | 'withdraw';
type FilterType = 'all' | 'pending' | 'validated' | 'available' | 'paid';

const ChatterPayments: React.FC = () => {
  const intl = useIntl();

  const {
    dashboardData,
    commissions,
    withdrawals,
    isLoading,
    error,
    canWithdraw,
    minimumWithdrawal,
    requestWithdrawal,
  } = useChatter();

  const {
    isSubmitting: withdrawalSubmitting,
    error: withdrawalError,
    success: withdrawalSuccess,
    submitWithdrawal,
    reset: resetWithdrawal,
  } = useChatterWithdrawal();

  const [activeTab, setActiveTab] = useState<TabType>('commissions');
  const [filter, setFilter] = useState<FilterType>('all');

  // Format amount
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents);
  };

  // Filtered commissions
  const filteredCommissions = useMemo(() => {
    if (filter === 'all') return commissions;
    return commissions.filter(c => c.status === filter);
  }, [commissions, filter]);

  // Handle withdrawal submission
  const handleWithdrawal = async (method: any, details: any, amount?: number) => {
    try {
      await submitWithdrawal(details);
    } catch (err) {
      console.error('Withdrawal error:', err);
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-5 h-5 text-amber-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
      case 'processing':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'failed':
      case 'cancelled':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <ChatterDashboardLayout activeKey="payments">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        </div>
      </ChatterDashboardLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <ChatterDashboardLayout activeKey="payments">
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <span>{error}</span>
          </div>
        </div>
      </ChatterDashboardLayout>
    );
  }

  const chatter = dashboardData?.chatter;

  return (
    <ChatterDashboardLayout activeKey="payments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="chatter.payments.title" defaultMessage="Mes paiements" />
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.payments.subtitle" defaultMessage="Gérez vos gains et retraits" />
            </p>
          </div>

          {/* Balance Summary */}
          <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl">
            <Wallet className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <FormattedMessage id="chatter.payments.available" defaultMessage="Disponible" />
              </p>
              <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
                {formatAmount(chatter?.availableBalance || 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 pb-2">
          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'commissions'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <FormattedMessage id="chatter.payments.tab.commissions" defaultMessage="Commissions" />
          </button>
          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'withdrawals'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <FormattedMessage id="chatter.payments.tab.withdrawals" defaultMessage="Retraits" />
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              activeTab === 'withdraw'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <FormattedMessage id="chatter.payments.tab.withdraw" defaultMessage="Retirer" />
          </button>
        </div>

        {/* Content */}
        {activeTab === 'commissions' && (
          <div className="space-y-4">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as FilterType)}
                className="px-3 py-1.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm"
              >
                <option value="all">{intl.formatMessage({ id: 'chatter.filter.all', defaultMessage: 'Toutes' })}</option>
                <option value="pending">{intl.formatMessage({ id: 'chatter.filter.pending', defaultMessage: 'En attente' })}</option>
                <option value="validated">{intl.formatMessage({ id: 'chatter.filter.validated', defaultMessage: 'Validées' })}</option>
                <option value="available">{intl.formatMessage({ id: 'chatter.filter.available', defaultMessage: 'Disponibles' })}</option>
              </select>
            </div>

            {/* Commissions List */}
            <div className={`${UI.card} overflow-hidden`}>
              {filteredCommissions.length === 0 ? (
                <div className="p-8 text-center">
                  <Clock className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="chatter.payments.noCommissions" defaultMessage="Aucune commission" />
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-white/5">
                  {filteredCommissions.map((commission) => (
                    <div key={commission.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <ArrowDownRight className="w-5 h-5 text-green-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {commission.type === 'client_referral'
                              ? intl.formatMessage({ id: 'chatter.commission.client', defaultMessage: 'Commission Client' })
                              : intl.formatMessage({ id: 'chatter.commission.recruitment', defaultMessage: 'Commission Recrutement' })
                            }
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(commission.createdAt).toLocaleDateString(intl.locale, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600 dark:text-green-400">
                          +{formatAmount(commission.amount)}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(commission.status)}`}>
                          {intl.formatMessage({ id: `chatter.status.${commission.status}`, defaultMessage: commission.status })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'withdrawals' && (
          <div className={`${UI.card} overflow-hidden`}>
            {withdrawals.length === 0 ? (
              <div className="p-8 text-center">
                <Wallet className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="chatter.payments.noWithdrawals" defaultMessage="Aucun retrait effectué" />
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        withdrawal.status === 'completed'
                          ? 'bg-green-100 dark:bg-green-900/30'
                          : withdrawal.status === 'failed'
                            ? 'bg-red-100 dark:bg-red-900/30'
                            : 'bg-amber-100 dark:bg-amber-900/30'
                      }`}>
                        <ArrowUpRight className={`w-5 h-5 ${
                          withdrawal.status === 'completed'
                            ? 'text-green-500'
                            : withdrawal.status === 'failed'
                              ? 'text-red-500'
                              : 'text-amber-500'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">
                          <FormattedMessage id="chatter.withdrawal.title" defaultMessage="Retrait" />
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {new Date(withdrawal.requestedAt).toLocaleDateString(intl.locale, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                          {' - '}
                          {withdrawal.paymentMethod === 'wise' ? 'Wise' :
                           withdrawal.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                           intl.formatMessage({ id: 'chatter.withdraw.bankTransfer', defaultMessage: 'Virement bancaire' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {formatAmount(withdrawal.amount)}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(withdrawal.status)}`}>
                        {intl.formatMessage({ id: `chatter.withdrawal.status.${withdrawal.status}`, defaultMessage: withdrawal.status })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'withdraw' && (
          <ChatterWithdrawalForm
            availableBalance={chatter?.availableBalance || 0}
            minimumWithdrawal={minimumWithdrawal}
            onSubmit={handleWithdrawal}
            loading={withdrawalSubmitting}
            error={withdrawalError}
            success={withdrawalSuccess}
          />
        )}
      </div>
    </ChatterDashboardLayout>
  );
};

export default ChatterPayments;

import toast from 'react-hot-toast';
/**
 * GroupAdminPayments - Full payment management page for group admins
 *
 * Uses the centralized payment system components:
 * - PaymentMethodForm for adding/editing payment methods
 * - WithdrawalRequestForm for requesting withdrawals
 * - WithdrawalTracker for tracking withdrawal status
 * - CommissionsHistoryTab for commission history
 *
 * Tabs:
 * 1. Withdraw - Request new withdrawals
 * 2. Payment Methods - Manage saved payment methods
 * 3. History - View past withdrawals with tracking
 * 4. Commissions - View commission history
 */

import React, { useState, useEffect, useCallback } from 'react';
import { trackMetaInitiateCheckout } from '@/utils/metaPixel';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePaymentMethods,
  useWithdrawals,
  useWithdrawalTracking,
  usePaymentConfig,
  usePendingWithdrawal,
  PaymentDetails,
  UserPaymentMethod,
} from '@/hooks/usePayment';
import GroupAdminDashboardLayout from '@/components/GroupAdmin/Layout/GroupAdminDashboardLayout';
import SEOHead from '@/components/layout/SEOHead';
import {
  PaymentMethodForm,
  WithdrawalRequestForm,
  WithdrawalTracker,
  CommissionsHistoryTab,
} from '@/components/payment';
import TelegramRequiredBanner from '@/components/Telegram/TelegramRequiredBanner';
import {
  Wallet,
  CreditCard,
  History,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  Plus,
  Trash2,
  Star,
  ChevronRight,
  Building2,
  Smartphone,
  Eye,
} from 'lucide-react';
import type {
  GroupAdmin,
  GroupAdminCommission,
} from '@/types/groupAdmin';

// Design tokens - GroupAdmin indigo theme
const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  button: {
    primary:
      'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all',
    danger:
      'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-medium rounded-xl transition-all',
  },
} as const;

type TabType = 'withdraw' | 'methods' | 'history' | 'commissions';

const GroupAdminPayments: React.FC = () => {
  const intl = useIntl();
  const { user, refreshUser } = useAuth();

  // GroupAdmin data (fetched from dashboard callable)
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [profile, setProfile] = useState<GroupAdmin | null>(null);
  const [commissions, setCommissions] = useState<GroupAdminCommission[]>([]);

  // Payment hooks (centralized system)
  const {
    methods,
    defaultMethodId,
    loading: methodsLoading,
    error: methodsError,
    saveMethod,
    deleteMethod,
    setDefaultMethod,
    refresh: refreshMethods,
  } = usePaymentMethods();

  const {
    withdrawals,
    loading: withdrawalsLoading,
    error: withdrawalsError,
    cancelWithdrawal,
    refresh: refreshWithdrawals,
  } = useWithdrawals();

  const { hasPendingWithdrawal, pendingWithdrawal } = usePendingWithdrawal();

  // Local state
  const [activeTab, setActiveTab] = useState<TabType>('withdraw');
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [saveMethodError, setSaveMethodError] = useState<string | null>(null);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);

  // Telegram confirmation state
  const [pendingConfirmationId, setPendingConfirmationId] = useState<string | null>(null);
  const [pendingConfirmationAmount, setPendingConfirmationAmount] = useState(0);

  // Tracking for selected withdrawal
  const {
    tracking: selectedTracking,
    loading: trackingLoading,
    refresh: refreshTracking,
  } = useWithdrawalTracking(selectedWithdrawalId);

  // Fetch GroupAdmin dashboard data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const getDashboard = httpsCallable(functionsAffiliate, 'getGroupAdminDashboard');
      const result = await getDashboard({});
      const data = result.data as {
        profile: GroupAdmin;
        recentCommissions: GroupAdminCommission[];
      };
      setProfile(data.profile);
      setCommissions(data.recentCommissions || []);
    } catch (err: unknown) {
      const error = err as { message?: string };
      setFetchError(error.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const availableBalance = profile?.availableBalance || 0;
  const pendingBalance = profile?.pendingBalance || 0;
  const totalEarned = profile?.totalEarned || 0;

  // Format amount in USD
  const formatAmount = useCallback(
    (cents: number) => {
      return new Intl.NumberFormat(intl.locale, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(cents / 100);
    },
    [intl.locale]
  );

  // Convert saved payment method to the format requestGroupAdminWithdrawal expects
  const convertMethodToLegacyFormat = (method: UserPaymentMethod) => {
    const details = method.details;
    const methodType = method.methodType === 'wise' ? 'wise' : details.type;

    return {
      paymentMethod: methodType as 'wise' | 'bank_transfer' | 'mobile_money',
      paymentDetails: {
        ...details,
        type: methodType,
      },
    };
  };

  // Handle withdrawal request via GroupAdmin-specific callable
  const handleWithdrawalRequest = useCallback(
    async (paymentMethodId: string, amount?: number) => {
      setWithdrawalLoading(true);
      setWithdrawalError(null);
      setWithdrawalSuccess(false);

      const finalAmount = amount || availableBalance;

      trackMetaInitiateCheckout({
        value: finalAmount / 100,
        currency: 'USD',
        content_name: 'groupadmin_withdrawal',
        content_category: 'affiliate_withdrawal',
      });

      try {
        // Look up the saved payment method
        const selectedMethod = methods.find((m) => m.id === paymentMethodId);
        if (!selectedMethod) {
          throw new Error(intl.formatMessage({ id: 'groupAdmin.payments.error.methodNotFound', defaultMessage: 'Payment method not found. Please add a payment method first.' }));
        }

        const { paymentMethod, paymentDetails } = convertMethodToLegacyFormat(selectedMethod);

        const requestWithdrawal = httpsCallable<unknown, { success: boolean; withdrawalId: string; telegramConfirmationRequired?: boolean }>(
          functionsAffiliate,
          'requestGroupAdminWithdrawal'
        );

        const result = await requestWithdrawal({
          amount: finalAmount,
          paymentMethod,
          paymentDetails,
        });

        if (result.data.telegramConfirmationRequired) {
          setPendingConfirmationId(result.data.withdrawalId);
          setPendingConfirmationAmount(finalAmount);
        } else {
          setWithdrawalSuccess(true);
          fetchData();
          refreshWithdrawals();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : intl.formatMessage({ id: 'groupAdmin.payments.error.generic', defaultMessage: 'An error occurred' });
        if (message.includes('TELEGRAM_REQUIRED')) {
          setWithdrawalError(intl.formatMessage({ id: 'groupAdmin.payments.error.telegramRequired', defaultMessage: 'You must connect Telegram to make a withdrawal.' }));
        } else if (message.includes('TELEGRAM_SEND_FAILED')) {
          setWithdrawalError(intl.formatMessage({ id: 'groupAdmin.payments.error.telegramSendFailed', defaultMessage: 'Unable to send Telegram confirmation. Please check that you have not blocked the bot and try again.' }));
        } else {
          setWithdrawalError(message);
        }
      } finally {
        setWithdrawalLoading(false);
      }
    },
    [methods, availableBalance, intl, fetchData, refreshWithdrawals]
  );

  const handleTelegramConfirmed = useCallback(() => {
    setPendingConfirmationId(null);
    setWithdrawalSuccess(true);
    fetchData();
    refreshWithdrawals();
  }, [fetchData, refreshWithdrawals]);

  const handleTelegramCancelled = useCallback(() => {
    setPendingConfirmationId(null);
    fetchData();
    refreshWithdrawals();
  }, [fetchData, refreshWithdrawals]);

  const handleTelegramExpired = useCallback(() => {
    setPendingConfirmationId(null);
    fetchData();
    refreshWithdrawals();
  }, [fetchData, refreshWithdrawals]);

  // Handle save payment method
  const handleSavePaymentMethod = useCallback(
    async (details: PaymentDetails) => {
      setSavingMethod(true);
      setSaveMethodError(null);

      try {
        await saveMethod(details, methods.length === 0);
        setShowPaymentMethodForm(false);
        await refreshMethods();
      } catch (err) {
        const message = err instanceof Error ? err.message : intl.formatMessage({ id: 'groupAdmin.payments.error.generic', defaultMessage: 'An error occurred' });
        setSaveMethodError(message);
        throw err;
      } finally {
        setSavingMethod(false);
      }
    },
    [saveMethod, methods.length, refreshMethods, intl]
  );

  // Handle delete payment method
  const handleDeleteMethod = useCallback(
    async (methodId: string) => {
      setDeletingMethodId(methodId);
      try {
        await deleteMethod(methodId);
        await refreshMethods();
      } catch (err) {
        console.error('Failed to delete method:', err);
        toast.error(intl.formatMessage({ id: 'payment.error.deleteMethod', defaultMessage: 'Failed to delete payment method.' }));
      } finally {
        setDeletingMethodId(null);
      }
    },
    [deleteMethod, refreshMethods, intl]
  );

  // Handle set default method
  const handleSetDefaultMethod = useCallback(
    async (methodId: string) => {
      try {
        await setDefaultMethod(methodId);
      } catch (err) {
        console.error('Failed to set default method:', err);
        toast.error(intl.formatMessage({ id: 'payment.error.setDefault', defaultMessage: 'Failed to set default method.' }));
      }
    },
    [setDefaultMethod, intl]
  );

  // Handle cancel withdrawal
  const handleCancelWithdrawal = useCallback(
    async (withdrawalId: string) => {
      try {
        await cancelWithdrawal(withdrawalId);
        await refreshWithdrawals();
        if (selectedWithdrawalId === withdrawalId) {
          setSelectedWithdrawalId(null);
        }
      } catch (err) {
        console.error('Failed to cancel withdrawal:', err);
        toast.error(intl.formatMessage({ id: 'payment.error.cancelWithdrawal', defaultMessage: 'Failed to cancel withdrawal.' }));
      }
    },
    [cancelWithdrawal, refreshWithdrawals, selectedWithdrawalId, intl]
  );

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
      case 'validating':
      case 'approved':
      case 'queued':
      case 'processing':
      case 'sent':
        return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'failed':
      case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled':
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Get method icon
  const getMethodIcon = (methodType: string) => {
    return methodType === 'mobile_money' ? (
      <Smartphone className="w-5 h-5 text-indigo-500" />
    ) : (
      <Building2 className="w-5 h-5 text-indigo-500" />
    );
  };

  // Loading state
  if (loading) {
    return (
      <GroupAdminDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <GroupAdminDashboardLayout>
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <span>{fetchError}</span>
          </div>
        </div>
      </GroupAdminDashboardLayout>
    );
  }

  return (
    <GroupAdminDashboardLayout>
      <SEOHead
        description="Manage your group or community with SOS-Expat"
        title={intl.formatMessage({ id: 'groupAdmin.payments.title', defaultMessage: 'Payments | SOS-Expat Group Admin' })}
      />

      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white sm:text-3xl font-bold">
            <FormattedMessage id="groupAdmin.payments.heading" defaultMessage="Payments & Withdrawals" />
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="groupAdmin.payments.subtitle"
              defaultMessage="Manage your earnings and withdrawals"
            />
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          {/* Available Balance */}
          <div
            className={`${UI.card} p-5 bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm dark:text-gray-400 font-medium">
                <FormattedMessage
                  id="groupAdmin.payments.availableBalance"
                  defaultMessage="Available"
                />
              </span>
            </div>
            <p className="text-2xl dark:text-green-400 font-bold">
              {formatAmount(availableBalance)}
            </p>
          </div>

          {/* Pending Balance */}
          <div
            className={`${UI.card} p-5 bg-gradient-to-br from-amber-50 dark:from-amber-900/20 to-orange-50 dark:to-orange-900/20`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm dark:text-gray-400 font-medium">
                <FormattedMessage id="groupAdmin.payments.pendingBalance" defaultMessage="Pending" />
              </span>
            </div>
            <p className="text-2xl dark:text-amber-400 font-bold">
              {formatAmount(pendingBalance)}
            </p>
          </div>

          {/* Total Earned */}
          <div
            className={`${UI.card} p-5 bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 to-purple-50 dark:to-purple-900/20`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <span className="text-sm dark:text-gray-400 font-medium">
                <FormattedMessage id="groupAdmin.payments.totalEarned" defaultMessage="Total earned" />
              </span>
            </div>
            <p className="text-2xl dark:text-indigo-400 font-bold">
              {formatAmount(totalEarned)}
            </p>
          </div>
        </div>

        {/* Pending Withdrawal Alert */}
        {hasPendingWithdrawal && pendingWithdrawal && (
          <div
            className={`${UI.card} p-4 bg-gradient-to-r from-indigo-50 dark:from-indigo-900/20 to-purple-50 dark:to-purple-900/20 border-l-4`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                <div>
                  <p className="font-medium text-indigo-700 dark:text-indigo-300">
                    <FormattedMessage
                      id="groupAdmin.payments.pendingWithdrawal"
                      defaultMessage="Withdrawal in progress"
                    />
                  </p>
                  <p className="text-sm dark:text-indigo-400">
                    {formatAmount(pendingWithdrawal.amount)} -{' '}
                    {intl.formatMessage({
                      id: `payment.status.${pendingWithdrawal.status}`,
                      defaultMessage: pendingWithdrawal.status,
                    })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedWithdrawalId(pendingWithdrawal.id);
                  setActiveTab('history');
                }}
                className={`${UI.button.secondary} px-4 py-2 text-sm flex items-center gap-2`}
              >
                <Eye className="w-4 h-4" />
                <FormattedMessage id="groupAdmin.payments.trackWithdrawal" defaultMessage="Track" />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b dark:border-white/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'withdraw'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <FormattedMessage id="groupAdmin.payments.tab.withdraw" defaultMessage="Withdraw" />
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'methods'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <FormattedMessage id="groupAdmin.payments.tab.methods" defaultMessage="Methods" />
            {methods.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                {methods.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'history'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <History className="w-4 h-4" />
            <FormattedMessage id="groupAdmin.payments.tab.history" defaultMessage="History" />
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'commissions'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <FormattedMessage id="groupAdmin.payments.tab.commissions" defaultMessage="Commissions" />
            {commissions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/20">
                {commissions.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'withdraw' && (
          <div className="space-y-6">
            {/* Telegram Required Banner */}
            {!user?.telegramId && (
              <TelegramRequiredBanner
                role="groupAdmin"
                onboardingPath="/group-admin/telegram"
                availableBalance={availableBalance}
              />
            )}

            {/* Withdrawal Form using centralized component */}
            <WithdrawalRequestForm
              availableBalance={availableBalance}
              currency="USD"
              onSubmit={handleWithdrawalRequest}
              onAddPaymentMethod={() => {
                setActiveTab('methods');
                setShowPaymentMethodForm(true);
              }}
              loading={withdrawalLoading}
              error={withdrawalError}
              success={withdrawalSuccess}
              paymentMethods={methods}
              defaultPaymentMethodId={defaultMethodId}
              role="groupAdmin"
              telegramConnected={!!user?.telegramId}
              onTelegramConnected={refreshUser}
              pendingConfirmationWithdrawalId={pendingConfirmationId}
              pendingConfirmationAmount={pendingConfirmationAmount}
              onTelegramConfirmed={handleTelegramConfirmed}
              onTelegramCancelled={handleTelegramCancelled}
              onTelegramExpired={handleTelegramExpired}
            />
          </div>
        )}

        {activeTab === 'methods' && (
          <div className="space-y-4">
            {/* Add Payment Method Form */}
            {showPaymentMethodForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg dark:text-white font-semibold">
                    <FormattedMessage
                      id="groupAdmin.payments.addMethod"
                      defaultMessage="Add a payment method"
                    />
                  </h3>
                  <button
                    onClick={() => setShowPaymentMethodForm(false)}
                    className={`${UI.button.secondary} px-4 py-2 text-sm`}
                  >
                    <FormattedMessage id="common.cancel" defaultMessage="Cancel" />
                  </button>
                </div>
                <PaymentMethodForm
                  onSubmit={handleSavePaymentMethod}
                  loading={savingMethod}
                  error={saveMethodError}
                />
              </div>
            ) : (
              <>
                {/* Add Method Button */}
                <button
                  onClick={() => setShowPaymentMethodForm(true)}
                  className={`${UI.card} w-full p-4 border-2 dark:border-white/20 hover:border-indigo-400 dark:hover:border-indigo-400 transition-all flex items-center justify-center gap-3`}
                >
                  <Plus className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    <FormattedMessage
                      id="groupAdmin.payments.addPaymentMethod"
                      defaultMessage="Add a payment method"
                    />
                  </span>
                </button>

                {/* Payment Methods List */}
                {methodsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                ) : methodsError ? (
                  <div className={`${UI.card} p-6 text-center`}>
                    <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
                    <p className="text-red-500">{methodsError}</p>
                  </div>
                ) : methods.length === 0 ? (
                  <div className={`${UI.card} p-8 text-center`}>
                    <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-700 dark:text-gray-300">
                      <FormattedMessage
                        id="groupAdmin.payments.noMethods"
                        defaultMessage="No payment methods saved"
                      />
                    </p>
                    <p className="text-sm dark:text-gray-400 mt-1">
                      <FormattedMessage
                        id="groupAdmin.payments.addMethodHint"
                        defaultMessage="Add a method to be able to make withdrawals"
                      />
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {methods.map((method) => (
                      <div
                        key={method.id}
                        className={`${UI.card} p-4 flex items-center justify-between hover:shadow-md transition-all`}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                            {getMethodIcon(method.methodType)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {method.displayName}
                              </p>
                              {method.isDefault && (
                                <span className="flex items-center gap-1 text-xs dark:text-indigo-400">
                                  <Star className="w-3 h-3 fill-current" />
                                  <FormattedMessage
                                    id="groupAdmin.payments.default"
                                    defaultMessage="Default"
                                  />
                                </span>
                              )}
                            </div>
                            <p className="text-sm dark:text-gray-400">
                              {method.methodType === 'mobile_money'
                                ? intl.formatMessage({ id: 'payment.method.mobileMoney', defaultMessage: 'Mobile Money' })
                                : method.methodType === 'wise'
                                ? 'Wise'
                                : intl.formatMessage({ id: 'payment.method.bankTransfer', defaultMessage: 'Bank Transfer' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!method.isDefault && (
                            <button
                              onClick={() => handleSetDefaultMethod(method.id)}
                              className={`${UI.button.secondary} p-2 text-sm`}
                              title={intl.formatMessage({
                                id: 'groupAdmin.payments.setDefault',
                                defaultMessage: 'Set as default',
                              })}
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteMethod(method.id)}
                            disabled={deletingMethodId === method.id}
                            className={`${UI.button.danger} p-2 text-sm`}
                            title={intl.formatMessage({
                              id: 'groupAdmin.payments.delete',
                              defaultMessage: 'Delete',
                            })}
                          >
                            {deletingMethodId === method.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Withdrawals List */}
            <div className="space-y-4">
              <h3 className="text-lg dark:text-white font-semibold">
                <FormattedMessage
                  id="groupAdmin.payments.withdrawalHistory"
                  defaultMessage="Withdrawal History"
                />
              </h3>

              {withdrawalsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : withdrawalsError ? (
                <div className={`${UI.card} p-6 text-center`}>
                  <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
                  <p className="text-red-500">{withdrawalsError}</p>
                </div>
              ) : withdrawals.length === 0 ? (
                <div className={`${UI.card} p-8 text-center`}>
                  <History className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-700 dark:text-gray-300">
                    <FormattedMessage
                      id="groupAdmin.payments.noWithdrawals"
                      defaultMessage="No withdrawals made"
                    />
                  </p>
                </div>
              ) : (
                <div className={`${UI.card} overflow-hidden divide-y dark:divide-white/5`}>
                  {withdrawals.map((withdrawal) => (
                    <button
                      key={withdrawal.id}
                      onClick={() => setSelectedWithdrawalId(withdrawal.id)}
                      className={`w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                        selectedWithdrawalId === withdrawal.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            withdrawal.status === 'completed'
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : withdrawal.status === 'failed' || withdrawal.status === 'rejected'
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : 'bg-indigo-100 dark:bg-indigo-900/30'
                          }`}
                        >
                          <ArrowUpRight
                            className={`w-5 h-5 ${
                              withdrawal.status === 'completed'
                                ? 'text-green-500'
                                : withdrawal.status === 'failed' || withdrawal.status === 'rejected'
                                ? 'text-red-500'
                                : 'text-indigo-500'
                            }`}
                          />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatAmount(withdrawal.amount)}
                          </p>
                          <p className="text-xs dark:text-gray-400">
                            {new Date(withdrawal.requestedAt).toLocaleDateString(intl.locale, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(withdrawal.status)}`}>
                          {intl.formatMessage({
                            id: `payment.status.${withdrawal.status}`,
                            defaultMessage: withdrawal.status,
                          })}
                        </span>
                        <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Withdrawal Tracking */}
            <div className="space-y-4">
              <h3 className="text-lg dark:text-white font-semibold">
                <FormattedMessage
                  id="groupAdmin.payments.trackingDetails"
                  defaultMessage="Tracking Details"
                />
              </h3>

              {selectedWithdrawalId ? (
                trackingLoading ? (
                  <div className={`${UI.card} p-6 flex items-center justify-center`}>
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                  </div>
                ) : selectedTracking ? (
                  <WithdrawalTracker
                    tracking={selectedTracking}
                    onRefresh={refreshTracking}
                    onCancel={() => handleCancelWithdrawal(selectedWithdrawalId)}
                    isRefreshing={trackingLoading}
                  />
                ) : (
                  <div className={`${UI.card} p-6 text-center`}>
                    <AlertCircle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-700 dark:text-gray-300">
                      <FormattedMessage
                        id="groupAdmin.payments.noTrackingData"
                        defaultMessage="Unable to load details"
                      />
                    </p>
                  </div>
                )
              ) : (
                <div className={`${UI.card} p-8 text-center`}>
                  <Eye className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-700 dark:text-gray-300">
                    <FormattedMessage
                      id="groupAdmin.payments.selectWithdrawal"
                      defaultMessage="Select a withdrawal to see details"
                    />
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'commissions' && (
          <CommissionsHistoryTab
            commissions={commissions as any}
            role="groupAdmin"
            currency="USD"
            isLoading={loading}
          />
        )}
      </div>
    </GroupAdminDashboardLayout>
  );
};

export default GroupAdminPayments;

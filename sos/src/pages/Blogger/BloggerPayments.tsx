/**
 * BloggerPayments - Full payment management page for bloggers
 *
 * Uses the centralized payment system components:
 * - PaymentMethodForm for adding/editing payment methods
 * - WithdrawalRequestForm for requesting withdrawals
 * - WithdrawalTracker for tracking withdrawal status
 *
 * Tabs:
 * 1. Withdraw - Request new withdrawals
 * 2. Payment Methods - Manage saved payment methods
 * 3. History - View past withdrawals with tracking
 */

import React, { useState, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useBlogger } from '@/hooks/useBlogger';
import {
  usePaymentMethods,
  useWithdrawals,
  useWithdrawalTracking,
  usePaymentConfig,
  usePendingWithdrawal,
  PaymentDetails,
  UserPaymentMethod,
  WithdrawalRequest,
  PaymentTrackingSummary,
} from '@/hooks/usePayment';
import { BloggerDashboardLayout } from '@/components/Blogger';
import {
  PaymentMethodForm,
  WithdrawalRequestForm,
  WithdrawalTracker,
} from '@/components/payment';
import {
  Wallet,
  CreditCard,
  History,
  Clock,
  CheckCircle,
  XCircle,
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

// Design tokens - Following blogger theme (purple gradient)
const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  button: {
    primary:
      'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all',
    danger:
      'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-medium rounded-xl transition-all',
  },
} as const;

type TabType = 'withdraw' | 'methods' | 'history';

const BloggerPayments: React.FC = () => {
  const intl = useIntl();

  // Blogger data
  const {
    blogger,
    isLoading: bloggerLoading,
    error: bloggerError,
  } = useBlogger();

  // Payment hooks
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
    requestWithdrawal,
    cancelWithdrawal,
    refresh: refreshWithdrawals,
  } = useWithdrawals();

  const { hasPendingWithdrawal, pendingWithdrawal } = usePendingWithdrawal();
  const { minimumWithdrawal: configMinWithdrawal, processingTimes, currency } = usePaymentConfig();

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

  // Tracking for selected withdrawal
  const {
    tracking: selectedTracking,
    loading: trackingLoading,
    refresh: refreshTracking,
  } = useWithdrawalTracking(selectedWithdrawalId);

  // Get blogger data
  const availableBalance = blogger?.availableBalance || 0;
  const pendingBalance = blogger?.pendingBalance || 0;
  const validatedBalance = blogger?.validatedBalance || 0;

  // Format amount
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

  // Handle withdrawal request
  const handleWithdrawalRequest = useCallback(
    async (paymentMethodId: string, amount?: number) => {
      setWithdrawalLoading(true);
      setWithdrawalError(null);
      setWithdrawalSuccess(false);

      try {
        await requestWithdrawal(paymentMethodId, amount);
        setWithdrawalSuccess(true);
        await refreshWithdrawals();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Une erreur est survenue';
        setWithdrawalError(message);
      } finally {
        setWithdrawalLoading(false);
      }
    },
    [requestWithdrawal, refreshWithdrawals]
  );

  // Handle save payment method
  const handleSavePaymentMethod = useCallback(
    async (details: PaymentDetails) => {
      setSavingMethod(true);
      setSaveMethodError(null);

      try {
        await saveMethod(details, methods.length === 0); // Set as default if first method
        setShowPaymentMethodForm(false);
        await refreshMethods();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Une erreur est survenue';
        setSaveMethodError(message);
        throw err; // Re-throw so the form can handle it
      } finally {
        setSavingMethod(false);
      }
    },
    [saveMethod, methods.length, refreshMethods]
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
      } finally {
        setDeletingMethodId(null);
      }
    },
    [deleteMethod, refreshMethods]
  );

  // Handle set default method
  const handleSetDefaultMethod = useCallback(
    async (methodId: string) => {
      try {
        await setDefaultMethod(methodId);
      } catch (err) {
        console.error('Failed to set default method:', err);
      }
    },
    [setDefaultMethod]
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
      }
    },
    [cancelWithdrawal, refreshWithdrawals, selectedWithdrawalId]
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
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
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
      <Smartphone className="w-5 h-5 text-purple-500" />
    ) : (
      <Building2 className="w-5 h-5 text-purple-500" />
    );
  };

  // Loading state
  if (bloggerLoading) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
        </div>
      </BloggerDashboardLayout>
    );
  }

  // Error state
  if (bloggerError) {
    return (
      <BloggerDashboardLayout>
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <span>{bloggerError}</span>
          </div>
        </div>
      </BloggerDashboardLayout>
    );
  }

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="blogger.payments.title" defaultMessage="Mes paiements" />
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="blogger.payments.subtitle"
              defaultMessage="Gerez vos gains et retraits"
            />
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Available Balance */}
          <div
            className={`${UI.card} p-5 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                <FormattedMessage
                  id="blogger.payments.availableBalance"
                  defaultMessage="Disponible"
                />
              </span>
            </div>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatAmount(availableBalance)}
            </p>
          </div>

          {/* Pending Balance */}
          <div
            className={`${UI.card} p-5 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                <FormattedMessage id="blogger.payments.pendingBalance" defaultMessage="En attente" />
              </span>
            </div>
            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatAmount(pendingBalance)}
            </p>
          </div>

          {/* Validated Balance */}
          <div
            className={`${UI.card} p-5 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                <FormattedMessage id="blogger.payments.validatedBalance" defaultMessage="Valide" />
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {formatAmount(validatedBalance)}
            </p>
          </div>
        </div>

        {/* Pending Withdrawal Alert */}
        {hasPendingWithdrawal && pendingWithdrawal && (
          <div
            className={`${UI.card} p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border-l-4 border-purple-500`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-purple-500 animate-spin" />
                <div>
                  <p className="font-medium text-purple-700 dark:text-purple-300">
                    <FormattedMessage
                      id="blogger.payments.pendingWithdrawal"
                      defaultMessage="Retrait en cours"
                    />
                  </p>
                  <p className="text-sm text-purple-600 dark:text-purple-400">
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
                <FormattedMessage id="blogger.payments.trackWithdrawal" defaultMessage="Suivre" />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-white/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'withdraw'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <Wallet className="w-4 h-4" />
            <FormattedMessage id="blogger.payments.tab.withdraw" defaultMessage="Retirer" />
          </button>
          <button
            onClick={() => setActiveTab('methods')}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === 'methods'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <FormattedMessage id="blogger.payments.tab.methods" defaultMessage="Methodes" />
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
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
            }`}
          >
            <History className="w-4 h-4" />
            <FormattedMessage id="blogger.payments.tab.history" defaultMessage="Historique" />
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'withdraw' && (
          <div className="space-y-6">
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
            />
          </div>
        )}

        {activeTab === 'methods' && (
          <div className="space-y-4">
            {/* Add Payment Method Form */}
            {showPaymentMethodForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    <FormattedMessage
                      id="blogger.payments.addMethod"
                      defaultMessage="Ajouter une methode de paiement"
                    />
                  </h3>
                  <button
                    onClick={() => setShowPaymentMethodForm(false)}
                    className={`${UI.button.secondary} px-4 py-2 text-sm`}
                  >
                    <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
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
                  className={`${UI.card} w-full p-4 border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-purple-400 dark:hover:border-purple-400 transition-all flex items-center justify-center gap-3`}
                >
                  <Plus className="w-5 h-5 text-gray-400" />
                  <span className="font-medium text-gray-600 dark:text-gray-400">
                    <FormattedMessage
                      id="blogger.payments.addPaymentMethod"
                      defaultMessage="Ajouter une methode de paiement"
                    />
                  </span>
                </button>

                {/* Payment Methods List */}
                {methodsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                  </div>
                ) : methodsError ? (
                  <div className={`${UI.card} p-6 text-center`}>
                    <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
                    <p className="text-red-500">{methodsError}</p>
                  </div>
                ) : methods.length === 0 ? (
                  <div className={`${UI.card} p-8 text-center`}>
                    <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">
                      <FormattedMessage
                        id="blogger.payments.noMethods"
                        defaultMessage="Aucune methode de paiement enregistree"
                      />
                    </p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                      <FormattedMessage
                        id="blogger.payments.addMethodHint"
                        defaultMessage="Ajoutez une methode pour pouvoir effectuer des retraits"
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
                                <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400">
                                  <Star className="w-3 h-3 fill-current" />
                                  <FormattedMessage
                                    id="blogger.payments.default"
                                    defaultMessage="Par defaut"
                                  />
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {method.methodType === 'mobile_money'
                                ? 'Mobile Money'
                                : method.methodType === 'paypal'
                                ? 'PayPal'
                                : method.methodType === 'wise'
                                ? 'Wise'
                                : 'Virement bancaire'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!method.isDefault && (
                            <button
                              onClick={() => handleSetDefaultMethod(method.id)}
                              className={`${UI.button.secondary} p-2 text-sm`}
                              title={intl.formatMessage({
                                id: 'blogger.payments.setDefault',
                                defaultMessage: 'Definir par defaut',
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
                              id: 'blogger.payments.delete',
                              defaultMessage: 'Supprimer',
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Withdrawals List */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage
                  id="blogger.payments.withdrawalHistory"
                  defaultMessage="Historique des retraits"
                />
              </h3>

              {withdrawalsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                </div>
              ) : withdrawalsError ? (
                <div className={`${UI.card} p-6 text-center`}>
                  <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
                  <p className="text-red-500">{withdrawalsError}</p>
                </div>
              ) : withdrawals.length === 0 ? (
                <div className={`${UI.card} p-8 text-center`}>
                  <History className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="blogger.payments.noWithdrawals"
                      defaultMessage="Aucun retrait effectue"
                    />
                  </p>
                </div>
              ) : (
                <div className={`${UI.card} overflow-hidden divide-y divide-gray-100 dark:divide-white/5`}>
                  {withdrawals.map((withdrawal) => (
                    <button
                      key={withdrawal.id}
                      onClick={() => setSelectedWithdrawalId(withdrawal.id)}
                      className={`w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                        selectedWithdrawalId === withdrawal.id
                          ? 'bg-purple-50 dark:bg-purple-900/20'
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
                              : 'bg-purple-100 dark:bg-purple-900/30'
                          }`}
                        >
                          <ArrowUpRight
                            className={`w-5 h-5 ${
                              withdrawal.status === 'completed'
                                ? 'text-green-500'
                                : withdrawal.status === 'failed' || withdrawal.status === 'rejected'
                                ? 'text-red-500'
                                : 'text-purple-500'
                            }`}
                          />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white">
                            {formatAmount(withdrawal.amount)}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
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
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Withdrawal Tracking */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage
                  id="blogger.payments.trackingDetails"
                  defaultMessage="Details du suivi"
                />
              </h3>

              {selectedWithdrawalId ? (
                trackingLoading ? (
                  <div className={`${UI.card} p-6 flex items-center justify-center`}>
                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
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
                    <p className="text-gray-500 dark:text-gray-400">
                      <FormattedMessage
                        id="blogger.payments.noTrackingData"
                        defaultMessage="Impossible de charger les details"
                      />
                    </p>
                  </div>
                )
              ) : (
                <div className={`${UI.card} p-8 text-center`}>
                  <Eye className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="blogger.payments.selectWithdrawal"
                      defaultMessage="Selectionnez un retrait pour voir les details"
                    />
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerPayments;

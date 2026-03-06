/**
 * PartnerPayments - Withdrawal management page
 *
 * Uses centralized payment system components similar to BloggerPayments.
 */

import React, { useState, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useAuth } from '@/contexts/AuthContext';
import { usePartner } from '@/hooks/usePartner';
import {
  usePaymentMethods,
  useWithdrawals,
  useWithdrawalTracking,
  usePendingWithdrawal,
  usePaymentConfig,
  PaymentDetails,
} from '@/hooks/usePayment';
import { PartnerDashboardLayout } from '@/components/Partner';
import {
  PaymentMethodForm,
  WithdrawalRequestForm,
  WithdrawalTracker,
  CommissionsHistoryTab,
} from '@/components/payment';
import toast from 'react-hot-toast';
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

const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  button: {
    primary: 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-medium rounded-xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed',
    secondary: 'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all active:scale-[0.98]',
    danger: 'bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-medium rounded-xl transition-all active:scale-[0.98]',
  },
} as const;

const SOS_WITHDRAWAL_FEE_CENTS = 300;

type TabType = 'withdraw' | 'methods' | 'history' | 'commissions';

const PartnerPayments: React.FC = () => {
  const intl = useIntl();
  const { user, refreshUser } = useAuth();

  const {
    partner,
    commissions,
    isLoading: partnerLoading,
    error: partnerError,
  } = usePartner();

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

  const [activeTab, setActiveTab] = useState<TabType>('withdraw');
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [saveMethodError, setSaveMethodError] = useState<string | null>(null);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);
  const [pendingConfirmationId, setPendingConfirmationId] = useState<string | null>(null);
  const [pendingConfirmationAmount, setPendingConfirmationAmount] = useState(0);

  const {
    tracking: selectedTracking,
    loading: trackingLoading,
    refresh: refreshTracking,
  } = useWithdrawalTracking(selectedWithdrawalId);

  const availableBalance = partner?.availableBalance || 0;
  const pendingBalance = partner?.pendingBalance || 0;
  const validatedBalance = partner?.validatedBalance || 0;

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

  const handleWithdrawalRequest = useCallback(
    async (paymentMethodId: string, amount?: number) => {
      setWithdrawalLoading(true);
      setWithdrawalError(null);
      setWithdrawalSuccess(false);

      try {
        const withdrawalId = await requestWithdrawal(paymentMethodId, amount);
        setPendingConfirmationId(withdrawalId);
        setPendingConfirmationAmount(amount || availableBalance);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Une erreur est survenue';
        setWithdrawalError(message);
      } finally {
        setWithdrawalLoading(false);
      }
    },
    [requestWithdrawal, availableBalance]
  );

  const handleTelegramConfirmed = useCallback(() => {
    setPendingConfirmationId(null);
    setWithdrawalSuccess(true);
    refreshWithdrawals();
  }, [refreshWithdrawals]);

  const handleTelegramCancelled = useCallback(() => {
    setPendingConfirmationId(null);
    refreshWithdrawals();
  }, [refreshWithdrawals]);

  const handleTelegramExpired = useCallback(() => {
    setPendingConfirmationId(null);
    refreshWithdrawals();
  }, [refreshWithdrawals]);

  const handleSavePaymentMethod = useCallback(
    async (details: PaymentDetails) => {
      setSavingMethod(true);
      setSaveMethodError(null);

      try {
        await saveMethod(details, methods.length === 0);
        setShowPaymentMethodForm(false);
        await refreshMethods();
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Une erreur est survenue';
        setSaveMethodError(message);
        throw err;
      } finally {
        setSavingMethod(false);
      }
    },
    [saveMethod, methods.length, refreshMethods]
  );

  const handleDeleteMethod = useCallback(
    async (methodId: string) => {
      setDeletingMethodId(methodId);
      try {
        await deleteMethod(methodId);
        await refreshMethods();
      } catch {
        toast.error(intl.formatMessage({ id: 'payment.error.deleteMethod', defaultMessage: 'Failed to delete payment method.' }));
      } finally {
        setDeletingMethodId(null);
      }
    },
    [deleteMethod, refreshMethods, intl]
  );

  const handleSetDefaultMethod = useCallback(
    async (methodId: string) => {
      try {
        await setDefaultMethod(methodId);
      } catch {
        toast.error(intl.formatMessage({ id: 'payment.error.setDefault', defaultMessage: 'Failed to set default method.' }));
      }
    },
    [setDefaultMethod, intl]
  );

  const handleCancelWithdrawal = useCallback(
    async (withdrawalId: string) => {
      try {
        await cancelWithdrawal(withdrawalId);
        await refreshWithdrawals();
        if (selectedWithdrawalId === withdrawalId) {
          setSelectedWithdrawalId(null);
        }
      } catch {
        toast.error(intl.formatMessage({ id: 'payment.error.cancelWithdrawal', defaultMessage: 'Failed to cancel withdrawal.' }));
      }
    },
    [cancelWithdrawal, refreshWithdrawals, selectedWithdrawalId, intl]
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': case 'validating': case 'approved': case 'queued': case 'processing': case 'sent':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'failed': case 'rejected':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'cancelled': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getMethodIcon = (methodType: string) => {
    return methodType === 'mobile_money' ? (
      <Smartphone className="w-5 h-5 text-blue-500" />
    ) : (
      <Building2 className="w-5 h-5 text-blue-500" />
    );
  };

  if (partnerLoading) {
    return (
      <PartnerDashboardLayout>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
        </div>
      </PartnerDashboardLayout>
    );
  }

  if (partnerError) {
    return (
      <PartnerDashboardLayout>
        <div className={`${UI.card} p-6`}>
          <div className="flex items-center gap-3 text-red-500">
            <AlertCircle className="w-6 h-6" />
            <span>{partnerError}</span>
          </div>
        </div>
      </PartnerDashboardLayout>
    );
  }

  return (
    <PartnerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl dark:text-white sm:text-3xl font-bold">
            <FormattedMessage id="partner.payments.title" defaultMessage="Mes paiements" />
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            <FormattedMessage id="partner.payments.subtitle" defaultMessage="G\u00e9rez vos gains et retraits" />
          </p>
        </div>

        {/* Balance Cards */}
        <div className="grid sm:grid-cols-3 gap-4">
          <div className={`${UI.card} p-5 bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                <FormattedMessage id="partner.payments.availableBalance" defaultMessage="Disponible" />
              </span>
            </div>
            <p className="text-2xl text-green-700 dark:text-green-400 font-bold">{formatAmount(availableBalance)}</p>
          </div>
          <div className={`${UI.card} p-5 bg-gradient-to-br from-amber-50 dark:from-amber-900/20 to-orange-50 dark:to-orange-900/20`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                <FormattedMessage id="partner.payments.pendingBalance" defaultMessage="En attente" />
              </span>
            </div>
            <p className="text-2xl text-amber-700 dark:text-amber-400 font-bold">{formatAmount(pendingBalance)}</p>
          </div>
          <div className={`${UI.card} p-5 bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20`}>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                <FormattedMessage id="partner.payments.validatedBalance" defaultMessage="Valid\u00e9" />
              </span>
            </div>
            <p className="text-2xl text-blue-700 dark:text-blue-400 font-bold">{formatAmount(validatedBalance)}</p>
          </div>
        </div>

        {/* Pending Withdrawal Alert */}
        {hasPendingWithdrawal && pendingWithdrawal && (
          <div className={`${UI.card} p-4 bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 border-l-4 border-l-blue-500`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                <div>
                  <p className="font-medium text-blue-700 dark:text-blue-300">
                    <FormattedMessage id="partner.payments.pendingWithdrawal" defaultMessage="Retrait en cours" />
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
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
                <FormattedMessage id="partner.payments.trackWithdrawal" defaultMessage="Suivre" />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b dark:border-white/10 pb-2 overflow-x-auto">
          {([
            { key: 'withdraw' as TabType, icon: <Wallet className="w-4 h-4" />, labelId: 'partner.payments.tab.withdraw', defaultLabel: 'Retirer' },
            { key: 'methods' as TabType, icon: <CreditCard className="w-4 h-4" />, labelId: 'partner.payments.tab.methods', defaultLabel: 'M\u00e9thodes', badge: methods.length || undefined },
            { key: 'history' as TabType, icon: <History className="w-4 h-4" />, labelId: 'partner.payments.tab.history', defaultLabel: 'Historique' },
            { key: 'commissions' as TabType, icon: <ArrowUpRight className="w-4 h-4" />, labelId: 'partner.payments.tab.commissions', defaultLabel: 'Commissions', badge: commissions.length || undefined },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10'
              }`}
            >
              {tab.icon}
              <FormattedMessage id={tab.labelId} defaultMessage={tab.defaultLabel} />
              {tab.badge && tab.badge > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/20">{tab.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'withdraw' && (
          <div className="space-y-6">
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
              role="partner"
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
            {showPaymentMethodForm ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg dark:text-white font-semibold">
                    <FormattedMessage id="partner.payments.addMethod" defaultMessage="Ajouter une m\u00e9thode de paiement" />
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
                <button
                  onClick={() => setShowPaymentMethodForm(true)}
                  className={`${UI.card} w-full p-4 border-2 border-dashed dark:border-white/20 hover:border-blue-400 dark:hover:border-blue-400 transition-all flex items-center justify-center gap-3`}
                >
                  <Plus className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <span className="font-medium text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="partner.payments.addPaymentMethod" defaultMessage="Ajouter une m\u00e9thode de paiement" />
                  </span>
                </button>

                {methodsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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
                      <FormattedMessage id="partner.payments.noMethods" defaultMessage="Aucune m\u00e9thode de paiement enregistr\u00e9e" />
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {methods.map((method) => (
                      <div key={method.id} className={`${UI.card} p-4 flex items-center justify-between hover:shadow-md transition-all`}>
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center">
                            {getMethodIcon(method.methodType)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">{method.displayName}</p>
                              {method.isDefault && (
                                <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400">
                                  <Star className="w-3 h-3 fill-current" />
                                  <FormattedMessage id="partner.payments.default" defaultMessage="Par d\u00e9faut" />
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {method.methodType === 'mobile_money' ? 'Mobile Money' : method.methodType === 'wise' ? 'Wise' : 'Virement bancaire'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!method.isDefault && (
                            <button
                              onClick={() => handleSetDefaultMethod(method.id)}
                              className={`${UI.button.secondary} p-2 text-sm`}
                              title={intl.formatMessage({ id: 'partner.payments.setDefault', defaultMessage: 'D\u00e9finir par d\u00e9faut' })}
                            >
                              <Star className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteMethod(method.id)}
                            disabled={deletingMethodId === method.id}
                            className={`${UI.button.danger} p-2 text-sm`}
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
            <div className="space-y-4">
              <h3 className="text-lg dark:text-white font-semibold">
                <FormattedMessage id="partner.payments.withdrawalHistory" defaultMessage="Historique des retraits" />
              </h3>
              {withdrawalsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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
                    <FormattedMessage id="partner.payments.noWithdrawals" defaultMessage="Aucun retrait effectu\u00e9" />
                  </p>
                </div>
              ) : (
                <div className={`${UI.card} overflow-hidden divide-y dark:divide-white/5`}>
                  {withdrawals.map((withdrawal) => (
                    <button
                      key={withdrawal.id}
                      onClick={() => setSelectedWithdrawalId(withdrawal.id)}
                      className={`w-full px-4 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors ${
                        selectedWithdrawalId === withdrawal.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          withdrawal.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30' :
                          withdrawal.status === 'failed' || withdrawal.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30' :
                          'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          <ArrowUpRight className={`w-5 h-5 ${
                            withdrawal.status === 'completed' ? 'text-green-500' :
                            withdrawal.status === 'failed' || withdrawal.status === 'rejected' ? 'text-red-500' : 'text-blue-500'
                          }`} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-gray-900 dark:text-white">{formatAmount(withdrawal.amount)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(withdrawal.requestedAt).toLocaleDateString(intl.locale, {
                              day: 'numeric', month: 'short', year: 'numeric',
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

            <div className="space-y-4">
              <h3 className="text-lg dark:text-white font-semibold">
                <FormattedMessage id="partner.payments.trackingDetails" defaultMessage="D\u00e9tails du suivi" />
              </h3>
              {selectedWithdrawalId ? (
                trackingLoading ? (
                  <div className={`${UI.card} p-6 flex items-center justify-center`}>
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
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
                      <FormattedMessage id="partner.payments.noTrackingData" defaultMessage="Impossible de charger les d\u00e9tails" />
                    </p>
                  </div>
                )
              ) : (
                <div className={`${UI.card} p-8 text-center`}>
                  <Eye className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">
                    <FormattedMessage id="partner.payments.selectWithdrawal" defaultMessage="S\u00e9lectionnez un retrait pour voir les d\u00e9tails" />
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'commissions' && (
          <CommissionsHistoryTab
            commissions={commissions as any}
            role="partner"
            currency="USD"
            isLoading={partnerLoading}
          />
        )}
      </div>
    </PartnerDashboardLayout>
  );
};

export default PartnerPayments;

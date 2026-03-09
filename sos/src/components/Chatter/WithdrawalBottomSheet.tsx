/**
 * WithdrawalBottomSheet - Simplified withdrawal flow in a bottom sheet / modal
 *
 * Opens from ANY "Withdraw" button (sidebar, dashboard, payments page).
 * Steps: Amount + Method -> Telegram Confirmation -> Done
 * Uses existing WithdrawalRequestForm + PaymentMethodForm components.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { X, ArrowUpRight, DollarSign, CreditCard, Plus, Loader2 } from 'lucide-react';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentMethods, useWithdrawals, type PaymentDetails } from '@/hooks/usePayment';
import { PaymentMethodForm, WithdrawalRequestForm, PaymentMethodCard } from '@/components/payment';
import TelegramRequiredBanner from '@/components/Telegram/TelegramRequiredBanner';
import { trackMetaInitiateCheckout } from '@/utils/metaPixel';
import { UI } from '@/components/Chatter/designTokens';

interface WithdrawalBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const WithdrawalBottomSheet: React.FC<WithdrawalBottomSheetProps> = ({ isOpen, onClose, onSuccess }) => {
  const intl = useIntl();
  const { user, refreshUser } = useAuth();
  const { dashboardData, refreshDashboard } = useChatterData();
  const chatter = dashboardData?.chatter;
  const availableBalance = chatter?.availableBalance || 0;

  // Payment methods
  const {
    methods,
    defaultMethodId,
    loading: methodsLoading,
    saveMethod,
    refresh: refreshMethods,
  } = usePaymentMethods();

  const { requestWithdrawal } = useWithdrawals();

  // Local state
  const [showAddMethod, setShowAddMethod] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [saveMethodError, setSaveMethodError] = useState<string | null>(null);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [pendingConfirmationId, setPendingConfirmationId] = useState<string | null>(null);
  const [pendingConfirmationAmount, setPendingConfirmationAmount] = useState(0);
  const [success, setSuccess] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Reset state when closed
  useEffect(() => {
    if (!isOpen) {
      setShowAddMethod(false);
      setSaveMethodError(null);
      setWithdrawalError(null);
      setPendingConfirmationId(null);
      setSuccess(false);
    }
  }, [isOpen]);

  // Close on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  const formatAmount = (cents: number) =>
    new Intl.NumberFormat(intl.locale, { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(cents / 100);

  // Handlers
  const handleSavePaymentMethod = useCallback(
    async (details: PaymentDetails) => {
      setSavingMethod(true);
      setSaveMethodError(null);
      try {
        await saveMethod(details, methods.length === 0);
        setShowAddMethod(false);
        await refreshMethods();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error';
        setSaveMethodError(msg);
        throw err;
      } finally {
        setSavingMethod(false);
      }
    },
    [saveMethod, methods.length, refreshMethods]
  );

  const handleWithdrawalRequest = useCallback(
    async (paymentMethodId: string, amount?: number) => {
      setWithdrawalLoading(true);
      setWithdrawalError(null);

      trackMetaInitiateCheckout({
        value: (amount || availableBalance) / 100,
        currency: 'USD',
        content_name: 'chatter_withdrawal',
        content_category: 'affiliate_withdrawal',
      });

      try {
        const withdrawalId = await requestWithdrawal(paymentMethodId, amount);
        setPendingConfirmationId(withdrawalId);
        setPendingConfirmationAmount(amount || availableBalance);
      } catch (err) {
        const message = err instanceof Error ? err.message : intl.formatMessage({ id: 'chatter.payments.error.generic', defaultMessage: 'An error occurred' });
        if (message.includes('TELEGRAM_REQUIRED')) {
          setWithdrawalError(intl.formatMessage({ id: 'chatter.payments.error.telegramRequired', defaultMessage: 'You must connect Telegram to make a withdrawal.' }));
        } else if (message.includes('TELEGRAM_SEND_FAILED')) {
          setWithdrawalError(intl.formatMessage({ id: 'chatter.payments.error.telegramSendFailed', defaultMessage: 'Unable to send Telegram confirmation.' }));
        } else {
          setWithdrawalError(message);
        }
      } finally {
        setWithdrawalLoading(false);
      }
    },
    [requestWithdrawal, availableBalance, intl]
  );

  const handleTelegramConfirmed = useCallback(() => {
    setPendingConfirmationId(null);
    setSuccess(true);
    refreshDashboard();
    onSuccess?.();
  }, [refreshDashboard, onSuccess]);

  const handleTelegramCancelled = useCallback(() => {
    setPendingConfirmationId(null);
  }, []);

  const handleTelegramExpired = useCallback(() => {
    setPendingConfirmationId(null);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Bottom sheet */}
      <div
        ref={sheetRef}
        className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] flex flex-col"
        style={{ animation: 'slideUp 0.35s cubic-bezier(0.22, 1, 0.36, 1)' }}
      >
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-[40px] saturate-[1.8] rounded-t-[28px] border-t border-white/10 shadow-2xl shadow-black/20 flex flex-col max-h-[90vh]">
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-xl shadow-md shadow-indigo-500/25">
                <ArrowUpRight className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  <FormattedMessage id="chatter.withdrawal.title" defaultMessage="Withdraw funds" />
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <FormattedMessage
                    id="chatter.withdrawal.available"
                    defaultMessage="Available: {amount}"
                    values={{ amount: formatAmount(availableBalance) }}
                  />
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>

          {/* Content - scrollable */}
          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
            {/* Success state */}
            {success ? (
              <div className="py-8 text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <DollarSign className="w-8 h-8 text-green-500" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    <FormattedMessage id="chatter.withdrawal.success" defaultMessage="Withdrawal requested!" />
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    <FormattedMessage id="chatter.withdrawal.successHint" defaultMessage="Confirm on Telegram to process your withdrawal." />
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className={`${UI.button.primary} px-6 py-3 mx-auto`}
                >
                  <FormattedMessage id="common.close" defaultMessage="Close" />
                </button>
              </div>
            ) : (
              <>
                {/* Telegram required */}
                {!user?.telegramId && (
                  <TelegramRequiredBanner
                    role="chatter"
                    onboardingPath="/chatter/telegram"
                    availableBalance={availableBalance}
                  />
                )}

                {/* No payment method -> show add form */}
                {methods.length === 0 && !showAddMethod && !methodsLoading && (
                  <div className="text-center py-4 space-y-3">
                    <CreditCard className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      <FormattedMessage id="chatter.withdrawal.noMethod" defaultMessage="Add a payment method to withdraw" />
                    </p>
                    <button
                      onClick={() => setShowAddMethod(true)}
                      className={`${UI.button.primary} px-4 py-2 inline-flex items-center gap-2`}
                    >
                      <Plus className="w-4 h-4" />
                      <FormattedMessage id="chatter.withdrawal.addMethod" defaultMessage="Add payment method" />
                    </button>
                  </div>
                )}

                {methodsLoading && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  </div>
                )}

                {/* Inline add method form */}
                {showAddMethod && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                        <FormattedMessage id="chatter.withdrawal.addMethod" defaultMessage="Add payment method" />
                      </h3>
                      <button
                        onClick={() => setShowAddMethod(false)}
                        className="px-3 py-1.5 text-sm rounded-xl bg-white/10 backdrop-blur border border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-white/20 transition-all"
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
                )}

                {/* Method list (compact) + withdrawal form */}
                {methods.length > 0 && !showAddMethod && (
                  <>
                    {/* Compact method display */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          <FormattedMessage id="chatter.withdrawal.paymentMethod" defaultMessage="Payment method" />
                        </span>
                        <button
                          onClick={() => setShowAddMethod(true)}
                          className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <FormattedMessage id="chatter.withdrawal.addAnother" defaultMessage="Add another" />
                        </button>
                      </div>
                      {methods.map((method) => (
                        <PaymentMethodCard
                          key={method.id}
                          method={method}
                          className="dark:bg-white/5 dark:border-white/8"
                        />
                      ))}
                    </div>

                    {/* Withdrawal form */}
                    <WithdrawalRequestForm
                      availableBalance={availableBalance}
                      currency="USD"
                      onSubmit={handleWithdrawalRequest}
                      onAddPaymentMethod={() => setShowAddMethod(true)}
                      loading={withdrawalLoading}
                      error={withdrawalError}
                      success={false}
                      paymentMethods={methods}
                      defaultPaymentMethodId={defaultMethodId}
                      role="chatter"
                      telegramConnected={!!user?.telegramId}
                      onTelegramConnected={refreshUser}
                      pendingConfirmationWithdrawalId={pendingConfirmationId}
                      pendingConfirmationAmount={pendingConfirmationAmount}
                      onTelegramConfirmed={handleTelegramConfirmed}
                      onTelegramCancelled={handleTelegramCancelled}
                      onTelegramExpired={handleTelegramExpired}
                      withdrawalFeeCents={dashboardData?.config?.withdrawalFeeCents}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Keyframe animation */}
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default WithdrawalBottomSheet;

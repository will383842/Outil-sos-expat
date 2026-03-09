/**
 * ChatterPayments - Full payment management page for chatters (Redesigned 2026)
 *
 * KEY CHANGES:
 * - Single scrollable page (no more SwipeTabContainer / 4 tabs)
 * - Inline withdrawal flow with expand/collapse
 * - Collapsible withdrawal history section
 * - Glassmorphism cards, indigo/violet accent palette
 * - Uses useChatterData() (Context) instead of direct useChatter() call
 * - Mobile-first, dark mode support
 */

import React, { useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { trackMetaInitiateCheckout } from '@/utils/metaPixel';
import { FormattedMessage, useIntl } from 'react-intl';
import { useChatterData } from '@/contexts/ChatterDataContext';
import { useAuth } from '@/contexts/AuthContext';
import type { PiggyBankData } from '@/types/chatter';
import {
  usePaymentMethods,
  useWithdrawals,
  useWithdrawalTracking,
  usePaymentConfig,
  type PaymentDetails,
} from '@/hooks/usePayment';
import { ChatterDashboardLayout } from '@/components/Chatter/Layout';
import { UI } from '@/components/Chatter/designTokens';
import {
  PaymentMethodForm,
  WithdrawalRequestForm,
  WithdrawalTracker,
  CommissionsHistoryTab,
  PaymentMethodCard,
  WithdrawalStatusBadge,
} from '@/components/payment';
import TelegramRequiredBanner from '@/components/Telegram/TelegramRequiredBanner';
import {
  Wallet,
  CreditCard,
  Clock,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  History,
  Eye,
  Lock,
  Gift,
  DollarSign,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
  BarChart3,
  Target,
} from 'lucide-react';

// ============================================================================
// CONSTANTS
// ============================================================================

const SOS_WITHDRAWAL_FEE_CENTS = 300; // $3

const GLASS_CARD =
  'rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] shadow-lg dark:shadow-none';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** SVG Donut/Ring chart for earnings breakdown */
const EarningsBreakdown: React.FC<{
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  formatAmount: (cents: number) => string;
}> = ({ availableBalance, pendingBalance, validatedBalance, formatAmount }) => {
  const total = availableBalance + pendingBalance + validatedBalance;
  if (total === 0) return null;

  const segments = [
    {
      label: <FormattedMessage id="chatter.payments.availableBalance" defaultMessage="Disponible" />,
      value: availableBalance,
      stroke: '#22c55e', // green-500
      dotColor: 'bg-green-500',
      textColor: 'text-green-600 dark:text-green-400',
    },
    {
      label: <FormattedMessage id="chatter.payments.pendingBalance" defaultMessage="En attente" />,
      value: pendingBalance,
      stroke: '#f59e0b', // amber-500
      dotColor: 'bg-amber-500',
      textColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: <FormattedMessage id="chatter.payments.validatedBalance" defaultMessage="Valide" />,
      value: validatedBalance,
      stroke: '#3b82f6', // blue-500
      dotColor: 'bg-blue-500',
      textColor: 'text-blue-600 dark:text-blue-400',
    },
  ];

  // SVG donut math
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let cumulativeOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
      {/* Donut ring */}
      <div className="relative w-32 h-32 sm:w-36 sm:h-36 shrink-0">
        <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
          {/* Background ring */}
          <circle
            cx="64" cy="64" r={radius}
            fill="none"
            stroke="currentColor"
            className="text-slate-100 dark:text-white/10"
            strokeWidth="14"
          />
          {/* Segments */}
          {segments.map((seg, i) => {
            const pct = seg.value / total;
            const dashLength = pct * circumference;
            const offset = cumulativeOffset;
            cumulativeOffset += dashLength;
            if (seg.value === 0) return null;
            return (
              <circle
                key={i}
                cx="64" cy="64" r={radius}
                fill="none"
                stroke={seg.stroke}
                strokeWidth="14"
                strokeDasharray={`${dashLength} ${circumference - dashLength}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                className="transition-all duration-700"
              />
            );
          })}
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide font-medium">
            <FormattedMessage id="chatter.payments.totalBalance" defaultMessage="Total" />
          </span>
          <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
            {formatAmount(total)}
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-2 text-xs sm:text-sm">
            <span className={`w-2.5 h-2.5 rounded-full ${seg.dotColor} shrink-0`} />
            <span className="text-slate-500 dark:text-slate-400">{seg.label}</span>
            <span className={`font-semibold ${seg.textColor} ml-auto`}>{formatAmount(seg.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Locked Telegram Bonus Banner */
const LockedBonusBanner: React.FC<{
  piggyBank: PiggyBankData;
  formatAmount: (cents: number) => string;
}> = ({ piggyBank, formatAmount }) => {
  if (piggyBank.totalPending <= 0 || piggyBank.isUnlocked) return null;

  return (
    <div className={`${GLASS_CARD} p-4 bg-gradient-to-r from-pink-50 dark:from-pink-900/20 to-rose-50 dark:to-rose-900/20 border-l-4 border-l-pink-400`}>
      <div className="flex items-start gap-3">
        <div className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-lg shrink-0">
          <Gift className="w-5 h-5 text-pink-600 dark:text-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />
            <p className="font-medium text-pink-700 dark:text-pink-300">
              <FormattedMessage
                id="chatter.payments.lockedBonus.title"
                defaultMessage="Bonus Telegram verrouille: {amount}"
                values={{ amount: formatAmount(piggyBank.totalPending) }}
              />
            </p>
          </div>
          <p className="text-sm text-pink-600 dark:text-pink-400 mb-2">
            <FormattedMessage
              id="chatter.payments.lockedBonus.subtitle"
              defaultMessage="Gagnez encore {amount} en commissions client pour debloquer"
              values={{ amount: formatAmount(piggyBank.amountToUnlock) }}
            />
          </p>
          <div className="h-2 bg-pink-200 dark:bg-pink-900/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-pink-500 to-rose-500 rounded-full transition-all duration-500"
              style={{ width: `${piggyBank.progressPercent}%` }}
            />
          </div>
          <p className="text-xs text-pink-500 dark:text-pink-400 mt-1">
            {formatAmount(piggyBank.clientEarnings)} / {formatAmount(piggyBank.unlockThreshold)} ({piggyBank.progressPercent}%)
          </p>
        </div>
      </div>
    </div>
  );
};

/** KPI Row: Total Earned, This Month, Average/Month */
const KpiRow: React.FC<{
  chatter: any;
  commissions: any[];
  formatAmount: (cents: number) => string;
}> = ({ chatter, commissions, formatAmount }) => {
  const totalEarned = chatter?.totalEarned || 0;

  // Calculate this month's earnings from commissions
  const now = new Date();
  const thisMonthEarnings = useMemo(() => {
    if (!commissions || commissions.length === 0) return 0;
    return commissions
      .filter((c: any) => {
        const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  }, [commissions, now.getMonth(), now.getFullYear()]);

  // Calculate average monthly from totalEarned and createdAt
  const averageMonthly = useMemo(() => {
    if (!chatter?.createdAt || totalEarned === 0) return 0;
    const createdAt = chatter.createdAt?.toDate ? chatter.createdAt.toDate() : new Date(chatter.createdAt);
    const monthsDiff = Math.max(
      1,
      (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth()) + 1
    );
    return Math.round(totalEarned / monthsDiff);
  }, [chatter?.createdAt, totalEarned]);

  const kpis = [
    {
      label: <FormattedMessage id="chatter.payments.kpi.totalEarned" defaultMessage="Total gagne" />,
      value: formatAmount(totalEarned),
      icon: <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500" />,
      bg: 'from-emerald-50 dark:from-emerald-900/20 to-teal-50 dark:to-teal-900/20',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: <FormattedMessage id="chatter.payments.kpi.thisMonth" defaultMessage="Ce mois" />,
      value: formatAmount(thisMonthEarnings),
      icon: <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-violet-500" />,
      bg: 'from-violet-50 dark:from-violet-900/20 to-purple-50 dark:to-purple-900/20',
      valueColor: 'text-violet-600 dark:text-violet-400',
    },
    {
      label: <FormattedMessage id="chatter.payments.kpi.averageMonthly" defaultMessage="Moyenne/mois" />,
      value: formatAmount(averageMonthly),
      icon: <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-500" />,
      bg: 'from-cyan-50 dark:from-cyan-900/20 to-sky-50 dark:to-sky-900/20',
      valueColor: 'text-cyan-600 dark:text-cyan-400',
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-2 sm:gap-4">
      {kpis.map((kpi, i) => (
        <div key={i} className={`${GLASS_CARD} p-3 sm:p-4 bg-gradient-to-br ${kpi.bg}`}>
          <div className="flex items-center gap-1.5 mb-1">
            {kpi.icon}
            <span className="text-[9px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium truncate">
              {kpi.label}
            </span>
          </div>
          <p className={`text-sm sm:text-lg font-bold ${kpi.valueColor}`}>
            {kpi.value}
          </p>
        </div>
      ))}
    </div>
  );
};

/** Monthly Forecast Card with progress bar */
const MonthlyForecastCard: React.FC<{
  commissions: any[];
  formatAmount: (cents: number) => string;
}> = ({ commissions, formatAmount }) => {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  // This month earnings
  const thisMonthEarnings = useMemo(() => {
    if (!commissions || commissions.length === 0) return 0;
    return commissions
      .filter((c: any) => {
        const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  }, [commissions, now.getMonth(), now.getFullYear()]);

  // Last month earnings
  const lastMonthEarnings = useMemo(() => {
    if (!commissions || commissions.length === 0) return 0;
    const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return commissions
      .filter((c: any) => {
        const d = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      })
      .reduce((sum: number, c: any) => sum + (c.amount || 0), 0);
  }, [commissions, now.getMonth(), now.getFullYear()]);

  // Forecast: extrapolate from current pace
  const forecast = dayOfMonth > 0 ? Math.round((thisMonthEarnings / dayOfMonth) * daysInMonth) : 0;
  const progressPct = forecast > 0 ? Math.min(100, Math.round((thisMonthEarnings / forecast) * 100)) : 0;

  // Comparison with last month
  const diff = lastMonthEarnings > 0
    ? Math.round(((forecast - lastMonthEarnings) / lastMonthEarnings) * 100)
    : forecast > 0 ? 100 : 0;
  const isUp = diff >= 0;

  return (
    <div className={`${GLASS_CARD} p-4 sm:p-5 bg-gradient-to-br from-indigo-50 dark:from-indigo-900/20 to-violet-50 dark:to-violet-900/20`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 sm:p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
            <Target className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
              <FormattedMessage id="chatter.payments.forecast.title" defaultMessage="Prevision mensuelle" />
            </h3>
            <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
              <FormattedMessage
                id="chatter.payments.forecast.dayProgress"
                defaultMessage="Jour {day}/{total}"
                values={{ day: dayOfMonth, total: daysInMonth }}
              />
            </p>
          </div>
        </div>
        {/* Comparison badge */}
        {lastMonthEarnings > 0 && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            isUp
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
          }`}>
            {isUp ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {isUp ? '+' : ''}{diff}%
            <span className="hidden sm:inline ml-0.5">
              <FormattedMessage id="chatter.payments.forecast.vsLastMonth" defaultMessage="vs mois dernier" />
            </span>
          </div>
        )}
      </div>

      {/* Forecast amount */}
      <div className="mb-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {formatAmount(forecast)}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            <FormattedMessage id="chatter.payments.forecast.estimated" defaultMessage="estime" />
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
          <span>{formatAmount(thisMonthEarnings)} <FormattedMessage id="chatter.payments.forecast.earned" defaultMessage="gagne" /></span>
          <span>{progressPct}%</span>
        </div>
      </div>

      {/* Last month comparison */}
      {lastMonthEarnings > 0 && (
        <div className="mt-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400 dark:text-slate-500">
              <FormattedMessage id="chatter.payments.forecast.lastMonth" defaultMessage="Mois dernier" />
            </span>
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {formatAmount(lastMonthEarnings)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const ChatterPayments: React.FC = () => {
  return (
    <ChatterDashboardLayout activeKey="payments">
      <ChatterPaymentsContent />
    </ChatterDashboardLayout>
  );
};

const ChatterPaymentsContent: React.FC = () => {
  const intl = useIntl();
  const { user, refreshUser } = useAuth();

  // Data from Context (NOT direct useChatter() - shared via ChatterDataProvider)
  const {
    dashboardData,
    commissions,
    withdrawals,
    isLoading: chatterLoading,
    error: chatterError,
  } = useChatterData();

  // Page-specific payment hooks (actions only -- withdrawals data from context)
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
    requestWithdrawal,
    cancelWithdrawal,
  } = useWithdrawals();

  // Derive pending withdrawal from context withdrawals (avoids redundant Firebase call)
  const pendingStatuses = ['pending', 'validating', 'approved', 'queued', 'processing', 'sent'];
  const pendingWithdrawal = useMemo(
    () => withdrawals.find((w) => pendingStatuses.includes(w.status)) ?? null,
    [withdrawals]
  );
  const hasPendingWithdrawal = pendingWithdrawal !== null;
  const { currency } = usePaymentConfig();

  // Local state -- simplified (no more activeTab)
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [showWithdrawalHistory, setShowWithdrawalHistory] = useState(false);
  const [showPaymentMethodForm, setShowPaymentMethodForm] = useState(false);
  const [savingMethod, setSavingMethod] = useState(false);
  const [saveMethodError, setSaveMethodError] = useState<string | null>(null);
  const [withdrawalLoading, setWithdrawalLoading] = useState(false);
  const [withdrawalError, setWithdrawalError] = useState<string | null>(null);
  const [withdrawalSuccess, setWithdrawalSuccess] = useState(false);
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null);

  // Telegram confirmation state
  const [pendingConfirmationId, setPendingConfirmationId] = useState<string | null>(null);
  const [pendingConfirmationAmount, setPendingConfirmationAmount] = useState(0);

  // Tracking for selected withdrawal in history
  const [selectedWithdrawalId, setSelectedWithdrawalId] = useState<string | null>(null);
  const {
    tracking: selectedTracking,
    loading: trackingLoading,
    refresh: refreshTracking,
  } = useWithdrawalTracking(selectedWithdrawalId);

  // Get chatter data
  const chatter = dashboardData?.chatter;
  const availableBalance = chatter?.availableBalance || 0;
  const pendingBalance = chatter?.pendingBalance || 0;
  const validatedBalance = chatter?.validatedBalance || 0;
  const totalBalance = availableBalance + pendingBalance + validatedBalance;
  const piggyBank: PiggyBankData | undefined = dashboardData?.piggyBank;

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

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleWithdrawalRequest = useCallback(
    async (paymentMethodId: string, amount?: number) => {
      setWithdrawalLoading(true);
      setWithdrawalError(null);
      setWithdrawalSuccess(false);

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
          setWithdrawalError(intl.formatMessage({ id: 'chatter.payments.error.telegramSendFailed', defaultMessage: 'Unable to send Telegram confirmation. Make sure you have not blocked the bot and try again.' }));
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
    setWithdrawalSuccess(true);
  }, []);

  const handleTelegramCancelled = useCallback(() => {
    setPendingConfirmationId(null);
  }, []);

  const handleTelegramExpired = useCallback(() => {
    setPendingConfirmationId(null);
  }, []);

  const handleSavePaymentMethod = useCallback(
    async (details: PaymentDetails) => {
      setSavingMethod(true);
      setSaveMethodError(null);
      try {
        await saveMethod(details, methods.length === 0);
        setShowPaymentMethodForm(false);
        await refreshMethods();
      } catch (err) {
        const message = err instanceof Error ? err.message : intl.formatMessage({ id: 'chatter.payments.error.generic', defaultMessage: 'An error occurred' });
        setSaveMethodError(message);
        throw err;
      } finally {
        setSavingMethod(false);
      }
    },
    [saveMethod, methods.length, refreshMethods, intl]
  );

  const handleDeleteMethod = useCallback(
    async (methodId: string) => {
      setDeletingMethodId(methodId);
      try {
        await deleteMethod(methodId);
        await refreshMethods();
      } catch (err) {
        console.error('Failed to delete method:', err);
        toast.error(intl.formatMessage({ id: 'chatter.payments.error.deleteMethod', defaultMessage: 'Failed to delete payment method.' }));
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
      } catch (err) {
        console.error('Failed to set default method:', err);
        toast.error(intl.formatMessage({ id: 'chatter.payments.error.setDefault', defaultMessage: 'Failed to set default payment method.' }));
      }
    },
    [setDefaultMethod, intl]
  );

  const handleCancelWithdrawal = useCallback(
    async (withdrawalId: string) => {
      try {
        await cancelWithdrawal(withdrawalId);
        if (selectedWithdrawalId === withdrawalId) {
          setSelectedWithdrawalId(null);
        }
      } catch (err) {
        console.error('Failed to cancel withdrawal:', err);
        toast.error(intl.formatMessage({ id: 'chatter.payments.error.cancelWithdrawal', defaultMessage: 'Failed to cancel withdrawal.' }));
      }
    },
    [cancelWithdrawal, selectedWithdrawalId, intl]
  );

  // ============================================================================
  // LOADING / ERROR STATES
  // ============================================================================

  if (chatterLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (chatterError) {
    return (
      <div className={`${GLASS_CARD} p-6`}>
        <div className="flex items-center gap-3 text-red-500">
          <AlertCircle className="w-6 h-6" />
          <span>{chatterError}</span>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER -- Single scrollable page
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div>
        <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">
          <FormattedMessage id="chatter.payments.title" defaultMessage="Mes paiements" />
        </h1>
        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <FormattedMessage
            id="chatter.payments.subtitle"
            defaultMessage="Gerez vos gains et retraits"
          />
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Balance Cards (3 cards)                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-4">
        {/* Available */}
        <div className={`${GLASS_CARD} p-3 sm:p-5 bg-gradient-to-br from-green-50 dark:from-green-900/20 to-emerald-50 dark:to-emerald-900/20`}>
          <div className="flex items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1 sm:p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
              <Wallet className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate">
              <FormattedMessage id="chatter.payments.availableBalance" defaultMessage="Disponible" />
            </span>
          </div>
          <p className="text-base sm:text-2xl text-green-600 dark:text-green-400 font-bold">
            {formatAmount(availableBalance)}
          </p>
        </div>

        {/* Pending */}
        <div className={`${GLASS_CARD} p-3 sm:p-5 bg-gradient-to-br from-amber-50 dark:from-amber-900/20 to-orange-50 dark:to-orange-900/20`}>
          <div className="flex items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1 sm:p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
              <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate">
              <FormattedMessage id="chatter.payments.pendingBalance" defaultMessage="En attente" />
            </span>
          </div>
          <p className="text-base sm:text-2xl text-amber-600 dark:text-amber-400 font-bold">
            {formatAmount(pendingBalance)}
          </p>
        </div>

        {/* Validated */}
        <div className={`${GLASS_CARD} p-3 sm:p-5 bg-gradient-to-br from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20`}>
          <div className="flex items-center gap-1.5 sm:gap-3 mb-1 sm:mb-2">
            <div className="p-1 sm:p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
              <TrendingUp className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <span className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium truncate">
              <FormattedMessage id="chatter.payments.validatedBalance" defaultMessage="Valide" />
            </span>
          </div>
          <p className="text-base sm:text-2xl text-blue-600 dark:text-blue-400 font-bold">
            {formatAmount(validatedBalance)}
          </p>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KPI Row: Total Earned / This Month / Average/Month                  */}
      {/* ------------------------------------------------------------------ */}
      <KpiRow
        chatter={chatter}
        commissions={commissions}
        formatAmount={formatAmount}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Monthly Forecast Card                                               */}
      {/* ------------------------------------------------------------------ */}
      <MonthlyForecastCard
        commissions={commissions}
        formatAmount={formatAmount}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Total + Breakdown                                                   */}
      {/* ------------------------------------------------------------------ */}
      <div className={`${GLASS_CARD} p-4 sm:p-5`}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
            <FormattedMessage id="chatter.payments.totalBalance" defaultMessage="Solde total" />
          </span>
          <span className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            {formatAmount(totalBalance)}
          </span>
        </div>
        <EarningsBreakdown
          availableBalance={availableBalance}
          pendingBalance={pendingBalance}
          validatedBalance={validatedBalance}
          formatAmount={formatAmount}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Locked Bonus (if applicable)                                        */}
      {/* ------------------------------------------------------------------ */}
      {piggyBank && <LockedBonusBanner piggyBank={piggyBank} formatAmount={formatAmount} />}

      {/* ------------------------------------------------------------------ */}
      {/* Pending Withdrawal Alert                                            */}
      {/* ------------------------------------------------------------------ */}
      {hasPendingWithdrawal && pendingWithdrawal && (
        <div className={`${GLASS_CARD} p-4 bg-gradient-to-r from-blue-50 dark:from-blue-900/20 to-indigo-50 dark:to-indigo-900/20 border-l-4 border-l-blue-400`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
              <div>
                <p className="font-medium text-blue-700 dark:text-blue-300">
                  <FormattedMessage id="chatter.payments.pendingWithdrawal" defaultMessage="Retrait en cours" />
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
                setShowWithdrawalHistory(true);
              }}
              className="px-4 py-2 text-sm rounded-xl bg-white/10 backdrop-blur border border-white/[0.08] text-blue-600 dark:text-blue-300 hover:bg-white/20 transition-all flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              <FormattedMessage id="chatter.payments.trackWithdrawal" defaultMessage="Suivre" />
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Withdraw Section                                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="space-y-4">
        {!showWithdrawForm ? (
          /* Big withdraw button when collapsed */
          <button
            onClick={() => setShowWithdrawForm(true)}
            disabled={availableBalance <= 0}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 disabled:from-slate-400 disabled:to-slate-500 disabled:cursor-not-allowed text-white font-semibold text-lg shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all duration-200 flex items-center justify-center gap-3"
          >
            <ArrowUpRight className="w-5 h-5" />
            <FormattedMessage id="chatter.payments.tab.withdraw" defaultMessage="Retirer" />
            {availableBalance > 0 && (
              <span className="ml-1 opacity-80">({formatAmount(availableBalance)})</span>
            )}
          </button>
        ) : (
          /* Inline withdrawal flow when expanded */
          <div className={`${GLASS_CARD} p-4 sm:p-6 space-y-4`}>
            {/* Section header with collapse button */}
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowUpRight className="w-5 h-5 text-indigo-500" />
                <FormattedMessage id="chatter.payments.tab.withdraw" defaultMessage="Retirer" />
              </h2>
              <button
                onClick={() => setShowWithdrawForm(false)}
                className="px-3 py-1.5 text-sm rounded-xl bg-white/10 backdrop-blur border border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-white/20 transition-all"
              >
                <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
              </button>
            </div>

            {/* Balance reminder + fee info */}
            <div className={`${GLASS_CARD} p-4 flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <FormattedMessage id="chatter.payments.availableBalance" defaultMessage="Disponible" />
                  </p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {formatAmount(availableBalance)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  <FormattedMessage id="chatter.payments.withdrawFee" defaultMessage="Frais de retrait" />
                </p>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {formatAmount(SOS_WITHDRAWAL_FEE_CENTS)}
                </p>
              </div>
            </div>

            {/* Telegram Required Banner */}
            {!user?.telegramId && (
              <TelegramRequiredBanner
                role="chatter"
                onboardingPath="/chatter/telegram"
                availableBalance={availableBalance}
              />
            )}

            {/* Payment methods inline (if no methods, show add form) */}
            {methods.length === 0 && !showPaymentMethodForm && (
              <div className={`${GLASS_CARD} p-5 text-center space-y-3`}>
                <CreditCard className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  <FormattedMessage
                    id="chatter.payments.noMethods"
                    defaultMessage="Aucune methode de paiement enregistree"
                  />
                </p>
                <button
                  onClick={() => setShowPaymentMethodForm(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 text-white text-sm font-medium hover:from-indigo-600 hover:to-violet-600 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <FormattedMessage
                    id="chatter.payments.addPaymentMethod"
                    defaultMessage="Ajouter une methode de paiement"
                  />
                </button>
              </div>
            )}

            {/* Inline add payment method form */}
            {showPaymentMethodForm && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    <FormattedMessage
                      id="chatter.payments.addMethod"
                      defaultMessage="Ajouter une methode de paiement"
                    />
                  </h3>
                  <button
                    onClick={() => setShowPaymentMethodForm(false)}
                    className="px-3 py-1.5 text-sm rounded-xl bg-white/10 backdrop-blur border border-white/[0.08] text-slate-500 dark:text-slate-400 hover:bg-white/20 transition-all"
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
            )}

            {/* Existing payment methods list (compact) */}
            {methods.length > 0 && !showPaymentMethodForm && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <FormattedMessage id="chatter.payments.tab.methods" defaultMessage="Methodes" />
                  </span>
                  <button
                    onClick={() => setShowPaymentMethodForm(true)}
                    className="text-xs text-indigo-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <FormattedMessage id="chatter.payments.addMethod" defaultMessage="Ajouter" />
                  </button>
                </div>
                {methods.map((method) => (
                  <PaymentMethodCard
                    key={method.id}
                    method={method}
                    showActions
                    onDelete={() => handleDeleteMethod(method.id)}
                    onSelect={
                      method.isDefault ? undefined : () => handleSetDefaultMethod(method.id)
                    }
                    className="dark:bg-white/5 dark:border-white/8"
                  />
                ))}
              </div>
            )}

            {/* Withdrawal Form (shared component) */}
            {(methods.length > 0 || showPaymentMethodForm) && !showPaymentMethodForm && (
              <WithdrawalRequestForm
                availableBalance={availableBalance}
                currency="USD"
                onSubmit={handleWithdrawalRequest}
                onAddPaymentMethod={() => setShowPaymentMethodForm(true)}
                loading={withdrawalLoading}
                error={withdrawalError}
                success={withdrawalSuccess}
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
            )}
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Commission History                                                  */}
      {/* ------------------------------------------------------------------ */}
      <CommissionsHistoryTab
        commissions={commissions as any}
        role="chatter"
        currency="USD"
        isLoading={chatterLoading}
      />

      {/* ------------------------------------------------------------------ */}
      {/* Withdrawal History (collapsible)                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className={`${GLASS_CARD} overflow-hidden`}>
        <button
          onClick={() => setShowWithdrawalHistory(!showWithdrawalHistory)}
          className="w-full px-4 sm:px-5 py-4 flex items-center justify-between hover:bg-white/5 transition-colors"
        >
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-indigo-500" />
            <span className="font-semibold text-slate-900 dark:text-white">
              <FormattedMessage id="chatter.payments.tab.historyWithdrawals" defaultMessage="Historique retraits" />
            </span>
            {withdrawals.length > 0 && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-medium">
                {withdrawals.length}
              </span>
            )}
          </div>
          {showWithdrawalHistory ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {showWithdrawalHistory && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
            {withdrawals.length === 0 ? (
              <div className="py-8 text-center">
                <History className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                <p className="text-slate-500 dark:text-slate-400">
                  <FormattedMessage id="chatter.payments.noWithdrawals" defaultMessage="Aucun retrait effectue" />
                </p>
              </div>
            ) : (
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Withdrawals List */}
                <div className={`${GLASS_CARD} overflow-hidden divide-y divide-slate-100 dark:divide-white/5`}>
                  {withdrawals.map((withdrawal) => (
                    <button
                      key={withdrawal.id}
                      onClick={() => setSelectedWithdrawalId(withdrawal.id)}
                      className={`w-full px-4 py-3.5 flex items-center justify-between hover:bg-white/5 transition-colors ${
                        selectedWithdrawalId === withdrawal.id
                          ? 'bg-indigo-50 dark:bg-indigo-900/20'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                          withdrawal.status === 'completed'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : withdrawal.status === 'failed' || withdrawal.status === 'rejected'
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : 'bg-indigo-100 dark:bg-indigo-900/30'
                        }`}>
                          <ArrowUpRight className={`w-4 h-4 ${
                            withdrawal.status === 'completed'
                              ? 'text-green-500'
                              : withdrawal.status === 'failed' || withdrawal.status === 'rejected'
                                ? 'text-red-500'
                                : 'text-indigo-500'
                          }`} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-slate-900 dark:text-white text-sm">
                            {formatAmount(withdrawal.amount)}
                          </p>
                          <p className="text-xs text-slate-400 dark:text-slate-500">
                            {new Date(withdrawal.requestedAt).toLocaleDateString(intl.locale, {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <WithdrawalStatusBadge status={withdrawal.status as any} size="sm" />
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                    </button>
                  ))}
                </div>

                {/* Withdrawal Tracking Detail */}
                <div>
                  {selectedWithdrawalId ? (
                    trackingLoading ? (
                      <div className={`${GLASS_CARD} p-6 flex items-center justify-center`}>
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
                      <div className={`${GLASS_CARD} p-6 text-center`}>
                        <AlertCircle className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                        <p className="text-slate-500 dark:text-slate-400">
                          <FormattedMessage
                            id="chatter.payments.noTrackingData"
                            defaultMessage="Impossible de charger les details"
                          />
                        </p>
                      </div>
                    )
                  ) : (
                    <div className={`${GLASS_CARD} p-8 text-center`}>
                      <Eye className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
                      <p className="text-slate-500 dark:text-slate-400">
                        <FormattedMessage
                          id="chatter.payments.selectWithdrawal"
                          defaultMessage="Selectionnez un retrait pour voir les details"
                        />
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatterPayments;

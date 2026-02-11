/**
 * WithdrawalRequestForm - Centralized withdrawal request form
 *
 * A user-friendly form for requesting withdrawals with saved payment methods.
 * Features:
 * - Balance display
 * - Payment method selection (saved methods)
 * - Amount selection (all or custom)
 * - Fee and delivery estimation
 * - One-click withdrawal for returning users
 */

import React, { useState, useMemo, useEffect } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Wallet,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  CreditCard,
  Smartphone,
  Building2,
  Plus,
  ExternalLink,
  ChevronDown,
} from 'lucide-react';
import { UserPaymentMethod, PaymentMethodType } from '@/types/payment';
import TelegramConnect from '@/components/shared/TelegramConnect';
import TelegramConfirmationWaiting from '@/components/shared/TelegramConfirmationWaiting';

// ============================================================================
// DESIGN TOKENS
// ============================================================================

const UI = {
  card: 'bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg',
  input:
    'w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all',
  label: 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1',
  button: {
    primary:
      'bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed',
    secondary:
      'bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all',
    outline:
      'border-2 border-dashed border-gray-300 dark:border-white/20 hover:border-red-400 dark:hover:border-red-400 text-gray-600 dark:text-gray-300 font-medium rounded-xl transition-all',
  },
} as const;

// ============================================================================
// FEE & DELIVERY CONFIG
// ============================================================================

interface FeeConfig {
  percentage: number;
  fixedFee: number;
  minFee: number;
  deliveryDays: { min: number; max: number };
}

const FEE_CONFIG: Record<PaymentMethodType, FeeConfig> = {
  bank_transfer: {
    percentage: 0.5,
    fixedFee: 0,
    minFee: 0,
    deliveryDays: { min: 1, max: 3 },
  },
  mobile_money: {
    percentage: 1.0,
    fixedFee: 0,
    minFee: 0,
    deliveryDays: { min: 0, max: 1 },
  },
  wise: {
    percentage: 0.5,
    fixedFee: 0,
    minFee: 0,
    deliveryDays: { min: 1, max: 3 },
  },
};

// ============================================================================
// MOCK HOOKS (to be replaced with actual implementations)
// ============================================================================

interface UsePaymentMethodsReturn {
  methods: UserPaymentMethod[];
  defaultMethodId: string | null;
  loading: boolean;
  error: string | null;
}

interface UsePaymentConfigReturn {
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  loading: boolean;
}

// Temporary mock hooks - will be replaced by actual hook implementations
const usePaymentMethods = (): UsePaymentMethodsReturn => {
  // This would normally fetch from Firebase
  return {
    methods: [],
    defaultMethodId: null,
    loading: false,
    error: null,
  };
};

const usePaymentConfig = (): UsePaymentConfigReturn => {
  // This would normally fetch from Firebase config
  return {
    minimumWithdrawal: 1000, // $10.00 in cents
    maximumWithdrawal: 1000000, // $10,000.00 in cents
    loading: false,
  };
};

// ============================================================================
// COMPONENT PROPS
// ============================================================================

interface WithdrawalRequestFormProps {
  /** Available balance in cents */
  availableBalance: number;
  /** Currency code (default: USD) */
  currency?: string;
  /** Submit handler - receives payment method ID and optional amount */
  onSubmit: (paymentMethodId: string, amount?: number) => Promise<void>;
  /** Handler to navigate to add payment method flow */
  onAddPaymentMethod: () => void;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Success state */
  success?: boolean;
  /** Optional: pre-loaded payment methods */
  paymentMethods?: UserPaymentMethod[];
  /** Optional: default payment method ID */
  defaultPaymentMethodId?: string | null;
  /** User role for Telegram connection */
  role?: 'chatter' | 'influencer' | 'blogger' | 'groupAdmin';
  /** Whether user has Telegram connected */
  telegramConnected?: boolean;
  /** Called when user connects Telegram */
  onTelegramConnected?: () => void;
  /** Withdrawal ID for Telegram confirmation waiting */
  pendingConfirmationWithdrawalId?: string | null;
  /** Amount for Telegram confirmation display */
  pendingConfirmationAmount?: number;
  /** Callback when Telegram confirmation is done */
  onTelegramConfirmed?: () => void;
  /** Callback when Telegram confirmation is cancelled */
  onTelegramCancelled?: () => void;
  /** Callback when Telegram confirmation expires */
  onTelegramExpired?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get icon component for payment method type
 */
const getMethodIcon = (methodType: PaymentMethodType) => {
  switch (methodType) {
    case 'mobile_money':
      return Smartphone;
    case 'bank_transfer':
      return Building2;
    default:
      return CreditCard;
  }
};

/**
 * Calculate estimated fees
 */
const calculateFees = (
  amount: number,
  methodType: PaymentMethodType
): { fee: number; netAmount: number } => {
  const config = FEE_CONFIG[methodType];
  const percentageFee = Math.round(amount * (config.percentage / 100));
  const totalFee = Math.max(config.minFee, percentageFee + config.fixedFee);
  return {
    fee: totalFee,
    netAmount: Math.max(0, amount - totalFee),
  };
};

/**
 * Get delivery time estimate text
 */
const getDeliveryEstimate = (methodType: PaymentMethodType): string => {
  const config = FEE_CONFIG[methodType];
  if (config.deliveryDays.min === 0 && config.deliveryDays.max <= 1) {
    return 'Instant - 1 jour';
  }
  if (config.deliveryDays.min === config.deliveryDays.max) {
    return `${config.deliveryDays.min} jour${config.deliveryDays.min > 1 ? 's' : ''}`;
  }
  return `${config.deliveryDays.min}-${config.deliveryDays.max} jours`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const WithdrawalRequestForm: React.FC<WithdrawalRequestFormProps> = ({
  availableBalance,
  currency = 'USD',
  onSubmit,
  onAddPaymentMethod,
  loading = false,
  error,
  success = false,
  paymentMethods: propMethods,
  defaultPaymentMethodId: propDefaultMethodId,
  role,
  telegramConnected,
  onTelegramConnected,
  pendingConfirmationWithdrawalId,
  pendingConfirmationAmount,
  onTelegramConfirmed,
  onTelegramCancelled,
  onTelegramExpired,
}) => {
  const intl = useIntl();

  // Use provided methods or fetch from hook
  const hookData = usePaymentMethods();
  const methods = propMethods ?? hookData.methods;
  const defaultMethodId = propDefaultMethodId ?? hookData.defaultMethodId;
  const methodsLoading = propMethods ? false : hookData.loading;

  // Payment config
  const { minimumWithdrawal } = usePaymentConfig();

  // Form state
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<'all' | 'custom'>('all');
  const [customAmount, setCustomAmount] = useState<number>(0);
  const [customAmountInput, setCustomAmountInput] = useState<string>('');
  const [showMethodList, setShowMethodList] = useState(false);

  // Set default method when methods are loaded
  // Note: selectedMethodId is intentionally not in deps to avoid circular updates
  useEffect(() => {
    if (methods.length > 0) {
      setSelectedMethodId((current) => {
        // Only set if not already selected
        if (current) return current;
        // Try to use default method, otherwise use first method
        const defaultMethod = methods.find((m) => m.id === defaultMethodId) || methods[0];
        return defaultMethod?.id || null;
      });
    }
  }, [methods, defaultMethodId]);

  // Get selected method
  const selectedMethod = useMemo(() => {
    return methods.find((m) => m.id === selectedMethodId) || null;
  }, [methods, selectedMethodId]);

  // Calculate final amount
  const finalAmount = useMemo(() => {
    if (withdrawAmount === 'all') return availableBalance;
    return customAmount;
  }, [withdrawAmount, customAmount, availableBalance]);

  // Calculate fees and net amount
  const feeEstimate = useMemo(() => {
    if (!selectedMethod) return { fee: 0, netAmount: finalAmount };
    return calculateFees(finalAmount, selectedMethod.methodType);
  }, [finalAmount, selectedMethod]);

  // Validation
  const canSubmit = useMemo(() => {
    if (!selectedMethod) return false;
    if (finalAmount < minimumWithdrawal) return false;
    if (finalAmount > availableBalance) return false;
    if (loading || success) return false;
    return true;
  }, [selectedMethod, finalAmount, minimumWithdrawal, availableBalance, loading, success]);

  // Format currency
  const formatMoney = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  };

  // Handle custom amount input
  const handleCustomAmountChange = (value: string) => {
    setCustomAmountInput(value);
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (!isNaN(parsed)) {
      // Convert to cents
      const cents = Math.round(parsed * 100);
      setCustomAmount(Math.min(availableBalance, Math.max(0, cents)));
    } else {
      setCustomAmount(0);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedMethodId || !canSubmit) return;
    const amount = withdrawAmount === 'custom' ? customAmount : undefined;
    await onSubmit(selectedMethodId, amount);
  };

  // ============================================================================
  // RENDER: Telegram Connect Gate (no Telegram = show connect first)
  // ============================================================================

  if (role && telegramConnected === false && onTelegramConnected) {
    return <TelegramConnect role={role} onConnected={onTelegramConnected} />;
  }

  // ============================================================================
  // RENDER: Telegram Confirmation Waiting (after submit, waiting for Telegram)
  // ============================================================================

  if (pendingConfirmationWithdrawalId && onTelegramConfirmed && onTelegramCancelled && onTelegramExpired) {
    return (
      <TelegramConfirmationWaiting
        withdrawalId={pendingConfirmationWithdrawalId}
        amount={pendingConfirmationAmount || 0}
        currency={currency}
        onConfirmed={onTelegramConfirmed}
        onCancelled={onTelegramCancelled}
        onExpired={onTelegramExpired}
      />
    );
  }

  // ============================================================================
  // RENDER: Loading State
  // ============================================================================

  if (methodsLoading) {
    return (
      <div className={`${UI.card} p-6`}>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage
              id="payment.withdrawal.loading"
              defaultMessage="Chargement..."
            />
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Success State
  // ============================================================================

  if (success) {
    return (
      <div className={`${UI.card} p-6 space-y-6`}>
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              <FormattedMessage
                id="payment.withdrawal.success.title"
                defaultMessage="Demande envoyee !"
              />
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm">
              <FormattedMessage
                id="payment.withdrawal.success.description"
                defaultMessage="Votre demande de retrait de {amount} a ete soumise avec succes. Vous recevrez une notification une fois le virement effectue."
                values={{ amount: formatMoney(finalAmount) }}
              />
            </p>
          </div>

          {/* Delivery estimate */}
          {selectedMethod && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              <span>
                <FormattedMessage
                  id="payment.withdrawal.success.delivery"
                  defaultMessage="Delai estime: {time}"
                  values={{ time: getDeliveryEstimate(selectedMethod.methodType) }}
                />
              </span>
            </div>
          )}

          {/* Track link */}
          <button
            onClick={() => window.location.reload()}
            className={`${UI.button.secondary} px-6 py-3 flex items-center gap-2`}
          >
            <ExternalLink className="w-4 h-4" />
            <FormattedMessage
              id="payment.withdrawal.success.track"
              defaultMessage="Suivre mon retrait"
            />
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: No Payment Methods
  // ============================================================================

  if (methods.length === 0) {
    return (
      <div className={`${UI.card} p-6 space-y-6`}>
        {/* Balance Display */}
        <div className="text-center p-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            <FormattedMessage
              id="payment.withdrawal.availableBalance"
              defaultMessage="Solde disponible"
            />
          </p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {formatMoney(availableBalance)}
          </p>
        </div>

        {/* No methods message */}
        <div className="flex flex-col items-center justify-center py-8 space-y-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center">
            <CreditCard className="w-8 h-8 text-gray-400" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              <FormattedMessage
                id="payment.withdrawal.noMethods.title"
                defaultMessage="Aucune methode de paiement"
              />
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-sm">
              <FormattedMessage
                id="payment.withdrawal.noMethods.description"
                defaultMessage="Ajoutez une methode de paiement pour pouvoir effectuer des retraits."
              />
            </p>
          </div>

          <button
            onClick={onAddPaymentMethod}
            className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}
          >
            <Plus className="w-5 h-5" />
            <FormattedMessage
              id="payment.withdrawal.addMethod"
              defaultMessage="Ajouter une methode"
            />
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: Main Form
  // ============================================================================

  return (
    <div className={`${UI.card} p-6 space-y-6`}>
      {/* Section 1: Balance Display */}
      <div className="text-center p-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 rounded-xl">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
          <FormattedMessage
            id="payment.withdrawal.availableBalance"
            defaultMessage="Solde disponible"
          />
        </p>
        <p className="text-3xl font-bold text-gray-900 dark:text-white">
          {formatMoney(availableBalance)}
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{currency}</p>
      </div>

      {/* Section 2: Payment Method Selection */}
      <div className="space-y-3">
        <label className={UI.label}>
          <FormattedMessage
            id="payment.withdrawal.selectMethod"
            defaultMessage="Methode de paiement"
          />
        </label>

        {/* Selected method display / dropdown trigger */}
        <button
          onClick={() => setShowMethodList(!showMethodList)}
          className={`${UI.card} w-full p-4 flex items-center justify-between hover:shadow-md transition-all`}
        >
          {selectedMethod ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 dark:from-white/10 dark:to-white/5 flex items-center justify-center">
                {React.createElement(getMethodIcon(selectedMethod.methodType), {
                  className: 'w-5 h-5 text-gray-600 dark:text-gray-300',
                })}
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedMethod.displayName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedMethod.isDefault && (
                    <span className="text-green-500">
                      <FormattedMessage
                        id="payment.method.default"
                        defaultMessage="Par defaut"
                      />{' '}
                      -{' '}
                    </span>
                  )}
                  {selectedMethod.methodType === 'mobile_money'
                    ? 'Mobile Money'
                    : 'Virement bancaire'}
                </p>
              </div>
            </div>
          ) : (
            <span className="text-gray-500 dark:text-gray-400">
              <FormattedMessage
                id="payment.withdrawal.chooseMethod"
                defaultMessage="Choisir une methode"
              />
            </span>
          )}
          <ChevronDown
            className={`w-5 h-5 text-gray-400 transition-transform ${showMethodList ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Method list dropdown */}
        {showMethodList && (
          <div className="space-y-2 mt-2">
            {methods.map((method) => {
              const Icon = getMethodIcon(method.methodType);
              const isSelected = method.id === selectedMethodId;
              return (
                <button
                  key={method.id}
                  onClick={() => {
                    setSelectedMethodId(method.id);
                    setShowMethodList(false);
                  }}
                  className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${
                    isSelected
                      ? 'bg-red-50 dark:bg-red-900/20 border-2 border-red-500'
                      : 'bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-white dark:bg-white/10'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 ${isSelected ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}
                    />
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className={`font-medium ${isSelected ? 'text-red-700 dark:text-red-300' : 'text-gray-900 dark:text-white'}`}
                    >
                      {method.displayName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {method.isDefault && (
                        <span className="text-green-500">Par defaut - </span>
                      )}
                      {method.methodType === 'mobile_money'
                        ? 'Mobile Money'
                        : 'Virement bancaire'}
                    </p>
                  </div>
                  {isSelected && <CheckCircle className="w-5 h-5 text-red-500" />}
                </button>
              );
            })}

            {/* Add new method button */}
            <button
              onClick={onAddPaymentMethod}
              className={`${UI.button.outline} w-full p-4 flex items-center justify-center gap-2`}
            >
              <Plus className="w-5 h-5" />
              <FormattedMessage
                id="payment.withdrawal.addNewMethod"
                defaultMessage="Ajouter une nouvelle methode"
              />
            </button>
          </div>
        )}
      </div>

      {/* Section 3: Amount Selection */}
      <div className="space-y-3">
        <label className={UI.label}>
          <FormattedMessage
            id="payment.withdrawal.amount"
            defaultMessage="Montant a retirer"
          />
        </label>

        <div className="flex gap-3">
          <button
            onClick={() => setWithdrawAmount('all')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              withdrawAmount === 'all'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}
          >
            <FormattedMessage
              id="payment.withdrawal.allBalance"
              defaultMessage="Tout retirer"
            />
          </button>
          <button
            onClick={() => setWithdrawAmount('custom')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              withdrawAmount === 'custom'
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}
          >
            <FormattedMessage
              id="payment.withdrawal.customAmount"
              defaultMessage="Montant personnalise"
            />
          </button>
        </div>

        {withdrawAmount === 'all' && (
          <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
            <p className="text-2xl font-bold text-gray-900 dark:text-white text-center">
              {formatMoney(availableBalance)}
            </p>
          </div>
        )}

        {withdrawAmount === 'custom' && (
          <div className="space-y-2">
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">
                {currency === 'USD' ? '$' : currency === 'EUR' ? 'E' : currency}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={customAmountInput}
                onChange={(e) => handleCustomAmountChange(e.target.value)}
                className={`${UI.input} pl-10 text-lg font-medium`}
                placeholder="0.00"
              />
            </div>

            {/* Minimum warning */}
            {customAmount > 0 && customAmount < minimumWithdrawal && (
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <FormattedMessage
                  id="payment.withdrawal.minimumWarning"
                  defaultMessage="Minimum: {amount}"
                  values={{ amount: formatMoney(minimumWithdrawal) }}
                />
              </div>
            )}

            {/* Maximum warning */}
            {customAmount > availableBalance && (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <FormattedMessage
                  id="payment.withdrawal.maxWarning"
                  defaultMessage="Montant superieur au solde disponible"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Section 4: Fee & Delivery Estimation */}
      {selectedMethod && finalAmount > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <FormattedMessage
                id="payment.withdrawal.fees"
                defaultMessage="Frais estimes"
              />
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {feeEstimate.fee > 0 ? `- ${formatMoney(feeEstimate.fee)}` : 'Gratuit'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              <FormattedMessage
                id="payment.withdrawal.deliveryTime"
                defaultMessage="Delai de reception"
              />
            </span>
            <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-1">
              <Clock className="w-4 h-4 text-gray-400" />
              {getDeliveryEstimate(selectedMethod.methodType)}
            </span>
          </div>

          <div className="h-px bg-gray-200 dark:bg-white/10" />

          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              <FormattedMessage
                id="payment.withdrawal.youWillReceive"
                defaultMessage="Vous recevrez"
              />
            </span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatMoney(feeEstimate.netAmount)}
            </span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Section 5: Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <FormattedMessage
              id="payment.withdrawal.processing"
              defaultMessage="Traitement en cours..."
            />
          </>
        ) : (
          <>
            <Wallet className="w-5 h-5" />
            <FormattedMessage
              id="payment.withdrawal.submit"
              defaultMessage="Demander le retrait de {amount}"
              values={{ amount: formatMoney(finalAmount) }}
            />
            <ArrowRight className="w-5 h-5" />
          </>
        )}
      </button>

      {/* Disclaimer */}
      <p className="text-xs text-center text-gray-500 dark:text-gray-400">
        <FormattedMessage
          id="payment.withdrawal.disclaimer"
          defaultMessage="En cliquant sur le bouton, vous acceptez nos conditions de service concernant les retraits."
        />
      </p>
    </div>
  );
};

export default WithdrawalRequestForm;

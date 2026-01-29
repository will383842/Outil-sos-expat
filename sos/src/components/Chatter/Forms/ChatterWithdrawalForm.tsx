/**
 * ChatterWithdrawalForm - Withdrawal request form for chatters
 * Supports Wise, Mobile Money, and Bank Transfer payment methods
 */

import React, { useState, useMemo } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import {
  Wallet,
  Smartphone,
  Building2,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle,
} from 'lucide-react';
import {
  ChatterPaymentMethod,
  ChatterPaymentDetails,
  ChatterWiseDetails,
  ChatterMobileMoneyDetails,
  ChatterBankDetails,
} from '@/types/chatter';
import {
  MOBILE_MONEY_PROVIDERS,
  WISE_CURRENCIES,
} from '@/hooks/useChatterWithdrawal';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1",
  button: {
    primary: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
} as const;

interface ChatterWithdrawalFormProps {
  availableBalance: number;
  minimumWithdrawal: number;
  onSubmit: (method: ChatterPaymentMethod, details: ChatterPaymentDetails, amount?: number) => Promise<void>;
  loading?: boolean;
  error?: string | null;
  success?: boolean;
}

const ChatterWithdrawalForm: React.FC<ChatterWithdrawalFormProps> = ({
  availableBalance,
  minimumWithdrawal,
  onSubmit,
  loading = false,
  error,
  success,
}) => {
  const intl = useIntl();

  const [step, setStep] = useState<'method' | 'details' | 'confirm'>('method');
  const [selectedMethod, setSelectedMethod] = useState<ChatterPaymentMethod | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState<'all' | 'custom'>('all');
  const [customAmount, setCustomAmount] = useState<number>(0);

  // Wise details
  const [wiseDetails, setWiseDetails] = useState<Partial<ChatterWiseDetails>>({
    email: '',
    accountHolderName: '',
    currency: 'EUR',
  });

  // Mobile Money details
  const [mobileMoneyDetails, setMobileMoneyDetails] = useState<Partial<ChatterMobileMoneyDetails>>({
    provider: '',
    phoneNumber: '',
    country: '',
    accountName: '',
  });

  // Bank details
  const [bankDetails, setBankDetails] = useState<Partial<ChatterBankDetails>>({
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    country: '',
    currency: 'XOF',
    iban: '',
    swiftBic: '',
  });

  // Format amount in cents to display
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents);
  };

  // Get final amount to withdraw
  const finalAmount = useMemo(() => {
    if (withdrawAmount === 'all') return availableBalance;
    return customAmount;
  }, [withdrawAmount, customAmount, availableBalance]);

  // Get mobile money providers for selected country
  const mobileProviders = useMemo(() => {
    if (!mobileMoneyDetails.country) return [];
    return MOBILE_MONEY_PROVIDERS[mobileMoneyDetails.country] || [];
  }, [mobileMoneyDetails.country]);

  // Handle method selection
  const selectMethod = (method: ChatterPaymentMethod) => {
    setSelectedMethod(method);
    setStep('details');
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedMethod) return;

    let details: ChatterPaymentDetails;

    switch (selectedMethod) {
      case 'wise':
        details = wiseDetails as ChatterWiseDetails;
        break;
      case 'mobile_money':
        details = mobileMoneyDetails as ChatterMobileMoneyDetails;
        break;
      case 'bank_transfer':
        details = bankDetails as ChatterBankDetails;
        break;
      default:
        return;
    }

    const amount = withdrawAmount === 'custom' ? customAmount : undefined;
    await onSubmit(selectedMethod, details, amount);
  };

  // Method selection step
  const renderMethodStep = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        <FormattedMessage id="chatter.withdraw.selectMethod" defaultMessage="Choisissez votre méthode de paiement" />
      </h3>

      <button
        onClick={() => selectMethod('wise')}
        className={`${UI.card} w-full p-4 flex items-center justify-between hover:shadow-lg transition-all`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
            <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white">Wise</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.withdraw.wiseDesc" defaultMessage="Virement international rapide" />
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>

      <button
        onClick={() => selectMethod('mobile_money')}
        className={`${UI.card} w-full p-4 flex items-center justify-between hover:shadow-lg transition-all`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-amber-100 dark:from-orange-900/30 dark:to-amber-900/30 flex items-center justify-center">
            <Smartphone className="w-6 h-6 text-orange-600 dark:text-orange-400" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white">Mobile Money</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.withdraw.mobileDesc" defaultMessage="Orange Money, Wave, MTN..." />
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>

      <button
        onClick={() => selectMethod('bank_transfer')}
        className={`${UI.card} w-full p-4 flex items-center justify-between hover:shadow-lg transition-all`}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="chatter.withdraw.bankTransfer" defaultMessage="Virement bancaire" />
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="chatter.withdraw.bankDesc" defaultMessage="IBAN ou compte local" />
            </p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-gray-400" />
      </button>
    </div>
  );

  // Wise details form
  const renderWiseForm = () => (
    <div className="space-y-4">
      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.withdraw.wise.email" defaultMessage="Email Wise" />
        </label>
        <input
          type="email"
          value={wiseDetails.email}
          onChange={(e) => setWiseDetails({ ...wiseDetails, email: e.target.value })}
          className={UI.input}
          placeholder="votre@email.com"
        />
      </div>

      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.withdraw.accountHolder" defaultMessage="Nom du titulaire" />
        </label>
        <input
          type="text"
          value={wiseDetails.accountHolderName}
          onChange={(e) => setWiseDetails({ ...wiseDetails, accountHolderName: e.target.value })}
          className={UI.input}
          placeholder="Nom complet"
        />
      </div>

      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.withdraw.currency" defaultMessage="Devise de réception" />
        </label>
        <select
          value={wiseDetails.currency}
          onChange={(e) => setWiseDetails({ ...wiseDetails, currency: e.target.value })}
          className={UI.input}
        >
          {WISE_CURRENCIES.map(curr => (
            <option key={curr.code} value={curr.code}>
              {curr.symbol} - {curr.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  // Mobile Money details form
  const renderMobileMoneyForm = () => (
    <div className="space-y-4">
      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.withdraw.country" defaultMessage="Pays" />
        </label>
        <select
          value={mobileMoneyDetails.country}
          onChange={(e) => setMobileMoneyDetails({ ...mobileMoneyDetails, country: e.target.value, provider: '' })}
          className={UI.input}
        >
          <option value="">Sélectionner un pays</option>
          {Object.keys(MOBILE_MONEY_PROVIDERS).map(code => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
      </div>

      {mobileMoneyDetails.country && (
        <div>
          <label className={UI.label}>
            <FormattedMessage id="chatter.withdraw.provider" defaultMessage="Opérateur" />
          </label>
          <select
            value={mobileMoneyDetails.provider}
            onChange={(e) => setMobileMoneyDetails({ ...mobileMoneyDetails, provider: e.target.value as ChatterMobileMoneyDetails['provider'] })}
            className={UI.input}
          >
            <option value="">Sélectionner un opérateur</option>
            {mobileProviders.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.withdraw.phoneNumber" defaultMessage="Numéro de téléphone" />
        </label>
        <input
          type="tel"
          value={mobileMoneyDetails.phoneNumber}
          onChange={(e) => setMobileMoneyDetails({ ...mobileMoneyDetails, phoneNumber: e.target.value })}
          className={UI.input}
          placeholder="+221 77 123 45 67"
        />
      </div>

      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.withdraw.accountName" defaultMessage="Nom du compte" />
        </label>
        <input
          type="text"
          value={mobileMoneyDetails.accountName}
          onChange={(e) => setMobileMoneyDetails({ ...mobileMoneyDetails, accountName: e.target.value })}
          className={UI.input}
          placeholder="Nom enregistré"
        />
      </div>
    </div>
  );

  // Bank details form
  const renderBankForm = () => (
    <div className="space-y-4">
      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.withdraw.bankName" defaultMessage="Nom de la banque" />
        </label>
        <input
          type="text"
          value={bankDetails.bankName}
          onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
          className={UI.input}
          placeholder="Ex: SGBS, CBAO..."
        />
      </div>

      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.withdraw.accountHolder" defaultMessage="Nom du titulaire" />
        </label>
        <input
          type="text"
          value={bankDetails.accountHolderName}
          onChange={(e) => setBankDetails({ ...bankDetails, accountHolderName: e.target.value })}
          className={UI.input}
          placeholder="Nom complet"
        />
      </div>

      <div>
        <label className={UI.label}>
          <FormattedMessage id="chatter.withdraw.accountNumber" defaultMessage="Numéro de compte / IBAN" />
        </label>
        <input
          type="text"
          value={bankDetails.accountNumber}
          onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
          className={UI.input}
          placeholder="Numéro de compte"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={UI.label}>
            <FormattedMessage id="chatter.withdraw.country" defaultMessage="Pays" />
          </label>
          <input
            type="text"
            value={bankDetails.country}
            onChange={(e) => setBankDetails({ ...bankDetails, country: e.target.value })}
            className={UI.input}
            placeholder="SN"
          />
        </div>
        <div>
          <label className={UI.label}>
            <FormattedMessage id="chatter.withdraw.swift" defaultMessage="Code SWIFT/BIC" />
          </label>
          <input
            type="text"
            value={bankDetails.swiftBic}
            onChange={(e) => setBankDetails({ ...bankDetails, swiftBic: e.target.value })}
            className={UI.input}
            placeholder="Optionnel"
          />
        </div>
      </div>
    </div>
  );

  // Details step
  const renderDetailsStep = () => (
    <div className="space-y-6">
      <button
        onClick={() => setStep('method')}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ChevronRight className="w-4 h-4 rotate-180" />
        <FormattedMessage id="common.back" defaultMessage="Retour" />
      </button>

      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {selectedMethod === 'wise' && 'Wise'}
        {selectedMethod === 'mobile_money' && 'Mobile Money'}
        {selectedMethod === 'bank_transfer' && intl.formatMessage({ id: 'chatter.withdraw.bankTransfer', defaultMessage: 'Virement bancaire' })}
      </h3>

      {/* Amount Selection */}
      <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
        <label className={UI.label}>
          <FormattedMessage id="chatter.withdraw.amount" defaultMessage="Montant à retirer" />
        </label>
        <div className="flex gap-3 mt-2">
          <button
            onClick={() => setWithdrawAmount('all')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              withdrawAmount === 'all'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'
            }`}
          >
            <FormattedMessage id="chatter.withdraw.allBalance" defaultMessage="Tout ({amount})" values={{ amount: formatAmount(availableBalance) }} />
          </button>
          <button
            onClick={() => setWithdrawAmount('custom')}
            className={`flex-1 py-3 rounded-xl font-medium transition-all ${
              withdrawAmount === 'custom'
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
                : 'bg-white dark:bg-white/10 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-white/10'
            }`}
          >
            <FormattedMessage id="chatter.withdraw.customAmount" defaultMessage="Montant personnalisé" />
          </button>
        </div>

        {withdrawAmount === 'custom' && (
          <div className="mt-3">
            <input
              type="number"
              value={customAmount}
              onChange={(e) => setCustomAmount(Math.min(availableBalance, Math.max(minimumWithdrawal, parseInt(e.target.value) || 0)))}
              className={UI.input}
              min={minimumWithdrawal}
              max={availableBalance}
              placeholder={`Min: ${formatAmount(minimumWithdrawal)}`}
            />
          </div>
        )}
      </div>

      {/* Payment Details */}
      {selectedMethod === 'wise' && renderWiseForm()}
      {selectedMethod === 'mobile_money' && renderMobileMoneyForm()}
      {selectedMethod === 'bank_transfer' && renderBankForm()}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700 dark:text-green-300">
            <FormattedMessage id="chatter.withdraw.success" defaultMessage="Demande de retrait envoyée avec succès !" />
          </p>
        </div>
      )}

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading || success}
        className={`${UI.button.primary} w-full py-4 flex items-center justify-center gap-2`}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <FormattedMessage id="chatter.withdraw.processing" defaultMessage="Traitement en cours..." />
          </>
        ) : (
          <>
            <FormattedMessage id="chatter.withdraw.confirm" defaultMessage="Confirmer le retrait de {amount}" values={{ amount: formatAmount(finalAmount) }} />
          </>
        )}
      </button>
    </div>
  );

  return (
    <div className={`${UI.card} p-6`}>
      {step === 'method' && renderMethodStep()}
      {step === 'details' && renderDetailsStep()}
    </div>
  );
};

export default ChatterWithdrawalForm;

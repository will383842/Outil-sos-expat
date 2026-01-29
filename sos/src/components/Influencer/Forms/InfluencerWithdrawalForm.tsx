/**
 * InfluencerWithdrawalForm - Form to request a withdrawal
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useInfluencer } from '@/hooks/useInfluencer';
import { Loader2, AlertCircle, Check } from 'lucide-react';

interface InfluencerWithdrawalFormProps {
  availableBalance: number;
  minimumAmount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

type PaymentMethod = 'wise' | 'paypal' | 'bank_transfer';

const InfluencerWithdrawalForm: React.FC<InfluencerWithdrawalFormProps> = ({
  availableBalance,
  minimumAmount,
  onSuccess,
  onCancel,
}) => {
  const intl = useIntl();
  const { refreshDashboard } = useInfluencer();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wise');
  const [formData, setFormData] = useState({
    amount: availableBalance,
    // Wise
    wiseEmail: '',
    wiseCurrency: 'USD',
    wiseAccountHolder: '',
    // PayPal
    paypalEmail: '',
    paypalCurrency: 'USD',
    paypalAccountHolder: '',
    // Bank
    bankName: '',
    bankAccountHolder: '',
    bankAccountNumber: '',
    bankIban: '',
    bankSwift: '',
    bankCountry: '',
    bankCurrency: 'USD',
  });

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const functions = getFunctions(undefined, 'europe-west1');
      const requestWithdrawal = httpsCallable(functions, 'influencerRequestWithdrawal');

      let paymentDetails;
      switch (paymentMethod) {
        case 'wise':
          paymentDetails = {
            type: 'wise' as const,
            email: formData.wiseEmail,
            currency: formData.wiseCurrency,
            accountHolderName: formData.wiseAccountHolder,
          };
          break;
        case 'paypal':
          paymentDetails = {
            type: 'paypal' as const,
            email: formData.paypalEmail,
            currency: formData.paypalCurrency,
            accountHolderName: formData.paypalAccountHolder,
          };
          break;
        case 'bank_transfer':
          paymentDetails = {
            type: 'bank_transfer' as const,
            bankName: formData.bankName,
            accountHolderName: formData.bankAccountHolder,
            accountNumber: formData.bankAccountNumber,
            iban: formData.bankIban || undefined,
            swiftCode: formData.bankSwift || undefined,
            country: formData.bankCountry,
            currency: formData.bankCurrency,
          };
          break;
      }

      const result = await requestWithdrawal({
        amount: formData.amount,
        paymentMethod,
        paymentDetails,
      });

      const data = result.data as { success: boolean };

      if (data.success) {
        setSuccess(true);
        refreshDashboard();
        setTimeout(onSuccess, 2000);
      }
    } catch (err: unknown) {
      console.error('Withdrawal error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Withdrawal request failed';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          <FormattedMessage id="influencer.withdrawal.success.title" defaultMessage="Demande envoyée !" />
        </h3>
        <p className="text-gray-500 dark:text-gray-400">
          <FormattedMessage id="influencer.withdrawal.success.message" defaultMessage="Votre demande de retrait sera traitée sous 48h." />
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          <FormattedMessage id="influencer.withdrawal.amount" defaultMessage="Montant à retirer" />
        </label>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">$</span>
          <input
            type="number"
            min={minimumAmount / 100}
            max={availableBalance / 100}
            step="0.01"
            value={(formData.amount / 100).toFixed(2)}
            onChange={(e) => setFormData({ ...formData, amount: Math.round(parseFloat(e.target.value) * 100) })}
            className="flex-1 px-4 py-3 text-2xl font-bold rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          <FormattedMessage
            id="influencer.withdrawal.available"
            defaultMessage="Disponible : {amount}"
            values={{ amount: formatCurrency(availableBalance) }}
          />
        </p>
      </div>

      {/* Payment Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          <FormattedMessage id="influencer.withdrawal.method" defaultMessage="Méthode de paiement" />
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['wise', 'paypal', 'bank_transfer'] as PaymentMethod[]).map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setPaymentMethod(method)}
              className={`px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                paymentMethod === method
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {method === 'wise' && 'Wise'}
              {method === 'paypal' && 'PayPal'}
              {method === 'bank_transfer' && intl.formatMessage({ id: 'influencer.withdrawal.bankTransfer', defaultMessage: 'Virement' })}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Details */}
      {paymentMethod === 'wise' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.withdrawal.wiseEmail" defaultMessage="Email Wise" /> *
            </label>
            <input
              type="email"
              required
              value={formData.wiseEmail}
              onChange={(e) => setFormData({ ...formData, wiseEmail: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.withdrawal.accountHolder" defaultMessage="Nom du titulaire" /> *
            </label>
            <input
              type="text"
              required
              value={formData.wiseAccountHolder}
              onChange={(e) => setFormData({ ...formData, wiseAccountHolder: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
        </div>
      )}

      {paymentMethod === 'paypal' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.withdrawal.paypalEmail" defaultMessage="Email PayPal" /> *
            </label>
            <input
              type="email"
              required
              value={formData.paypalEmail}
              onChange={(e) => setFormData({ ...formData, paypalEmail: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.withdrawal.accountHolder" defaultMessage="Nom du titulaire" /> *
            </label>
            <input
              type="text"
              required
              value={formData.paypalAccountHolder}
              onChange={(e) => setFormData({ ...formData, paypalAccountHolder: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
        </div>
      )}

      {paymentMethod === 'bank_transfer' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FormattedMessage id="influencer.withdrawal.bankName" defaultMessage="Nom de la banque" /> *
              </label>
              <input
                type="text"
                required
                value={formData.bankName}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                <FormattedMessage id="influencer.withdrawal.bankCountry" defaultMessage="Pays" /> *
              </label>
              <input
                type="text"
                required
                maxLength={2}
                placeholder="FR"
                value={formData.bankCountry}
                onChange={(e) => setFormData({ ...formData, bankCountry: e.target.value.toUpperCase() })}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.withdrawal.accountHolder" defaultMessage="Nom du titulaire" /> *
            </label>
            <input
              type="text"
              required
              value={formData.bankAccountHolder}
              onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.withdrawal.iban" defaultMessage="IBAN" />
            </label>
            <input
              type="text"
              value={formData.bankIban}
              onChange={(e) => setFormData({ ...formData, bankIban: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <FormattedMessage id="influencer.withdrawal.accountNumber" defaultMessage="Numéro de compte" /> *
            </label>
            <input
              type="text"
              required
              value={formData.bankAccountNumber}
              onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
        </button>
        <button
          type="submit"
          disabled={loading || formData.amount < minimumAmount}
          className="flex-1 px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white font-medium transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <FormattedMessage id="influencer.withdrawal.submitting" defaultMessage="Envoi..." />
            </>
          ) : (
            <FormattedMessage id="influencer.withdrawal.submit" defaultMessage="Demander le retrait" />
          )}
        </button>
      </div>
    </form>
  );
};

export default InfluencerWithdrawalForm;

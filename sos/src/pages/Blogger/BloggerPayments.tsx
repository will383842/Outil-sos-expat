/**
 * BloggerPayments - Withdrawal requests and payment history for bloggers
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useBlogger } from '@/hooks/useBlogger';
import { BloggerDashboardLayout } from '@/components/Blogger';
import { DollarSign, Clock, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { BloggerPaymentMethod, BloggerPaymentDetails } from '@/types/blogger';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-medium rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed",
    secondary: "bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500",
  select: "w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500",
} as const;

const PAYMENT_METHODS: { value: BloggerPaymentMethod; label: string; description: string }[] = [
  { value: 'paypal', label: 'PayPal', description: 'Réception rapide sur votre compte PayPal' },
  { value: 'wise', label: 'Wise', description: 'Transfert international à faibles frais' },
  { value: 'mobile_money', label: 'Mobile Money', description: 'Orange Money, MTN, M-Pesa, etc.' },
];

const BloggerPayments: React.FC = () => {
  const intl = useIntl();
  const { dashboardData: dashboard, withdrawals, requestWithdrawal, isLoading } = useBlogger();
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    paymentMethod: 'paypal' as BloggerPaymentMethod,
    paymentDetails: '',
  });

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const availableBalance = dashboard?.blogger?.availableBalance || 0;
  const minimumWithdrawal = dashboard?.config?.minimumWithdrawalAmount || 5000; // $50 default
  const canWithdraw = availableBalance >= minimumWithdrawal;
  const hasPendingWithdrawal = withdrawals.some(w => ['pending', 'approved', 'processing'].includes(w.status));

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending': case 'approved': case 'processing': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'rejected': case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return intl.formatMessage({ id: 'blogger.payments.status.pending', defaultMessage: 'En attente' });
      case 'approved': return intl.formatMessage({ id: 'blogger.payments.status.approved', defaultMessage: 'Approuvé' });
      case 'processing': return intl.formatMessage({ id: 'blogger.payments.status.processing', defaultMessage: 'En cours' });
      case 'completed': return intl.formatMessage({ id: 'blogger.payments.status.completed', defaultMessage: 'Terminé' });
      case 'failed': return intl.formatMessage({ id: 'blogger.payments.status.failed', defaultMessage: 'Échoué' });
      case 'rejected': return intl.formatMessage({ id: 'blogger.payments.status.rejected', defaultMessage: 'Rejeté' });
      default: return status;
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setWithdrawError(null);

    const amountCents = Math.round(parseFloat(withdrawForm.amount) * 100);

    if (amountCents < minimumWithdrawal) {
      setWithdrawError(intl.formatMessage({
        id: 'blogger.payments.error.minimum',
        defaultMessage: 'Le montant minimum est de {amount}'
      }, { amount: formatCurrency(minimumWithdrawal) }));
      setIsSubmitting(false);
      return;
    }

    if (amountCents > availableBalance) {
      setWithdrawError(intl.formatMessage({
        id: 'blogger.payments.error.insufficient',
        defaultMessage: 'Solde insuffisant'
      }));
      setIsSubmitting(false);
      return;
    }

    try {
      // Build payment details based on method
      let paymentDetails: BloggerPaymentDetails;
      if (withdrawForm.paymentMethod === 'paypal') {
        paymentDetails = {
          type: 'paypal',
          email: withdrawForm.paymentDetails,
          currency: 'USD',
          accountHolderName: dashboard?.blogger?.firstName || '',
        };
      } else if (withdrawForm.paymentMethod === 'wise') {
        paymentDetails = {
          type: 'wise',
          email: withdrawForm.paymentDetails,
          currency: 'USD',
          accountHolderName: dashboard?.blogger?.firstName || '',
        };
      } else {
        paymentDetails = {
          type: 'mobile_money',
          provider: 'mtn',
          phoneNumber: withdrawForm.paymentDetails,
          country: dashboard?.blogger?.country || 'CM',
          currency: 'XAF',
          accountName: dashboard?.blogger?.firstName || '',
        };
      }

      const result = await requestWithdrawal({
        amount: amountCents,
        paymentMethod: withdrawForm.paymentMethod,
        paymentDetails,
      });

      if (result.success) {
        setShowWithdrawForm(false);
        setWithdrawForm({ amount: '', paymentMethod: 'paypal', paymentDetails: '' });
      } else {
        setWithdrawError(result.error || 'Une erreur est survenue');
      }
    } catch (err) {
      setWithdrawError('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading && !dashboard) {
    return (
      <BloggerDashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      </BloggerDashboardLayout>
    );
  }

  return (
    <BloggerDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="blogger.payments.title" defaultMessage="Mes paiements" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="blogger.payments.subtitle" defaultMessage="Gérez vos retraits et consultez l'historique" />
          </p>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${UI.card} p-6`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="blogger.payments.available" defaultMessage="Disponible pour retrait" />
            </p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(availableBalance)}
            </p>
          </div>
          <div className={`${UI.card} p-6`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="blogger.payments.minimum" defaultMessage="Minimum de retrait" />
            </p>
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
              {formatCurrency(minimumWithdrawal)}
            </p>
          </div>
          <div className={`${UI.card} p-6 flex flex-col justify-center`}>
            {hasPendingWithdrawal ? (
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  <FormattedMessage id="blogger.payments.pendingWithdrawal" defaultMessage="Retrait en cours de traitement" />
                </p>
              </div>
            ) : canWithdraw ? (
              <button
                onClick={() => setShowWithdrawForm(true)}
                className={`${UI.button.primary} px-6 py-3 w-full`}
              >
                <FormattedMessage id="blogger.payments.requestWithdrawal" defaultMessage="Demander un retrait" />
              </button>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="blogger.payments.needMore"
                    defaultMessage="Il vous manque {amount} pour retirer"
                    values={{ amount: formatCurrency(minimumWithdrawal - availableBalance) }}
                  />
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Withdrawal Form Modal */}
        {showWithdrawForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${UI.card} p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto`}>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                <FormattedMessage id="blogger.payments.withdrawTitle" defaultMessage="Demande de retrait" />
              </h2>

              <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FormattedMessage id="blogger.payments.amount" defaultMessage="Montant ($)" />
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={(minimumWithdrawal / 100).toFixed(2)}
                    max={(availableBalance / 100).toFixed(2)}
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm(prev => ({ ...prev, amount: e.target.value }))}
                    className={UI.input}
                    placeholder={`Min: ${(minimumWithdrawal / 100).toFixed(2)}`}
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    <FormattedMessage
                      id="blogger.payments.availableAmount"
                      defaultMessage="Disponible: {amount}"
                      values={{ amount: formatCurrency(availableBalance) }}
                    />
                  </p>
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <FormattedMessage id="blogger.payments.method" defaultMessage="Méthode de paiement" />
                  </label>
                  <div className="space-y-2">
                    {PAYMENT_METHODS.map((method) => (
                      <label
                        key={method.value}
                        className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                          withdrawForm.paymentMethod === method.value
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-purple-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="paymentMethod"
                          value={method.value}
                          checked={withdrawForm.paymentMethod === method.value}
                          onChange={(e) => setWithdrawForm(prev => ({ ...prev, paymentMethod: e.target.value as BloggerPaymentMethod }))}
                          className="mt-1"
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{method.label}</p>
                          <p className="text-xs text-gray-500">{method.description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Payment Details */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {withdrawForm.paymentMethod === 'paypal' && (
                      <FormattedMessage id="blogger.payments.paypalEmail" defaultMessage="Email PayPal" />
                    )}
                    {withdrawForm.paymentMethod === 'wise' && (
                      <FormattedMessage id="blogger.payments.wiseEmail" defaultMessage="Email Wise" />
                    )}
                    {withdrawForm.paymentMethod === 'mobile_money' && (
                      <FormattedMessage id="blogger.payments.mobileNumber" defaultMessage="Numéro Mobile Money" />
                    )}
                  </label>
                  <input
                    type={withdrawForm.paymentMethod === 'mobile_money' ? 'tel' : 'email'}
                    value={withdrawForm.paymentDetails}
                    onChange={(e) => setWithdrawForm(prev => ({ ...prev, paymentDetails: e.target.value }))}
                    className={UI.input}
                    placeholder={withdrawForm.paymentMethod === 'mobile_money' ? '+237 6XX XXX XXX' : 'email@example.com'}
                    required
                  />
                </div>

                {/* Error */}
                {withdrawError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-400 text-sm">
                    {withdrawError}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWithdrawForm(false)}
                    className={`${UI.button.secondary} flex-1 py-3`}
                  >
                    <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`${UI.button.primary} flex-1 py-3 flex items-center justify-center gap-2`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FormattedMessage id="blogger.payments.confirm" defaultMessage="Confirmer" />
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="blogger.payments.history" defaultMessage="Historique des paiements" />
          </h2>

          {withdrawals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <FormattedMessage id="blogger.payments.table.date" defaultMessage="Date" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <FormattedMessage id="blogger.payments.table.method" defaultMessage="Méthode" />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      <FormattedMessage id="blogger.payments.table.status" defaultMessage="Statut" />
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      <FormattedMessage id="blogger.payments.table.amount" defaultMessage="Montant" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {withdrawals.map((withdrawal) => (
                    <tr key={withdrawal.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                        {new Date(withdrawal.requestedAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 capitalize">
                        {withdrawal.paymentMethod.replace('_', ' ')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(withdrawal.status)}
                          <span className="text-sm">{getStatusLabel(withdrawal.status)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-medium text-gray-900 dark:text-white">
                        {formatCurrency(withdrawal.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <FormattedMessage
                id="blogger.payments.noHistory"
                defaultMessage="Aucun paiement effectué pour le moment"
              />
            </div>
          )}
        </div>
      </div>
    </BloggerDashboardLayout>
  );
};

export default BloggerPayments;

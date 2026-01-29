/**
 * InfluencerPayments - Withdrawal requests and payment history
 */

import React, { useState } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useInfluencer } from '@/hooks/useInfluencer';
import InfluencerDashboardLayout from '@/components/Influencer/Layout/InfluencerDashboardLayout';
import InfluencerWithdrawalForm from '@/components/Influencer/Forms/InfluencerWithdrawalForm';
import { DollarSign, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-medium rounded-xl transition-all",
  },
} as const;

const InfluencerPayments: React.FC = () => {
  const intl = useIntl();
  const { dashboard } = useInfluencer();
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  const canWithdraw = (dashboard?.influencer?.availableBalance || 0) >= (dashboard?.config?.minimumWithdrawalAmount || 5000);
  const hasPendingWithdrawal = !!dashboard?.influencer?.pendingWithdrawalId;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending': case 'approved': case 'processing': return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'rejected': case 'failed': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <InfluencerDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            <FormattedMessage id="influencer.payments.title" defaultMessage="Mes paiements" />
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="influencer.payments.subtitle" defaultMessage="Gérez vos retraits et consultez l'historique" />
          </p>
        </div>

        {/* Balance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${UI.card} p-6`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.payments.available" defaultMessage="Disponible pour retrait" />
            </p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(dashboard?.influencer?.availableBalance || 0)}
            </p>
          </div>
          <div className={`${UI.card} p-6`}>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="influencer.payments.minimum" defaultMessage="Minimum de retrait" />
            </p>
            <p className="text-3xl font-bold text-gray-600 dark:text-gray-400">
              {formatCurrency(dashboard?.config?.minimumWithdrawalAmount || 5000)}
            </p>
          </div>
          <div className={`${UI.card} p-6 flex flex-col justify-center`}>
            {hasPendingWithdrawal ? (
              <div className="text-center">
                <Clock className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                <p className="text-sm text-yellow-600 dark:text-yellow-400">
                  <FormattedMessage id="influencer.payments.pendingWithdrawal" defaultMessage="Retrait en cours de traitement" />
                </p>
              </div>
            ) : canWithdraw ? (
              <button
                onClick={() => setShowWithdrawForm(true)}
                className={`${UI.button.primary} px-6 py-3 w-full`}
              >
                <FormattedMessage id="influencer.payments.requestWithdrawal" defaultMessage="Demander un retrait" />
              </button>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  <FormattedMessage
                    id="influencer.payments.needMore"
                    defaultMessage="Il vous manque {amount} pour retirer"
                    values={{ amount: formatCurrency((dashboard?.config?.minimumWithdrawalAmount || 5000) - (dashboard?.influencer?.availableBalance || 0)) }}
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
                <FormattedMessage id="influencer.payments.withdrawTitle" defaultMessage="Demande de retrait" />
              </h2>
              <InfluencerWithdrawalForm
                availableBalance={dashboard?.influencer?.availableBalance || 0}
                minimumAmount={dashboard?.config?.minimumWithdrawalAmount || 5000}
                onSuccess={() => setShowWithdrawForm(false)}
                onCancel={() => setShowWithdrawForm(false)}
              />
            </div>
          </div>
        )}

        {/* Payment History */}
        <div className={`${UI.card} p-6`}>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <FormattedMessage id="influencer.payments.history" defaultMessage="Historique des paiements" />
          </h2>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <FormattedMessage
              id="influencer.payments.noHistory"
              defaultMessage="Aucun paiement effectué pour le moment"
            />
          </div>
        </div>
      </div>
    </InfluencerDashboardLayout>
  );
};

export default InfluencerPayments;

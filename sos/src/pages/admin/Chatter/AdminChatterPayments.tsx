/**
 * AdminChatterPayments - Admin page for processing chatter withdrawals
 * Lists pending withdrawals and allows approval/rejection
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FormattedMessage, useIntl } from 'react-intl';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from "@/config/firebase";
import {
  Wallet,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw,
  User,
  Building2,
  Smartphone,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import AdminErrorState from '@/components/admin/AdminErrorState';
import Modal from '../../../components/common/Modal';
import { StatusBadge } from '@/components/admin/StatusBadge';
import type { StatusType } from '@/components/admin/StatusBadge';

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
    success: "bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all",
  },
} as const;

interface Withdrawal {
  id: string;
  chatterId: string;
  chatterName: string;
  chatterEmail: string;
  amount: number;
  paymentMethod: string;
  paymentDetails: any;
  status: string;
  requestedAt: string;
  processedAt?: string;
  completedAt?: string;
  failedAt?: string;
  failReason?: string;
}

type TabType = 'pending' | 'processing' | 'completed' | 'failed';

const AdminChatterPayments: React.FC = () => {
  const intl = useIntl();

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Modal states
  const [rejectModal, setRejectModal] = useState<{ isOpen: boolean; withdrawalId: string }>({ isOpen: false, withdrawalId: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [completeModal, setCompleteModal] = useState<{ isOpen: boolean; withdrawalId: string }>({ isOpen: false, withdrawalId: '' });
  const [transactionId, setTransactionId] = useState('');

  // Fetch withdrawals
  const fetchWithdrawals = async () => {
    setLoading(true);
    setError(null);

    try {
      // Note: This would need a proper admin function to list all withdrawals
      // For now, we'll simulate with a placeholder
      const adminGetWithdrawals = httpsCallable<{ status?: string }, { withdrawals: Withdrawal[] }>(
        functionsAffiliate,
        'adminGetPendingChatterWithdrawals'
      );

      const result = await adminGetWithdrawals({ status: activeTab });
      setWithdrawals(result.data.withdrawals);
    } catch (err: any) {
      console.error('Error fetching withdrawals:', err);
      setError(err.message || 'Failed to load withdrawals');
      setWithdrawals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [activeTab]);

  // Format amount
  const formatAmount = (cents: number) => {
    return new Intl.NumberFormat(intl.locale, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(cents / 100);
  };

  // Handle approve
  const handleApprove = async (withdrawalId: string) => {
    setProcessingId(withdrawalId);

    try {
      const adminProcessWithdrawal = httpsCallable(functionsAffiliate, 'adminProcessChatterWithdrawal');
      await adminProcessWithdrawal({
        withdrawalId,
        action: 'approve',
      });

      await fetchWithdrawals();
    } catch (err: any) {
      console.error('Error approving withdrawal:', err);
      toast.error(err.message || 'Failed to approve');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle reject (via modal)
  const openRejectModal = (withdrawalId: string) => {
    setRejectReason('');
    setRejectModal({ isOpen: true, withdrawalId });
  };

  const confirmReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Veuillez saisir une raison');
      return;
    }

    const { withdrawalId } = rejectModal;
    setRejectModal({ isOpen: false, withdrawalId: '' });
    setProcessingId(withdrawalId);

    try {
      const adminProcessWithdrawal = httpsCallable(functionsAffiliate, 'adminProcessChatterWithdrawal');
      await adminProcessWithdrawal({
        withdrawalId,
        action: 'reject',
        reason: rejectReason.trim(),
      });

      await fetchWithdrawals();
    } catch (err: any) {
      console.error('Error rejecting withdrawal:', err);
      toast.error(err.message || 'Failed to reject');
    } finally {
      setProcessingId(null);
    }
  };

  // Handle mark complete (via modal)
  const openCompleteModal = (withdrawalId: string) => {
    setTransactionId('');
    setCompleteModal({ isOpen: true, withdrawalId });
  };

  const confirmComplete = async () => {
    const { withdrawalId } = completeModal;
    setCompleteModal({ isOpen: false, withdrawalId: '' });
    setProcessingId(withdrawalId);

    try {
      const adminProcessWithdrawal = httpsCallable(functionsAffiliate, 'adminProcessChatterWithdrawal');
      await adminProcessWithdrawal({
        withdrawalId,
        action: 'complete',
        transactionId: transactionId.trim() || undefined,
      });

      await fetchWithdrawals();
    } catch (err: any) {
      console.error('Error completing withdrawal:', err);
      toast.error(err.message || 'Failed to complete');
    } finally {
      setProcessingId(null);
    }
  };

  // Get payment method icon
  const getPaymentIcon = (method: string) => {
    switch (method) {
      case 'wise':
        return <Wallet className="w-5 h-5 text-green-500" />;
      case 'mobile_money':
        return <Smartphone className="w-5 h-5 text-orange-500" />;
      case 'bank_transfer':
        return <Building2 className="w-5 h-5 text-blue-500" />;
      default:
        return <Wallet className="w-5 h-5 text-gray-500" />;
    }
  };

  // Map payment status to StatusType for the unified StatusBadge
  const mapPaymentStatus = (status: string): StatusType => {
    switch (status) {
      case 'completed': return 'paid';
      case 'pending': return 'pending';
      case 'processing': return 'processing';
      case 'failed': return 'failed';
      default: return 'inactive';
    }
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: 'pending', label: 'En attente', icon: <Clock className="w-4 h-4" /> },
    { key: 'processing', label: 'En cours', icon: <Loader2 className="w-4 h-4" /> },
    { key: 'completed', label: 'Terminés', icon: <CheckCircle className="w-4 h-4" /> },
    { key: 'failed', label: 'Échoués', icon: <XCircle className="w-4 h-4" /> },
  ];

  return (
    <AdminLayout>
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Wallet className="w-8 h-8 text-red-500" />
            <FormattedMessage id="admin.chatterPayments.title" defaultMessage="Paiements Chatters" />
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            <FormattedMessage id="admin.chatterPayments.subtitle" defaultMessage="Gérez les demandes de retrait" />
          </p>
        </div>

        <button
          onClick={fetchWithdrawals}
          className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <FormattedMessage id="common.refresh" defaultMessage="Actualiser" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && <AdminErrorState error={error} onRetry={fetchWithdrawals} />}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : withdrawals.length === 0 ? (
        <div className={`${UI.card} p-8 text-center`}>
          <Wallet className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">
            <FormattedMessage id="admin.chatterPayments.empty" defaultMessage="Aucun retrait" />
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {withdrawals.map((withdrawal) => (
            <div key={withdrawal.id} className={`${UI.card} p-6`}>
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Chatter Info */}
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-400 to-orange-500 flex items-center justify-center text-white font-bold">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {withdrawal.chatterName}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {withdrawal.chatterEmail}
                    </p>
                  </div>
                </div>

                {/* Amount & Method */}
                <div className="flex items-center gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {formatAmount(withdrawal.amount)}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      {getPaymentIcon(withdrawal.paymentMethod)}
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {withdrawal.paymentMethod === 'wise' ? 'Wise' :
                         withdrawal.paymentMethod === 'mobile_money' ? 'Mobile Money' :
                         'Virement'}
                      </span>
                    </div>
                  </div>

                  {/* Status */}
                  <StatusBadge status={mapPaymentStatus(withdrawal.status)} label={withdrawal.status} />
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  {withdrawal.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(withdrawal.id)}
                        disabled={processingId === withdrawal.id}
                        className={`${UI.button.success} px-4 py-2 flex items-center gap-2`}
                      >
                        {processingId === withdrawal.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approuver
                      </button>
                      <button
                        onClick={() => openRejectModal(withdrawal.id)}
                        disabled={processingId === withdrawal.id}
                        className={`${UI.button.danger} px-4 py-2 flex items-center gap-2`}
                      >
                        <XCircle className="w-4 h-4" />
                        Rejeter
                      </button>
                    </>
                  )}

                  {withdrawal.status === 'processing' && (
                    <button
                      onClick={() => openCompleteModal(withdrawal.id)}
                      disabled={processingId === withdrawal.id}
                      className={`${UI.button.success} px-4 py-2 flex items-center gap-2`}
                    >
                      {processingId === withdrawal.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Marquer terminé
                    </button>
                  )}
                </div>
              </div>

              {/* Payment Details */}
              {withdrawal.paymentDetails && (
                <div className="mt-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Détails du paiement:</p>
                  <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                    {JSON.stringify(withdrawal.paymentDetails, null, 2)}
                  </pre>
                </div>
              )}

              {/* Fail Reason */}
              {withdrawal.failReason && (
                <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-300">
                    <strong>Raison de l'échec:</strong> {withdrawal.failReason}
                  </p>
                </div>
              )}

              {/* Dates */}
              <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span>Demandé: {new Date(withdrawal.requestedAt).toLocaleString(intl.locale)}</span>
                {withdrawal.processedAt && (
                  <span>Traité: {new Date(withdrawal.processedAt).toLocaleString(intl.locale)}</span>
                )}
                {withdrawal.completedAt && (
                  <span>Terminé: {new Date(withdrawal.completedAt).toLocaleString(intl.locale)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Rejection Modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => setRejectModal({ isOpen: false, withdrawalId: '' })}
        title="Rejeter le retrait"
        size="small"
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            Raison du rejet <span className="text-red-500">*</span>
          </label>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Saisissez la raison du rejet..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
            rows={3}
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setRejectModal({ isOpen: false, withdrawalId: '' })}
              className={`${UI.button.secondary} px-4 py-2`}
            >
              Annuler
            </button>
            <button
              onClick={confirmReject}
              disabled={!rejectReason.trim()}
              className={`${UI.button.danger} px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Confirmer le rejet
            </button>
          </div>
        </div>
      </Modal>

      {/* Complete Transaction Modal */}
      <Modal
        isOpen={completeModal.isOpen}
        onClose={() => setCompleteModal({ isOpen: false, withdrawalId: '' })}
        title="Marquer comme terminé"
        size="small"
      >
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            ID de transaction (optionnel)
          </label>
          <input
            type="text"
            value={transactionId}
            onChange={(e) => setTransactionId(e.target.value)}
            placeholder="Ex: TXN-123456..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            autoFocus
          />
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCompleteModal({ isOpen: false, withdrawalId: '' })}
              className={`${UI.button.secondary} px-4 py-2`}
            >
              Annuler
            </button>
            <button
              onClick={confirmComplete}
              className={`${UI.button.success} px-4 py-2`}
            >
              Confirmer
            </button>
          </div>
        </div>
      </Modal>
    </div>
    </AdminLayout>
  );
};

export default AdminChatterPayments;

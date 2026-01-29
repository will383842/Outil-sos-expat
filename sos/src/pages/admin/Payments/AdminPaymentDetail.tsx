/**
 * AdminPaymentDetail.tsx
 *
 * Detail view for a single withdrawal request.
 * Shows full withdrawal details, status history, payment method info,
 * and allows admin actions (approve, reject, process, mark completed/failed).
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import AdminLayout from '../../../components/admin/AdminLayout';
import Button from '../../../components/common/Button';
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  User,
  Mail,
  DollarSign,
  CreditCard,
  Calendar,
  AlertTriangle,
  Send,
  Ban,
  Loader2,
  ExternalLink,
  Copy,
  Phone,
  Globe,
  Building,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { PaymentUserType, WithdrawalStatus } from '../../../types/payment';

// ============================================================================
// TYPES
// ============================================================================

interface WithdrawalDetail {
  id: string;
  userType: PaymentUserType;
  userId: string;
  userEmail: string;
  userName: string;
  amount: number;
  sourceCurrency: string;
  targetCurrency: string;
  exchangeRate?: number;
  convertedAmount?: number;
  fees?: number;
  netAmount?: number;
  status: WithdrawalStatus;
  paymentMethod: string;
  paymentDetails?: Record<string, unknown>;
  commissionCount?: number;
  commissionIds?: string[];
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  processedAt?: Date;
  processedBy?: string;
  completedAt?: Date;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  failedAt?: Date;
  failureReason?: string;
  paymentReference?: string;
  transactionId?: string;
  adminNotes?: string;
}

interface StatusHistoryEntry {
  status: WithdrawalStatus;
  timestamp: Date;
  by?: string;
  note?: string;
}

interface RelatedCommission {
  id: string;
  type: string;
  amount: number;
  status: string;
  createdAt: Date;
  description?: string;
}

// ============================================================================
// STATUS TIMELINE COMPONENT
// ============================================================================

const StatusTimeline: React.FC<{ history: StatusHistoryEntry[] }> = ({ history }) => {
  const intl = useIntl();

  const getStatusColor = (status: WithdrawalStatus): string => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-500',
      validating: 'bg-blue-500',
      approved: 'bg-indigo-500',
      queued: 'bg-purple-500',
      processing: 'bg-blue-500',
      sent: 'bg-indigo-500',
      completed: 'bg-green-500',
      failed: 'bg-red-500',
      rejected: 'bg-red-500',
      cancelled: 'bg-gray-500',
    };
    return colors[status] || 'bg-gray-500';
  };

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {history.map((entry, idx) => (
          <li key={idx}>
            <div className="relative pb-8">
              {idx !== history.length - 1 && (
                <span
                  className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"
                  aria-hidden="true"
                />
              )}
              <div className="relative flex space-x-3">
                <div>
                  <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white ${getStatusColor(entry.status)}`}>
                    {entry.status === 'completed' ? (
                      <CheckCircle className="h-4 w-4 text-white" />
                    ) : entry.status === 'failed' || entry.status === 'rejected' ? (
                      <XCircle className="h-4 w-4 text-white" />
                    ) : entry.status === 'processing' ? (
                      <RefreshCw className="h-4 w-4 text-white" />
                    ) : (
                      <Clock className="h-4 w-4 text-white" />
                    )}
                  </span>
                </div>
                <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {intl.formatMessage({ id: `admin.withdrawals.status.${entry.status}`, defaultMessage: entry.status })}
                    </p>
                    {entry.note && (
                      <p className="mt-1 text-sm text-gray-500">{entry.note}</p>
                    )}
                    {entry.by && (
                      <p className="mt-1 text-xs text-gray-400">par {entry.by}</p>
                    )}
                  </div>
                  <div className="whitespace-nowrap text-right text-sm text-gray-500">
                    {intl.formatDate(entry.timestamp, { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ============================================================================
// PAYMENT DETAILS CARD COMPONENT
// ============================================================================

const PaymentDetailsCard: React.FC<{ method: string; details?: Record<string, unknown> }> = ({ method, details }) => {
  const intl = useIntl();

  if (!details) {
    return (
      <div className="text-gray-500 text-sm">
        <FormattedMessage id="admin.withdrawals.detail.noPaymentDetails" defaultMessage="Details de paiement non disponibles" />
      </div>
    );
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderField = (label: string, value: unknown, copyable = false) => {
    if (!value) return null;
    const strValue = String(value);

    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{strValue}</span>
          {copyable && (
            <button
              onClick={() => copyToClipboard(strValue)}
              className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
              title={intl.formatMessage({ id: 'common.copy', defaultMessage: 'Copier' })}
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {method === 'wise' && (
        <>
          {renderField('Email', details.email, true)}
          {renderField('Titulaire', details.accountHolderName)}
          {renderField('Devise', details.currency)}
          {renderField('IBAN', details.iban, true)}
          {renderField('BIC/SWIFT', details.bic || details.swiftBic, true)}
          {renderField('Account Number', details.accountNumber, true)}
          {renderField('Routing Number', details.routingNumber, true)}
          {renderField('Sort Code', details.sortCode, true)}
        </>
      )}
      {method === 'paypal' && (
        <>
          {renderField('Email PayPal', details.email, true)}
          {renderField('Titulaire', details.accountHolderName)}
          {renderField('Devise', details.currency)}
        </>
      )}
      {method === 'mobile_money' && (
        <>
          {renderField('Operateur', details.provider)}
          {renderField('Telephone', details.phoneNumber, true)}
          {renderField('Nom du compte', details.accountName)}
          {renderField('Pays', details.country)}
          {renderField('Devise', details.currency)}
        </>
      )}
      {method === 'bank_transfer' && (
        <>
          {renderField('Banque', details.bankName)}
          {renderField('Titulaire', details.accountHolderName)}
          {renderField('Numero de compte', details.accountNumber, true)}
          {renderField('IBAN', details.iban, true)}
          {renderField('BIC/SWIFT', details.swiftCode || details.swiftBic, true)}
          {renderField('Routing Number', details.routingNumber, true)}
          {renderField('Pays', details.country)}
          {renderField('Devise', details.currency)}
        </>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminPaymentDetail: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { userType, withdrawalId } = useParams<{ userType: PaymentUserType; withdrawalId: string }>();

  // State
  const [withdrawal, setWithdrawal] = useState<WithdrawalDetail | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [relatedCommissions, setRelatedCommissions] = useState<RelatedCommission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modals
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const getCollectionName = (type: PaymentUserType): string => {
    switch (type) {
      case 'chatter': return 'chatter_withdrawals';
      case 'influencer': return 'influencer_withdrawals';
      case 'blogger': return 'blogger_withdrawals';
      default: return 'chatter_withdrawals';
    }
  };

  const getCommissionsCollectionName = (type: PaymentUserType): string => {
    switch (type) {
      case 'chatter': return 'chatter_commissions';
      case 'influencer': return 'influencer_commissions';
      case 'blogger': return 'blogger_commissions';
      default: return 'chatter_commissions';
    }
  };

  const fetchWithdrawal = useCallback(async () => {
    if (!userType || !withdrawalId) return;

    setIsLoading(true);
    setError(null);

    try {
      const colName = getCollectionName(userType as PaymentUserType);
      const docRef = doc(db, colName, withdrawalId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setError(intl.formatMessage({ id: 'admin.withdrawals.detail.notFound', defaultMessage: 'Retrait non trouve' }));
        return;
      }

      const data = docSnap.data();

      // Map to WithdrawalDetail
      let userId = '';
      let userEmail = '';
      let userName = '';

      if (userType === 'chatter') {
        userId = data.chatterId || '';
        userEmail = data.chatterEmail || '';
        userName = data.chatterName || '';
      } else if (userType === 'influencer') {
        userId = data.influencerId || '';
        userEmail = data.influencerEmail || '';
        userName = data.influencerName || `${data.influencerFirstName || ''} ${data.influencerLastName || ''}`.trim();
      } else if (userType === 'blogger') {
        userId = data.bloggerId || '';
        userEmail = data.bloggerEmail || '';
        userName = data.bloggerName || '';
      }

      const toDate = (val: unknown): Date | undefined => {
        if (val instanceof Timestamp) return val.toDate();
        if (val instanceof Date) return val;
        if (typeof val === 'string') return new Date(val);
        return undefined;
      };

      const detail: WithdrawalDetail = {
        id: docSnap.id,
        userType: userType as PaymentUserType,
        userId,
        userEmail,
        userName,
        amount: data.amount || 0,
        sourceCurrency: data.sourceCurrency || 'USD',
        targetCurrency: data.targetCurrency || data.sourceCurrency || 'USD',
        exchangeRate: data.exchangeRate,
        convertedAmount: data.convertedAmount,
        fees: data.fees,
        netAmount: data.netAmount,
        status: data.status || 'pending',
        paymentMethod: data.paymentMethod || 'unknown',
        paymentDetails: data.paymentDetails || data.paymentDetailsSnapshot,
        commissionCount: data.commissionCount,
        commissionIds: data.commissionIds,
        requestedAt: toDate(data.requestedAt) || new Date(),
        approvedAt: toDate(data.approvedAt),
        approvedBy: data.approvedBy,
        processedAt: toDate(data.processedAt),
        processedBy: data.processedBy,
        completedAt: toDate(data.completedAt),
        rejectedAt: toDate(data.rejectedAt),
        rejectedBy: data.rejectedBy,
        rejectionReason: data.rejectionReason,
        failedAt: toDate(data.failedAt),
        failureReason: data.failureReason,
        paymentReference: data.paymentReference,
        transactionId: data.transactionId || data.wiseTransferId || data.paypalTransactionId || data.flutterwaveRef,
        adminNotes: data.adminNotes,
      };

      setWithdrawal(detail);
      setAdminNotes(detail.adminNotes || '');

      // Build status history
      const history: StatusHistoryEntry[] = [];
      history.push({ status: 'pending', timestamp: detail.requestedAt });

      if (detail.approvedAt) {
        history.push({ status: 'approved', timestamp: detail.approvedAt, by: detail.approvedBy });
      }
      if (detail.processedAt) {
        history.push({ status: 'processing', timestamp: detail.processedAt, by: detail.processedBy });
      }
      if (detail.completedAt) {
        history.push({ status: 'completed', timestamp: detail.completedAt });
      }
      if (detail.rejectedAt) {
        history.push({ status: 'rejected', timestamp: detail.rejectedAt, by: detail.rejectedBy, note: detail.rejectionReason });
      }
      if (detail.failedAt) {
        history.push({ status: 'failed', timestamp: detail.failedAt, note: detail.failureReason });
      }

      // Sort by timestamp
      history.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
      setStatusHistory(history);

      // Fetch related commissions if available
      if (detail.commissionIds && detail.commissionIds.length > 0) {
        const commissionsCol = getCommissionsCollectionName(userType as PaymentUserType);
        const commissions: RelatedCommission[] = [];

        // Fetch in batches of 10 (Firestore in query limit)
        const chunks = [];
        for (let i = 0; i < detail.commissionIds.length; i += 10) {
          chunks.push(detail.commissionIds.slice(i, i + 10));
        }

        for (const chunk of chunks) {
          const q = query(
            collection(db, commissionsCol),
            where('__name__', 'in', chunk)
          );
          const snap = await getDocs(q);
          snap.forEach(doc => {
            const cData = doc.data();
            commissions.push({
              id: doc.id,
              type: cData.type || 'unknown',
              amount: cData.amount || 0,
              status: cData.status || 'unknown',
              createdAt: toDate(cData.createdAt) || new Date(),
              description: cData.description,
            });
          });
        }

        setRelatedCommissions(commissions);
      }
    } catch (err) {
      console.error('Error fetching withdrawal:', err);
      setError(intl.formatMessage({ id: 'admin.withdrawals.detail.error', defaultMessage: 'Erreur lors du chargement' }));
    } finally {
      setIsLoading(false);
    }
  }, [userType, withdrawalId, intl]);

  useEffect(() => {
    fetchWithdrawal();
  }, [fetchWithdrawal]);

  // ============================================================================
  // ACTIONS
  // ============================================================================

  const updateWithdrawal = async (updates: Record<string, unknown>) => {
    if (!withdrawal || !userType || !withdrawalId) return;

    setIsProcessing(true);
    setError(null);

    try {
      const colName = getCollectionName(userType as PaymentUserType);
      const docRef = doc(db, colName, withdrawalId);
      await updateDoc(docRef, updates);

      setSuccess(intl.formatMessage({ id: 'admin.withdrawals.detail.updateSuccess', defaultMessage: 'Mise a jour reussie' }));
      setTimeout(() => setSuccess(null), 3000);

      // Refresh data
      await fetchWithdrawal();
    } catch (err) {
      console.error('Error updating withdrawal:', err);
      setError(intl.formatMessage({ id: 'admin.withdrawals.detail.updateError', defaultMessage: 'Erreur lors de la mise a jour' }));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApprove = () => {
    updateWithdrawal({
      status: 'approved',
      approvedAt: Timestamp.now(),
      approvedBy: 'admin',
    });
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) return;

    updateWithdrawal({
      status: 'rejected',
      rejectedAt: Timestamp.now(),
      rejectedBy: 'admin',
      rejectionReason: rejectionReason.trim(),
    });

    setShowRejectModal(false);
    setRejectionReason('');
  };

  const handleProcess = () => {
    updateWithdrawal({
      status: 'processing',
      processedAt: Timestamp.now(),
      processedBy: 'admin',
    });
  };

  const handleComplete = () => {
    updateWithdrawal({
      status: 'completed',
      completedAt: Timestamp.now(),
      paymentReference: paymentReference.trim() || undefined,
    });

    setShowCompleteModal(false);
    setPaymentReference('');
  };

  const handleFail = () => {
    if (!failureReason.trim()) return;

    updateWithdrawal({
      status: 'failed',
      failedAt: Timestamp.now(),
      failureReason: failureReason.trim(),
    });

    setShowFailModal(false);
    setFailureReason('');
  };

  const handleSaveNotes = () => {
    updateWithdrawal({
      adminNotes: adminNotes.trim(),
    });
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-red-600" />
          <span className="ml-2 text-gray-600">
            <FormattedMessage id="common.loading" defaultMessage="Chargement..." />
          </span>
        </div>
      </AdminLayout>
    );
  }

  if (!withdrawal) {
    return (
      <AdminLayout>
        <div className="p-6">
          <Button variant="outline" onClick={() => navigate('/admin/payments/withdrawals')}>
            <ArrowLeft size={16} className="mr-2" />
            <FormattedMessage id="common.back" defaultMessage="Retour" />
          </Button>
          <div className="mt-8 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-600">{error || 'Retrait non trouve'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  const getStatusColor = (status: WithdrawalStatus): string => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      approved: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      processing: 'bg-blue-100 text-blue-800 border-blue-200',
      completed: 'bg-green-100 text-green-800 border-green-200',
      failed: 'bg-red-100 text-red-800 border-red-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || colors.pending;
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/admin/payments/withdrawals')}>
              <ArrowLeft size={16} className="mr-2" />
              <FormattedMessage id="common.back" defaultMessage="Retour" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                <FormattedMessage id="admin.withdrawals.detail.title" defaultMessage="Detail du retrait" />
              </h1>
              <p className="text-sm text-gray-500">ID: {withdrawal.id}</p>
            </div>
          </div>
          <span className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusColor(withdrawal.status)}`}>
            {intl.formatMessage({ id: `admin.withdrawals.status.${withdrawal.status}`, defaultMessage: withdrawal.status })}
          </span>
        </div>

        {/* Messages */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{success}</span>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* User Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-500" />
                <FormattedMessage id="admin.withdrawals.detail.userInfo" defaultMessage="Informations utilisateur" />
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.detail.name" defaultMessage="Nom" />
                  </p>
                  <p className="font-medium text-gray-900">{withdrawal.userName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.detail.email" defaultMessage="Email" />
                  </p>
                  <p className="font-medium text-gray-900 flex items-center">
                    {withdrawal.userEmail}
                    <button
                      onClick={() => navigator.clipboard.writeText(withdrawal.userEmail)}
                      className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.detail.userType" defaultMessage="Type" />
                  </p>
                  <p className="font-medium text-gray-900 capitalize">{withdrawal.userType}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.detail.userId" defaultMessage="User ID" />
                  </p>
                  <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono">{withdrawal.userId}</code>
                </div>
              </div>
            </div>

            {/* Amount Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <DollarSign className="w-5 h-5 mr-2 text-gray-500" />
                <FormattedMessage id="admin.withdrawals.detail.amountInfo" defaultMessage="Montants" />
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.detail.requestedAmount" defaultMessage="Montant demande" />
                  </p>
                  <p className="text-xl font-bold text-gray-900">
                    ${withdrawal.amount.toFixed(2)} <span className="text-sm font-normal text-gray-500">{withdrawal.sourceCurrency}</span>
                  </p>
                </div>
                {withdrawal.exchangeRate && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">
                      <FormattedMessage id="admin.withdrawals.detail.exchangeRate" defaultMessage="Taux de change" />
                    </p>
                    <p className="text-xl font-bold text-gray-900">{withdrawal.exchangeRate.toFixed(4)}</p>
                  </div>
                )}
                {withdrawal.convertedAmount && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">
                      <FormattedMessage id="admin.withdrawals.detail.convertedAmount" defaultMessage="Montant converti" />
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {withdrawal.convertedAmount.toFixed(2)} <span className="text-sm font-normal text-gray-500">{withdrawal.targetCurrency}</span>
                    </p>
                  </div>
                )}
                {withdrawal.fees !== undefined && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">
                      <FormattedMessage id="admin.withdrawals.detail.fees" defaultMessage="Frais" />
                    </p>
                    <p className="text-xl font-bold text-red-600">-${withdrawal.fees.toFixed(2)}</p>
                  </div>
                )}
              </div>
              {withdrawal.commissionCount !== undefined && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    <FormattedMessage
                      id="admin.withdrawals.detail.commissionCount"
                      defaultMessage="{count} commission(s) incluse(s)"
                      values={{ count: withdrawal.commissionCount }}
                    />
                  </p>
                </div>
              )}
            </div>

            {/* Payment Method */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
                <FormattedMessage id="admin.withdrawals.detail.paymentMethod" defaultMessage="Methode de paiement" />
                <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded text-sm font-normal text-gray-600 capitalize">
                  {withdrawal.paymentMethod.replace('_', ' ')}
                </span>
              </h2>
              <PaymentDetailsCard method={withdrawal.paymentMethod} details={withdrawal.paymentDetails} />
              {withdrawal.paymentReference && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.detail.paymentReference" defaultMessage="Reference de paiement" />
                  </p>
                  <code className="text-sm bg-green-50 text-green-700 px-2 py-1 rounded font-mono">
                    {withdrawal.paymentReference}
                  </code>
                </div>
              )}
              {withdrawal.transactionId && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    <FormattedMessage id="admin.withdrawals.detail.transactionId" defaultMessage="ID Transaction" />
                  </p>
                  <code className="text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded font-mono">
                    {withdrawal.transactionId}
                  </code>
                </div>
              )}
            </div>

            {/* Related Commissions */}
            {relatedCommissions.length > 0 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-gray-500" />
                  <FormattedMessage
                    id="admin.withdrawals.detail.relatedCommissions"
                    defaultMessage="Commissions incluses ({count})"
                    values={{ count: relatedCommissions.length }}
                  />
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {relatedCommissions.map(comm => (
                        <tr key={comm.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900 capitalize">{comm.type.replace('_', ' ')}</td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">${comm.amount.toFixed(2)}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {intl.formatDate(comm.createdAt, { dateStyle: 'short' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Admin Notes */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <FormattedMessage id="admin.withdrawals.detail.adminNotes" defaultMessage="Notes admin" />
              </h2>
              <textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.withdrawals.detail.notesPlaceholder', defaultMessage: 'Ajouter des notes...' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <Button variant="outline" onClick={handleSaveNotes} disabled={isProcessing}>
                  <FormattedMessage id="common.save" defaultMessage="Enregistrer" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Actions */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <FormattedMessage id="admin.withdrawals.detail.actions" defaultMessage="Actions" />
              </h2>
              <div className="space-y-3">
                {withdrawal.status === 'pending' && (
                  <>
                    <Button
                      className="w-full"
                      onClick={handleApprove}
                      disabled={isProcessing}
                      loading={isProcessing}
                    >
                      <CheckCircle size={16} className="mr-2" />
                      <FormattedMessage id="admin.withdrawals.action.approve" defaultMessage="Approuver" />
                    </Button>
                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={() => setShowRejectModal(true)}
                      disabled={isProcessing}
                    >
                      <Ban size={16} className="mr-2" />
                      <FormattedMessage id="admin.withdrawals.action.reject" defaultMessage="Rejeter" />
                    </Button>
                  </>
                )}
                {withdrawal.status === 'approved' && (
                  <Button
                    className="w-full"
                    onClick={handleProcess}
                    disabled={isProcessing}
                    loading={isProcessing}
                  >
                    <Send size={16} className="mr-2" />
                    <FormattedMessage id="admin.withdrawals.action.process" defaultMessage="Lancer le traitement" />
                  </Button>
                )}
                {withdrawal.status === 'processing' && (
                  <>
                    <Button
                      className="w-full bg-green-600 hover:bg-green-700"
                      onClick={() => setShowCompleteModal(true)}
                      disabled={isProcessing}
                    >
                      <CheckCircle size={16} className="mr-2" />
                      <FormattedMessage id="admin.withdrawals.action.markComplete" defaultMessage="Marquer comme complete" />
                    </Button>
                    <Button
                      variant="danger"
                      className="w-full"
                      onClick={() => setShowFailModal(true)}
                      disabled={isProcessing}
                    >
                      <XCircle size={16} className="mr-2" />
                      <FormattedMessage id="admin.withdrawals.action.markFailed" defaultMessage="Marquer comme echoue" />
                    </Button>
                  </>
                )}
                {(withdrawal.status === 'completed' || withdrawal.status === 'failed' || withdrawal.status === 'rejected') && (
                  <div className="text-center text-gray-500 text-sm py-4">
                    <FormattedMessage id="admin.withdrawals.detail.noActions" defaultMessage="Aucune action disponible" />
                  </div>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Clock className="w-5 h-5 mr-2 text-gray-500" />
                <FormattedMessage id="admin.withdrawals.detail.timeline" defaultMessage="Historique" />
              </h2>
              <StatusTimeline history={statusHistory} />
            </div>

            {/* Quick Info */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                <FormattedMessage id="admin.withdrawals.detail.dates" defaultMessage="Dates" />
              </h2>
              <div className="space-y-3">
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-500">
                    <FormattedMessage id="admin.withdrawals.detail.requestedAt" defaultMessage="Demande:" />
                  </span>
                  <span className="ml-auto font-medium text-gray-900">
                    {intl.formatDate(withdrawal.requestedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                {withdrawal.approvedAt && (
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-gray-500">
                      <FormattedMessage id="admin.withdrawals.detail.approvedAt" defaultMessage="Approuve:" />
                    </span>
                    <span className="ml-auto font-medium text-gray-900">
                      {intl.formatDate(withdrawal.approvedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                )}
                {withdrawal.processedAt && (
                  <div className="flex items-center text-sm">
                    <RefreshCw className="w-4 h-4 text-blue-500 mr-2" />
                    <span className="text-gray-500">
                      <FormattedMessage id="admin.withdrawals.detail.processedAt" defaultMessage="Traite:" />
                    </span>
                    <span className="ml-auto font-medium text-gray-900">
                      {intl.formatDate(withdrawal.processedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                )}
                {withdrawal.completedAt && (
                  <div className="flex items-center text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                    <span className="text-gray-500">
                      <FormattedMessage id="admin.withdrawals.detail.completedAt" defaultMessage="Complete:" />
                    </span>
                    <span className="ml-auto font-medium text-gray-900">
                      {intl.formatDate(withdrawal.completedAt, { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Rejection Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <FormattedMessage id="admin.withdrawals.rejectModal.title" defaultMessage="Rejeter le retrait" />
              </h3>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.withdrawals.rejectModal.placeholder', defaultMessage: 'Raison du rejet...' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-red-500"
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                  <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                </Button>
                <Button variant="danger" onClick={handleReject} disabled={!rejectionReason.trim() || isProcessing} loading={isProcessing}>
                  <FormattedMessage id="admin.withdrawals.rejectModal.confirm" defaultMessage="Confirmer le rejet" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Modal */}
        {showCompleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <FormattedMessage id="admin.withdrawals.completeModal.title" defaultMessage="Marquer comme complete" />
              </h3>
              <input
                type="text"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.withdrawals.completeModal.placeholder', defaultMessage: 'Reference de paiement (optionnel)' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-green-500"
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowCompleteModal(false)}>
                  <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleComplete} disabled={isProcessing} loading={isProcessing}>
                  <FormattedMessage id="admin.withdrawals.completeModal.confirm" defaultMessage="Confirmer" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Fail Modal */}
        {showFailModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <FormattedMessage id="admin.withdrawals.failModal.title" defaultMessage="Marquer comme echoue" />
              </h3>
              <textarea
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.withdrawals.failModal.placeholder', defaultMessage: 'Raison de l\'echec...' })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 focus:ring-2 focus:ring-red-500"
                rows={3}
              />
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowFailModal(false)}>
                  <FormattedMessage id="common.cancel" defaultMessage="Annuler" />
                </Button>
                <Button variant="danger" onClick={handleFail} disabled={!failureReason.trim() || isProcessing} loading={isProcessing}>
                  <FormattedMessage id="admin.withdrawals.failModal.confirm" defaultMessage="Confirmer l'echec" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPaymentDetail;

// src/pages/admin/Finance/Escrow.tsx
// Page de suivi des fonds en transit (escrow)
// Affiche les pending_transfers (Stripe) et failed_payouts_alerts (PayPal)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  Timestamp,
  onSnapshot,
} from 'firebase/firestore';
import { db, functions } from '../../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import AdminLayout from '../../../components/admin/AdminLayout';
import Modal from '../../../components/common/Modal';
import Button from '../../../components/common/Button';
import { useIntl } from 'react-intl';
import {
  DollarSign,
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Send,
  UserCheck,
  CreditCard,
  Wallet,
  TrendingUp,
  Calendar,
  Mail,
  Phone,
  ExternalLink,
  RotateCcw,
  AlertCircle,
  Shield,
  Building,
} from 'lucide-react';

// ============ TYPES ============
interface PendingTransfer {
  id: string;
  providerId: string;
  providerName?: string;
  providerEmail?: string;
  clientId: string;
  clientName?: string;
  callSessionId: string;
  paymentIntentId: string;
  providerAmount: number; // en centimes
  currency: string;
  status: 'pending_kyc' | 'transferred' | 'refunded';
  createdAt: Timestamp;
  escalatedAt?: Timestamp;
  escalationReason?: string;
}

interface FailedPayoutAlert {
  id: string;
  providerId: string;
  providerName?: string;
  providerPayPalEmail: string;
  orderId: string;
  callSessionId: string;
  amount: number; // en EUR
  currency: string;
  status: 'pending' | 'failed' | 'max_retries_reached' | 'pending_retry_after_kyc' | 'success';
  error: string;
  retryCount: number;
  retryScheduled: boolean;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

interface EscrowStats {
  stripe: {
    count: number;
    totalEur: number;
    oldestDays: number;
  };
  paypal: {
    count: number;
    totalEur: number;
    oldestDays: number;
  };
  totalEur: number;
  providersAffected: number;
}

interface ProviderInfo {
  id: string;
  displayName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  stripeAccountId?: string;
  stripeOnboardingComplete?: boolean;
  paypalEmail?: string;
  paypalMerchantId?: string;
}

// ============ COMPONENT ============
const AdminEscrow: React.FC = () => {
  const { formatMessage, formatNumber } = useIntl();
  const t = (id: string, values?: Record<string, any>) => formatMessage({ id }, values);

  // State
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EscrowStats | null>(null);
  const [pendingTransfers, setPendingTransfers] = useState<PendingTransfer[]>([]);
  const [failedPayouts, setFailedPayouts] = useState<FailedPayoutAlert[]>([]);
  const [providersMap, setProvidersMap] = useState<Map<string, ProviderInfo>>(new Map());
  const [activeTab, setActiveTab] = useState<'stripe' | 'paypal'>('stripe');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<PendingTransfer | FailedPayoutAlert | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [retrying, setRetrying] = useState<string | null>(null);

  // Fetch data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const now = new Date();

      // Fetch pending_transfers (Stripe)
      const stripeQuery = query(
        collection(db, 'pending_transfers'),
        where('status', '==', 'pending_kyc'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const stripeSnap = await getDocs(stripeQuery);
      const stripeData: PendingTransfer[] = [];
      let stripeTotal = 0;
      let stripeOldestDays = 0;
      const providerIds = new Set<string>();

      stripeSnap.forEach((doc) => {
        const data = doc.data() as PendingTransfer;
        stripeData.push({ ...data, id: doc.id });
        stripeTotal += (data.providerAmount || 0) / 100;
        providerIds.add(data.providerId);

        const createdAt = data.createdAt?.toDate?.();
        if (createdAt) {
          const days = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          if (days > stripeOldestDays) stripeOldestDays = days;
        }
      });

      setPendingTransfers(stripeData);

      // Fetch failed_payouts_alerts (PayPal)
      const paypalQuery = query(
        collection(db, 'failed_payouts_alerts'),
        where('status', 'in', ['pending', 'failed', 'max_retries_reached', 'pending_retry_after_kyc']),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      const paypalSnap = await getDocs(paypalQuery);
      const paypalData: FailedPayoutAlert[] = [];
      let paypalTotal = 0;
      let paypalOldestDays = 0;

      paypalSnap.forEach((doc) => {
        const data = doc.data() as FailedPayoutAlert;
        paypalData.push({ ...data, id: doc.id });
        paypalTotal += data.amount || 0;
        providerIds.add(data.providerId);

        const createdAt = data.createdAt?.toDate?.();
        if (createdAt) {
          const days = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
          if (days > paypalOldestDays) paypalOldestDays = days;
        }
      });

      setFailedPayouts(paypalData);

      // Fetch provider info
      const providersData = new Map<string, ProviderInfo>();
      for (const providerId of providerIds) {
        try {
          const providerDoc = await getDoc(doc(db, 'users', providerId));
          if (providerDoc.exists()) {
            const data = providerDoc.data();
            providersData.set(providerId, {
              id: providerId,
              displayName: data.displayName,
              firstName: data.firstName,
              lastName: data.lastName,
              email: data.email,
              phone: data.phone,
              stripeAccountId: data.stripeAccountId,
              stripeOnboardingComplete: data.stripeOnboardingComplete,
              paypalEmail: data.paypalEmail,
              paypalMerchantId: data.paypalMerchantId,
            });
          }
        } catch (e) {
          console.error(`Error fetching provider ${providerId}:`, e);
        }
      }
      setProvidersMap(providersData);

      // Set stats
      setStats({
        stripe: {
          count: stripeData.length,
          totalEur: stripeTotal,
          oldestDays: stripeOldestDays,
        },
        paypal: {
          count: paypalData.length,
          totalEur: paypalTotal,
          oldestDays: paypalOldestDays,
        },
        totalEur: stripeTotal + paypalTotal,
        providersAffected: providerIds.size,
      });
    } catch (error) {
      console.error('Error fetching escrow data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Retry payout (PayPal)
  const handleRetryPayout = async (item: FailedPayoutAlert) => {
    setRetrying(item.id);
    try {
      const retryPayout = httpsCallable(functions, 'retryFailedPayout');
      await retryPayout({ failedPayoutAlertId: item.id });
      await fetchData();
    } catch (error) {
      console.error('Error retrying payout:', error);
      alert('Erreur lors du retry: ' + (error as Error).message);
    } finally {
      setRetrying(null);
    }
  };

  // Format helpers
  const formatCurrency = (amount: number, currency: string = 'EUR') => {
    return formatNumber(amount, { style: 'currency', currency });
  };

  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return '-';
    const date = timestamp.toDate();
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDaysSince = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 0;
    const now = new Date();
    const date = timestamp.toDate();
    return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getProviderName = (providerId: string) => {
    const provider = providersMap.get(providerId);
    if (!provider) return providerId.substring(0, 8) + '...';
    return provider.displayName || `${provider.firstName || ''} ${provider.lastName || ''}`.trim() || provider.email || providerId;
  };

  const getProviderKycStatus = (providerId: string, type: 'stripe' | 'paypal') => {
    const provider = providersMap.get(providerId);
    if (!provider) return { done: false, label: 'Inconnu' };

    if (type === 'stripe') {
      return {
        done: provider.stripeOnboardingComplete === true,
        label: provider.stripeOnboardingComplete ? 'Stripe Connect OK' : 'Stripe non configuré',
      };
    } else {
      return {
        done: !!provider.paypalMerchantId,
        label: provider.paypalMerchantId ? 'PayPal Merchant OK' : 'PayPal email seulement',
      };
    }
  };

  // Status badge
  const StatusBadge: React.FC<{ status: string; type: 'stripe' | 'paypal' }> = ({ status, type }) => {
    let color = 'bg-gray-100 text-gray-800';
    let icon = <Clock className="w-3 h-3" />;

    if (type === 'stripe') {
      if (status === 'pending_kyc') {
        color = 'bg-yellow-100 text-yellow-800';
        icon = <Clock className="w-3 h-3" />;
      } else if (status === 'transferred') {
        color = 'bg-green-100 text-green-800';
        icon = <CheckCircle className="w-3 h-3" />;
      }
    } else {
      if (status === 'pending' || status === 'pending_retry_after_kyc') {
        color = 'bg-yellow-100 text-yellow-800';
        icon = <Clock className="w-3 h-3" />;
      } else if (status === 'failed') {
        color = 'bg-red-100 text-red-800';
        icon = <XCircle className="w-3 h-3" />;
      } else if (status === 'max_retries_reached') {
        color = 'bg-red-100 text-red-800';
        icon = <AlertTriangle className="w-3 h-3" />;
      } else if (status === 'success') {
        color = 'bg-green-100 text-green-800';
        icon = <CheckCircle className="w-3 h-3" />;
      }
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        {icon}
        {status}
      </span>
    );
  };

  // Filter data
  const filteredStripeData = pendingTransfers.filter((item) => {
    if (searchTerm) {
      const provider = providersMap.get(item.providerId);
      const searchLower = searchTerm.toLowerCase();
      const matchesProvider =
        item.providerId.toLowerCase().includes(searchLower) ||
        provider?.displayName?.toLowerCase().includes(searchLower) ||
        provider?.email?.toLowerCase().includes(searchLower);
      if (!matchesProvider) return false;
    }
    return true;
  });

  const filteredPaypalData = failedPayouts.filter((item) => {
    if (searchTerm) {
      const provider = providersMap.get(item.providerId);
      const searchLower = searchTerm.toLowerCase();
      const matchesProvider =
        item.providerId.toLowerCase().includes(searchLower) ||
        provider?.displayName?.toLowerCase().includes(searchLower) ||
        item.providerPayPalEmail?.toLowerCase().includes(searchLower);
      if (!matchesProvider) return false;
    }
    if (statusFilter !== 'all' && item.status !== statusFilter) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Fonds en Transit (Escrow)
            </h1>
            <p className="text-gray-500 mt-1">
              Suivi des paiements en attente de transfert aux prestataires
            </p>
          </div>
          <Button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* KPIs */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total en Escrow</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(stats.totalEur)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Stripe (KYC pending)</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(stats.stripe.totalEur)}
                  </p>
                  <p className="text-xs text-gray-400">{stats.stripe.count} transferts</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">PayPal (Payout failed)</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(stats.paypal.totalEur)}
                  </p>
                  <p className="text-xs text-gray-400">{stats.paypal.count} payouts</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Plus ancien</p>
                  <p className="text-xl font-bold text-gray-900">
                    {Math.max(stats.stripe.oldestDays, stats.paypal.oldestDays)} jours
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Providers affectés</p>
                  <p className="text-xl font-bold text-gray-900">
                    {stats.providersAffected}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Alert if high escrow */}
        {stats && stats.totalEur > 1000 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-red-800">Attention: Escrow élevé</h3>
              <p className="text-sm text-red-700 mt-1">
                Le montant total en escrow dépasse 1000€. Vérifiez les providers concernés et
                envoyez des rappels KYC si nécessaire.
              </p>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('stripe')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'stripe'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Stripe - KYC Pending
                  {stats && stats.stripe.count > 0 && (
                    <span className="bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full text-xs">
                      {stats.stripe.count}
                    </span>
                  )}
                </div>
              </button>
              <button
                onClick={() => setActiveTab('paypal')}
                className={`px-6 py-4 text-sm font-medium border-b-2 ${
                  activeTab === 'paypal'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  PayPal - Payout Failed
                  {stats && stats.paypal.count > 0 && (
                    <span className="bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full text-xs">
                      {stats.paypal.count}
                    </span>
                  )}
                </div>
              </button>
            </nav>
          </div>

          {/* Search & Filter */}
          <div className="p-4 border-b border-gray-200 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par provider..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            {activeTab === 'paypal' && (
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="max_retries_reached">Max retries</option>
                <option value="pending_retry_after_kyc">Retry after KYC</option>
              </select>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {activeTab === 'stripe' ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Session</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Jours</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredStripeData.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-2" />
                        Aucun transfert Stripe en attente
                      </td>
                    </tr>
                  ) : (
                    filteredStripeData.map((item) => {
                      const days = getDaysSince(item.createdAt);
                      const kycStatus = getProviderKycStatus(item.providerId, 'stripe');
                      return (
                        <tr key={item.id} className={days > 30 ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                <UserCheck className="w-4 h-4 text-gray-500" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{getProviderName(item.providerId)}</p>
                                <p className="text-xs text-gray-500">{providersMap.get(item.providerId)?.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">
                              {formatCurrency(item.providerAmount / 100, item.currency)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-mono text-gray-600">
                              {item.callSessionId?.substring(0, 12)}...
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(item.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${days > 90 ? 'text-red-600' : days > 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                              {days}j
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              kycStatus.done ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {kycStatus.done ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {kycStatus.label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setSelectedItem(item); setShowDetailModal(true); }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <a
                                href={`mailto:${providersMap.get(item.providerId)?.email}?subject=Action requise: Configurez vos paiements SOS-Expat`}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title="Envoyer email"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PayPal Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Retries</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Erreur</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPaypalData.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-2" />
                        Aucun payout PayPal en échec
                      </td>
                    </tr>
                  ) : (
                    filteredPaypalData.map((item) => {
                      const days = getDaysSince(item.createdAt);
                      return (
                        <tr key={item.id} className={days > 30 ? 'bg-red-50' : ''}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                <Wallet className="w-4 h-4 text-yellow-600" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900">{getProviderName(item.providerId)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-gray-900">
                              {formatCurrency(item.amount, item.currency)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">
                            {item.providerPayPalEmail}
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={item.status} type="paypal" />
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-medium ${item.retryCount >= 3 ? 'text-red-600' : 'text-gray-900'}`}>
                              {item.retryCount}/3
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatDate(item.createdAt)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-red-600 max-w-xs truncate block" title={item.error}>
                              {item.error?.substring(0, 40)}...
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => { setSelectedItem(item); setShowDetailModal(true); }}
                                className="p-1 text-gray-400 hover:text-gray-600"
                                title="Voir détails"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleRetryPayout(item)}
                                disabled={retrying === item.id || item.retryScheduled}
                                className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-50"
                                title="Retry payout"
                              >
                                {retrying === item.id ? (
                                  <RefreshCw className="w-4 h-4 animate-spin" />
                                ) : (
                                  <RotateCcw className="w-4 h-4" />
                                )}
                              </button>
                              <a
                                href={`mailto:${item.providerPayPalEmail}?subject=Action requise: Vérifiez votre compte PayPal`}
                                className="p-1 text-gray-400 hover:text-blue-600"
                                title="Envoyer email"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-800">Règle métier importante</h3>
              <p className="text-sm text-blue-700 mt-1">
                Une fois qu'un appel a eu lieu, le client n'est <strong>JAMAIS</strong> remboursé.
                L'argent appartient au prestataire et reste en escrow jusqu'à ce qu'il complète son KYC.
                Le système envoie des rappels automatiques à J+1, J+7, J+30 et J+90.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedItem && (
        <Modal
          isOpen={showDetailModal}
          onClose={() => { setShowDetailModal(false); setSelectedItem(null); }}
          title="Détails du paiement en attente"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Provider ID</p>
                <p className="font-mono text-sm">{selectedItem.providerId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Call Session</p>
                <p className="font-mono text-sm">{selectedItem.callSessionId}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Montant</p>
                <p className="font-medium">
                  {'providerAmount' in selectedItem
                    ? formatCurrency((selectedItem as PendingTransfer).providerAmount / 100)
                    : formatCurrency((selectedItem as FailedPayoutAlert).amount)
                  }
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date de création</p>
                <p>{formatDate(selectedItem.createdAt)}</p>
              </div>
            </div>

            {'error' in selectedItem && (
              <div>
                <p className="text-sm text-gray-500">Erreur complète</p>
                <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                  {(selectedItem as FailedPayoutAlert).error}
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
                Fermer
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AdminLayout>
  );
};

export default AdminEscrow;

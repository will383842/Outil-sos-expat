// src/pages/admin/AdminKYCProviders.tsx
// Dashboard "Statut Paiement Prestataires"
// Affiche tous les prestataires avec leur statut Stripe/PayPal + montants bloques
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import {
  Shield,
  CreditCard,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import Button from '../../components/common/Button';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import AdminLayout from '../../components/admin/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';

// ============ TYPES ============

interface ProviderProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  country?: string;
  type?: 'lawyer' | 'expat';
  // Stripe fields
  stripeAccountId?: string;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  // PayPal fields
  paypalEmail?: string;
  paypalEmailVerified?: boolean;
  // Payment method
  paymentMethod?: 'stripe' | 'paypal' | 'bank_transfer' | 'wise' | 'mobile_money';
}

interface PendingTransfer {
  id: string;
  providerId: string;
  providerAmount: number; // cents
  currency: string;
  status: string;
  createdAt?: Timestamp;
}

interface PaypalBlockedOrder {
  id: string;
  providerId: string;
  amount: number;
  currency: string;
  payoutPendingVerification?: boolean;
  createdAt?: Timestamp;
}

interface BlockedInfo {
  count: number;
  totalEur: number;
}

type GatewayFilter = 'all' | 'stripe' | 'paypal';
type StatusFilter = 'all' | 'verified' | 'pending' | 'blocked';

// ============ COMPONENT ============

const AdminKYCProviders: React.FC = () => {
  const { user } = useAuth() as { user: { id: string } | null };

  // State
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [stripeBlockedMap, setStripeBlockedMap] = useState<Map<string, BlockedInfo>>(new Map());
  const [paypalBlockedMap, setPaypalBlockedMap] = useState<Map<string, BlockedInfo>>(new Map());
  const [gatewayFilter, setGatewayFilter] = useState<GatewayFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [checkingStatus, setCheckingStatus] = useState<string | null>(null);

  const PAGE_SIZE = 25;

  // ============ FETCH DATA ============

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch all providers from sos_profiles
      const profilesQuery = query(
        collection(db, 'sos_profiles'),
        where('type', 'in', ['lawyer', 'expat'])
      );
      const profilesSnap = await getDocs(profilesQuery);
      const profilesData: ProviderProfile[] = [];
      profilesSnap.forEach((doc) => {
        const data = doc.data();
        profilesData.push({
          id: doc.id,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          country: data.country,
          type: data.type,
          stripeAccountId: data.stripeAccountId,
          chargesEnabled: data.chargesEnabled,
          payoutsEnabled: data.payoutsEnabled,
          paypalEmail: data.paypalEmail,
          paypalEmailVerified: data.paypalEmailVerified,
          paymentMethod: data.paymentMethod,
        });
      });
      setProviders(profilesData);

      // 2. Fetch pending_transfers (Stripe blocked)
      const stripeQuery = query(
        collection(db, 'pending_transfers'),
        where('status', '==', 'pending_kyc')
      );
      const stripeSnap = await getDocs(stripeQuery);
      const stripeMap = new Map<string, BlockedInfo>();
      stripeSnap.forEach((doc) => {
        const data = doc.data();
        const pid = data.providerId as string;
        const existing = stripeMap.get(pid) || { count: 0, totalEur: 0 };
        existing.count += 1;
        existing.totalEur += ((data.providerAmount as number) || 0) / 100;
        stripeMap.set(pid, existing);
      });
      setStripeBlockedMap(stripeMap);

      // 3. Fetch paypal_orders where payoutPendingVerification == true
      const paypalQuery = query(
        collection(db, 'paypal_orders'),
        where('payoutPendingVerification', '==', true)
      );
      const paypalSnap = await getDocs(paypalQuery);
      const paypalMap = new Map<string, BlockedInfo>();
      paypalSnap.forEach((doc) => {
        const data = doc.data();
        const pid = data.providerId as string;
        const existing = paypalMap.get(pid) || { count: 0, totalEur: 0 };
        existing.count += 1;
        existing.totalEur += (data.amount as number) || 0;
        paypalMap.set(pid, existing);
      });
      setPaypalBlockedMap(paypalMap);
    } catch (error) {
      console.error('Error fetching provider payment data:', error);
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============ HELPERS ============

  const getGateway = (p: ProviderProfile): 'stripe' | 'paypal' | 'none' => {
    if (p.stripeAccountId) return 'stripe';
    if (p.paypalEmail) return 'paypal';
    if (p.paymentMethod === 'stripe') return 'stripe';
    if (p.paymentMethod === 'paypal' || p.paymentMethod === 'bank_transfer' || p.paymentMethod === 'wise' || p.paymentMethod === 'mobile_money') return 'paypal';
    return 'none';
  };

  const isVerified = (p: ProviderProfile): boolean => {
    const gw = getGateway(p);
    if (gw === 'stripe') return p.chargesEnabled === true && p.payoutsEnabled === true;
    if (gw === 'paypal') return p.paypalEmailVerified === true;
    return false;
  };

  const isBlocked = (p: ProviderProfile): boolean => {
    return stripeBlockedMap.has(p.id) || paypalBlockedMap.has(p.id);
  };

  const getProviderStatus = (p: ProviderProfile): 'verified' | 'pending' | 'blocked' => {
    if (isBlocked(p)) return 'blocked';
    if (isVerified(p)) return 'verified';
    return 'pending';
  };

  const getProviderName = (p: ProviderProfile): string => {
    const name = `${p.firstName || ''} ${p.lastName || ''}`.trim();
    return name || p.email || p.id.substring(0, 12);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // ============ CHECK STRIPE STATUS ============

  const handleCheckStripeStatus = async (provider: ProviderProfile) => {
    if (!provider.stripeAccountId) {
      toast.error('Ce prestataire n\'a pas de compte Stripe');
      return;
    }
    setCheckingStatus(provider.id);
    try {
      const checkStatus = httpsCallable(functions, 'checkStripeAccountStatus');
      const result = await checkStatus({ providerId: provider.id });
      const data = result.data as { chargesEnabled?: boolean; payoutsEnabled?: boolean };
      toast.success(
        `Stripe: charges=${data.chargesEnabled ? 'OK' : 'NON'}, payouts=${data.payoutsEnabled ? 'OK' : 'NON'}`
      );
      await fetchData();
    } catch (error) {
      console.error('Error checking Stripe status:', error);
      toast.error('Erreur lors de la verification Stripe');
    } finally {
      setCheckingStatus(null);
    }
  };

  // ============ COMPUTED STATS ============

  const stats = useMemo(() => {
    const total = providers.length;
    let stripeVerified = 0;
    let paypalVerified = 0;
    let blocked = 0;

    providers.forEach((p) => {
      const gw = getGateway(p);
      if (gw === 'stripe' && p.chargesEnabled && p.payoutsEnabled) stripeVerified++;
      if (gw === 'paypal' && p.paypalEmailVerified) paypalVerified++;
      if (isBlocked(p)) blocked++;
    });

    let totalEscrow = 0;
    stripeBlockedMap.forEach((info) => { totalEscrow += info.totalEur; });
    paypalBlockedMap.forEach((info) => { totalEscrow += info.totalEur; });

    return { total, stripeVerified, paypalVerified, totalEscrow, blocked };
  }, [providers, stripeBlockedMap, paypalBlockedMap]);

  // ============ FILTERED + PAGINATED DATA ============

  const filteredProviders = useMemo(() => {
    let result = providers;

    // Gateway filter
    if (gatewayFilter !== 'all') {
      result = result.filter((p) => getGateway(p) === gatewayFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((p) => getProviderStatus(p) === statusFilter);
    }

    // Search
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter((p) => {
        const name = getProviderName(p).toLowerCase();
        const email = (p.email || '').toLowerCase();
        return name.includes(lower) || email.includes(lower);
      });
    }

    return result;
  }, [providers, gatewayFilter, statusFilter, searchTerm, stripeBlockedMap, paypalBlockedMap]);

  const totalPages = Math.max(1, Math.ceil(filteredProviders.length / PAGE_SIZE));
  const paginatedProviders = filteredProviders.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset page on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [gatewayFilter, statusFilter, searchTerm]);

  // ============ RENDER ============

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" text="Chargement des prestataires..." />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statut Paiement Prestataires</h1>
            <p className="text-gray-500 mt-1">
              Vue d'ensemble des passerelles de paiement et montants bloques
            </p>
          </div>
          <Button onClick={fetchData} disabled={loading} className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total prestataires</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-indigo-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Stripe verifies</p>
                <p className="text-xl font-bold text-gray-900">{stats.stripeVerified}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-gray-500">PayPal verifies</p>
                <p className="text-xl font-bold text-gray-900">{stats.paypalVerified}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-orange-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total en escrow</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalEscrow)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Prestataires bloques</p>
                <p className="text-xl font-bold text-gray-900">{stats.blocked}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 items-center">
            {/* Search */}
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Rechercher par nom ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Gateway Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={gatewayFilter}
                onChange={(e) => setGatewayFilter(e.target.value as GatewayFilter)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">Toutes les passerelles</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="verified">Verifie</option>
              <option value="pending">En attente</option>
              <option value="blocked">Bloque</option>
            </select>

            <span className="text-sm text-gray-500">
              {filteredProviders.length} resultat{filteredProviders.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prestataire</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pays</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Gateway</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut KYC</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Montant bloque</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {paginatedProviders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <Shield className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                      Aucun prestataire trouve
                    </td>
                  </tr>
                ) : (
                  paginatedProviders.map((provider) => {
                    const gw = getGateway(provider);
                    const status = getProviderStatus(provider);
                    const stripeBlocked = stripeBlockedMap.get(provider.id);
                    const paypalBlocked = paypalBlockedMap.get(provider.id);

                    return (
                      <tr key={provider.id} className="hover:bg-gray-50">
                        {/* Prestataire */}
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-gray-900">{getProviderName(provider)}</p>
                            <p className="text-xs text-gray-500">{provider.email || '-'}</p>
                          </div>
                        </td>

                        {/* Pays */}
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {provider.country || '-'}
                        </td>

                        {/* Type */}
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-700">
                            {provider.type === 'lawyer' ? 'Avocat' : provider.type === 'expat' ? 'Expatrie' : '-'}
                          </span>
                        </td>

                        {/* Gateway */}
                        <td className="px-4 py-3">
                          {gw === 'stripe' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              <CreditCard className="w-3 h-3" />
                              Stripe
                            </span>
                          ) : gw === 'paypal' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <DollarSign className="w-3 h-3" />
                              PayPal
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Non configure</span>
                          )}
                        </td>

                        {/* Statut KYC */}
                        <td className="px-4 py-3">
                          {gw === 'stripe' ? (
                            <div className="flex flex-col gap-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                provider.chargesEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {provider.chargesEnabled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                Charges
                              </span>
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                provider.payoutsEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                              }`}>
                                {provider.payoutsEnabled ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                Payouts
                              </span>
                            </div>
                          ) : gw === 'paypal' ? (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                              provider.paypalEmailVerified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {provider.paypalEmailVerified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                              {provider.paypalEmailVerified ? 'Verifie' : 'Non verifie'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              En attente
                            </span>
                          )}
                        </td>

                        {/* Montant bloque */}
                        <td className="px-4 py-3">
                          {stripeBlocked ? (
                            <div className="text-sm">
                              <span className="font-medium text-red-600">{formatCurrency(stripeBlocked.totalEur)}</span>
                              <span className="text-xs text-gray-500 ml-1">({stripeBlocked.count} transfert{stripeBlocked.count > 1 ? 's' : ''})</span>
                            </div>
                          ) : paypalBlocked ? (
                            <div className="text-sm">
                              <span className="font-medium text-red-600">{formatCurrency(paypalBlocked.totalEur)}</span>
                              <span className="text-xs text-gray-500 ml-1">({paypalBlocked.count} payout{paypalBlocked.count > 1 ? 's' : ''})</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3">
                          {gw === 'stripe' && provider.stripeAccountId && (
                            <button
                              onClick={() => handleCheckStripeStatus(provider)}
                              disabled={checkingStatus === provider.id}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 transition-colors"
                              title="Verifier le statut Stripe"
                            >
                              {checkingStatus === provider.id ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <ExternalLink className="w-3 h-3" />
                              )}
                              Verifier statut
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500">
                Page {currentPage} sur {totalPages} ({filteredProviders.length} prestataires)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Precedent
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 5) {
                    page = i + 1;
                  } else if (currentPage <= 3) {
                    page = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    page = totalPages - 4 + i;
                  } else {
                    page = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-1 text-sm rounded-lg ${
                        currentPage === page
                          ? 'bg-blue-600 text-white'
                          : 'border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-50 hover:bg-gray-50"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminKYCProviders;

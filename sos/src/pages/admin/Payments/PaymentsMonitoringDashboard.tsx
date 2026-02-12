/**
 * PaymentsMonitoringDashboard.tsx
 *
 * P2 FIX 2026-02-12: Real-time payments monitoring dashboard
 *
 * Features:
 * - Real-time payment status tracking (onSnapshot)
 * - Success/failure rate metrics
 * - Live transaction feed
 * - Provider breakdown (Stripe, PayPal, Wise, Flutterwave)
 * - Error type analytics
 * - Amount statistics
 * - Auto-refresh every 30 seconds
 * - Export to CSV functionality
 *
 * Access: Admin only
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/useAuth';
import { useNavigate } from 'react-router-dom';

interface PaymentRecord {
  id: string;
  status: string;
  amount: number;
  currency: string;
  provider: string;
  clientId: string;
  clientEmail?: string;
  clientName?: string;
  callId?: string;
  errorCode?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface PaymentStats {
  total: number;
  succeeded: number;
  failed: number;
  pending: number;
  totalAmount: number;
  successRate: number;
  avgAmount: number;
  byProvider: Record<string, number>;
  byErrorType: Record<string, number>;
}

export function PaymentsMonitoringDashboard() {
  const { user, firebaseUser } = useAuth();
  const navigate = useNavigate();

  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    total: 0,
    succeeded: 0,
    failed: 0,
    pending: 0,
    totalAmount: 0,
    successRate: 0,
    avgAmount: 0,
    byProvider: {},
    byErrorType: {},
  });
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Check admin access
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    // Check if user is admin (you may need to adjust this based on your auth setup)
    const checkAdmin = async () => {
      try {
        if (!firebaseUser) {
          navigate('/login');
          return;
        }
        const token = await firebaseUser.getIdTokenResult();
        if (!token.claims.admin && token.claims.role !== 'admin') {
          navigate('/');
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        navigate('/');
      }
    };

    checkAdmin();
  }, [user, firebaseUser, navigate]);

  // Calculate time range
  const getTimeRangeDate = (range: '1h' | '24h' | '7d' | '30d'): Date => {
    const now = new Date();
    switch (range) {
      case '1h':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case '24h':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case '7d':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
  };

  // Real-time subscription to payments
  useEffect(() => {
    setLoading(true);

    const startDate = getTimeRangeDate(timeRange);

    const q = query(
      collection(db, 'payment_records'),
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const paymentsData: PaymentRecord[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          paymentsData.push({
            id: doc.id,
            status: data.status || 'unknown',
            amount: data.amount || 0,
            currency: data.currency || 'EUR',
            provider: data.provider || 'stripe',
            clientId: data.clientId || 'unknown',
            clientEmail: data.clientEmail,
            clientName: data.clientName,
            callId: data.callId,
            errorCode: data.errorCode || data.error?.code,
            errorMessage: data.errorMessage || data.error?.message,
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date(),
          });
        });

        setPayments(paymentsData);
        calculateStats(paymentsData);
        setLastUpdate(new Date());
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching payments:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [timeRange]);

  // Calculate statistics
  const calculateStats = (paymentsData: PaymentRecord[]) => {
    const stats: PaymentStats = {
      total: paymentsData.length,
      succeeded: 0,
      failed: 0,
      pending: 0,
      totalAmount: 0,
      successRate: 0,
      avgAmount: 0,
      byProvider: {},
      byErrorType: {},
    };

    paymentsData.forEach((payment) => {
      const status = payment.status.toLowerCase();

      if (status === 'succeeded' || status === 'success' || status === 'completed') {
        stats.succeeded++;
        stats.totalAmount += payment.amount;
      } else if (status === 'failed' || status === 'error' || status === 'declined') {
        stats.failed++;
        if (payment.errorCode) {
          stats.byErrorType[payment.errorCode] = (stats.byErrorType[payment.errorCode] || 0) + 1;
        }
      } else if (status === 'pending' || status === 'processing') {
        stats.pending++;
      }

      // Provider breakdown
      stats.byProvider[payment.provider] = (stats.byProvider[payment.provider] || 0) + 1;
    });

    stats.successRate = stats.total > 0 ? (stats.succeeded / stats.total) * 100 : 0;
    stats.avgAmount = stats.succeeded > 0 ? stats.totalAmount / stats.succeeded : 0;

    setStats(stats);
  };

  // Export to CSV
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Payment ID',
      'Status',
      'Amount',
      'Currency',
      'Provider',
      'Client Email',
      'Call ID',
      'Error',
    ];

    const rows = payments.map((p) => [
      p.createdAt.toISOString(),
      p.id,
      p.status,
      p.amount.toString(),
      p.currency,
      p.provider,
      p.clientEmail || '',
      p.callId || '',
      p.errorMessage || '',
    ]);

    const csvContent =
      '\uFEFF' + // BOM for Excel UTF-8
      [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `payments_${timeRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Status badge color
  const getStatusColor = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'succeeded' || s === 'success' || s === 'completed') return 'bg-green-100 text-green-800';
    if (s === 'failed' || s === 'error' || s === 'declined') return 'bg-red-100 text-red-800';
    if (s === 'pending' || s === 'processing') return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement des paiements...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          📊 Dashboard Paiements en Temps Réel
        </h1>
        <p className="text-gray-600">
          Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
          <span className="ml-2 inline-flex items-center">
            <span className="animate-pulse h-2 w-2 bg-green-500 rounded-full mr-1"></span>
            Live
          </span>
        </p>
      </div>

      {/* Time Range Selector */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex space-x-2">
          {(['1h', '24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {range === '1h' && 'Dernière heure'}
              {range === '24h' && '24 heures'}
              {range === '7d' && '7 jours'}
              {range === '30d' && '30 jours'}
            </button>
          ))}
        </div>
        <button
          onClick={exportToCSV}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Exporter CSV
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Total Paiements</div>
          <div className="text-3xl font-bold text-gray-900">{stats.total}</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Taux de Réussite</div>
          <div className="text-3xl font-bold text-green-600">
            {stats.successRate.toFixed(1)}%
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {stats.succeeded} réussis / {stats.failed} échoués
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">Montant Total</div>
          <div className="text-3xl font-bold text-blue-600">
            {stats.totalAmount.toFixed(2)} €
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Moy. {stats.avgAmount.toFixed(2)} €
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm font-medium text-gray-600 mb-1">En Attente</div>
          <div className="text-3xl font-bold text-yellow-600">{stats.pending}</div>
        </div>
      </div>

      {/* Provider Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Par Provider</h3>
          <div className="space-y-3">
            {Object.entries(stats.byProvider).map(([provider, count]) => (
              <div key={provider} className="flex items-center justify-between">
                <span className="text-gray-700 capitalize">{provider}</span>
                <div className="flex items-center">
                  <div className="w-32 bg-gray-200 rounded-full h-2 mr-3">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(count / stats.total) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-900 w-12 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Erreurs Fréquentes</h3>
          <div className="space-y-3">
            {Object.entries(stats.byErrorType)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([error, count]) => (
                <div key={error} className="flex items-center justify-between">
                  <span className="text-gray-700 text-sm">{error}</span>
                  <span className="text-sm font-medium text-red-600">{count}</span>
                </div>
              ))}
            {Object.keys(stats.byErrorType).length === 0 && (
              <p className="text-gray-500 text-sm">Aucune erreur récente 🎉</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Payments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Transactions Récentes ({payments.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Provider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Erreur
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payment.createdAt.toLocaleString('fr-FR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        payment.status
                      )}`}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {payment.amount.toFixed(2)} {payment.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                    {payment.provider}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {payment.clientEmail || payment.clientName || payment.clientId.substring(0, 8)}
                  </td>
                  <td className="px-6 py-4 text-sm text-red-600 max-w-xs truncate">
                    {payment.errorMessage || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PaymentsMonitoringDashboard;

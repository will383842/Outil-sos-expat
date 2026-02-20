/**
 * AdminFinanceReconciliation.tsx
 * Rapprochement bancaire Stripe/PayPal/Firestore
 * Permet de vérifier la cohérence entre les paiements enregistrés et les mouvements réels
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  DollarSign,
  ArrowLeftRight,
  FileText,
  Download,
  Filter,
  Search,
  Eye,
  Link2,
  Unlink,
  Calendar,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Loader2,
  Check,
  X,
  AlertCircle,
  CreditCard,
  Building2,
  Wallet,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

type ReconciliationStatus = 'matched' | 'unmatched' | 'discrepancy' | 'pending' | 'manual';
type PaymentSource = 'stripe' | 'paypal' | 'firestore';
type DateRange = '7d' | '30d' | '90d' | 'custom';

interface PaymentRecord {
  id: string;
  source: PaymentSource;
  externalId?: string; // Stripe/PayPal ID
  amount: number;
  currency: string;
  status: string;
  createdAt: Date;
  clientId?: string;
  clientEmail?: string;
  providerId?: string;
  providerEmail?: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface ReconciliationRecord {
  id: string;
  firestorePayment: PaymentRecord | null;
  stripePayment: PaymentRecord | null;
  paypalPayment: PaymentRecord | null;
  status: ReconciliationStatus;
  discrepancyAmount?: number;
  discrepancyReason?: string;
  reconciledAt?: Date;
  reconciledBy?: string;
  notes?: string;
}

interface ReconciliationStats {
  totalTransactions: number;
  matchedCount: number;
  unmatchedCount: number;
  discrepancyCount: number;
  pendingCount: number;
  totalAmount: number;
  discrepancyAmount: number;
}

interface ReconciliationFilters {
  status: ReconciliationStatus | 'all';
  source: PaymentSource | 'all';
  dateRange: DateRange;
  dateFrom?: string;
  dateTo?: string;
  minAmount?: number;
  maxAmount?: number;
  search: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STATUS_CONFIG: Record<ReconciliationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  matched: { label: 'Rapproché', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> },
  unmatched: { label: 'Non rapproché', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" /> },
  discrepancy: { label: 'Écart', color: 'bg-yellow-100 text-yellow-800', icon: <AlertTriangle className="w-4 h-4" /> },
  pending: { label: 'En attente', color: 'bg-blue-100 text-blue-800', icon: <Clock className="w-4 h-4" /> },
  manual: { label: 'Manuel', color: 'bg-purple-100 text-purple-800', icon: <FileText className="w-4 h-4" /> },
};

const SOURCE_CONFIG: Record<PaymentSource, { label: string; color: string; icon: React.ReactNode }> = {
  stripe: { label: 'Stripe', color: 'bg-indigo-100 text-indigo-800', icon: <CreditCard className="w-4 h-4" /> },
  paypal: { label: 'PayPal', color: 'bg-blue-100 text-blue-800', icon: <Wallet className="w-4 h-4" /> },
  firestore: { label: 'Firestore', color: 'bg-orange-100 text-orange-800', icon: <Building2 className="w-4 h-4" /> },
};

const DEFAULT_FILTERS: ReconciliationFilters = {
  status: 'all',
  source: 'all',
  dateRange: '30d',
  search: '',
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const StatCard: React.FC<{
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; isUp: boolean };
  color?: string;
}> = ({ title, value, subtitle, icon, trend, color = 'bg-white' }) => (
  <div className={`${color} rounded-lg shadow p-4 border border-gray-200`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className="p-3 rounded-full bg-gray-100">{icon}</div>
    </div>
    {trend && (
      <div className={`mt-2 flex items-center text-sm ${trend.isUp ? 'text-green-600' : 'text-red-600'}`}>
        {trend.isUp ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
        {trend.value}% vs période précédente
      </div>
    )}
  </div>
);

const StatusBadge: React.FC<{ status: ReconciliationStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const SourceBadge: React.FC<{ source: PaymentSource }> = ({ source }) => {
  const config = SOURCE_CONFIG[source];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const AmountCell: React.FC<{ amount: number; currency: string; discrepancy?: number }> = ({
  amount,
  currency,
  discrepancy,
}) => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'EUR',
  }).format(amount / 100);

  return (
    <div>
      <span className="font-medium">{formatted}</span>
      {discrepancy !== undefined && discrepancy !== 0 && (
        <span className={`ml-2 text-xs ${discrepancy > 0 ? 'text-red-600' : 'text-green-600'}`}>
          ({discrepancy > 0 ? '+' : ''}{(discrepancy / 100).toFixed(2)} €)
        </span>
      )}
    </div>
  );
};

// =============================================================================
// RECONCILIATION ROW
// =============================================================================

interface ReconciliationRowProps {
  record: ReconciliationRecord;
  onReconcile: (id: string) => void;
  onViewDetails: (record: ReconciliationRecord) => void;
  onUnlink: (id: string) => void;
}

const ReconciliationRow: React.FC<ReconciliationRowProps> = ({
  record,
  onReconcile,
  onViewDetails,
  onUnlink,
}) => {
  const [expanded, setExpanded] = useState(false);
  const intl = useIntl();

  const primaryPayment = record.firestorePayment || record.stripePayment || record.paypalPayment;
  if (!primaryPayment) return null;

  const formatDate = (date: Date) =>
    intl.formatDate(date, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="border-b border-gray-200 hover:bg-gray-50">
      <div
        role="button"
        tabIndex={0}
        className="px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(!expanded); } }}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Collapse' : 'Expand'} payment details for ${primaryPayment.id}`}
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0" aria-hidden="true">
            {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{primaryPayment.id}</p>
            <p className="text-xs text-gray-500">{formatDate(primaryPayment.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex gap-2">
            {record.firestorePayment && <SourceBadge source="firestore" />}
            {record.stripePayment && <SourceBadge source="stripe" />}
            {record.paypalPayment && <SourceBadge source="paypal" />}
          </div>

          <AmountCell
            amount={primaryPayment.amount}
            currency={primaryPayment.currency}
            discrepancy={record.discrepancyAmount}
          />

          <StatusBadge status={record.status} />

          <div className="flex gap-2">
            <button
              onClick={(e) => { e.stopPropagation(); onViewDetails(record); }}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
              aria-label="View details"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
            </button>
            {record.status === 'unmatched' && (
              <button
                onClick={(e) => { e.stopPropagation(); onReconcile(record.id); }}
                className="p-1.5 text-green-500 hover:text-green-700 rounded"
                aria-label="Reconcile manually"
              >
                <Link2 className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            {record.status === 'matched' && (
              <button
                onClick={(e) => { e.stopPropagation(); onUnlink(record.id); }}
                className="p-1.5 text-red-400 hover:text-red-600 rounded"
                aria-label="Cancel reconciliation"
              >
                <Unlink className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-gray-50">
          <div className="grid grid-cols-3 gap-4">
            {/* Firestore */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-orange-500" />
                <span className="font-medium text-sm">Firestore</span>
              </div>
              {record.firestorePayment ? (
                <dl className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">ID</dt>
                    <dd className="font-mono">{record.firestorePayment.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Montant</dt>
                    <dd>{(record.firestorePayment.amount / 100).toFixed(2)} {record.firestorePayment.currency}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Statut</dt>
                    <dd>{record.firestorePayment.status}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-gray-400 italic">Non trouvé</p>
              )}
            </div>

            {/* Stripe */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <CreditCard className="w-4 h-4 text-indigo-500" />
                <span className="font-medium text-sm">Stripe</span>
              </div>
              {record.stripePayment ? (
                <dl className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">ID</dt>
                    <dd className="font-mono">{record.stripePayment.externalId || record.stripePayment.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Montant</dt>
                    <dd>{(record.stripePayment.amount / 100).toFixed(2)} {record.stripePayment.currency}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Statut</dt>
                    <dd>{record.stripePayment.status}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-gray-400 italic">Non trouvé</p>
              )}
            </div>

            {/* PayPal */}
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-sm">PayPal</span>
              </div>
              {record.paypalPayment ? (
                <dl className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">ID</dt>
                    <dd className="font-mono">{record.paypalPayment.externalId || record.paypalPayment.id}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Montant</dt>
                    <dd>{(record.paypalPayment.amount / 100).toFixed(2)} {record.paypalPayment.currency}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Statut</dt>
                    <dd>{record.paypalPayment.status}</dd>
                  </div>
                </dl>
              ) : (
                <p className="text-xs text-gray-400 italic">Non trouvé</p>
              )}
            </div>
          </div>

          {record.discrepancyReason && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
              <strong>Raison de l'écart:</strong> {record.discrepancyReason}
            </div>
          )}

          {record.notes && (
            <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <strong>Notes:</strong> {record.notes}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function AdminFinanceReconciliation() {
  const intl = useIntl();
  const { user } = useAuth();

  // State
  const [records, setRecords] = useState<ReconciliationRecord[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filters, setFilters] = useState<ReconciliationFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<ReconciliationRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const fetchReconciliationData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Calculate date range
      const now = new Date();
      let dateFrom = new Date();

      switch (filters.dateRange) {
        case '7d':
          dateFrom.setDate(now.getDate() - 7);
          break;
        case '30d':
          dateFrom.setDate(now.getDate() - 30);
          break;
        case '90d':
          dateFrom.setDate(now.getDate() - 90);
          break;
        case 'custom':
          if (filters.dateFrom) dateFrom = new Date(filters.dateFrom);
          break;
      }

      // Fetch payments from Firestore
      const paymentsRef = collection(db, 'payments');
      const paymentsQuery = query(
        paymentsRef,
        where('createdAt', '>=', Timestamp.fromDate(dateFrom)),
        orderBy('createdAt', 'desc'),
        limit(500)
      );

      const paymentsSnapshot = await getDocs(paymentsQuery);
      const firestorePayments: PaymentRecord[] = [];

      paymentsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data._placeholder) return;

        firestorePayments.push({
          id: doc.id,
          source: 'firestore',
          externalId: data.stripePaymentIntentId || data.paypalOrderId,
          amount: data.amount || 0,
          currency: data.currency || 'EUR',
          status: data.status || 'unknown',
          createdAt: data.createdAt?.toDate() || new Date(),
          clientId: data.clientId,
          clientEmail: data.clientEmail,
          providerId: data.providerId,
          providerEmail: data.providerEmail,
          description: data.description,
          metadata: data.metadata,
        });
      });

      // Build reconciliation records
      // For now, simulate matching - in production, you'd call a Cloud Function
      // that fetches actual Stripe/PayPal data via their APIs
      const reconciliationRecords: ReconciliationRecord[] = firestorePayments.map((payment) => {
        const hasStripeId = payment.externalId?.startsWith('pi_');
        const hasPaypalId = payment.externalId && !payment.externalId.startsWith('pi_');

        // Determine status based on available data
        let status: ReconciliationStatus = 'pending';
        let discrepancyAmount: number | undefined;

        if (payment.status === 'succeeded' || payment.status === 'paid') {
          if (hasStripeId || hasPaypalId) {
            status = 'matched';
          } else {
            status = 'unmatched';
          }
        } else if (payment.status === 'refunded') {
          status = 'matched';
        } else if (payment.status === 'failed') {
          status = 'discrepancy';
          discrepancyAmount = payment.amount;
        }

        return {
          id: payment.id,
          firestorePayment: payment,
          stripePayment: hasStripeId ? { ...payment, source: 'stripe' as PaymentSource, id: payment.externalId! } : null,
          paypalPayment: hasPaypalId ? { ...payment, source: 'paypal' as PaymentSource, id: payment.externalId! } : null,
          status,
          discrepancyAmount,
        };
      });

      // Apply filters
      let filteredRecords = reconciliationRecords;

      if (filters.status !== 'all') {
        filteredRecords = filteredRecords.filter((r) => r.status === filters.status);
      }

      if (filters.source !== 'all') {
        filteredRecords = filteredRecords.filter((r) => {
          if (filters.source === 'firestore') return r.firestorePayment !== null;
          if (filters.source === 'stripe') return r.stripePayment !== null;
          if (filters.source === 'paypal') return r.paypalPayment !== null;
          return true;
        });
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredRecords = filteredRecords.filter((r) => {
          const payment = r.firestorePayment || r.stripePayment || r.paypalPayment;
          return (
            payment?.id.toLowerCase().includes(searchLower) ||
            payment?.clientEmail?.toLowerCase().includes(searchLower) ||
            payment?.providerEmail?.toLowerCase().includes(searchLower) ||
            payment?.externalId?.toLowerCase().includes(searchLower)
          );
        });
      }

      setRecords(filteredRecords);

      // Calculate stats
      const totalAmount = reconciliationRecords.reduce((sum, r) => {
        const payment = r.firestorePayment || r.stripePayment || r.paypalPayment;
        return sum + (payment?.amount || 0);
      }, 0);

      const discrepancyTotal = reconciliationRecords
        .filter((r) => r.status === 'discrepancy')
        .reduce((sum, r) => sum + (r.discrepancyAmount || 0), 0);

      setStats({
        totalTransactions: reconciliationRecords.length,
        matchedCount: reconciliationRecords.filter((r) => r.status === 'matched').length,
        unmatchedCount: reconciliationRecords.filter((r) => r.status === 'unmatched').length,
        discrepancyCount: reconciliationRecords.filter((r) => r.status === 'discrepancy').length,
        pendingCount: reconciliationRecords.filter((r) => r.status === 'pending').length,
        totalAmount,
        discrepancyAmount: discrepancyTotal,
      });

    } catch (err) {
      console.error('[Reconciliation] Error fetching data:', err);
      setError('Erreur lors du chargement des données de rapprochement');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchReconciliationData();
  }, [fetchReconciliationData]);

  // ==========================================================================
  // ACTIONS
  // ==========================================================================

  // AUDIT-FIX C1: "syncReconciliation" does NOT exist in the backend
  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      // Fallback: just refresh data from Firestore (no backend sync available)
      console.warn('[Reconciliation] syncReconciliation: Backend function does not exist, refreshing data only');
      await fetchReconciliationData();
    } catch (err) {
      console.error('[Reconciliation] Sync error:', err);
      setError('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  }, [fetchReconciliationData]);

  const handleManualReconcile = useCallback(async (recordId: string) => {
    try {
      // Log manual reconciliation
      await addDoc(collection(db, 'reconciliation_logs'), {
        recordId,
        action: 'manual_reconcile',
        userId: user?.uid,
        timestamp: serverTimestamp(),
      });

      // Update local state
      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, status: 'manual' as ReconciliationStatus, reconciledBy: user?.uid } : r
        )
      );
    } catch (err) {
      console.error('[Reconciliation] Manual reconcile error:', err);
    }
  }, [user]);

  const handleUnlink = useCallback(async (recordId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler ce rapprochement ?')) return;

    try {
      await addDoc(collection(db, 'reconciliation_logs'), {
        recordId,
        action: 'unlink',
        userId: user?.uid,
        timestamp: serverTimestamp(),
      });

      setRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, status: 'unmatched' as ReconciliationStatus } : r
        )
      );
    } catch (err) {
      console.error('[Reconciliation] Unlink error:', err);
    }
  }, [user]);

  const handleExport = useCallback(() => {
    const csvData = records.map((r) => {
      const payment = r.firestorePayment || r.stripePayment || r.paypalPayment;
      return {
        id: r.id,
        status: r.status,
        amount: payment?.amount ? (payment.amount / 100).toFixed(2) : '',
        currency: payment?.currency || '',
        firestoreId: r.firestorePayment?.id || '',
        stripeId: r.stripePayment?.externalId || '',
        paypalId: r.paypalPayment?.externalId || '',
        discrepancy: r.discrepancyAmount ? (r.discrepancyAmount / 100).toFixed(2) : '',
        date: payment?.createdAt.toISOString() || '',
      };
    });

    const headers = Object.keys(csvData[0] || {});
    const csv = [
      headers.join(','),
      ...csvData.map((row) => headers.map((h) => `"${(row as Record<string, string>)[h]}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `reconciliation-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [records]);

  // ==========================================================================
  // RENDER
  // ==========================================================================

  return (
    <AdminLayout>
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <ArrowLeftRight className="w-7 h-7 text-indigo-600" />
              {intl.formatMessage({ id: 'admin.finance.reconciliation.title', defaultMessage: 'Rapprochement bancaire' })}
            </h1>
            <p className="text-gray-600 mt-1">
              {intl.formatMessage({
                id: 'admin.finance.reconciliation.subtitle',
                defaultMessage: 'Vérifiez la cohérence entre Stripe, PayPal et Firestore',
              })}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
            <Button variant="outline" onClick={handleExport} disabled={records.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exporter
            </Button>
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
              Synchroniser
            </Button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              title="Total transactions"
              value={stats.totalTransactions}
              subtitle={`${(stats.totalAmount / 100).toFixed(2)} €`}
              icon={<DollarSign className="w-5 h-5 text-gray-600" />}
            />
            <StatCard
              title="Rapprochés"
              value={stats.matchedCount}
              subtitle={`${stats.totalTransactions > 0 ? ((stats.matchedCount / stats.totalTransactions) * 100).toFixed(1) : 0}%`}
              icon={<CheckCircle className="w-5 h-5 text-green-600" />}
              color="bg-green-50"
            />
            <StatCard
              title="Non rapprochés"
              value={stats.unmatchedCount}
              icon={<XCircle className="w-5 h-5 text-red-600" />}
              color="bg-red-50"
            />
            <StatCard
              title="Écarts"
              value={stats.discrepancyCount}
              subtitle={stats.discrepancyAmount > 0 ? `${(stats.discrepancyAmount / 100).toFixed(2)} €` : undefined}
              icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
              color="bg-yellow-50"
            />
            <StatCard
              title="En attente"
              value={stats.pendingCount}
              icon={<Clock className="w-5 h-5 text-blue-600" />}
              color="bg-blue-50"
            />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ReconciliationStatus | 'all' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                >
                  <option value="all">Tous</option>
                  <option value="matched">Rapprochés</option>
                  <option value="unmatched">Non rapprochés</option>
                  <option value="discrepancy">Écarts</option>
                  <option value="pending">En attente</option>
                  <option value="manual">Manuel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                <select
                  value={filters.source}
                  onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value as PaymentSource | 'all' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                >
                  <option value="all">Toutes</option>
                  <option value="stripe">Stripe</option>
                  <option value="paypal">PayPal</option>
                  <option value="firestore">Firestore</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Période</label>
                <select
                  value={filters.dateRange}
                  onChange={(e) => setFilters((f) => ({ ...f, dateRange: e.target.value as DateRange }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                >
                  <option value="7d">7 derniers jours</option>
                  <option value="30d">30 derniers jours</option>
                  <option value="90d">90 derniers jours</option>
                  <option value="custom">Personnalisé</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
                    placeholder="ID, email..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Records List */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">
              Transactions ({records.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
              <p className="text-gray-500 mt-2">Chargement...</p>
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-2">Aucune transaction à rapprocher</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {records.map((record) => (
                <ReconciliationRow
                  key={record.id}
                  record={record}
                  onReconcile={handleManualReconcile}
                  onViewDetails={setSelectedRecord}
                  onUnlink={handleUnlink}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

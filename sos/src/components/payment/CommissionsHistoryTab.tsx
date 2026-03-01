/**
 * CommissionsHistoryTab
 *
 * Composant réutilisable pour afficher l'historique des commissions.
 * Utilisé par Chatter, Influencer, Blogger.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useIntl } from 'react-intl';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Filter,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

export type CommissionStatus =
  | 'pending'
  | 'validated'
  | 'available'
  | 'paid'
  | 'cancelled';

export interface GenericCommission {
  id: string;
  type: string;
  amount: number;
  status: CommissionStatus;
  description: string;
  createdAt: string;
  validatedAt?: string | null;
  availableAt?: string | null;
  paidAt?: string | null;
  currency?: string;
}

export interface CommissionsHistoryTabProps {
  commissions: GenericCommission[];
  role: 'chatter' | 'influencer' | 'blogger';
  currency?: string;
  isLoading?: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const PAGE_SIZE = 10;

const STATUS_FILTERS = [
  { value: 'all', label: 'Tout' },
  { value: 'pending', label: 'En attente' },
  { value: 'validated', label: 'Validé' },
  { value: 'available', label: 'Disponible' },
  { value: 'paid', label: 'Payé' },
  { value: 'cancelled', label: 'Annulé' },
] as const;

// ============================================================================
// HELPERS
// ============================================================================

function getStatusColor(status: CommissionStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'available':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'validated':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
    case 'pending':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'cancelled':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  }
}

function getStatusIcon(status: CommissionStatus) {
  switch (status) {
    case 'paid':
    case 'available':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'validated':
      return <CheckCircle className="w-4 h-4 text-indigo-500" />;
    case 'pending':
      return <Clock className="w-4 h-4 text-amber-500" />;
    case 'cancelled':
      return <XCircle className="w-4 h-4 text-gray-400" />;
    default:
      return <Clock className="w-4 h-4 text-gray-400" />;
  }
}

function getStatusLabel(status: CommissionStatus): string {
  const labels: Record<CommissionStatus, string> = {
    pending: 'En attente',
    validated: 'Validé',
    available: 'Disponible',
    paid: 'Payé',
    cancelled: 'Annulé',
  };
  return labels[status] || status;
}

// P1-4 FIX: Use browser locale instead of hardcoded 'fr-FR'
function formatAmountUSD(cents: number): string {
  return new Intl.NumberFormat(navigator.language || 'fr-FR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString(navigator.language || 'fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function commissionsToCsv(commissions: GenericCommission[]): string {
  const BOM = '\uFEFF';
  const headers = ['Date', 'Type', 'Description', 'Montant (USD)', 'Statut'];
  const rows = commissions.map((c) => [
    formatDate(c.createdAt),
    c.type,
    `"${c.description.replace(/"/g, '""')}"`,
    (c.amount / 100).toFixed(2),
    getStatusLabel(c.status),
  ]);
  return BOM + [headers, ...rows].map((r) => r.join(';')).join('\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================================================
// COMPONENT
// ============================================================================

const CommissionsHistoryTab: React.FC<CommissionsHistoryTabProps> = ({
  commissions,
  role,
  currency = 'USD',
  isLoading = false,
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return commissions;
    return commissions.filter((c) => c.status === statusFilter);
  }, [commissions, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const handleFilterChange = useCallback(
    (value: string) => {
      setStatusFilter(value);
      setPage(1);
    },
    []
  );

  const handleExportCsv = useCallback(() => {
    const csv = commissionsToCsv(filtered);
    const now = new Date().toISOString().slice(0, 10);
    downloadCsv(csv, `commissions_${role}_${now}.csv`);
  }, [filtered, role]);

  // Stats
  const totalEarned = useMemo(
    () => commissions.filter((c) => c.status !== 'cancelled').reduce((sum, c) => sum + c.amount, 0),
    [commissions]
  );
  const available = useMemo(
    () => commissions.filter((c) => c.status === 'available').reduce((sum, c) => sum + c.amount, 0),
    [commissions]
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white/80 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total gagné</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{formatAmountUSD(totalEarned)}</p>
        </div>
        <div className="bg-white/80 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Disponible</p>
          <p className="text-xl font-bold text-green-600 dark:text-green-400">{formatAmountUSD(available)}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange(e.target.value)}
            className="text-sm border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 bg-white dark:bg-white/5 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            {STATUS_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>
        {filtered.length > 0 && (
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white/80 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl p-10 text-center">
          <TrendingUp className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Aucune commission trouvée</p>
        </div>
      ) : (
        <div className="bg-white/80 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="hidden sm:grid grid-cols-[1fr_2fr_3fr_auto_auto] gap-3 px-4 py-2 bg-gray-50 dark:bg-white/5 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-100 dark:border-white/5">
            <span>Date</span>
            <span>Type</span>
            <span>Description</span>
            <span className="text-right">Montant</span>
            <span className="text-right">Statut</span>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {paginated.map((commission) => (
              <div
                key={commission.id}
                className="flex flex-col sm:grid sm:grid-cols-[1fr_2fr_3fr_auto_auto] gap-1 sm:gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
              >
                {/* Date */}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(commission.createdAt)}
                </span>

                {/* Type */}
                <span className="text-xs font-mono text-gray-600 dark:text-gray-300 truncate">
                  {commission.type}
                </span>

                {/* Description */}
                <span className="text-sm text-gray-700 dark:text-gray-200 truncate">
                  {commission.description}
                </span>

                {/* Amount */}
                <span className="text-sm font-semibold text-gray-900 dark:text-white sm:text-right">
                  {formatAmountUSD(commission.amount)}
                </span>

                {/* Status */}
                <div className="flex items-center gap-1 sm:justify-end">
                  {getStatusIcon(commission.status)}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(commission.status)}`}>
                    {getStatusLabel(commission.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Page {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CommissionsHistoryTab;

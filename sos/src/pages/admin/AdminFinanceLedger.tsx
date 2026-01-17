/**
 * AdminFinanceLedger.tsx
 * Grand livre comptable - Vue des écritures comptables générées automatiquement
 * Conforme aux normes comptables estoniennes
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
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import {
  BookOpen,
  RefreshCw,
  Download,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Calendar,
  TrendingUp,
  TrendingDown,
  Loader2,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  Eye,
  Printer,
  X,
} from 'lucide-react';
import { toCsv, toExcel, downloadBlob } from '../../services/finance/reports';

// =============================================================================
// TYPES
// =============================================================================

type EntryType = 'debit' | 'credit';
type AccountCategory = 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
type JournalEntryStatus = 'posted' | 'pending' | 'reversed';

interface JournalEntryLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  description?: string;
}

interface JournalEntry {
  id: string;
  entryNumber: string;
  date: Date;
  description: string;
  reference?: string;
  referenceType?: 'payment' | 'refund' | 'subscription' | 'payout' | 'adjustment';
  lines: JournalEntryLine[];
  totalDebit: number;
  totalCredit: number;
  status: JournalEntryStatus;
  createdAt: Date;
  createdBy?: string;
  reversedAt?: Date;
  reversedBy?: string;
  reversalEntryId?: string;
}

interface AccountBalance {
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  openingBalance: number;
  totalDebit: number;
  totalCredit: number;
  closingBalance: number;
  movementCount: number;
}

interface LedgerFilters {
  dateFrom: string;
  dateTo: string;
  accountCode: string;
  status: JournalEntryStatus | 'all';
  referenceType: string;
  search: string;
}

interface LedgerStats {
  totalEntries: number;
  totalDebit: number;
  totalCredit: number;
  pendingCount: number;
  accountsUsed: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ACCOUNT_CATEGORIES: Record<AccountCategory, { label: string; color: string }> = {
  asset: { label: 'Actif', color: 'bg-blue-100 text-blue-800' },
  liability: { label: 'Passif', color: 'bg-red-100 text-red-800' },
  equity: { label: 'Capitaux propres', color: 'bg-purple-100 text-purple-800' },
  revenue: { label: 'Produits', color: 'bg-green-100 text-green-800' },
  expense: { label: 'Charges', color: 'bg-orange-100 text-orange-800' },
};

const STATUS_CONFIG: Record<JournalEntryStatus, { label: string; color: string }> = {
  posted: { label: 'Validée', color: 'bg-green-100 text-green-800' },
  pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
  reversed: { label: 'Extournée', color: 'bg-gray-100 text-gray-800' },
};

const REFERENCE_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  payment: { label: 'Paiement', color: 'bg-blue-100 text-blue-800' },
  refund: { label: 'Remboursement', color: 'bg-orange-100 text-orange-800' },
  subscription: { label: 'Abonnement', color: 'bg-purple-100 text-purple-800' },
  payout: { label: 'Versement', color: 'bg-green-100 text-green-800' },
  adjustment: { label: 'Régularisation', color: 'bg-gray-100 text-gray-800' },
};

const PAGE_SIZE = 50;

const getDefaultDateRange = () => {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: firstDay.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
};

const DEFAULT_FILTERS: LedgerFilters = {
  ...getDefaultDateRange(),
  dateFrom: getDefaultDateRange().from,
  dateTo: getDefaultDateRange().to,
  accountCode: '',
  status: 'all',
  referenceType: '',
  search: '',
};

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
}> = ({ title, value, subtitle, icon, color = 'bg-white' }) => (
  <div className={`${color} rounded-lg shadow p-4 border border-gray-200`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
      <div className="p-3 rounded-full bg-gray-100">{icon}</div>
    </div>
  </div>
);

const AmountDisplay: React.FC<{ amount: number; type?: 'debit' | 'credit' | 'neutral' }> = ({
  amount,
  type = 'neutral',
}) => {
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount / 100);

  const colorClass =
    type === 'debit'
      ? 'text-red-600'
      : type === 'credit'
      ? 'text-green-600'
      : 'text-gray-900';

  return <span className={`font-mono ${colorClass}`}>{formatted}</span>;
};

const StatusBadge: React.FC<{ status: JournalEntryStatus }> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

const ReferenceTypeBadge: React.FC<{ type?: string }> = ({ type }) => {
  if (!type) return null;
  const config = REFERENCE_TYPE_CONFIG[type] || { label: type, color: 'bg-gray-100 text-gray-800' };
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
};

// =============================================================================
// JOURNAL ENTRY ROW
// =============================================================================

interface JournalEntryRowProps {
  entry: JournalEntry;
  onViewDetails: (entry: JournalEntry) => void;
}

const JournalEntryRow: React.FC<JournalEntryRowProps> = ({ entry, onViewDetails }) => {
  const [expanded, setExpanded] = useState(false);
  const intl = useIntl();

  const formatDate = (date: Date) =>
    intl.formatDate(date, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="border-b border-gray-200 hover:bg-gray-50">
      {/* Header Row */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            {expanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-medium text-gray-900">{entry.entryNumber}</span>
              <StatusBadge status={entry.status} />
              {entry.referenceType && <ReferenceTypeBadge type={entry.referenceType} />}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{formatDate(entry.date)}</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-sm text-gray-500">Débit</p>
            <AmountDisplay amount={entry.totalDebit} type="debit" />
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Crédit</p>
            <AmountDisplay amount={entry.totalCredit} type="credit" />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(entry);
            }}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
            aria-label="View details"
          >
            <Eye className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 bg-gray-50">
          <div className="mb-3">
            <p className="text-sm text-gray-700">{entry.description}</p>
            {entry.reference && (
              <p className="text-xs text-gray-500 mt-1">
                Réf: <span className="font-mono">{entry.reference}</span>
              </p>
            )}
          </div>

          {/* Entry Lines */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Compte
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Libellé
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Débit
                  </th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                    Crédit
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {entry.lines.map((line, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <span className="font-mono text-sm">{line.accountCode}</span>
                      <span className="text-sm text-gray-500 ml-2">{line.accountName}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">
                      {line.description || '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {line.debit > 0 ? (
                        <AmountDisplay amount={line.debit} type="debit" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {line.credit > 0 ? (
                        <AmountDisplay amount={line.credit} type="credit" />
                      ) : (
                        <span className="text-gray-300">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td colSpan={2} className="px-3 py-2 text-sm text-gray-700">
                    Total
                  </td>
                  <td className="px-3 py-2 text-right">
                    <AmountDisplay amount={entry.totalDebit} type="debit" />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <AmountDisplay amount={entry.totalCredit} type="credit" />
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {entry.status === 'reversed' && entry.reversalEntryId && (
            <div className="mt-2 p-2 bg-gray-100 border border-gray-200 rounded text-xs text-gray-600">
              Extournée par écriture: <span className="font-mono">{entry.reversalEntryId}</span>
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

export default function AdminFinanceLedger() {
  const intl = useIntl();

  // State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<LedgerFilters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  // ==========================================================================
  // DATA FETCHING
  // ==========================================================================

  const fetchLedgerData = useCallback(async (reset = false) => {
    setLoading(true);

    try {
      const entriesRef = collection(db, 'journal_entries');

      // Build query constraints
      const constraints = [
        where('date', '>=', Timestamp.fromDate(new Date(filters.dateFrom))),
        where('date', '<=', Timestamp.fromDate(new Date(filters.dateTo + 'T23:59:59'))),
        orderBy('date', 'desc'),
        orderBy('entryNumber', 'desc'),
      ];

      if (filters.status !== 'all') {
        constraints.splice(2, 0, where('status', '==', filters.status));
      }

      let entriesQuery = query(entriesRef, ...constraints, limit(PAGE_SIZE));

      if (!reset && lastDoc) {
        entriesQuery = query(entriesRef, ...constraints, startAfter(lastDoc), limit(PAGE_SIZE));
      }

      const snapshot = await getDocs(entriesQuery);

      const newEntries: JournalEntry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data._placeholder) return;

        newEntries.push({
          id: doc.id,
          entryNumber: data.entryNumber || doc.id,
          date: data.date?.toDate() || new Date(),
          description: data.description || '',
          reference: data.reference,
          referenceType: data.referenceType,
          lines: (data.lines || []).map((line: Record<string, unknown>) => ({
            accountCode: line.accountCode || '',
            accountName: line.accountName || '',
            debit: line.debit || 0,
            credit: line.credit || 0,
            description: line.description,
          })),
          totalDebit: data.totalDebit || 0,
          totalCredit: data.totalCredit || 0,
          status: data.status || 'posted',
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          reversedAt: data.reversedAt?.toDate(),
          reversedBy: data.reversedBy,
          reversalEntryId: data.reversalEntryId,
        });
      });

      // Apply client-side filters
      let filteredEntries = newEntries;

      if (filters.accountCode) {
        filteredEntries = filteredEntries.filter((e) =>
          e.lines.some((l) => l.accountCode.startsWith(filters.accountCode))
        );
      }

      if (filters.referenceType) {
        filteredEntries = filteredEntries.filter((e) => e.referenceType === filters.referenceType);
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredEntries = filteredEntries.filter(
          (e) =>
            e.entryNumber.toLowerCase().includes(searchLower) ||
            e.description.toLowerCase().includes(searchLower) ||
            e.reference?.toLowerCase().includes(searchLower) ||
            e.lines.some(
              (l) =>
                l.accountCode.includes(searchLower) ||
                l.accountName.toLowerCase().includes(searchLower)
            )
        );
      }

      if (reset) {
        setEntries(filteredEntries);
        setPage(0);
      } else {
        setEntries((prev) => [...prev, ...filteredEntries]);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === PAGE_SIZE);

      // Calculate stats (only on reset)
      if (reset) {
        const totalDebit = newEntries.reduce((sum, e) => sum + e.totalDebit, 0);
        const totalCredit = newEntries.reduce((sum, e) => sum + e.totalCredit, 0);
        const pendingCount = newEntries.filter((e) => e.status === 'pending').length;
        const accountCodes = new Set<string>();
        newEntries.forEach((e) => e.lines.forEach((l) => accountCodes.add(l.accountCode)));

        setStats({
          totalEntries: newEntries.length,
          totalDebit,
          totalCredit,
          pendingCount,
          accountsUsed: accountCodes.size,
        });
      }
    } catch (error) {
      console.error('[Ledger] Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, lastDoc]);

  useEffect(() => {
    fetchLedgerData(true);
  }, [filters.dateFrom, filters.dateTo, filters.status]);

  // ==========================================================================
  // EXPORT
  // ==========================================================================

  const handleExport = useCallback((format: 'csv' | 'excel') => {
    const exportData = entries.flatMap((entry) =>
      entry.lines.map((line) => ({
        'N° Écriture': entry.entryNumber,
        Date: entry.date.toISOString().split('T')[0],
        'Code Compte': line.accountCode,
        'Nom Compte': line.accountName,
        Libellé: entry.description,
        Débit: line.debit > 0 ? (line.debit / 100).toFixed(2) : '',
        Crédit: line.credit > 0 ? (line.credit / 100).toFixed(2) : '',
        Référence: entry.reference || '',
        Statut: STATUS_CONFIG[entry.status].label,
      }))
    );

    const filename = `grand-livre-${filters.dateFrom}-${filters.dateTo}`;

    if (format === 'csv') {
      const csv = toCsv(exportData as Record<string, unknown>[]);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      downloadBlob(blob, `${filename}.csv`);
    } else {
      const blob = toExcel(exportData as Record<string, unknown>[], { sheetName: 'Grand Livre' });
      downloadBlob(blob, `${filename}.xlsx`);
    }
  }, [entries, filters]);

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
              <BookOpen className="w-7 h-7 text-indigo-600" />
              {intl.formatMessage({ id: 'admin.finance.ledger.title', defaultMessage: 'Grand Livre' })}
            </h1>
            <p className="text-gray-600 mt-1">
              {intl.formatMessage({
                id: 'admin.finance.ledger.subtitle',
                defaultMessage: 'Historique des écritures comptables',
              })}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
            <div className="relative group">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exporter
                <ChevronDown className="w-4 h-4 ml-2" />
              </Button>
              <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 hidden group-hover:block z-10">
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport('excel')}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50"
                >
                  Excel
                </button>
              </div>
            </div>
            <Button onClick={() => fetchLedgerData(true)}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualiser
            </Button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <StatCard
              title="Écritures"
              value={stats.totalEntries}
              icon={<FileText className="w-5 h-5 text-gray-600" />}
            />
            <StatCard
              title="Total Débits"
              value={`${(stats.totalDebit / 100).toLocaleString('fr-FR')} €`}
              icon={<ArrowUpRight className="w-5 h-5 text-red-600" />}
              color="bg-red-50"
            />
            <StatCard
              title="Total Crédits"
              value={`${(stats.totalCredit / 100).toLocaleString('fr-FR')} €`}
              icon={<ArrowDownLeft className="w-5 h-5 text-green-600" />}
              color="bg-green-50"
            />
            <StatCard
              title="En attente"
              value={stats.pendingCount}
              icon={<Calendar className="w-5 h-5 text-yellow-600" />}
              color="bg-yellow-50"
            />
            <StatCard
              title="Comptes utilisés"
              value={stats.accountsUsed}
              icon={<BookOpen className="w-5 h-5 text-indigo-600" />}
              color="bg-indigo-50"
            />
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Compte</label>
                <input
                  type="text"
                  value={filters.accountCode}
                  onChange={(e) => setFilters((f) => ({ ...f, accountCode: e.target.value }))}
                  placeholder="Ex: 411, 512..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as JournalEntryStatus | 'all' }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                >
                  <option value="all">Tous</option>
                  <option value="posted">Validées</option>
                  <option value="pending">En attente</option>
                  <option value="reversed">Extournées</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filters.referenceType}
                  onChange={(e) => setFilters((f) => ({ ...f, referenceType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md"
                >
                  <option value="">Tous</option>
                  <option value="payment">Paiements</option>
                  <option value="refund">Remboursements</option>
                  <option value="subscription">Abonnements</option>
                  <option value="payout">Versements</option>
                  <option value="adjustment">Régularisations</option>
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
                    placeholder="N°, libellé..."
                    className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-md"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Entries List */}
        <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-700">
              Écritures comptables ({entries.length})
            </h2>
            <div className="text-xs text-gray-500">
              Période: {filters.dateFrom} → {filters.dateTo}
            </div>
          </div>

          {loading && entries.length === 0 ? (
            <div className="p-12 text-center">
              <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto" />
              <p className="text-gray-500 mt-2">Chargement...</p>
            </div>
          ) : entries.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="text-gray-500 mt-2">Aucune écriture pour cette période</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200">
                {entries.map((entry) => (
                  <JournalEntryRow
                    key={entry.id}
                    entry={entry}
                    onViewDetails={setSelectedEntry}
                  />
                ))}
              </div>

              {/* Load More */}
              {hasMore && (
                <div className="p-4 text-center border-t border-gray-200">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPage((p) => p + 1);
                      fetchLedgerData(false);
                    }}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <ChevronDown className="w-4 h-4 mr-2" />
                    )}
                    Charger plus
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Balance Check */}
        {stats && stats.totalDebit !== stats.totalCredit && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-red-800 font-medium">Déséquilibre détecté</p>
              <p className="text-red-600 text-sm">
                Écart: {((stats.totalDebit - stats.totalCredit) / 100).toFixed(2)} €
              </p>
            </div>
          </div>
        )}

        {stats && stats.totalDebit === stats.totalCredit && stats.totalEntries > 0 && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-green-600" />
            <p className="text-green-800">
              Comptes équilibrés - Total: {(stats.totalDebit / 100).toLocaleString('fr-FR')} €
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

/**
 * SupportingDocuments.tsx
 * Page admin - Gestion des pieces justificatives
 * (factures fournisseurs, recus, releves bancaires, contrats)
 *
 * Corrections v2: Edit modal, EUR input, full CSV export, backend stats,
 * audit trail, fiscal year filter, journal entry autocomplete, add files,
 * supplier filter, exchange rate display, expanded currencies.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { getAuth } from 'firebase/auth';
import AdminLayout from '../../../components/admin/AdminLayout';
import Button from '../../../components/common/Button';
import {
  Paperclip,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  Archive,
  Link2,
  Upload,
  Loader2,
  FileText,
  X,
  AlertCircle,
  Clock,
  ChevronDown,
  Edit3,
  PlusCircle,
} from 'lucide-react';
import {
  listSupportingDocuments,
  createSupportingDocument,
  updateSupportingDocument,
  archiveSupportingDocument,
  validateSupportingDocument,
  getSupportingDocument,
  linkDocumentToJournalEntry,
  getDocumentUploadUrl,
  uploadFileToSignedUrl,
  getDocumentStatsApi,
  searchJournalEntriesApi,
  exportSupportingDocumentsApi,
  timestampToDate,
  formatAmount,
  DOCUMENT_TYPES,
  STATUS_OPTIONS,
  ECB_CURRENCIES,
  SUPPORTED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_FILES_PER_DOCUMENT,
  type SupportingDocument,
  type SupportingDocumentType,
  type SupportingDocumentStatus,
  type DocumentStatsResponse,
  type JournalEntrySearchResult,
} from '../../../services/finance/supportingDocuments';

// =============================================================================
// HELPERS
// =============================================================================

const STATUS_COLORS: Record<SupportingDocumentStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  validated: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-500',
};

const STATUS_ICONS: Record<SupportingDocumentStatus, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  validated: <CheckCircle className="w-3 h-3" />,
  archived: <Archive className="w-3 h-3" />,
};

function formatDate(ts: { _seconds: number; _nanoseconds: number } | undefined, locale: string): string {
  const d = timestampToDate(ts);
  if (!d) return '-';
  return d.toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(ts: { _seconds: number; _nanoseconds: number } | undefined, locale: string): string {
  const d = timestampToDate(ts);
  if (!d) return '-';
  return d.toLocaleString(locale === 'fr' ? 'fr-FR' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/** Parse EUR amount string to cents */
function eurToCents(eurStr: string): number | undefined {
  if (!eurStr) return undefined;
  const val = parseFloat(eurStr.replace(',', '.'));
  if (isNaN(val) || val < 0) return undefined;
  return Math.round(val * 100);
}

/** Generate fiscal year options (2020 to current+1) */
function getFiscalYears(): number[] {
  const current = new Date().getFullYear();
  const years: number[] = [];
  for (let y = current + 1; y >= 2020; y--) years.push(y);
  return years;
}

// =============================================================================
// COMPONENT
// =============================================================================

const SupportingDocuments: React.FC = () => {
  const intl = useIntl();
  const t = useMemo(
    () => (id: string, values?: Record<string, string | number>) => intl.formatMessage({ id }, values),
    [intl]
  );
  const locale = intl.locale;

  // Detect accountant role via Firebase Auth custom claims
  const [isAccountant, setIsAccountant] = useState(false);
  useEffect(() => {
    const auth = getAuth();
    const currentUser = auth.currentUser;
    if (currentUser) {
      currentUser.getIdTokenResult().then((result) => {
        const claims = result.claims;
        setIsAccountant(claims.accountant === true && claims.role !== 'admin');
      }).catch(() => { /* noop */ });
    }
  }, []);

  // State
  const [documents, setDocuments] = useState<SupportingDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [lastDocId, setLastDocId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Backend stats
  const [stats, setStats] = useState<DocumentStatsResponse>({ total: 0, pending: 0, validated: 0, archived: 0, thisMonth: 0 });

  // Filters
  const [filterType, setFilterType] = useState<SupportingDocumentType | ''>('');
  const [filterStatus, setFilterStatus] = useState<SupportingDocumentStatus | ''>('');
  const [searchText, setSearchText] = useState('');
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [filterSupplier, setFilterSupplier] = useState('');
  const [fiscalYear, setFiscalYear] = useState<number | ''>('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showAddFilesModal, setShowAddFilesModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<SupportingDocument | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Auto-clear success message
  useEffect(() => {
    if (successMsg) {
      const timer = setTimeout(() => setSuccessMsg(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMsg]);

  // =============================================================================
  // DATA LOADING
  // =============================================================================

  const loadStats = useCallback(async () => {
    try {
      const result = await getDocumentStatsApi();
      setStats(result);
    } catch { /* stats are non-critical */ }
  }, []);

  const loadDocuments = useCallback(async (append = false, cursor?: string) => {
    setLoading(true);
    setError(null);
    try {
      const filters: Record<string, unknown> = { limit: 25 };
      if (filterType) filters.type = filterType;
      if (filterStatus) filters.status = filterStatus;
      if (searchText) filters.searchText = searchText;
      if (filterSupplier) filters.supplierName = filterSupplier;

      // Fiscal year shortcut overrides period range
      if (fiscalYear) {
        filters.periodFrom = `${fiscalYear}-01`;
        filters.periodTo = `${fiscalYear}-12`;
      } else {
        if (periodFrom) filters.periodFrom = periodFrom;
        if (periodTo) filters.periodTo = periodTo;
      }

      if (append && cursor) filters.startAfter = cursor;

      const result = await listSupportingDocuments(filters as Parameters<typeof listSupportingDocuments>[0]);
      if (append) {
        setDocuments((prev) => [...prev, ...result.documents]);
      } else {
        setDocuments(result.documents);
      }
      setHasMore(result.hasMore);
      setLastDocId(result.lastDocId);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('supportingDocs.error.load'));
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, searchText, periodFrom, periodTo, filterSupplier, fiscalYear, t]);

  useEffect(() => {
    setLastDocId(undefined);
    loadDocuments();
    loadStats();
  }, [loadDocuments, loadStats]);

  const handleSearch = () => {
    setLastDocId(undefined);
    loadDocuments();
  };

  const handleLoadMore = () => {
    if (lastDocId) loadDocuments(true, lastDocId);
  };

  const handleFiscalYearChange = (val: string) => {
    const yearNum = val ? parseInt(val) : '';
    setFiscalYear(yearNum);
    if (yearNum) {
      setPeriodFrom('');
      setPeriodTo('');
    }
  };

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const refresh = () => { loadDocuments(); loadStats(); };

  const handleValidate = async (docId: string) => {
    if (!window.confirm(t('supportingDocs.confirm.validate'))) return;
    setActionLoading(true);
    try {
      await validateSupportingDocument(docId);
      setSuccessMsg(t('supportingDocs.success.validated'));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async (docId: string) => {
    if (!window.confirm(t('supportingDocs.confirm.archive'))) return;
    setActionLoading(true);
    try {
      await archiveSupportingDocument(docId);
      setSuccessMsg(t('supportingDocs.success.archived'));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetail = async (docId: string) => {
    setActionLoading(true);
    try {
      const doc = await getSupportingDocument(docId);
      setSelectedDoc(doc);
      setShowDetailModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (doc: SupportingDocument) => {
    setSelectedDoc(doc);
    setShowEditModal(true);
  };

  const handleLink = (doc: SupportingDocument) => {
    setSelectedDoc(doc);
    setShowLinkModal(true);
  };

  const handleAddFiles = (doc: SupportingDocument) => {
    setSelectedDoc(doc);
    setShowAddFilesModal(true);
  };

  // =============================================================================
  // CSV EXPORT (all documents via backend)
  // =============================================================================

  const handleExportCsvAll = async () => {
    setExporting(true);
    try {
      const filters: Record<string, unknown> = {};
      if (filterType) filters.type = filterType;
      if (filterStatus) filters.status = filterStatus;
      if (filterSupplier) filters.supplierName = filterSupplier;
      if (fiscalYear) {
        filters.fiscalYear = fiscalYear;
      } else {
        if (periodFrom) filters.periodFrom = periodFrom;
        if (periodTo) filters.periodTo = periodTo;
      }

      const result = await exportSupportingDocumentsApi(filters as Parameters<typeof exportSupportingDocumentsApi>[0]);
      generateCsv(result.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export error');
    } finally {
      setExporting(false);
    }
  };

  const generateCsv = (docs: SupportingDocument[]) => {
    const BOM = '\uFEFF';
    const headers = [
      t('supportingDocs.col.number'), t('supportingDocs.col.type'), t('supportingDocs.col.title'),
      t('supportingDocs.col.supplier'), t('supportingDocs.col.amount'), t('supportingDocs.form.currency'),
      'EUR', t('supportingDocs.audit.exchangeRate'), t('supportingDocs.col.date'), t('supportingDocs.col.period'),
      t('supportingDocs.col.status'), t('supportingDocs.col.linkedEntry'),
      t('supportingDocs.audit.uploadedBy'), t('supportingDocs.audit.createdAt'),
      t('supportingDocs.audit.validatedBy'), t('supportingDocs.audit.validatedAt'),
    ];
    const rows = docs.map((d) => [
      d.documentNumber,
      t(DOCUMENT_TYPES.find((dt) => dt.value === d.type)?.labelKey || d.type),
      d.title,
      d.supplierName || '',
      d.amountCents !== undefined ? (d.amountCents / 100).toFixed(2) : '',
      d.currency || '',
      d.amountEur !== undefined ? d.amountEur.toFixed(2) : '',
      d.exchangeRate !== undefined ? d.exchangeRate.toString() : '',
      formatDate(d.documentDate, locale),
      d.accountingPeriod,
      t(STATUS_OPTIONS.find((s) => s.value === d.status)?.labelKey || d.status),
      d.linkedJournalEntryRef || '',
      d.uploadedBy || '',
      formatDateTime(d.createdAt, locale),
      d.validatedBy || '',
      d.validatedAt ? formatDateTime(d.validatedAt, locale) : '',
    ]);
    const escapeCsv = (val: string) => `"${String(val).replace(/"/g, '""')}"`;
    const csv = BOM + [headers, ...rows].map((r) => r.map((c) => escapeCsv(c)).join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pieces-justificatives-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // =============================================================================
  // RENDER
  // =============================================================================

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Paperclip className="w-6 h-6 text-red-600" />
              {t('supportingDocs.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{t('supportingDocs.subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="small" onClick={handleExportCsvAll} disabled={exporting}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Download className="w-4 h-4 mr-1" />}
              {exporting ? t('supportingDocs.export.exporting') : t('supportingDocs.export.csvAll')}
            </Button>
            {!isAccountant && (
              <Button variant="primary" size="small" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-1" />
                {t('supportingDocs.create')}
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards (backend) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard label={t('supportingDocs.stats.total')} value={stats.total} icon={<FileText className="w-5 h-5 text-blue-600" />} />
          <StatCard label={t('supportingDocs.stats.pending')} value={stats.pending} icon={<Clock className="w-5 h-5 text-yellow-600" />} />
          <StatCard label={t('supportingDocs.stats.validated')} value={stats.validated} icon={<CheckCircle className="w-5 h-5 text-green-600" />} />
          <StatCard label={t('supportingDocs.stats.archived')} value={stats.archived} icon={<Archive className="w-5 h-5 text-gray-500" />} />
          <StatCard label={t('supportingDocs.stats.thisMonth')} value={stats.thisMonth} icon={<Paperclip className="w-5 h-5 text-red-600" />} />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select className="border rounded px-2 py-1.5 text-sm" value={filterType} onChange={(e) => setFilterType(e.target.value as SupportingDocumentType | '')}>
                <option value="">{t('supportingDocs.filters.allTypes')}</option>
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{t(dt.labelKey)}</option>
                ))}
              </select>
            </div>

            <select className="border rounded px-2 py-1.5 text-sm" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as SupportingDocumentStatus | '')}>
              <option value="">{t('supportingDocs.filters.allStatuses')}</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
              ))}
            </select>

            {/* Fiscal year shortcut */}
            <select className="border rounded px-2 py-1.5 text-sm" value={fiscalYear} onChange={(e) => handleFiscalYearChange(e.target.value)}>
              <option value="">{t('supportingDocs.filters.allYears')}</option>
              {getFiscalYears().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {/* Period range (disabled when fiscal year is set) */}
            {!fiscalYear && (
              <>
                <input type="month" className="border rounded px-2 py-1.5 text-sm" value={periodFrom} onChange={(e) => setPeriodFrom(e.target.value)} placeholder={t('supportingDocs.filters.period')} />
                <span className="text-gray-400 text-sm">-</span>
                <input type="month" className="border rounded px-2 py-1.5 text-sm" value={periodTo} onChange={(e) => setPeriodTo(e.target.value)} />
              </>
            )}

            {/* Supplier filter */}
            <input
              type="text"
              className="border rounded px-2 py-1.5 text-sm w-40"
              placeholder={t('supportingDocs.filters.supplierFilter')}
              value={filterSupplier}
              onChange={(e) => setFilterSupplier(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />

            {/* Text search */}
            <div className="flex items-center gap-1 flex-1 min-w-[180px]">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                className="border rounded px-2 py-1.5 text-sm flex-1"
                placeholder={t('supportingDocs.filters.search')}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {(filterType || filterStatus || periodFrom || periodTo || searchText || filterSupplier || fiscalYear) && (
              <button
                className="text-xs text-gray-500 underline"
                onClick={() => { setFilterType(''); setFilterStatus(''); setPeriodFrom(''); setPeriodTo(''); setSearchText(''); setFilterSupplier(''); setFiscalYear(''); }}
              >
                {t('supportingDocs.filters.clear')}
              </button>
            )}
          </div>
        </div>

        {/* Success */}
        {successMsg && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2 text-green-700 text-sm">
            <CheckCircle className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle className="w-4 h-4" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('supportingDocs.col.number')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('supportingDocs.col.type')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('supportingDocs.col.title')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('supportingDocs.col.supplier')}</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">{t('supportingDocs.col.amount')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('supportingDocs.col.date')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('supportingDocs.col.period')}</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">{t('supportingDocs.col.status')}</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">{t('supportingDocs.col.files')}</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">{t('supportingDocs.col.linkedEntry')}</th>
                <th className="px-4 py-3 text-center font-medium text-gray-600">{t('supportingDocs.col.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && documents.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /></td></tr>
              ) : documents.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-medium">{t('supportingDocs.noDocuments')}</p>
                    <p className="text-xs mt-1">{t('supportingDocs.noDocumentsDesc')}</p>
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{doc.documentNumber}</td>
                    <td className="px-4 py-3 text-xs">{t(DOCUMENT_TYPES.find((dt) => dt.value === doc.type)?.labelKey || 'supportingDocs.type.other')}</td>
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{doc.title}</td>
                    <td className="px-4 py-3 text-gray-600">{doc.supplierName || '-'}</td>
                    <td className="px-4 py-3 text-right font-mono">
                      {doc.amountEur !== undefined ? `${doc.amountEur.toFixed(2)} EUR` : formatAmount(doc.amountCents, doc.currency)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(doc.documentDate, locale)}</td>
                    <td className="px-4 py-3 text-gray-600">{doc.accountingPeriod}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status]}`}>
                        {STATUS_ICONS[doc.status]}
                        {t(STATUS_OPTIONS.find((s) => s.value === doc.status)?.labelKey || 'supportingDocs.status.pending')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-gray-600">{doc.files?.length || 0}</td>
                    <td className="px-4 py-3 text-xs font-mono text-blue-600">{doc.linkedJournalEntryRef || '-'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => handleViewDetail(doc.id)} className="p-1 hover:bg-gray-100 rounded" title={t('supportingDocs.action.view')}>
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        {!isAccountant && doc.status === 'pending' && (
                          <>
                            <button onClick={() => handleEdit(doc)} className="p-1 hover:bg-blue-50 rounded" title={t('supportingDocs.action.edit')}>
                              <Edit3 className="w-4 h-4 text-blue-600" />
                            </button>
                            <button onClick={() => handleValidate(doc.id)} className="p-1 hover:bg-green-50 rounded" title={t('supportingDocs.action.validate')} disabled={actionLoading}>
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </button>
                            <button onClick={() => handleLink(doc)} className="p-1 hover:bg-blue-50 rounded" title={t('supportingDocs.action.link')}>
                              <Link2 className="w-4 h-4 text-blue-600" />
                            </button>
                            <button onClick={() => handleAddFiles(doc)} className="p-1 hover:bg-purple-50 rounded" title={t('supportingDocs.action.addFiles')}>
                              <PlusCircle className="w-4 h-4 text-purple-600" />
                            </button>
                            <button onClick={() => handleArchive(doc.id)} className="p-1 hover:bg-red-50 rounded" title={t('supportingDocs.action.archive')} disabled={actionLoading}>
                              <Archive className="w-4 h-4 text-red-500" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Load More */}
        {hasMore && (
          <div className="text-center">
            <Button variant="outline" size="small" onClick={handleLoadMore} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
              {t('supportingDocs.loadMore')}
            </Button>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && (
          <DocumentFormModal
            mode="create"
            t={t}
            locale={locale}
            onClose={() => setShowCreateModal(false)}
            onSaved={() => { setShowCreateModal(false); setSuccessMsg(t('supportingDocs.success.created')); refresh(); }}
          />
        )}

        {/* Edit Modal */}
        {showEditModal && selectedDoc && (
          <DocumentFormModal
            mode="edit"
            doc={selectedDoc}
            t={t}
            locale={locale}
            onClose={() => { setShowEditModal(false); setSelectedDoc(null); }}
            onSaved={() => { setShowEditModal(false); setSelectedDoc(null); setSuccessMsg(t('supportingDocs.success.updated')); refresh(); }}
          />
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedDoc && (
          <DetailModal t={t} locale={locale} doc={selectedDoc} onClose={() => { setShowDetailModal(false); setSelectedDoc(null); }} />
        )}

        {/* Link Modal */}
        {showLinkModal && selectedDoc && (
          <LinkModal
            t={t}
            doc={selectedDoc}
            onClose={() => { setShowLinkModal(false); setSelectedDoc(null); }}
            onLinked={() => { setShowLinkModal(false); setSelectedDoc(null); setSuccessMsg(t('supportingDocs.success.linked')); refresh(); }}
          />
        )}

        {/* Add Files Modal */}
        {showAddFilesModal && selectedDoc && (
          <AddFilesModal
            t={t}
            doc={selectedDoc}
            onClose={() => { setShowAddFilesModal(false); setSelectedDoc(null); }}
            onUploaded={() => { setShowAddFilesModal(false); setSelectedDoc(null); setSuccessMsg(t('supportingDocs.success.filesAdded')); refresh(); }}
          />
        )}
      </div>
    </AdminLayout>
  );
};

// =============================================================================
// STAT CARD
// =============================================================================

const StatCard: React.FC<{ label: string; value: number; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="bg-white rounded-lg border p-4 flex items-center gap-3">
    <div className="p-2 bg-gray-50 rounded-lg">{icon}</div>
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  </div>
);

// =============================================================================
// DOCUMENT FORM MODAL (Create / Edit)
// =============================================================================

const DocumentFormModal: React.FC<{
  mode: 'create' | 'edit';
  doc?: SupportingDocument;
  t: (id: string, values?: Record<string, string | number>) => string;
  locale: string;
  onClose: () => void;
  onSaved: () => void;
}> = ({ mode, doc, t, locale: _locale, onClose, onSaved }) => {
  const isEdit = mode === 'edit' && doc;
  const [form, setForm] = useState({
    type: (isEdit ? doc.type : 'supplier_invoice') as SupportingDocumentType,
    title: isEdit ? doc.title : '',
    description: isEdit ? (doc.description || '') : '',
    supplierName: isEdit ? (doc.supplierName || '') : '',
    amountEur: isEdit && doc.amountCents !== undefined ? (doc.amountCents / 100).toFixed(2) : '',
    currency: isEdit ? (doc.currency || 'EUR') : 'EUR',
    documentDate: isEdit ? (() => {
      const d = timestampToDate(doc.documentDate);
      return d ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    })() : new Date().toISOString().split('T')[0],
    accountingPeriod: isEdit ? doc.accountingPeriod : `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`,
    notes: isEdit ? (doc.notes || '') : '',
  });
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    addFiles(Array.from(e.dataTransfer.files));
  };

  const addFiles = (newFiles: File[]) => {
    const total = files.length + newFiles.length;
    if (total > MAX_FILES_PER_DOCUMENT) {
      setError(t('supportingDocs.error.maxFiles', { max: MAX_FILES_PER_DOCUMENT }));
      return;
    }
    for (const f of newFiles) {
      if (!SUPPORTED_MIME_TYPES.includes(f.type)) { setError(t('supportingDocs.error.unsupportedType', { type: f.type })); return; }
      if (f.size > MAX_FILE_SIZE_BYTES) { setError(t('supportingDocs.error.fileTooLarge', { name: f.name })); return; }
      if (f.size === 0) { setError(t('supportingDocs.error.emptyFile', { name: f.name })); return; }
    }
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) { setError(t('supportingDocs.error.titleRequired')); return; }
    if (mode === 'create' && files.length === 0) { setError(t('supportingDocs.error.fileRequired')); return; }

    setUploading(true);
    setError(null);

    try {
      const amountCents = eurToCents(form.amountEur);

      if (mode === 'create') {
        const result = await createSupportingDocument({
          type: form.type,
          title: form.title,
          description: form.description || undefined,
          supplierName: form.supplierName || undefined,
          amountCents,
          currency: form.currency || undefined,
          documentDate: form.documentDate,
          accountingPeriod: form.accountingPeriod,
          notes: form.notes || undefined,
          files: files.map((f) => ({ fileName: f.name, mimeType: f.type, sizeBytes: f.size })),
        });

        // Upload files
        const failedUploads: string[] = [];
        for (let i = 0; i < files.length; i++) {
          const uploadUrl = result.uploadUrls[i]?.uploadUrl;
          if (uploadUrl) {
            try {
              await uploadFileToSignedUrl(files[i], uploadUrl, (pct) => {
                setUploadProgress(Math.round(((i + pct / 100) / files.length) * 100));
              });
            } catch { failedUploads.push(files[i].name); }
          }
        }
        if (failedUploads.length > 0) {
          setError(t('supportingDocs.error.uploadPartial', { count: failedUploads.length, names: failedUploads.join(', ') }));
        } else {
          onSaved();
        }
      } else if (isEdit) {
        await updateSupportingDocument({
          documentId: doc.id,
          title: form.title,
          description: form.description || undefined,
          supplierName: form.supplierName || undefined,
          amountCents,
          currency: form.currency || undefined,
          documentDate: form.documentDate,
          accountingPeriod: form.accountingPeriod,
          notes: form.notes || undefined,
        });
        onSaved();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t(isEdit ? 'supportingDocs.error.update' : 'supportingDocs.error.create'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{t(isEdit ? 'supportingDocs.modal.editTitle' : 'supportingDocs.modal.createTitle')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.type')}</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as SupportingDocumentType })} disabled={!!isEdit}>
                {DOCUMENT_TYPES.map((dt) => (
                  <option key={dt.value} value={dt.value}>{t(dt.labelKey)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.supplier')}</label>
              <input type="text" className="w-full border rounded px-3 py-2 text-sm" value={form.supplierName} onChange={(e) => setForm({ ...form, supplierName: e.target.value })} maxLength={500} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.title')} *</label>
            <input type="text" required className="w-full border rounded px-3 py-2 text-sm" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={500} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.description')}</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={2000} />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.amount')}</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="w-full border rounded px-3 py-2 text-sm"
                value={form.amountEur}
                onChange={(e) => setForm({ ...form, amountEur: e.target.value })}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-400 mt-0.5">{t('supportingDocs.form.amountHint')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.currency')}</label>
              <select className="w-full border rounded px-3 py-2 text-sm" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                {ECB_CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.date')} *</label>
              <input type="date" required className="w-full border rounded px-3 py-2 text-sm" value={form.documentDate} onChange={(e) => setForm({ ...form, documentDate: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.period')} *</label>
            <input type="month" required className="w-full border rounded px-3 py-2 text-sm" value={form.accountingPeriod} onChange={(e) => setForm({ ...form, accountingPeriod: e.target.value })} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.notes')}</label>
            <textarea className="w-full border rounded px-3 py-2 text-sm" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={5000} />
          </div>

          {/* File Drop Zone (create only) */}
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.files')} *</label>
              <div
                className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-red-400 transition-colors"
                tabIndex={0}
                role="button"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
              >
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">{t('supportingDocs.form.dropzone')}</p>
                <p className="text-xs text-gray-400 mt-1">{t('supportingDocs.form.maxFiles', { max: MAX_FILES_PER_DOCUMENT })}</p>
                <input ref={fileInputRef} type="file" multiple className="hidden" accept={SUPPORTED_MIME_TYPES.join(',')} onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ''; }} />
              </div>
              {files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {files.map((f, i) => (
                    <div key={`${f.name}-${i}`} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-sm">
                      <span className="truncate">{f.name} ({(f.size / 1024).toFixed(0)} KB)</span>
                      <button type="button" onClick={() => removeFile(i)} className="text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" size="small" onClick={onClose} disabled={uploading}>{t('supportingDocs.form.cancel')}</Button>
            <Button type="submit" variant="primary" size="small" disabled={uploading || !form.title || (mode === 'create' && files.length === 0)}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : (isEdit ? <Edit3 className="w-4 h-4 mr-1" /> : <Plus className="w-4 h-4 mr-1" />)}
              {isEdit ? t('supportingDocs.form.save') : t('supportingDocs.form.submit')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// DETAIL MODAL (with audit trail)
// =============================================================================

const DetailModal: React.FC<{
  t: (id: string) => string;
  locale: string;
  doc: SupportingDocument;
  onClose: () => void;
}> = ({ t, locale, doc, onClose }) => (
  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center justify-between p-6 border-b">
        <h2 className="text-lg font-semibold">{t('supportingDocs.modal.detailTitle')}</h2>
        <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
      </div>
      <div className="p-6 space-y-4">
        {/* Document info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">{t('supportingDocs.col.number')}:</span> <span className="font-mono">{doc.documentNumber}</span></div>
          <div><span className="text-gray-500">{t('supportingDocs.col.type')}:</span> {t(DOCUMENT_TYPES.find((dt) => dt.value === doc.type)?.labelKey || '')}</div>
          <div><span className="text-gray-500">{t('supportingDocs.col.title')}:</span> <span className="font-medium">{doc.title}</span></div>
          <div><span className="text-gray-500">{t('supportingDocs.col.supplier')}:</span> {doc.supplierName || '-'}</div>
          <div><span className="text-gray-500">{t('supportingDocs.col.amount')}:</span> {doc.amountEur !== undefined ? `${doc.amountEur.toFixed(2)} EUR` : formatAmount(doc.amountCents, doc.currency)}</div>
          <div><span className="text-gray-500">{t('supportingDocs.col.date')}:</span> {formatDate(doc.documentDate, locale)}</div>
          <div><span className="text-gray-500">{t('supportingDocs.col.period')}:</span> {doc.accountingPeriod}</div>
          <div>
            <span className="text-gray-500">{t('supportingDocs.col.status')}:</span>{' '}
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status]}`}>
              {STATUS_ICONS[doc.status]}
              {t(STATUS_OPTIONS.find((s) => s.value === doc.status)?.labelKey || '')}
            </span>
          </div>
          {/* Exchange rate */}
          {doc.exchangeRate && doc.currency !== 'EUR' && (
            <>
              <div><span className="text-gray-500">{t('supportingDocs.audit.exchangeRate')}:</span> {doc.exchangeRate}</div>
              <div><span className="text-gray-500">{t('supportingDocs.audit.exchangeRateDate')}:</span> {doc.exchangeRateDate || '-'}</div>
            </>
          )}
          {doc.linkedJournalEntryRef && (
            <div className="col-span-2"><span className="text-gray-500">{t('supportingDocs.col.linkedEntry')}:</span> <span className="font-mono text-blue-600">{doc.linkedJournalEntryRef}</span></div>
          )}
          {doc.description && (
            <div className="col-span-2"><span className="text-gray-500">{t('supportingDocs.form.description')}:</span> {doc.description}</div>
          )}
          {doc.notes && (
            <div className="col-span-2"><span className="text-gray-500">{t('supportingDocs.form.notes')}:</span> {doc.notes}</div>
          )}
        </div>

        {/* Audit Trail */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t('supportingDocs.audit.title')}</h3>
          <div className="grid grid-cols-2 gap-3 text-sm text-gray-600">
            <div><span className="text-gray-400">{t('supportingDocs.audit.uploadedBy')}:</span> <span className="font-mono text-xs">{doc.uploadedBy}</span></div>
            <div><span className="text-gray-400">{t('supportingDocs.audit.createdAt')}:</span> {formatDateTime(doc.createdAt, locale)}</div>
            <div><span className="text-gray-400">{t('supportingDocs.audit.updatedAt')}:</span> {formatDateTime(doc.updatedAt, locale)}</div>
            {doc.validatedBy && (
              <>
                <div><span className="text-gray-400">{t('supportingDocs.audit.validatedBy')}:</span> <span className="font-mono text-xs">{doc.validatedBy}</span></div>
                <div><span className="text-gray-400">{t('supportingDocs.audit.validatedAt')}:</span> {formatDateTime(doc.validatedAt, locale)}</div>
              </>
            )}
          </div>
        </div>

        {/* Files */}
        <div className="border-t pt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">{t('supportingDocs.col.files')} ({doc.files?.length || 0})</h3>
          <div className="space-y-1">
            {doc.readUrls?.map((f, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                <span className="truncate">{f.fileName}</span>
                {f.readUrl ? (
                  <a href={f.readUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    {t('supportingDocs.action.download')}
                  </a>
                ) : (
                  <span className="text-gray-400 text-xs italic">{t('supportingDocs.file.unavailable')}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// =============================================================================
// LINK MODAL (with journal entry autocomplete)
// =============================================================================

const LinkModal: React.FC<{
  t: (id: string) => string;
  doc: SupportingDocument;
  onClose: () => void;
  onLinked: () => void;
}> = ({ t, doc, onClose, onLinked }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [entryId, setEntryId] = useState('');
  const [selectedRef, setSelectedRef] = useState('');
  const [results, setResults] = useState<JournalEntrySearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => { if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current); };
  }, []);

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (query.length < 2) { setResults([]); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchJournalEntriesApi(query);
        setResults(res.entries);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 300);
  };

  const selectEntry = (entry: JournalEntrySearchResult) => {
    setEntryId(entry.id);
    setSelectedRef(entry.reference);
    setSearchQuery(entry.reference);
    setResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await linkDocumentToJournalEntry(doc.id, entryId.trim());
      onLinked();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{t('supportingDocs.modal.linkTitle')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">{doc.documentNumber} - {doc.title}</p>
          {error && <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm">{error}</div>}

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('supportingDocs.form.journalEntryId')}</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 text-sm"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t('supportingDocs.form.searchEntry')}
            />
            {searching && <Loader2 className="w-4 h-4 animate-spin absolute right-3 top-9 text-gray-400" />}

            {/* Autocomplete dropdown */}
            {results.length > 0 && (
              <div className="absolute z-10 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {results.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-b-0"
                    onClick={() => selectEntry(entry)}
                  >
                    <span className="font-mono text-blue-600">{entry.reference}</span>
                    <span className="text-gray-500 ml-2">{entry.description?.substring(0, 50)}</span>
                    <span className="text-gray-400 ml-1 text-xs">{entry.period}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedRef && (
              <p className="text-xs text-green-600 mt-1">ID: {entryId}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="small" onClick={onClose}>{t('supportingDocs.form.cancel')}</Button>
            <Button type="submit" variant="primary" size="small" disabled={loading || !entryId.trim()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Link2 className="w-4 h-4 mr-1" />}
              {t('supportingDocs.action.link')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =============================================================================
// ADD FILES MODAL
// =============================================================================

const AddFilesModal: React.FC<{
  t: (id: string, values?: Record<string, string | number>) => string;
  doc: SupportingDocument;
  onClose: () => void;
  onUploaded: () => void;
}> = ({ t, doc, onClose, onUploaded }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentFileCount = doc.files?.length || 0;
  const remainingSlots = MAX_FILES_PER_DOCUMENT - currentFileCount;

  const addFiles = (newFiles: File[]) => {
    if (files.length + newFiles.length > remainingSlots) {
      setError(t('supportingDocs.file.remainingSlots', { count: remainingSlots }));
      return;
    }
    for (const f of newFiles) {
      if (!SUPPORTED_MIME_TYPES.includes(f.type)) { setError(t('supportingDocs.error.unsupportedType', { type: f.type })); return; }
      if (f.size > MAX_FILE_SIZE_BYTES) { setError(t('supportingDocs.error.fileTooLarge', { name: f.name })); return; }
      if (f.size === 0) { setError(t('supportingDocs.error.emptyFile', { name: f.name })); return; }
    }
    setFiles((prev) => [...prev, ...newFiles]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const result = await getDocumentUploadUrl(doc.id, files.map((f) => ({ fileName: f.name, mimeType: f.type, sizeBytes: f.size })));
      const failedUploads: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const uploadUrl = result.uploadUrls[i]?.uploadUrl;
        if (uploadUrl) {
          try {
            await uploadFileToSignedUrl(files[i], uploadUrl, (pct) => {
              setUploadProgress(Math.round(((i + pct / 100) / files.length) * 100));
            });
          } catch { failedUploads.push(files[i].name); }
        }
      }
      if (failedUploads.length > 0) {
        setError(t('supportingDocs.error.uploadPartial', { count: failedUploads.length, names: failedUploads.join(', ') }));
      } else {
        onUploaded();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('supportingDocs.error.upload'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">{t('supportingDocs.modal.addFilesTitle')}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <p className="text-sm text-gray-600">{doc.documentNumber} - {doc.title} ({t('supportingDocs.file.currentCount', { current: currentFileCount, max: MAX_FILES_PER_DOCUMENT })})</p>
          {error && <div className="bg-red-50 border border-red-200 rounded p-2 text-red-700 text-sm">{error}</div>}

          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-red-400 transition-colors"
            tabIndex={0}
            role="button"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(Array.from(e.dataTransfer.files)); }}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">{t('supportingDocs.form.dropzone')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('supportingDocs.file.remainingSlots', { count: remainingSlots })}</p>
            <input ref={fileInputRef} type="file" multiple className="hidden" accept={SUPPORTED_MIME_TYPES.join(',')} onChange={(e) => { if (e.target.files) addFiles(Array.from(e.target.files)); e.target.value = ''; }} />
          </div>

          {files.length > 0 && (
            <div className="space-y-1">
              {files.map((f, i) => (
                <div key={`${f.name}-${i}`} className="flex items-center justify-between bg-gray-50 rounded px-3 py-1.5 text-sm">
                  <span className="truncate">{f.name} ({(f.size / 1024).toFixed(0)} KB)</span>
                  <button type="button" onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-500"><X className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="small" onClick={onClose} disabled={uploading}>{t('supportingDocs.form.cancel')}</Button>
            <Button type="submit" variant="primary" size="small" disabled={uploading || files.length === 0}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Upload className="w-4 h-4 mr-1" />}
              {t('supportingDocs.action.addFiles')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupportingDocuments;

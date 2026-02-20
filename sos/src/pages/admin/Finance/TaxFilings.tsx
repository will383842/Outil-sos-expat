/**
 * Tax Filings Admin Page
 *
 * Complete admin interface for managing tax declarations:
 * - VAT Estonia (Monthly)
 * - OSS EU (Quarterly)
 * - DES (Monthly)
 * - UK VAT (Quarterly)
 * - CH VAT (Quarterly)
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useIntl } from 'react-intl';
import AdminLayout from '../../../components/admin/AdminLayout';
import Modal from '../../../components/common/Modal';
import ErrorBoundary from '../../../components/common/ErrorBoundary';
import {
  FileText,
  Calendar,
  AlertTriangle,
  Download,
  RefreshCw,
  Plus,
  Eye,
  Edit2,
  Trash2,
  Check,
  X,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  FileCode,
  Loader2,
  Building2,
  Globe,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import {
  TaxFiling,
  TaxFilingType,
  TaxFilingStatus,
  TaxFilingFilters,
  FILING_TYPE_CONFIGS,
  TAX_FILING_STATUS_LABELS,
  TAX_FILING_TYPE_LABELS,
  EU_MEMBER_STATES,
} from '../../../types/taxFiling';
import {
  fetchTaxFilings,
  fetchTaxFilingById,
  fetchTaxFilingKPIs,
  fetchTaxCalendarEvents,
  generateTaxFiling,
  generateAllTaxFilings,
  updateFilingStatus,
  deleteFilingDraft,
  exportFilingToFormat,
  exportFilingAllFormats,
  getCurrentPeriod,
  formatCurrency,
  formatDate,
  getStatusColor,
  getTypeColor,
  isFilingOverdue,
  getDaysUntilDue,
  subscribeTaxFilings,
} from '../../../services/taxFilingService';
import { Timestamp } from 'firebase/firestore';

// ============================================================================
// TYPES
// ============================================================================

interface TaxFilingWithId extends TaxFiling {
  id: string;
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  events: Array<{
    id: string;
    type: TaxFilingType;
    period: string;
    status: TaxFilingStatus;
    amount?: number;
    isOverdue: boolean;
  }>;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TaxFilings() {
  const intl = useIntl();

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filings, setFilings] = useState<TaxFilingWithId[]>([]);
  const [kpis, setKpis] = useState<{
    totalFilings: number;
    pendingFilings: number;
    overdueFilings: number;
    totalTaxDue: number;
    totalTaxPaid: number;
    upcomingDeadlines: Array<{
      type: TaxFilingType;
      period: string;
      dueDate: Date;
      daysUntilDue: number;
    }>;
  } | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'list' | 'calendar' | 'generate'>('list');
  const [filters, setFilters] = useState<TaxFilingFilters>({
    type: 'all',
    status: 'all',
    year: new Date().getFullYear(),
  });
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  // Modals
  const [selectedFiling, setSelectedFiling] = useState<TaxFilingWithId | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Generation state
  const [generateType, setGenerateType] = useState<TaxFilingType>('VAT_EE');
  const [generatePeriod, setGeneratePeriod] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Status update state
  const [newStatus, setNewStatus] = useState<TaxFilingStatus>('PENDING_REVIEW');
  const [statusReason, setStatusReason] = useState('');
  const [confirmationNumber, setConfirmationNumber] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [filingsData, kpisData] = await Promise.all([
        fetchTaxFilings(filters),
        fetchTaxFilingKPIs(),
      ]);

      setFilings(filingsData);
      setKpis(kpisData);
    } catch (err) {
      console.error('Error loading tax filings:', err);
      setError(intl.formatMessage({ id: 'admin.taxFilings.errorLoading' }));
    } finally {
      setIsLoading(false);
    }
  }, [intl, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Set default generate period based on type
  useEffect(() => {
    setGeneratePeriod(getCurrentPeriod(generateType));
  }, [generateType]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredFilings = useMemo(() => {
    let result = [...filings];

    if (filters.type && filters.type !== 'all') {
      result = result.filter(f => f.type === filters.type);
    }

    if (filters.status && filters.status !== 'all') {
      result = result.filter(f => f.status === filters.status);
    }

    return result;
  }, [filings, filters]);

  const calendarDays = useMemo((): CalendarDay[] => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];

    // Add days from previous month
    const startPadding = firstDay.getDay();
    for (let i = startPadding - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      days.push({
        date,
        isCurrentMonth: false,
        events: getEventsForDate(date),
      });
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(year, month, i);
      days.push({
        date,
        isCurrentMonth: true,
        events: getEventsForDate(date),
      });
    }

    // Add days from next month
    const endPadding = 42 - days.length;
    for (let i = 1; i <= endPadding; i++) {
      const date = new Date(year, month + 1, i);
      days.push({
        date,
        isCurrentMonth: false,
        events: getEventsForDate(date),
      });
    }

    return days;
  }, [calendarMonth, filings]);

  function getEventsForDate(date: Date): CalendarDay['events'] {
    const dateStr = date.toDateString();
    return filings
      .filter(f => {
        const dueDate = f.dueDate instanceof Timestamp ? f.dueDate.toDate() : new Date(f.dueDate as unknown as string);
        return dueDate.toDateString() === dateStr;
      })
      .map(f => ({
        id: f.id,
        type: f.type,
        period: f.period,
        status: f.status,
        amount: f.summary?.netTaxPayable,
        isOverdue: isFilingOverdue(f),
      }));
  }

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleGenerateFiling = async () => {
    if (!generateType || !generatePeriod) return;

    try {
      setIsGenerating(true);
      const result = await generateTaxFiling(generateType, generatePeriod, false);

      if (result.success) {
        setShowGenerateModal(false);
        loadData();
      } else {
        toast.error(result.error || 'Generation failed');
      }
    } catch (err) {
      console.error('Error generating filing:', err);
      toast.error('Error generating filing');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedFiling) return;

    try {
      setIsUpdatingStatus(true);
      const result = await updateFilingStatus(selectedFiling.id, newStatus, {
        reason: statusReason,
        confirmationNumber: confirmationNumber || undefined,
      });

      if (result.success) {
        setShowStatusModal(false);
        setSelectedFiling(null);
        loadData();
      } else {
        toast.error(result.error || 'Update failed');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Error updating status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteFiling = async () => {
    if (!selectedFiling) return;

    try {
      const result = await deleteFilingDraft(selectedFiling.id);

      if (result.success) {
        setShowDeleteModal(false);
        setSelectedFiling(null);
        loadData();
      } else {
        toast.error(result.error || 'Delete failed');
      }
    } catch (err) {
      console.error('Error deleting filing:', err);
      toast.error('Error deleting filing');
    }
  };

  const handleExport = async (filingId: string, format: 'pdf' | 'csv' | 'xml') => {
    try {
      setIsExporting(true);
      const result = await exportFilingToFormat(filingId, format);

      if (result.success && result.url) {
        window.open(result.url, '_blank');
      } else {
        toast.error(result.error || 'Export failed');
      }
    } catch (err) {
      console.error('Error exporting:', err);
      toast.error('Error exporting filing');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportAll = async (filingId: string) => {
    try {
      setIsExporting(true);
      const result = await exportFilingAllFormats(filingId);

      if (result.success && result.files) {
        // Open all available exports
        if (result.files.pdf) window.open(result.files.pdf, '_blank');
        if (result.files.csv) window.open(result.files.csv, '_blank');
        if (result.files.xml) window.open(result.files.xml, '_blank');
      } else {
        toast.error(result.error || 'Export failed');
      }
    } catch (err) {
      console.error('Error exporting all:', err);
      toast.error('Error exporting filing');
    } finally {
      setIsExporting(false);
    }
  };

  const openStatusModal = (filing: TaxFilingWithId) => {
    setSelectedFiling(filing);
    setNewStatus(
      filing.status === 'DRAFT' ? 'PENDING_REVIEW' :
      filing.status === 'PENDING_REVIEW' ? 'SUBMITTED' :
      filing.status === 'SUBMITTED' ? 'ACCEPTED' :
      filing.status === 'ACCEPTED' ? 'PAID' : 'PENDING_REVIEW'
    );
    setStatusReason('');
    setConfirmationNumber('');
    setShowStatusModal(true);
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatTimestamp = (ts: Timestamp | undefined): string => {
    if (!ts) return '-';
    const date = ts.toDate();
    return intl.formatDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderStatusBadge = (status: TaxFilingStatus) => {
    const colorClass = getStatusColor(status);
    const label = TAX_FILING_STATUS_LABELS[status]?.fr || status;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {status === 'PAID' && <CheckCircle className="w-3 h-3 mr-1" />}
        {status === 'REJECTED' && <XCircle className="w-3 h-3 mr-1" />}
        {status === 'SUBMITTED' && <Send className="w-3 h-3 mr-1" />}
        {label}
      </span>
    );
  };

  const renderTypeBadge = (type: TaxFilingType) => {
    const colorClass = getTypeColor(type);
    const label = TAX_FILING_TYPE_LABELS[type]?.fr || type;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
        {label}
      </span>
    );
  };

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center space-y-4">
            <FileText className="h-8 w-8 animate-spin text-red-600" />
            <p className="text-gray-600">{intl.formatMessage({ id: 'admin.taxFilings.loading' })}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <ErrorBoundary>
      <AdminLayout>
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <FileText className="w-8 h-8 mr-3 text-red-600" />
                {intl.formatMessage({ id: 'admin.taxFilings.title' })}
              </h1>
              <p className="text-gray-600 mt-2">
                {intl.formatMessage({ id: 'admin.taxFilings.subtitle' })}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-4 md:mt-0">
              <button
                onClick={() => loadData()}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw className="w-4 h-4" />
                {intl.formatMessage({ id: 'admin.taxFilings.refresh' })}
              </button>
              <button
                onClick={() => setShowGenerateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Plus className="w-4 h-4" />
                {intl.formatMessage({ id: 'admin.taxFilings.generate' })}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* KPI Cards */}
          {kpis && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {intl.formatMessage({ id: 'admin.taxFilings.totalFilings' })}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">{kpis.totalFilings}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {intl.formatMessage({ id: 'admin.taxFilings.pending' })}
                    </p>
                    <p className="text-2xl font-bold text-yellow-600 mt-1">{kpis.pendingFilings}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {intl.formatMessage({ id: 'admin.taxFilings.overdue' })}
                    </p>
                    <p className={`text-2xl font-bold mt-1 ${kpis.overdueFilings > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {kpis.overdueFilings}
                    </p>
                  </div>
                  <AlertTriangle className={`w-8 h-8 ${kpis.overdueFilings > 0 ? 'text-red-500' : 'text-green-500'}`} />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {intl.formatMessage({ id: 'admin.taxFilings.totalDue' })}
                    </p>
                    <p className="text-2xl font-bold text-purple-600 mt-1">
                      {formatCurrency(kpis.totalTaxDue)}
                    </p>
                  </div>
                  <CreditCard className="w-8 h-8 text-purple-500" />
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {intl.formatMessage({ id: 'admin.taxFilings.totalPaid' })}
                    </p>
                    <p className="text-2xl font-bold text-green-600 mt-1">
                      {formatCurrency(kpis.totalTaxPaid)}
                    </p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-500" />
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Deadlines Alert */}
          {kpis && kpis.upcomingDeadlines.length > 0 && (
            <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-orange-800">
                    {intl.formatMessage({ id: 'admin.taxFilings.upcomingDeadlines' })}
                  </h3>
                  <ul className="mt-2 space-y-1">
                    {kpis.upcomingDeadlines.slice(0, 3).map((deadline, idx) => (
                      <li key={idx} className="text-sm text-orange-700 flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        <span className="font-medium">{TAX_FILING_TYPE_LABELS[deadline.type]?.fr}</span>
                        <span>- {deadline.period}</span>
                        <span className="text-orange-600">
                          ({deadline.daysUntilDue} {intl.formatMessage({ id: 'admin.taxFilings.daysLeft' })})
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="flex space-x-8">
              {(['list', 'calendar'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab
                      ? 'border-red-500 text-red-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab === 'list' && <FileText className="w-4 h-4 inline mr-2" />}
                  {tab === 'calendar' && <Calendar className="w-4 h-4 inline mr-2" />}
                  {intl.formatMessage({ id: `admin.taxFilings.tab.${tab}` })}
                </button>
              ))}
            </nav>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600">{intl.formatMessage({ id: 'admin.taxFilings.filters' })}:</span>
              </div>
              <select
                value={filters.type || 'all'}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as TaxFilingType | 'all' })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">{intl.formatMessage({ id: 'admin.taxFilings.allTypes' })}</option>
                <option value="VAT_EE">TVA Estonie</option>
                <option value="OSS">OSS UE</option>
                <option value="DES">DES</option>
                <option value="UK_VAT">TVA UK</option>
                <option value="CH_VAT">TVA Suisse</option>
              </select>
              <select
                value={filters.status || 'all'}
                onChange={(e) => setFilters({ ...filters, status: e.target.value as TaxFilingStatus | 'all' })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">{intl.formatMessage({ id: 'admin.taxFilings.allStatuses' })}</option>
                <option value="DRAFT">Brouillon</option>
                <option value="PENDING_REVIEW">En revision</option>
                <option value="SUBMITTED">Soumis</option>
                <option value="ACCEPTED">Accepte</option>
                <option value="REJECTED">Rejete</option>
                <option value="PAID">Paye</option>
              </select>
              <select
                value={filters.year || new Date().getFullYear()}
                onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {[2024, 2025, 2026].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
          </div>

          {/* List View */}
          {activeTab === 'list' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.taxFilings.type' })}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.taxFilings.period' })}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.taxFilings.dueDate' })}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.taxFilings.status' })}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.taxFilings.taxDue' })}
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'admin.taxFilings.actions' })}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredFilings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          {intl.formatMessage({ id: 'admin.taxFilings.noFilings' })}
                        </td>
                      </tr>
                    ) : (
                      filteredFilings.map((filing) => {
                        const overdue = isFilingOverdue(filing);
                        const daysUntil = getDaysUntilDue(filing);

                        return (
                          <tr key={filing.id} className={`hover:bg-gray-50 ${overdue ? 'bg-red-50' : ''}`}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderTypeBadge(filing.type)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-medium text-gray-900">{filing.period}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{formatTimestamp(filing.dueDate)}</div>
                              {overdue && (
                                <div className="text-xs text-red-600 flex items-center mt-1">
                                  <AlertTriangle className="w-3 h-3 mr-1" />
                                  En retard
                                </div>
                              )}
                              {!overdue && daysUntil <= 7 && daysUntil >= 0 && (
                                <div className="text-xs text-orange-600 mt-1">
                                  {daysUntil} jour(s) restant(s)
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {renderStatusBadge(filing.status)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm font-semibold text-purple-600">
                                {formatCurrency(filing.summary?.netTaxPayable || 0)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => {
                                    setSelectedFiling(filing);
                                    setShowDetailModal(true);
                                  }}
                                  className="text-blue-600 hover:text-blue-800 p-1"
                                  title={intl.formatMessage({ id: 'admin.taxFilings.view' })}
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                {['DRAFT', 'PENDING_REVIEW'].includes(filing.status) && (
                                  <button
                                    onClick={() => openStatusModal(filing)}
                                    className="text-green-600 hover:text-green-800 p-1"
                                    title={intl.formatMessage({ id: 'admin.taxFilings.updateStatus' })}
                                  >
                                    <Edit2 className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleExport(filing.id, 'csv')}
                                  className="text-gray-600 hover:text-gray-800 p-1"
                                  title="Export CSV"
                                  disabled={isExporting}
                                >
                                  <FileSpreadsheet className="w-4 h-4" />
                                </button>
                                {filing.status === 'DRAFT' && (
                                  <button
                                    onClick={() => {
                                      setSelectedFiling(filing);
                                      setShowDeleteModal(true);
                                    }}
                                    className="text-red-600 hover:text-red-800 p-1"
                                    title={intl.formatMessage({ id: 'admin.taxFilings.delete' })}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Calendar View */}
          {activeTab === 'calendar' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                  {intl.formatMessage({ id: 'admin.taxFilings.calendar' })}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1))}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-sm font-medium min-w-[140px] text-center">
                    {intl.formatDate(calendarMonth, { month: 'long', year: 'numeric' })}
                  </span>
                  <button
                    onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1))}
                    className="p-2 hover:bg-gray-100 rounded"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                {/* Days of week header */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'].map((day) => (
                    <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
                      {day}
                    </div>
                  ))}
                </div>
                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarDays.map((day, index) => {
                    const isToday = day.date.toDateString() === new Date().toDateString();
                    const hasEvents = day.events.length > 0;
                    const hasOverdue = day.events.some(e => e.isOverdue);

                    return (
                      <div
                        key={index}
                        className={`min-h-[80px] p-2 border rounded ${
                          day.isCurrentMonth ? 'bg-white' : 'bg-gray-50'
                        } ${isToday ? 'ring-2 ring-red-500' : ''}`}
                      >
                        <div className={`text-sm ${day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}`}>
                          {day.date.getDate()}
                        </div>
                        {hasEvents && (
                          <div className="mt-1 space-y-1">
                            {day.events.map((event) => (
                              <button
                                key={event.id}
                                onClick={() => {
                                  const filing = filings.find(f => f.id === event.id);
                                  if (filing) {
                                    setSelectedFiling(filing);
                                    setShowDetailModal(true);
                                  }
                                }}
                                className={`w-full text-left text-xs px-1 py-0.5 rounded truncate ${
                                  event.isOverdue
                                    ? 'bg-red-100 text-red-800'
                                    : event.status === 'PAID'
                                    ? 'bg-green-100 text-green-800'
                                    : event.status === 'SUBMITTED' || event.status === 'ACCEPTED'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-orange-100 text-orange-800'
                                }`}
                              >
                                {TAX_FILING_TYPE_LABELS[event.type]?.fr?.substring(0, 6)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Legend */}
              <div className="px-6 py-3 border-t border-gray-200 flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-orange-100 rounded" />
                  <span>En attente</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-100 rounded" />
                  <span>Soumis</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-100 rounded" />
                  <span>Paye</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-100 rounded" />
                  <span>En retard</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Generate Modal */}
        {showGenerateModal && (
          <Modal
            isOpen={true}
            onClose={() => setShowGenerateModal(false)}
            title={intl.formatMessage({ id: 'admin.taxFilings.generateTitle' })}
            size="medium"
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {intl.formatMessage({ id: 'admin.taxFilings.filingType' })}
                </label>
                <select
                  value={generateType}
                  onChange={(e) => setGenerateType(e.target.value as TaxFilingType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="VAT_EE">TVA Estonie (Mensuelle)</option>
                  <option value="OSS">OSS UE (Trimestrielle)</option>
                  <option value="DES">DES (Mensuelle)</option>
                  <option value="UK_VAT">TVA UK (Trimestrielle)</option>
                  <option value="CH_VAT">TVA Suisse (Trimestrielle)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {intl.formatMessage({ id: 'admin.taxFilings.periodLabel' })}
                </label>
                <input
                  type="text"
                  value={generatePeriod}
                  onChange={(e) => setGeneratePeriod(e.target.value)}
                  placeholder={FILING_TYPE_CONFIGS[generateType].frequency === 'MONTHLY' ? '2024-01' : '2024-Q1'}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {FILING_TYPE_CONFIGS[generateType].frequency === 'MONTHLY'
                    ? 'Format: AAAA-MM (ex: 2024-01)'
                    : 'Format: AAAA-Q# (ex: 2024-Q1)'}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  {FILING_TYPE_CONFIGS[generateType].nameFr}
                </h4>
                <p className="text-sm text-gray-600">
                  {FILING_TYPE_CONFIGS[generateType].descriptionFr}
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  {intl.formatMessage({ id: 'admin.taxFilings.cancel' })}
                </button>
                <button
                  onClick={handleGenerateFiling}
                  disabled={isGenerating || !generatePeriod}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {intl.formatMessage({ id: 'admin.taxFilings.generateBtn' })}
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Detail Modal */}
        {showDetailModal && selectedFiling && (
          <Modal
            isOpen={true}
            onClose={() => {
              setShowDetailModal(false);
              setSelectedFiling(null);
            }}
            title={`${TAX_FILING_TYPE_LABELS[selectedFiling.type]?.fr} - ${selectedFiling.period}`}
            size="large"
          >
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Type</p>
                  <p className="font-medium">{renderTypeBadge(selectedFiling.type)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Statut</p>
                  <p className="font-medium">{renderStatusBadge(selectedFiling.status)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">Echeance</p>
                  <p className="font-medium">{formatTimestamp(selectedFiling.dueDate)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500">TVA a payer</p>
                  <p className="font-medium text-purple-600">
                    {formatCurrency(selectedFiling.summary?.netTaxPayable || 0)}
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-4">Resume</h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Ventes totales</p>
                    <p className="font-semibold">{formatCurrency(selectedFiling.summary?.totalSales || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Base taxable</p>
                    <p className="font-semibold">{formatCurrency(selectedFiling.summary?.totalTaxableBase || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">TVA due</p>
                    <p className="font-semibold">{formatCurrency(selectedFiling.summary?.totalTaxDue || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">TVA deductible</p>
                    <p className="font-semibold">{formatCurrency(selectedFiling.summary?.totalTaxDeductible || 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">TVA nette</p>
                    <p className="font-semibold text-purple-600">{formatCurrency(selectedFiling.summary?.netTaxPayable || 0)}</p>
                  </div>
                </div>
              </div>

              {/* Lines detail */}
              {selectedFiling.lines && selectedFiling.lines.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">Detail par pays</h4>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Pays</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Taux</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Base</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">TVA</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Trans.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedFiling.lines.map((line, idx) => (
                          <tr key={idx} className={line.taxableBase === 0 ? 'opacity-50' : ''}>
                            <td className="px-4 py-2 text-sm">
                              <span className="font-medium">{line.countryCode}</span>
                              <span className="text-gray-500 ml-2">{line.countryName}</span>
                            </td>
                            <td className="px-4 py-2 text-sm">{line.taxRate}%</td>
                            <td className="px-4 py-2 text-sm text-right">{formatCurrency(line.taxableBase)}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium">{formatCurrency(line.taxAmount)}</td>
                            <td className="px-4 py-2 text-sm text-right text-gray-500">{line.transactionCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport(selectedFiling.id, 'pdf')}
                    disabled={isExporting}
                    className="px-3 py-2 text-sm bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center gap-1"
                  >
                    <Download className="w-4 h-4" />
                    PDF
                  </button>
                  <button
                    onClick={() => handleExport(selectedFiling.id, 'csv')}
                    disabled={isExporting}
                    className="px-3 py-2 text-sm bg-green-100 text-green-800 rounded hover:bg-green-200 flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV
                  </button>
                  {['OSS', 'DES', 'VAT_EE'].includes(selectedFiling.type) && (
                    <button
                      onClick={() => handleExport(selectedFiling.id, 'xml')}
                      disabled={isExporting}
                      className="px-3 py-2 text-sm bg-purple-100 text-purple-800 rounded hover:bg-purple-200 flex items-center gap-1"
                    >
                      <FileCode className="w-4 h-4" />
                      XML
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedFiling(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Fermer
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Status Update Modal */}
        {showStatusModal && selectedFiling && (
          <Modal
            isOpen={true}
            onClose={() => {
              setShowStatusModal(false);
              setSelectedFiling(null);
            }}
            title={intl.formatMessage({ id: 'admin.taxFilings.updateStatusTitle' })}
            size="medium"
          >
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Declaration</p>
                <p className="font-medium">{TAX_FILING_TYPE_LABELS[selectedFiling.type]?.fr} - {selectedFiling.period}</p>
                <p className="text-sm text-gray-500 mt-2">Statut actuel</p>
                <p className="font-medium">{renderStatusBadge(selectedFiling.status)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau statut
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as TaxFilingStatus)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="PENDING_REVIEW">En revision</option>
                  <option value="SUBMITTED">Soumis</option>
                  <option value="ACCEPTED">Accepte</option>
                  <option value="REJECTED">Rejete</option>
                  <option value="PAID">Paye</option>
                </select>
              </div>

              {newStatus === 'SUBMITTED' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numero de confirmation
                  </label>
                  <input
                    type="text"
                    value={confirmationNumber}
                    onChange={(e) => setConfirmationNumber(e.target.value)}
                    placeholder="Ex: OSS-2024-12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Raison / Notes
                </label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Optionnel..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowStatusModal(false);
                    setSelectedFiling(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={isUpdatingStatus}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isUpdatingStatus && <Loader2 className="w-4 h-4 animate-spin" />}
                  Mettre a jour
                </button>
              </div>
            </div>
          </Modal>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedFiling && (
          <Modal
            isOpen={true}
            onClose={() => {
              setShowDeleteModal(false);
              setSelectedFiling(null);
            }}
            title={intl.formatMessage({ id: 'admin.taxFilings.deleteTitle' })}
            size="small"
          >
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="text-gray-600">
                    Etes-vous sur de vouloir supprimer ce brouillon ?
                  </p>
                  <p className="font-medium mt-2">
                    {TAX_FILING_TYPE_LABELS[selectedFiling.type]?.fr} - {selectedFiling.period}
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedFiling(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteFiling}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AdminLayout>
    </ErrorBoundary>
  );
}

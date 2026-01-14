import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  Timestamp,
  QueryConstraint,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/useAuth';
import AdminLayout from '@/components/admin/AdminLayout';
import {
  Download,
  FileText,
  Calendar,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  FileSpreadsheet,
  Eye,
  Plus,
  Settings,
  BarChart3,
  CreditCard,
  Users,
  Receipt,
  Globe,
  Wallet,
  ChevronDown,
  ChevronUp,
  Loader2,
} from 'lucide-react';
import { toCsv, toExcel, downloadBlob } from '@/services/finance/reports';
import type { Currency } from '@/types/finance';

// ============================================================================
// TYPES
// ============================================================================

type DataType = 'transactions' | 'subscriptions' | 'refunds' | 'invoices';
type ExportFormat = 'csv' | 'excel' | 'pdf';
type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';
type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  dataType: DataType;
  columns: string[];
  defaultFilters?: Record<string, unknown>;
}

interface ExportRecord {
  id: string;
  reportType: string;
  format: ExportFormat;
  status: ExportStatus;
  createdAt: Date;
  completedAt?: Date;
  size?: number;
  downloadUrl?: string;
  createdBy: string;
  createdByEmail?: string;
  expiresAt: Date;
  error?: string;
}

interface ScheduledReport {
  id: string;
  name: string;
  templateId: string;
  frequency: ScheduleFrequency;
  nextRunAt: Date;
  emails: string[];
  enabled: boolean;
  lastRunAt?: Date;
  lastStatus?: ExportStatus;
  createdBy: string;
  filters?: Record<string, unknown>;
}

interface CustomExportConfig {
  dataType: DataType;
  dateFrom: string;
  dateTo: string;
  filters: {
    status: string[];
    country: string[];
    currency: Currency[];
    method: string[];
  };
  columns: string[];
  format: ExportFormat;
}

interface PreviewRow {
  [key: string]: unknown;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DATA_TYPE_OPTIONS: { value: DataType; label: string; icon: React.ReactNode }[] = [
  { value: 'transactions', label: 'Transactions', icon: <CreditCard className="w-4 h-4" /> },
  { value: 'subscriptions', label: 'Subscriptions', icon: <Users className="w-4 h-4" /> },
  { value: 'refunds', label: 'Refunds', icon: <RefreshCw className="w-4 h-4" /> },
  { value: 'invoices', label: 'Invoices', icon: <Receipt className="w-4 h-4" /> },
];

const FORMAT_OPTIONS: { value: ExportFormat; label: string; extension: string }[] = [
  { value: 'csv', label: 'CSV', extension: '.csv' },
  { value: 'excel', label: 'Excel', extension: '.xlsx' },
  { value: 'pdf', label: 'PDF', extension: '.pdf' },
];

const COLUMN_OPTIONS: Record<DataType, { key: string; label: string }[]> = {
  transactions: [
    { key: 'id', label: 'Transaction ID' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'status', label: 'Status' },
    { key: 'method', label: 'Payment Method' },
    { key: 'country', label: 'Country' },
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientEmail', label: 'Client Email' },
    { key: 'providerId', label: 'Provider ID' },
    { key: 'providerEmail', label: 'Provider Email' },
    { key: 'fee', label: 'Platform Fee' },
    { key: 'net', label: 'Net Amount' },
    { key: 'tax', label: 'Tax' },
    { key: 'description', label: 'Description' },
  ],
  subscriptions: [
    { key: 'id', label: 'Subscription ID' },
    { key: 'userId', label: 'User ID' },
    { key: 'userEmail', label: 'User Email' },
    { key: 'plan', label: 'Plan' },
    { key: 'status', label: 'Status' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'endDate', label: 'End Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'interval', label: 'Billing Interval' },
    { key: 'cancelledAt', label: 'Cancelled At' },
    { key: 'trialEnd', label: 'Trial End' },
  ],
  refunds: [
    { key: 'id', label: 'Refund ID' },
    { key: 'paymentId', label: 'Payment ID' },
    { key: 'date', label: 'Date' },
    { key: 'amount', label: 'Amount' },
    { key: 'currency', label: 'Currency' },
    { key: 'reason', label: 'Reason' },
    { key: 'status', label: 'Status' },
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientEmail', label: 'Client Email' },
    { key: 'processedBy', label: 'Processed By' },
  ],
  invoices: [
    { key: 'id', label: 'Invoice ID' },
    { key: 'number', label: 'Invoice Number' },
    { key: 'date', label: 'Date' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'total', label: 'Total' },
    { key: 'subtotal', label: 'Subtotal' },
    { key: 'tax', label: 'Tax' },
    { key: 'currency', label: 'Currency' },
    { key: 'status', label: 'Status' },
    { key: 'clientId', label: 'Client ID' },
    { key: 'clientEmail', label: 'Client Email' },
    { key: 'country', label: 'Country' },
    { key: 'paidAt', label: 'Paid At' },
  ],
};

const STATUS_OPTIONS = ['succeeded', 'pending', 'failed', 'refunded', 'disputed'];
const CURRENCY_OPTIONS: Currency[] = ['EUR', 'USD'];
const METHOD_OPTIONS = ['card', 'paypal', 'bank_transfer', 'sepa'];

// ============================================================================
// EXPORT TEMPLATES
// ============================================================================

const EXPORT_TEMPLATES: ExportTemplate[] = [
  {
    id: 'monthly-summary',
    name: 'Monthly Financial Summary',
    description: 'Overview of revenue, fees, and key metrics for the month',
    icon: <BarChart3 className="w-5 h-5" />,
    dataType: 'transactions',
    columns: ['date', 'amount', 'currency', 'status', 'fee', 'net', 'country'],
  },
  {
    id: 'transaction-details',
    name: 'Transaction Details Report',
    description: 'Complete transaction history with all details',
    icon: <CreditCard className="w-5 h-5" />,
    dataType: 'transactions',
    columns: ['id', 'date', 'amount', 'currency', 'status', 'method', 'clientEmail', 'providerEmail', 'fee', 'net'],
  },
  {
    id: 'subscription-report',
    name: 'Subscription Report',
    description: 'Active subscriptions, MRR, and churn analysis',
    icon: <Users className="w-5 h-5" />,
    dataType: 'subscriptions',
    columns: ['id', 'userEmail', 'plan', 'status', 'startDate', 'amount', 'currency', 'interval'],
  },
  {
    id: 'refunds-report',
    name: 'Refunds Report',
    description: 'All refunds with reasons and status',
    icon: <RefreshCw className="w-5 h-5" />,
    dataType: 'refunds',
    columns: ['id', 'paymentId', 'date', 'amount', 'currency', 'reason', 'status', 'clientEmail'],
  },
  {
    id: 'vat-report',
    name: 'VAT/Tax Report by Country',
    description: 'Tax breakdown by country for compliance',
    icon: <Globe className="w-5 h-5" />,
    dataType: 'invoices',
    columns: ['id', 'number', 'date', 'total', 'tax', 'currency', 'country', 'status'],
  },
  {
    id: 'provider-payouts',
    name: 'Provider Payouts Report',
    description: 'Payouts to providers with commission details',
    icon: <Wallet className="w-5 h-5" />,
    dataType: 'transactions',
    columns: ['id', 'date', 'providerId', 'providerEmail', 'amount', 'fee', 'net', 'currency', 'status'],
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDefaultDateRange(): { from: string; to: string } {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: firstDayOfMonth.toISOString().split('T')[0],
    to: now.toISOString().split('T')[0],
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FinanceExports() {
  const intl = useIntl();
  const { user } = useAuth();

  // Tab state
  const [activeTab, setActiveTab] = useState<'templates' | 'custom' | 'scheduled' | 'history'>('templates');

  // Custom export state
  const defaultDates = getDefaultDateRange();
  const [customConfig, setCustomConfig] = useState<CustomExportConfig>({
    dataType: 'transactions',
    dateFrom: defaultDates.from,
    dateTo: defaultDates.to,
    filters: {
      status: [],
      country: [],
      currency: [],
      method: [],
    },
    columns: COLUMN_OPTIONS.transactions.slice(0, 8).map((c) => c.key),
    format: 'csv',
  });
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);

  // Recent exports state
  const [recentExports, setRecentExports] = useState<ExportRecord[]>([]);
  const [isLoadingExports, setIsLoadingExports] = useState(false);

  // Scheduled reports state
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [isLoadingScheduled, setIsLoadingScheduled] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [newSchedule, setNewSchedule] = useState<Partial<ScheduledReport>>({
    frequency: 'monthly',
    emails: [],
    enabled: true,
  });

  // Expanded sections
  const [expandedFilters, setExpandedFilters] = useState(false);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const fetchRecentExports = useCallback(async () => {
    setIsLoadingExports(true);
    try {
      const exportsRef = collection(db, 'finance_exports');
      const q = query(exportsRef, orderBy('createdAt', 'desc'), limit(20));
      const snapshot = await getDocs(q);

      const exports: ExportRecord[] = snapshot.docs
        .filter((d) => !d.data()._placeholder)
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            reportType: data.reportType || 'Unknown',
            format: data.format || 'csv',
            status: data.status || 'pending',
            createdAt: data.createdAt?.toDate() || new Date(),
            completedAt: data.completedAt?.toDate(),
            size: data.size,
            downloadUrl: data.downloadUrl,
            createdBy: data.createdBy || '',
            createdByEmail: data.createdByEmail,
            expiresAt: data.expiresAt?.toDate() || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            error: data.error,
          };
        });

      setRecentExports(exports);
    } catch (error) {
      console.error('[Exports] Error fetching recent exports:', error);
    } finally {
      setIsLoadingExports(false);
    }
  }, []);

  const fetchScheduledReports = useCallback(async () => {
    setIsLoadingScheduled(true);
    try {
      const scheduledRef = collection(db, 'scheduled_reports');
      const q = query(scheduledRef, orderBy('nextRunAt', 'asc'));
      const snapshot = await getDocs(q);

      const reports: ScheduledReport[] = snapshot.docs
        .filter((d) => !d.data()._placeholder)
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || 'Unnamed Report',
            templateId: data.templateId || '',
            frequency: data.frequency || 'monthly',
            nextRunAt: data.nextRunAt?.toDate() || new Date(),
            emails: data.emails || [],
            enabled: data.enabled !== false,
            lastRunAt: data.lastRunAt?.toDate(),
            lastStatus: data.lastStatus,
            createdBy: data.createdBy || '',
            filters: data.filters,
          };
        });

      setScheduledReports(reports);
    } catch (error) {
      console.error('[Exports] Error fetching scheduled reports:', error);
    } finally {
      setIsLoadingScheduled(false);
    }
  }, []);

  useEffect(() => {
    fetchRecentExports();
    fetchScheduledReports();
  }, [fetchRecentExports, fetchScheduledReports]);

  // ============================================================================
  // EXPORT FUNCTIONS
  // ============================================================================

  const fetchDataForExport = useCallback(
    async (
      dataType: DataType,
      dateFrom: string,
      dateTo: string,
      filters: CustomExportConfig['filters'],
      previewOnly = false
    ): Promise<PreviewRow[]> => {
      const collectionMap: Record<DataType, string> = {
        transactions: 'payments',
        subscriptions: 'subscriptions',
        refunds: 'refunds',
        invoices: 'invoices',
      };

      const collectionName = collectionMap[dataType];
      const dataRef = collection(db, collectionName);

      // P1 FIX: Build query with server-side filters when possible
      // This reduces data transfer and improves performance
      const constraints: QueryConstraint[] = [
        where('createdAt', '>=', Timestamp.fromDate(new Date(dateFrom))),
        where('createdAt', '<=', Timestamp.fromDate(new Date(dateTo + 'T23:59:59'))),
      ];

      // Add server-side status filter (Firestore supports 'in' with up to 30 values)
      if (filters.status.length > 0 && filters.status.length <= 10) {
        constraints.push(where('status', 'in', filters.status));
      }

      // Add server-side currency filter if single value
      if (filters.currency.length === 1) {
        constraints.push(where('currency', '==', filters.currency[0]));
      } else if (filters.currency.length > 1 && filters.currency.length <= 10) {
        constraints.push(where('currency', 'in', filters.currency));
      }

      // Add orderBy last (required by Firestore)
      constraints.push(orderBy('createdAt', 'desc'));

      if (previewOnly) {
        constraints.push(limit(10));
      }

      const q = query(dataRef, ...constraints);

      const snapshot = await getDocs(q);

      let rows: PreviewRow[] = snapshot.docs
        .filter((d) => !d.data()._placeholder)
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            date: data.createdAt?.toDate()?.toISOString() || '',
            createdAt: data.createdAt?.toDate()?.toISOString() || '',
          } as PreviewRow;
        });

      // Apply remaining client-side filters (for filters not applied server-side)
      // Status: client-side only if > 10 values (Firestore 'in' limit)
      if (filters.status.length > 10) {
        rows = rows.filter((r) => filters.status.includes(String(r.status)));
      }
      // Country: always client-side (requires composite index with createdAt)
      if (filters.country.length > 0) {
        rows = rows.filter((r) => filters.country.includes(String(r.country)));
      }
      // Currency: client-side only if > 10 values
      if (filters.currency.length > 10) {
        rows = rows.filter((r) => filters.currency.includes(r.currency as Currency));
      }
      // Method: always client-side (requires composite index)
      if (filters.method.length > 0) {
        rows = rows.filter((r) => filters.method.includes(String(r.method || r.paymentMethod)));
      }

      return rows;
    },
    []
  );

  const generatePreview = useCallback(async () => {
    setIsPreviewLoading(true);
    setExportError(null);
    try {
      const data = await fetchDataForExport(
        customConfig.dataType,
        customConfig.dateFrom,
        customConfig.dateTo,
        customConfig.filters,
        true
      );

      // Filter columns
      const filteredData = data.map((row) => {
        const filteredRow: PreviewRow = {};
        customConfig.columns.forEach((col) => {
          filteredRow[col] = row[col];
        });
        return filteredRow;
      });

      setPreviewData(filteredData);
      setShowPreview(true);
    } catch (error) {
      console.error('[Exports] Error generating preview:', error);
      setExportError('Failed to generate preview. Please try again.');
    } finally {
      setIsPreviewLoading(false);
    }
  }, [customConfig, fetchDataForExport]);

  const executeExport = useCallback(
    async (template?: ExportTemplate) => {
      setIsExporting(true);
      setExportProgress(0);
      setExportError(null);

      try {
        const config = template
          ? {
              dataType: template.dataType,
              dateFrom: customConfig.dateFrom,
              dateTo: customConfig.dateTo,
              filters: customConfig.filters,
              columns: template.columns,
              format: customConfig.format,
            }
          : customConfig;

        // Simulate progress
        const progressInterval = setInterval(() => {
          setExportProgress((prev) => Math.min(prev + 10, 90));
        }, 200);

        // Fetch data
        const data = await fetchDataForExport(config.dataType, config.dateFrom, config.dateTo, config.filters, false);

        clearInterval(progressInterval);
        setExportProgress(95);

        // Filter columns
        const filteredData = data.map((row) => {
          const filteredRow: PreviewRow = {};
          config.columns.forEach((col) => {
            filteredRow[col] = row[col];
          });
          return filteredRow;
        });

        // Generate export based on format
        const reportName = template?.id || `${config.dataType}-export`;
        const filename = `${reportName}-${new Date().toISOString().split('T')[0]}`;
        let blob: Blob;

        if (config.format === 'csv') {
          const content = toCsv(filteredData as Record<string, unknown>[]);
          blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
          downloadBlob(blob, `${filename}.csv`);
        } else if (config.format === 'excel') {
          // Use SheetJS (xlsx) library for proper Excel export
          blob = toExcel(filteredData as Record<string, unknown>[], {
            sheetName: template?.name || 'Export',
          });
          downloadBlob(blob, `${filename}.xlsx`);
        } else {
          // PDF - use CSV as fallback for now
          const content = toCsv(filteredData as Record<string, unknown>[]);
          blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
          downloadBlob(blob, `${filename}.csv`);
          console.warn('[Exports] PDF export not available, falling back to CSV');
        }

        // Log export to Firestore
        const exportRecord: Omit<ExportRecord, 'id'> = {
          reportType: template?.name || `Custom ${config.dataType} Export`,
          format: config.format,
          status: 'completed',
          createdAt: new Date(),
          completedAt: new Date(),
          size: blob.size,
          createdBy: user?.uid || '',
          createdByEmail: user?.email || '',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        };

        await addDoc(collection(db, 'finance_exports'), {
          ...exportRecord,
          createdAt: Timestamp.fromDate(exportRecord.createdAt),
          completedAt: Timestamp.fromDate(exportRecord.completedAt!),
          expiresAt: Timestamp.fromDate(exportRecord.expiresAt),
        });

        setExportProgress(100);

        // Refresh exports list
        fetchRecentExports();
      } catch (error) {
        console.error('[Exports] Error executing export:', error);
        setExportError('Failed to generate export. Please try again.');
      } finally {
        setIsExporting(false);
        setTimeout(() => setExportProgress(0), 1000);
      }
    },
    [customConfig, fetchDataForExport, fetchRecentExports, user]
  );

  // ============================================================================
  // SCHEDULED REPORTS FUNCTIONS
  // ============================================================================

  const toggleScheduledReport = useCallback(async (reportId: string, enabled: boolean) => {
    try {
      const reportRef = doc(db, 'scheduled_reports', reportId);
      await updateDoc(reportRef, { enabled });
      setScheduledReports((prev) => prev.map((r) => (r.id === reportId ? { ...r, enabled } : r)));
    } catch (error) {
      console.error('[Exports] Error toggling scheduled report:', error);
    }
  }, []);

  const deleteScheduledReport = useCallback(
    async (reportId: string) => {
      if (!window.confirm('Are you sure you want to delete this scheduled report?')) {
        return;
      }
      try {
        await deleteDoc(doc(db, 'scheduled_reports', reportId));
        setScheduledReports((prev) => prev.filter((r) => r.id !== reportId));
      } catch (error) {
        console.error('[Exports] Error deleting scheduled report:', error);
      }
    },
    []
  );

  const createScheduledReport = useCallback(async () => {
    if (!newSchedule.name || !newSchedule.templateId || !newSchedule.emails?.length) {
      setExportError('Please fill in all required fields');
      return;
    }

    try {
      const nextRun = new Date();
      if (newSchedule.frequency === 'daily') {
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(6, 0, 0, 0);
      } else if (newSchedule.frequency === 'weekly') {
        nextRun.setDate(nextRun.getDate() + (7 - nextRun.getDay() + 1));
        nextRun.setHours(6, 0, 0, 0);
      } else {
        nextRun.setMonth(nextRun.getMonth() + 1, 1);
        nextRun.setHours(6, 0, 0, 0);
      }

      await addDoc(collection(db, 'scheduled_reports'), {
        ...newSchedule,
        nextRunAt: Timestamp.fromDate(nextRun),
        createdBy: user?.uid || '',
        createdAt: Timestamp.now(),
      });

      setShowScheduleModal(false);
      setNewSchedule({ frequency: 'monthly', emails: [], enabled: true });
      fetchScheduledReports();
    } catch (error) {
      console.error('[Exports] Error creating scheduled report:', error);
      setExportError('Failed to create scheduled report');
    }
  }, [newSchedule, user, fetchScheduledReports]);

  // ============================================================================
  // COLUMN SELECTION HELPERS
  // ============================================================================

  const availableColumns = useMemo(
    () => COLUMN_OPTIONS[customConfig.dataType] || [],
    [customConfig.dataType]
  );

  const toggleColumn = useCallback(
    (columnKey: string) => {
      setCustomConfig((prev) => {
        const newColumns = prev.columns.includes(columnKey)
          ? prev.columns.filter((c) => c !== columnKey)
          : [...prev.columns, columnKey];
        return { ...prev, columns: newColumns };
      });
    },
    []
  );

  const selectAllColumns = useCallback(() => {
    setCustomConfig((prev) => ({
      ...prev,
      columns: availableColumns.map((c) => c.key),
    }));
  }, [availableColumns]);

  const clearAllColumns = useCallback(() => {
    setCustomConfig((prev) => ({ ...prev, columns: [] }));
  }, []);

  // Reset columns when data type changes
  useEffect(() => {
    setCustomConfig((prev) => ({
      ...prev,
      columns: COLUMN_OPTIONS[prev.dataType].slice(0, 8).map((c) => c.key),
    }));
  }, [customConfig.dataType]);

  // ============================================================================
  // RENDER FUNCTIONS
  // ============================================================================

  const renderStatusBadge = (status: ExportStatus) => {
    const config = {
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: <Clock className="w-3 h-3" /> },
      processing: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
      completed: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      failed: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3 h-3" /> },
    };
    const c = config[status] || config.pending;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
        {c.icon}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const renderTemplatesTab = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {EXPORT_TEMPLATES.map((template) => (
        <div
          key={template.id}
          className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start gap-3 mb-3">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">{template.icon}</div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{template.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-4">
            <select
              className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              value={customConfig.format}
              onChange={(e) => setCustomConfig((prev) => ({ ...prev, format: e.target.value as ExportFormat }))}
            >
              {FORMAT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => executeExport(template)}
              disabled={isExporting}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Export
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderCustomExportTab = () => (
    <div className="space-y-6">
      {/* Data Type Selection */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 mb-4">1. Select Data Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {DATA_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setCustomConfig((prev) => ({ ...prev, dataType: opt.value }))}
              className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                customConfig.dataType === opt.value
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {opt.icon}
              <span className="font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 mb-4">2. Date Range</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input
              type="date"
              value={customConfig.dateFrom}
              onChange={(e) => setCustomConfig((prev) => ({ ...prev, dateFrom: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input
              type="date"
              value={customConfig.dateTo}
              onChange={(e) => setCustomConfig((prev) => ({ ...prev, dateTo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <button
          onClick={() => setExpandedFilters(!expandedFilters)}
          className="w-full flex items-center justify-between text-left"
        >
          <h3 className="font-semibold text-gray-900">3. Filters (Optional)</h3>
          {expandedFilters ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>
        {expandedFilters && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Status</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {STATUS_OPTIONS.map((status) => (
                  <label key={status} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={customConfig.filters.status.includes(status)}
                      onChange={(e) => {
                        setCustomConfig((prev) => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            status: e.target.checked
                              ? [...prev.filters.status, status]
                              : prev.filters.status.filter((s) => s !== status),
                          },
                        }));
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>

            {/* Currency Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Currency</label>
              <div className="space-y-1">
                {CURRENCY_OPTIONS.map((currency) => (
                  <label key={currency} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={customConfig.filters.currency.includes(currency)}
                      onChange={(e) => {
                        setCustomConfig((prev) => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            currency: e.target.checked
                              ? [...prev.filters.currency, currency]
                              : prev.filters.currency.filter((c) => c !== currency),
                          },
                        }));
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    {currency}
                  </label>
                ))}
              </div>
            </div>

            {/* Method Filter */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Payment Method</label>
              <div className="space-y-1">
                {METHOD_OPTIONS.map((method) => (
                  <label key={method} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={customConfig.filters.method.includes(method)}
                      onChange={(e) => {
                        setCustomConfig((prev) => ({
                          ...prev,
                          filters: {
                            ...prev.filters,
                            method: e.target.checked
                              ? [...prev.filters.method, method]
                              : prev.filters.method.filter((m) => m !== method),
                          },
                        }));
                      }}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    {method.replace('_', ' ')}
                  </label>
                ))}
              </div>
            </div>

            {/* Country Filter - Placeholder */}
            <div>
              <label className="block text-sm text-gray-600 mb-2">Country</label>
              <input
                type="text"
                placeholder="e.g., FR, DE, US"
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:ring-2 focus:ring-indigo-500"
                onChange={(e) => {
                  const countries = e.target.value.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
                  setCustomConfig((prev) => ({
                    ...prev,
                    filters: { ...prev.filters, country: countries },
                  }));
                }}
              />
              <p className="text-xs text-gray-400 mt-1">Comma-separated country codes</p>
            </div>
          </div>
        )}
      </div>

      {/* Column Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">4. Select Columns</h3>
          <div className="flex gap-2">
            <button
              onClick={selectAllColumns}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              Select All
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={clearAllColumns}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {availableColumns.map((col) => (
            <label
              key={col.key}
              className={`flex items-center gap-2 p-2 rounded border cursor-pointer transition-colors ${
                customConfig.columns.includes(col.key)
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="checkbox"
                checked={customConfig.columns.includes(col.key)}
                onChange={() => toggleColumn(col.key)}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm">{col.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Format & Export */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h3 className="font-semibold text-gray-900 mb-4">5. Export Format</h3>
        <div className="flex items-center gap-4">
          <div className="flex gap-3">
            {FORMAT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                  customConfig.format === opt.value
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={opt.value}
                  checked={customConfig.format === opt.value}
                  onChange={(e) => setCustomConfig((prev) => ({ ...prev, format: e.target.value as ExportFormat }))}
                  className="sr-only"
                />
                <FileSpreadsheet className="w-4 h-4" />
                <span className="font-medium">{opt.label}</span>
              </label>
            ))}
          </div>
          <div className="flex-1" />
          <button
            onClick={generatePreview}
            disabled={isPreviewLoading || customConfig.columns.length === 0}
            className="px-4 py-2 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center gap-2"
          >
            {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Preview
          </button>
          <button
            onClick={() => executeExport()}
            disabled={isExporting || customConfig.columns.length === 0}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export
          </button>
        </div>
      </div>

      {/* Preview Table */}
      {showPreview && previewData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Preview (First 10 Rows)</h3>
            <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600">
              <XCircle className="w-5 h-5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {customConfig.columns.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {availableColumns.find((c) => c.key === col)?.label || col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {customConfig.columns.map((col) => (
                      <td key={col} className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {String(row[col] ?? '-')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Export Progress */}
      {isExporting && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">Generating export...</p>
              <div className="mt-2 w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {exportError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-sm text-red-800">{exportError}</p>
          <button onClick={() => setExportError(null)} className="ml-auto text-red-400 hover:text-red-600">
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );

  const renderScheduledTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Scheduled Reports</h3>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {isLoadingScheduled ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : scheduledReports.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="font-medium text-gray-900 mb-2">No Scheduled Reports</h4>
          <p className="text-gray-500 mb-4">Create recurring exports that run automatically</p>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Create Schedule
          </button>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Next Run</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {scheduledReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{report.name}</div>
                    <div className="text-sm text-gray-500">
                      {EXPORT_TEMPLATES.find((t) => t.id === report.templateId)?.name || 'Custom'}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="capitalize text-sm text-gray-600">{report.frequency}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600">{formatDate(report.nextRunAt)}</div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-600">{report.emails.length} email(s)</div>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => toggleScheduledReport(report.id, !report.enabled)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        report.enabled ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          report.enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <button
                      onClick={() => deleteScheduledReport(report.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">New Scheduled Report</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Name</label>
                <input
                  type="text"
                  value={newSchedule.name || ''}
                  onChange={(e) => setNewSchedule((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="Monthly Financial Summary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                <select
                  value={newSchedule.templateId || ''}
                  onChange={(e) => setNewSchedule((prev) => ({ ...prev, templateId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a template...</option>
                  {EXPORT_TEMPLATES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                <select
                  value={newSchedule.frequency}
                  onChange={(e) =>
                    setNewSchedule((prev) => ({ ...prev, frequency: e.target.value as ScheduleFrequency }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Recipients</label>
                <input
                  type="text"
                  value={newSchedule.emails?.join(', ') || ''}
                  onChange={(e) =>
                    setNewSchedule((prev) => ({
                      ...prev,
                      emails: e.target.value.split(',').map((email) => email.trim()).filter(Boolean),
                    }))
                  }
                  className="w-full px-3 py-2 border border-gray-200 rounded-md focus:ring-2 focus:ring-indigo-500"
                  placeholder="finance@company.com, admin@company.com"
                />
                <p className="text-xs text-gray-400 mt-1">Comma-separated email addresses</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowScheduleModal(false)}
                className="px-4 py-2 border border-gray-200 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createScheduledReport}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Create Schedule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderHistoryTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Recent Exports</h3>
        <button
          onClick={fetchRecentExports}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-3">
        <Clock className="w-5 h-5 text-yellow-600" />
        <p className="text-sm text-yellow-800">Exports are available for download for 7 days after creation.</p>
      </div>

      {isLoadingExports ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      ) : recentExports.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="font-medium text-gray-900 mb-2">No Exports Yet</h4>
          <p className="text-gray-500">Your export history will appear here</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Size</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentExports.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm text-gray-600">{formatDate(exp.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900">{exp.reportType}</div>
                    {exp.createdByEmail && (
                      <div className="text-xs text-gray-500">by {exp.createdByEmail}</div>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <span className="uppercase text-sm text-gray-600">{exp.format}</span>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-600">
                    {exp.size ? formatFileSize(exp.size) : '-'}
                  </td>
                  <td className="px-4 py-4">{renderStatusBadge(exp.status)}</td>
                  <td className="px-4 py-4">
                    {exp.status === 'completed' && exp.downloadUrl ? (
                      <a
                        href={exp.downloadUrl}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                        download
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                    ) : exp.status === 'failed' ? (
                      <span className="text-sm text-red-500">{exp.error || 'Export failed'}</span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <AdminLayout>
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Download className="w-7 h-7 text-indigo-600" />
              {intl.formatMessage({ id: 'admin.finance.exports.title', defaultMessage: 'Exports & Reports' })}
            </h1>
            <p className="text-gray-600 mt-1">
              {intl.formatMessage({
                id: 'admin.finance.exports.subtitle',
                defaultMessage: 'Export financial data in various formats for analysis and compliance',
              })}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex flex-wrap gap-1 border-b border-gray-200 px-4">
            {[
              { key: 'templates', label: 'Quick Exports', icon: <FileSpreadsheet className="w-4 h-4" /> },
              { key: 'custom', label: 'Custom Export', icon: <Settings className="w-4 h-4" /> },
              { key: 'scheduled', label: 'Scheduled', icon: <Calendar className="w-4 h-4" /> },
              { key: 'history', label: 'History', icon: <Clock className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6 min-h-[400px]">
            {activeTab === 'templates' && renderTemplatesTab()}
            {activeTab === 'custom' && renderCustomExportTab()}
            {activeTab === 'scheduled' && renderScheduledTab()}
            {activeTab === 'history' && renderHistoryTab()}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

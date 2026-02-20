import React, { useEffect, useState, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import {
  collection,
  getDocs,
  doc,
  query,
  orderBy,
  startAfter,
  limit,
  QueryDocumentSnapshot,
  DocumentData,
  Timestamp,
  where,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import AdminLayout from '../../components/admin/AdminLayout';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import {
  Loader2,
  FileText,
  Download,
  Mail,
  RefreshCw,
  Search,
  Eye,
  Plus,
  Settings,
  Package,
  CheckCircle,
  Clock,
  Send,
  DollarSign,
  TrendingUp,
  AlertCircle,
  X,
  Trash2,
  ChevronDown,
  ChevronUp,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useIntl } from 'react-intl';

// =============================================================================
// TYPES
// =============================================================================

type InvoiceType = 'platform' | 'provider' | 'client' | 'subscription';
type InvoiceStatus = 'generated' | 'downloaded' | 'sent' | 'paid';

interface AdminInvoice {
  id: string;
  callId?: string;
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  amount: number;
  currency: string;
  downloadUrl: string;
  recipientId?: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientType?: 'client' | 'provider';
  clientData?: {
    name?: string;
    email?: string;
    country?: string;
  };
  providerData?: {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
  };
  financialData?: {
    totalAmount: number;
    currency: string;
    platformFee: number;
    providerAmount: number;
  };
  invoices?: {
    platform?: {
      number: string;
      url: string;
      amount: number;
      fileName?: string;
      fileSize?: number;
    };
    provider?: {
      number: string;
      url: string;
      amount: number;
      fileName?: string;
      fileSize?: number;
    };
  };
  metadata?: {
    generatedAt: Timestamp;
    status: string;
    downloadCount?: number;
    lastDownloadedAt?: Timestamp;
    sentAt?: Timestamp;
    paidAt?: Timestamp;
  };
  createdAt?: Timestamp;
  dueDate?: Timestamp;
  notes?: string;
  items?: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

interface InvoiceStats {
  generatedThisMonth: number;
  totalAmount: number;
  pendingDownloads: number;
  averageValue: number;
}

interface Recipient {
  id: string;
  name: string;
  email: string;
  type: 'client' | 'provider';
}

interface ManualInvoiceFormData {
  recipientId: string;
  recipientType: 'client' | 'provider';
  items: InvoiceItem[];
  dueDate: string;
  notes: string;
  paymentTerms: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const INVOICES_PER_PAGE = 50;

const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  platform: 'Platform',
  provider: 'Provider',
  client: 'Client',
  subscription: 'Subscription',
};

const INVOICE_TYPE_COLORS: Record<InvoiceType, string> = {
  platform: 'bg-blue-100 text-blue-800 border-blue-200',
  provider: 'bg-green-100 text-green-800 border-green-200',
  client: 'bg-purple-100 text-purple-800 border-purple-200',
  subscription: 'bg-orange-100 text-orange-800 border-orange-200',
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  generated: 'bg-gray-100 text-gray-800 border-gray-200',
  downloaded: 'bg-blue-100 text-blue-800 border-blue-200',
  sent: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  paid: 'bg-green-100 text-green-800 border-green-200',
};

const STATUS_ICONS: Record<InvoiceStatus, React.ReactNode> = {
  generated: <FileText size={14} />,
  downloaded: <Download size={14} />,
  sent: <Send size={14} />,
  paid: <CheckCircle size={14} />,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatInvoiceNumber = (number: string, type: InvoiceType): string => {
  if (number.match(/^(PLT|PRV|CLT|SUB)-\d{4}-\d{4}$/)) {
    return number;
  }
  const prefix = {
    platform: 'PLT',
    provider: 'PRV',
    client: 'CLT',
    subscription: 'SUB',
  }[type];
  const year = new Date().getFullYear();
  const seq = number.replace(/\D/g, '').padStart(4, '0').slice(-4);
  return `${prefix}-${year}-${seq}`;
};

const getInvoiceFromRecord = (docData: DocumentData, id: string): AdminInvoice => {
  const type: InvoiceType = docData.type || 'platform';
  const status: InvoiceStatus = docData.status || docData.metadata?.status || 'generated';

  // Handle both admin_invoices and invoice_records formats
  let amount = 0;
  let currency = 'EUR';
  let invoiceNumber = '';
  let downloadUrl = '';
  let recipientName = '';
  let recipientEmail = '';

  if (docData.financialData) {
    // admin_invoices format
    amount = docData.financialData.totalAmount || 0;
    currency = docData.financialData.currency || 'EUR';
    invoiceNumber = docData.invoices?.platform?.number || docData.invoices?.provider?.number || id;
    downloadUrl = docData.invoices?.platform?.url || docData.invoices?.provider?.url || '';
    recipientName = docData.clientData?.name || docData.providerData?.name || '';
    recipientEmail = docData.clientData?.email || docData.providerData?.email || '';
  } else {
    // invoice_records format
    amount = docData.amount || 0;
    currency = docData.currency || 'EUR';
    invoiceNumber = docData.invoiceNumber || id;
    downloadUrl = docData.downloadUrl || '';
    recipientName = docData.recipientName || '';
    recipientEmail = docData.recipientEmail || '';
  }

  return {
    id,
    callId: docData.callId,
    invoiceNumber: formatInvoiceNumber(invoiceNumber, type),
    type,
    status: status as InvoiceStatus,
    amount,
    currency,
    downloadUrl,
    recipientId: docData.clientId || docData.providerId || docData.recipientId,
    recipientName,
    recipientEmail,
    recipientType: docData.recipientType || (docData.providerId ? 'provider' : 'client'),
    clientData: docData.clientData,
    providerData: docData.providerData,
    financialData: docData.financialData,
    invoices: docData.invoices,
    metadata: {
      generatedAt: docData.metadata?.generatedAt || docData.createdAt,
      status: docData.metadata?.status || status,
      downloadCount: docData.metadata?.downloadCount || 0,
      lastDownloadedAt: docData.metadata?.lastDownloadedAt,
      sentAt: docData.metadata?.sentAt,
      paidAt: docData.metadata?.paidAt,
    },
    createdAt: docData.createdAt,
    dueDate: docData.dueDate,
    notes: docData.notes,
    items: docData.items,
  };
};

// =============================================================================
// COMPONENTS
// =============================================================================

// Stats Card Component
const StatsCard: React.FC<{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
  color: string;
}> = ({ title, value, icon, color }) => (
  <div className="bg-white rounded-lg border p-6 shadow-sm">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
      <div className={`p-3 rounded-full ${color}`}>
        {icon}
      </div>
    </div>
  </div>
);

// Invoice Type Badge
const TypeBadge: React.FC<{ type: InvoiceType }> = ({ type }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${INVOICE_TYPE_COLORS[type]}`}>
    {INVOICE_TYPE_LABELS[type]}
  </span>
);

// Invoice Status Badge
const StatusBadge: React.FC<{ status: InvoiceStatus }> = ({ status }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[status]}`}>
    {STATUS_ICONS[status]}
    {status.charAt(0).toUpperCase() + status.slice(1)}
  </span>
);

// Invoice Item Row for Manual Invoice Form
const InvoiceItemRow: React.FC<{
  item: InvoiceItem;
  index: number;
  onChange: (index: number, field: keyof InvoiceItem, value: string | number) => void;
  onRemove: (index: number) => void;
  intl: ReturnType<typeof useIntl>;
}> = ({ item, index, onChange, onRemove, intl }) => (
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
    <div className="flex-1">
      <input
        type="text"
        value={item.description}
        onChange={(e) => onChange(index, 'description', e.target.value)}
        placeholder={intl.formatMessage({ id: 'admin.invoices.form.descriptionPlaceholder', defaultMessage: 'Description' })}
        className="w-full border rounded px-3 py-2 text-sm"
      />
    </div>
    <div className="w-20">
      <input
        type="number"
        value={item.quantity}
        onChange={(e) => onChange(index, 'quantity', parseFloat(e.target.value) || 0)}
        placeholder={intl.formatMessage({ id: 'admin.invoices.form.qty', defaultMessage: 'Qty' })}
        min="0"
        step="1"
        className="w-full border rounded px-3 py-2 text-sm"
      />
    </div>
    <div className="w-28">
      <input
        type="number"
        value={item.unitPrice}
        onChange={(e) => onChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
        placeholder={intl.formatMessage({ id: 'admin.invoices.form.price', defaultMessage: 'Price' })}
        min="0"
        step="0.01"
        className="w-full border rounded px-3 py-2 text-sm"
      />
    </div>
    <div className="w-20">
      <input
        type="number"
        value={item.vatRate}
        onChange={(e) => onChange(index, 'vatRate', parseFloat(e.target.value) || 0)}
        placeholder={intl.formatMessage({ id: 'admin.invoices.form.vat', defaultMessage: 'VAT %' })}
        min="0"
        max="100"
        step="0.1"
        className="w-full border rounded px-3 py-2 text-sm"
      />
    </div>
    <div className="w-24 text-right font-medium">
      {intl.formatNumber(item.total, { style: 'currency', currency: 'EUR' })}
    </div>
    <button
      type="button"
      onClick={() => onRemove(index)}
      className="p-2 text-red-600 hover:bg-red-50 rounded"
    >
      <Trash2 size={16} />
    </button>
  </div>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const AdminInvoices: React.FC = () => {
  const intl = useIntl();
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  // Data state
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats>({
    generatedThisMonth: 0,
    totalAmount: 0,
    pendingDownloads: 0,
    averageValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [typeFilter, setTypeFilter] = useState<InvoiceType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [amountMin, setAmountMin] = useState('');
  const [amountMax, setAmountMax] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selection state
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);

  // Modal state
  const [previewInvoice, setPreviewInvoice] = useState<AdminInvoice | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [showSequenceModal, setShowSequenceModal] = useState(false);

  // Form state for manual invoice
  const [manualFormData, setManualFormData] = useState<ManualInvoiceFormData>({
    recipientId: '',
    recipientType: 'client',
    items: [{ id: '1', description: '', quantity: 1, unitPrice: 0, vatRate: 0, total: 0 }],
    dueDate: '',
    notes: '',
    paymentTerms: '',
  });
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // =============================================================================
  // DATA FETCHING
  // =============================================================================

  // Calculate statistics
  const calculateStats = useCallback((invoiceList: AdminInvoice[]) => {
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const thisMonthInvoices = invoiceList.filter((inv) => {
      const date = inv.metadata?.generatedAt?.toDate() || inv.createdAt?.toDate();
      return date && date.getMonth() === thisMonth && date.getFullYear() === thisYear;
    });

    const totalAmount = invoiceList.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const pendingDownloads = invoiceList.filter((inv) => inv.status === 'generated').length;
    const averageValue = invoiceList.length > 0 ? totalAmount / invoiceList.length : 0;

    setStats({
      generatedThisMonth: thisMonthInvoices.length,
      totalAmount,
      pendingDownloads,
      averageValue,
    });
  }, []);

  // Fetch invoices from both admin_invoices and invoice_records collections
  const fetchInvoices = useCallback(async (reset = false) => {
    setLoading(true);
    try {
      const allInvoices: AdminInvoice[] = [];

      // Fetch from admin_invoices
      const adminInvoicesRef = collection(db, 'admin_invoices');
      let adminQuery = query(adminInvoicesRef, orderBy('metadata.generatedAt', 'desc'));

      // Apply date filters
      if (dateFrom) {
        const startDate = new Date(dateFrom);
        startDate.setHours(0, 0, 0, 0);
        adminQuery = query(adminQuery, where('metadata.generatedAt', '>=', Timestamp.fromDate(startDate)));
      }
      if (dateTo) {
        const endDate = new Date(dateTo);
        endDate.setHours(23, 59, 59, 999);
        adminQuery = query(adminQuery, where('metadata.generatedAt', '<=', Timestamp.fromDate(endDate)));
      }

      if (!reset && lastVisible) {
        adminQuery = query(adminQuery, startAfter(lastVisible), limit(INVOICES_PER_PAGE));
      } else {
        adminQuery = query(adminQuery, limit(INVOICES_PER_PAGE));
      }

      const adminSnapshot = await getDocs(adminQuery);
      adminSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        allInvoices.push(getInvoiceFromRecord(data, docSnap.id));
      });

      // Also fetch from invoice_records for additional invoices
      const invoiceRecordsRef = collection(db, 'invoice_records');
      const recordsQuery = query(invoiceRecordsRef, orderBy('createdAt', 'desc'), limit(INVOICES_PER_PAGE));

      const recordsSnapshot = await getDocs(recordsQuery);
      recordsSnapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        // Avoid duplicates by checking if we already have this invoice
        const existing = allInvoices.find(inv =>
          inv.invoiceNumber === data.invoiceNumber ||
          inv.callId === data.callId
        );
        if (!existing) {
          allInvoices.push(getInvoiceFromRecord(data, docSnap.id));
        }
      });

      // Sort all invoices by date
      allInvoices.sort((a, b) => {
        const dateA = a.metadata?.generatedAt?.toDate() || a.createdAt?.toDate() || new Date(0);
        const dateB = b.metadata?.generatedAt?.toDate() || b.createdAt?.toDate() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });

      if (adminSnapshot.docs.length < INVOICES_PER_PAGE) {
        setHasMore(false);
      }

      setLastVisible(adminSnapshot.docs[adminSnapshot.docs.length - 1] || null);

      if (reset) {
        setInvoices(allInvoices);
        calculateStats(allInvoices);
      } else {
        const newList = [...invoices, ...allInvoices];
        setInvoices(newList);
        calculateStats(newList);
      }
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, lastVisible, invoices, calculateStats]);

  // Fetch recipients for manual invoice form
  const fetchRecipients = useCallback(async (type: 'client' | 'provider') => {
    setLoadingRecipients(true);
    try {
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('role', '==', type === 'client' ? 'client' : type),
        limit(100)
      );
      const snapshot = await getDocs(q);

      const recipientList: Recipient[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.email || docSnap.id,
          email: data.email || '',
          type,
        };
      });

      setRecipients(recipientList);
    } catch (error) {
      console.error('Error fetching recipients:', error);
    } finally {
      setLoadingRecipients(false);
    }
  }, []);

  // =============================================================================
  // EFFECTS
  // =============================================================================

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'admin') {
      navigate('/admin/login');
      return;
    }
    fetchInvoices(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, navigate]);

  // Refetch when filters change
  useEffect(() => {
    setInvoices([]);
    setLastVisible(null);
    setHasMore(true);
    fetchInvoices(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, statusFilter, dateFrom, dateTo]);

  // Fetch recipients when form opens
  useEffect(() => {
    if (showManualForm) {
      fetchRecipients(manualFormData.recipientType);
    }
  }, [showManualForm, manualFormData.recipientType, fetchRecipients]);

  // =============================================================================
  // FILTERED DATA
  // =============================================================================

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      // Type filter
      if (typeFilter !== 'all' && inv.type !== typeFilter) return false;

      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) return false;

      // Amount range filter
      if (amountMin && inv.amount < parseFloat(amountMin)) return false;
      if (amountMax && inv.amount > parseFloat(amountMax)) return false;

      // Search filter
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesNumber = inv.invoiceNumber.toLowerCase().includes(q);
        const matchesName = inv.recipientName?.toLowerCase().includes(q);
        const matchesEmail = inv.recipientEmail?.toLowerCase().includes(q);
        const matchesClient = inv.clientData?.name?.toLowerCase().includes(q);
        const matchesProvider = inv.providerData?.name?.toLowerCase().includes(q);

        if (!matchesNumber && !matchesName && !matchesEmail && !matchesClient && !matchesProvider) {
          return false;
        }
      }

      return true;
    });
  }, [invoices, typeFilter, statusFilter, amountMin, amountMax, searchQuery]);

  // =============================================================================
  // ACTIONS
  // =============================================================================

  // Download single invoice
  const handleDownload = useCallback(async (invoice: AdminInvoice) => {
    setActionLoading(invoice.id);
    try {
      const url = invoice.downloadUrl || invoice.invoices?.platform?.url || invoice.invoices?.provider?.url;
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer');

        // Update download count
        if (invoice.id) {
          const invoiceRef = doc(db, 'admin_invoices', invoice.id);
          await updateDoc(invoiceRef, {
            'metadata.downloadCount': (invoice.metadata?.downloadCount || 0) + 1,
            'metadata.lastDownloadedAt': serverTimestamp(),
            'metadata.status': 'downloaded',
          });

          // Update local state
          setInvoices((prev) =>
            prev.map((inv) =>
              inv.id === invoice.id
                ? {
                    ...inv,
                    status: 'downloaded',
                    metadata: {
                      ...inv.metadata!,
                      downloadCount: (inv.metadata?.downloadCount || 0) + 1,
                    },
                  }
                : inv
            )
          );
        }
      }
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error(intl.formatMessage({ id: 'admin.invoices.downloadError', defaultMessage: 'Error downloading invoice' }));
    } finally {
      setActionLoading(null);
    }
  }, [intl]);

  // Send invoice by email
  const handleSendEmail = useCallback(async (invoice: AdminInvoice) => {
    setActionLoading(invoice.id);
    try {
      const sendInvoiceEmail = httpsCallable(functions, 'sendInvoiceEmail');
      await sendInvoiceEmail({
        invoiceId: invoice.id,
        recipientEmail: invoice.recipientEmail || invoice.clientData?.email || invoice.providerData?.email,
        invoiceNumber: invoice.invoiceNumber,
        downloadUrl: invoice.downloadUrl,
      });

      // Update status
      if (invoice.id) {
        const invoiceRef = doc(db, 'admin_invoices', invoice.id);
        await updateDoc(invoiceRef, {
          'metadata.sentAt': serverTimestamp(),
          'metadata.status': 'sent',
        });

        setInvoices((prev) =>
          prev.map((inv) =>
            inv.id === invoice.id ? { ...inv, status: 'sent' } : inv
          )
        );
      }

      toast.success(intl.formatMessage({ id: 'admin.invoices.emailSent', defaultMessage: 'Email sent successfully' }));
    } catch (error) {
      console.error('Error sending invoice email:', error);
      toast.error(intl.formatMessage({ id: 'admin.invoices.emailError', defaultMessage: 'Error sending email' }));
    } finally {
      setActionLoading(null);
    }
  }, [intl]);

  // Regenerate invoice
  const handleRegenerate = useCallback(async (invoice: AdminInvoice) => {
    setActionLoading(invoice.id);
    try {
      const regenerateInvoice = httpsCallable(functions, 'regenerateInvoice');
      await regenerateInvoice({
        invoiceId: invoice.id,
        callId: invoice.callId,
      });

      // Refresh the list
      fetchInvoices(true);
      toast.success(intl.formatMessage({ id: 'admin.invoices.regenerated', defaultMessage: 'Invoice regenerated successfully' }));
    } catch (error) {
      console.error('Error regenerating invoice:', error);
      toast.error(intl.formatMessage({ id: 'admin.invoices.regenerateError', defaultMessage: 'Error regenerating invoice' }));
    } finally {
      setActionLoading(null);
    }
  }, [fetchInvoices, intl]);

  // Bulk download as ZIP
  const handleBulkDownload = useCallback(async () => {
    if (selectedInvoices.size === 0) return;

    setActionLoading('bulk-download');
    try {
      const selected = filteredInvoices.filter((inv) => selectedInvoices.has(inv.id));

      // AUDIT-FIX C1: "createInvoiceZip" does NOT exist in backend — skip directly to fallback
      console.warn('[AdminInvoices] createInvoiceZip: Backend function does not exist, using fallback');
      throw new Error('Backend function not available');
    } catch (error) {
      // Fallback: open each invoice individually
      const selected = filteredInvoices.filter((inv) => selectedInvoices.has(inv.id));
      selected.forEach((inv) => {
        const url = inv.downloadUrl || inv.invoices?.platform?.url || inv.invoices?.provider?.url;
        if (url) window.open(url, '_blank', 'noopener,noreferrer');
      });
    } finally {
      setActionLoading(null);
    }
  }, [selectedInvoices, filteredInvoices]);

  // Bulk send emails
  const handleBulkSendEmail = useCallback(async () => {
    if (selectedInvoices.size === 0) return;

    setActionLoading('bulk-email');
    try {
      const selected = filteredInvoices.filter((inv) => selectedInvoices.has(inv.id));

      const sendBulkInvoiceEmails = httpsCallable(functions, 'sendBulkInvoiceEmails');
      await sendBulkInvoiceEmails({
        invoices: selected.map((inv) => ({
          invoiceId: inv.id,
          recipientEmail: inv.recipientEmail || inv.clientData?.email || inv.providerData?.email,
          invoiceNumber: inv.invoiceNumber,
          downloadUrl: inv.downloadUrl,
        })),
      });

      toast.success(intl.formatMessage({ id: 'admin.invoices.bulkEmailSent', defaultMessage: 'Emails sent successfully' }, { count: selected.length }));
      setSelectedInvoices(new Set());
      setSelectAll(false);
      fetchInvoices(true);
    } catch (error) {
      console.error('Error sending bulk emails:', error);
      toast.error(intl.formatMessage({ id: 'admin.invoices.bulkEmailError', defaultMessage: 'Error sending emails' }));
    } finally {
      setActionLoading(null);
    }
  }, [selectedInvoices, filteredInvoices, fetchInvoices, intl]);

  // Handle manual invoice form item changes
  const handleItemChange = useCallback((index: number, field: keyof InvoiceItem, value: string | number) => {
    setManualFormData((prev) => {
      const items = [...prev.items];
      items[index] = {
        ...items[index],
        [field]: value,
      };
      // Recalculate total
      items[index].total = items[index].quantity * items[index].unitPrice * (1 + items[index].vatRate / 100);
      return { ...prev, items };
    });
  }, []);

  // Add item to manual invoice
  const addInvoiceItem = useCallback(() => {
    setManualFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: Date.now().toString(), description: '', quantity: 1, unitPrice: 0, vatRate: 0, total: 0 },
      ],
    }));
  }, []);

  // Remove item from manual invoice
  const removeInvoiceItem = useCallback((index: number) => {
    setManualFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  }, []);

  // Create manual invoice
  const handleCreateManualInvoice = useCallback(async () => {
    if (!manualFormData.recipientId || manualFormData.items.length === 0) {
      toast.error(intl.formatMessage({ id: 'admin.invoices.form.requiredFields', defaultMessage: 'Please fill in all required fields' }));
      return;
    }

    setActionLoading('create-manual');
    try {
      const recipient = recipients.find((r) => r.id === manualFormData.recipientId);
      const totalAmount = manualFormData.items.reduce((sum, item) => sum + item.total, 0);

      // AUDIT-FIX C1: "createManualInvoice" does NOT exist in backend
      console.warn('[AdminInvoices] createManualInvoice: Backend function does not exist');
      toast.error('Fonction non disponible : createManualInvoice n\'est pas implémentée côté backend');
      return;

      toast.success(intl.formatMessage({ id: 'admin.invoices.form.created', defaultMessage: 'Invoice created successfully' }));
      setShowManualForm(false);
      setManualFormData({
        recipientId: '',
        recipientType: 'client',
        items: [{ id: '1', description: '', quantity: 1, unitPrice: 0, vatRate: 0, total: 0 }],
        dueDate: '',
        notes: '',
        paymentTerms: '',
      });
      fetchInvoices(true);
    } catch (error) {
      console.error('Error creating manual invoice:', error);
      toast.error(intl.formatMessage({ id: 'admin.invoices.form.createError', defaultMessage: 'Error creating invoice' }));
    } finally {
      setActionLoading(null);
    }
  }, [manualFormData, recipients, fetchInvoices, intl]);

  // Selection handlers
  const handleSelectAll = useCallback(() => {
    if (selectAll) {
      setSelectedInvoices(new Set());
    } else {
      setSelectedInvoices(new Set(filteredInvoices.map((inv) => inv.id)));
    }
    setSelectAll(!selectAll);
  }, [selectAll, filteredInvoices]);

  const handleSelectInvoice = useCallback((id: string) => {
    setSelectedInvoices((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Clear filters
  const clearFilters = useCallback(() => {
    setTypeFilter('all');
    setStatusFilter('all');
    setDateFrom('');
    setDateTo('');
    setAmountMin('');
    setAmountMax('');
    setSearchQuery('');
  }, []);

  // =============================================================================
  // RENDER
  // =============================================================================

  const manualFormTotal = useMemo(() => {
    return manualFormData.items.reduce((sum, item) => sum + item.total, 0);
  }, [manualFormData.items]);

  return (
    <AdminLayout>
      <div className="p-6 text-black">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{intl.formatMessage({ id: 'admin.invoices.title', defaultMessage: 'Invoices' })}</h1>
            <p className="text-sm text-gray-600 mt-1">
              {intl.formatMessage({ id: 'admin.invoices.subtitle', defaultMessage: 'Manage and track all platform invoices' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowSequenceModal(true)}>
              <Settings size={16} className="mr-2" />
              {intl.formatMessage({ id: 'admin.invoices.sequenceSettings', defaultMessage: 'Sequence Settings' })}
            </Button>
            <Button onClick={() => setShowManualForm(true)}>
              <Plus size={16} className="mr-2" />
              {intl.formatMessage({ id: 'admin.invoices.createManual', defaultMessage: 'Create Invoice' })}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatsCard
            title={intl.formatMessage({ id: 'admin.invoices.stats.generated', defaultMessage: 'Generated This Month' })}
            value={stats.generatedThisMonth}
            icon={<FileText size={24} className="text-blue-600" />}
            color="bg-blue-100"
          />
          <StatsCard
            title={intl.formatMessage({ id: 'admin.invoices.stats.totalAmount', defaultMessage: 'Total Amount Invoiced' })}
            value={intl.formatNumber(stats.totalAmount, { style: 'currency', currency: 'EUR' })}
            icon={<DollarSign size={24} className="text-green-600" />}
            color="bg-green-100"
          />
          <StatsCard
            title={intl.formatMessage({ id: 'admin.invoices.stats.pending', defaultMessage: 'Pending Downloads' })}
            value={stats.pendingDownloads}
            icon={<Clock size={24} className="text-yellow-600" />}
            color="bg-yellow-100"
          />
          <StatsCard
            title={intl.formatMessage({ id: 'admin.invoices.stats.average', defaultMessage: 'Average Invoice Value' })}
            value={intl.formatNumber(stats.averageValue, { style: 'currency', currency: 'EUR' })}
            icon={<TrendingUp size={24} className="text-purple-600" />}
            color="bg-purple-100"
          />
        </div>

        {/* Search and Filters */}
        <div className="bg-white border rounded-lg p-4 mb-4">
          <div className="flex items-center gap-4 mb-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.invoices.searchPlaceholder', defaultMessage: 'Search by invoice number, client name...' })}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>

            {/* Filter Toggle */}
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter size={16} className="mr-2" />
              {intl.formatMessage({ id: 'admin.invoices.filters', defaultMessage: 'Filters' })}
              {showFilters ? <ChevronUp size={16} className="ml-2" /> : <ChevronDown size={16} className="ml-2" />}
            </Button>

            {/* Refresh */}
            <Button variant="outline" onClick={() => fetchInvoices(true)}>
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </Button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 pt-4 border-t">
              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {intl.formatMessage({ id: 'admin.invoices.filter.type', defaultMessage: 'Type' })}
                </label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as InvoiceType | 'all')}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.invoices.filter.allTypes', defaultMessage: 'All Types' })}</option>
                  <option value="platform">{intl.formatMessage({ id: 'admin.invoices.type.platform', defaultMessage: 'Platform' })}</option>
                  <option value="provider">{intl.formatMessage({ id: 'admin.invoices.type.provider', defaultMessage: 'Provider' })}</option>
                  <option value="client">{intl.formatMessage({ id: 'admin.invoices.type.client', defaultMessage: 'Client' })}</option>
                  <option value="subscription">{intl.formatMessage({ id: 'admin.invoices.type.subscription', defaultMessage: 'Subscription' })}</option>
                </select>
              </div>

              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {intl.formatMessage({ id: 'admin.invoices.filter.status', defaultMessage: 'Status' })}
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as InvoiceStatus | 'all')}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="all">{intl.formatMessage({ id: 'admin.invoices.filter.allStatuses', defaultMessage: 'All Statuses' })}</option>
                  <option value="generated">{intl.formatMessage({ id: 'admin.invoices.status.generated', defaultMessage: 'Generated' })}</option>
                  <option value="downloaded">{intl.formatMessage({ id: 'admin.invoices.status.downloaded', defaultMessage: 'Downloaded' })}</option>
                  <option value="sent">{intl.formatMessage({ id: 'admin.invoices.status.sent', defaultMessage: 'Sent' })}</option>
                  <option value="paid">{intl.formatMessage({ id: 'admin.invoices.status.paid', defaultMessage: 'Paid' })}</option>
                </select>
              </div>

              {/* Date From */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {intl.formatMessage({ id: 'admin.invoices.filter.dateFrom', defaultMessage: 'From Date' })}
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Date To */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {intl.formatMessage({ id: 'admin.invoices.filter.dateTo', defaultMessage: 'To Date' })}
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Amount Min */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {intl.formatMessage({ id: 'admin.invoices.filter.amountMin', defaultMessage: 'Min Amount' })}
                </label>
                <input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                  placeholder="0"
                  min="0"
                  step="0.01"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Amount Max */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {intl.formatMessage({ id: 'admin.invoices.filter.amountMax', defaultMessage: 'Max Amount' })}
                </label>
                <input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                  placeholder="10000"
                  min="0"
                  step="0.01"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              {/* Clear Filters */}
              <div className="lg:col-span-6 flex justify-end">
                <Button variant="ghost" onClick={clearFilters}>
                  <X size={16} className="mr-2" />
                  {intl.formatMessage({ id: 'admin.invoices.clearFilters', defaultMessage: 'Clear Filters' })}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedInvoices.size > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-center justify-between">
            <span className="text-blue-800 font-medium">
              {intl.formatMessage({ id: 'admin.invoices.selected', defaultMessage: '{count} selected' }, { count: selectedInvoices.size })}
            </span>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={handleBulkDownload}
                disabled={actionLoading === 'bulk-download'}
              >
                {actionLoading === 'bulk-download' ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Package size={16} className="mr-2" />
                )}
                {intl.formatMessage({ id: 'admin.invoices.bulkDownload', defaultMessage: 'Download as ZIP' })}
              </Button>
              <Button
                variant="outline"
                onClick={handleBulkSendEmail}
                disabled={actionLoading === 'bulk-email'}
              >
                {actionLoading === 'bulk-email' ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <Mail size={16} className="mr-2" />
                )}
                {intl.formatMessage({ id: 'admin.invoices.bulkEmail', defaultMessage: 'Send by Email' })}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedInvoices(new Set());
                  setSelectAll(false);
                }}
              >
                {intl.formatMessage({ id: 'admin.invoices.clearSelection', defaultMessage: 'Clear Selection' })}
              </Button>
            </div>
          </div>
        )}

        {/* Invoices Table */}
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-12 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.invoices.table.number', defaultMessage: 'Invoice Number' })}
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.invoices.table.date', defaultMessage: 'Date' })}
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.invoices.table.type', defaultMessage: 'Type' })}
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.invoices.table.recipient', defaultMessage: 'Recipient' })}
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.invoices.table.amount', defaultMessage: 'Amount' })}
                  </th>
                  <th className="text-left text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.invoices.table.status', defaultMessage: 'Status' })}
                  </th>
                  <th className="text-center text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.invoices.table.downloads', defaultMessage: 'Downloads' })}
                  </th>
                  <th className="text-right text-xs font-semibold text-gray-600 uppercase px-4 py-3">
                    {intl.formatMessage({ id: 'admin.invoices.table.actions', defaultMessage: 'Actions' })}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const date = invoice.metadata?.generatedAt?.toDate() || invoice.createdAt?.toDate();
                  const recipientName = invoice.recipientName || invoice.clientData?.name || invoice.providerData?.name || '-';
                  const recipientEmail = invoice.recipientEmail || invoice.clientData?.email || invoice.providerData?.email || '';

                  return (
                    <tr key={invoice.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedInvoices.has(invoice.id)}
                          onChange={() => handleSelectInvoice(invoice.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm font-medium">{invoice.invoiceNumber}</span>
                      </td>
                      <td className="px-4 py-3">
                        {date ? intl.formatDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <TypeBadge type={invoice.type} />
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <div className="font-medium text-sm">{recipientName}</div>
                          {recipientEmail && (
                            <div className="text-xs text-gray-500">{recipientEmail}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium">
                          {intl.formatNumber(invoice.amount, { style: 'currency', currency: invoice.currency })}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={invoice.status} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-6 h-6 bg-gray-100 rounded-full text-xs font-medium">
                          {invoice.metadata?.downloadCount || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setPreviewInvoice(invoice)}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                            title={intl.formatMessage({ id: 'admin.invoices.action.view', defaultMessage: 'View' })}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            onClick={() => handleDownload(invoice)}
                            disabled={actionLoading === invoice.id}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                            title={intl.formatMessage({ id: 'admin.invoices.action.download', defaultMessage: 'Download' })}
                          >
                            {actionLoading === invoice.id ? (
                              <Loader2 size={16} className="animate-spin" />
                            ) : (
                              <Download size={16} />
                            )}
                          </button>
                          <button
                            onClick={() => handleSendEmail(invoice)}
                            disabled={actionLoading === invoice.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded"
                            title={intl.formatMessage({ id: 'admin.invoices.action.email', defaultMessage: 'Send by Email' })}
                          >
                            <Mail size={16} />
                          </button>
                          <button
                            onClick={() => handleRegenerate(invoice)}
                            disabled={actionLoading === invoice.id}
                            className="p-2 text-orange-600 hover:bg-orange-50 rounded"
                            title={intl.formatMessage({ id: 'admin.invoices.action.regenerate', defaultMessage: 'Regenerate' })}
                          >
                            <RefreshCw size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center">
                      <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 font-medium">{intl.formatMessage({ id: 'admin.invoices.noInvoices', defaultMessage: 'No invoices found' })}</p>
                      <p className="text-gray-500 text-sm mt-1">{intl.formatMessage({ id: 'admin.invoices.noInvoicesHint', defaultMessage: 'Try adjusting your filters or create a new invoice' })}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin mr-2 text-gray-500" />
              <span className="text-gray-600">{intl.formatMessage({ id: 'admin.invoices.loading', defaultMessage: 'Loading invoices...' })}</span>
            </div>
          )}

          {/* Load More */}
          {!loading && hasMore && filteredInvoices.length > 0 && (
            <div className="flex justify-center py-4 border-t">
              <Button variant="outline" onClick={() => fetchInvoices(false)}>
                {intl.formatMessage({ id: 'admin.invoices.loadMore', defaultMessage: 'Load More' })}
              </Button>
            </div>
          )}
        </div>

        {/* Invoice Preview Modal */}
        <Modal
          isOpen={!!previewInvoice}
          onClose={() => setPreviewInvoice(null)}
          title={intl.formatMessage({ id: 'admin.invoices.preview.title', defaultMessage: 'Invoice Preview' })}
          size="large"
        >
          {previewInvoice && (
            <div className="space-y-6">
              {/* Invoice Header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-bold">{previewInvoice.invoiceNumber}</h3>
                  <p className="text-gray-600">
                    {previewInvoice.metadata?.generatedAt?.toDate()
                      ? intl.formatDate(previewInvoice.metadata.generatedAt.toDate(), {
                          dateStyle: 'long',
                        })
                      : '-'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <TypeBadge type={previewInvoice.type} />
                  <StatusBadge status={previewInvoice.status} />
                </div>
              </div>

              {/* Recipient Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium mb-2">{intl.formatMessage({ id: 'admin.invoices.preview.recipient', defaultMessage: 'Recipient' })}</h4>
                <p className="font-medium">
                  {previewInvoice.recipientName || previewInvoice.clientData?.name || previewInvoice.providerData?.name}
                </p>
                <p className="text-gray-600 text-sm">
                  {previewInvoice.recipientEmail || previewInvoice.clientData?.email || previewInvoice.providerData?.email}
                </p>
              </div>

              {/* Amount */}
              <div className="flex items-center justify-between py-4 border-t border-b">
                <span className="text-lg font-medium">{intl.formatMessage({ id: 'admin.invoices.preview.total', defaultMessage: 'Total' })}</span>
                <span className="text-2xl font-bold">
                  {intl.formatNumber(previewInvoice.amount, { style: 'currency', currency: previewInvoice.currency })}
                </span>
              </div>

              {/* PDF Embed */}
              {previewInvoice.downloadUrl && (
                <div className="border rounded-lg overflow-hidden" style={{ height: '400px' }}>
                  <iframe
                    src={previewInvoice.downloadUrl}
                    className="w-full h-full"
                    title="Invoice PDF"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => handleDownload(previewInvoice)}>
                  <Download size={16} className="mr-2" />
                  {intl.formatMessage({ id: 'admin.invoices.action.download', defaultMessage: 'Download' })}
                </Button>
                <Button variant="outline" onClick={() => handleSendEmail(previewInvoice)}>
                  <Mail size={16} className="mr-2" />
                  {intl.formatMessage({ id: 'admin.invoices.action.email', defaultMessage: 'Send by Email' })}
                </Button>
                <Button onClick={() => handleRegenerate(previewInvoice)}>
                  <RefreshCw size={16} className="mr-2" />
                  {intl.formatMessage({ id: 'admin.invoices.action.regenerate', defaultMessage: 'Regenerate' })}
                </Button>
              </div>
            </div>
          )}
        </Modal>

        {/* Manual Invoice Creation Modal */}
        <Modal
          isOpen={showManualForm}
          onClose={() => setShowManualForm(false)}
          title={intl.formatMessage({ id: 'admin.invoices.form.title', defaultMessage: 'Create Manual Invoice' })}
          size="large"
        >
          <div className="space-y-6">
            {/* Recipient Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {intl.formatMessage({ id: 'admin.invoices.form.recipientType', defaultMessage: 'Recipient Type' })}
                </label>
                <select
                  value={manualFormData.recipientType}
                  onChange={(e) => setManualFormData((prev) => ({
                    ...prev,
                    recipientType: e.target.value as 'client' | 'provider',
                    recipientId: '',
                  }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="client">{intl.formatMessage({ id: 'admin.invoices.form.client', defaultMessage: 'Client' })}</option>
                  <option value="provider">{intl.formatMessage({ id: 'admin.invoices.form.provider', defaultMessage: 'Provider' })}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {intl.formatMessage({ id: 'admin.invoices.form.recipient', defaultMessage: 'Recipient' })}
                </label>
                <select
                  value={manualFormData.recipientId}
                  onChange={(e) => setManualFormData((prev) => ({ ...prev, recipientId: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                  disabled={loadingRecipients}
                >
                  <option value="">{intl.formatMessage({ id: 'admin.invoices.form.selectRecipient', defaultMessage: 'Select recipient' })}</option>
                  {recipients.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Invoice Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium">{intl.formatMessage({ id: 'admin.invoices.form.items', defaultMessage: 'Invoice Items' })}</label>
                <Button variant="ghost" size="small" onClick={addInvoiceItem}>
                  <Plus size={14} className="mr-1" />
                  {intl.formatMessage({ id: 'admin.invoices.form.addItem', defaultMessage: 'Add Item' })}
                </Button>
              </div>

              {/* Items Header */}
              <div className="flex items-center gap-3 px-3 py-2 bg-gray-100 rounded-t-lg text-xs font-medium text-gray-600">
                <div className="flex-1">{intl.formatMessage({ id: 'admin.invoices.form.description', defaultMessage: 'Description' })}</div>
                <div className="w-20 text-center">{intl.formatMessage({ id: 'admin.invoices.form.qty', defaultMessage: 'Qty' })}</div>
                <div className="w-28 text-center">{intl.formatMessage({ id: 'admin.invoices.form.unitPrice', defaultMessage: 'Unit Price' })}</div>
                <div className="w-20 text-center">{intl.formatMessage({ id: 'admin.invoices.form.vatPercent', defaultMessage: 'VAT %' })}</div>
                <div className="w-24 text-right">{intl.formatMessage({ id: 'admin.invoices.form.total', defaultMessage: 'Total' })}</div>
                <div className="w-10"></div>
              </div>

              {/* Items List */}
              <div className="space-y-2 border-l border-r border-b rounded-b-lg p-2">
                {manualFormData.items.map((item, index) => (
                  <InvoiceItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    onChange={handleItemChange}
                    onRemove={removeInvoiceItem}
                    intl={intl}
                  />
                ))}
              </div>

              {/* Total */}
              <div className="flex justify-end mt-4">
                <div className="bg-gray-100 rounded-lg px-6 py-3">
                  <span className="text-sm text-gray-600 mr-4">{intl.formatMessage({ id: 'admin.invoices.form.grandTotal', defaultMessage: 'Grand Total' })}</span>
                  <span className="text-xl font-bold">
                    {intl.formatNumber(manualFormTotal, { style: 'currency', currency: 'EUR' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Due Date & Payment Terms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {intl.formatMessage({ id: 'admin.invoices.form.dueDate', defaultMessage: 'Due Date' })}
                </label>
                <input
                  type="date"
                  value={manualFormData.dueDate}
                  onChange={(e) => setManualFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {intl.formatMessage({ id: 'admin.invoices.form.paymentTerms', defaultMessage: 'Payment Terms' })}
                </label>
                <select
                  value={manualFormData.paymentTerms}
                  onChange={(e) => setManualFormData((prev) => ({ ...prev, paymentTerms: e.target.value }))}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">{intl.formatMessage({ id: 'admin.invoices.form.selectTerms', defaultMessage: 'Select terms' })}</option>
                  <option value="immediate">{intl.formatMessage({ id: 'admin.invoices.form.immediate', defaultMessage: 'Immediate' })}</option>
                  <option value="net15">{intl.formatMessage({ id: 'admin.invoices.form.net15', defaultMessage: 'Net 15' })}</option>
                  <option value="net30">{intl.formatMessage({ id: 'admin.invoices.form.net30', defaultMessage: 'Net 30' })}</option>
                  <option value="net60">{intl.formatMessage({ id: 'admin.invoices.form.net60', defaultMessage: 'Net 60' })}</option>
                </select>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {intl.formatMessage({ id: 'admin.invoices.form.notes', defaultMessage: 'Notes' })}
              </label>
              <textarea
                value={manualFormData.notes}
                onChange={(e) => setManualFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder={intl.formatMessage({ id: 'admin.invoices.form.notesPlaceholder', defaultMessage: 'Additional notes for this invoice...' })}
                rows={3}
                className="w-full border rounded px-3 py-2"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowManualForm(false)}>
                {intl.formatMessage({ id: 'admin.invoices.form.cancel', defaultMessage: 'Cancel' })}
              </Button>
              <Button
                onClick={handleCreateManualInvoice}
                disabled={actionLoading === 'create-manual' || !manualFormData.recipientId}
              >
                {actionLoading === 'create-manual' ? (
                  <Loader2 size={16} className="animate-spin mr-2" />
                ) : (
                  <FileText size={16} className="mr-2" />
                )}
                {intl.formatMessage({ id: 'admin.invoices.form.create', defaultMessage: 'Create Invoice' })}
              </Button>
            </div>
          </div>
        </Modal>

        {/* Invoice Sequence Settings Modal */}
        <Modal
          isOpen={showSequenceModal}
          onClose={() => setShowSequenceModal(false)}
          title={intl.formatMessage({ id: 'admin.invoices.sequence.title', defaultMessage: 'Invoice Numbering Sequence' })}
          size="medium"
        >
          <div className="space-y-6">
            <p className="text-gray-600">
              {intl.formatMessage({ id: 'admin.invoices.sequence.description', defaultMessage: 'Configure how invoice numbers are generated for each type.' })}
            </p>

            <div className="space-y-4">
              {(['platform', 'provider', 'client', 'subscription'] as InvoiceType[]).map((type) => (
                <div key={type} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <span className="font-medium">{INVOICE_TYPE_LABELS[type]}</span>
                    <p className="text-sm text-gray-500">
                      {intl.formatMessage({ id: 'admin.invoices.sequence.prefix', defaultMessage: 'Prefix' })}: {type === 'platform' ? 'PLT' : type === 'provider' ? 'PRV' : type === 'client' ? 'CLT' : 'SUB'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm">{type.toUpperCase().slice(0, 3)}-2024-0001</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="text-sm text-yellow-800 font-medium">
                    {intl.formatMessage({ id: 'admin.invoices.sequence.warning', defaultMessage: 'Important' })}
                  </p>
                  <p className="text-sm text-yellow-700 mt-1">
                    {intl.formatMessage({ id: 'admin.invoices.sequence.warningText', defaultMessage: 'Invoice sequences cannot be modified once invoices have been generated. Contact support for sequence resets.' })}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => navigate('/admin/settings/invoice-templates')}>
                <Settings size={16} className="mr-2" />
                {intl.formatMessage({ id: 'admin.invoices.sequence.configureTemplates', defaultMessage: 'Configure Templates' })}
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
};

export default AdminInvoices;


/**
 * Subscriptions Management Page
 * Comprehensive IA subscriptions management with stats, filters, and actions
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { useIntl, FormattedMessage } from 'react-intl';
import {
  collection,
  query,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { cn } from '../../../utils/cn';
import { useAdminReferenceData } from '../../../hooks/useAdminReferenceData';
import AdminLayout from '../../../components/admin/AdminLayout';
import {
  Search,
  RefreshCw,
  Check,
  AlertCircle,
  X,
  Download,
  ExternalLink,
  DollarSign,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Sparkles,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Eye,
  ArrowUpCircle,
  ArrowDownCircle,
  Pause,
  Play,
  Mail,
  FileText,
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  CheckSquare,
  Square,
} from 'lucide-react';
import {
  SubscriptionTier,
  SubscriptionStatus,
  BillingPeriod,
  Currency,
} from '../../../types/subscription';

// ============================================================================
// TYPES
// ============================================================================

interface SubscriptionRecord {
  id: string;
  providerId: string;
  providerName: string;
  providerEmail: string;
  providerAvatar?: string;
  providerType: 'lawyer' | 'expat_aidant';
  planId: string;
  planName: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  billingPeriod: BillingPeriod;
  currency: Currency;
  amount: number;
  startDate: Date;
  endDate: Date;
  nextBillingDate?: Date;
  canceledAt?: Date;
  pausedAt?: Date;
  stripeSubscriptionId?: string;
  stripeCustomerId?: string;
  // Usage tracking
  aiCallsUsed: number;
  aiCallsLimit: number;
  // Invoice history
  invoices?: InvoiceRecord[];
  // Payment history
  paymentHistory?: PaymentHistoryItem[];
  // Usage over time
  usageHistory?: UsageHistoryItem[];
  createdAt: Date;
}

interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  paidAt?: Date;
  createdAt: Date;
  pdfUrl?: string;
}

interface PaymentHistoryItem {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending' | 'refunded';
  createdAt: Date;
  method?: string;
}

interface UsageHistoryItem {
  date: string;
  calls: number;
}

interface SubscriptionStats {
  activeCount: number;
  mrr: number;
  churnRate: number;
  trialConversionRate: number;
  trialingCount: number;
  pastDueCount: number;
  canceledCount: number;
}

type StatusFilter = 'all' | SubscriptionStatus;
type PlanFilter = 'all' | 'free' | 'basic' | 'premium' | 'enterprise' | SubscriptionTier;
type BillingFilter = 'all' | BillingPeriod;
type SortField = 'user' | 'plan' | 'status' | 'price' | 'period' | 'usage' | 'nextBilling';
type SortOrder = 'asc' | 'desc';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  trialing: { label: 'Trialing', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: <Sparkles className="w-3 h-3" /> },
  active: { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-100', icon: <Check className="w-3 h-3" /> },
  past_due: { label: 'Past Due', color: 'text-amber-700', bgColor: 'bg-amber-100', icon: <Clock className="w-3 h-3" /> },
  cancelled: { label: 'Cancelled', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <XCircle className="w-3 h-3" /> },
  canceled: { label: 'Cancelled', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: <XCircle className="w-3 h-3" /> },
  expired: { label: 'Expired', color: 'text-red-700', bgColor: 'bg-red-100', icon: <X className="w-3 h-3" /> },
  paused: { label: 'Paused', color: 'text-purple-700', bgColor: 'bg-purple-100', icon: <Pause className="w-3 h-3" /> },
  suspended: { label: 'Suspended', color: 'text-red-800', bgColor: 'bg-red-200', icon: <AlertCircle className="w-3 h-3" /> },
};

const TIER_CONFIG: Record<SubscriptionTier, { label: string; color: string; bgColor: string }> = {
  trial: { label: 'Free Trial', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  basic: { label: 'Basic', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  standard: { label: 'Premium', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  pro: { label: 'Pro', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  unlimited: { label: 'Enterprise', color: 'text-amber-700', bgColor: 'bg-amber-100' },
};

// P2 FIX: Configurable page sizes for pagination
const PAGE_SIZES = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;
// OPTIMISATION: Réduction de la limite Firestore pour réduire les coûts
// Avant: 5000 (coûtait ~3€/jour en lectures)
// Après: 500 (économie de ~90%)
const FIRESTORE_FETCH_LIMIT = 500;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const formatCurrency = (amount: number, currency: Currency = 'EUR'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

const formatDate = (date: Date, locale: string = 'en-US'): string => {
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getUsagePercentage = (used: number, limit: number): number => {
  if (limit === -1) return Math.min((used / 500) * 100, 100); // Fair use limit for unlimited
  return Math.min((used / limit) * 100, 100);
};

const getUsageColor = (percentage: number): string => {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 70) return 'bg-amber-500';
  return 'bg-green-500';
};

const exportToCSV = (subscriptions: SubscriptionRecord[]): void => {
  const headers = [
    'User Name',
    'Email',
    'Plan',
    'Status',
    'Price/Month',
    'Billing Cycle',
    'Current Period Start',
    'Current Period End',
    'Usage',
    'Next Billing',
    'Stripe Subscription ID',
  ];

  const rows = subscriptions.map((sub) => [
    sub.providerName,
    sub.providerEmail,
    TIER_CONFIG[sub.tier]?.label || sub.tier,
    STATUS_CONFIG[sub.status]?.label || sub.status,
    `${sub.amount} ${sub.currency}`,
    sub.billingPeriod,
    formatDate(sub.startDate),
    formatDate(sub.endDate),
    `${sub.aiCallsUsed}/${sub.aiCallsLimit === -1 ? 'Unlimited' : sub.aiCallsLimit}`,
    sub.nextBillingDate ? formatDate(sub.nextBillingDate) : 'N/A',
    sub.stripeSubscriptionId || 'N/A',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `subscriptions_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

const exportToExcel = (subscriptions: SubscriptionRecord[]): void => {
  // For Excel, we use CSV with a different extension that Excel can open
  // A proper Excel export would require a library like xlsx
  exportToCSV(subscriptions);
  // Rename the file extension hint
  const blob = new Blob([generateCSVContent(subscriptions)], { type: 'application/vnd.ms-excel' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `subscriptions_${new Date().toISOString().split('T')[0]}.xls`;
  link.click();
};

const generateCSVContent = (subscriptions: SubscriptionRecord[]): string => {
  const headers = ['User Name', 'Email', 'Plan', 'Status', 'Price/Month', 'Billing Cycle', 'Period Start', 'Period End', 'Usage', 'Next Billing'];
  const rows = subscriptions.map((sub) => [
    sub.providerName,
    sub.providerEmail,
    TIER_CONFIG[sub.tier]?.label || sub.tier,
    STATUS_CONFIG[sub.status]?.label || sub.status,
    `${sub.amount} ${sub.currency}`,
    sub.billingPeriod,
    formatDate(sub.startDate),
    formatDate(sub.endDate),
    `${sub.aiCallsUsed}/${sub.aiCallsLimit === -1 ? 'Unlimited' : sub.aiCallsLimit}`,
    sub.nextBillingDate ? formatDate(sub.nextBillingDate) : 'N/A',
  ]);
  return [headers.join('\t'), ...rows.map((row) => row.join('\t'))].join('\n');
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: { value: number; label: string };
  color: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, subValue, trend, color, loading }) => (
  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
    <div className="flex items-center justify-between mb-3">
      <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
      {trend && (
        <div className={cn('flex items-center gap-1 text-sm', trend.value >= 0 ? 'text-green-600' : 'text-red-600')}>
          {trend.value >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{trend.value >= 0 ? '+' : ''}{trend.value}%</span>
        </div>
      )}
    </div>
    {loading ? (
      <div className="h-8 bg-gray-200 rounded animate-pulse mb-1" />
    ) : (
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    )}
    <div className="text-sm text-gray-500">{label}</div>
    {subValue && <div className="text-xs text-gray-400 mt-1">{subValue}</div>}
  </div>
);

// ============================================================================
// SUBSCRIPTION DETAIL PANEL COMPONENT
// ============================================================================

interface DetailPanelProps {
  subscription: SubscriptionRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: (action: string, subscriptionId: string) => void;
}

const SubscriptionDetailPanel: React.FC<DetailPanelProps> = ({ subscription, isOpen, onClose, onAction }) => {
  const intl = useIntl();

  if (!subscription) return null;

  const statusConfig = STATUS_CONFIG[subscription.status];
  const tierConfig = TIER_CONFIG[subscription.tier];
  const usagePercentage = getUsagePercentage(subscription.aiCallsUsed, subscription.aiCallsLimit);

  return (
    <div
      className={cn(
        'fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out',
        isOpen ? 'translate-x-0' : 'translate-x-full'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-lg font-semibold text-gray-900">
          <FormattedMessage id="admin.finance.subscriptions.details.title" defaultMessage="Subscription Details" />
        </h2>
        <button
          onClick={onClose}
          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto h-[calc(100vh-64px)] p-6">
        {/* User Info */}
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl">
            {subscription.providerName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{subscription.providerName}</h3>
            <p className="text-sm text-gray-500">{subscription.providerEmail}</p>
            <span className={cn('text-xs px-2 py-0.5 rounded mt-1 inline-block', tierConfig?.bgColor, tierConfig?.color)}>
              {tierConfig?.label}
            </span>
          </div>
        </div>

        {/* Status & Plan */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <span className={cn('px-2 py-1 rounded text-sm flex items-center gap-1 w-fit', statusConfig?.bgColor, statusConfig?.color)}>
              {statusConfig?.icon}
              {statusConfig?.label}
            </span>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-xs text-gray-500 mb-1">Price</div>
            <div className="font-semibold text-gray-900">{formatCurrency(subscription.amount, subscription.currency)}/mo</div>
            <div className="text-xs text-gray-500">{subscription.billingPeriod === 'yearly' ? 'Billed annually' : 'Billed monthly'}</div>
          </div>
        </div>

        {/* Current Period */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Current Period
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Start</span>
              <span className="font-medium">{formatDate(subscription.startDate)}</span>
            </div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">End</span>
              <span className="font-medium">{formatDate(subscription.endDate)}</span>
            </div>
            {subscription.nextBillingDate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Next Billing</span>
                <span className="font-medium">{formatDate(subscription.nextBillingDate)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Usage */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Usage This Period
          </h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">AI Calls Used</span>
              <span className="font-medium">
                {subscription.aiCallsUsed} / {subscription.aiCallsLimit === -1 ? 'Unlimited' : subscription.aiCallsLimit}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all duration-500', getUsageColor(usagePercentage))}
                style={{ width: `${usagePercentage}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">{Math.round(usagePercentage)}% of quota used</div>
          </div>
        </div>

        {/* Usage Chart Placeholder */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Usage Over Time</h4>
          <div className="bg-gray-50 rounded-lg p-4 h-40 flex items-center justify-center text-gray-400">
            <Activity className="w-8 h-8 mr-2" />
            <span className="text-sm">Usage chart placeholder</span>
          </div>
        </div>

        {/* Invoices */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Recent Invoices
          </h4>
          <div className="space-y-2">
            {subscription.invoices && subscription.invoices.length > 0 ? (
              subscription.invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <div className="text-sm font-medium">{invoice.invoiceNumber}</div>
                    <div className="text-xs text-gray-500">{formatDate(invoice.createdAt)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium">{formatCurrency(invoice.amount, invoice.currency as Currency)}</span>
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded',
                      invoice.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                    )}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">No invoices yet</div>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            Payment History
          </h4>
          <div className="space-y-2">
            {subscription.paymentHistory && subscription.paymentHistory.length > 0 ? (
              subscription.paymentHistory.slice(0, 5).map((payment) => (
                <div key={payment.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                  <div>
                    <div className="text-sm font-medium">{formatCurrency(payment.amount, payment.currency as Currency)}</div>
                    <div className="text-xs text-gray-500">{formatDate(payment.createdAt)}</div>
                  </div>
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded',
                    payment.status === 'succeeded' ? 'bg-green-100 text-green-700' :
                    payment.status === 'failed' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {payment.status}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-gray-500 text-center py-4">No payment history</div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-gray-200 pt-6">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            {subscription.status === 'active' && (
              <>
                <button
                  onClick={() => onAction('pause', subscription.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={() => onAction('cancel', subscription.id)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  Cancel
                </button>
              </>
            )}
            {subscription.status === 'paused' && (
              <button
                onClick={() => onAction('resume', subscription.id)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
            )}
            <button
              onClick={() => onAction('upgrade', subscription.id)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              <ArrowUpCircle className="w-4 h-4" />
              Upgrade
            </button>
            <button
              onClick={() => onAction('downgrade', subscription.id)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-lg hover:bg-amber-100 transition-colors"
            >
              <ArrowDownCircle className="w-4 h-4" />
              Downgrade
            </button>
            <button
              onClick={() => onAction('addCredits', subscription.id)}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors col-span-2"
            >
              <Plus className="w-4 h-4" />
              Add Credits
            </button>
          </div>
        </div>

        {/* Stripe Links */}
        {subscription.stripeSubscriptionId && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex gap-3">
              <a
                href={`https://dashboard.stripe.com/subscriptions/${subscription.stripeSubscriptionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
              >
                <ExternalLink className="w-4 h-4" />
                View in Stripe
              </a>
              {subscription.stripeCustomerId && (
                <a
                  href={`https://dashboard.stripe.com/customers/${subscription.stripeCustomerId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  <CreditCard className="w-4 h-4" />
                  Customer
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const Subscriptions: React.FC = () => {
  const intl = useIntl();

  // COST OPTIMIZATION: Use shared admin reference data cache
  const { usersMap, profilesMap, plansMap, isLoading: refDataLoading } = useAdminReferenceData();

  // State
  const [subscriptions, setSubscriptions] = useState<SubscriptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SubscriptionStats>({
    activeCount: 0,
    mrr: 0,
    churnRate: 0,
    trialConversionRate: 0,
    trialingCount: 0,
    pastDueCount: 0,
    canceledCount: 0,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all');
  const [billingFilter, setBillingFilter] = useState<BillingFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('period');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Pagination - P2 FIX: Configurable page size
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  const [totalFetched, setTotalFetched] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Detail panel
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // ============================================================================
  // DATA LOADING
  // ============================================================================

  const loadSubscriptions = useCallback(async () => {
    // Wait for reference data to be loaded
    if (refDataLoading || profilesMap.size === 0) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step 1: Load subscriptions from Firestore
      console.log('[Subscriptions] Step 1: Loading subscriptions...');
      let snapshot;
      try {
        // P2 FIX: Increased limit for larger datasets
        const subsQuery = query(
          collection(db, 'subscriptions'),
          orderBy('createdAt', 'desc'),
          limit(FIRESTORE_FETCH_LIMIT)
        );
        snapshot = await getDocs(subsQuery);
        setTotalFetched(snapshot.docs.length);
        console.log(`[Subscriptions] Step 1 OK: ${snapshot.docs.length} subscriptions loaded (limit: ${FIRESTORE_FETCH_LIMIT})`);
      } catch (e) {
        console.error('[Subscriptions] Step 1 FAILED - subscriptions query:', e);
        throw new Error(`Failed to load subscriptions: ${(e as Error).message}`);
      }

      // COST OPTIMIZATION: Steps 2-4 now use shared admin reference data cache
      // This eliminates 3 Firestore queries per page load (profiles, users, plans)
      console.log('[Subscriptions] Using cached reference data from useAdminReferenceData');

      // Transform subscriptions using cached data
      const subsList: SubscriptionRecord[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const providerId = data.providerId || docSnap.id;

        // Use cached profile data, fallback to cached user data
        const cachedProfile = profilesMap.get(providerId);
        const cachedUser = usersMap.get(providerId);
        const cachedPlan = plansMap.get(data.planId);

        const providerInfo = cachedProfile ? {
          name: cachedProfile.displayName || 'Unknown',
          email: cachedProfile.email || '',
          type: (cachedProfile.type === 'lawyer' ? 'lawyer' : 'expat_aidant') as 'lawyer' | 'expat_aidant',
        } : cachedUser ? {
          name: cachedUser.displayName || 'Unknown',
          email: cachedUser.email || '',
          type: (cachedUser.type === 'lawyer' ? 'lawyer' : 'expat_aidant') as 'lawyer' | 'expat_aidant',
        } : null;

        const startDate = data.currentPeriodStart?.toDate?.() || data.createdAt?.toDate?.() || new Date();
        const endDate = data.currentPeriodEnd?.toDate?.() || new Date();

        return {
          id: docSnap.id,
          providerId,
          providerName: providerInfo?.name || 'Unknown',
          providerEmail: providerInfo?.email || '',
          providerAvatar: undefined, // Avatar not cached in shared reference data
          providerType: providerInfo?.type || 'expat_aidant',
          planId: data.planId || '',
          planName: cachedPlan?.name || data.tier || 'Unknown',
          tier: (data.tier || 'trial') as SubscriptionTier,
          status: (data.status || 'active') as SubscriptionStatus,
          billingPeriod: (data.billingPeriod || 'monthly') as BillingPeriod,
          currency: (data.currency || 'EUR') as Currency,
          amount: data.currentPeriodAmount || 0,
          startDate,
          endDate,
          nextBillingDate: data.cancelAtPeriodEnd ? undefined : endDate,
          canceledAt: data.canceledAt?.toDate?.(),
          pausedAt: data.pausedAt?.toDate?.(),
          stripeSubscriptionId: data.stripeSubscriptionId,
          stripeCustomerId: data.stripeCustomerId,
          aiCallsUsed: data.aiCallsUsed || 0,
          aiCallsLimit: data.aiCallsLimit || (data.tier === 'unlimited' ? -1 : 10),
          invoices: [],
          paymentHistory: [],
          usageHistory: [],
          createdAt: data.createdAt?.toDate?.() || new Date(),
        };
      });

      setSubscriptions(subsList);

      // Calculate stats
      const activeCount = subsList.filter((s) => s.status === 'active').length;
      const trialingCount = subsList.filter((s) => s.status === 'trialing').length;
      const pastDueCount = subsList.filter((s) => s.status === 'past_due').length;
      const canceledCount = subsList.filter((s) => s.status === 'cancelled' || s.status === 'canceled' || s.status === 'expired').length;

      // Calculate MRR
      const mrr = subsList
        .filter((s) => s.status === 'active')
        .reduce((acc, s) => {
          const monthlyAmount = s.billingPeriod === 'yearly' ? s.amount / 12 : s.amount;
          return acc + monthlyAmount;
        }, 0);

      // Calculate churn rate (canceled in last 30 days / active at start of period)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCanceled = subsList.filter(
        (s) => s.canceledAt && s.canceledAt > thirtyDaysAgo
      ).length;
      const churnRate = activeCount > 0 ? (recentCanceled / (activeCount + recentCanceled)) * 100 : 0;

      // Calculate trial conversion rate
      const convertedTrials = subsList.filter(
        (s) => s.status === 'active' && s.tier !== 'trial'
      ).length;
      const totalTrials = subsList.filter(
        (s) => s.status === 'trialing' || (s.status === 'active' && s.tier !== 'trial')
      ).length;
      const trialConversionRate = totalTrials > 0 ? (convertedTrials / totalTrials) * 100 : 0;

      setStats({
        activeCount,
        mrr: Math.round(mrr * 100) / 100,
        churnRate: Math.round(churnRate * 10) / 10,
        trialConversionRate: Math.round(trialConversionRate * 10) / 10,
        trialingCount,
        pastDueCount,
        canceledCount,
      });
    } catch (err) {
      console.error('Error loading subscriptions:', err);
      setError((err as Error).message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [refDataLoading, profilesMap, usersMap, plansMap]);

  useEffect(() => {
    loadSubscriptions();
  }, [loadSubscriptions]);

  // ============================================================================
  // FILTERING & SORTING
  // ============================================================================

  const filteredSubscriptions = useMemo(() => {
    let result = subscriptions;

    // Status filter
    if (statusFilter !== 'all') {
      result = result.filter((s) => {
        if (statusFilter === 'cancelled') {
          return s.status === 'cancelled' || s.status === 'canceled';
        }
        return s.status === statusFilter;
      });
    }

    // Plan filter
    if (planFilter !== 'all') {
      if (planFilter === 'free') {
        result = result.filter((s) => s.tier === 'trial');
      } else if (planFilter === 'basic') {
        result = result.filter((s) => s.tier === 'basic');
      } else if (planFilter === 'premium') {
        result = result.filter((s) => s.tier === 'standard' || s.tier === 'pro');
      } else if (planFilter === 'enterprise') {
        result = result.filter((s) => s.tier === 'unlimited');
      } else {
        result = result.filter((s) => s.tier === planFilter);
      }
    }

    // Billing filter
    if (billingFilter !== 'all') {
      result = result.filter((s) => s.billingPeriod === billingFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.providerName.toLowerCase().includes(query) ||
          s.providerEmail.toLowerCase().includes(query)
      );
    }

    // Sorting
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'user':
          comparison = a.providerName.localeCompare(b.providerName);
          break;
        case 'plan':
          comparison = a.tier.localeCompare(b.tier);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'price':
          comparison = a.amount - b.amount;
          break;
        case 'period':
          comparison = a.startDate.getTime() - b.startDate.getTime();
          break;
        case 'usage':
          const usageA = a.aiCallsLimit === -1 ? a.aiCallsUsed : (a.aiCallsUsed / a.aiCallsLimit) * 100;
          const usageB = b.aiCallsLimit === -1 ? b.aiCallsUsed : (b.aiCallsUsed / b.aiCallsLimit) * 100;
          comparison = usageA - usageB;
          break;
        case 'nextBilling':
          const dateA = a.nextBillingDate?.getTime() || 0;
          const dateB = b.nextBillingDate?.getTime() || 0;
          comparison = dateA - dateB;
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [subscriptions, statusFilter, planFilter, billingFilter, searchQuery, sortField, sortOrder]);

  // Pagination - P2 FIX: Use configurable pageSize
  const totalPages = Math.ceil(filteredSubscriptions.length / pageSize);
  const paginatedSubscriptions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSubscriptions.slice(start, start + pageSize);
  }, [filteredSubscriptions, currentPage, pageSize]);

  // P2 FIX: Reset to page 1 when pageSize changes
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === paginatedSubscriptions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedSubscriptions.map((s) => s.id)));
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleViewDetails = (subscription: SubscriptionRecord) => {
    setSelectedSubscription(subscription);
    setIsDetailOpen(true);
  };

  // AUDIT-FIX C1: adminCancelSubscription, pauseSubscription, resumeSubscription do NOT exist in backend
  const handleAction = async (action: string, _subscriptionId: string) => {
    switch (action) {
      case 'cancel':
      case 'pause':
      case 'resume':
        toast.error(`Fonction non disponible : action "${action}" n'est pas implémentée côté backend. Utilisez le portail Stripe.`);
        return;
      case 'upgrade':
      case 'downgrade':
        toast.error(`Pour ${action === 'upgrade' ? 'upgrader' : 'downgrader'}, veuillez utiliser le portail Stripe.`);
        return;
      default:
        console.warn(`Unknown action: ${action}`);
        return;
    }
  };

  const handleBulkAction = async (action: 'cancel' | 'sendReminder') => {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      action === 'cancel'
        ? `Are you sure you want to cancel ${selectedIds.size} subscription(s)?`
        : `Send reminder emails to ${selectedIds.size} user(s)?`
    );

    if (!confirmed) return;

    try {
      const { httpsCallable } = await import('firebase/functions');
      const { functions } = await import('@/config/firebase');

      const idsArray = Array.from(selectedIds);
      let successCount = 0;
      let errorCount = 0;

      if (action === 'cancel') {
        // AUDIT-FIX C1: "adminCancelSubscription" does NOT exist in backend
        toast.error('Fonction non disponible : adminCancelSubscription n\'est pas implémentée côté backend. Utilisez le portail Stripe.');
        return;
      } else if (action === 'sendReminder') {
        // Send reminder via enqueueMessageEvent callable (bypasses Firestore rules)
        const { httpsCallable } = await import('firebase/functions');
        const { functions } = await import('@/config/firebase');
        const enqueueFn = httpsCallable(functions, 'enqueueMessageEvent');

        for (const subscriptionId of idsArray) {
          const subscription = filteredSubscriptions.find((s) => s.id === subscriptionId);
          if (subscription?.providerId) {
            try {
              await enqueueFn({
                eventId: 'subscription.reminder',
                to: { uid: subscription.providerId },
                context: { user: { uid: subscription.providerId } },
              });
              successCount++;
            } catch {
              errorCount++;
            }
          }
        }
      }

      toast.success(`${successCount} action(s) réussie(s), ${errorCount} erreur(s)`);
      setSelectedIds(new Set());
      await loadSubscriptions();
    } catch (err) {
      console.error('Bulk action failed:', err);
      toast.error(`Erreur: ${(err as Error).message}`);
    }
  };

  // Quick stats for selected rows
  const selectedStats = useMemo(() => {
    const selected = filteredSubscriptions.filter((s) => selectedIds.has(s.id));
    return {
      count: selected.length,
      totalMrr: selected.reduce((acc, s) => {
        const monthly = s.billingPeriod === 'yearly' ? s.amount / 12 : s.amount;
        return acc + monthly;
      }, 0),
    };
  }, [filteredSubscriptions, selectedIds]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <AdminLayout>
      <div className="p-6 min-h-screen bg-gray-50">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              <FormattedMessage id="admin.finance.subscriptions.title" defaultMessage="Subscriptions Management" />
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              <FormattedMessage
                id="admin.finance.subscriptions.subtitle"
                defaultMessage="Manage all IA subscriptions and billing"
              />
            </p>
          </div>
          <button
            onClick={loadSubscriptions}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            <FormattedMessage id="admin.finance.subscriptions.refresh" defaultMessage="Refresh" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={<CreditCard className="w-5 h-5 text-green-600" />}
            label={intl.formatMessage({ id: 'admin.finance.subscriptions.stats.active', defaultMessage: 'Active Subscriptions' })}
            value={stats.activeCount}
            color="bg-green-100"
            loading={loading}
          />
          <StatCard
            icon={<DollarSign className="w-5 h-5 text-emerald-600" />}
            label={intl.formatMessage({ id: 'admin.finance.subscriptions.stats.mrr', defaultMessage: 'MRR' })}
            value={formatCurrency(stats.mrr)}
            subValue={intl.formatMessage({ id: 'admin.finance.subscriptions.stats.mrrSub', defaultMessage: 'Monthly Recurring Revenue' })}
            color="bg-emerald-100"
            loading={loading}
          />
          <StatCard
            icon={<TrendingDown className="w-5 h-5 text-red-600" />}
            label={intl.formatMessage({ id: 'admin.finance.subscriptions.stats.churn', defaultMessage: 'Churn Rate (30d)' })}
            value={`${stats.churnRate}%`}
            color="bg-red-100"
            loading={loading}
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
            label={intl.formatMessage({ id: 'admin.finance.subscriptions.stats.conversion', defaultMessage: 'Trial Conversions' })}
            value={`${stats.trialConversionRate}%`}
            color="bg-blue-100"
            loading={loading}
          />
        </div>

        {/* Filters Section */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={intl.formatMessage({ id: 'admin.finance.subscriptions.search', defaultMessage: 'Search by name or email...' })}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.allStatus', defaultMessage: 'All Status' })}</option>
              <option value="active">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.active', defaultMessage: 'Active' })}</option>
              <option value="trialing">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.trialing', defaultMessage: 'Trialing' })}</option>
              <option value="past_due">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.pastDue', defaultMessage: 'Past Due' })}</option>
              <option value="cancelled">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.canceled', defaultMessage: 'Canceled' })}</option>
            </select>

            {/* Plan Filter */}
            <select
              value={planFilter}
              onChange={(e) => {
                setPlanFilter(e.target.value as PlanFilter);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.allPlans', defaultMessage: 'All Plans' })}</option>
              <option value="free">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.free', defaultMessage: 'Free' })}</option>
              <option value="basic">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.basic', defaultMessage: 'Basic' })}</option>
              <option value="premium">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.premium', defaultMessage: 'Premium' })}</option>
              <option value="enterprise">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.enterprise', defaultMessage: 'Enterprise' })}</option>
            </select>

            {/* Billing Filter */}
            <select
              value={billingFilter}
              onChange={(e) => {
                setBillingFilter(e.target.value as BillingFilter);
                setCurrentPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
            >
              <option value="all">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.allBilling', defaultMessage: 'All Billing' })}</option>
              <option value="monthly">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.monthly', defaultMessage: 'Monthly' })}</option>
              <option value="yearly">{intl.formatMessage({ id: 'admin.finance.subscriptions.filter.yearly', defaultMessage: 'Yearly' })}</option>
            </select>

            {/* Export Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => exportToCSV(filteredSubscriptions)}
                className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                CSV
              </button>
              <button
                onClick={() => exportToExcel(filteredSubscriptions)}
                className="flex items-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                <Download className="w-4 h-4" />
                Excel
              </button>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-500">
            <FormattedMessage
              id="admin.finance.subscriptions.resultsCount"
              defaultMessage="{count} subscription(s) found"
              values={{ count: filteredSubscriptions.length }}
            />
          </div>
        </div>

        {/* Bulk Actions & Selected Stats */}
        {selectedIds.size > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-medium text-indigo-700">
                {selectedIds.size} selected
              </span>
              <span className="text-sm text-indigo-600">
                Total MRR: {formatCurrency(selectedStats.totalMrr)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleBulkAction('sendReminder')}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-indigo-700 border border-indigo-300 rounded-lg hover:bg-indigo-50 transition-colors text-sm"
              >
                <Mail className="w-4 h-4" />
                Send Reminder
              </button>
              <button
                onClick={() => handleBulkAction('cancel')}
                className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                <XCircle className="w-4 h-4" />
                Cancel Selected
              </button>
            </div>
          </div>
        )}

        {/* Subscriptions Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={handleSelectAll}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      {selectedIds.size === paginatedSubscriptions.length && paginatedSubscriptions.length > 0 ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('user')}
                  >
                    <div className="flex items-center gap-1">
                      User
                      {sortField === 'user' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('plan')}
                  >
                    <div className="flex items-center gap-1">
                      Plan
                      {sortField === 'plan' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {sortField === 'status' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('price')}
                  >
                    <div className="flex items-center gap-1">
                      Price/Month
                      {sortField === 'price' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('period')}
                  >
                    <div className="flex items-center gap-1">
                      Current Period
                      {sortField === 'period' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('usage')}
                  >
                    <div className="flex items-center gap-1">
                      Usage
                      {sortField === 'usage' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('nextBilling')}
                  >
                    <div className="flex items-center gap-1">
                      Next Billing
                      {sortField === 'nextBilling' && (
                        sortOrder === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  // Loading skeleton
                  Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="px-4 py-4"><div className="w-4 h-4 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full" />
                          <div>
                            <div className="h-4 w-32 bg-gray-200 rounded mb-1" />
                            <div className="h-3 w-40 bg-gray-100 rounded" />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4"><div className="h-6 w-16 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="h-6 w-20 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-16 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-32 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="h-4 w-20 bg-gray-200 rounded" /></td>
                      <td className="px-4 py-4"><div className="h-8 w-24 bg-gray-200 rounded" /></td>
                    </tr>
                  ))
                ) : paginatedSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                      <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>
                        <FormattedMessage
                          id="admin.finance.subscriptions.noResults"
                          defaultMessage="No subscriptions found"
                        />
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedSubscriptions.map((sub) => {
                    const statusConfig = STATUS_CONFIG[sub.status];
                    const tierConfig = TIER_CONFIG[sub.tier];
                    const usagePercentage = getUsagePercentage(sub.aiCallsUsed, sub.aiCallsLimit);

                    return (
                      <tr
                        key={sub.id}
                        className={cn(
                          'hover:bg-gray-50 transition-colors cursor-pointer',
                          selectedIds.has(sub.id) && 'bg-indigo-50'
                        )}
                        onClick={() => handleViewDetails(sub)}
                      >
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleSelectOne(sub.id)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            {selectedIds.has(sub.id) ? (
                              <CheckSquare className="w-4 h-4 text-indigo-600" />
                            ) : (
                              <Square className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-medium">
                              {sub.providerName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{sub.providerName}</div>
                              <div className="text-sm text-gray-500">{sub.providerEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn('px-2 py-1 rounded text-sm', tierConfig?.bgColor, tierConfig?.color)}>
                            {tierConfig?.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn('px-2 py-1 rounded text-sm flex items-center gap-1 w-fit', statusConfig?.bgColor, statusConfig?.color)}>
                            {statusConfig?.icon}
                            {statusConfig?.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-gray-900">{formatCurrency(sub.amount, sub.currency)}</div>
                          <div className="text-xs text-gray-500">
                            {sub.billingPeriod === 'yearly' ? 'Yearly' : 'Monthly'}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-700">
                            {formatDate(sub.startDate)} - {formatDate(sub.endDate)}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="w-32">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500">{sub.aiCallsUsed}</span>
                              <span className="text-gray-400">
                                {sub.aiCallsLimit === -1 ? 'Unlimited' : sub.aiCallsLimit}
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full transition-all', getUsageColor(usagePercentage))}
                                style={{ width: `${usagePercentage}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {sub.nextBillingDate ? (
                            <span className="text-sm text-gray-700">{formatDate(sub.nextBillingDate)}</span>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleViewDetails(sub)}
                              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction('cancel', sub.id)}
                              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Cancel"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction('upgrade', sub.id)}
                              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Upgrade"
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAction('downgrade', sub.id)}
                              className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                              title="Downgrade"
                            >
                              <ArrowDownCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination - P2 FIX: Enhanced with page size selector */}
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            {/* Left: Info and page size selector */}
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                <FormattedMessage
                  id="admin.finance.subscriptions.showing"
                  defaultMessage="Showing {start}-{end} of {total}"
                  values={{
                    start: Math.min((currentPage - 1) * pageSize + 1, filteredSubscriptions.length),
                    end: Math.min(currentPage * pageSize, filteredSubscriptions.length),
                    total: filteredSubscriptions.length,
                  }}
                />
                {totalFetched >= FIRESTORE_FETCH_LIMIT && (
                  <span className="ml-2 text-amber-600" title="More subscriptions may exist">
                    (limit: {FIRESTORE_FETCH_LIMIT})
                  </span>
                )}
              </div>
              {/* Page size selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">
                  <FormattedMessage id="admin.finance.subscriptions.perPage" defaultMessage="Per page:" />
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: Pagination controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 mr-2">
                  <FormattedMessage
                    id="admin.finance.subscriptions.pagination"
                    defaultMessage="Page {current} of {total}"
                    values={{ current: currentPage, total: totalPages }}
                  />
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={cn(
                        'w-8 h-8 rounded-lg text-sm font-medium transition-colors',
                        currentPage === pageNum
                          ? 'bg-indigo-600 text-white'
                          : 'text-gray-500 hover:bg-gray-100'
                      )}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Subscription Detail Panel */}
        <SubscriptionDetailPanel
          subscription={selectedSubscription}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
          onAction={handleAction}
        />

        {/* Overlay for detail panel */}
        {isDetailOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setIsDetailOpen(false)}
          />
        )}
      </div>
    </AdminLayout>
  );
};

export default Subscriptions;

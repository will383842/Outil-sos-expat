/**
 * AdminPartnerDetail - Premium 2026 partner detail page with 5 tabs
 *
 * Tabs: Overview, Commissions, Clicks, Withdrawals, Settings
 * Actions: status change, issue manual commission, edit config, toggle visibility
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useParams, useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate, functions } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  MousePointerClick,
  Phone,
  TrendingUp,
  Eye,
  EyeOff,
  Play,
  Pause,
  Ban,
  Check,
  X,
  Download,
  Copy,
  Globe,
  ExternalLink,
  Settings,
  BarChart3,
  Wallet,
  Save,
  Info,
  Plus,
  User,
  Mail,
  Calendar,
  Clock,
  FileText,
  Shield,
  Link2,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';
import { copyToClipboard as clipboardCopy } from '@/utils/clipboard';

// ============================================================================
// DESIGN TOKENS — Teal/Emerald theme for Partners (Premium 2026)
// ============================================================================

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    success: "bg-green-600 hover:bg-green-700 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    warning: "bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-xl px-4 py-2 transition-all active:scale-[0.98]",
    ghost: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 rounded-xl px-4 py-2 transition-all",
  },
  input: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 dark:text-white transition-all",
  select: "w-full px-4 py-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-gray-900 dark:text-white",
  label: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5",
  badge: {
    active: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    suspended: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    banned: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    pending: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    validated: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    available: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    paid: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    cancelled: "bg-gray-100 dark:bg-gray-700/30 text-gray-600 dark:text-gray-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    completed: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    processing: "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    rejected: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    failed: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    client_referral: "bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
    manual_adjustment: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2.5 py-0.5 rounded-full text-xs font-medium",
  },
} as const;

type TabId = 'overview' | 'commissions' | 'clicks' | 'withdrawals' | 'settings';

// ============================================================================
// TYPES
// ============================================================================

interface PartnerDetail {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country: string;
  language: string;
  websiteUrl: string;
  websiteName: string;
  websiteDescription?: string;
  websiteCategory: string;
  websiteTraffic?: string;
  websiteLogo?: string;
  affiliateCode: string;
  affiliateLink: string;
  status: 'active' | 'suspended' | 'banned';
  isVisible: boolean;
  totalEarned: number;
  availableBalance: number;
  pendingBalance: number;
  validatedBalance: number;
  totalWithdrawn: number;
  totalClicks: number;
  totalClients: number;
  totalCalls: number;
  conversionRate: number;
  currentMonthStats: {
    clicks: number;
    clients: number;
    calls: number;
    earnings: number;
    month: string;
  };
  commissionConfig: CommissionConfig;
  discountConfig?: DiscountConfig;
  contractStartDate?: string;
  contractEndDate?: string;
  contractNotes?: string;
  adminNotes?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  companyName?: string;
  companyAddress?: string;
  vatNumber?: string;
  lastLoginAt?: string;
  createdAt: string;
}

interface CommissionConfig {
  commissionPerCallLawyer: number;
  commissionPerCallExpat: number;
  usePercentage: boolean;
  commissionPercentage?: number;
  holdPeriodDays: number;
  releaseDelayHours: number;
  minimumCallDuration: number;
}

interface DiscountConfig {
  isActive: boolean;
  type: 'fixed' | 'percentage';
  value: number;
  maxDiscountCents?: number;
  label?: string;
  labelTranslations?: Record<string, string>;
  expiresAt?: string | null;
}

interface PartnerDetailResponse {
  partner: PartnerDetail;
  monthlyStats: Array<{ month: string; clicks: number; calls: number; earnings: number }>;
  recentCommissions: Array<{
    id: string;
    amount: number;
    status: string;
    type: string;
    description: string;
    createdAt: string;
    sourceDetails?: {
      clientEmail?: string;
      providerType?: string;
      callDuration?: number;
    };
  }>;
  recentClicks: Array<{
    id?: string;
    date: string;
    count: number;
    converted?: number;
    referrerUrl?: string;
    utmSource?: string;
    utmMedium?: string;
  }>;
  withdrawals: Array<{
    id: string;
    amount: number;
    withdrawalFee?: number;
    totalDebited?: number;
    status: string;
    paymentMethod?: string;
    createdAt: string;
    processedAt?: string;
    rejectionReason?: string;
  }>;
}

// ============================================================================
// STAT CARD
// ============================================================================

const StatCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  bgGrad: string;
  subValue?: string;
}> = ({ icon: Icon, label, value, color, bgGrad, subValue }) => (
  <div className={UI.card + ' p-5 relative overflow-hidden group'}>
    <div className={`absolute inset-0 bg-gradient-to-br ${bgGrad} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${bgGrad} flex items-center justify-center`}>
          <Icon className={`w-4 h-4 ${color}`} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        <FormattedMessage id={label} defaultMessage={label} />
      </p>
      {subValue && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subValue}</p>}
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const AdminPartnerDetail: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const { partnerId } = useParams<{ partnerId: string }>();
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PartnerDetailResponse | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Manual commission modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDescription, setManualDescription] = useState('');

  // Suspend modal
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState('');

  // Settings tab state
  const [editCommission, setEditCommission] = useState<CommissionConfig | null>(null);
  const [editDiscount, setEditDiscount] = useState<DiscountConfig | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const getBadgeClass = (status: string) => (UI.badge as Record<string, string>)[status] || UI.badge.pending;

  const fetchDetail = useCallback(async () => {
    if (!partnerId) return;
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<{ partnerId: string }, PartnerDetailResponse>(functionsAffiliate, 'adminPartnerDetail');
      const res = await fn({ partnerId });
      setData(res.data);
      setEditCommission(res.data.partner.commissionConfig);
      setEditDiscount(res.data.partner.discountConfig || null);
      setEditNotes(res.data.partner.adminNotes || '');
    } catch (err: any) {
      console.error('Error fetching partner detail:', err);
      setError(err.message || 'Failed to load partner');
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  // ---- ACTIONS ----

  const toggleStatus = async (newStatus: string, reason?: string) => {
    if (!data) return;
    setActionLoading('status');
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminTogglePartnerStatus');
      await fn({ partnerId, status: newStatus, reason });
      setData(prev => prev ? { ...prev, partner: { ...prev.partner, status: newStatus as any } } : null);
      toast.success(intl.formatMessage({ id: 'admin.partners.detail.statusUpdated', defaultMessage: 'Statut mis a jour' }));
      setShowSuspendModal(false);
      setSuspendReason('');
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleVisibility = async () => {
    if (!data) return;
    setActionLoading('visibility');
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminTogglePartnerVisibility');
      await fn({ partnerId, isVisible: !data.partner.isVisible });
      setData(prev => prev ? { ...prev, partner: { ...prev.partner, isVisible: !prev.partner.isVisible } } : null);
      toast.success(intl.formatMessage({ id: 'admin.partners.detail.visibilityUpdated', defaultMessage: 'Visibilite mise a jour' }));
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const issueManualCommission = async () => {
    const amountCents = Math.round(parseFloat(manualAmount) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error('Invalid amount');
      return;
    }
    setActionLoading('manual');
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminIssuePartnerManualCommission');
      await fn({ partnerId, amount: amountCents, description: manualDescription || 'Manual adjustment' });
      toast.success(intl.formatMessage({ id: 'admin.partners.detail.commissionIssued', defaultMessage: 'Commission emise' }));
      setShowManualModal(false);
      setManualAmount('');
      setManualDescription('');
      fetchDetail();
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const saveSettings = async () => {
    if (!editCommission) return;
    setSavingSettings(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminUpdatePartnerCommissionConfig');
      await fn({ partnerId, ...editCommission, adminNotes: editNotes, discountConfig: editDiscount });
      toast.success(intl.formatMessage({ id: 'admin.partners.detail.settingsSaved', defaultMessage: 'Parametres enregistres' }));
      fetchDetail();
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleExportCommissions = () => {
    if (!data) return;
    try {
      const { recentCommissions } = data;
      const header = ['Date','Type','Amount','Status','Description','Client Email','Provider Type','Duration'];
      const rows = recentCommissions.map(c => [
        c.createdAt,
        c.type,
        (c.amount / 100).toFixed(2),
        c.status,
        c.description,
        c.sourceDetails?.clientEmail || '',
        c.sourceDetails?.providerType || '',
        c.sourceDetails?.callDuration ?? '',
      ]);
      const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `partner-${data.partner.affiliateCode}-commissions.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Export failed');
    }
  };

  const handleWithdrawalAction = async (withdrawalId: string, action: 'approve' | 'reject') => {
    setActionLoading(withdrawalId);
    try {
      const fn = httpsCallable(functions, action === 'approve' ? 'paymentAdminApprove' : 'paymentAdminReject');
      await fn({ withdrawalId, partnerId });
      toast.success(action === 'approve'
        ? intl.formatMessage({ id: 'admin.partners.detail.withdrawalApproved', defaultMessage: 'Retrait approuve' })
        : intl.formatMessage({ id: 'admin.partners.detail.withdrawalRejected', defaultMessage: 'Retrait rejete' })
      );
      fetchDetail();
    } catch (err: any) {
      toast.error(err?.message || 'Error');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    clipboardCopy(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // ---- RENDER: LOADING/ERROR ----

  if (loading) {
    return (
      <AdminLayout>
        <div className="p-6 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 text-teal-500 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !data) {
    return (
      <AdminLayout>
        <div className="p-6 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 dark:text-red-400 mb-4">{error || 'Partner not found'}</p>
          <button onClick={fetchDetail} className={`${UI.button.secondary} inline-flex items-center gap-2`}>
            <RefreshCw className="w-4 h-4" />
            <FormattedMessage id="common.retry" defaultMessage="Reessayer" />
          </button>
        </div>
      </AdminLayout>
    );
  }

  const { partner, monthlyStats, recentCommissions, recentClicks, withdrawals } = data;

  const TABS: { id: TabId; labelId: string; defaultLabel: string; icon: React.ElementType }[] = [
    { id: 'overview', labelId: 'admin.partners.detail.tab.overview', defaultLabel: "Vue d'ensemble", icon: BarChart3 },
    { id: 'commissions', labelId: 'admin.partners.detail.tab.commissions', defaultLabel: 'Commissions', icon: DollarSign },
    { id: 'clicks', labelId: 'admin.partners.detail.tab.clicks', defaultLabel: 'Clics', icon: MousePointerClick },
    { id: 'withdrawals', labelId: 'admin.partners.detail.tab.withdrawals', defaultLabel: 'Retraits', icon: Wallet },
    { id: 'settings', labelId: 'admin.partners.detail.tab.settings', defaultLabel: 'Parametres', icon: Settings },
  ];

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* ====== HEADER ====== */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin/partners')} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">
              <ArrowLeft className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <div className="flex items-center gap-3">
              {partner.websiteLogo ? (
                <img src={partner.websiteLogo} alt="" className="w-11 h-11 rounded-xl object-contain border border-gray-200 dark:border-white/10" />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-teal-500" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">{partner.websiteName}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{partner.firstName} {partner.lastName}</span>
                  <span className="text-gray-300 dark:text-gray-600">|</span>
                  <code className="text-teal-600 dark:text-teal-400 font-mono text-xs">{partner.affiliateCode}</code>
                  <button onClick={() => copyToClipboard(partner.affiliateCode)} className="p-0.5 hover:text-teal-500 transition-colors">
                    {copiedCode ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className={getBadgeClass(partner.status) + ' self-center'}>{partner.status}</span>
            <button
              onClick={toggleVisibility}
              disabled={actionLoading === 'visibility'}
              className={`${UI.button.secondary} flex items-center gap-2 text-sm`}
            >
              {actionLoading === 'visibility' ? <Loader2 className="w-4 h-4 animate-spin" /> : partner.isVisible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {partner.isVisible
                ? intl.formatMessage({ id: 'admin.partners.detail.hide', defaultMessage: 'Masquer' })
                : intl.formatMessage({ id: 'admin.partners.detail.show', defaultMessage: 'Afficher' })}
            </button>
            {partner.status === 'active' ? (
              <button onClick={() => setShowSuspendModal(true)} disabled={actionLoading === 'status'} className={`${UI.button.warning} flex items-center gap-2 text-sm`}>
                {actionLoading === 'status' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pause className="w-4 h-4" />}
                <FormattedMessage id="admin.partners.detail.suspend" defaultMessage="Suspendre" />
              </button>
            ) : partner.status !== 'banned' ? (
              <button onClick={() => toggleStatus('active')} disabled={actionLoading === 'status'} className={`${UI.button.success} flex items-center gap-2 text-sm`}>
                {actionLoading === 'status' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                <FormattedMessage id="admin.partners.detail.activate" defaultMessage="Activer" />
              </button>
            ) : null}
            {partner.status !== 'banned' && (
              <button onClick={() => toggleStatus('banned')} disabled={actionLoading === 'status'} className={`${UI.button.danger} flex items-center gap-2 text-sm`}>
                <Ban className="w-4 h-4" />
                <FormattedMessage id="admin.partners.detail.ban" defaultMessage="Bannir" />
              </button>
            )}
            {partner.status === 'banned' && (
              <button onClick={() => toggleStatus('active')} disabled={actionLoading === 'status'} className={`${UI.button.success} flex items-center gap-2 text-sm`}>
                <Play className="w-4 h-4" />
                <FormattedMessage id="admin.partners.detail.unban" defaultMessage="Reactiver" />
              </button>
            )}
          </div>
        </div>

        {/* ====== TABS ====== */}
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          {TABS.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/50'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4" />
                <FormattedMessage id={tab.labelId} defaultMessage={tab.defaultLabel} />
              </button>
            );
          })}
        </div>

        {/* ==================== OVERVIEW TAB ==================== */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard icon={DollarSign} label="admin.partners.detail.totalEarned" value={formatAmount(partner.totalEarned)} color="text-teal-600 dark:text-teal-400" bgGrad="from-teal-500/20 to-emerald-500/20" subValue={`${intl.formatMessage({ id: 'admin.partners.detail.thisMonth', defaultMessage: 'Ce mois' })}: ${formatAmount(partner.currentMonthStats.earnings)}`} />
              <StatCard icon={Wallet} label="admin.partners.detail.availableBalance" value={formatAmount(partner.availableBalance)} color="text-green-600 dark:text-green-400" bgGrad="from-green-500/20 to-emerald-500/20" subValue={`${intl.formatMessage({ id: 'admin.partners.detail.pendingShort', defaultMessage: 'Pending' })}: ${formatAmount(partner.pendingBalance)}`} />
              <StatCard icon={MousePointerClick} label="admin.partners.detail.totalClicks" value={partner.totalClicks.toLocaleString()} color="text-blue-600 dark:text-blue-400" bgGrad="from-blue-500/20 to-indigo-500/20" subValue={`${intl.formatMessage({ id: 'admin.partners.detail.thisMonth', defaultMessage: 'Ce mois' })}: ${partner.currentMonthStats.clicks}`} />
              <StatCard icon={Phone} label="admin.partners.detail.totalCalls" value={partner.totalCalls.toLocaleString()} color="text-purple-600 dark:text-purple-400" bgGrad="from-purple-500/20 to-pink-500/20" subValue={`${intl.formatMessage({ id: 'admin.partners.detail.conversion', defaultMessage: 'Conversion' })}: ${(partner.conversionRate * 100).toFixed(1)}%`} />
            </div>

            {/* Balances + Quick info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Balances */}
              <div className={UI.card + ' p-6'}>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-teal-500" />
                  <FormattedMessage id="admin.partners.detail.balances" defaultMessage="Soldes" />
                </h3>
                <div className="space-y-3">
                  {[
                    { label: intl.formatMessage({ id: 'admin.partners.detail.pending', defaultMessage: 'En attente' }), value: partner.pendingBalance, color: 'text-amber-600 dark:text-amber-400' },
                    { label: intl.formatMessage({ id: 'admin.partners.detail.validated', defaultMessage: 'Valide' }), value: partner.validatedBalance, color: 'text-blue-600 dark:text-blue-400' },
                    { label: intl.formatMessage({ id: 'admin.partners.detail.available', defaultMessage: 'Disponible' }), value: partner.availableBalance, color: 'text-green-600 dark:text-green-400' },
                    { label: intl.formatMessage({ id: 'admin.partners.detail.withdrawn', defaultMessage: 'Retire' }), value: partner.totalWithdrawn, color: 'text-gray-500 dark:text-gray-400' },
                  ].map((b, i) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-white/5 last:border-0">
                      <span className="text-sm text-gray-500 dark:text-gray-400">{b.label}</span>
                      <span className={`font-semibold text-sm ${b.color}`}>{formatAmount(b.value)}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => setShowManualModal(true)} className={`${UI.button.primary} w-full mt-4 flex items-center justify-center gap-2 text-sm`}>
                  <Plus className="w-4 h-4" />
                  <FormattedMessage id="admin.partners.detail.manualCommission" defaultMessage="Commission manuelle" />
                </button>
              </div>

              {/* Partner Info */}
              <div className={UI.card + ' p-6'}>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-teal-500" />
                  <FormattedMessage id="admin.partners.detail.info" defaultMessage="Informations" />
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-3"><Mail className="w-4 h-4 text-gray-400 flex-shrink-0" /><span className="text-gray-700 dark:text-gray-300 truncate">{partner.email}</span></div>
                  {partner.phone && <div className="flex items-center gap-3"><Phone className="w-4 h-4 text-gray-400 flex-shrink-0" /><span className="text-gray-700 dark:text-gray-300">{partner.phone}</span></div>}
                  <div className="flex items-center gap-3"><Globe className="w-4 h-4 text-gray-400 flex-shrink-0" /><span className="text-gray-700 dark:text-gray-300">{partner.country} / {partner.language}</span></div>
                  <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" /><span className="text-gray-700 dark:text-gray-300">{new Date(partner.createdAt).toLocaleDateString(intl.locale, { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
                  {partner.lastLoginAt && <div className="flex items-center gap-3"><Clock className="w-4 h-4 text-gray-400 flex-shrink-0" /><span className="text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'admin.partners.detail.lastLogin', defaultMessage: 'Derniere connexion' })}: {new Date(partner.lastLoginAt).toLocaleDateString(intl.locale)}</span></div>}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5">
                  <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1.5">
                    {partner.websiteUrl} <ExternalLink className="w-3 h-3" />
                  </a>
                  <p className="text-xs text-gray-500 mt-1">{partner.websiteCategory}{partner.websiteTraffic ? ` - ${partner.websiteTraffic}` : ''}</p>
                </div>
              </div>

              {/* Commission Config + Company */}
              <div className={UI.card + ' p-6'}>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-teal-500" />
                  <FormattedMessage id="admin.partners.detail.commissionConfig" defaultMessage="Config commissions" />
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500"><FormattedMessage id="admin.partners.form.commissionLawyer" defaultMessage="Appel avocat" /></span><span className="font-medium text-gray-900 dark:text-white">{formatAmount(partner.commissionConfig.commissionPerCallLawyer)}/{intl.formatMessage({ id: 'common.call', defaultMessage: 'appel' })}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500"><FormattedMessage id="admin.partners.form.commissionExpat" defaultMessage="Appel expatrie" /></span><span className="font-medium text-gray-900 dark:text-white">{formatAmount(partner.commissionConfig.commissionPerCallExpat)}/{intl.formatMessage({ id: 'common.call', defaultMessage: 'appel' })}</span></div>
                  {partner.commissionConfig.usePercentage && (
                    <div className="flex justify-between"><span className="text-gray-500"><FormattedMessage id="admin.partners.form.usePercentage" defaultMessage="Pourcentage" /></span><span className="font-medium text-gray-900 dark:text-white">{partner.commissionConfig.commissionPercentage}%</span></div>
                  )}
                  <div className="flex justify-between"><span className="text-gray-500"><FormattedMessage id="admin.partners.detail.holdDays" defaultMessage="Retention" /></span><span className="font-medium text-gray-900 dark:text-white">{partner.commissionConfig.holdPeriodDays}j</span></div>
                  <div className="flex justify-between"><span className="text-gray-500"><FormattedMessage id="admin.partners.detail.minDuration" defaultMessage="Duree min." /></span><span className="font-medium text-gray-900 dark:text-white">{partner.commissionConfig.minimumCallDuration}s</span></div>
                </div>
                {partner.companyName && (
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/5 text-sm">
                    <p className="font-medium text-gray-900 dark:text-white">{partner.companyName}</p>
                    {partner.vatNumber && <p className="text-gray-500 text-xs mt-0.5">TVA: {partner.vatNumber}</p>}
                  </div>
                )}
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-gray-100 dark:bg-white/5 px-3 py-2 rounded-lg text-teal-600 dark:text-teal-400 font-mono truncate">{partner.affiliateLink}</code>
                    <button onClick={() => copyToClipboard(partner.affiliateLink)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors">
                      <Copy className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Monthly Chart */}
            {monthlyStats.length > 0 && (
              <div className={UI.card + ' p-6'}>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
                  <FormattedMessage id="admin.partners.detail.monthlyTrend" defaultMessage="Tendance mensuelle" />
                </h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyStats}>
                      <defs>
                        <linearGradient id="partnerTealGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="month" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} tickFormatter={(v) => `$${(v / 100).toFixed(0)}`} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', background: 'var(--tooltip-bg, rgba(255,255,255,0.95))' }} formatter={(value) => [`$${(Number(value) / 100).toFixed(2)}`, 'Earnings']} />
                      <Area type="monotone" dataKey="earnings" stroke="#14b8a6" fill="url(#partnerTealGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== COMMISSIONS TAB ==================== */}
        {activeTab === 'commissions' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                <FormattedMessage id="admin.partners.detail.commissions" defaultMessage="Commissions" />
                <span className="text-sm font-normal text-gray-500 ml-2">({recentCommissions.length})</span>
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setShowManualModal(true)} className={`${UI.button.primary} flex items-center gap-2 text-sm`}>
                  <Plus className="w-4 h-4" />
                  <FormattedMessage id="admin.partners.detail.issueCommission" defaultMessage="Emettre" />
                </button>
                <button onClick={handleExportCommissions} className={`${UI.button.secondary} flex items-center gap-2 text-sm`}>
                  <Download className="w-4 h-4" />
                  CSV
                </button>
              </div>
            </div>

            <div className={UI.card + ' overflow-hidden'}>
              {recentCommissions.length === 0 ? (
                <div className="p-12 text-center">
                  <DollarSign className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400"><FormattedMessage id="admin.partners.detail.noCommissions" defaultMessage="Aucune commission" /></p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.date" defaultMessage="Date" /></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.type" defaultMessage="Type" /></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.description" defaultMessage="Description" /></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.amount" defaultMessage="Montant" /></th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.status" defaultMessage="Statut" /></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {recentCommissions.map(c => (
                        <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{new Date(c.createdAt).toLocaleDateString(intl.locale)}</td>
                          <td className="px-4 py-3"><span className={getBadgeClass(c.type)}>{c.type === 'manual_adjustment' ? intl.formatMessage({ id: 'admin.partners.commission.manual', defaultMessage: 'Manuel' }) : intl.formatMessage({ id: 'admin.partners.commission.referral', defaultMessage: 'Referral' })}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 max-w-[250px] truncate">{c.description}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-right text-teal-600 dark:text-teal-400">{formatAmount(c.amount)}</td>
                          <td className="px-4 py-3 text-center"><span className={getBadgeClass(c.status)}>{c.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== CLICKS TAB ==================== */}
        {activeTab === 'clicks' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.partners.detail.clicksOverview" defaultMessage="Apercu des clics" />
            </h3>

            {/* Click stats cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={MousePointerClick} label="admin.partners.detail.totalClicks" value={partner.totalClicks.toLocaleString()} color="text-blue-600" bgGrad="from-blue-500/20 to-indigo-500/20" />
              <StatCard icon={TrendingUp} label="admin.partners.detail.conversion" value={`${(partner.conversionRate * 100).toFixed(1)}%`} color="text-teal-600" bgGrad="from-teal-500/20 to-emerald-500/20" />
              <StatCard icon={User} label="admin.partners.detail.totalClients" value={partner.totalClients.toLocaleString()} color="text-green-600" bgGrad="from-green-500/20 to-emerald-500/20" />
              <StatCard icon={Phone} label="admin.partners.detail.totalCalls" value={partner.totalCalls.toLocaleString()} color="text-purple-600" bgGrad="from-purple-500/20 to-pink-500/20" />
            </div>

            {recentClicks.length > 0 && (
              <div className={UI.card + ' p-6'}>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                  <FormattedMessage id="admin.partners.detail.clicksTrend" defaultMessage="Clics par jour" />
                </h4>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={recentClicks}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
                      <XAxis dataKey="date" stroke="#888" fontSize={11} />
                      <YAxis stroke="#888" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="count" name={intl.formatMessage({ id: 'admin.partners.detail.chart.clicks', defaultMessage: 'Clics' })} fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className={UI.card + ' overflow-hidden'}>
              {recentClicks.length === 0 ? (
                <div className="p-12 text-center">
                  <MousePointerClick className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400"><FormattedMessage id="admin.partners.detail.noClicks" defaultMessage="Aucun clic enregistre" /></p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.date" defaultMessage="Date" /></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.clicks" defaultMessage="Clics" /></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {recentClicks.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{c.date}</td>
                          <td className="px-4 py-3 text-sm font-medium text-right text-gray-900 dark:text-white">{c.count.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== WITHDRAWALS TAB ==================== */}
        {activeTab === 'withdrawals' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.partners.detail.withdrawalHistory" defaultMessage="Historique des retraits" />
              <span className="text-sm font-normal text-gray-500 ml-2">({withdrawals.length})</span>
            </h3>

            <div className={UI.card + ' overflow-hidden'}>
              {withdrawals.length === 0 ? (
                <div className="p-12 text-center">
                  <Wallet className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400"><FormattedMessage id="admin.partners.detail.noWithdrawals" defaultMessage="Aucun retrait" /></p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02]">
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.date" defaultMessage="Date" /></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.amount" defaultMessage="Montant" /></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.fee" defaultMessage="Frais" /></th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.method" defaultMessage="Methode" /></th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.status" defaultMessage="Statut" /></th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase"><FormattedMessage id="admin.partners.detail.table.actions" defaultMessage="Actions" /></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                      {withdrawals.map(w => (
                        <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.03] transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">{new Date(w.createdAt).toLocaleDateString(intl.locale)}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-right text-gray-900 dark:text-white">{formatAmount(w.amount)}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-500">{w.withdrawalFee ? formatAmount(w.withdrawalFee) : '-'}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{w.paymentMethod || '-'}</td>
                          <td className="px-4 py-3 text-center"><span className={getBadgeClass(w.status)}>{w.status}</span></td>
                          <td className="px-4 py-3 text-right">
                            {(w.status === 'pending' || w.status === 'processing') && (
                              <div className="flex gap-1.5 justify-end">
                                <button
                                  onClick={() => handleWithdrawalAction(w.id, 'approve')}
                                  disabled={actionLoading === w.id}
                                  className="p-1.5 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors"
                                  title={intl.formatMessage({ id: 'admin.partners.detail.approve', defaultMessage: 'Approuver' })}
                                >
                                  {actionLoading === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                </button>
                                <button
                                  onClick={() => handleWithdrawalAction(w.id, 'reject')}
                                  disabled={actionLoading === w.id}
                                  className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                  title={intl.formatMessage({ id: 'admin.partners.detail.reject', defaultMessage: 'Rejeter' })}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            {w.rejectionReason && (
                              <p className="text-xs text-gray-500 italic mt-1 max-w-[150px] truncate" title={w.rejectionReason}>{w.rejectionReason}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {activeTab === 'settings' && editCommission && (
          <div className="space-y-6 max-w-2xl">
            {/* Commission Config */}
            <div className={UI.card + ' p-6'}>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-teal-500" />
                <FormattedMessage id="admin.partners.detail.commissionConfig" defaultMessage="Configuration commissions" />
              </h3>

              <label className="flex items-center gap-3 cursor-pointer mb-5">
                <input
                  type="checkbox"
                  checked={editCommission.usePercentage}
                  onChange={(e) => setEditCommission(prev => prev ? { ...prev, usePercentage: e.target.checked } : null)}
                  className="w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <FormattedMessage id="admin.partners.detail.usePercentage" defaultMessage="Utiliser un pourcentage" />
                </span>
              </label>

              {editCommission.usePercentage ? (
                <div className="mb-5">
                  <label className={UI.label}><FormattedMessage id="admin.partners.detail.percentage" defaultMessage="Pourcentage (%)" /></label>
                  <input
                    type="number" step="0.1"
                    value={editCommission.commissionPercentage || 10}
                    onChange={(e) => setEditCommission(prev => prev ? { ...prev, commissionPercentage: Number(e.target.value) } : null)}
                    className={UI.input + ' max-w-xs'} min={1} max={50}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                  <div>
                    <label className={UI.label}><FormattedMessage id="admin.partners.detail.perCallLawyer" defaultMessage="Par appel Avocat (cents)" /></label>
                    <input type="number" value={editCommission.commissionPerCallLawyer} onChange={(e) => setEditCommission(prev => prev ? { ...prev, commissionPerCallLawyer: Number(e.target.value) } : null)} className={UI.input} min={0} />
                    <p className="text-xs text-gray-500 mt-1">${(editCommission.commissionPerCallLawyer / 100).toFixed(2)}</p>
                  </div>
                  <div>
                    <label className={UI.label}><FormattedMessage id="admin.partners.detail.perCallExpat" defaultMessage="Par appel Expat (cents)" /></label>
                    <input type="number" value={editCommission.commissionPerCallExpat} onChange={(e) => setEditCommission(prev => prev ? { ...prev, commissionPerCallExpat: Number(e.target.value) } : null)} className={UI.input} min={0} />
                    <p className="text-xs text-gray-500 mt-1">${(editCommission.commissionPerCallExpat / 100).toFixed(2)}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className={UI.label}><FormattedMessage id="admin.partners.detail.holdDays" defaultMessage="Retention (jours)" /></label>
                  <input type="number" value={editCommission.holdPeriodDays} onChange={(e) => setEditCommission(prev => prev ? { ...prev, holdPeriodDays: Number(e.target.value) } : null)} className={UI.input} min={0} />
                </div>
                <div>
                  <label className={UI.label}><FormattedMessage id="admin.partners.detail.releaseHours" defaultMessage="Liberation (heures)" /></label>
                  <input type="number" value={editCommission.releaseDelayHours} onChange={(e) => setEditCommission(prev => prev ? { ...prev, releaseDelayHours: Number(e.target.value) } : null)} className={UI.input} min={0} />
                </div>
                <div>
                  <label className={UI.label}><FormattedMessage id="admin.partners.detail.minCallDuration" defaultMessage="Duree min. (s)" /></label>
                  <input type="number" value={editCommission.minimumCallDuration} onChange={(e) => setEditCommission(prev => prev ? { ...prev, minimumCallDuration: Number(e.target.value) } : null)} className={UI.input} min={0} />
                </div>
              </div>
            </div>

            {/* Discount for partner's community */}
            <div className={UI.card + ' p-6'}>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-500" />
                <FormattedMessage id="admin.partners.detail.discountConfig" defaultMessage="Remise communauté" />
              </h3>

              <label className="flex items-center gap-3 cursor-pointer mb-5">
                <input
                  type="checkbox"
                  checked={!!editDiscount?.isActive}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEditDiscount(prev => prev ? { ...prev, isActive: true } : { isActive: true, type: 'fixed', value: 500 });
                    } else {
                      setEditDiscount(prev => prev ? { ...prev, isActive: false } : null);
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  <FormattedMessage id="admin.partners.detail.discountActive" defaultMessage="Offrir une remise à la communauté de ce partenaire" />
                </span>
              </label>

              {editDiscount?.isActive && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className={UI.label}><FormattedMessage id="admin.partners.detail.discountType" defaultMessage="Type de remise" /></label>
                      <select
                        value={editDiscount.type}
                        onChange={(e) => setEditDiscount(prev => prev ? { ...prev, type: e.target.value as 'fixed' | 'percentage' } : null)}
                        className={UI.input}
                      >
                        <option value="fixed">{intl.formatMessage({ id: 'admin.partners.detail.discountFixed', defaultMessage: 'Montant fixe ($)' })}</option>
                        <option value="percentage">{intl.formatMessage({ id: 'admin.partners.detail.discountPercentage', defaultMessage: 'Pourcentage (%)' })}</option>
                      </select>
                    </div>
                    <div>
                      <label className={UI.label}>
                        {editDiscount.type === 'fixed'
                          ? <FormattedMessage id="admin.partners.detail.discountValueCents" defaultMessage="Montant (cents)" />
                          : <FormattedMessage id="admin.partners.detail.discountValuePercent" defaultMessage="Pourcentage (%)" />
                        }
                      </label>
                      <input
                        type="number"
                        value={editDiscount.value}
                        onChange={(e) => setEditDiscount(prev => prev ? { ...prev, value: Number(e.target.value) } : null)}
                        className={UI.input}
                        min={0}
                        max={editDiscount.type === 'percentage' ? 100 : undefined}
                      />
                      {editDiscount.type === 'fixed' && (
                        <p className="text-xs text-gray-500 mt-1">${(editDiscount.value / 100).toFixed(2)}</p>
                      )}
                    </div>
                  </div>

                  {editDiscount.type === 'percentage' && (
                    <div>
                      <label className={UI.label}><FormattedMessage id="admin.partners.detail.discountMaxCents" defaultMessage="Remise max (cents, optionnel)" /></label>
                      <input
                        type="number"
                        value={editDiscount.maxDiscountCents || ''}
                        onChange={(e) => setEditDiscount(prev => prev ? { ...prev, maxDiscountCents: e.target.value ? Number(e.target.value) : undefined } : null)}
                        className={UI.input + ' max-w-xs'}
                        min={0}
                        placeholder="Ex: 1000 = $10 max"
                      />
                    </div>
                  )}

                  <div>
                    <label className={UI.label}><FormattedMessage id="admin.partners.detail.discountLabel" defaultMessage="Libellé (affiché au client)" /></label>
                    <input
                      type="text"
                      value={editDiscount.label || ''}
                      onChange={(e) => setEditDiscount(prev => prev ? { ...prev, label: e.target.value } : null)}
                      className={UI.input + ' max-w-md'}
                      placeholder={intl.formatMessage({ id: 'admin.partners.detail.discountLabelPlaceholder', defaultMessage: 'Ex: Remise Expatica -10%' })}
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
                    <Info className="w-4 h-4 inline mr-1" />
                    <FormattedMessage
                      id="admin.partners.detail.discountInfo"
                      defaultMessage="La remise sera appliquée automatiquement quand un client arrive via le lien d'affiliation de ce partenaire."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Contract */}
            {(partner.contractStartDate || partner.contractEndDate) && (
              <div className={UI.card + ' p-6'}>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-500" />
                  <FormattedMessage id="admin.partners.detail.contract" defaultMessage="Contrat" />
                </h3>
                <div className="text-sm space-y-2">
                  {partner.contractStartDate && <p className="text-gray-600 dark:text-gray-400"><FormattedMessage id="admin.partners.detail.contractStart" defaultMessage="Debut" />: {new Date(partner.contractStartDate).toLocaleDateString(intl.locale)}</p>}
                  {partner.contractEndDate && <p className="text-gray-600 dark:text-gray-400"><FormattedMessage id="admin.partners.detail.contractEnd" defaultMessage="Fin" />: {new Date(partner.contractEndDate).toLocaleDateString(intl.locale)}</p>}
                  {partner.contractNotes && <p className="text-gray-500 italic mt-2">{partner.contractNotes}</p>}
                </div>
              </div>
            )}

            {/* Admin Notes */}
            <div className={UI.card + ' p-6'}>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-teal-500" />
                <FormattedMessage id="admin.partners.detail.adminNotes" defaultMessage="Notes admin" />
              </h3>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={4}
                className={UI.input}
                placeholder={intl.formatMessage({ id: 'admin.partners.detail.notesPlaceholder', defaultMessage: 'Notes internes...' })}
              />
            </div>

            <div className="flex justify-end">
              <button onClick={saveSettings} disabled={savingSettings} className={`${UI.button.primary} px-6 py-3 flex items-center gap-2`}>
                {savingSettings ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                <FormattedMessage id="admin.partners.detail.saveSettings" defaultMessage="Enregistrer" />
              </button>
            </div>
          </div>
        )}

        {/* ====== MODAL: SUSPEND ====== */}
        {showSuspendModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowSuspendModal(false)}>
            <div className={`${UI.card} p-6 w-full max-w-md space-y-4`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="admin.partners.detail.suspendTitle" defaultMessage="Suspendre le partenaire" />
                </h3>
                <button onClick={() => setShowSuspendModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <textarea
                rows={3} className={UI.input} value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder={intl.formatMessage({ id: 'admin.partners.detail.suspendReason', defaultMessage: 'Raison de la suspension...' })}
              />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowSuspendModal(false)} className={`${UI.button.secondary} text-sm`}><FormattedMessage id="common.cancel" defaultMessage="Annuler" /></button>
                <button onClick={() => toggleStatus('suspended', suspendReason)} disabled={actionLoading === 'status'} className={`${UI.button.warning} text-sm flex items-center gap-2`}>
                  {actionLoading === 'status' && <Loader2 className="w-4 h-4 animate-spin" />}
                  <FormattedMessage id="admin.partners.detail.confirmSuspend" defaultMessage="Suspendre" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ====== MODAL: MANUAL COMMISSION ====== */}
        {showManualModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowManualModal(false)}>
            <div className={`${UI.card} p-6 w-full max-w-md space-y-4`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  <FormattedMessage id="admin.partners.detail.manualCommissionTitle" defaultMessage="Commission manuelle" />
                </h3>
                <button onClick={() => setShowManualModal(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"><X className="w-5 h-5 text-gray-400" /></button>
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.detail.amountUsd" defaultMessage="Montant ($)" /></label>
                <input type="number" step="0.01" className={UI.input} value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} placeholder="5.00" />
              </div>
              <div>
                <label className={UI.label}><FormattedMessage id="admin.partners.detail.descriptionLabel" defaultMessage="Description" /></label>
                <textarea rows={2} className={UI.input} value={manualDescription} onChange={(e) => setManualDescription(e.target.value)} placeholder={intl.formatMessage({ id: 'admin.partners.detail.descriptionPlaceholder', defaultMessage: 'Raison de cet ajustement...' })} />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowManualModal(false)} className={`${UI.button.secondary} text-sm`}><FormattedMessage id="common.cancel" defaultMessage="Annuler" /></button>
                <button onClick={issueManualCommission} disabled={actionLoading === 'manual' || !manualAmount} className={`${UI.button.primary} text-sm flex items-center gap-2`}>
                  {actionLoading === 'manual' && <Loader2 className="w-4 h-4 animate-spin" />}
                  <FormattedMessage id="admin.partners.detail.issue" defaultMessage="Emettre" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminPartnerDetail;

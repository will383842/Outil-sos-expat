/**
 * AdminPartnersList - Admin page for managing partners
 * Features: Search, status filter, table with monthly stats, export
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from 'firebase/functions';
import { functionsAffiliate } from '@/config/firebase';
import toast from 'react-hot-toast';
import {
  Users,
  Search,
  Filter,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Globe,
  DollarSign,
  UserPlus,
  X,
  Pause,
  Ban,
  ExternalLink,
  TrendingUp,
  MousePointerClick,
  Phone,
  PlayCircle,
  Trash2,
  MoreVertical,
  AlertCircle,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens - Cyan/Blue theme for Partners
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500",
} as const;

// ============================================================================
// TYPES
// ============================================================================
interface PartnerListItem {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  websiteName: string;
  websiteUrl: string;
  websiteLogo?: string;
  affiliateCode: string;
  status: 'active' | 'suspended' | 'banned';
  isVisible: boolean;
  currentMonthStats: {
    clicks: number;
    calls: number;
    earnings: number;
  };
  conversionRate: number;
  totalEarned: number;
  createdAt: string;
  lastLoginAt?: string | null;
  recruitedBy?: string | null;
  recruitedByName?: string | null;
}

interface PartnerListResponse {
  partners: PartnerListItem[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    totalActive: number;
    totalSuspended: number;
    totalBanned: number;
    totalEarnings: number;
    newThisMonth: number;
  };
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'banned';

const STATUS_CONFIG: Record<string, { color: string; icon: React.ElementType }> = {
  active: { color: 'text-green-400 bg-green-500/10', icon: CheckCircle },
  suspended: { color: 'text-yellow-400 bg-yellow-500/10', icon: Pause },
  banned: { color: 'text-red-400 bg-red-500/10', icon: Ban },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
const AdminPartnersList: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  const [partners, setPartners] = useState<PartnerListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<PartnerListResponse['stats']>();
  const [exporting, setExporting] = useState(false);

  // Selection & bulk delete
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteModal, setBulkDeleteModal] = useState(false);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState('');
  const [bulkDeleteReason, setBulkDeleteReason] = useState('');

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === partners.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(partners.map(p => p.id)));
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setBulkDeleteModal(true);
  };

  const executeBulkDelete = async () => {
    if (bulkDeleteConfirm !== 'SUPPRIMER') {
      toast.error('Tapez SUPPRIMER pour confirmer');
      return;
    }
    setActionLoading(true);
    try {
      const fn = httpsCallable(functionsAffiliate, 'adminDeletePartner');
      const ids = Array.from(selectedIds);
      let successCount = 0;
      for (const id of ids) {
        try {
          await fn({ partnerId: id, reason: bulkDeleteReason });
          successCount++;
        } catch (err) {
          console.error(`Failed to delete partner ${id}:`, err);
        }
      }
      toast.success(`${successCount}/${ids.length} partenaires supprimés`);
      setSelectedIds(new Set());
      setBulkDeleteModal(false);
      setBulkDeleteConfirm('');
      setBulkDeleteReason('');
      fetchPartners();
    } catch (err) {
      toast.error('Erreur lors de la suppression en masse');
    } finally {
      setActionLoading(false);
    }
  };

  // Action modal state
  type PartnerAction = 'suspend' | 'ban' | 'reactivate' | 'delete';
  const [actionModal, setActionModal] = useState<{
    isOpen: boolean;
    partner: PartnerListItem | null;
    action: PartnerAction | null;
    reason: string;
    confirmText: string;
  }>({ isOpen: false, partner: null, action: null, reason: '', confirmText: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!openDropdownId) return;
    const handler = () => setOpenDropdownId(null);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [openDropdownId]);

  const openActionModal = useCallback((partner: PartnerListItem, action: PartnerAction) => {
    setOpenDropdownId(null);
    setActionModal({ isOpen: true, partner, action, reason: '', confirmText: '' });
  }, []);

  const limit = 20;

  const fetchPartners = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable<any, PartnerListResponse>(functionsAffiliate, 'adminPartnersList');
      const result = await fn({
        offset: (page - 1) * limit,
        limit,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
        includeStats: page === 1,
      });
      setPartners(result.data.partners);
      setTotal(result.data.total);
      if (result.data.stats) setStats(result.data.stats);
    } catch (err: any) {
      console.error('Error fetching partners:', err);
      setError(err.message || 'Failed to load partners');
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, searchQuery]);

  const executeAction = useCallback(async () => {
    if (!actionModal.partner || !actionModal.action) return;
    if (['suspend', 'ban', 'delete'].includes(actionModal.action) && !actionModal.reason.trim()) {
      toast.error('Veuillez entrer une raison');
      return;
    }
    if (actionModal.action === 'delete' && actionModal.confirmText !== 'SUPPRIMER') {
      toast.error('Tapez SUPPRIMER pour confirmer');
      return;
    }

    setActionLoading(true);
    try {
      if (actionModal.action === 'delete') {
        const fn = httpsCallable(functionsAffiliate, 'adminDeletePartner');
        await fn({ partnerId: actionModal.partner.id, reason: actionModal.reason.trim() });
        toast.success('Partenaire supprimé définitivement');
      } else {
        const statusMap: Record<string, string> = {
          suspend: 'suspended',
          ban: 'banned',
          reactivate: 'active',
        };
        const fn = httpsCallable(functionsAffiliate, 'adminTogglePartnerStatus');
        await fn({
          partnerId: actionModal.partner.id,
          status: statusMap[actionModal.action],
          suspensionReason: actionModal.reason,
        });
        const actionLabels: Record<string, string> = {
          suspend: 'Partenaire suspendu',
          ban: 'Partenaire banni',
          reactivate: 'Partenaire réactivé',
        };
        toast.success(actionLabels[actionModal.action] || 'Action effectuée');
      }
      setActionModal(prev => ({ ...prev, isOpen: false }));
      fetchPartners();
    } catch (err: any) {
      console.error('Error executing action:', err);
      toast.error(err.message || "Erreur lors de l'action");
    } finally {
      setActionLoading(false);
    }
  }, [actionModal, fetchPartners]);

  useEffect(() => {
    fetchPartners();
  }, [page, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) fetchPartners();
      else setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const totalPages = Math.ceil(total / limit);

  const handleExport = () => {
    setExporting(true);
    try {
      const header = ['Name','Email','Website','Code','Status','Clicks','Calls','Earnings','Conversion','Total Earned','Created'];
      const rows = partners.map(p => [
        `${p.firstName} ${p.lastName}`,
        p.email,
        p.websiteName,
        p.affiliateCode,
        p.status,
        p.currentMonthStats.clicks,
        p.currentMonthStats.calls,
        (p.currentMonthStats.earnings / 100).toFixed(2),
        (p.conversionRate * 100).toFixed(1) + '%',
        (p.totalEarned / 100).toFixed(2),
        p.createdAt,
      ]);
      const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `partners-export-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(intl.formatMessage({ id: 'admin.partners.export.success', defaultMessage: 'Export completed' }));
    } catch {
      toast.error(intl.formatMessage({ id: 'admin.partners.export.error', defaultMessage: 'Export failed' }));
    } finally {
      setExporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              <FormattedMessage id="admin.partners.title" defaultMessage="Partners" />
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.partners.subtitle" defaultMessage="Manage commercial partner accounts" />
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleExport} disabled={exporting} className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}>
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <FormattedMessage id="admin.partners.export" defaultMessage="Export" />
            </button>
            <button
              onClick={() => navigate('/admin/partners/create')}
              className={`${UI.button.primary} px-4 py-2 flex items-center gap-2`}
            >
              <UserPlus className="w-4 h-4" />
              <FormattedMessage id="admin.partners.create" defaultMessage="Create partner" />
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'admin.partners.stats.active', value: stats.totalActive, icon: CheckCircle, color: 'text-green-400' },
              { label: 'admin.partners.stats.suspended', value: stats.totalSuspended, icon: Pause, color: 'text-yellow-400' },
              { label: 'admin.partners.stats.banned', value: stats.totalBanned, icon: Ban, color: 'text-red-400' },
              { label: 'admin.partners.stats.totalEarnings', value: formatAmount(stats.totalEarnings), icon: DollarSign, color: 'text-cyan-400' },
              { label: 'admin.partners.stats.newThisMonth', value: stats.newThisMonth, icon: TrendingUp, color: 'text-blue-400' },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className={UI.card + ' p-4'}>
                  <div className="flex items-center gap-2 mb-1">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      <FormattedMessage id={stat.label} defaultMessage="Stat" />
                    </span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={intl.formatMessage({ id: 'admin.partners.search.placeholder', defaultMessage: 'Search by name, email, code...' })}
              className={UI.input + ' pl-10'}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <div className="flex gap-2">
            {(['all', 'active', 'suspended', 'banned'] as StatusFilter[]).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  statusFilter === s
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 border border-transparent hover:bg-gray-200 dark:hover:bg-white/10'
                }`}
              >
                <FormattedMessage id={`admin.partners.filter.${s}`} defaultMessage={s} />
              </button>
            ))}
          </div>
        </div>

        {/* Bulk actions */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-900/20 rounded-xl">
            <span className="text-sm font-medium text-cyan-700 dark:text-cyan-300">{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span>
            <button onClick={handleBulkDelete} disabled={actionLoading} className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg flex items-center gap-1.5">
              <Trash2 className="w-3.5 h-3.5" />Supprimer
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm rounded-lg">Désélectionner</button>
          </div>
        )}

        {/* Table */}
        {error ? (
          <div className={UI.card + ' p-8 text-center'}>
            <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
            <p className="text-red-400">{error}</p>
            <button onClick={fetchPartners} className={`${UI.button.secondary} px-4 py-2 mt-4`}>
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              <FormattedMessage id="admin.partners.retry" defaultMessage="Retry" />
            </button>
          </div>
        ) : loading ? (
          <div className={UI.card + ' p-16 flex items-center justify-center'}>
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
          </div>
        ) : partners.length === 0 ? (
          <div className={UI.card + ' p-16 text-center'}>
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">
              <FormattedMessage id="admin.partners.empty" defaultMessage="No partners found" />
            </p>
          </div>
        ) : (
          <div className={UI.card + ' overflow-hidden'}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <th className="px-3 py-3 text-left">
                      <input type="checkbox" checked={selectedIds.size === partners.length && partners.length > 0} onChange={selectAll} className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500" />
                    </th>
                    {['logo', 'website', 'code', 'status'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <FormattedMessage id={`admin.partners.table.${col}`} defaultMessage={col} />
                      </th>
                    ))}
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Inscription</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">Tél.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden xl:table-cell">Dernière co.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Parrain</th>
                    {['clicks', 'calls', 'earnings', 'conversion'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <FormattedMessage id={`admin.partners.table.${col}`} defaultMessage={col} />
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                  {partners.map(partner => {
                    const statusConf = STATUS_CONFIG[partner.status] || STATUS_CONFIG.active;
                    const StatusIcon = statusConf.icon;
                    return (
                      <tr
                        key={partner.id}
                        onClick={() => navigate(`/admin/partners/${partner.id}`)}
                        className={`hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${selectedIds.has(partner.id) ? 'bg-cyan-50 dark:bg-cyan-900/10' : ''}`}
                      >
                        <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={selectedIds.has(partner.id)} onChange={() => toggleSelection(partner.id)} className="w-4 h-4 rounded border-gray-300 text-cyan-500 focus:ring-cyan-500" />
                        </td>
                        <td className="px-4 py-3">
                          {partner.websiteLogo ? (
                            <img src={partner.websiteLogo} alt="" className="w-8 h-8 rounded-lg object-contain" />
                          ) : (
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                              <Globe className="w-4 h-4 text-cyan-400" />
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{partner.websiteName}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{partner.firstName} {partner.lastName}</div>
                        </td>
                        <td className="px-4 py-3">
                          <code className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-1 rounded text-cyan-600 dark:text-cyan-400 font-mono">
                            {partner.affiliateCode}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConf.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {partner.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                          {new Date(partner.createdAt).toLocaleDateString(intl.locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          {partner.phone ? <span className="text-xs text-gray-600 dark:text-gray-400">{partner.phone}</span> : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {partner.lastLoginAt ? new Date(partner.lastLoginAt).toLocaleDateString(intl.locale, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          {partner.recruitedBy ? (
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 truncate max-w-[130px]">{partner.recruitedByName || 'Parrain'}</span>
                          ) : <span className="text-xs text-gray-400">—</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {partner.currentMonthStats.clicks.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {partner.currentMonthStats.calls.toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                          {formatAmount(partner.currentMonthStats.earnings)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          {(partner.conversionRate * 100).toFixed(1)}%
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/admin/partners/${partner.id}`); }}
                              className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                              title="Voir détails"
                            >
                              <ChevronRight className="w-4 h-4 text-gray-400" />
                            </button>
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(openDropdownId === partner.id ? null : partner.id);
                                }}
                                className="p-1.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"
                                title="Actions"
                              >
                                <MoreVertical className="w-4 h-4 text-gray-400" />
                              </button>
                              {openDropdownId === partner.id && (
                                <div
                                  className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    onClick={() => { setOpenDropdownId(null); navigate(`/admin/partners/${partner.id}`); }}
                                    className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-blue-600"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                    Voir détails
                                  </button>
                                  <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                  {partner.status === 'active' && (
                                    <>
                                      <button
                                        onClick={() => openActionModal(partner, 'suspend')}
                                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-yellow-600"
                                      >
                                        <Pause className="w-4 h-4" />
                                        Suspendre
                                      </button>
                                      <button
                                        onClick={() => openActionModal(partner, 'ban')}
                                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600"
                                      >
                                        <Ban className="w-4 h-4" />
                                        Bannir
                                      </button>
                                    </>
                                  )}
                                  {partner.status === 'suspended' && (
                                    <>
                                      <button
                                        onClick={() => openActionModal(partner, 'reactivate')}
                                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-green-600"
                                      >
                                        <PlayCircle className="w-4 h-4" />
                                        Réactiver
                                      </button>
                                      <button
                                        onClick={() => openActionModal(partner, 'ban')}
                                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-red-600"
                                      >
                                        <Ban className="w-4 h-4" />
                                        Bannir
                                      </button>
                                    </>
                                  )}
                                  {partner.status === 'banned' && (
                                    <>
                                      <button
                                        onClick={() => openActionModal(partner, 'reactivate')}
                                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-green-600"
                                      >
                                        <PlayCircle className="w-4 h-4" />
                                        Réactiver
                                      </button>
                                      <div className="border-t border-gray-100 dark:border-gray-700 my-1" />
                                      <button
                                        onClick={() => openActionModal(partner, 'delete')}
                                        className="w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        Supprimer
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-white/10">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {((page - 1) * limit) + 1}-{Math.min(page * limit, total)} / {total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`${UI.button.secondary} px-3 py-1 text-sm disabled:opacity-50`}
                  >
                    <FormattedMessage id="admin.partners.prev" defaultMessage="Previous" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className={`${UI.button.secondary} px-3 py-1 text-sm disabled:opacity-50`}
                  >
                    <FormattedMessage id="admin.partners.next" defaultMessage="Next" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Confirmation Modal */}
      {actionModal.isOpen && actionModal.partner && actionModal.action && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden ${
            actionModal.action === 'delete' ? 'bg-red-50 dark:bg-red-900/20' :
            actionModal.action === 'ban' ? 'bg-orange-50 dark:bg-orange-900/20' :
            actionModal.action === 'suspend' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
            'bg-green-50 dark:bg-green-900/20'
          }`}>
            {/* Header */}
            <div className="p-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  {actionModal.action === 'delete' && <Trash2 className="w-5 h-5 text-red-600" />}
                  {actionModal.action === 'ban' && <Ban className="w-5 h-5 text-orange-600" />}
                  {actionModal.action === 'suspend' && <Pause className="w-5 h-5 text-yellow-600" />}
                  {actionModal.action === 'reactivate' && <PlayCircle className="w-5 h-5 text-green-600" />}
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                    {actionModal.action === 'delete' && 'Supprimer le partenaire'}
                    {actionModal.action === 'ban' && 'Bannir le partenaire'}
                    {actionModal.action === 'suspend' && 'Suspendre le partenaire'}
                    {actionModal.action === 'reactivate' && 'Réactiver le partenaire'}
                  </h3>
                </div>
                <button
                  onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              {/* Partner info */}
              <div className="flex items-center gap-3 p-3 bg-white/60 dark:bg-white/5 rounded-xl mb-4">
                {actionModal.partner.websiteLogo ? (
                  <img src={actionModal.partner.websiteLogo} alt="" className="w-10 h-10 rounded-lg object-contain" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-cyan-400" />
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {actionModal.partner.firstName} {actionModal.partner.lastName}
                  </p>
                  <p className="text-sm text-gray-500">{actionModal.partner.websiteName}</p>
                  <p className="text-xs text-gray-400">{actionModal.partner.email}</p>
                </div>
                <span className={`ml-auto inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                  STATUS_CONFIG[actionModal.partner.status]?.color || ''
                }`}>
                  {actionModal.partner.status}
                </span>
              </div>

              {/* Reason textarea (required for suspend, ban, delete) */}
              {['suspend', 'ban', 'delete'].includes(actionModal.action) && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Raison <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={3}
                    value={actionModal.reason}
                    onChange={(e) => setActionModal(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Expliquez la raison de cette action..."
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                  />
                </div>
              )}

              {/* Delete confirmation */}
              {actionModal.action === 'delete' && (
                <div className="mb-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-xl mb-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-red-800 dark:text-red-200">
                        Cette action est <strong>irréversible</strong>. Le partenaire et son compte utilisateur seront supprimés définitivement.
                      </p>
                    </div>
                  </div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tapez <strong>SUPPRIMER</strong> pour confirmer
                  </label>
                  <input
                    type="text"
                    value={actionModal.confirmText}
                    onChange={(e) => setActionModal(prev => ({ ...prev, confirmText: e.target.value }))}
                    placeholder="SUPPRIMER"
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                  />
                </div>
              )}

              {/* Action descriptions */}
              {actionModal.action === 'suspend' && (
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-4">
                  Le partenaire ne pourra plus accéder à son dashboard ni générer de commissions. Son compte reste intact.
                </p>
              )}
              {actionModal.action === 'ban' && (
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-4">
                  Le partenaire sera définitivement banni. Son lien affilié cessera de fonctionner.
                </p>
              )}
              {actionModal.action === 'reactivate' && (
                <p className="text-sm text-green-700 dark:text-green-300 mb-4">
                  Le partenaire retrouvera l'accès complet à son dashboard et pourra générer des commissions.
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-white/40 dark:bg-white/5">
              <button
                onClick={() => setActionModal(prev => ({ ...prev, isOpen: false }))}
                className={`${UI.button.secondary} px-4 py-2 text-sm`}
                disabled={actionLoading}
              >
                Annuler
              </button>
              <button
                onClick={executeAction}
                disabled={
                  actionLoading ||
                  (['suspend', 'ban', 'delete'].includes(actionModal.action) && !actionModal.reason.trim()) ||
                  (actionModal.action === 'delete' && actionModal.confirmText !== 'SUPPRIMER')
                }
                className={`px-4 py-2 text-sm font-medium rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 ${
                  actionModal.action === 'delete' ? 'bg-red-500 hover:bg-red-600 text-white' :
                  actionModal.action === 'ban' ? 'bg-orange-500 hover:bg-orange-600 text-white' :
                  actionModal.action === 'suspend' ? 'bg-yellow-500 hover:bg-yellow-600 text-white' :
                  'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {actionLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                {actionModal.action === 'delete' && 'Supprimer définitivement'}
                {actionModal.action === 'ban' && 'Bannir'}
                {actionModal.action === 'suspend' && 'Suspendre'}
                {actionModal.action === 'reactivate' && 'Réactiver'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk delete confirmation modal */}
      {bulkDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Supprimer {selectedIds.size} partenaire{selectedIds.size > 1 ? 's' : ''} ?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Cette action est irréversible. Tous les comptes, commissions, widgets et données associées seront définitivement supprimés.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Raison</label>
                <input type="text" value={bulkDeleteReason} onChange={(e) => setBulkDeleteReason(e.target.value)} placeholder="Raison de la suppression..." className={UI.input} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tapez SUPPRIMER pour confirmer</label>
                <input type="text" value={bulkDeleteConfirm} onChange={(e) => setBulkDeleteConfirm(e.target.value)} placeholder="SUPPRIMER" className={UI.input} />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => { setBulkDeleteModal(false); setBulkDeleteConfirm(''); setBulkDeleteReason(''); }} className={`${UI.button.secondary} px-4 py-2`}>Annuler</button>
              <button onClick={executeBulkDelete} disabled={actionLoading || bulkDeleteConfirm !== 'SUPPRIMER'} className="bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl px-4 py-2 flex items-center gap-2 disabled:opacity-50">
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminPartnersList;

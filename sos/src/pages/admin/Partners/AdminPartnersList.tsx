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
                    {['logo', 'website', 'code', 'status', 'clicks', 'calls', 'earnings', 'conversion'].map(col => (
                      <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        <FormattedMessage id={`admin.partners.table.${col}`} defaultMessage={col} />
                      </th>
                    ))}
                    <th className="px-4 py-3" />
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
                        className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer transition-colors"
                      >
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
                          <ChevronRight className="w-4 h-4 text-gray-400" />
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
    </AdminLayout>
  );
};

export default AdminPartnersList;

/**
 * AdminGroupAdminsRecruitments - Admin page for tracking GroupAdmin recruitment pipeline
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useIntl } from 'react-intl';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { functionsWest2 } from '@/config/firebase';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  DollarSign,
  XCircle,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
  },
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white",
  input: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white placeholder-gray-400",
} as const;

type ComputedStatus = 'pending' | 'eligible' | 'paid' | 'expired';

interface Recruitment {
  id: string;
  recruiterId: string;
  recruiterName: string;
  recruitedId: string;
  recruitedName: string;
  recruitedEmail: string;
  recruitedGroupName: string;
  recruitedAt: string;
  commissionWindowEnd: string;
  commissionPaid: boolean;
  recruitedTotalEarned: number;
  threshold: number;
  progressPercent: number;
  computedStatus: ComputedStatus;
}

interface Stats {
  total: number;
  pending: number;
  eligible: number;
  paid: number;
  expired: number;
}

const AdminGroupAdminsRecruitments: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [recruitments, setRecruitments] = useState<Recruitment[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, pending: 0, eligible: 0, paid: 0, expired: 0 });
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | ComputedStatus>('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const limit = 25;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const getList = httpsCallable(functionsWest2, 'adminGetRecruitmentsList');
      const result = await getList({ page, limit, status: statusFilter, search });
      const data = result.data as {
        recruitments: Recruitment[];
        stats: Stats;
        hasMore: boolean;
      };
      setRecruitments(data.recruitments);
      setStats(data.stats);
      setHasMore(data.hasMore);
    } catch (err) {
      console.error('Error fetching recruitments:', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput);
  };

  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  };

  const statusBadge = (status: ComputedStatus) => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3" /> {intl.formatMessage({ id: 'groupAdmin.admin.recruitments.status.paid' })}
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400">
            <Clock className="w-3 h-3" /> {intl.formatMessage({ id: 'groupAdmin.admin.recruitments.status.pending' })}
          </span>
        );
      case 'eligible':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
            <DollarSign className="w-3 h-3" /> {intl.formatMessage({ id: 'groupAdmin.admin.recruitments.status.eligible' })}
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3" /> {intl.formatMessage({ id: 'groupAdmin.admin.recruitments.status.expired' })}
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-blue-500" />
              {intl.formatMessage({ id: 'groupAdmin.admin.recruitments.title' })}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {intl.formatMessage({ id: 'groupAdmin.admin.recruitments.description' })}
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className={`${UI.button.secondary} p-2`}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className={UI.card + " p-4"}>
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.stats.total' })}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className={UI.card + " p-4"}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.stats.pending' })}</p>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </div>
          <div className={UI.card + " p-4"}>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-blue-400" />
              <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.stats.eligible' })}</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.eligible}</p>
          </div>
          <div className={UI.card + " p-4"}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.stats.paid' })}</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
          </div>
          <div className={UI.card + " p-4"}>
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-4 h-4 text-red-400" />
              <p className="text-sm text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.stats.expired' })}</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as 'all' | ComputedStatus);
              setPage(1);
            }}
            className={UI.select}
          >
            <option value="all">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.filter.all' })}</option>
            <option value="pending">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.filter.pending' })}</option>
            <option value="eligible">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.filter.eligible' })}</option>
            <option value="paid">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.filter.paid' })}</option>
            <option value="expired">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.filter.expired' })}</option>
          </select>
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={intl.formatMessage({ id: 'groupAdmin.admin.recruitments.searchPlaceholder' })}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className={UI.input + " pl-9 w-full"}
              />
            </div>
            <button onClick={handleSearch} className={`${UI.button.primary} px-4 py-2`}>
              {intl.formatMessage({ id: 'groupAdmin.admin.recruitments.search' })}
            </button>
          </div>
        </div>

        {/* Table */}
        <div className={UI.card + " overflow-hidden"}>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : recruitments.length === 0 ? (
            <div className="text-center py-12">
              <UserPlus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.noResults' })}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.col.recruiter' })}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.col.recruited' })}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.col.date' })}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.col.progress' })}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.col.status' })}</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">{intl.formatMessage({ id: 'groupAdmin.admin.recruitments.col.windowEnd' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {recruitments.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => navigate(`/admin/groupadmins/${r.recruiterId}`)}
                          className="text-blue-500 hover:underline font-medium text-sm"
                        >
                          {r.recruiterName}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <button
                            onClick={() => navigate(`/admin/groupadmins/${r.recruitedId}`)}
                            className="text-blue-500 hover:underline font-medium text-sm"
                          >
                            {r.recruitedName}
                          </button>
                          <p className="text-xs text-gray-400">{r.recruitedEmail}</p>
                          {r.recruitedGroupName && (
                            <p className="text-xs text-gray-400">{r.recruitedGroupName}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(r.recruitedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="min-w-[120px]">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>{formatAmount(r.recruitedTotalEarned)} / {formatAmount(r.threshold)}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-white/10 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full transition-all ${
                                r.progressPercent >= 100
                                  ? 'bg-green-500'
                                  : r.progressPercent >= 50
                                    ? 'bg-blue-500'
                                    : 'bg-orange-400'
                              }`}
                              style={{ width: `${r.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(r.computedStatus)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {formatDate(r.commissionWindowEnd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {!loading && recruitments.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-white/10">
              <p className="text-sm text-gray-500">
                {intl.formatMessage({ id: 'groupAdmin.admin.recruitments.page' }, { page })}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1 disabled:opacity-50`}
                >
                  <ChevronLeft className="w-4 h-4" /> {intl.formatMessage({ id: 'groupAdmin.admin.recruitments.prev' })}
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore}
                  className={`${UI.button.secondary} px-3 py-1.5 text-sm flex items-center gap-1 disabled:opacity-50`}
                >
                  {intl.formatMessage({ id: 'groupAdmin.admin.recruitments.next' })} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminsRecruitments;

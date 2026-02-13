/**
 * AdminGroupAdminsList - Admin page for managing Facebook group administrators
 * Features: Group type filter, group size filter, search, export, bulk actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  Users,
  Search,
  Filter,
  ChevronRight,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  Download,
  Globe,
  DollarSign,
  UserPlus,
  X,
  Play,
  Pause,
  ExternalLink,
  Facebook,
  Shield,
} from 'lucide-react';
import AdminLayout from '../../../components/admin/AdminLayout';

// Design tokens - Blue theme for GroupAdmins
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    danger: "bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all",
  },
  input: "w-full px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
  select: "px-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500",
} as const;

// Group types
const GROUP_TYPES = [
  { code: 'travel', name: 'Travel' },
  { code: 'expat', name: 'Expatriates' },
  { code: 'digital_nomad', name: 'Digital Nomads' },
  { code: 'immigration', name: 'Immigration' },
  { code: 'relocation', name: 'Relocation' },
  { code: 'language', name: 'Language Exchange' },
  { code: 'country_specific', name: 'Country Specific' },
  { code: 'profession', name: 'Profession' },
  { code: 'family', name: 'Family' },
  { code: 'student', name: 'Student' },
  { code: 'retirement', name: 'Retirement' },
  { code: 'other', name: 'Other' },
];

// Group sizes
const GROUP_SIZES = [
  { code: 'lt1k', name: '< 1,000' },
  { code: '1k-5k', name: '1k - 5k' },
  { code: '5k-10k', name: '5k - 10k' },
  { code: '10k-25k', name: '10k - 25k' },
  { code: '25k-50k', name: '25k - 50k' },
  { code: '50k-100k', name: '50k - 100k' },
  { code: 'gt100k', name: '> 100k' },
];

interface GroupAdmin {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: string;
  totalEarned: number;
  totalClients: number;
  totalRecruits: number;
  groupUrl?: string;
  groupName?: string;
  groupType?: string;
  groupSize?: string;
  groupCountry?: string;
  isGroupVerified: boolean;
  createdAt: string;
}

interface GroupAdminListResponse {
  groupAdmins: GroupAdmin[];
  total: number;
  page: number;
  limit: number;
  stats?: {
    totalActive: number;
    totalSuspended: number;
    totalEarnings: number;
    newThisMonth: number;
    verifiedGroups: number;
  };
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'blocked';

const AdminGroupAdminsList: React.FC = () => {
  const intl = useIntl();
  const navigate = useNavigate();
  const functions = getFunctions(undefined, 'europe-west2');

  // State
  const [groupAdmins, setGroupAdmins] = useState<GroupAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [groupTypeFilter, setGroupTypeFilter] = useState<string>('all');
  const [groupSizeFilter, setGroupSizeFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<GroupAdminListResponse['stats']>();

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Export
  const [exporting, setExporting] = useState(false);

  const limit = 20;

  // Fetch group admins
  const fetchGroupAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const adminGetGroupAdminsList = httpsCallable<unknown, GroupAdminListResponse>(
        functions,
        'adminGetGroupAdminsList'
      );

      const result = await adminGetGroupAdminsList({
        page,
        limit,
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        groupType: groupTypeFilter !== 'all' ? groupTypeFilter : undefined,
        groupSize: groupSizeFilter !== 'all' ? groupSizeFilter : undefined,
      });

      setGroupAdmins(result.data.groupAdmins);
      setTotal(result.data.total);
      setStats(result.data.stats);
    } catch (err) {
      console.error('Error fetching group admins:', err);
      setError(intl.formatMessage({ id: 'groupAdmin.admin.list.error' }));
    } finally {
      setLoading(false);
    }
  }, [functions, page, searchQuery, statusFilter, groupTypeFilter, groupSizeFilter]);

  useEffect(() => {
    fetchGroupAdmins();
  }, [fetchGroupAdmins]);

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all
  const selectAll = () => {
    if (selectedIds.size === groupAdmins.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(groupAdmins.map(g => g.id)));
    }
  };

  // Bulk action
  const handleBulkAction = async (action: 'activate' | 'suspend' | 'block') => {
    if (selectedIds.size === 0) return;

    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      for (const id of ids) {
        const updateStatus = httpsCallable(functions, 'adminUpdateGroupAdminStatus');
        await updateStatus({ groupAdminId: id, status: action === 'activate' ? 'active' : action === 'suspend' ? 'suspended' : 'blocked' });
      }
      setSelectedIds(new Set());
      fetchGroupAdmins();
    } catch (err) {
      console.error('Bulk action error:', err);
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Export
  const handleExport = async () => {
    setExporting(true);
    try {
      const exportFn = httpsCallable(functions, 'adminExportGroupAdmins');
      const result = await exportFn({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        groupType: groupTypeFilter !== 'all' ? groupTypeFilter : undefined,
      });

      // Create CSV download
      const csvData = result.data as string;
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `groupadmins-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  // Format amount
  const formatAmount = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            <FormattedMessage id="groupAdmin.status.active" defaultMessage="Active" />
          </span>
        );
      case 'suspended':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            <FormattedMessage id="groupAdmin.status.suspended" defaultMessage="Suspended" />
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
            <AlertTriangle className="w-3 h-3" />
            <FormattedMessage id="groupAdmin.status.blocked" defaultMessage="Blocked" />
          </span>
        );
      default:
        return null;
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Facebook className="w-6 h-6 text-blue-500" />
              <FormattedMessage id="groupAdmin.admin.title" defaultMessage="GroupAdmins Management" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              {intl.formatMessage({ id: 'groupAdmin.admin.list.description' })}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchGroupAdmins}
              disabled={loading}
              className={`${UI.button.secondary} px-4 py-2`}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {intl.formatMessage({ id: 'groupAdmin.admin.list.export' })}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.list.stats.active' })}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalActive}</p>
                </div>
              </div>
            </div>
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Pause className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.list.stats.suspended' })}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalSuspended}</p>
                </div>
              </div>
            </div>
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.list.stats.totalEarnings' })}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatAmount(stats.totalEarnings)}</p>
                </div>
              </div>
            </div>
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <UserPlus className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.list.stats.newThisMonth' })}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.newThisMonth}</p>
                </div>
              </div>
            </div>
            <div className={UI.card + " p-4"}>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg">
                  <Shield className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{intl.formatMessage({ id: 'groupAdmin.admin.list.stats.verifiedGroups' })}</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.verifiedGroups}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className={UI.card + " p-4"}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={intl.formatMessage({ id: 'groupAdmin.admin.search', defaultMessage: 'Search...' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={UI.input + " pl-10"}
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={UI.select}
            >
              <option value="all">
                {intl.formatMessage({ id: 'groupAdmin.admin.filter.all', defaultMessage: 'All Statuses' })}
              </option>
              <option value="active">
                {intl.formatMessage({ id: 'groupAdmin.admin.filter.active', defaultMessage: 'Active' })}
              </option>
              <option value="suspended">
                {intl.formatMessage({ id: 'groupAdmin.admin.filter.suspended', defaultMessage: 'Suspended' })}
              </option>
              <option value="blocked">
                {intl.formatMessage({ id: 'groupAdmin.admin.filter.blocked', defaultMessage: 'Blocked' })}
              </option>
            </select>

            {/* Group type filter */}
            <select
              value={groupTypeFilter}
              onChange={(e) => setGroupTypeFilter(e.target.value)}
              className={UI.select}
            >
              <option value="all">{intl.formatMessage({ id: 'groupAdmin.admin.list.filter.allGroupTypes' })}</option>
              {GROUP_TYPES.map(type => (
                <option key={type.code} value={type.code}>{intl.formatMessage({ id: `groupAdmin.groupType.${type.code}` })}</option>
              ))}
            </select>

            {/* Group size filter */}
            <select
              value={groupSizeFilter}
              onChange={(e) => setGroupSizeFilter(e.target.value)}
              className={UI.select}
            >
              <option value="all">{intl.formatMessage({ id: 'groupAdmin.admin.list.filter.allSizes' })}</option>
              {GROUP_SIZES.map(size => (
                <option key={size.code} value={size.code}>{size.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className={UI.card + " p-4 flex items-center justify-between"}>
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {intl.formatMessage({ id: 'groupAdmin.admin.list.selected' }, { count: selectedIds.size })}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('activate')}
                disabled={bulkActionLoading}
                className={`${UI.button.secondary} px-3 py-1 text-sm flex items-center gap-1`}
              >
                <Play className="w-4 h-4" /> {intl.formatMessage({ id: 'groupAdmin.admin.list.activate' })}
              </button>
              <button
                onClick={() => handleBulkAction('suspend')}
                disabled={bulkActionLoading}
                className={`${UI.button.secondary} px-3 py-1 text-sm flex items-center gap-1`}
              >
                <Pause className="w-4 h-4" /> {intl.formatMessage({ id: 'groupAdmin.admin.list.suspend' })}
              </button>
              <button
                onClick={() => handleBulkAction('block')}
                disabled={bulkActionLoading}
                className={`${UI.button.danger} px-3 py-1 text-sm flex items-center gap-1`}
              >
                <X className="w-4 h-4" /> {intl.formatMessage({ id: 'groupAdmin.admin.list.block' })}
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        <div className={UI.card + " overflow-hidden"}>
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center p-12 text-red-500">
              <AlertTriangle className="w-6 h-6 mr-2" />
              {error}
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-white/5">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === groupAdmins.length && groupAdmins.length > 0}
                          onChange={selectAll}
                          className="rounded"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'groupAdmin.admin.list.col.admin' })}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'groupAdmin.admin.list.col.group' })}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'groupAdmin.admin.list.col.typeSize' })}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'groupAdmin.admin.list.col.status' })}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'groupAdmin.admin.list.col.clients' })}
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {intl.formatMessage({ id: 'groupAdmin.admin.list.col.earnings' })}
                      </th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-white/10">
                    {groupAdmins.map(admin => (
                      <tr
                        key={admin.id}
                        className="hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                        onClick={() => navigate(`/admin/group-admins/${admin.id}`)}
                      >
                        <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(admin.id)}
                            onChange={() => toggleSelection(admin.id)}
                            className="rounded"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {admin.firstName} {admin.lastName}
                            </p>
                            <p className="text-sm text-gray-500">{admin.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {admin.isGroupVerified && (
                              <span title="Verified"><Shield className="w-4 h-4 text-cyan-500" /></span>
                            )}
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                {admin.groupName || intl.formatMessage({ id: 'groupAdmin.admin.list.na' })}
                              </p>
                              {admin.groupUrl && (
                                <a
                                  href={admin.groupUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="text-sm text-blue-500 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {intl.formatMessage({ id: 'groupAdmin.admin.list.viewGroup' })}
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="text-sm text-gray-900 dark:text-white">
                              {admin.groupType ? intl.formatMessage({ id: `groupAdmin.groupType.${admin.groupType}`, defaultMessage: admin.groupType }) : intl.formatMessage({ id: 'groupAdmin.admin.list.na' })}
                            </p>
                            <p className="text-xs text-gray-500">
                              {GROUP_SIZES.find(s => s.code === admin.groupSize)?.name || admin.groupSize || intl.formatMessage({ id: 'groupAdmin.admin.list.na' })}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          {getStatusBadge(admin.status)}
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-gray-900 dark:text-white">{admin.totalClients}</p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium text-green-600">{formatAmount(admin.totalEarned)}</p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <ChevronRight className="w-5 h-5 text-gray-400" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-white/10">
                  <p className="text-sm text-gray-500">
                    {intl.formatMessage({ id: 'groupAdmin.admin.list.showing' }, { from: (page - 1) * limit + 1, to: Math.min(page * limit, total), total })}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className={`${UI.button.secondary} px-3 py-1 disabled:opacity-50`}
                    >
                      {intl.formatMessage({ id: 'groupAdmin.admin.list.previous' })}
                    </button>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      {intl.formatMessage({ id: 'groupAdmin.admin.list.page' }, { page, totalPages })}
                    </span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className={`${UI.button.secondary} px-3 py-1 disabled:opacity-50`}
                    >
                      {intl.formatMessage({ id: 'groupAdmin.admin.list.next' })}
                    </button>
                  </div>
                </div>
              )}

              {groupAdmins.length === 0 && (
                <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                  <Users className="w-12 h-12 mb-4 opacity-50" />
                  <p>{intl.formatMessage({ id: 'groupAdmin.admin.list.noResults' })}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminGroupAdminsList;

/**
 * AdminProviderStats.tsx
 *
 * Admin page for monitoring provider performance statistics.
 * Displays hours online, missed calls, and compliance status.
 */

import React, { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  BarChart3,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  PhoneMissed,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from "lucide-react";
import { useIntl } from "react-intl";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import Button from "../../components/common/Button";
import {
  ProviderStatsRow,
  ProviderStatsFilters,
  ProviderStatsSortField,
  ProviderStatsSummary,
  PROVIDER_STATS_CONFIG,
  toProviderStatsRow,
} from "../../types/providerStats";

type SortDir = "asc" | "desc";

const AdminProviderStats: React.FC = () => {
  const intl = useIntl();
  const t = (key: string) =>
    intl.formatMessage({ id: `admin.providerStats.${key}`, defaultMessage: key });

  // Data state
  const [rows, setRows] = useState<ProviderStatsRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summary, setSummary] = useState<ProviderStatsSummary | null>(null);
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);

  // Filter state
  const [filters, setFilters] = useState<ProviderStatsFilters>(() => {
    const now = new Date();
    return {
      month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
      providerType: "all",
      compliance: "all",
      searchTerm: "",
    };
  });

  // Sort state
  const [sortBy, setSortBy] = useState<ProviderStatsSortField>("providerName");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // Pagination
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);

  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch available months on mount
  useEffect(() => {
    const fetchMonths = async () => {
      try {
        const getMonths = httpsCallable<Record<string, never>, { success: boolean; months: string[] }>(
          functions,
          "getProviderStatsMonths"
        );
        const result = await getMonths({});
        if (result.data.success && result.data.months.length > 0) {
          setAvailableMonths(result.data.months);
        }
      } catch (error) {
        console.error("Error fetching months:", error);
      }
    };
    fetchMonths();
  }, []);

  // Fetch data
  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);

    try {
      // Fetch stats
      const getStats = httpsCallable<
        {
          month: string;
          providerType: string;
          compliance: string;
          search: string;
          sortBy: string;
          sortDir: string;
          pageSize: number;
          offset: number;
        },
        { success: boolean; stats: any[]; total: number; month: string; error?: string }
      >(functions, "getProviderStats");

      const result = await getStats({
        month: filters.month,
        providerType: filters.providerType,
        compliance: filters.compliance,
        search: filters.searchTerm,
        sortBy,
        sortDir,
        pageSize,
        offset: (pageIndex - 1) * pageSize,
      });

      if (result.data.success) {
        setRows(result.data.stats.map(toProviderStatsRow));
        setTotalCount(result.data.total);
      } else {
        setErrorMsg(result.data.error || "Failed to fetch stats");
      }

      // Fetch summary
      const getSummary = httpsCallable<
        { month: string },
        { success: boolean; summary?: ProviderStatsSummary; error?: string }
      >(functions, "getProviderStatsSummary");

      const summaryResult = await getSummary({ month: filters.month });
      if (summaryResult.data.success && summaryResult.data.summary) {
        setSummary(summaryResult.data.summary);
      }
    } catch (error) {
      console.error("Error loading stats:", error);
      setErrorMsg(error instanceof Error ? error.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [filters, sortBy, sortDir, pageIndex, pageSize]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Reset page when filters change
  useEffect(() => {
    setPageIndex(1);
  }, [filters, sortBy, sortDir]);

  // Trigger manual aggregation
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const triggerAggregation = httpsCallable<
        { month: string },
        { success: boolean; message: string }
      >(functions, "triggerProviderStatsAggregation");

      await triggerAggregation({ month: filters.month });
      await loadData();
    } catch (error) {
      console.error("Error refreshing stats:", error);
      setErrorMsg(error instanceof Error ? error.message : "Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  // Export CSV
  const handleExport = async () => {
    try {
      const exportCsv = httpsCallable<
        { month: string; providerType: string },
        { success: boolean; csv?: string; filename?: string; error?: string }
      >(functions, "exportProviderStatsCsv");

      const result = await exportCsv({
        month: filters.month,
        providerType: filters.providerType,
      });

      if (result.data.success && result.data.csv) {
        const blob = new Blob([result.data.csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename || "provider_stats.csv";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error(result.data.error || "Export failed");
      }
    } catch (error) {
      console.error("Error exporting CSV:", error);
      toast.error("Export failed");
    }
  };

  // Sort handler
  const handleSort = (field: ProviderStatsSortField) => {
    if (sortBy === field) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins < 60) return `${mins}m ${secs}s`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  // Pagination
  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-red-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{t("title")}</h1>
              <p className="text-sm text-gray-500">{t("subtitle")}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowFilters(!showFilters)}
              variant="outline"
              size="small"
            >
              <Filter className="w-4 h-4 mr-2" />
              {t("filters")}
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="small"
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              {t("refresh")}
            </Button>
            <Button onClick={handleExport} variant="outline" size="small">
              <Download className="w-4 h-4 mr-2" />
              {t("export")}
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-500">{t("totalProviders")}</div>
              <div className="text-2xl font-bold">{summary.totalProviders}</div>
            </div>
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <div className="text-sm text-green-600">{t("compliant")}</div>
              <div className="text-2xl font-bold text-green-700">
                {summary.compliantProviders}
              </div>
            </div>
            <div className="bg-red-50 rounded-lg border border-red-200 p-4">
              <div className="text-sm text-red-600">{t("nonCompliant")}</div>
              <div className="text-2xl font-bold text-red-700">
                {summary.nonCompliantProviders}
              </div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-500">{t("complianceRate")}</div>
              <div className="text-2xl font-bold">{summary.complianceRate.toFixed(1)}%</div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-500">{t("avgHoursOnline")}</div>
              <div className="text-2xl font-bold">{summary.avgHoursOnline.toFixed(1)}h</div>
            </div>
            <div className="bg-white rounded-lg border p-4">
              <div className="text-sm text-gray-500">{t("avgMissedCalls")}</div>
              <div className="text-2xl font-bold">{summary.avgMissedCalls.toFixed(1)}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        {showFilters && (
          <div className="bg-gray-50 rounded-lg border p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Month selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {t("month")}
                </label>
                <select
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  {availableMonths.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              {/* Provider type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("providerType")}
                </label>
                <select
                  value={filters.providerType}
                  onChange={(e) =>
                    setFilters({ ...filters, providerType: e.target.value as any })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value="all">{t("allTypes")}</option>
                  <option value="lawyer">{t("lawyers")}</option>
                  <option value="expat">{t("expats")}</option>
                </select>
              </div>

              {/* Compliance filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("complianceFilter")}
                </label>
                <select
                  value={filters.compliance}
                  onChange={(e) =>
                    setFilters({ ...filters, compliance: e.target.value as any })
                  }
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                >
                  <option value="all">{t("allCompliance")}</option>
                  <option value="compliant">{t("compliantOnly")}</option>
                  <option value="non-compliant">{t("nonCompliantOnly")}</option>
                </select>
              </div>

              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Search className="w-4 h-4 inline mr-1" />
                  {t("search")}
                </label>
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  placeholder={t("searchPlaceholder")}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{errorMsg}</span>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    onClick={() => handleSort("providerName")}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    {t("name")}
                    {sortBy === "providerName" && (sortDir === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("type")}
                  </th>
                  <th
                    onClick={() => handleSort("hoursOnline")}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <Clock className="w-4 h-4 inline mr-1" />
                    {t("hoursOnline")}
                    {sortBy === "hoursOnline" && (sortDir === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th
                    onClick={() => handleSort("callsReceived")}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <Phone className="w-4 h-4 inline mr-1" />
                    {t("callsReceived")}
                    {sortBy === "callsReceived" && (sortDir === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th
                    onClick={() => handleSort("callsMissed")}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    <PhoneMissed className="w-4 h-4 inline mr-1" />
                    {t("callsMissed")}
                    {sortBy === "callsMissed" && (sortDir === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th
                    onClick={() => handleSort("avgCallDuration")}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    {t("avgDuration")}
                    {sortBy === "avgCallDuration" && (sortDir === "asc" ? " ↑" : " ↓")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("status")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      {t("loading")}
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {t("noData")}
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{row.providerName}</div>
                        <div className="text-sm text-gray-500">{row.providerEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            row.providerType === "lawyer"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-purple-100 text-purple-800"
                          }`}
                        >
                          {row.providerType === "lawyer" ? t("lawyer") : t("expat")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              row.hoursCompliant ? "text-green-600" : "text-red-600 font-medium"
                            }
                          >
                            {row.hoursOnline.toFixed(1)}h
                          </span>
                          <span className="text-gray-400">
                            / {PROVIDER_STATS_CONFIG.HOURS_ONLINE_TARGET}h
                          </span>
                          {row.hoursCompliant ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {row.callsReceived}
                        <span className="text-gray-400 ml-1">
                          ({row.callsAnswered} {t("answered")})
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={
                              row.missedCallsCompliant
                                ? "text-green-600"
                                : "text-red-600 font-medium"
                            }
                          >
                            {row.callsMissed}
                          </span>
                          <span className="text-gray-400">
                            / {PROVIDER_STATS_CONFIG.MISSED_CALLS_TARGET}
                          </span>
                          {row.missedCallsCompliant ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {formatDuration(row.avgCallDuration)}
                      </td>
                      <td className="px-4 py-3">
                        {row.isCompliant ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <CheckCircle2 className="w-3 h-3" />
                            {t("compliant")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3" />
                            {t("nonCompliant")}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t">
            <div className="text-sm text-gray-500">
              {t("showing")} {(pageIndex - 1) * pageSize + 1}-
              {Math.min(pageIndex * pageSize, totalCount)} {t("of")} {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPageIndex(1);
                }}
                className="rounded-md border-gray-300 text-sm"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <Button
                onClick={() => setPageIndex(pageIndex - 1)}
                disabled={pageIndex === 1}
                variant="outline"
                size="small"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-700">
                {pageIndex} / {totalPages || 1}
              </span>
              <Button
                onClick={() => setPageIndex(pageIndex + 1)}
                disabled={pageIndex >= totalPages}
                variant="outline"
                size="small"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Info box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-800 mb-2">{t("requirementsTitle")}</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>
              <Clock className="w-4 h-4 inline mr-1" />
              {t("hoursRequirement")} {PROVIDER_STATS_CONFIG.HOURS_ONLINE_TARGET}h
            </li>
            <li>
              <PhoneMissed className="w-4 h-4 inline mr-1" />
              {t("missedCallsRequirement")} {PROVIDER_STATS_CONFIG.MISSED_CALLS_TARGET}
            </li>
          </ul>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminProviderStats;

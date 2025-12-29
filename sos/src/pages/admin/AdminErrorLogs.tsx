import React, { useState, useEffect, useCallback } from "react";
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../config/firebase";
import AdminLayout from "../../components/admin/AdminLayout";
import ErrorBoundary from "../../components/common/ErrorBoundary";
import { useIntl } from "react-intl";
import {
  AlertTriangle,
  Filter,
  RefreshCw,
  Search,
  X,
  Calendar,
  User,
  Globe,
  Code,
  FileText,
  AlertCircle,
} from "lucide-react";

interface ErrorLog {
  id: string;
  origin?: string;
  userId?: string;
  error?: string;
  message?: string;
  context?: Record<string, unknown> | {
    error?: string;
    origin?: string;
    timestamp?: string | Date | Timestamp;
    url?: string;
    userAgent?: string;
    component?: string;
    componentStack?: string;
    [key: string]: unknown;
  };
  timestamp?: Timestamp | Date;
  userAgent?: string;
  url?: string;
  severity?: "low" | "medium" | "high" | "critical";
  errorType?: string;
  stack?: string;
  environment?: string;
  component?: string;
  componentStack?: string;
}

const AdminErrorLogs: React.FC = () => {
  const intl = useIntl();
  const t = (id: string, values?: Record<string, any>) => intl.formatMessage({ id }, values);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ErrorLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [orderByField, setOrderByField] = useState<"timestamp" | "createdAt" | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  const BATCH_SIZE = 10; // Load 10 logs at a time

  const parseLogData = useCallback((doc: QueryDocumentSnapshot<DocumentData>): ErrorLog => {
    const data = doc.data() as Record<string, unknown>;
    
    // Handle nested context structure - extract fields from context if they exist
    const context = data.context as Record<string, unknown> | undefined;
    const hasNestedContext = context && typeof context === 'object' && ('error' in context || 'origin' in context);
    
    // Extract timestamp - check both top-level and nested context
    let timestamp: Date | undefined;
    if (data.timestamp) {
      const ts = data.timestamp;
      timestamp = ts instanceof Timestamp ? ts.toDate() : (ts as { toDate?: () => Date })?.toDate?.() || (ts instanceof Date ? ts : undefined);
    } else if (context?.timestamp) {
      const ctxTimestamp = context.timestamp;
      if (ctxTimestamp instanceof Timestamp) {
        timestamp = ctxTimestamp.toDate();
      } else if (typeof ctxTimestamp === 'string') {
        timestamp = new Date(ctxTimestamp);
      } else if (ctxTimestamp instanceof Date) {
        timestamp = ctxTimestamp;
      }
    } else if (data.createdAt) {
      const createdAt = data.createdAt;
      timestamp = createdAt instanceof Timestamp ? createdAt.toDate() : (createdAt as { toDate?: () => Date })?.toDate?.() || (createdAt instanceof Date ? createdAt : undefined);
    }
    
    // Build the log object, prioritizing nested context fields if they exist
    return {
      id: doc.id,
      // Top-level fields (from server-side logs)
      severity: data.severity as "low" | "medium" | "high" | "critical" | undefined,
      errorType: data.errorType as string | undefined,
      stack: data.stack as string | undefined,
      environment: data.environment as string | undefined,
      message: data.message as string | undefined,
      userId: data.userId as string | undefined,
      // Extract from nested context if present, otherwise use top-level
      error: hasNestedContext ? (context?.error as string | undefined) : (data.error as string | undefined),
      origin: hasNestedContext ? (context?.origin as string | undefined) : (data.origin as string | undefined),
      url: hasNestedContext ? (context?.url as string | undefined) : (data.url as string | undefined),
      userAgent: hasNestedContext ? (context?.userAgent as string | undefined) : (data.userAgent as string | undefined),
      component: hasNestedContext ? (context?.component as string | undefined) : (data.component as string | undefined),
      componentStack: hasNestedContext ? (context?.componentStack as string | undefined) : (data.componentStack as string | undefined),
      timestamp: timestamp || new Date(),
      context: context || (data.context as Record<string, unknown> | undefined),
    };
  }, []);

  const loadErrorLogs = useCallback(async (reset: boolean = false) => {
    try {
      if (reset) {
        setIsLoading(true);
        setErrorLogs([]);
        setLastDoc(null);
        setHasMore(true);
        setOrderByField(null); // Reset ordering field on reset
      } else {
        setIsLoadingMore(true);
      }
      setError(null);

      const errorLogsRef = collection(db, "error_logs");
      
      // Determine which field to use for ordering
      // On reset or first load, try timestamp first, then createdAt if needed
      // On pagination, use the already determined field
      let fieldToUse: "timestamp" | "createdAt" | null = orderByField || null;
      let q;
      let snapshot;
      
      // On reset or first load, detect which field works
      if (reset || !orderByField) {
        // Try timestamp first
        try {
          q = query(errorLogsRef, orderBy("timestamp", "desc"), limit(BATCH_SIZE));
          snapshot = await getDocs(q);
          fieldToUse = "timestamp";
          setOrderByField("timestamp");
        } catch (timestampErr) {
          // timestamp failed, try createdAt
          try {
            q = query(errorLogsRef, orderBy("createdAt", "desc"), limit(BATCH_SIZE));
            snapshot = await getDocs(q);
            fieldToUse = "createdAt";
            setOrderByField("createdAt");
          } catch (createdAtErr) {
            // Both failed - this shouldn't happen normally, but handle gracefully
            console.error("Cannot order by timestamp or createdAt:", createdAtErr);
            setError("Unable to load error logs: database query issue");
            setHasMore(false);
            return;
          }
        }
      } else {
        // Pagination: use the already determined field
        if (!lastDoc || !fieldToUse) {
          setHasMore(false);
          return;
        }

        try {
          q = query(
            errorLogsRef,
            orderBy(fieldToUse, "desc"),
            startAfter(lastDoc),
            limit(BATCH_SIZE)
          );
          snapshot = await getDocs(q);
        } catch (paginationErr) {
          console.error("Error during pagination:", paginationErr);
          setError("Error loading more logs. Please refresh and try again.");
          setHasMore(false);
          return;
        }
      }

      const logs: ErrorLog[] = [];

      snapshot.forEach((doc) => {
        logs.push(parseLogData(doc));
      });

      if (snapshot.docs.length > 0) {
        setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
        setHasMore(snapshot.docs.length === BATCH_SIZE);
      } else {
        setHasMore(false);
      }

      if (reset) {
        setErrorLogs(logs);
      } else {
        setErrorLogs(prev => [...prev, ...logs]);
      }
    } catch (err) {
      console.error("Error loading error logs:", err);
      setError(err instanceof Error ? err.message : "Failed to load error logs");
      setHasMore(false);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [lastDoc, parseLogData, orderByField]);

  useEffect(() => {
    loadErrorLogs(true);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...errorLogs];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          log.error?.toLowerCase().includes(query) ||
          log.message?.toLowerCase().includes(query) ||
          log.errorType?.toLowerCase().includes(query) ||
          log.origin?.toLowerCase().includes(query) ||
          log.userId?.toLowerCase().includes(query) ||
          JSON.stringify(log.context || {}).toLowerCase().includes(query)
      );
    }

    // Origin filter
    if (originFilter !== "all") {
      filtered = filtered.filter((log) => log.origin === originFilter);
    }

    // Date filter
    if (dateFilter !== "all") {
      const now = new Date();
      let cutoffDate: Date;

      switch (dateFilter) {
        case "today":
          cutoffDate = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          cutoffDate = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          cutoffDate = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          cutoffDate = new Date(0);
      }

      filtered = filtered.filter((log) => {
        if (!log.timestamp) return false;
        const logDate = log.timestamp instanceof Date 
          ? log.timestamp 
          : log.timestamp instanceof Timestamp
          ? log.timestamp.toDate()
          : new Date(String(log.timestamp));
        return logDate >= cutoffDate;
      });
    }

    setFilteredLogs(filtered);
  }, [errorLogs, searchQuery, originFilter, dateFilter]);


  const formatDate = (date: Date | Timestamp | string | undefined) => {
    if (!date) return "N/A";
    const d = date instanceof Date ? date : new Date(date as string);
    return d.toLocaleString("fr-FR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getUniqueOrigins = () => {
    const origins = new Set<string>();
    errorLogs.forEach((log) => {
      if (log.origin) origins.add(log.origin);
    });
    return Array.from(origins).sort();
  };

  const getErrorStats = () => {
    const stats = {
      total: errorLogs.length,
      frontend: errorLogs.filter((log) => log.origin === "frontend").length,
      cloudFunction: errorLogs.filter((log) => log.origin === "cloudFunction").length,
    };
    return stats;
  };

  const stats = getErrorStats();

  return (
    <ErrorBoundary>
      <AdminLayout>
        <div className="min-h-screen bg-gray-50 p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                  <AlertTriangle className="w-8 h-8 mr-3 text-red-600" />
                  {t('admin.errorLogs.title')}
                </h1>
                <p className="text-gray-600 mt-2">
                  {t('admin.errorLogs.description')}
                </p>
              </div>
              <button
                onClick={() => loadErrorLogs(true)}
                disabled={isLoading}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                {t('common.refresh')}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('admin.errorLogs.totalErrors')}</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t('admin.errorLogs.frontend')}</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.frontend}</p>
                </div>
                <Globe className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6 border border-gray-200">
            <div className="flex items-center mb-4">
              <Filter className="w-5 h-5 mr-2 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">{t('common.filters')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('common.search')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('admin.errorLogs.searchPlaceholder')}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                    </button>
                  )}
                </div>
              </div>

              {/* Origin Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.errorLogs.origin')}
                </label>
                <select
                  value={originFilter}
                  onChange={(e) => setOriginFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{t('common.all')}</option>
                  {getUniqueOrigins().map((origin) => (
                    <option key={origin} value={origin}>
                      {origin}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('admin.errorLogs.period')}
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="all">{t('common.all')}</option>
                  <option value="today">{t('admin.errorLogs.today')}</option>
                  <option value="week">{t('admin.errorLogs.last7Days')}</option>
                  <option value="month">{t('admin.errorLogs.last30Days')}</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error Logs Table */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.errorLogs.origin')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.errorLogs.error')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.errorLogs.userAgent')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('admin.errorLogs.date')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                        <p className="text-gray-500 mt-2">{t('admin.errorLogs.loading')}</p>
                      </td>
                    </tr>
                  ) : filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                        {t('admin.errorLogs.noLogs')}
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex items-center">
                            <Code className="w-4 h-4 mr-1 text-gray-400" />
                            {log.origin || "N/A"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-md">
                          <div className="truncate">
                            {log.error || log.message || "No error message"}
                          </div>
                          {log.errorType && (
                            <div className="text-xs text-gray-500 mt-1">
                              Type: {log.errorType}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                          <div className="truncate" title={log.userAgent || "N/A"}>
                            {log.userAgent || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                            {formatDate(log.timestamp)}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Results count and Load More button */}
          <div className="mt-4 flex flex-col items-center gap-4">
            <div className="text-sm text-gray-600">
              {t('admin.errorLogs.displayingErrors', { count: filteredLogs.length })}
            </div>
            {hasMore && (
              <button
                onClick={() => loadErrorLogs(false)}
                disabled={isLoadingMore || isLoading}
                className="flex items-center px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoadingMore ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  <>
                    {t('common.showMore')}
                  </>
                )}
              </button>
            )}
            {!hasMore && errorLogs.length > 0 && (
              <div className="text-sm text-gray-500">
                {t('admin.errorLogs.allLoaded')}
              </div>
            )}
          </div>
        </div>
      </AdminLayout>
    </ErrorBoundary>
  );
};

export default AdminErrorLogs;


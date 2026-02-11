import React, { useState, useEffect } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import AdminLayout from "../../../components/admin/AdminLayout";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../config/firebase";
import {
  Inbox,
  RefreshCw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface QueueStats {
  queueDepth: { pending: number; sending: number; dead: number; total: number };
  dailyStats: Array<{ date: string; sent: number; failed: number }>;
  hourlyCounts: Record<string, number>;
}

const AdminTelegramQueue: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QueueStats | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await httpsCallable(functions, "telegram_getQueueStats")({});
      setStats(res.data as QueueStats);
    } catch (err) {
      console.error("Failed to load queue stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  // Build hourly chart data
  const hourlyData = stats?.hourlyCounts
    ? Array.from({ length: 24 }, (_, i) => {
        const hour = i.toString().padStart(2, "0");
        return {
          hour: `${hour}h`,
          count: stats.hourlyCounts[hour] || 0,
        };
      })
    : [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Inbox className="h-7 w-7 text-sky-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("admin.telegram.queue.title")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("admin.telegram.queue.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("admin.telegram.refresh")}
          </button>
        </div>

        {/* Queue Depth Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t("admin.telegram.queue.pending")}</span>
              <Clock className="h-5 w-5 text-yellow-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {stats?.queueDepth?.pending || 0}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t("admin.telegram.queue.sending")}</span>
              <RefreshCw className="h-5 w-5 text-blue-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {stats?.queueDepth?.sending || 0}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t("admin.telegram.queue.total")}</span>
              <CheckCircle className="h-5 w-5 text-green-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {stats?.queueDepth?.total || 0}
              </p>
            )}
          </div>
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t("admin.telegram.deadLetters")}</span>
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p
                className={`text-2xl font-bold ${
                  (stats?.queueDepth?.dead || 0) > 0 ? "text-red-600" : "text-gray-900"
                }`}
              >
                {stats?.queueDepth?.dead || 0}
              </p>
            )}
            {(stats?.queueDepth?.dead || 0) > 0 && (
              <div className="flex items-center gap-1 mt-1 text-xs text-red-500">
                <XCircle className="h-3 w-3" />
                {t("admin.telegram.queue.deadWarning")}
              </div>
            )}
          </div>
        </div>

        {/* Hourly Chart */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("admin.telegram.queue.hourlyChart")}
          </h2>
          {loading ? (
            <div className="h-64 bg-gray-50 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0ea5e9" name={t("admin.telegram.queue.messages")} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 7-Day Trend */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("admin.telegram.last7Days")}
          </h2>
          {loading ? (
            <div className="h-64 bg-gray-50 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={
                  stats?.dailyStats?.map((d) => ({
                    date: d.date.slice(5),
                    sent: d.sent,
                    failed: d.failed,
                  })) || []
                }
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="sent" fill="#22c55e" name={t("admin.telegram.sent")} stackId="a" />
                <Bar dataKey="failed" fill="#ef4444" name={t("admin.telegram.failed")} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramQueue;

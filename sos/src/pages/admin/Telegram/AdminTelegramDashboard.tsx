import React, { useState, useEffect } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import AdminLayout from "../../../components/admin/AdminLayout";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../config/firebase";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  Bot,
  CheckCircle,
  AlertTriangle,
  Send,
  Users,
  Inbox,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface QueueStats {
  queueDepth: { pending: number; sending: number; dead: number; total: number };
  dailyStats: Array<{ date: string; sent: number; failed: number }>;
  hourlyCounts: Record<string, number>;
}

interface SubscriberStats {
  total: number;
  breakdown: Record<string, number>;
}

const AdminTelegramDashboard: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [botStatus, setBotStatus] = useState<{ ok: boolean; botUsername?: string } | null>(null);
  const [queueStats, setQueueStats] = useState<QueueStats | null>(null);
  const [subscriberStats, setSubscriberStats] = useState<SubscriberStats | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [botRes, queueRes, subRes] = await Promise.all([
        httpsCallable(functions, "telegram_validateBot")({}),
        httpsCallable(functions, "telegram_getQueueStats")({}),
        httpsCallable(functions, "telegram_getSubscriberStats")({}),
      ]);
      setBotStatus(botRes.data as { ok: boolean; botUsername?: string });
      setQueueStats(queueRes.data as QueueStats);
      setSubscriberStats(subRes.data as SubscriberStats);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const chartData = queueStats?.dailyStats?.map((d) => ({
    date: d.date.slice(5), // MM-DD
    sent: d.sent,
    failed: d.failed,
  })) || [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Send className="h-7 w-7 text-sky-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("admin.telegram.dashboard.title")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("admin.telegram.dashboard.subtitle")}
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {t("admin.telegram.refresh")}
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Bot Status */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t("admin.telegram.botStatus")}</span>
              <Bot className="h-5 w-5 text-gray-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            ) : botStatus?.ok ? (
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-semibold text-green-700">@{botStatus.botUsername}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="font-semibold text-red-700">{t("admin.telegram.botOffline")}</span>
              </div>
            )}
          </div>

          {/* Subscribers */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t("admin.telegram.subscribers")}</span>
              <Users className="h-5 w-5 text-gray-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{subscriberStats?.total || 0}</p>
            )}
          </div>

          {/* Queue Depth */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t("admin.telegram.queueDepth")}</span>
              <Inbox className="h-5 w-5 text-gray-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">
                {queueStats?.queueDepth?.total || 0}
              </p>
            )}
          </div>

          {/* Dead Letters */}
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{t("admin.telegram.deadLetters")}</span>
              <AlertTriangle className="h-5 w-5 text-gray-400" />
            </div>
            {loading ? (
              <div className="h-8 bg-gray-100 rounded animate-pulse" />
            ) : (
              <p className={`text-2xl font-bold ${(queueStats?.queueDepth?.dead || 0) > 0 ? "text-red-600" : "text-gray-900"}`}>
                {queueStats?.queueDepth?.dead || 0}
              </p>
            )}
          </div>
        </div>

        {/* 7-Day Chart */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t("admin.telegram.last7Days")}
            </h2>
          </div>
          {loading ? (
            <div className="h-64 bg-gray-50 rounded animate-pulse" />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="sent" fill="#22c55e" name={t("admin.telegram.sent")} />
                <Bar dataKey="failed" fill="#ef4444" name={t("admin.telegram.failed")} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => navigate("/admin/telegram/config")}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border hover:bg-gray-50 transition-colors text-left"
          >
            <div className="p-2 bg-sky-50 rounded-lg">
              <Bot className="h-5 w-5 text-sky-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t("admin.telegram.configureBot")}</p>
              <p className="text-xs text-gray-500">{t("admin.telegram.configureBot.desc")}</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/admin/telegram/campaigns/create")}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border hover:bg-gray-50 transition-colors text-left"
          >
            <div className="p-2 bg-green-50 rounded-lg">
              <Send className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t("admin.telegram.newCampaign")}</p>
              <p className="text-xs text-gray-500">{t("admin.telegram.newCampaign.desc")}</p>
            </div>
          </button>
          <button
            onClick={() => navigate("/admin/telegram/logs")}
            className="flex items-center gap-3 p-4 bg-white rounded-xl border hover:bg-gray-50 transition-colors text-left"
          >
            <div className="p-2 bg-purple-50 rounded-lg">
              <Clock className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">{t("admin.telegram.viewLogs")}</p>
              <p className="text-xs text-gray-500">{t("admin.telegram.viewLogs.desc")}</p>
            </div>
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramDashboard;

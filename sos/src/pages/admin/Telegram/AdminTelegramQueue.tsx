import React, { useState, useEffect } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../config/firebase";
import {
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
    <div className="space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">File d'attente</h2>
            <p className="text-sm text-gray-500 mt-1">Suivi en temps réel de la file d'attente des messages</p>
          </div>
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Rafraîchir
          </button>
        </div>

        {/* Queue Depth Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">En attente</span>
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
              <span className="text-sm text-gray-500">En cours d'envoi</span>
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
              <span className="text-sm text-gray-500">Total actif</span>
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
              <span className="text-sm text-gray-500">Messages échoués</span>
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
                Messages nécessitant une intervention
              </div>
            )}
          </div>
        </div>

        {/* Hourly Chart */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Envois par heure (aujourd'hui)
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
                <Bar dataKey="count" fill="#0ea5e9" name="Messages" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 7-Day Trend */}
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Tendance sur 7 jours
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
                <Bar dataKey="sent" fill="#22c55e" name="Envoyés" stackId="a" />
                <Bar dataKey="failed" fill="#ef4444" name="Échoués" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
  );
};

export default AdminTelegramQueue;

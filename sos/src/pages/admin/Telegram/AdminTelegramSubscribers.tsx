import React, { useState, useEffect } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import AdminLayout from "../../../components/admin/AdminLayout";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../config/firebase";
import { Users, RefreshCw } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";

interface SubscriberStats {
  total: number;
  breakdown: Record<string, number>;
  countedAt: string;
}

const COLORS = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#6366f1"];

const ROLE_LABELS: Record<string, string> = {
  chatter: "Chatters",
  influencer: "Influenceurs",
  blogger: "Blogueurs",
  groupAdmin: "Group Admins",
  admin: "Admins",
};

const AdminTelegramSubscribers: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<SubscriberStats | null>(null);

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await httpsCallable(functions, "telegram_getSubscriberStats")({});
      setStats(res.data as SubscriberStats);
    } catch (err) {
      console.error("Failed to load subscriber stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const pieData = stats?.breakdown
    ? Object.entries(stats.breakdown)
        .filter(([, count]) => count > 0)
        .map(([role, count]) => ({
          name: ROLE_LABELS[role] || role,
          value: count,
        }))
    : [];

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-sky-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("admin.telegram.subscribers.title")}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                {t("admin.telegram.subscribers.subtitle")}
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

        {/* Total Card */}
        <div className="bg-white rounded-xl border p-6">
          <div className="text-center">
            {loading ? (
              <div className="h-16 w-32 mx-auto bg-gray-100 rounded animate-pulse" />
            ) : (
              <>
                <p className="text-5xl font-bold text-sky-600">{stats?.total || 0}</p>
                <p className="text-sm text-gray-500 mt-2">
                  {t("admin.telegram.subscribers.totalConnected")}
                </p>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pie Chart */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("admin.telegram.subscribers.byRole")}
            </h2>
            {loading ? (
              <div className="h-64 bg-gray-50 rounded animate-pulse" />
            ) : pieData.length === 0 ? (
              <div className="flex items-center justify-center h-64 text-gray-400">
                {t("admin.telegram.subscribers.noData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={(props) =>
                      `${props.name || ""} (${(((props.percent as number) ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Breakdown Table */}
          <div className="bg-white rounded-xl border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {t("admin.telegram.subscribers.breakdown")}
            </h2>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Object.entries(stats?.breakdown || {}).map(([role, count], i) => (
                  <div
                    key={role}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-sm font-medium text-gray-700">
                        {ROLE_LABELS[role] || role}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{count}</span>
                  </div>
                ))}
                {/* Total row */}
                <div className="flex items-center justify-between p-3 bg-sky-50 rounded-lg border border-sky-100 mt-3">
                  <span className="text-sm font-semibold text-sky-700">Total</span>
                  <span className="text-sm font-bold text-sky-700">{stats?.total || 0}</span>
                </div>
              </div>
            )}
            {stats?.countedAt && (
              <p className="text-xs text-gray-400 mt-4">
                {t("admin.telegram.subscribers.lastCount")}{" "}
                {new Date(stats.countedAt).toLocaleString("fr-FR", {
                  timeZone: "Europe/Paris",
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramSubscribers;

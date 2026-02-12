import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Send,
  AlertTriangle,
  TrendingUp,
  Megaphone,
  ScrollText,
  RefreshCw,
  Zap,
  BarChart3,
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
import { useDashboard, useSyncSubscribers } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { format, parseISO } from "date-fns";

function KPICard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useDashboard();
  const syncMutation = useSyncSubscribers();

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const chartData = data.dailyStats.map((d) => ({
    date: format(parseISO(d.date), "dd/MM"),
    sent: d.sent,
    failed: d.failed,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label={t("dashboard.totalSubscribers")}
          value={data.subscribers.total.toLocaleString()}
          icon={Users}
          color="bg-telegram-500"
        />
        <KPICard
          label={t("dashboard.sentToday")}
          value={data.messages.sentToday.toLocaleString()}
          icon={Send}
          color="bg-green-500"
        />
        <KPICard
          label={t("dashboard.failedToday")}
          value={data.messages.failedToday}
          icon={AlertTriangle}
          color="bg-red-500"
        />
        <KPICard
          label={t("dashboard.successRate")}
          value={`${data.messages.successRate}%`}
          icon={TrendingUp}
          color="bg-purple-500"
        />
      </div>

      {/* Automation KPIs */}
      {data.automations && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            label="Active Automations"
            value={data.automations.active}
            icon={Zap}
            color="bg-amber-500"
          />
          <KPICard
            label="Active Enrollments"
            value={data.automations.activeEnrollments.toLocaleString()}
            icon={Users}
            color="bg-indigo-500"
          />
          <KPICard
            label="Completed Enrollments"
            value={data.automations.completedEnrollments.toLocaleString()}
            icon={TrendingUp}
            color="bg-cyan-500"
          />
          <KPICard
            label="Total Automations"
            value={data.automations.total}
            icon={Zap}
            color="bg-gray-500"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("dashboard.last30Days")}
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip />
              <Legend />
              <Bar dataKey="sent" fill="#0088cc" name={t("campaigns.sent")} radius={[2, 2, 0, 0]} />
              <Bar dataKey="failed" fill="#ef4444" name={t("campaigns.failed")} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("dashboard.quickActions")}
          </h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/campaigns/new")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors"
            >
              <Megaphone className="w-5 h-5 text-telegram-500" />
              <span className="text-sm font-medium">{t("dashboard.newCampaign")}</span>
            </button>
            <button
              onClick={() => navigate("/analytics")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors"
            >
              <BarChart3 className="w-5 h-5 text-telegram-500" />
              <span className="text-sm font-medium">{t("nav.analytics")}</span>
            </button>
            <button
              onClick={() => navigate("/logs")}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors"
            >
              <ScrollText className="w-5 h-5 text-telegram-500" />
              <span className="text-sm font-medium">{t("dashboard.viewLogs")}</span>
            </button>
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-left transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 text-telegram-500 ${syncMutation.isPending ? "animate-spin" : ""}`} />
              <span className="text-sm font-medium">{t("dashboard.syncSubscribers")}</span>
            </button>
          </div>

          {/* Stats summary */}
          <div className="mt-6 pt-4 border-t border-gray-200 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t("dashboard.activeCampaigns")}</span>
              <span className="font-medium">{data.campaigns.active}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t("dashboard.queuePending")}</span>
              <span className="font-medium">{data.messages.queuePending}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{t("dashboard.totalCampaigns")}</span>
              <span className="font-medium">{data.campaigns.total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

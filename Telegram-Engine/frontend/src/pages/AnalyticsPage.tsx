import { useTranslation } from "react-i18next";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAnalytics } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";

const COLORS = ["#0088cc", "#22c55e", "#ef4444", "#f59e0b", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16", "#f97316"];

export default function AnalyticsPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useAnalytics();

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  // Delivery breakdown for pie chart
  const deliveryPieData = Object.entries(data.deliveryLast30d).map(([status, count]) => ({
    name: status,
    value: count,
  }));

  // Language breakdown for bar chart
  const langBarData = data.languageBreakdown.map((l) => ({
    language: l.language.toUpperCase(),
    messages: l.count,
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("analytics.title")}</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">{t("analytics.sent7d")}</p>
          <p className="text-2xl font-bold text-green-600">{(data.deliveryLast7d["sent"] ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">{t("analytics.failed7d")}</p>
          <p className="text-2xl font-bold text-red-600">{(data.deliveryLast7d["failed"] ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">{t("analytics.sent30d")}</p>
          <p className="text-2xl font-bold text-telegram-600">{(data.deliveryLast30d["sent"] ?? 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">{t("analytics.failed30d")}</p>
          <p className="text-2xl font-bold text-orange-600">{(data.deliveryLast30d["failed"] ?? 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Status Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("analytics.deliveryStatus30d")}
          </h2>
          {deliveryPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={deliveryPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {deliveryPieData.map((_entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-10">{t("common.noData")}</p>
          )}
        </div>

        {/* Messages by Language */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {t("analytics.messagesByLanguage30d")}
          </h2>
          {langBarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={langBarData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="language" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip />
                <Bar dataKey="messages" fill="#0088cc" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 text-center py-10">{t("common.noData")}</p>
          )}
        </div>
      </div>

      {/* Top Campaigns */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {t("analytics.topCampaigns")}
        </h2>
        {data.topCampaigns.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-3">{t("campaigns.name")}</th>
                  <th className="pb-2 pr-3">{t("campaigns.type")}</th>
                  <th className="pb-2 pr-3">{t("campaigns.target")}</th>
                  <th className="pb-2 pr-3">{t("campaigns.sent")}</th>
                  <th className="pb-2 pr-3">{t("campaigns.failed")}</th>
                  <th className="pb-2">{t("analytics.successRate")}</th>
                </tr>
              </thead>
              <tbody>
                {data.topCampaigns.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium">{c.name}</td>
                    <td className="py-2 pr-3">{c.type}</td>
                    <td className="py-2 pr-3">{c.targetCount}</td>
                    <td className="py-2 pr-3 text-green-600">{c.sentCount}</td>
                    <td className="py-2 pr-3 text-red-600">{c.failedCount}</td>
                    <td className="py-2">
                      <span className={c.successRate >= 95 ? "text-green-600" : c.successRate >= 80 ? "text-yellow-600" : "text-red-600"}>
                        {c.successRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">{t("analytics.noCampaignData")}</p>
        )}
      </div>
    </div>
  );
}

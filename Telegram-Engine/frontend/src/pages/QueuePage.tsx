import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";
import { useQueue } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function QueuePage() {
  const { t } = useTranslation();
  const { data, isLoading, dataUpdatedAt } = useQueue();

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const depthData = [
    { name: t("queue.pending"), value: data.depth.pending, fill: "#F59E0B" },
    { name: t("queue.queued"), value: data.depth.queued, fill: "#3B82F6" },
    { name: t("queue.sent"), value: data.depth.sent, fill: "#10B981" },
    { name: t("queue.failed"), value: data.depth.failed, fill: "#EF4444" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("queue.title")}</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <RefreshCw className="w-4 h-4" />
          {t("queue.autoRefresh")}
          <span className="text-xs text-gray-400">
            (last: {new Date(dataUpdatedAt).toLocaleTimeString()})
          </span>
        </div>
      </div>

      {/* Depth Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: t("queue.pending"), value: data.depth.pending, color: "text-yellow-600 bg-yellow-50" },
          { label: t("queue.queued"), value: data.depth.queued, color: "text-blue-600 bg-blue-50" },
          { label: t("queue.sent"), value: data.depth.sent, color: "text-green-600 bg-green-50" },
          { label: t("queue.failed"), value: data.depth.failed, color: "text-red-600 bg-red-50" },
          { label: t("queue.total"), value: data.depth.total, color: "text-gray-600 bg-gray-50" },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl border border-gray-200 p-5 ${item.color.split(" ")[1]}`}>
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className={`text-3xl font-bold ${item.color.split(" ")[0]}`}>{item.value.toLocaleString()}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("queue.depth")}</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={depthData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis fontSize={12} />
            <Tooltip />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {depthData.map((entry, i) => (
                <Cell key={i} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import { useHealth } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Badge from "../components/ui/Badge";

export default function HealthPage() {
  const { t } = useTranslation();
  const { data, isLoading } = useHealth();

  if (isLoading) return <LoadingSpinner />;
  if (!data) return null;

  const uptimeMinutes = Math.floor(data.uptime / 60);
  const uptimeHours = Math.floor(uptimeMinutes / 60);
  const uptimeDays = Math.floor(uptimeHours / 24);

  const formatUptime = () => {
    if (uptimeDays > 0) return `${uptimeDays}d ${uptimeHours % 24}h`;
    if (uptimeHours > 0) return `${uptimeHours}h ${uptimeMinutes % 60}m`;
    return `${uptimeMinutes}m`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{t("health.title")}</h1>
        <Badge variant={data.status === "healthy" ? "completed" : "failed"}>
          {data.status}
        </Badge>
      </div>

      {/* Alerts */}
      {data.alerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-red-800 mb-2">{t("health.activeAlerts")}</h2>
          <ul className="space-y-1">
            {data.alerts.map((alert, i) => (
              <li key={i} className="text-sm text-red-700">• {alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">{t("health.uptime")}</p>
          <p className="text-2xl font-bold text-gray-900">{formatUptime()}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">{t("health.lastCheck")}</p>
          <p className="text-lg font-semibold text-gray-900">
            {new Date(data.timestamp).toLocaleTimeString()}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500 mb-1">{t("health.status")}</p>
          <p className={`text-2xl font-bold ${data.status === "healthy" ? "text-green-600" : "text-red-600"}`}>
            {data.status}
          </p>
        </div>
      </div>

      {/* Infrastructure Checks */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("health.infrastructure")}</h2>
        <div className="space-y-3">
          {Object.entries(data.checks).map(([name, check]) => (
            <div key={name} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${check.status === "ok" ? "bg-green-500" : "bg-red-500"}`} />
                <span className="font-medium capitalize">{name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                {check.latencyMs !== undefined && <span>{check.latencyMs}ms</span>}
                <Badge variant={check.status === "ok" ? "completed" : "failed"}>
                  {check.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Queue Health */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("health.queueHealth")}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2 pr-4">{t("health.queue")}</th>
                <th className="pb-2 pr-4">{t("health.waiting")}</th>
                <th className="pb-2 pr-4">{t("health.active")}</th>
                <th className="pb-2 pr-4">{t("health.delayed")}</th>
                <th className="pb-2">{t("health.failed")}</th>
              </tr>
            </thead>
            <tbody>
              {data.queues.map((q) => (
                <tr key={q.name} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-medium">{q.name}</td>
                  <td className="py-2 pr-4">
                    <span className={q.waiting > 100 ? "text-yellow-600 font-semibold" : ""}>
                      {q.waiting}
                    </span>
                  </td>
                  <td className="py-2 pr-4">{q.active}</td>
                  <td className="py-2 pr-4">{q.delayed}</td>
                  <td className="py-2">
                    <span className={q.failed > 0 ? "text-red-600 font-semibold" : ""}>
                      {q.failed}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

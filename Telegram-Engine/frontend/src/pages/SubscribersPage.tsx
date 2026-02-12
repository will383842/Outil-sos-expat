import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search, RefreshCw } from "lucide-react";
import { useSubscribers, useSyncSubscribers, useSubscriberStats } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Badge from "../components/ui/Badge";
import Pagination from "../components/ui/Pagination";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { format, parseISO } from "date-fns";
import { ROLES } from "../types";

const COLORS = ["#0088cc", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#6B7280"];

export default function SubscribersPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useSubscribers({
    page,
    search: search || undefined,
    role: roleFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: stats } = useSubscriberStats();
  const syncMutation = useSyncSubscribers();

  const roleData = stats
    ? Object.entries(stats.byRole).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("subscribers.title")}</h1>
        <button
          onClick={() => syncMutation.mutate()}
          disabled={syncMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-telegram-500 text-white rounded-lg hover:bg-telegram-600 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
          {syncMutation.isPending ? t("subscribers.syncing") : t("subscribers.sync")}
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm text-gray-500">{t("dashboard.totalSubscribers")}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total.toLocaleString()}</p>
          </div>
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-sm font-semibold text-gray-700 mb-3">By Role</p>
            <ResponsiveContainer width="100%" height={150}>
              <PieChart>
                <Pie data={roleData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" nameKey="name">
                  {roleData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={t("subscribers.search")}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">{t("common.all")} roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">{t("common.all")} statuses</option>
          {["active", "blocked", "unsubscribed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.data.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">{t("subscribers.noSubscribers")}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("subscribers.username")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("subscribers.role")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("subscribers.language")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("subscribers.status")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("subscribers.tags")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("subscribers.subscribedAt")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">
                        {sub.firstName ?? sub.telegramUsername ?? sub.telegramChatId}
                      </p>
                      <p className="text-xs text-gray-400">@{sub.telegramUsername ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3"><Badge>{sub.role}</Badge></td>
                    <td className="px-4 py-3 text-sm">{sub.language.toUpperCase()}</td>
                    <td className="px-4 py-3"><Badge variant={sub.status}>{sub.status}</Badge></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {sub.tags.map((st) => (
                          <Badge key={st.tag.id} color={st.tag.color}>{st.tag.name}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {format(parseISO(sub.subscribedAt), "dd/MM/yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={data.pagination.page}
            totalPages={data.pagination.totalPages}
            total={data.pagination.total}
            limit={data.pagination.limit}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}

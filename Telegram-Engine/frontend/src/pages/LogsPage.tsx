import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLogs, useLogEventTypes } from "../hooks/useApi";
import LoadingSpinner from "../components/ui/LoadingSpinner";
import Badge from "../components/ui/Badge";
import Pagination from "../components/ui/Pagination";
import { format, parseISO } from "date-fns";

export default function LogsPage() {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const [eventType, setEventType] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useLogs({
    page,
    eventType: eventType || undefined,
    status: status || undefined,
  });
  const { data: eventTypes } = useLogEventTypes();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t("logs.title")}</h1>

      {/* Filters */}
      <div className="flex gap-3">
        <select value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">{t("logs.allEvents")}</option>
          {eventTypes?.map((ev) => <option key={ev} value={ev}>{ev.replace(/_/g, " ")}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
          <option value="">{t("logs.allStatuses")}</option>
          <option value="sent">{t("logs.sent")}</option>
          <option value="failed">{t("logs.failed")}</option>
        </select>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : !data?.data.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-gray-500">{t("logs.noLogs")}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("logs.date")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("logs.eventType")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("logs.status")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("logs.chatId")}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t("logs.error")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.data.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {format(parseISO(log.createdAt), "dd/MM HH:mm:ss")}
                    </td>
                    <td className="px-4 py-3 text-sm">{log.eventType.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3">
                      <Badge variant={log.status}>{log.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600">{log.subscriberChatId ?? "—"}</td>
                    <td className="px-4 py-3 text-sm text-red-600 truncate max-w-xs">{log.errorMessage ?? "—"}</td>
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

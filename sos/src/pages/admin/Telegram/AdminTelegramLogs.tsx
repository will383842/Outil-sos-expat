import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "../../../hooks/useTranslation";
import AdminLayout from "../../../components/admin/AdminLayout";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../../config/firebase";
import {
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

interface LogEntry {
  id: string;
  eventType: string;
  status: "sent" | "failed";
  recipientChatId: string;
  errorMessage: string | null;
  telegramMessageId: number | null;
  sentAt: string | null;
}

const EVENT_TYPES = [
  "new_registration",
  "call_completed",
  "payment_received",
  "daily_report",
  "new_provider",
  "new_contact_message",
  "negative_review",
  "security_alert",
  "withdrawal_request",
];

const AdminTelegramLogs: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [currentStartAfter, setCurrentStartAfter] = useState<string | null>(null);
  const [prevCursors, setPrevCursors] = useState<string[]>([]);
  const [filterEvent, setFilterEvent] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const PAGE_SIZE = 30;

  const loadLogs = useCallback(
    async (startAfter?: string | null) => {
      setLoading(true);
      try {
        const params: Record<string, unknown> = { limit: PAGE_SIZE };
        if (filterEvent) params.eventType = filterEvent;
        if (filterStatus) params.status = filterStatus;
        if (startAfter) params.startAfter = startAfter;

        const res = await httpsCallable(functions, "telegram_getNotificationLogs")(params);
        const data = res.data as {
          logs: LogEntry[];
          nextCursor: string | null;
          count: number;
        };
        setLogs(data.logs);
        setCursor(data.nextCursor);
      } catch (err) {
        console.error("Failed to load logs:", err);
      } finally {
        setLoading(false);
      }
    },
    [filterEvent, filterStatus]
  );

  useEffect(() => {
    setPrevCursors([]);
    setCursor(null);
    setCurrentStartAfter(null);
    loadLogs();
  }, [filterEvent, filterStatus, loadLogs]);

  const handleNextPage = () => {
    if (!cursor) return;
    if (currentStartAfter !== undefined) {
      setPrevCursors((prev) => [...prev, currentStartAfter ?? ""]);
    }
    setCurrentStartAfter(cursor);
    loadLogs(cursor);
  };

  const handlePrevPage = () => {
    if (prevCursors.length === 0) return;
    const newPrev = [...prevCursors];
    const prevStart = newPrev.pop()!;
    setPrevCursors(newPrev);
    const target = prevStart === "" ? null : prevStart;
    setCurrentStartAfter(target);
    loadLogs(target);
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleString("fr-FR", {
      timeZone: "Europe/Paris",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Clock className="h-7 w-7 text-sky-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t("admin.telegram.logs.title")}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t("admin.telegram.logs.subtitle")}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterEvent}
              onChange={(e) => setFilterEvent(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value="">{t("admin.telegram.logs.allEvents")}</option>
              {EVENT_TYPES.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:ring-2 focus:ring-sky-500 outline-none"
          >
            <option value="">{t("admin.telegram.logs.allStatuses")}</option>
            <option value="sent">{t("admin.telegram.sent")}</option>
            <option value="failed">{t("admin.telegram.failed")}</option>
          </select>
          <button
            onClick={() => loadLogs()}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            {t("admin.telegram.refresh")}
          </button>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-600">
                    {t("admin.telegram.logs.date")}
                  </th>
                  <th className="text-left p-3 font-medium text-gray-600">
                    {t("admin.telegram.logs.event")}
                  </th>
                  <th className="text-left p-3 font-medium text-gray-600">
                    {t("admin.telegram.logs.status")}
                  </th>
                  <th className="text-left p-3 font-medium text-gray-600">
                    {t("admin.telegram.logs.chatId")}
                  </th>
                  <th className="text-left p-3 font-medium text-gray-600">
                    {t("admin.telegram.logs.error")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      <RefreshCw className="h-6 w-6 mx-auto animate-spin mb-2" />
                      {t("admin.telegram.loading")}
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      {t("admin.telegram.logs.noLogs")}
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-b-0 hover:bg-gray-50">
                      <td className="p-3 text-gray-600 whitespace-nowrap">
                        {formatDate(log.sentAt)}
                      </td>
                      <td className="p-3">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">
                          {log.eventType}
                        </span>
                      </td>
                      <td className="p-3">
                        {log.status === "sent" ? (
                          <span className="flex items-center gap-1 text-green-700">
                            <CheckCircle className="h-3.5 w-3.5" />
                            {t("admin.telegram.sent")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-700">
                            <XCircle className="h-3.5 w-3.5" />
                            {t("admin.telegram.failed")}
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-gray-500 font-mono text-xs">
                        {log.recipientChatId || "-"}
                      </td>
                      <td className="p-3 text-red-500 text-xs max-w-xs truncate">
                        {log.errorMessage || "-"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-3 border-t bg-gray-50">
            <span className="text-xs text-gray-500">
              {logs.length} {t("admin.telegram.logs.results")}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPage}
                disabled={prevCursors.length === 0}
                className="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={handleNextPage}
                disabled={!cursor}
                className="p-1.5 rounded border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-30"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramLogs;

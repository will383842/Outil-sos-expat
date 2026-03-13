/**
 * CommissionsHistory — Phase 8.1
 *
 * Paginated, filterable commission history with CSV export.
 * Uses the unified_commissions collection data.
 */

import React, { useState, useMemo, useCallback } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Download, Filter, ChevronLeft, ChevronRight, Clock, CheckCircle, Banknote, XCircle } from "lucide-react";
import type { UnifiedCommission } from "@/hooks/useUnifiedAffiliate";

interface CommissionsHistoryProps {
  commissions: UnifiedCommission[];
  isLoading?: boolean;
  className?: string;
}

const ITEMS_PER_PAGE = 10;

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
};

type StatusFilter = "all" | "pending" | "available" | "paid" | "held" | "cancelled";

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  pending: { icon: <Clock className="w-3.5 h-3.5" />, color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20", label: "Pending" },
  available: { icon: <CheckCircle className="w-3.5 h-3.5" />, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20", label: "Available" },
  paid: { icon: <Banknote className="w-3.5 h-3.5" />, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20", label: "Paid" },
  held: { icon: <Clock className="w-3.5 h-3.5" />, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20", label: "On hold" },
  cancelled: { icon: <XCircle className="w-3.5 h-3.5" />, color: "text-red-600 bg-red-50 dark:bg-red-900/20", label: "Cancelled" },
};

const TYPE_LABELS: Record<string, string> = {
  client_call: "Client call",
  recruitment_call: "Recruit's call",
  captain_call: "Captain bonus",
  signup_bonus: "Signup bonus",
  provider_recruitment: "Provider recruitment",
  subscription_commission: "Subscription",
  subscription_renewal: "Renewal",
  n1_recruit_bonus: "N1 recruit bonus",
};

function formatCents(cents: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD" }).format(cents / 100);
}

const CommissionsHistory: React.FC<CommissionsHistoryProps> = ({ commissions, isLoading, className = "" }) => {
  const intl = useIntl();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (filter === "all") return commissions;
    return commissions.filter((c) => c.status === filter);
  }, [commissions, filter]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleFilterChange = useCallback((newFilter: StatusFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  }, []);

  const exportCSV = useCallback(() => {
    const headers = ["Date", "Type", "Amount (USD)", "Status"];
    const rows = filtered.map((c) => [
      c.createdAt ? new Date(c.createdAt).toISOString().split("T")[0] : "",
      TYPE_LABELS[c.type] || c.type,
      (c.amount / 100).toFixed(2),
      c.status,
    ]);
    const escapeCsv = (v: string) => v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
    const csv = "\uFEFF" + [headers, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `commissions_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [filtered]);

  if (isLoading) {
    return (
      <div className={`${UI.card} p-4 sm:p-5 ${className}`}>
        <div className={`${UI.skeleton} h-5 w-48 mb-4`} />
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${UI.skeleton} h-12 w-full mb-2`} />
        ))}
      </div>
    );
  }

  return (
    <div className={`${UI.card} p-4 sm:p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          <FormattedMessage id="unified.history.title" defaultMessage="Commission history" />
          <span className="ml-2 text-xs text-gray-400">({filtered.length})</span>
        </h3>
        <button
          onClick={exportCSV}
          className="flex items-center gap-1.5 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
          disabled={filtered.length === 0}
        >
          <Download className="w-3.5 h-3.5" />
          CSV
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {(["all", "pending", "available", "paid", "held", "cancelled"] as StatusFilter[]).map((f) => (
          <button
            key={f}
            onClick={() => handleFilterChange(f)}
            className={`text-xs px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              filter === f
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20"
            }`}
          >
            {f === "all"
              ? intl.formatMessage({ id: "unified.history.all", defaultMessage: "All" })
              : STATUS_CONFIG[f]?.label || f}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-8 text-center">
          <Filter className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <FormattedMessage id="unified.history.empty" defaultMessage="No commissions yet" />
          </p>
        </div>
      )}

      {/* Commission list */}
      <div className="space-y-2">
        {paginated.map((c) => {
          const status = STATUS_CONFIG[c.status] || STATUS_CONFIG.pending;
          return (
            <div
              key={c.id}
              className="flex items-center justify-between py-2.5 px-3 bg-gray-50 dark:bg-white/5 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                  {TYPE_LABELS[c.type] || c.type.replace(/_/g, " ")}
                  {c.subType && <span className="text-gray-400 ml-1">/ {c.subType}</span>}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {c.createdAt ? new Date(c.createdAt).toLocaleDateString(intl.locale) : "—"}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${status.color}`}>
                  {status.icon}
                  {status.label}
                </span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                  +{formatCents(c.amount, intl.locale)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-gray-100 dark:border-white/10">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CommissionsHistory;

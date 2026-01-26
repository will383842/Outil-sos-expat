/**
 * AffiliateEarnings - Commission history page
 * Shows all commissions with filtering and pagination
 */

import React, { useState, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Download,
  Calendar,
  Banknote,
  Gift,
} from "lucide-react";
import { useLocaleNavigate } from "@/multilingual-system";
import { getTranslatedRouteSlug, type RouteKey } from "@/multilingual-system/core/routing/localeRoutes";
import { useApp } from "@/contexts/AppContext";
import { useAffiliate } from "@/hooks/useAffiliate";
import {
  formatCents,
  getCommissionStatusLabel,
  getCommissionTypeLabel,
  getStatusColor,
  type CommissionStatus,
} from "@/types/affiliate";
import DashboardLayout from "@/components/layout/DashboardLayout";

// Design tokens
const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  button: {
    primary: "bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-medium rounded-xl transition-all",
    secondary: "bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 text-gray-700 dark:text-gray-200 font-medium rounded-xl transition-all",
    ghost: "hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-300 font-medium rounded-xl transition-all",
  },
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
  input: "w-full px-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 focus:border-transparent transition-all",
} as const;

const ITEMS_PER_PAGE = 10;

const statusOptions: { value: CommissionStatus | "all"; labelId: string }[] = [
  { value: "all", labelId: "affiliate.filter.all" },
  { value: "pending", labelId: "affiliate.filter.pending" },
  { value: "available", labelId: "affiliate.filter.available" },
  { value: "paid", labelId: "affiliate.filter.paid" },
  { value: "cancelled", labelId: "affiliate.filter.cancelled" },
];

const AffiliateEarnings: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || "en") as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

  const { affiliateData, commissions, isLoading } = useAffiliate();

  // State
  const [statusFilter, setStatusFilter] = useState<CommissionStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Translated routes
  const dashboardRoute = useMemo(
    () => `/${getTranslatedRouteSlug("affiliate-dashboard" as RouteKey, langCode)}`,
    [langCode]
  );

  // Filtered commissions
  const filteredCommissions = useMemo(() => {
    if (statusFilter === "all") return commissions;
    return commissions.filter((c) => c.status === statusFilter);
  }, [commissions, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredCommissions.length / ITEMS_PER_PAGE);
  const paginatedCommissions = filteredCommissions.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const stats = useMemo(() => {
    const pending = commissions.filter((c) => c.status === "pending").reduce((sum, c) => sum + c.amount, 0);
    const available = commissions.filter((c) => c.status === "available").reduce((sum, c) => sum + c.amount, 0);
    const paid = commissions.filter((c) => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);
    const total = pending + available + paid;

    return { pending, available, paid, total };
  }, [commissions]);

  // Export to CSV
  const exportCSV = () => {
    const headers = ["Date", "Type", "Action", "Amount", "Status"];
    const rows = filteredCommissions.map((c) => [
      new Date(c.createdAt).toISOString().split("T")[0],
      c.commissionType,
      c.actionType,
      (c.amount / 100).toFixed(2),
      c.status,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `commissions_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (status: CommissionStatus) => {
    switch (status) {
      case "available":
        return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
      case "pending":
        return <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
      case "paid":
        return <Banknote className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case "cancelled":
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <DashboardLayout activeKey="affiliate-earnings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(dashboardRoute)}
              className={`${UI.button.ghost} p-2`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                <FormattedMessage id="affiliate.earnings.title" defaultMessage="Historique des gains" />
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="affiliate.earnings.subtitle"
                  defaultMessage="{count} commissions"
                  values={{ count: filteredCommissions.length }}
                />
              </p>
            </div>
          </div>

          <button onClick={exportCSV} className={`${UI.button.secondary} px-4 py-2 flex items-center gap-2`}>
            <Download className="w-4 h-4" />
            <FormattedMessage id="affiliate.earnings.export" defaultMessage="Exporter CSV" />
          </button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${UI.card} p-4`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              <FormattedMessage id="affiliate.earnings.totalEarned" defaultMessage="Total gagné" />
            </p>
            <p className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              {formatCents(stats.total, intl.locale)}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              <FormattedMessage id="affiliate.earnings.available" defaultMessage="Disponible" />
            </p>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCents(stats.available, intl.locale)}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              <FormattedMessage id="affiliate.earnings.pending" defaultMessage="En attente" />
            </p>
            <p className="text-xl font-bold text-amber-600 dark:text-amber-400">
              {formatCents(stats.pending, intl.locale)}
            </p>
          </div>
          <div className={`${UI.card} p-4`}>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              <FormattedMessage id="affiliate.earnings.paid" defaultMessage="Versé" />
            </p>
            <p className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {formatCents(stats.paid, intl.locale)}
            </p>
          </div>
        </div>

        {/* Filter */}
        <div className={`${UI.card} p-4`}>
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              <FormattedMessage id="affiliate.earnings.filterBy" defaultMessage="Filtrer par statut :" />
            </span>
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    setStatusFilter(option.value);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    statusFilter === option.value
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
                >
                  <FormattedMessage id={option.labelId} defaultMessage={option.value} />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Commissions List */}
        <div className={`${UI.card} overflow-hidden`}>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className={`${UI.skeleton} w-10 h-10 rounded-full`} />
                    <div>
                      <div className={`${UI.skeleton} h-4 w-32 mb-2`} />
                      <div className={`${UI.skeleton} h-3 w-24`} />
                    </div>
                  </div>
                  <div className={`${UI.skeleton} h-5 w-20`} />
                </div>
              ))}
            </div>
          ) : filteredCommissions.length === 0 ? (
            <div className="p-12 text-center">
              <Gift className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                <FormattedMessage id="affiliate.earnings.empty" defaultMessage="Aucune commission trouvée" />
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {statusFilter === "all" ? (
                  <FormattedMessage
                    id="affiliate.earnings.emptyHint"
                    defaultMessage="Partagez votre lien pour commencer à gagner des commissions"
                  />
                ) : (
                  <FormattedMessage
                    id="affiliate.earnings.emptyFiltered"
                    defaultMessage="Aucune commission avec ce statut"
                  />
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Table Header - Desktop */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="col-span-4">
                  <FormattedMessage id="affiliate.table.action" defaultMessage="Action" />
                </div>
                <div className="col-span-2">
                  <FormattedMessage id="affiliate.table.type" defaultMessage="Type" />
                </div>
                <div className="col-span-2">
                  <FormattedMessage id="affiliate.table.date" defaultMessage="Date" />
                </div>
                <div className="col-span-2 text-right">
                  <FormattedMessage id="affiliate.table.amount" defaultMessage="Montant" />
                </div>
                <div className="col-span-2 text-right">
                  <FormattedMessage id="affiliate.table.status" defaultMessage="Statut" />
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedCommissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getStatusIcon(commission.status)}</div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {intl.formatMessage({
                              id: `affiliate.actionType.${commission.actionType}`,
                              defaultMessage: commission.actionType,
                            })}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {getCommissionTypeLabel(commission.commissionType, intl.locale)} •{" "}
                            {new Date(commission.createdAt).toLocaleDateString(intl.locale)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                          +{formatCents(commission.amount, intl.locale)}
                        </p>
                        <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(commission.status)}`}>
                          {getCommissionStatusLabel(commission.status, intl.locale)}
                        </span>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-4 flex items-center gap-3">
                        {getStatusIcon(commission.status)}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {intl.formatMessage({
                            id: `affiliate.actionType.${commission.actionType}`,
                            defaultMessage: commission.actionType,
                          })}
                        </span>
                      </div>
                      <div className="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                        {getCommissionTypeLabel(commission.commissionType, intl.locale)}
                      </div>
                      <div className="col-span-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(commission.createdAt).toLocaleDateString(intl.locale)}
                      </div>
                      <div className="col-span-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                        +{formatCents(commission.amount, intl.locale)}
                      </div>
                      <div className="col-span-2 text-right">
                        <span className={`inline-block text-xs px-2.5 py-1 rounded-full ${getStatusColor(commission.status)}`}>
                          {getCommissionStatusLabel(commission.status, intl.locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-between">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    <FormattedMessage
                      id="affiliate.pagination.showing"
                      defaultMessage="Affichage {from}-{to} sur {total}"
                      values={{
                        from: (currentPage - 1) * ITEMS_PER_PAGE + 1,
                        to: Math.min(currentPage * ITEMS_PER_PAGE, filteredCommissions.length),
                        total: filteredCommissions.length,
                      }}
                    />
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className={`p-2 rounded-lg ${
                        currentPage === 1
                          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className={`p-2 rounded-lg ${
                        currentPage === totalPages
                          ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
                          : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AffiliateEarnings;

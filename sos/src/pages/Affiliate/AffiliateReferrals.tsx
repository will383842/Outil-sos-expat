/**
 * AffiliateReferrals - Referrals list page
 * Shows all referred users with their status and generated commissions
 */

import React, { useState, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import {
  Users,
  UserPlus,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  Search,
  Calendar,
  Gift,
  TrendingUp,
  Phone,
} from "lucide-react";
import { useLocaleNavigate } from "@/multilingual-system";
import { getTranslatedRouteSlug, type RouteKey } from "@/multilingual-system/core/routing/localeRoutes";
import { useApp } from "@/contexts/AppContext";
import { useAffiliate } from "@/hooks/useAffiliate";
import { formatCents } from "@/types/affiliate";
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

const AffiliateReferrals: React.FC = () => {
  const intl = useIntl();
  const navigate = useLocaleNavigate();
  const { language } = useApp();
  const langCode = (language || "en") as "fr" | "en" | "es" | "de" | "ru" | "pt" | "ch" | "hi" | "ar";

  const { affiliateData, referrals, commissions, isLoading } = useAffiliate();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "pending">("all");

  // Translated routes
  const dashboardRoute = useMemo(
    () => `/${getTranslatedRouteSlug("affiliate-dashboard" as RouteKey, langCode)}`,
    [langCode]
  );

  // Calculate commissions per referral
  const referralsWithStats = useMemo(() => {
    return referrals.map((referral) => {
      const referralCommissions = commissions.filter(
        (c) => c.referredUserId === referral.referredUserId
      );
      const totalEarned = referralCommissions.reduce((sum, c) => sum + c.amount, 0);
      const callCount = referralCommissions.filter(
        (c) => c.actionType === "referral_first_call" || c.actionType === "referral_recurring_call"
      ).length;

      return {
        ...referral,
        totalEarned,
        callCount,
        isActive: referral.firstActionAt !== null,
      };
    });
  }, [referrals, commissions]);

  // Filter referrals
  const filteredReferrals = useMemo(() => {
    let filtered = referralsWithStats;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.referredUserEmail?.toLowerCase().includes(query) ||
          r.referredUserId.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus === "active") {
      filtered = filtered.filter((r) => r.isActive);
    } else if (filterStatus === "pending") {
      filtered = filtered.filter((r) => !r.isActive);
    }

    return filtered;
  }, [referralsWithStats, searchQuery, filterStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredReferrals.length / ITEMS_PER_PAGE);
  const paginatedReferrals = filteredReferrals.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Stats
  const stats = useMemo(() => {
    const total = referrals.length;
    const active = referralsWithStats.filter((r) => r.isActive).length;
    const pending = total - active;
    const totalEarned = referralsWithStats.reduce((sum, r) => sum + r.totalEarned, 0);

    return { total, active, pending, totalEarned };
  }, [referrals, referralsWithStats]);

  return (
    <DashboardLayout activeKey="affiliate-referrals">
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
                <FormattedMessage id="affiliate.referrals.title" defaultMessage="Mes filleuls" />
              </h1>
              <p className="mt-1 text-gray-500 dark:text-gray-400">
                <FormattedMessage
                  id="affiliate.referrals.subtitle"
                  defaultMessage="{count} personnes parrainées"
                  values={{ count: stats.total }}
                />
              </p>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="affiliate.referrals.total" defaultMessage="Total filleuls" />
                </p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="affiliate.referrals.active" defaultMessage="Actifs" />
                </p>
                <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/30">
                <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="affiliate.referrals.pending" defaultMessage="En attente" />
                </p>
                <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className={`${UI.card} p-4`}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-purple-100 dark:bg-purple-900/30">
                <TrendingUp className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  <FormattedMessage id="affiliate.referrals.earned" defaultMessage="Gains générés" />
                </p>
                <p className="text-xl font-bold text-purple-600 dark:text-purple-400">
                  {formatCents(stats.totalEarned, intl.locale)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={`${UI.card} p-4`}>
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder={intl.formatMessage({
                  id: "affiliate.referrals.search",
                  defaultMessage: "Rechercher par email...",
                })}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className={`${UI.input} pl-10`}
              />
            </div>

            {/* Status Filter */}
            <div className="flex gap-2">
              {(["all", "active", "pending"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => {
                    setFilterStatus(status);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 text-sm rounded-xl transition-all ${
                    filterStatus === status
                      ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium"
                      : "bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10"
                  }`}
                >
                  <FormattedMessage
                    id={`affiliate.referrals.filter.${status}`}
                    defaultMessage={status}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Referrals List */}
        <div className={`${UI.card} overflow-hidden`}>
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center justify-between py-4">
                  <div className="flex items-center gap-4">
                    <div className={`${UI.skeleton} w-12 h-12 rounded-full`} />
                    <div>
                      <div className={`${UI.skeleton} h-4 w-40 mb-2`} />
                      <div className={`${UI.skeleton} h-3 w-28`} />
                    </div>
                  </div>
                  <div className={`${UI.skeleton} h-5 w-20`} />
                </div>
              ))}
            </div>
          ) : filteredReferrals.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <p className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                <FormattedMessage id="affiliate.referrals.empty" defaultMessage="Aucun filleul trouvé" />
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                {searchQuery || filterStatus !== "all" ? (
                  <FormattedMessage
                    id="affiliate.referrals.emptyFiltered"
                    defaultMessage="Essayez de modifier vos filtres"
                  />
                ) : (
                  <FormattedMessage
                    id="affiliate.referrals.emptyHint"
                    defaultMessage="Partagez votre lien pour parrainer des utilisateurs"
                  />
                )}
              </p>
            </div>
          ) : (
            <>
              {/* Table Header - Desktop */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 dark:bg-white/5 border-b border-gray-200 dark:border-white/10 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                <div className="col-span-5">
                  <FormattedMessage id="affiliate.table.referral" defaultMessage="Filleul" />
                </div>
                <div className="col-span-2">
                  <FormattedMessage id="affiliate.table.joinDate" defaultMessage="Date inscription" />
                </div>
                <div className="col-span-2">
                  <FormattedMessage id="affiliate.table.activity" defaultMessage="Activité" />
                </div>
                <div className="col-span-2 text-right">
                  <FormattedMessage id="affiliate.table.earned" defaultMessage="Gains générés" />
                </div>
                <div className="col-span-1 text-right">
                  <FormattedMessage id="affiliate.table.status" defaultMessage="Statut" />
                </div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-gray-100 dark:divide-white/5">
                {paginatedReferrals.map((referral) => (
                  <div
                    key={referral.id}
                    className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  >
                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              referral.isActive
                                ? "bg-emerald-100 dark:bg-emerald-900/30"
                                : "bg-amber-100 dark:bg-amber-900/30"
                            }`}
                          >
                            {referral.isActive ? (
                              <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                              {referral.referredUserEmail || referral.referredUserId.slice(0, 8) + "..."}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(referral.createdAt).toLocaleDateString(intl.locale)}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            referral.isActive
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {referral.isActive ? (
                            <FormattedMessage id="affiliate.status.active" defaultMessage="Actif" />
                          ) : (
                            <FormattedMessage id="affiliate.status.pending" defaultMessage="En attente" />
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {referral.callCount} {intl.formatMessage({ id: "affiliate.calls", defaultMessage: "appels" })}
                          </span>
                        </div>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {formatCents(referral.totalEarned, intl.locale)}
                        </span>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:grid grid-cols-12 gap-4 items-center">
                      <div className="col-span-5 flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            referral.isActive
                              ? "bg-emerald-100 dark:bg-emerald-900/30"
                              : "bg-amber-100 dark:bg-amber-900/30"
                          }`}
                        >
                          {referral.isActive ? (
                            <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <UserPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {referral.referredUserEmail || referral.referredUserId.slice(0, 8) + "..."}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            ID: {referral.referredUserId.slice(0, 12)}...
                          </p>
                        </div>
                      </div>

                      <div className="col-span-2 text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(referral.createdAt).toLocaleDateString(intl.locale)}
                      </div>

                      <div className="col-span-2 text-sm text-gray-600 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {referral.callCount} {intl.formatMessage({ id: "affiliate.calls", defaultMessage: "appels" })}
                        </span>
                      </div>

                      <div className="col-span-2 text-right font-semibold text-purple-600 dark:text-purple-400">
                        {formatCents(referral.totalEarned, intl.locale)}
                      </div>

                      <div className="col-span-1 text-right">
                        <span
                          className={`inline-block text-xs px-2.5 py-1 rounded-full ${
                            referral.isActive
                              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {referral.isActive ? (
                            <FormattedMessage id="affiliate.status.active" defaultMessage="Actif" />
                          ) : (
                            <FormattedMessage id="affiliate.status.pending" defaultMessage="En attente" />
                          )}
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
                        to: Math.min(currentPage * ITEMS_PER_PAGE, filteredReferrals.length),
                        total: filteredReferrals.length,
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

export default AffiliateReferrals;

/**
 * ReferralsList — Phase 8.1
 *
 * Paginated list of referred users (filleuls).
 */

import React, { useState, useMemo } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { Users, Search, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import type { UnifiedReferral } from "@/hooks/useUnifiedAffiliate";

interface ReferralsListProps {
  referrals: UnifiedReferral[];
  isLoading?: boolean;
  className?: string;
}

const ITEMS_PER_PAGE = 10;

const UI = {
  card: "bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg",
  skeleton: "animate-pulse bg-gray-200 dark:bg-white/10 rounded",
};

const ReferralsList: React.FC<ReferralsListProps> = ({ referrals, isLoading, className = "" }) => {
  const intl = useIntl();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return referrals;
    const q = searchQuery.toLowerCase();
    return referrals.filter(
      (r) =>
        r.email?.toLowerCase().includes(q) ||
        r.firstName?.toLowerCase().includes(q) ||
        r.userId.toLowerCase().includes(q)
    );
  }, [referrals, searchQuery]);

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (isLoading) {
    return (
      <div className={`${UI.card} p-4 sm:p-5 ${className}`}>
        <div className={`${UI.skeleton} h-5 w-32 mb-4`} />
        {[1, 2, 3].map((i) => (
          <div key={i} className={`${UI.skeleton} h-10 w-full mb-2`} />
        ))}
      </div>
    );
  }

  return (
    <div className={`${UI.card} p-4 sm:p-5 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2">
          <Users className="w-5 h-5 text-indigo-500" />
          <FormattedMessage id="unified.referrals.title" defaultMessage="Your referrals" />
          <span className="text-xs text-gray-400">({referrals.length})</span>
        </h3>
      </div>

      {/* Search */}
      {referrals.length > 5 && (
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            placeholder={intl.formatMessage({ id: "unified.referrals.search", defaultMessage: "Search..." })}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-white/5 border border-transparent focus:border-indigo-300 dark:focus:border-indigo-600 rounded-lg outline-none transition-colors text-gray-700 dark:text-gray-200 placeholder-gray-400"
          />
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && (
        <div className="py-8 text-center">
          <UserPlus className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchQuery ? (
              <FormattedMessage id="unified.referrals.noResults" defaultMessage="No referrals match your search" />
            ) : (
              <FormattedMessage id="unified.referrals.empty" defaultMessage="No referrals yet — share your link!" />
            )}
          </p>
        </div>
      )}

      {/* Referrals list */}
      <div className="space-y-2">
        {paginated.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between py-2.5 px-3 bg-gray-50 dark:bg-white/5 rounded-lg"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                  {(r.firstName || r.email || "?").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate">
                  {r.firstName || r.email?.split("@")[0] || r.userId.slice(0, 8)}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {r.role && <span className="capitalize">{r.role} · </span>}
                  {r.registeredAt ? new Date(r.registeredAt).toLocaleDateString(intl.locale) : "—"}
                </p>
              </div>
            </div>
          </div>
        ))}
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

export default ReferralsList;

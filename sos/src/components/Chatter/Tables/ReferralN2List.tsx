/**
 * ReferralN2List
 *
 * Simplified list of N2 filleuls (filleuls of filleuls).
 * Glassmorphism design, mobile-first.
 */

import React from "react";
import { Users, Check, Clock } from "lucide-react";
import { ChatterFilleulN2 } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";
import { Pagination, usePagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

interface ReferralN2ListProps {
  filleuls: ChatterFilleulN2[];
  isLoading?: boolean;
}

export const ReferralN2List = React.memo(function ReferralN2List({ filleuls, isLoading }: ReferralN2ListProps) {
  const { t } = useTranslation();
  const {
    paginatedItems,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    goToPage,
  } = usePagination(filleuls, PAGE_SIZE);

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="font-semibold dark:text-white">{t("chatter.referrals.filleulsN2")}</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (filleuls.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
          <span className="font-semibold dark:text-white">{t("chatter.referrals.filleulsN2")}</span>
        </div>
        <div className="text-center py-4 sm:py-6">
          <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center">
            <Users className="h-6 w-6 text-red-400" />
          </div>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">{t("chatter.referrals.noFilleulsN2Yet")}</p>
          <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-1">
            {t("chatter.referrals.n2Explanation")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Users className="h-5 w-5 text-red-600 dark:text-red-400" />
        <span className="font-semibold dark:text-white">{t("chatter.referrals.filleulsN2")}</span>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
          {filleuls.length}
        </span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {paginatedItems.map((filleul, index) => {
          const initial = filleul.name?.charAt(0)?.toUpperCase() || "?";

          return (
            <div
              key={filleul.id}
              className="flex items-center gap-3 p-2.5 sm:p-3 bg-gray-50 dark:bg-white/5 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-white/10 opacity-0 animate-fade-in-up"
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'forwards',
              }}
            >
              {/* Avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-300 to-orange-300 dark:from-red-600 dark:to-orange-600 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">{initial}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm dark:text-white truncate">{filleul.name}</p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate">
                  {t("chatter.referrals.viaParrain")} {filleul.parrainN1Name}
                </p>
              </div>

              {/* Status */}
              {filleul.threshold50Reached ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 flex-shrink-0">
                  <Check className="h-3 w-3" />
                  $50+
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 flex-shrink-0">
                  <Clock className="h-3 w-3" />
                  {"<$50"}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-gray-200 dark:border-white/10">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={goToPage}
            pageSize={pageSize}
            totalItems={totalItems}
          />
        </div>
      )}

      {/* Info */}
      <p className="text-[10px] sm:text-xs text-gray-400 dark:text-gray-500 mt-3">
        {t("chatter.referrals.n2BonusInfo")}
      </p>
    </div>
  );
});

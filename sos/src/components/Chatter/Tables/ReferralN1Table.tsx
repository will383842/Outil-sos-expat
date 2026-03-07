/**
 * ReferralN1Table
 *
 * Mobile-first: cards on small screens, table on lg+.
 * Glassmorphism design with staggered animations.
 */

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, Check, Clock, TrendingUp, Share2 } from "lucide-react";
import { ChatterFilleulN1 } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";
import { getFilleulProgressPercent } from "@/hooks/useChatterReferrals";
import { Pagination, usePagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

interface ReferralN1TableProps {
  filleuls: ChatterFilleulN1[];
  isLoading?: boolean;
}

/* Status badge component */
function FilleulStatusBadge({ filleul, t }: { filleul: ChatterFilleulN1; t: (key: string) => string }) {
  if (filleul.threshold50Reached) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
        <Check className="h-3 w-3" />
        {t("chatter.referrals.qualified")}
      </span>
    );
  }
  if (filleul.isActive) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
        <TrendingUp className="h-3 w-3" />
        {t("chatter.referrals.active")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400">
      <Clock className="h-3 w-3" />
      {t("chatter.referrals.pending")}
    </span>
  );
}

export function ReferralN1Table({ filleuls, isLoading }: ReferralN1TableProps) {
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
          <Users className="h-5 w-5 dark:text-white" />
          <span className="font-semibold dark:text-white">{t("chatter.referrals.myFilleulsN1")}</span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 sm:h-12 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state — motivant
  if (filleuls.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 dark:text-white" />
          <span className="font-semibold dark:text-white">{t("chatter.referrals.myFilleulsN1")}</span>
        </div>
        <div className="text-center py-6 sm:py-8">
          <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center">
            <Users className="h-7 w-7 sm:h-8 sm:w-8 text-red-500 dark:text-red-400" />
          </div>
          <p className="font-medium dark:text-white text-sm sm:text-base">{t("chatter.referrals.noFilleulsYet")}</p>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("chatter.referrals.shareYourLink")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <Users className="h-5 w-5 dark:text-white" />
        <span className="font-semibold dark:text-white">{t("chatter.referrals.myFilleulsN1")}</span>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300">
          {filleuls.length}
        </span>
      </div>

      {/* Mobile: Cards view */}
      <div className="lg:hidden space-y-2.5">
        {paginatedItems.map((filleul, index) => {
          const progress = getFilleulProgressPercent(filleul.clientEarnings);
          const initial = filleul.name?.charAt(0)?.toUpperCase() || "?";

          return (
            <div
              key={filleul.id}
              className="p-3 bg-gray-50 dark:bg-white/5 rounded-xl transition-all hover:bg-gray-100 dark:hover:bg-white/10 opacity-0 animate-fade-in-up"
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: 'forwards',
              }}
            >
              <div className="flex items-center gap-3">
                {/* Avatar/Initial */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-bold">{initial}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm dark:text-white truncate">{filleul.name}</p>
                    <span className="text-sm font-bold text-green-600 dark:text-green-400 flex-shrink-0">
                      ${(filleul.clientEarnings / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-1">
                    <FilleulStatusBadge filleul={filleul} t={t} />
                    <span className="text-[10px] text-gray-400 dark:text-gray-500">
                      {new Date(filleul.joinedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar compact */}
              <div className="mt-2 flex items-center gap-2">
                <div className="flex-1">
                  <Progress
                    value={
                      progress.currentPhase === "to10"
                        ? progress.progressTo10
                        : progress.progressTo50
                    }
                    className="h-1.5"
                  />
                </div>
                <div className="flex gap-1.5 text-[10px] text-gray-400">
                  <span>{filleul.threshold10Reached ? <Check className="h-3 w-3 text-green-500 inline" /> : "$10"}</span>
                  <span>{filleul.threshold50Reached ? <Check className="h-3 w-3 text-green-500 inline" /> : "$50"}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.name")}</TableHead>
              <TableHead>{t("chatter.referrals.earnings")}</TableHead>
              <TableHead>{t("chatter.referrals.progression")}</TableHead>
              <TableHead>{t("chatter.referrals.status")}</TableHead>
              <TableHead>{t("chatter.referrals.joinedAt")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((filleul) => {
              const progress = getFilleulProgressPercent(filleul.clientEarnings);

              return (
                <TableRow key={filleul.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-orange-400 flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-xs font-bold">
                          {filleul.name?.charAt(0)?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{filleul.name}</p>
                        <p className="text-xs text-gray-500">{filleul.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-green-600">
                      ${(filleul.clientEarnings / 100).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="w-32 space-y-1">
                      <Progress
                        value={
                          progress.currentPhase === "to10"
                            ? progress.progressTo10
                            : progress.progressTo50
                        }
                        className="h-2"
                      />
                      <div className="flex justify-between text-xs">
                        <span>
                          {filleul.threshold10Reached ? (
                            <Check className="h-3 w-3 text-green-500 inline" />
                          ) : (
                            "$10"
                          )}
                        </span>
                        <span>
                          {filleul.threshold50Reached ? (
                            <Check className="h-3 w-3 text-green-500 inline" />
                          ) : (
                            "$50"
                          )}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <FilleulStatusBadge filleul={filleul} t={t} />
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(filleul.joinedAt).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
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
    </div>
  );
}

/**
 * ReferralCommissionsTable
 *
 * Commission history: cards on mobile, table on desktop.
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
import { DollarSign, TrendingUp, Users, Trophy, Calendar } from "lucide-react";
import { ChatterCommissionType } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";
import { Pagination, usePagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

interface ReferralCommission {
  id: string;
  type: ChatterCommissionType;
  filleulName: string;
  amount: number;
  createdAt: string;
}

interface ReferralCommissionsTableProps {
  commissions: ReferralCommission[];
  isLoading?: boolean;
}

// Commission type styling
function getCommissionStyle(type: ChatterCommissionType) {
  switch (type) {
    case "threshold_10":
      return { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", icon: TrendingUp };
    case "threshold_50":
      return { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", icon: TrendingUp };
    case "threshold_50_n2":
      return { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-300", icon: Users };
    case "recurring_5pct":
      return { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-300", icon: Calendar };
    case "tier_bonus":
      return { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-300", icon: Trophy };
    default:
      return { bg: "bg-gray-100 dark:bg-white/10", text: "text-gray-700 dark:text-gray-300", icon: DollarSign };
  }
}

export function ReferralCommissionsTable({
  commissions,
  isLoading,
}: ReferralCommissionsTableProps) {
  const { t } = useTranslation();
  const {
    paginatedItems,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    goToPage,
  } = usePagination(commissions, PAGE_SIZE);

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <DollarSign className="h-5 w-5 dark:text-white" />
          <span className="font-semibold dark:text-white">{t("chatter.referrals.recentCommissions")}</span>
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 sm:h-12 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (commissions.length === 0) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="h-5 w-5 dark:text-white" />
          <span className="font-semibold dark:text-white">{t("chatter.referrals.recentCommissions")}</span>
        </div>
        <div className="text-center py-6 sm:py-8">
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 flex items-center justify-center">
            <DollarSign className="h-7 w-7 text-green-500 dark:text-green-400" />
          </div>
          <p className="font-medium dark:text-white text-sm">{t("chatter.referrals.noCommissionsYet")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <DollarSign className="h-5 w-5 dark:text-white" />
        <span className="font-semibold dark:text-white">{t("chatter.referrals.recentCommissions")}</span>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          {commissions.length}
        </span>
      </div>

      {/* Mobile: Cards view */}
      <div className="lg:hidden space-y-2">
        {paginatedItems.map((commission, index) => {
          const style = getCommissionStyle(commission.type);
          const TypeIcon = style.icon;
          const typeLabel = t(`chatter.referrals.type_${commission.type}`) || commission.type;

          return (
            <div
              key={commission.id}
              className="flex items-center gap-3 p-2.5 bg-gray-50 dark:bg-white/5 rounded-xl opacity-0 animate-fade-in-up"
              style={{
                animationDelay: `${index * 40}ms`,
                animationFillMode: 'forwards',
              }}
            >
              <div className={`w-8 h-8 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}>
                <TypeIcon className={`h-4 w-4 ${style.text}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}>
                    {typeLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs text-gray-500 dark:text-gray-400 truncate">{commission.filleulName}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                    {new Date(commission.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <span className="font-bold text-sm text-green-600 dark:text-green-400 flex-shrink-0">
                +${(commission.amount / 100).toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Desktop: Table view */}
      <div className="hidden lg:block overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("common.type")}</TableHead>
              <TableHead>{t("chatter.referrals.filleul")}</TableHead>
              <TableHead className="text-right">{t("common.amount")}</TableHead>
              <TableHead>{t("common.date")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((commission) => {
              const style = getCommissionStyle(commission.type);
              const TypeIcon = style.icon;
              const typeLabel = t(`chatter.referrals.type_${commission.type}`) || commission.type;

              return (
                <TableRow key={commission.id}>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
                      <TypeIcon className="h-3 w-3" />
                      {typeLabel}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{commission.filleulName}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-green-600 dark:text-green-400">
                      +${(commission.amount / 100).toFixed(2)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {new Date(commission.createdAt).toLocaleDateString()}
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

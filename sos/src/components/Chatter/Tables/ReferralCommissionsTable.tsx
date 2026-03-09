/**
 * ReferralCommissionsTable
 *
 * Commission history grouped by referral (filleul).
 * Each group shows: referral name, total earned, commission count.
 * Groups are expandable/collapsible to reveal individual commissions.
 * Sorted by total earnings (descending).
 * Glassmorphism design with staggered animations.
 */

import React, { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Users, Trophy, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { ChatterCommissionType } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";

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

interface ReferralGroup {
  filleulName: string;
  totalAmount: number;
  commissionCount: number;
  commissions: ReferralCommission[];
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
    case "n1_call":
      return { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-300", icon: TrendingUp };
    case "n2_call":
      return { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-300", icon: Users };
    case "activation_bonus":
      return { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-300", icon: Trophy };
    case "n1_recruit_bonus":
      return { bg: "bg-teal-100 dark:bg-teal-900/30", text: "text-teal-700 dark:text-teal-300", icon: Users };
    default:
      return { bg: "bg-gray-100 dark:bg-white/10", text: "text-gray-700 dark:text-gray-300", icon: DollarSign };
  }
}

/** Get the initial letter(s) for the avatar */
function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return (name[0] || "?").toUpperCase();
}

/** Deterministic color from name for avatar background */
function getAvatarColor(name: string): string {
  const colors = [
    "from-blue-400 to-blue-600",
    "from-green-400 to-green-600",
    "from-purple-400 to-purple-600",
    "from-orange-400 to-orange-600",
    "from-pink-400 to-pink-600",
    "from-teal-400 to-teal-600",
    "from-indigo-400 to-indigo-600",
    "from-rose-400 to-rose-600",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export function ReferralCommissionsTable({
  commissions,
  isLoading,
}: ReferralCommissionsTableProps) {
  const { t } = useTranslation();
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Group commissions by filleulName, sorted by total earnings desc
  const groups: ReferralGroup[] = useMemo(() => {
    const map = new Map<string, ReferralGroup>();

    for (const commission of commissions) {
      const key = commission.filleulName;
      const existing = map.get(key);
      if (existing) {
        existing.totalAmount += commission.amount;
        existing.commissionCount += 1;
        existing.commissions.push(commission);
      } else {
        map.set(key, {
          filleulName: key,
          totalAmount: commission.amount,
          commissionCount: 1,
          commissions: [commission],
        });
      }
    }

    // Sort groups by totalAmount descending
    const sorted = Array.from(map.values()).sort((a, b) => b.totalAmount - a.totalAmount);

    // Sort commissions within each group by date descending
    for (const group of sorted) {
      group.commissions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return sorted;
  }, [commissions]);

  const toggleGroup = (filleulName: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(filleulName)) {
        next.delete(filleulName);
      } else {
        next.add(filleulName);
      }
      return next;
    });
  };

  // Skeleton loading
  if (isLoading) {
    return (
      <div className="bg-white/80 dark:bg-white/5 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-lg p-3 sm:p-5">
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <DollarSign className="h-5 w-5 dark:text-white" />
          <span className="font-semibold dark:text-white">{t("chatter.referrals.groupedByReferral")}</span>
        </div>
        <div className="space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
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
          <span className="font-semibold dark:text-white">{t("chatter.referrals.groupedByReferral")}</span>
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
        <span className="font-semibold dark:text-white">{t("chatter.referrals.groupedByReferral")}</span>
        <span className="ml-auto px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
          {groups.length} {t("chatter.referrals.filleuls")}
        </span>
      </div>

      {/* Grouped referrals */}
      <div className="space-y-2">
        {groups.map((group, index) => {
          const isExpanded = expandedGroups.has(group.filleulName);
          const initials = getInitials(group.filleulName);
          const avatarColor = getAvatarColor(group.filleulName);

          return (
            <div
              key={group.filleulName}
              className="rounded-xl border border-gray-200/50 dark:border-white/10 overflow-hidden opacity-0 animate-fade-in-up"
              style={{
                animationDelay: `${index * 50}ms`,
                animationFillMode: "forwards",
              }}
            >
              {/* Group header — clickable */}
              <button
                type="button"
                onClick={() => toggleGroup(group.filleulName)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50/80 dark:bg-white/5 hover:bg-gray-100/80 dark:hover:bg-white/10 transition-colors cursor-pointer"
                aria-expanded={isExpanded}
                aria-label={
                  isExpanded
                    ? t("chatter.referrals.collapseDetails")
                    : t("chatter.referrals.expandDetails")
                }
              >
                {/* Avatar */}
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center flex-shrink-0 shadow-sm`}
                >
                  <span className="text-white text-xs font-bold">{initials}</span>
                </div>

                {/* Name + count */}
                <div className="flex-1 min-w-0 text-left">
                  <div className="font-medium text-sm dark:text-white truncate">
                    {group.filleulName}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {t("chatter.referrals.commissionsCount", { count: group.commissionCount })}
                  </div>
                </div>

                {/* Total amount */}
                <span className="font-bold text-sm text-green-600 dark:text-green-400 flex-shrink-0">
                  +${(group.totalAmount / 100).toFixed(2)}
                </span>

                {/* Chevron */}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                )}
              </button>

              {/* Expanded: individual commissions */}
              {isExpanded && (
                <div className="border-t border-gray-200/50 dark:border-white/10">
                  {/* Mobile: Cards */}
                  <div className="lg:hidden divide-y divide-gray-100 dark:divide-white/5">
                    {group.commissions.map((commission) => {
                      const style = getCommissionStyle(commission.type);
                      const TypeIcon = style.icon;
                      const typeLabel =
                        t(`chatter.referrals.type_${commission.type}`) || commission.type;

                      return (
                        <div
                          key={commission.id}
                          className="flex items-center gap-3 px-3 py-2.5 bg-white/50 dark:bg-white/[0.02]"
                        >
                          <div
                            className={`w-7 h-7 rounded-lg ${style.bg} flex items-center justify-center flex-shrink-0`}
                          >
                            <TypeIcon className={`h-3.5 w-3.5 ${style.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${style.bg} ${style.text}`}
                            >
                              {typeLabel}
                            </span>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {new Date(commission.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          <span className="font-bold text-xs text-green-600 dark:text-green-400 flex-shrink-0">
                            +${(commission.amount / 100).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop: Table */}
                  <div className="hidden lg:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{t("common.type")}</TableHead>
                          <TableHead className="text-right">{t("common.amount")}</TableHead>
                          <TableHead>{t("common.date")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {group.commissions.map((commission) => {
                          const style = getCommissionStyle(commission.type);
                          const TypeIcon = style.icon;
                          const typeLabel =
                            t(`chatter.referrals.type_${commission.type}`) || commission.type;

                          return (
                            <TableRow key={commission.id}>
                              <TableCell>
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}
                                >
                                  <TypeIcon className="h-3 w-3" />
                                  {typeLabel}
                                </span>
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
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

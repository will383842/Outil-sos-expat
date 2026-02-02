/**
 * ReferralCommissionsTable
 *
 * Table displaying referral commission history.
 * Includes pagination for large datasets.
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

// Get commission type display info
function getCommissionTypeInfo(type: ChatterCommissionType) {
  switch (type) {
    case "threshold_10":
      return {
        label: "Seuil $10",
        color: "bg-blue-100 text-blue-800",
        icon: TrendingUp,
      };
    case "threshold_50":
      return {
        label: "Seuil $50 (N1)",
        color: "bg-green-100 text-green-800",
        icon: TrendingUp,
      };
    case "threshold_50_n2":
      return {
        label: "Seuil $50 (N2)",
        color: "bg-purple-100 text-purple-800",
        icon: Users,
      };
    case "recurring_5pct":
      return {
        label: "Recurrent 5%",
        color: "bg-orange-100 text-orange-800",
        icon: Calendar,
      };
    case "tier_bonus":
      return {
        label: "Bonus Palier",
        color: "bg-yellow-100 text-yellow-800",
        icon: Trophy,
      };
    default:
      return {
        label: type,
        color: "bg-gray-100 text-gray-800",
        icon: DollarSign,
      };
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("chatter.referrals.recentCommissions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (commissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            {t("chatter.referrals.recentCommissions")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("chatter.referrals.noCommissionsYet")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          {t("chatter.referrals.recentCommissions")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("common.type")}</TableHead>
                <TableHead>{t("chatter.referrals.filleul")}</TableHead>
                <TableHead className="text-right">
                  {t("common.amount")}
                </TableHead>
                <TableHead>{t("common.date")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedItems.map((commission) => {
                const typeInfo = getCommissionTypeInfo(commission.type);
                const TypeIcon = typeInfo.icon;

                return (
                  <TableRow key={commission.id}>
                    <TableCell>
                      <Badge className={`${typeInfo.color} gap-1`}>
                        <TypeIcon className="h-3 w-3" />
                        {typeInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{commission.filleulName}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-bold text-green-600">
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
          <div className="mt-4 pt-4 border-t">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={goToPage}
              pageSize={pageSize}
              totalItems={totalItems}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

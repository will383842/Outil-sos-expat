/**
 * ReferralN2List
 *
 * Simplified list of N2 filleuls (filleuls of filleuls).
 * Includes pagination for large datasets.
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Check, Clock } from "lucide-react";
import { ChatterFilleulN2 } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";
import { Pagination, usePagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

interface ReferralN2ListProps {
  filleuls: ChatterFilleulN2[];
  isLoading?: boolean;
}

export function ReferralN2List({ filleuls, isLoading }: ReferralN2ListProps) {
  const { t } = useTranslation();
  const {
    paginatedItems,
    currentPage,
    totalPages,
    pageSize,
    totalItems,
    goToPage,
  } = usePagination(filleuls, PAGE_SIZE);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-red-600" />
            {t("chatter.referrals.filleulsN2")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (filleuls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-red-600" />
            {t("chatter.referrals.filleulsN2")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <p className="text-sm">{t("chatter.referrals.noFilleulsN2Yet")}</p>
            <p className="text-xs mt-1">
              {t("chatter.referrals.n2Explanation")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-red-600" />
          {t("chatter.referrals.filleulsN2")}
          <Badge variant="secondary" className="bg-red-100 text-red-800">
            {filleuls.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {paginatedItems.map((filleul) => (
            <div
              key={filleul.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{filleul.name}</p>
                <p className="text-xs">
                  {t("chatter.referrals.viaParrain")} {filleul.parrainN1Name}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {filleul.threshold50Reached ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    $50+
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {"<$50"}
                  </Badge>
                )}
              </div>
            </div>
          ))}
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

        {/* Info */}
        <p className="text-xs mt-3">
          {t("chatter.referrals.n2BonusInfo")}
        </p>
      </CardContent>
    </Card>
  );
}

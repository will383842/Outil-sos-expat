/**
 * ReferralN1Table
 *
 * Table displaying N1 filleuls (direct referrals) with their progression.
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
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Check, Clock, TrendingUp } from "lucide-react";
import { ChatterFilleulN1 } from "@/types/chatter";
import { useTranslation } from "@/hooks/useTranslation";
import { getFilleulProgressPercent } from "@/hooks/useChatterReferrals";
import { Pagination, usePagination } from "@/components/ui/pagination";

const PAGE_SIZE = 10;

interface ReferralN1TableProps {
  filleuls: ChatterFilleulN1[];
  isLoading?: boolean;
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("chatter.referrals.myFilleulsN1")}
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

  if (filleuls.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t("chatter.referrals.myFilleulsN1")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t("chatter.referrals.noFilleulsYet")}</p>
            <p className="text-sm mt-2">
              {t("chatter.referrals.shareYourLink")}
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
          <Users className="h-5 w-5" />
          {t("chatter.referrals.myFilleulsN1")}
          <Badge variant="secondary">{filleuls.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
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
                const progress = getFilleulProgressPercent(
                  filleul.clientEarnings
                );

                return (
                  <TableRow key={filleul.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{filleul.name}</p>
                        <p className="text-xs text-gray-500">{filleul.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
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
                        <div className="flex justify-between text-xs text-gray-500">
                          <span>
                            {filleul.threshold10Reached ? (
                              <Check className="h-3 w-3 text-green-500 inline" />
                            ) : (
                              `$10`
                            )}
                          </span>
                          <span>
                            {filleul.threshold50Reached ? (
                              <Check className="h-3 w-3 text-green-500 inline" />
                            ) : (
                              `$50`
                            )}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {filleul.threshold50Reached ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Check className="h-3 w-3 mr-1" />
                          {t("chatter.referrals.qualified")}
                        </Badge>
                      ) : filleul.isActive ? (
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800"
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {t("chatter.referrals.active")}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {t("chatter.referrals.pending")}
                        </Badge>
                      )}
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

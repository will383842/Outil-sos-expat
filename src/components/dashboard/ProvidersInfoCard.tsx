/**
 * =============================================================================
 * PROVIDERS INFO CARD - Carte d'information sur les prestataires
 * =============================================================================
 */

import { Link } from "react-router-dom";
import { Users, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../../lib/utils";

export interface ProvidersInfoCardProps {
  stats: {
    total: number;
    withAccess: number;
  };
  isLoading?: boolean;
  linkTo?: string;
}

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-sos-red-600" />
          Prestataires
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-8" />
          </div>
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ProvidersInfoCard({
  stats,
  isLoading = false,
  linkTo = "/prestataires",
}: ProvidersInfoCardProps) {
  if (isLoading) {
    return <CardSkeleton />;
  }

  const withoutAccess = stats.total - stats.withAccess;
  const accessPercentage = stats.total > 0
    ? Math.round((stats.withAccess / stats.total) * 100)
    : 0;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Users className="w-5 h-5 text-sos-red-600" />
          Prestataires
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Stats list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total inscrits</span>
              <span className="font-semibold text-gray-900">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Avec accès outil</span>
              <span className="font-semibold text-green-600">{stats.withAccess}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Sans accès</span>
              <span className="font-semibold text-gray-500">{withoutAccess}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
              <span>Accès activés</span>
              <span>{accessPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-500 ease-out",
                  "bg-green-500"
                )}
                style={{ width: `${accessPercentage}%` }}
              />
            </div>
          </div>

          {/* Link to providers list */}
          {linkTo && (
            <Link
              to={linkTo}
              className={cn(
                "flex items-center justify-between pt-3 text-sm",
                "text-sos-red-600 hover:text-sos-red-700 transition-colors"
              )}
            >
              <span>Voir tous les prestataires</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ProvidersInfoCard;

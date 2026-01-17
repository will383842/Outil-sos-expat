/**
 * =============================================================================
 * SECONDARY STATS GRID - Grille secondaire des statistiques
 * =============================================================================
 */

import { Scale, Globe, Sparkles, Euro } from "lucide-react";
import { StatCard } from "../ui/stat-card";
import { Skeleton } from "../ui/skeleton";
import { Card, CardContent } from "../ui/card";

export interface SecondaryStatsGridProps {
  stats: {
    lawyers: number;
    expats: number;
    aiProcessed: number;
    totalRevenue?: number;
  };
  totalBookings?: number;
  isAdmin?: boolean;
  isLoading?: boolean;
}

function StatCardSkeleton() {
  return (
    <Card className="hover:shadow-card-hover transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-11 w-11 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function SecondaryStatsGrid({
  stats,
  totalBookings = 0,
  isAdmin = false,
  isLoading = false,
}: SecondaryStatsGridProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  const aiPercentage = totalBookings > 0
    ? Math.round((stats.aiProcessed / totalBookings) * 100)
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label={isAdmin ? "Dossiers Avocats" : "Type Avocat"}
        value={stats.lawyers}
        icon={Scale}
        color="blue"
      />
      <StatCard
        label={isAdmin ? "Dossiers Expatriés" : "Type Expatrié"}
        value={stats.expats}
        icon={Globe}
        color="green"
      />
      <StatCard
        label="Traités par IA"
        value={stats.aiProcessed}
        icon={Sparkles}
        color="purple"
        subValue={`${aiPercentage}%`}
      />
      <StatCard
        label={isAdmin ? "Revenus totaux" : "Mes revenus"}
        value={`${stats.totalRevenue ?? 0}€`}
        icon={Euro}
        color="green"
      />
    </div>
  );
}

export default SecondaryStatsGrid;

/**
 * =============================================================================
 * STATS GRID - Grille principale des statistiques du dashboard
 * =============================================================================
 */

import { Briefcase, Clock, Phone, CheckCircle } from "lucide-react";
import { StatCard } from "../ui/stat-card";
import { Skeleton } from "../ui/skeleton";
import { Card, CardContent } from "../ui/card";
import { useLanguage } from "../../hooks/useLanguage";

export interface StatsGridProps {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  isLoading?: boolean;
  isAdmin?: boolean;
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

export function StatsGrid({ stats, isLoading = false, isAdmin = false }: StatsGridProps) {
  const { t } = useLanguage({ mode: "provider" });

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

  const activeDossiers = stats.pending + stats.inProgress;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        label={isAdmin ? t("provider:dashboard.stats.activeDossiers") : t("provider:dashboard.stats.myActiveDossiers")}
        value={activeDossiers}
        icon={Briefcase}
        color="blue"
        subValue={`${stats.total} ${t("provider:dashboard.stats.total")}`}
      />
      <StatCard
        label={t("provider:dashboard.stats.pending")}
        value={stats.pending}
        icon={Clock}
        color="amber"
      />
      <StatCard
        label={t("provider:dashboard.stats.inProgress")}
        value={stats.inProgress}
        icon={Phone}
        color="blue"
      />
      <StatCard
        label={t("provider:dashboard.stats.completed")}
        value={stats.completed}
        icon={CheckCircle}
        color="green"
      />
    </div>
  );
}

export default StatsGrid;

/**
 * =============================================================================
 * ACTIVITY CHART - Graphique d'activité simple en barres (sans lib externe)
 * =============================================================================
 */

import { BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Skeleton } from "../ui/skeleton";
import { cn } from "../../lib/utils";

export interface ActivityChartDataItem {
  label: string;
  value: number;
  color?: string;
}

export interface ActivityChartProps {
  data: ActivityChartDataItem[];
  title?: string;
  isLoading?: boolean;
  height?: number;
  color?: string;
}

function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="flex items-end justify-between gap-2" style={{ height }}>
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-2">
          <Skeleton
            className="w-full rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
          <Skeleton className="h-3 w-8" />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
        <BarChart3 className="w-6 h-6 text-gray-400" />
      </div>
      <p className="text-sm text-muted-foreground">
        Aucune donnée disponible
      </p>
    </div>
  );
}

export function ActivityChart({
  data,
  title = "Activité",
  isLoading = false,
  height = 200,
  color = "#ef4444",
}: ActivityChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-sos-red-600" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartSkeleton height={height} />
        </CardContent>
      </Card>
    );
  }

  // Get max value for scaling
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Check if all values are 0
  const hasData = data.some((d) => d.value > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-sos-red-600" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyState />
        ) : (
          <div className="flex items-end justify-between gap-2" style={{ height }}>
            {data.map((item, index) => {
              const heightPercent = (item.value / maxValue) * 100;
              const barColor = item.color || color;

              return (
                <div
                  key={`${item.label}-${index}`}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  {/* Bar container */}
                  <div className="w-full flex items-end justify-center" style={{ height: height - 24 }}>
                    <div
                      className={cn(
                        "w-full max-w-[40px] rounded-t transition-all duration-500 ease-out",
                        "hover:opacity-80 cursor-default relative group"
                      )}
                      style={{
                        height: `${Math.max(heightPercent, 4)}%`,
                        backgroundColor: barColor,
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      {/* Tooltip on hover */}
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                          {item.value}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Label */}
                  <span className="text-xs text-muted-foreground">
                    {item.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ActivityChart;

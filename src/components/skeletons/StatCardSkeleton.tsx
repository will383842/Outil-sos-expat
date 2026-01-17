/**
 * =============================================================================
 * STAT CARD SKELETON - Placeholder de chargement pour StatCard
 * Correspond aux dimensions exactes de StatCard avec animation pulse
 * =============================================================================
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "../ui/skeleton"
import { Card, CardContent } from "../ui/card"

export interface StatCardSkeletonProps {
  /** Show additional skeleton for subValue text */
  showSubValue?: boolean
  /** Show additional skeleton for trend indicator */
  showTrend?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * StatCardSkeleton - Loading placeholder for StatCard component
 * Matches exact dimensions and layout of the real StatCard
 */
export function StatCardSkeleton({
  showSubValue = false,
  showTrend = false,
  className,
}: StatCardSkeletonProps) {
  return (
    <Card
      className={cn("hover:shadow-card-hover transition-shadow", className)}
      aria-label="Loading statistics"
      role="status"
    >
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            {/* Label skeleton - matches "text-sm font-medium" ~96px width */}
            <Skeleton className="h-4 w-24" aria-hidden="true" />

            <div className="flex items-baseline gap-2">
              {/* Value skeleton - matches "text-2xl font-bold" ~64px width */}
              <Skeleton className="h-8 w-16" aria-hidden="true" />

              {/* Trend skeleton - matches "text-xs font-medium" ~32px width */}
              {showTrend && (
                <Skeleton className="h-4 w-8" aria-hidden="true" />
              )}
            </div>

            {/* SubValue skeleton - matches "text-xs" ~80px width */}
            {showSubValue && (
              <Skeleton className="h-3 w-20" aria-hidden="true" />
            )}
          </div>

          {/* Icon skeleton - matches "rounded-full p-3" with "h-5 w-5" icon = 44px */}
          <Skeleton className="h-11 w-11 rounded-full" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  )
}

StatCardSkeleton.displayName = "StatCardSkeleton"

export default StatCardSkeleton

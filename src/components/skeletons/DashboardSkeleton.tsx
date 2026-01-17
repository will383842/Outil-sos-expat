/**
 * =============================================================================
 * DASHBOARD SKELETON - Placeholder de chargement complet pour le Dashboard
 * Compose les skeletons individuels pour créer une vue complète
 * =============================================================================
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "../ui/skeleton"
import { Card, CardContent, CardHeader } from "../ui/card"
import { StatCardSkeleton } from "./StatCardSkeleton"

export interface DashboardSkeletonProps {
  /** Number of stat cards to show (default 4) */
  statCardsCount?: number
  /** Number of recent booking items to show (default 5) */
  recentBookingsCount?: number
  /** Show chart section */
  showChart?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * StatsGridSkeleton - Grid of StatCardSkeleton components
 */
function StatsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      aria-label="Loading statistics grid"
      role="status"
    >
      {Array.from({ length: count }).map((_, index) => (
        <StatCardSkeleton
          key={index}
          showSubValue={index === 0} // First card typically has subValue
        />
      ))}
    </div>
  )
}

/**
 * RecentBookingItemSkeleton - Single booking list item skeleton
 */
function RecentBookingItemSkeleton() {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        {/* Type icon circle */}
        <Skeleton className="w-8 h-8 rounded-full" aria-hidden="true" />
        <div className="space-y-1.5">
          {/* Client name */}
          <Skeleton className="h-4 w-32" aria-hidden="true" />
          {/* Category and date */}
          <Skeleton className="h-3 w-24" aria-hidden="true" />
        </div>
      </div>
      {/* Status badge */}
      <Skeleton className="h-5 w-16 rounded-full" aria-hidden="true" />
    </div>
  )
}

/**
 * RecentBookingsSkeleton - Card with list of booking skeletons
 */
function RecentBookingsSkeleton({ count = 5 }: { count?: number }) {
  return (
    <Card aria-label="Loading recent bookings" role="status">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {/* Calendar icon */}
          <Skeleton className="w-5 h-5 rounded" aria-hidden="true" />
          {/* Title */}
          <Skeleton className="h-5 w-32" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {Array.from({ length: count }).map((_, index) => (
            <RecentBookingItemSkeleton key={index} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * ChartSkeleton - Placeholder for activity chart area
 */
function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <Card aria-label="Loading chart" role="status">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {/* Chart icon */}
          <Skeleton className="w-5 h-5 rounded" aria-hidden="true" />
          {/* Title */}
          <Skeleton className="h-5 w-24" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between gap-2" style={{ height }}>
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              {/* Bar with varied heights for visual interest */}
              <Skeleton
                className="w-full max-w-[40px] rounded-t"
                style={{
                  height: `${30 + ((index * 17) % 50)}%`,
                }}
                aria-hidden="true"
              />
              {/* Label */}
              <Skeleton className="h-3 w-8" aria-hidden="true" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * QuickActionsSkeleton - Placeholder for quick actions card
 */
function QuickActionsSkeleton() {
  return (
    <Card aria-label="Loading quick actions" role="status">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-5 h-5 rounded" aria-hidden="true" />
          <Skeleton className="h-5 w-28" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-10 w-full rounded-lg"
              aria-hidden="true"
            />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * DashboardSkeleton - Full dashboard page loading skeleton
 * Composes all individual skeletons into a complete layout
 */
export function DashboardSkeleton({
  statCardsCount = 4,
  recentBookingsCount = 5,
  showChart = true,
  className,
}: DashboardSkeletonProps) {
  return (
    <div
      className={cn("space-y-6", className)}
      aria-label="Loading dashboard"
      role="status"
      aria-busy="true"
    >
      {/* Page header skeleton */}
      <div className="space-y-1">
        <Skeleton className="h-8 w-48" aria-hidden="true" />
        <Skeleton className="h-4 w-64" aria-hidden="true" />
      </div>

      {/* Stats Grid */}
      <StatsGridSkeleton count={statCardsCount} />

      {/* Main content grid - chart and recent bookings side by side on large screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart section */}
        {showChart && <ChartSkeleton height={200} />}

        {/* Recent Bookings */}
        <RecentBookingsSkeleton count={recentBookingsCount} />
      </div>

      {/* Secondary row - Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <QuickActionsSkeleton />
        <QuickActionsSkeleton />
        <QuickActionsSkeleton />
      </div>
    </div>
  )
}

// Export individual skeletons for flexible composition
export {
  StatsGridSkeleton,
  RecentBookingsSkeleton,
  RecentBookingItemSkeleton,
  ChartSkeleton,
  QuickActionsSkeleton,
}

DashboardSkeleton.displayName = "DashboardSkeleton"

export default DashboardSkeleton

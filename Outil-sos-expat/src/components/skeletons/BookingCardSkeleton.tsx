/**
 * =============================================================================
 * BOOKING CARD SKELETON - Placeholder de chargement pour BookingCard
 * Correspond au layout exact de BookingCard (header, badges, description, meta, footer)
 * =============================================================================
 */

import * as React from "react"
import { cn } from "@/lib/utils"
import { Skeleton } from "../ui/skeleton"

export interface BookingCardSkeletonProps {
  /** Show additional meta info placeholders */
  showFullMeta?: boolean
  /** Additional CSS classes */
  className?: string
}

/**
 * BookingCardSkeleton - Loading placeholder for BookingCard component
 * Matches exact layout: header with badges, title, description, meta info, footer
 */
export function BookingCardSkeleton({
  showFullMeta = true,
  className,
}: BookingCardSkeletonProps) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 p-4",
        className
      )}
      aria-label="Loading booking"
      role="status"
    >
      {/* Header - badges row and title */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {/* Type badge (Avocat/Expert) - ~60px */}
            <Skeleton
              className="h-5 w-[60px] rounded-full"
              aria-hidden="true"
            />
            {/* Priority badge - ~70px */}
            <Skeleton
              className="h-5 w-[70px] rounded-full"
              aria-hidden="true"
            />
            {/* AI badge - ~40px */}
            <Skeleton
              className="h-5 w-10 rounded-full"
              aria-hidden="true"
            />
          </div>

          {/* Title - matches "font-semibold text-gray-900" */}
          <Skeleton className="h-5 w-3/4" aria-hidden="true" />
        </div>

        {/* Status badge - matches ~80px with icon */}
        <Skeleton
          className="h-7 w-20 rounded-lg flex-shrink-0"
          aria-hidden="true"
        />
      </div>

      {/* Description - 2 lines, matches "text-sm line-clamp-2" */}
      <div className="space-y-1.5 mb-3">
        <Skeleton className="h-4 w-full" aria-hidden="true" />
        <Skeleton className="h-4 w-4/5" aria-hidden="true" />
      </div>

      {/* Meta info row - client, location, category, date */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {/* Client name with icon */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-3.5 w-3.5 rounded" aria-hidden="true" />
          <Skeleton className="h-3 w-16" aria-hidden="true" />
        </div>

        {showFullMeta && (
          <>
            {/* Location with icon */}
            <div className="flex items-center gap-1">
              <Skeleton className="h-3.5 w-3.5 rounded" aria-hidden="true" />
              <Skeleton className="h-3 w-12" aria-hidden="true" />
            </div>

            {/* Category with icon */}
            <div className="flex items-center gap-1">
              <Skeleton className="h-3.5 w-3.5 rounded" aria-hidden="true" />
              <Skeleton className="h-3 w-20" aria-hidden="true" />
            </div>
          </>
        )}

        {/* Date with icon */}
        <div className="flex items-center gap-1">
          <Skeleton className="h-3.5 w-3.5 rounded" aria-hidden="true" />
          <Skeleton className="h-3 w-14" aria-hidden="true" />
        </div>
      </div>

      {/* Footer - price/duration and arrow */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {/* Price */}
          <Skeleton className="h-4 w-10" aria-hidden="true" />
          {/* Duration */}
          <Skeleton className="h-3 w-12" aria-hidden="true" />
        </div>
        {/* Arrow icon */}
        <Skeleton className="h-5 w-5 rounded" aria-hidden="true" />
      </div>
    </div>
  )
}

BookingCardSkeleton.displayName = "BookingCardSkeleton"

export default BookingCardSkeleton

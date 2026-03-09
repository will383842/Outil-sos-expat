/**
 * DashboardSkeleton — Full above-fold skeleton
 *
 * Mimics the real dashboard structure:
 * 1. Hero earnings card (gradient)
 * 2. 3 balance cards row
 * 3. Action/objective card
 * 4. Level progress bar
 * 5. Activity feed placeholder
 *
 * Uses shimmer animation for perceived performance.
 */

import React from "react";

const shimmer =
  "relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent";

const SkeletonLine = ({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) => (
  <div className={`${w} ${h} rounded-lg bg-white/[0.08] ${shimmer}`} />
);

const DashboardSkeleton: React.FC = () => (
  <div className="px-4 py-4 space-y-4 animate-[fadeIn_0.15s_ease-out]">
    {/* 1. Hero Earnings Card */}
    <div className="bg-gradient-to-br from-indigo-500/20 to-violet-500/20 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 space-y-4">
      <SkeletonLine w="w-28" h="h-3" />
      <SkeletonLine w="w-40" h="h-10" />
      <div className="flex gap-3">
        <SkeletonLine w="w-24" h="h-6" />
        <SkeletonLine w="w-20" h="h-6" />
      </div>
    </div>

    {/* 2. Three Balance Cards */}
    <div className="grid grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-4 space-y-3"
        >
          <div className={`w-8 h-8 rounded-lg bg-white/[0.08] ${shimmer}`} />
          <SkeletonLine w="w-full" h="h-3" />
          <SkeletonLine w="w-2/3" h="h-6" />
        </div>
      ))}
    </div>

    {/* 3. Action / Objective Card */}
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl bg-white/[0.08] ${shimmer}`} />
        <div className="flex-1 space-y-2">
          <SkeletonLine w="w-2/3" h="h-4" />
          <SkeletonLine w="w-1/2" h="h-3" />
        </div>
      </div>
      {/* Progress bar */}
      <div className={`w-full h-2 rounded-full bg-white/[0.06] ${shimmer}`} />
      <SkeletonLine w="w-32" h="h-9" />
    </div>

    {/* 4. Level Progress */}
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 space-y-3">
      <div className="flex justify-between">
        <SkeletonLine w="w-24" h="h-4" />
        <SkeletonLine w="w-16" h="h-4" />
      </div>
      <div className={`w-full h-3 rounded-full bg-white/[0.06] ${shimmer}`} />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={`w-8 h-8 rounded-full bg-white/[0.08] ${shimmer}`} />
        ))}
      </div>
    </div>

    {/* 5. Activity Feed */}
    <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.06] rounded-2xl p-5 space-y-4">
      <SkeletonLine w="w-36" h="h-4" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full bg-white/[0.08] flex-shrink-0 ${shimmer}`} />
          <div className="flex-1 space-y-2">
            <SkeletonLine w="w-3/4" h="h-3" />
            <SkeletonLine w="w-1/3" h="h-2.5" />
          </div>
          <SkeletonLine w="w-14" h="h-5" />
        </div>
      ))}
    </div>
  </div>
);

export default React.memo(DashboardSkeleton);

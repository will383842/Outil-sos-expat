/**
 * SkeletonCard - Loading placeholder with shimmer effect
 *
 * Features:
 * - Shimmer animation for loading states
 * - Various preset layouts (stats, balance, level, etc.)
 * - Customizable dimensions
 * - Dark mode support
 * - Accessible (aria-busy)
 */

import React from 'react';

// Base shimmer styles
const shimmerClass = `
  relative overflow-hidden
  before:absolute before:inset-0
  before:-translate-x-full
  before:animate-shimmer
  before:bg-gradient-to-r
  before:from-transparent
  before:via-white/20
  before:to-transparent
  dark:before:via-white/10
`;

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

// Basic skeleton element
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width = 'w-full',
  height = 'h-4',
  rounded = 'md',
}) => {
  const roundedClass = {
    sm: 'rounded-sm',
    md: 'rounded',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    full: 'rounded-full',
  }[rounded];

  return (
    <div
      className={`
        bg-gray-200 dark:bg-white/10
        ${shimmerClass}
        ${width}
        ${height}
        ${roundedClass}
        ${className}
      `}
      aria-hidden="true"
    />
  );
};

// Skeleton text line
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = '',
}) => (
  <div className={`space-y-2 ${className}`} aria-hidden="true">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        height="h-4"
        width={i === lines - 1 ? 'w-3/4' : 'w-full'}
        rounded="md"
      />
    ))}
  </div>
);

// Skeleton avatar
export const SkeletonAvatar: React.FC<{ size?: 'sm' | 'md' | 'lg' | 'xl' }> = ({
  size = 'md',
}) => {
  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }[size];

  return <Skeleton className={sizeClass} rounded="full" width="" height="" />;
};

// Card container with glassmorphism
const CardContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div
    className={`
      bg-white/80 dark:bg-white/5
      backdrop-blur-xl
      border border-white/20 dark:border-white/10
      rounded-2xl shadow-lg
      ${className}
    `}
    role="status"
    aria-busy="true"
    aria-label="Loading..."
  >
    {children}
  </div>
);

// Stats Card Skeleton
export const SkeletonStatsCard: React.FC = () => (
  <CardContainer className="p-4 sm:p-5 min-h-[120px]">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-3">
        <Skeleton width="w-20" height="h-4" />
        <Skeleton width="w-24" height="h-8" />
        <Skeleton width="w-32" height="h-3" />
      </div>
      <Skeleton width="w-12" height="h-12" rounded="xl" />
    </div>
  </CardContainer>
);

// Balance Card Skeleton
export const SkeletonBalanceCard: React.FC = () => (
  <CardContainer className="p-4 sm:p-6">
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <Skeleton width="w-16" height="h-16" rounded="full" />
      </div>
      <Skeleton width="w-24" height="h-5" className="mx-auto" />
      <Skeleton width="w-32" height="h-10" className="mx-auto" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton height="h-16" rounded="xl" />
        <Skeleton height="h-16" rounded="xl" />
      </div>
      <Skeleton height="h-12" rounded="xl" />
    </div>
  </CardContainer>
);

// Level Card Skeleton
export const SkeletonLevelCard: React.FC = () => (
  <CardContainer className="p-4 sm:p-6">
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton width="w-14" height="h-14" rounded="xl" />
        <div className="flex-1 space-y-2">
          <Skeleton width="w-24" height="h-5" />
          <Skeleton width="w-32" height="h-4" />
        </div>
      </div>
      <Skeleton height="h-2" rounded="full" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton height="h-16" rounded="xl" />
        <Skeleton height="h-16" rounded="xl" />
      </div>
    </div>
  </CardContainer>
);

// Daily Missions Card Skeleton
export const SkeletonMissionsCard: React.FC = () => (
  <CardContainer className="p-4 sm:p-6">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton width="w-10" height="h-10" rounded="xl" />
          <div className="space-y-2">
            <Skeleton width="w-28" height="h-5" />
            <Skeleton width="w-20" height="h-3" />
          </div>
        </div>
        <Skeleton width="w-16" height="h-8" rounded="full" />
      </div>
      <Skeleton height="h-2.5" rounded="full" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} height="h-16" rounded="xl" />
        ))}
      </div>
    </div>
  </CardContainer>
);

// Commission Item Skeleton
export const SkeletonCommissionItem: React.FC = () => (
  <div className="px-4 sm:px-6 py-4 flex items-center justify-between">
    <div className="flex items-center gap-3">
      <Skeleton width="w-11" height="h-11" rounded="full" />
      <div className="space-y-2">
        <Skeleton width="w-28" height="h-4" />
        <Skeleton width="w-20" height="h-3" />
      </div>
    </div>
    <div className="text-right space-y-2">
      <Skeleton width="w-16" height="h-5" />
      <Skeleton width="w-12" height="h-4" className="ml-auto" />
    </div>
  </div>
);

// Team Stats Skeleton
export const SkeletonTeamCard: React.FC = () => (
  <CardContainer className="p-4 sm:p-6">
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Skeleton width="w-5" height="h-5" rounded="full" />
          <Skeleton width="w-24" height="h-5" />
        </div>
        <Skeleton width="w-12" height="h-4" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Skeleton height="h-20" rounded="xl" />
        <Skeleton height="h-20" rounded="xl" />
      </div>
      <Skeleton height="h-24" rounded="xl" />
    </div>
  </CardContainer>
);

// Full Dashboard Skeleton (combines all card skeletons)
export const SkeletonDashboard: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton width="w-7" height="h-7" rounded="full" />
          <Skeleton width="w-40" height="h-8" />
        </div>
        <Skeleton width="w-32" height="h-5" />
      </div>
      <Skeleton width="w-32" height="h-12" rounded="xl" />
    </div>

    {/* Stats Grid */}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <SkeletonStatsCard />
      <SkeletonStatsCard />
      <SkeletonStatsCard />
      <SkeletonStatsCard />
    </div>

    {/* Main Content Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <SkeletonMissionsCard />
        <CardContainer className="overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-white/10">
            <Skeleton width="w-40" height="h-6" />
          </div>
          <div className="divide-y divide-gray-100 dark:divide-white/5">
            {[1, 2, 3].map((i) => (
              <SkeletonCommissionItem key={i} />
            ))}
          </div>
        </CardContainer>
      </div>
      <div className="space-y-6">
        <SkeletonBalanceCard />
        <SkeletonLevelCard />
        <SkeletonTeamCard />
      </div>
    </div>
  </div>
);

// Main skeleton card component (generic with variant support)
const SkeletonCard: React.FC<{
  variant?: 'stats' | 'balance' | 'level' | 'missions' | 'team' | 'commission';
}> = ({ variant = 'stats' }) => {
  switch (variant) {
    case 'balance':
      return <SkeletonBalanceCard />;
    case 'level':
      return <SkeletonLevelCard />;
    case 'missions':
      return <SkeletonMissionsCard />;
    case 'team':
      return <SkeletonTeamCard />;
    case 'commission':
      return <SkeletonCommissionItem />;
    default:
      return <SkeletonStatsCard />;
  }
};

export { SkeletonCard };
export default SkeletonCard;

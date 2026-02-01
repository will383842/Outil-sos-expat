/**
 * UI Components - Animation and feedback utilities
 *
 * Exports:
 * - AnimatedNumber: Count-up animation for numbers
 * - SkeletonCard: Loading placeholder with shimmer
 * - SuccessFeedback: Celebration animations (confetti, sparkle, toast)
 * - Animation utilities and helpers
 */

export { default as AnimatedNumber, useCountUp } from './AnimatedNumber';

export {
  default as SkeletonCard,
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonStatsCard,
  SkeletonBalanceCard,
  SkeletonLevelCard,
  SkeletonMissionsCard,
  SkeletonCommissionItem,
  SkeletonTeamCard,
  SkeletonDashboard,
} from './SkeletonCard';

export {
  default as SuccessFeedback,
  ConfettiCelebration,
  SparkleEffect,
  Toast,
  AnimatedCheck,
  useSuccessFeedback,
} from './SuccessFeedback';

export * from './animations';

/**
 * BelowFoldBundle - Single lazy-loaded bundle for all below-fold dashboard cards
 * Reduces network requests from 20 to 1 for below-fold content
 */

// Re-export all below-fold cards from a single entry point
export { default as DailyMissionsCard } from './DailyMissionsCard';
export { default as MotivationWidget } from './MotivationWidget';
export { default as PiggyBankCard } from './PiggyBankCard';
export { default as TrendsChartCard } from './TrendsChartCard';
export { default as ForecastCard } from './ForecastCard';
export { default as AchievementBadgesCard } from './AchievementBadgesCard';
export { default as EarningsBreakdownCard } from './EarningsBreakdownCard';
export { default as RevenueCalculatorCard } from './RevenueCalculatorCard';
export { default as ComparisonStatsCard } from './ComparisonStatsCard';
export { default as WeeklyChallengeCard } from './WeeklyChallengeCard';
export { default as LiveActivityFeed } from './LiveActivityFeed';
export { TeamManagementCard } from './TeamManagementCard';
export { EarningsRatioCard } from './EarningsRatioCard';
export { TeamMessagesCard } from './TeamMessagesCard';
export { ReferralTreeCard } from './ReferralTreeCard';

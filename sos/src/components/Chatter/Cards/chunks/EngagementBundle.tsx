/**
 * EngagementBundle — Lazy chunk grouping DailyMissions + PiggyBank
 * These two cards are always displayed together in the below-fold section.
 * Grouping them in a single chunk reduces HTTP round-trips from 4 to 2.
 */
export { default as DailyMissionsCard } from '../DailyMissionsCard';
export { default as PiggyBankCard } from '../PiggyBankCard';

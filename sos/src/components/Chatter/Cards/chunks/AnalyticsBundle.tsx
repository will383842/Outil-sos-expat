/**
 * AnalyticsBundle — Lazy chunk grouping TrendsChart + Motivation
 * These two cards are always displayed together in the below-fold section.
 * Grouping them in a single chunk reduces HTTP round-trips from 4 to 2.
 */
export { default as TrendsChartCard } from '../TrendsChartCard';
export { default as MotivationWidget } from '../MotivationWidget';

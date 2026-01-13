/**
 * Analytics Module Index
 *
 * Exports all analytics-related Cloud Functions:
 * - getUnifiedAnalytics: Callable function for real-time analytics aggregation
 * - getHistoricalAnalytics: Callable function for trend analysis
 * - aggregateDailyAnalytics: Scheduled function for daily pre-aggregation
 * - cleanupOldAnalytics: Scheduled function for data cleanup
 *
 * @module analytics
 */

// Unified Analytics Functions
export {
  // Callable Functions
  getUnifiedAnalytics,
  getHistoricalAnalytics,

  // Scheduled Functions
  aggregateDailyAnalytics,
  cleanupOldAnalytics,

  // Types
  type AnalyticsPeriod,
  type AnalyticsFilters,
  type UserMetrics,
  type CallMetrics,
  type PeakHourEntry,
  type RevenueMetrics,
  type CountryRevenue,
  type ClientFunnel,
  type ProviderFunnel,
  type UnifiedAnalyticsResponse,
  type DailyAnalyticsDoc,
} from './unifiedAnalytics';

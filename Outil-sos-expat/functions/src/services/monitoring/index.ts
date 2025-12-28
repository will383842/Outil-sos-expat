/**
 * =============================================================================
 * MONITORING SERVICES - Export aggregation
 * =============================================================================
 */

// Core metrics
export { metrics, SLO_TARGETS } from "./MetricsService";
export type { LogSeverity, LogContext, MetricData, SLIMetric } from "./MetricsService";

// Function monitoring
export {
  monitorHttpFunction,
  monitorCallableFunction,
  monitorTriggerFunction,
  monitorScheduledFunction,
} from "./FunctionMonitor";
export type { MonitoredFunctionOptions } from "./FunctionMonitor";

// Firestore monitoring
export {
  monitoredGet,
  monitoredSet,
  monitoredUpdate,
  monitoredDelete,
  monitoredQuery,
  monitoredBatchWrite,
  monitoredTransaction,
  getSessionMetrics,
  resetSessionMetrics,
  estimateSessionCost,
  createMonitoredQuery,
} from "./FirestoreMonitor";
export type { FirestoreMetrics, OperationResult } from "./FirestoreMonitor";

// Redis monitoring
export {
  monitoredCacheGet,
  monitoredCacheSet,
  collectRedisMetrics,
  getCacheStats,
  resetCacheStats,
  checkRedisHealth,
  collectAndLogMetrics as collectRedisLogs,
  analyzeKeyPatterns,
} from "./RedisMonitor";
export type { RedisMetrics, CacheStats } from "./RedisMonitor";

// Error tracking
export {
  errorTracker,
  withErrorTracking,
  errorTrackingMiddleware,
} from "./ErrorTracker";
export type { ErrorSeverity, TrackedError, ErrorContext, ErrorPattern } from "./ErrorTracker";

// Alerting
export {
  alerting,
  RUNBOOKS,
  DEFAULT_ALERT_RULES,
} from "./AlertingService";
export type { Alert, AlertRule, AlertPriority, AlertChannel, Runbook } from "./AlertingService";

// Analytics
export { analytics } from "./AnalyticsService";
export type {
  DashboardData,
  SystemSummary,
  PerformanceMetrics,
  ErrorMetrics,
  CostMetrics,
  SLOStatus,
  TrendData,
  ReportConfig,
} from "./AnalyticsService";

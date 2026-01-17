/**
 * =============================================================================
 * METRICS SERVICE - Collecte et publication de métriques custom
 * =============================================================================
 *
 * Service centralisé pour:
 * - Structured logging (JSON)
 * - Custom metrics Cloud Monitoring
 * - Performance tracking
 * - SLI/SLO monitoring
 *
 * =============================================================================
 */

import { logger } from "firebase-functions";

// =============================================================================
// TYPES
// =============================================================================

export type LogSeverity = "DEBUG" | "INFO" | "WARNING" | "ERROR" | "CRITICAL";

export interface LogContext {
  functionName?: string;
  requestId?: string;
  userId?: string;
  providerId?: string;
  conversationId?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface MetricData {
  name: string;
  value: number;
  labels?: Record<string, string>;
  timestamp?: Date;
}

export interface SLIMetric {
  name: string;
  target: number;
  actual: number;
  unit: string;
  window: string;
}

// =============================================================================
// SLO DEFINITIONS
// =============================================================================

export const SLO_TARGETS = {
  // Latency SLOs (P95 in milliseconds)
  LATENCY: {
    AI_CHAT: 3000,
    AI_CHAT_STREAM: 500, // First chunk
    WEBHOOK_INGEST: 1000,
    BOOKING_STATUS: 500,
    HEALTH_CHECK: 200,
  },

  // Error rate SLOs (percentage)
  ERROR_RATE: {
    GLOBAL: 1.0, // < 1%
    CRITICAL_PATHS: 0.1, // < 0.1%
  },

  // Availability SLOs (percentage)
  AVAILABILITY: {
    GLOBAL: 99.9, // 99.9% uptime
    AI_SERVICES: 99.5, // 99.5% (depends on external APIs)
  },

  // Cache SLOs
  CACHE: {
    HIT_RATE_AI: 30, // > 30%
    HIT_RATE_ASSETS: 80, // > 80%
    LATENCY_MS: 10, // < 10ms
  },

  // Cold Start SLOs
  COLD_START: {
    RATE: 5, // < 5% of invocations
    DURATION_MS: 3000, // < 3s
  },
} as const;

// =============================================================================
// IN-MEMORY METRICS STORE (for aggregation)
// =============================================================================

interface MetricBucket {
  count: number;
  sum: number;
  min: number;
  max: number;
  values: number[];
}

class MetricsStore {
  private buckets = new Map<string, MetricBucket>();
  private readonly maxValues = 1000; // Keep last 1000 values for percentiles

  record(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = { count: 0, sum: 0, min: Infinity, max: -Infinity, values: [] };
      this.buckets.set(key, bucket);
    }

    bucket.count++;
    bucket.sum += value;
    bucket.min = Math.min(bucket.min, value);
    bucket.max = Math.max(bucket.max, value);

    bucket.values.push(value);
    if (bucket.values.length > this.maxValues) {
      bucket.values.shift();
    }
  }

  getStats(name: string, labels?: Record<string, string>): {
    count: number;
    avg: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } | null {
    const key = this.buildKey(name, labels);
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.count === 0) return null;

    const sorted = [...bucket.values].sort((a, b) => a - b);

    return {
      count: bucket.count,
      avg: bucket.sum / bucket.count,
      min: bucket.min,
      max: bucket.max,
      p50: this.percentile(sorted, 50),
      p95: this.percentile(sorted, 95),
      p99: this.percentile(sorted, 99),
    };
  }

  reset(name?: string): void {
    if (name) {
      for (const key of this.buckets.keys()) {
        if (key.startsWith(name)) {
          this.buckets.delete(key);
        }
      }
    } else {
      this.buckets.clear();
    }
  }

  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(",");
    return `${name}|${labelStr}`;
  }

  private percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }
}

// =============================================================================
// METRICS SERVICE
// =============================================================================

class MetricsService {
  private store = new MetricsStore();
  private requestId: string | null = null;

  /**
   * Set request context for correlation
   */
  setRequestContext(requestId: string): void {
    this.requestId = requestId;
  }

  /**
   * Clear request context
   */
  clearRequestContext(): void {
    this.requestId = null;
  }

  // ===========================================================================
  // STRUCTURED LOGGING
  // ===========================================================================

  /**
   * Log structured message
   */
  log(
    severity: LogSeverity,
    message: string,
    context?: LogContext
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      severity,
      message,
      requestId: this.requestId,
      ...context,
    };

    switch (severity) {
      case "DEBUG":
        logger.debug(message, logEntry);
        break;
      case "INFO":
        logger.info(message, logEntry);
        break;
      case "WARNING":
        logger.warn(message, logEntry);
        break;
      case "ERROR":
      case "CRITICAL":
        logger.error(message, logEntry);
        break;
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log("DEBUG", message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log("INFO", message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log("WARNING", message, context);
  }

  error(message: string, context?: LogContext): void {
    this.log("ERROR", message, context);
  }

  critical(message: string, context?: LogContext): void {
    this.log("CRITICAL", message, context);
  }

  // ===========================================================================
  // METRICS RECORDING
  // ===========================================================================

  /**
   * Record a latency metric
   */
  recordLatency(
    operation: string,
    durationMs: number,
    labels?: Record<string, string>
  ): void {
    this.store.record(`latency.${operation}`, durationMs, labels);

    // Log if exceeds SLO
    const slo = (SLO_TARGETS.LATENCY as Record<string, number>)[
      operation.toUpperCase().replace(/-/g, "_")
    ];
    if (slo && durationMs > slo) {
      this.warn(`Latency SLO exceeded for ${operation}`, {
        operation,
        duration: durationMs,
        slo,
        exceeded_by: durationMs - slo,
      });
    }
  }

  /**
   * Record an error
   */
  recordError(
    operation: string,
    errorType: string,
    labels?: Record<string, string>
  ): void {
    this.store.record(`errors.${operation}`, 1, { ...labels, type: errorType });
    this.store.record("errors.total", 1, labels);
  }

  /**
   * Record a cache hit/miss
   */
  recordCacheAccess(hit: boolean, cacheType: string): void {
    this.store.record(`cache.${cacheType}.${hit ? "hits" : "misses"}`, 1);
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, labels?: Record<string, string>): void {
    this.store.record(name, value, labels);
  }

  /**
   * Increment a counter
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    this.store.record(name, 1, labels);
  }

  // ===========================================================================
  // METRICS RETRIEVAL
  // ===========================================================================

  /**
   * Get latency stats for an operation
   */
  getLatencyStats(operation: string) {
    return this.store.getStats(`latency.${operation}`);
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(cacheType: string): number {
    const hits = this.store.getStats(`cache.${cacheType}.hits`);
    const misses = this.store.getStats(`cache.${cacheType}.misses`);

    const totalHits = hits?.count || 0;
    const totalMisses = misses?.count || 0;
    const total = totalHits + totalMisses;

    return total > 0 ? (totalHits / total) * 100 : 0;
  }

  /**
   * Get error rate
   */
  getErrorRate(operation?: string): number {
    const key = operation ? `errors.${operation}` : "errors.total";
    const errors = this.store.getStats(key);
    // Would need total requests to calculate rate properly
    return errors?.count || 0;
  }

  // ===========================================================================
  // SLI/SLO MONITORING
  // ===========================================================================

  /**
   * Check SLO compliance for an operation
   */
  checkSLO(
    operation: string,
    type: "latency" | "error_rate" | "availability"
  ): SLIMetric | null {
    switch (type) {
      case "latency": {
        const stats = this.getLatencyStats(operation);
        if (!stats) return null;

        const slo = (SLO_TARGETS.LATENCY as Record<string, number>)[
          operation.toUpperCase().replace(/-/g, "_")
        ];
        if (!slo) return null;

        return {
          name: `${operation}_p95_latency`,
          target: slo,
          actual: stats.p95,
          unit: "ms",
          window: "current_session",
        };
      }

      case "error_rate": {
        const errorRate = this.getErrorRate(operation);
        return {
          name: `${operation || "global"}_error_rate`,
          target: SLO_TARGETS.ERROR_RATE.GLOBAL,
          actual: errorRate,
          unit: "%",
          window: "current_session",
        };
      }

      default:
        return null;
    }
  }

  /**
   * Get all SLO statuses
   */
  getAllSLOStatuses(): Array<SLIMetric & { compliant: boolean }> {
    const results: Array<SLIMetric & { compliant: boolean }> = [];

    // Check latency SLOs
    for (const [operation, target] of Object.entries(SLO_TARGETS.LATENCY)) {
      const stats = this.getLatencyStats(operation.toLowerCase());
      if (stats) {
        results.push({
          name: `${operation}_p95_latency`,
          target,
          actual: stats.p95,
          unit: "ms",
          window: "current_session",
          compliant: stats.p95 <= target,
        });
      }
    }

    // Check cache SLOs
    for (const cacheType of ["ai", "assets"]) {
      const hitRate = this.getCacheHitRate(cacheType);
      const target =
        cacheType === "ai"
          ? SLO_TARGETS.CACHE.HIT_RATE_AI
          : SLO_TARGETS.CACHE.HIT_RATE_ASSETS;

      results.push({
        name: `${cacheType}_cache_hit_rate`,
        target,
        actual: hitRate,
        unit: "%",
        window: "current_session",
        compliant: hitRate >= target,
      });
    }

    return results;
  }

  // ===========================================================================
  // UTILITIES
  // ===========================================================================

  /**
   * Create a timer for measuring duration
   */
  startTimer(): () => number {
    const start = Date.now();
    return () => Date.now() - start;
  }

  /**
   * Wrap an async function with latency tracking
   */
  async trackLatency<T>(
    operation: string,
    fn: () => Promise<T>,
    labels?: Record<string, string>
  ): Promise<T> {
    const stop = this.startTimer();
    try {
      const result = await fn();
      this.recordLatency(operation, stop(), labels);
      return result;
    } catch (error) {
      this.recordLatency(operation, stop(), { ...labels, error: "true" });
      this.recordError(operation, (error as Error).name, labels);
      throw error;
    }
  }

  /**
   * Reset all metrics (for testing)
   */
  reset(): void {
    this.store.reset();
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const metrics = new MetricsService();

export default metrics;

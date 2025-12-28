/**
 * =============================================================================
 * ERROR TRACKER - Backend error tracking & alerting
 * =============================================================================
 *
 * Service centralisé pour:
 * - Capture d'erreurs structurées
 * - Classification par sévérité
 * - Agrégation pour détection de patterns
 * - Intégration alerting
 *
 * =============================================================================
 */

import { metrics } from "./MetricsService";

// =============================================================================
// TYPES
// =============================================================================

export type ErrorSeverity = "low" | "medium" | "high" | "critical";

export interface TrackedError {
  id: string;
  timestamp: Date;
  severity: ErrorSeverity;
  type: string;
  message: string;
  stack?: string;
  context: ErrorContext;
  fingerprint: string;
  count: number;
}

export interface ErrorContext {
  functionName?: string;
  requestId?: string;
  userId?: string;
  operation?: string;
  input?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ErrorPattern {
  fingerprint: string;
  type: string;
  message: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  severity: ErrorSeverity;
  affectedUsers: Set<string>;
  affectedFunctions: Set<string>;
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

const ERROR_SEVERITY_RULES: Array<{
  pattern: RegExp;
  severity: ErrorSeverity;
}> = [
  // Critical - Service down
  { pattern: /ECONNREFUSED|ETIMEDOUT|ENOTFOUND/i, severity: "critical" },
  { pattern: /database.*unavailable|connection.*lost/i, severity: "critical" },
  { pattern: /out of memory|heap|OOM/i, severity: "critical" },

  // High - Functional failures
  { pattern: /authentication.*failed|unauthorized/i, severity: "high" },
  { pattern: /payment.*failed|billing.*error/i, severity: "high" },
  { pattern: /data.*corruption|integrity/i, severity: "high" },

  // Medium - Operational issues
  { pattern: /timeout|timed out/i, severity: "medium" },
  { pattern: /rate.*limit|throttl/i, severity: "medium" },
  { pattern: /invalid.*input|validation/i, severity: "medium" },

  // Low - Minor issues
  { pattern: /not found|404/i, severity: "low" },
  { pattern: /deprecated|warning/i, severity: "low" },
];

// =============================================================================
// ERROR TRACKER
// =============================================================================

class ErrorTracker {
  private patterns = new Map<string, ErrorPattern>();
  private recentErrors: TrackedError[] = [];
  private readonly maxRecentErrors = 1000;
  private readonly alertThresholds = {
    critical: 1,    // Alert on first critical error
    high: 5,        // Alert after 5 high errors in 5 min
    medium: 20,     // Alert after 20 medium errors in 5 min
    low: 100,       // Alert after 100 low errors in 5 min
  };

  /**
   * Track an error
   */
  track(error: Error, context?: ErrorContext): TrackedError {
    const severity = this.classifySeverity(error);
    const fingerprint = this.generateFingerprint(error, context);

    const trackedError: TrackedError = {
      id: this.generateId(),
      timestamp: new Date(),
      severity,
      type: error.name || "Error",
      message: error.message,
      stack: error.stack,
      context: context || {},
      fingerprint,
      count: 1,
    };

    // Update pattern tracking
    this.updatePattern(trackedError);

    // Store recent error
    this.recentErrors.push(trackedError);
    if (this.recentErrors.length > this.maxRecentErrors) {
      this.recentErrors.shift();
    }

    // Log to metrics service
    metrics.recordError(
      context?.operation || "unknown",
      error.name,
      { severity, function: context?.functionName || "unknown" }
    );

    // Log structured error
    this.logStructuredError(trackedError);

    // Check for alert conditions
    this.checkAlertConditions(trackedError);

    return trackedError;
  }

  /**
   * Classify error severity
   */
  private classifySeverity(error: Error): ErrorSeverity {
    const message = error.message + " " + error.name;

    for (const rule of ERROR_SEVERITY_RULES) {
      if (rule.pattern.test(message)) {
        return rule.severity;
      }
    }

    return "medium"; // Default
  }

  /**
   * Generate error fingerprint for deduplication
   */
  private generateFingerprint(error: Error, context?: ErrorContext): string {
    // Use error type, first line of message, and operation
    const key = [
      error.name,
      error.message.split("\n")[0].substring(0, 100),
      context?.operation || "unknown",
    ].join("|");

    // Simple hash
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash = hash & hash;
    }

    return Math.abs(hash).toString(36);
  }

  /**
   * Update error pattern tracking
   */
  private updatePattern(error: TrackedError): void {
    const existing = this.patterns.get(error.fingerprint);

    if (existing) {
      existing.count++;
      existing.lastSeen = error.timestamp;
      if (error.context.userId) {
        existing.affectedUsers.add(error.context.userId);
      }
      if (error.context.functionName) {
        existing.affectedFunctions.add(error.context.functionName);
      }
    } else {
      this.patterns.set(error.fingerprint, {
        fingerprint: error.fingerprint,
        type: error.type,
        message: error.message,
        count: 1,
        firstSeen: error.timestamp,
        lastSeen: error.timestamp,
        severity: error.severity,
        affectedUsers: new Set(error.context.userId ? [error.context.userId] : []),
        affectedFunctions: new Set(error.context.functionName ? [error.context.functionName] : []),
      });
    }
  }

  /**
   * Log structured error
   */
  private logStructuredError(error: TrackedError): void {
    const logLevel = error.severity === "critical" || error.severity === "high"
      ? "error"
      : error.severity === "medium"
        ? "warn"
        : "info";

    const logMethod = logLevel === "error" ? metrics.error
      : logLevel === "warn" ? metrics.warn
      : metrics.info;

    logMethod.call(metrics, `[Error:${error.severity}] ${error.type}: ${error.message}`, {
      errorId: error.id,
      fingerprint: error.fingerprint,
      severity: error.severity,
      ...error.context,
      stack: error.stack?.split("\n").slice(0, 5).join("\n"),
    });
  }

  /**
   * Check if alert should be triggered
   */
  private checkAlertConditions(error: TrackedError): void {
    const pattern = this.patterns.get(error.fingerprint);
    if (!pattern) return;

    const threshold = this.alertThresholds[error.severity];
    const recentCount = this.getRecentErrorCount(error.fingerprint, 5 * 60 * 1000);

    if (recentCount >= threshold) {
      this.triggerAlert(pattern, recentCount);
    }
  }

  /**
   * Get recent error count for a pattern
   */
  private getRecentErrorCount(fingerprint: string, windowMs: number): number {
    const cutoff = Date.now() - windowMs;
    return this.recentErrors.filter(
      (e) => e.fingerprint === fingerprint && e.timestamp.getTime() > cutoff
    ).length;
  }

  /**
   * Trigger alert
   */
  private triggerAlert(pattern: ErrorPattern, recentCount: number): void {
    metrics.critical(`[ALERT] Error pattern detected`, {
      fingerprint: pattern.fingerprint,
      type: pattern.type,
      message: pattern.message.substring(0, 200),
      severity: pattern.severity,
      totalCount: pattern.count,
      recentCount,
      affectedUsers: pattern.affectedUsers.size,
      affectedFunctions: Array.from(pattern.affectedFunctions),
      firstSeen: pattern.firstSeen.toISOString(),
      lastSeen: pattern.lastSeen.toISOString(),
    });

    // Record alert metric
    metrics.incrementCounter("error_alerts", {
      severity: pattern.severity,
      type: pattern.type,
    });
  }

  /**
   * Get error statistics
   */
  getStats(windowMs: number = 3600000): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    topPatterns: Array<{ fingerprint: string; type: string; count: number }>;
    errorRate: number;
  } {
    const cutoff = Date.now() - windowMs;
    const recent = this.recentErrors.filter((e) => e.timestamp.getTime() > cutoff);

    const bySeverity: Record<ErrorSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    for (const error of recent) {
      bySeverity[error.severity]++;
    }

    // Top patterns
    const patternCounts = new Map<string, { fingerprint: string; type: string; count: number }>();
    for (const error of recent) {
      const existing = patternCounts.get(error.fingerprint);
      if (existing) {
        existing.count++;
      } else {
        patternCounts.set(error.fingerprint, {
          fingerprint: error.fingerprint,
          type: error.type,
          count: 1,
        });
      }
    }

    const topPatterns = Array.from(patternCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: recent.length,
      bySeverity,
      topPatterns,
      errorRate: (windowMs / 1000) > 0 ? recent.length / (windowMs / 1000 / 60) : 0, // errors per minute
    };
  }

  /**
   * Get pattern details
   */
  getPattern(fingerprint: string): ErrorPattern | undefined {
    return this.patterns.get(fingerprint);
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): ErrorPattern[] {
    return Array.from(this.patterns.values())
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Clear old data
   */
  cleanup(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
    const cutoff = Date.now() - maxAgeMs;

    // Clear old recent errors
    this.recentErrors = this.recentErrors.filter(
      (e) => e.timestamp.getTime() > cutoff
    );

    // Clear old patterns
    for (const [fingerprint, pattern] of this.patterns) {
      if (pattern.lastSeen.getTime() < cutoff) {
        this.patterns.delete(fingerprint);
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const errorTracker = new ErrorTracker();

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Wrap async function with error tracking
 */
export function withErrorTracking<T>(
  fn: () => Promise<T>,
  context?: ErrorContext
): Promise<T> {
  return fn().catch((error) => {
    errorTracker.track(error, context);
    throw error;
  });
}

/**
 * Create error tracking middleware for Express
 */
export function errorTrackingMiddleware() {
  return (
    error: Error,
    req: { path?: string; method?: string; headers?: Record<string, string> },
    res: { status: (code: number) => { json: (data: unknown) => void } },
    next: () => void
  ) => {
    errorTracker.track(error, {
      operation: `${req.method} ${req.path}`,
      requestId: req.headers?.["x-request-id"] as string,
    });

    // Don't modify response, just track
    next();
  };
}

export default errorTracker;

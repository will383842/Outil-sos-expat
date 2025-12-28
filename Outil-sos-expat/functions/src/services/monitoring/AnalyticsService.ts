/**
 * =============================================================================
 * ANALYTICS SERVICE - Dashboards et reporting
 * =============================================================================
 *
 * Service centralisé pour:
 * - Agrégation des métriques
 * - Génération de rapports
 * - Export pour dashboards
 * - Trend analysis
 *
 * =============================================================================
 */

import { metrics, SLO_TARGETS } from "./MetricsService";
import { getSessionMetrics, estimateSessionCost } from "./FirestoreMonitor";
import { getCacheStats, collectRedisMetrics } from "./RedisMonitor";
import { errorTracker } from "./ErrorTracker";
import { alerting } from "./AlertingService";

// =============================================================================
// TYPES
// =============================================================================

export interface DashboardData {
  timestamp: Date;
  summary: SystemSummary;
  performance: PerformanceMetrics;
  errors: ErrorMetrics;
  costs: CostMetrics;
  slos: SLOStatus[];
  trends: TrendData;
}

export interface SystemSummary {
  status: "healthy" | "degraded" | "critical";
  activeAlerts: number;
  uptime: number;
  requestsLastHour: number;
  errorsLastHour: number;
}

export interface PerformanceMetrics {
  latency: {
    aiChat: { p50: number; p95: number; p99: number };
    webhooks: { p50: number; p95: number; p99: number };
    firestore: { reads: number; writes: number; avgLatency: number };
  };
  cache: {
    hitRate: number;
    avgLatency: number;
    size: number;
  };
  coldStarts: {
    rate: number;
    avgDuration: number;
  };
}

export interface ErrorMetrics {
  total: number;
  rate: number;
  bySeverity: Record<string, number>;
  topErrors: Array<{ type: string; count: number; lastSeen: Date }>;
}

export interface CostMetrics {
  firestore: {
    reads: number;
    writes: number;
    estimatedCostUSD: number;
  };
  ai: {
    requests: number;
    tokensIn: number;
    tokensOut: number;
    estimatedCostUSD: number;
  };
  functions: {
    invocations: number;
    gbSeconds: number;
    estimatedCostUSD: number;
  };
}

export interface SLOStatus {
  name: string;
  target: number;
  actual: number;
  unit: string;
  compliant: boolean;
  margin: number;
}

export interface TrendData {
  latency: Array<{ time: Date; value: number }>;
  errors: Array<{ time: Date; value: number }>;
  requests: Array<{ time: Date; value: number }>;
  cacheHitRate: Array<{ time: Date; value: number }>;
}

export interface ReportConfig {
  period: "hourly" | "daily" | "weekly" | "monthly";
  includeRawData: boolean;
  format: "json" | "csv" | "html";
}

// =============================================================================
// IN-MEMORY TIME SERIES
// =============================================================================

interface TimeSeriesPoint {
  timestamp: number;
  latency: number;
  errors: number;
  requests: number;
  cacheHitRate: number;
}

const timeSeries: TimeSeriesPoint[] = [];
const MAX_SERIES_POINTS = 1440; // 24 hours at 1-minute resolution

// =============================================================================
// ANALYTICS SERVICE
// =============================================================================

class AnalyticsService {
  private lastCollectionTime = 0;
  private readonly collectionIntervalMs = 60000; // 1 minute

  /**
   * Collect current metrics and add to time series
   */
  collectMetrics(): void {
    const now = Date.now();

    // Rate limit collection
    if (now - this.lastCollectionTime < this.collectionIntervalMs) {
      return;
    }

    this.lastCollectionTime = now;

    const latencyStats = metrics.getLatencyStats("ai_chat");
    const cacheStats = getCacheStats();
    const errorStats = errorTracker.getStats(60000);

    const point: TimeSeriesPoint = {
      timestamp: now,
      latency: latencyStats?.p95 || 0,
      errors: errorStats.total,
      requests: latencyStats?.count || 0,
      cacheHitRate: cacheStats.hitRate,
    };

    timeSeries.push(point);

    // Trim old data
    while (timeSeries.length > MAX_SERIES_POINTS) {
      timeSeries.shift();
    }
  }

  /**
   * Get complete dashboard data
   */
  async getDashboardData(): Promise<DashboardData> {
    // Collect fresh metrics
    this.collectMetrics();

    const summary = this.getSystemSummary();
    const performance = await this.getPerformanceMetrics();
    const errors = this.getErrorMetrics();
    const costs = this.getCostMetrics();
    const slos = this.getSLOStatus();
    const trends = this.getTrendData();

    return {
      timestamp: new Date(),
      summary,
      performance,
      errors,
      costs,
      slos,
      trends,
    };
  }

  /**
   * Get system summary
   */
  private getSystemSummary(): SystemSummary {
    const activeAlerts = alerting.getActiveAlerts();
    const errorStats = errorTracker.getStats(3600000);
    const latencyStats = metrics.getLatencyStats("ai_chat");

    // Determine status
    let status: SystemSummary["status"] = "healthy";
    if (activeAlerts.some((a) => a.priority === "P1")) {
      status = "critical";
    } else if (activeAlerts.some((a) => a.priority === "P2")) {
      status = "degraded";
    } else if (errorStats.total > 50) {
      status = "degraded";
    }

    return {
      status,
      activeAlerts: activeAlerts.length,
      uptime: this.calculateUptime(),
      requestsLastHour: latencyStats?.count || 0,
      errorsLastHour: errorStats.total,
    };
  }

  /**
   * Calculate uptime percentage
   */
  private calculateUptime(): number {
    // Based on error rate in last 24 hours
    const errorStats = errorTracker.getStats(24 * 60 * 60 * 1000);
    const errorRate = errorStats.errorRate;

    // Simplified uptime calculation
    return Math.max(0, Math.min(100, 100 - errorRate));
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const aiLatency = metrics.getLatencyStats("ai_chat");
    const webhookLatency = metrics.getLatencyStats("webhook_ingest");
    const firestoreMetrics = getSessionMetrics();
    const cacheStats = getCacheStats();
    const redisMetrics = await collectRedisMetrics();

    return {
      latency: {
        aiChat: {
          p50: aiLatency?.p50 || 0,
          p95: aiLatency?.p95 || 0,
          p99: aiLatency?.p99 || 0,
        },
        webhooks: {
          p50: webhookLatency?.p50 || 0,
          p95: webhookLatency?.p95 || 0,
          p99: webhookLatency?.p99 || 0,
        },
        firestore: {
          reads: firestoreMetrics.reads,
          writes: firestoreMetrics.writes,
          avgLatency: 0, // Would need to track this
        },
      },
      cache: {
        hitRate: cacheStats.hitRate,
        avgLatency: cacheStats.avgLatencyMs,
        size: 0, // Would need Redis INFO
      },
      coldStarts: {
        rate: 0, // Would need to calculate from function metrics
        avgDuration: 0,
      },
    };
  }

  /**
   * Get error metrics
   */
  private getErrorMetrics(): ErrorMetrics {
    const stats = errorTracker.getStats(3600000);
    const patterns = errorTracker.getAllPatterns().slice(0, 10);

    return {
      total: stats.total,
      rate: stats.errorRate,
      bySeverity: stats.bySeverity,
      topErrors: patterns.map((p) => ({
        type: p.type,
        count: p.count,
        lastSeen: p.lastSeen,
      })),
    };
  }

  /**
   * Get cost metrics
   */
  private getCostMetrics(): CostMetrics {
    const firestoreCost = estimateSessionCost();

    return {
      firestore: {
        reads: firestoreCost.reads,
        writes: firestoreCost.writes,
        estimatedCostUSD: firestoreCost.totalUSD,
      },
      ai: {
        requests: 0, // Would track from AI handlers
        tokensIn: 0,
        tokensOut: 0,
        estimatedCostUSD: 0,
      },
      functions: {
        invocations: 0, // Would get from Cloud Monitoring
        gbSeconds: 0,
        estimatedCostUSD: 0,
      },
    };
  }

  /**
   * Get SLO status
   */
  private getSLOStatus(): SLOStatus[] {
    const slos = metrics.getAllSLOStatuses();

    return slos.map((slo) => ({
      name: slo.name,
      target: slo.target,
      actual: slo.actual,
      unit: slo.unit,
      compliant: slo.compliant,
      margin: slo.target - slo.actual,
    }));
  }

  /**
   * Get trend data
   */
  private getTrendData(): TrendData {
    const last24h = timeSeries.filter(
      (p) => p.timestamp > Date.now() - 24 * 60 * 60 * 1000
    );

    // Downsample to hourly for trends
    const hourlyBuckets = new Map<number, TimeSeriesPoint[]>();

    for (const point of last24h) {
      const hourKey = Math.floor(point.timestamp / 3600000) * 3600000;
      if (!hourlyBuckets.has(hourKey)) {
        hourlyBuckets.set(hourKey, []);
      }
      hourlyBuckets.get(hourKey)!.push(point);
    }

    const latency: TrendData["latency"] = [];
    const errors: TrendData["errors"] = [];
    const requests: TrendData["requests"] = [];
    const cacheHitRate: TrendData["cacheHitRate"] = [];

    for (const [hourKey, points] of hourlyBuckets) {
      const avgLatency = points.reduce((a, b) => a + b.latency, 0) / points.length;
      const totalErrors = points.reduce((a, b) => a + b.errors, 0);
      const totalRequests = points.reduce((a, b) => a + b.requests, 0);
      const avgCacheHitRate = points.reduce((a, b) => a + b.cacheHitRate, 0) / points.length;

      const time = new Date(hourKey);

      latency.push({ time, value: avgLatency });
      errors.push({ time, value: totalErrors });
      requests.push({ time, value: totalRequests });
      cacheHitRate.push({ time, value: avgCacheHitRate });
    }

    return { latency, errors, requests, cacheHitRate };
  }

  /**
   * Generate a report
   */
  async generateReport(config: ReportConfig): Promise<string> {
    const dashboardData = await this.getDashboardData();

    switch (config.format) {
      case "json":
        return JSON.stringify(dashboardData, null, 2);

      case "csv":
        return this.generateCSV(dashboardData);

      case "html":
        return this.generateHTML(dashboardData);

      default:
        return JSON.stringify(dashboardData);
    }
  }

  /**
   * Generate CSV report
   */
  private generateCSV(data: DashboardData): string {
    const lines: string[] = [];

    // Header
    lines.push("Metric,Value,Unit,Timestamp");

    // Summary
    lines.push(`System Status,${data.summary.status},,${data.timestamp.toISOString()}`);
    lines.push(`Active Alerts,${data.summary.activeAlerts},,`);
    lines.push(`Uptime,${data.summary.uptime},%,`);

    // Performance
    lines.push(`AI Chat P95 Latency,${data.performance.latency.aiChat.p95},ms,`);
    lines.push(`Cache Hit Rate,${data.performance.cache.hitRate},%,`);

    // Errors
    lines.push(`Error Rate,${data.errors.rate},errors/min,`);
    lines.push(`Total Errors,${data.errors.total},,`);

    // SLOs
    for (const slo of data.slos) {
      lines.push(`SLO ${slo.name},${slo.actual},${slo.unit},${slo.compliant ? "COMPLIANT" : "VIOLATION"}`);
    }

    return lines.join("\n");
  }

  /**
   * Generate HTML report
   */
  private generateHTML(data: DashboardData): string {
    const statusColor = data.summary.status === "healthy" ? "green"
      : data.summary.status === "degraded" ? "orange"
      : "red";

    return `
<!DOCTYPE html>
<html>
<head>
  <title>SOS Expat - System Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    .status { padding: 10px; border-radius: 5px; color: white; }
    .healthy { background: green; }
    .degraded { background: orange; }
    .critical { background: red; }
    table { border-collapse: collapse; width: 100%; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    .compliant { color: green; }
    .violation { color: red; }
  </style>
</head>
<body>
  <h1>SOS Expat - System Report</h1>
  <p>Generated: ${data.timestamp.toISOString()}</p>

  <h2>System Status</h2>
  <div class="status ${data.summary.status}">
    Status: ${data.summary.status.toUpperCase()}
  </div>
  <ul>
    <li>Active Alerts: ${data.summary.activeAlerts}</li>
    <li>Uptime: ${data.summary.uptime.toFixed(2)}%</li>
    <li>Requests (last hour): ${data.summary.requestsLastHour}</li>
    <li>Errors (last hour): ${data.summary.errorsLastHour}</li>
  </ul>

  <h2>Performance</h2>
  <table>
    <tr><th>Metric</th><th>P50</th><th>P95</th><th>P99</th></tr>
    <tr>
      <td>AI Chat Latency</td>
      <td>${data.performance.latency.aiChat.p50.toFixed(0)}ms</td>
      <td>${data.performance.latency.aiChat.p95.toFixed(0)}ms</td>
      <td>${data.performance.latency.aiChat.p99.toFixed(0)}ms</td>
    </tr>
  </table>

  <h2>SLO Compliance</h2>
  <table>
    <tr><th>SLO</th><th>Target</th><th>Actual</th><th>Status</th></tr>
    ${data.slos.map((slo) => `
    <tr>
      <td>${slo.name}</td>
      <td>${slo.target} ${slo.unit}</td>
      <td>${slo.actual.toFixed(2)} ${slo.unit}</td>
      <td class="${slo.compliant ? "compliant" : "violation"}">
        ${slo.compliant ? "✓ Compliant" : "✗ Violation"}
      </td>
    </tr>
    `).join("")}
  </table>

  <h2>Top Errors</h2>
  <table>
    <tr><th>Type</th><th>Count</th><th>Last Seen</th></tr>
    ${data.errors.topErrors.map((e) => `
    <tr>
      <td>${e.type}</td>
      <td>${e.count}</td>
      <td>${e.lastSeen.toISOString()}</td>
    </tr>
    `).join("")}
  </table>
</body>
</html>
    `;
  }

  /**
   * Get health check data for external monitoring
   */
  async getHealthCheck(): Promise<{
    status: "ok" | "degraded" | "down";
    checks: Record<string, { status: string; latency?: number; message?: string }>;
  }> {
    const checks: Record<string, { status: string; latency?: number; message?: string }> = {};

    // Check Redis
    try {
      const redisStart = Date.now();
      const redisMetrics = await collectRedisMetrics();
      checks.redis = {
        status: redisMetrics.connected ? "ok" : "degraded",
        latency: Date.now() - redisStart,
      };
    } catch (error) {
      checks.redis = { status: "down", message: (error as Error).message };
    }

    // Check error rate
    const errorStats = errorTracker.getStats(300000); // 5 min
    checks.errorRate = {
      status: errorStats.errorRate < 1 ? "ok" : errorStats.errorRate < 5 ? "degraded" : "down",
      message: `${errorStats.errorRate.toFixed(2)} errors/min`,
    };

    // Overall status
    const statuses = Object.values(checks).map((c) => c.status);
    const status = statuses.includes("down") ? "down"
      : statuses.includes("degraded") ? "degraded"
      : "ok";

    return { status, checks };
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const analytics = new AnalyticsService();

export default analytics;

/**
 * =============================================================================
 * WEB VITALS SERVICE - Core Web Vitals Monitoring
 * =============================================================================
 *
 * Collecte et rapporte les Core Web Vitals:
 * - LCP (Largest Contentful Paint) - cible < 2.5s
 * - FID (First Input Delay) - cible < 100ms
 * - CLS (Cumulative Layout Shift) - cible < 0.1
 * - TTFB (Time to First Byte) - cible < 600ms
 * - FCP (First Contentful Paint) - cible < 1.8s
 * - INP (Interaction to Next Paint) - cible < 200ms
 *
 * =============================================================================
 */

// =============================================================================
// TYPES
// =============================================================================

export interface WebVitalsMetric {
  name: "LCP" | "FID" | "CLS" | "TTFB" | "FCP" | "INP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
  navigationType: string;
}

export interface WebVitalsReport {
  timestamp: Date;
  url: string;
  metrics: Partial<Record<WebVitalsMetric["name"], WebVitalsMetric>>;
  deviceType: "mobile" | "tablet" | "desktop";
  connectionType: string;
  userAgent: string;
}

export interface WebVitalsThresholds {
  LCP: { good: number; poor: number };
  FID: { good: number; poor: number };
  CLS: { good: number; poor: number };
  TTFB: { good: number; poor: number };
  FCP: { good: number; poor: number };
  INP: { good: number; poor: number };
}

type MetricHandler = (metric: WebVitalsMetric) => void;

// =============================================================================
// THRESHOLDS (Google's recommendations)
// =============================================================================

const THRESHOLDS: WebVitalsThresholds = {
  LCP: { good: 2500, poor: 4000 },     // ms
  FID: { good: 100, poor: 300 },       // ms
  CLS: { good: 0.1, poor: 0.25 },      // score
  TTFB: { good: 600, poor: 1800 },     // ms
  FCP: { good: 1800, poor: 3000 },     // ms
  INP: { good: 200, poor: 500 },       // ms
};

// =============================================================================
// WEB VITALS SERVICE
// =============================================================================

class WebVitalsService {
  private metricsBuffer: WebVitalsMetric[] = [];
  private handlers: MetricHandler[] = [];
  private initialized = false;
  private reportEndpoint: string | null = null;

  /**
   * Initialize Web Vitals collection
   */
  async init(options?: { reportEndpoint?: string }): Promise<void> {
    if (this.initialized) return;

    this.reportEndpoint = options?.reportEndpoint || null;

    try {
      // Dynamic import of web-vitals library
      const webVitals = await import("web-vitals");

      // Register all metrics
      webVitals.onLCP(this.handleMetric.bind(this));
      webVitals.onFID(this.handleMetric.bind(this));
      webVitals.onCLS(this.handleMetric.bind(this));
      webVitals.onTTFB(this.handleMetric.bind(this));
      webVitals.onFCP(this.handleMetric.bind(this));
      webVitals.onINP(this.handleMetric.bind(this));

      this.initialized = true;
      console.debug("[WebVitals] Initialized");
    } catch (error) {
      console.warn("[WebVitals] Failed to initialize:", error);
    }
  }

  /**
   * Handle incoming metric
   */
  private handleMetric(metric: {
    name: string;
    value: number;
    delta: number;
    id: string;
    navigationType: string;
  }): void {
    const name = metric.name as WebVitalsMetric["name"];
    const rating = this.getRating(name, metric.value);

    const processedMetric: WebVitalsMetric = {
      name,
      value: metric.value,
      rating,
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    };

    // Buffer the metric
    this.metricsBuffer.push(processedMetric);

    // Notify handlers
    this.handlers.forEach((handler) => handler(processedMetric));

    // Log if poor performance
    if (rating === "poor") {
      console.warn(`[WebVitals] Poor ${name}:`, metric.value);
    }

    // Auto-report if endpoint configured
    if (this.reportEndpoint) {
      this.reportToEndpoint(processedMetric);
    }
  }

  /**
   * Get rating based on thresholds
   */
  private getRating(
    name: WebVitalsMetric["name"],
    value: number
  ): WebVitalsMetric["rating"] {
    const threshold = THRESHOLDS[name];
    if (!threshold) return "needs-improvement";

    if (value <= threshold.good) return "good";
    if (value > threshold.poor) return "poor";
    return "needs-improvement";
  }

  /**
   * Report metric to backend
   */
  private async reportToEndpoint(metric: WebVitalsMetric): Promise<void> {
    if (!this.reportEndpoint) return;

    try {
      const report: WebVitalsReport = {
        timestamp: new Date(),
        url: window.location.href,
        metrics: { [metric.name]: metric },
        deviceType: this.getDeviceType(),
        connectionType: this.getConnectionType(),
        userAgent: navigator.userAgent,
      };

      // Use sendBeacon for reliability
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          this.reportEndpoint,
          JSON.stringify(report)
        );
      } else {
        await fetch(this.reportEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(report),
          keepalive: true,
        });
      }
    } catch (error) {
      console.debug("[WebVitals] Report failed:", error);
    }
  }

  /**
   * Detect device type
   */
  private getDeviceType(): "mobile" | "tablet" | "desktop" {
    const ua = navigator.userAgent;
    if (/Mobi|Android/i.test(ua)) {
      return /Tablet|iPad/i.test(ua) ? "tablet" : "mobile";
    }
    return "desktop";
  }

  /**
   * Get connection type
   */
  private getConnectionType(): string {
    const nav = navigator as Navigator & {
      connection?: { effectiveType?: string };
    };
    return nav.connection?.effectiveType || "unknown";
  }

  /**
   * Subscribe to metrics
   */
  onMetric(handler: MetricHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((h) => h !== handler);
    };
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): WebVitalsMetric[] {
    return [...this.metricsBuffer];
  }

  /**
   * Get current report
   */
  getReport(): WebVitalsReport {
    const metricsMap: Partial<Record<WebVitalsMetric["name"], WebVitalsMetric>> = {};

    // Keep latest value for each metric
    for (const metric of this.metricsBuffer) {
      metricsMap[metric.name] = metric;
    }

    return {
      timestamp: new Date(),
      url: window.location.href,
      metrics: metricsMap,
      deviceType: this.getDeviceType(),
      connectionType: this.getConnectionType(),
      userAgent: navigator.userAgent,
    };
  }

  /**
   * Get score summary (0-100)
   */
  getScore(): {
    overall: number;
    details: Record<string, { value: number; score: number; rating: string }>;
  } {
    const report = this.getReport();
    const details: Record<string, { value: number; score: number; rating: string }> = {};
    let totalScore = 0;
    let metricsCount = 0;

    for (const [name, metric] of Object.entries(report.metrics)) {
      if (!metric) continue;

      const score = metric.rating === "good" ? 100
        : metric.rating === "needs-improvement" ? 50
        : 0;

      details[name] = {
        value: metric.value,
        score,
        rating: metric.rating,
      };

      totalScore += score;
      metricsCount++;
    }

    return {
      overall: metricsCount > 0 ? Math.round(totalScore / metricsCount) : 0,
      details,
    };
  }

  /**
   * Clear collected metrics
   */
  clear(): void {
    this.metricsBuffer = [];
  }
}

// =============================================================================
// SINGLETON
// =============================================================================

export const webVitals = new WebVitalsService();

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect } from "react";

export function useWebVitals(): {
  metrics: WebVitalsMetric[];
  score: ReturnType<WebVitalsService["getScore"]>;
  loading: boolean;
} {
  const [metrics, setMetrics] = useState<WebVitalsMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    webVitals.init().then(() => {
      setLoading(false);
      setMetrics(webVitals.getMetrics());
    });

    const unsubscribe = webVitals.onMetric((metric) => {
      setMetrics((prev) => [...prev, metric]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return {
    metrics,
    score: webVitals.getScore(),
    loading,
  };
}

// =============================================================================
// PERFORMANCE OBSERVER UTILITIES
// =============================================================================

/**
 * Track long tasks (> 50ms)
 */
export function trackLongTasks(callback: (duration: number) => void): void {
  if (!("PerformanceObserver" in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        callback(entry.duration);
      }
    });

    observer.observe({ entryTypes: ["longtask"] });
  } catch {
    console.debug("[WebVitals] Long task observer not supported");
  }
}

/**
 * Track resource loading times
 */
export function trackResourceTiming(
  callback: (resource: { name: string; duration: number; type: string }) => void
): void {
  if (!("PerformanceObserver" in window)) return;

  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as PerformanceResourceTiming[]) {
        callback({
          name: entry.name,
          duration: entry.duration,
          type: entry.initiatorType,
        });
      }
    });

    observer.observe({ entryTypes: ["resource"] });
  } catch {
    console.debug("[WebVitals] Resource timing observer not supported");
  }
}

/**
 * Track navigation timing
 */
export function getNavigationTiming(): {
  dns: number;
  tcp: number;
  tls: number;
  ttfb: number;
  download: number;
  domInteractive: number;
  domComplete: number;
  loadComplete: number;
} | null {
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
  if (!nav) return null;

  return {
    dns: nav.domainLookupEnd - nav.domainLookupStart,
    tcp: nav.connectEnd - nav.connectStart,
    tls: nav.secureConnectionStart > 0
      ? nav.connectEnd - nav.secureConnectionStart
      : 0,
    ttfb: nav.responseStart - nav.requestStart,
    download: nav.responseEnd - nav.responseStart,
    domInteractive: nav.domInteractive - nav.fetchStart,
    domComplete: nav.domComplete - nav.fetchStart,
    loadComplete: nav.loadEventEnd - nav.fetchStart,
  };
}

export default webVitals;

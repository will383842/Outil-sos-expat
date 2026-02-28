/**
 * useWebVitals Hook
 * Reports Core Web Vitals (LCP, CLS, INP, FCP, TTFB) to Google Analytics 4
 * via the `web-vitals` library for accurate, production-grade CWV monitoring.
 *
 * @see https://web.dev/articles/vitals
 * @see https://github.com/GoogleChrome/web-vitals
 */

import { useEffect } from 'react';
import type { Metric } from 'web-vitals';

/**
 * Send a Web Vital metric to GA4 as a custom event.
 * Uses `gtag('event', ...)` which is already loaded in index.html via GTM.
 */
function sendToGA4(metric: Metric): void {
  if (typeof window.gtag !== 'function') return;

  window.gtag('event', metric.name, {
    // Use the metric value (already rounded by web-vitals)
    value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
    // Custom dimensions
    event_category: 'Web Vitals',
    event_label: metric.id,
    // Send as non-interaction so it doesn't affect bounce rate
    non_interaction: true,
    // CWV thresholds for GA4 exploration
    metric_rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
    metric_delta: Math.round(metric.value),
    metric_navigation_type: metric.navigationType,
  });
}

/**
 * Hook to measure and report Core Web Vitals to GA4.
 * Call once at the app root level.
 *
 * @example
 * function App() {
 *   useWebVitals();
 *   return <Routes />;
 * }
 */
export function useWebVitals(): void {
  useEffect(() => {
    // Dynamic import to keep bundle small (tree-shaken if not used)
    import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
      onCLS(sendToGA4);
      onINP(sendToGA4);
      onLCP(sendToGA4);
      onFCP(sendToGA4);
      onTTFB(sendToGA4);
    });
  }, []);
}

export default useWebVitals;

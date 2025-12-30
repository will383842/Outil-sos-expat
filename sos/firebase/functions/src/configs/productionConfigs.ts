/**
 * OPTIMIZED: Reduced minInstances to minimize idle costs
 * Previous configuration kept 3+2+1=6 instances warm 24/7
 * Estimated savings: $150-300/month
 *
 * Note: webhook.minInstances=1 kept for payment webhook reliability
 */
export const productionConfigs = {
  critical: {
    region: "europe-west1",
    memory: "1GiB",
    cpu: 2.0,
    maxInstances: 20,
    minInstances: 0,  // OPTIMIZED: Was 3, now 0 (cold start acceptable for non-payment critical paths)
    concurrency: 10
  },
  webhook: {
    region: "europe-west1",
    memory: "512MiB",
    cpu: 1.0,
    maxInstances: 15,
    minInstances: 1,  // OPTIMIZED: Was 2, kept 1 for Stripe/PayPal webhook reliability
    concurrency: 15
  },
  standard: {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.5,
    maxInstances: 8,
    minInstances: 0,  // OPTIMIZED: Was 1, now 0
    concurrency: 5
  },
  admin: {
    region: "europe-west1",
    memory: "256MiB",
    cpu: 0.25,
    maxInstances: 3,
    minInstances: 0,
    concurrency: 1
  }
};

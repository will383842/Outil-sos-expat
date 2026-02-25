/**
 * Shared Function Configurations
 *
 * Centralized configuration for Cloud Functions to ensure consistent
 * cost optimization and performance settings across all modules.
 *
 * USAGE:
 * import { adminConfig, userConfig, webhookConfig } from '../lib/functionConfigs';
 *
 * export const myFunction = onCall(
 *   { ...adminConfig, timeoutSeconds: 30 },
 *   async (request) => { ... }
 * );
 */

// ============================================================================
// CORS CONFIGURATION
// ============================================================================

export const ALLOWED_ORIGINS = [
  "https://sos-expat.com",
  "https://www.sos-expat.com",
  "https://ia.sos-expat.com",
  "https://multi.sos-expat.com",
  "https://sosexpats.com",
  "https://www.sosexpats.com",
  "https://outil-sos-expat.pages.dev",
  "http://localhost:5173",
  "http://localhost:3000",
];

// ============================================================================
// BASE CONFIGURATIONS
// ============================================================================

/**
 * Emergency/minimal config - for admin functions that are rarely used
 * - 0.25 vCPU to minimize cost
 * - minInstances: 0 (no cold instances)
 * - maxInstances: 3 (limit burst costs)
 * - concurrency: 1 (simple operations)
 */
export const emergencyConfig = {
  region: "europe-west1" as const,
  memory: "128MiB" as const,
  cpu: 0.083,  // QUOTA FIX: 0.25 → 0.083 (min Firebase) to stay under 48 vCPU/region
  maxInstances: 3,
  minInstances: 0,
  concurrency: 1,
  cors: ALLOWED_ORIGINS,
};

/**
 * Admin config - for admin-only functions (dashboard, reports, etc.)
 * - Slightly more resources than emergency
 * - maxInstances: 5 (few concurrent admins expected)
 * - concurrency: 1 (cpu < 1 requires concurrency = 1)
 */
export const adminConfig = {
  region: "europe-west1" as const,
  memory: "256MiB" as const,
  cpu: 0.083,  // QUOTA FIX: 0.25 → 0.083 to stay under 48 vCPU/region
  maxInstances: 5,
  minInstances: 0,
  concurrency: 1,
  cors: ALLOWED_ORIGINS,
};

/**
 * Chatter admin config - for admin functions managing chatters/affiliate (us-central1)
 * Colocated with chatter user functions for load balancing consistency.
 * - maxInstances: 5 (few concurrent admins expected)
 * - concurrency: 1 (cpu < 1 requires concurrency = 1)
 */
export const chatterAdminConfig = {
  region: "us-central1" as const,
  memory: "128MiB" as const,
  cpu: 0.125,  // TEMP: 0.083 → 0.125 for cold start on new region (184×0.125=23 vCPU < 24 quota)
  maxInstances: 5,
  minInstances: 0,
  concurrency: 1,
  cors: ALLOWED_ORIGINS,
};

/**
 * Affiliate admin config (us-central1) - shared by influencer, blogger, groupAdmin admins
 * Same region as chatter admin for load balancing consistency.
 */
export const affiliateAdminConfig = {
  region: "us-central1" as const,
  memory: "128MiB" as const,
  cpu: 0.125,  // TEMP: 0.083 → 0.125 for cold start on new region (184×0.125=23 vCPU < 24 quota)
  maxInstances: 5,
  minInstances: 0,
  concurrency: 1,
  cors: ALLOWED_ORIGINS,
};

/**
 * User config - for user-facing callables (dashboard, profile, etc.)
 * - More resources for responsiveness
 * - maxInstances: 20 (handle user load)
 * - concurrency: 10 (multiple concurrent users)
 */
export const userConfig = {
  region: "europe-west1" as const,
  memory: "256MiB" as const,
  cpu: 0.083,  // QUOTA FIX: 1.0 → 0.083 to stay under 48 vCPU/region
  maxInstances: 20,
  minInstances: 0,
  concurrency: 1,  // QUOTA FIX: 10 → 1 (cpu < 1 requires concurrency = 1)
  cors: ALLOWED_ORIGINS,
};

/**
 * High-traffic config - for frequently called functions
 * - More instances for scale
 * - Higher concurrency
 */
export const highTrafficConfig = {
  region: "europe-west1" as const,
  memory: "256MiB" as const,
  cpu: 0.083,  // QUOTA FIX: 1.0 → 0.083 to stay under 48 vCPU/region
  maxInstances: 50,
  minInstances: 0,
  concurrency: 1,  // QUOTA FIX: 40 → 1 (cpu < 1 requires concurrency = 1)
  cors: ALLOWED_ORIGINS,
};

/**
 * Webhook config - for HTTP webhooks (Stripe, etc.)
 * - Must handle bursts from payment processors
 * - concurrency: 1 for idempotency safety
 */
export const webhookConfig = {
  region: "europe-west1" as const,
  memory: "256MiB" as const,
  cpu: 0.083,  // QUOTA FIX: 0.25 → 0.083 to stay under 48 vCPU/region
  maxInstances: 30,
  minInstances: 0,
  concurrency: 1,
  cors: ALLOWED_ORIGINS,
};

/**
 * Scheduled/background config - for scheduled tasks
 * - Single instance (scheduled runs once)
 * - Longer timeout for batch operations
 */
export const scheduledConfig = {
  region: "europe-west1" as const,
  memory: "256MiB" as const,
  cpu: 0.083,  // QUOTA FIX: 0.25 → 0.083 to stay under 48 vCPU/region
  maxInstances: 1,
  minInstances: 0,
  concurrency: 1,
  cors: ALLOWED_ORIGINS,
};

/**
 * Trigger config - for Firestore/Auth triggers
 * - Handle document write spikes
 * - concurrency: 1 for consistency
 */
export const triggerConfig = {
  region: "europe-west3" as const,
  memory: "128MiB" as const,
  // P0 AUDIT FIX 2026-02-21: Reduced from 0.25 to 0.083 (1/12 vCPU)
  // 248 services × 0.25 = 62 vCPU → exceeds quota. 248 × 0.083 = 20.6 vCPU
  cpu: 0.083,
  maxInstances: 10,
  minInstances: 0,
  concurrency: 1,
  cors: ALLOWED_ORIGINS,
};

/**
 * Heavy processing config - for PDF generation, exports, etc.
 * - More memory for processing
 * - Lower instances (expensive)
 */
export const heavyProcessingConfig = {
  region: "europe-west1" as const,
  memory: "512MiB" as const,  // FIX: 1GiB+cpu<1 caused deploy error, reduced to 512MiB with cpu 0.5
  cpu: 0.5,  // FIX: minimum 0.5 required for memory > 512MiB
  maxInstances: 5,
  minInstances: 0,
  concurrency: 1,
  cors: ALLOWED_ORIGINS,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Merge config with additional options
 */
export function withTimeout<T extends object>(
  config: T,
  timeoutSeconds: number
): T & { timeoutSeconds: number } {
  return { ...config, timeoutSeconds };
}

/**
 * Merge config with secrets
 */
export function withSecrets<T extends object>(
  config: T,
  secrets: unknown[]
): T & { secrets: unknown[] } {
  return { ...config, secrets };
}

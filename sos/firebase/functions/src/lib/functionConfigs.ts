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

const ALLOWED_ORIGINS = [
  "https://sos-expat.com",
  "https://www.sos-expat.com",
  "https://ia.sos-expat.com",
  "https://multi.sos-expat.com",
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
  memory: "256MiB" as const,
  cpu: 0.25,
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
  memory: "512MiB" as const,
  cpu: 0.25,  // Reduced from 0.5 - admin functions mostly do simple DB operations
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
  memory: "512MiB" as const,
  cpu: 0.5,
  maxInstances: 20,
  minInstances: 0,
  concurrency: 10,
  cors: ALLOWED_ORIGINS,
};

/**
 * High-traffic config - for frequently called functions
 * - More instances for scale
 * - Higher concurrency
 */
export const highTrafficConfig = {
  region: "europe-west1" as const,
  memory: "512MiB" as const,
  cpu: 1,
  maxInstances: 50,
  minInstances: 1, // Keep 1 warm for low latency
  concurrency: 40,
  cors: ALLOWED_ORIGINS,
};

/**
 * Webhook config - for HTTP webhooks (Stripe, etc.)
 * - Must handle bursts from payment processors
 * - concurrency: 1 for idempotency safety
 */
export const webhookConfig = {
  region: "europe-west1" as const,
  memory: "512MiB" as const,
  cpu: 0.25,  // Reduced from 0.5 - webhooks mostly wait for external API responses
  maxInstances: 30,
  minInstances: 0,
  concurrency: 1, // Important: one webhook at a time per instance
  cors: ALLOWED_ORIGINS,
};

/**
 * Scheduled/background config - for scheduled tasks
 * - Single instance (scheduled runs once)
 * - Longer timeout for batch operations
 */
export const scheduledConfig = {
  region: "europe-west1" as const,
  memory: "512MiB" as const,
  cpu: 0.25,  // Reduced from 0.5 - scheduled tasks mostly do DB operations
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
  memory: "256MiB" as const,
  cpu: 0.25,
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
  memory: "1GiB" as const,
  cpu: 1,
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

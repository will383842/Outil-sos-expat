/**
 * Shared constants for Firebase Functions
 *
 * P2-6 FIX: Centralized magic constants to avoid duplication and off-by-one errors.
 */

// ─── Firestore Batch Limits ───────────────────────────────────────────────────

/** Maximum number of operations per Firestore WriteBatch (hard limit). */
export const FIRESTORE_BATCH_LIMIT = 500;

/**
 * Safe threshold for Firestore WriteBatch operations.
 * Use this when a single iteration may add 2 ops (e.g. users + sos_profiles).
 * Leaves a 10-op buffer below the hard limit.
 */
export const FIRESTORE_BATCH_SAFE_LIMIT = 490;

// ─── Firestore Pagination ─────────────────────────────────────────────────────

/** Default page size for Firestore cursor-pagination queries. */
export const FIRESTORE_PAGE_SIZE = 500;

// ─── Admin Contact Emails ────────────────────────────────────────────────────

/** Primary support email — used across alerts, notifications, FAQ content. */
export const ADMIN_SUPPORT_EMAIL = 'contact@sos-expat.com';

/** Alert recipient list — for monitoring, security alerts, and filing reminders. */
export const ADMIN_ALERT_EMAILS = [ADMIN_SUPPORT_EMAIL];

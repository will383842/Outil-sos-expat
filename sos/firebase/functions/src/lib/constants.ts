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

/**
 * @deprecated USE lib/secrets.ts INSTEAD!
 *
 * This file is OBSOLETE. All secrets are now centralized in lib/secrets.ts.
 * Do NOT use this file - import from "../lib/secrets" instead.
 *
 * P0 FIX: defineSecret() must only be called ONCE per secret across the entire codebase.
 * Multiple calls cause Firebase deployment conflicts and runtime errors.
 */

// ❌ DO NOT USE - Use lib/secrets.ts instead
// Re-export for backwards compatibility only (will be removed)
export { EMAIL_USER, EMAIL_PASS } from '../lib/secrets';

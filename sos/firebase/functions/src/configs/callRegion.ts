// firebase/functions/src/configs/callRegion.ts
// ============================================================================
// CALL FUNCTIONS REGION CONFIGURATION
// ============================================================================
// This file centralizes the region configuration for all call-related functions.
// By deploying call functions to a dedicated region (europe-west3), we:
// 1. Isolate call functions from other functions to avoid quota issues
// 2. Ensure call functions always have available CPU quota
// 3. Improve reliability of the call system
// ============================================================================

/**
 * Region for all call-related functions.
 *
 * These functions are deployed to a separate region to:
 * - Avoid CPU quota exhaustion from other functions (514+ functions in europe-west1)
 * - Ensure critical call functions always have resources available
 * - Provide isolation for the call system
 *
 * Functions using this region:
 * - twilioCallWebhook
 * - twilioConferenceWebhook
 * - twilioAmdTwiml
 * - twilioGatherResponse
 * - providerNoAnswerTwiML
 * - executeCallTask
 * - setProviderAvailableTask
 * - forceEndCallTask
 * - busySafetyTimeoutTask
 * - createAndScheduleCallHTTPS (optional - can stay in europe-west1 for now)
 */
export const CALL_FUNCTIONS_REGION = "europe-west3" as const;

/**
 * Default region for non-call functions.
 * Most functions remain in europe-west1.
 */
export const DEFAULT_REGION = "europe-west1" as const;

/**
 * Type for supported regions
 */
export type SupportedRegion = typeof CALL_FUNCTIONS_REGION | typeof DEFAULT_REGION;

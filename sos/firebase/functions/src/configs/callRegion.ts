// firebase/functions/src/configs/callRegion.ts
// ============================================================================
// FUNCTION REGION CONFIGURATION
// ============================================================================
// This file centralizes the region configuration for all functions.
//
// 3 regions:
// 1. europe-west1 (Belgium) - General business logic (~500+ functions)
// 2. europe-west3 (Frankfurt) - Scheduled/trigger functions (~180 background)
// 3. europe-west4 (Netherlands) - Call + Payment functions (~17 critical)
//
// Call and payment functions are in europe-west4 to avoid the CPU quota
// exhaustion in europe-west3 (199 functions hitting run.googleapis.com/cpu_allocation).
// This gives real-time call handling and financial operations a dedicated quota.
// ============================================================================

/**
 * Region for all call-related functions.
 *
 * These functions are deployed to a separate region to:
 * - Avoid CPU quota exhaustion in europe-west3 (199 functions hitting limit)
 * - Ensure critical call functions always have resources available
 * - Provide dedicated CPU quota in europe-west4 (Netherlands)
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
export const CALL_FUNCTIONS_REGION = "europe-west4" as const;

/**
 * Region for payment-related functions.
 *
 * Payment functions are deployed to europe-west4 alongside call functions:
 * - Ensure financial operations are never blocked by CPU quota exhaustion
 * - Dedicated quota in europe-west4 (Netherlands) separate from background functions
 * - Co-locate with call functions for shared infrastructure benefits
 *
 * Functions using this region:
 * - cancelWithdrawal
 * - deletePaymentMethod
 * - getPaymentMethods
 * - getWithdrawalHistory
 * - getWithdrawalStatus
 * - requestWithdrawal
 * - savePaymentMethod
 * - setDefaultPaymentMethod
 */
export const PAYMENT_FUNCTIONS_REGION = "europe-west4" as const;

/**
 * Default region for non-call, non-payment functions.
 * Most functions remain in europe-west1.
 */
export const DEFAULT_REGION = "europe-west1" as const;

/**
 * Type for supported regions
 */
export type SupportedRegion = typeof CALL_FUNCTIONS_REGION | typeof DEFAULT_REGION | typeof PAYMENT_FUNCTIONS_REGION;

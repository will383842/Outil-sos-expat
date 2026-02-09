// firebase/functions/src/configs/callRegion.ts
// ============================================================================
// FUNCTION REGION CONFIGURATION
// ============================================================================
// This file centralizes the region configuration for all functions.
//
// 3 regions:
// 1. europe-west1 (Belgium) - General business logic (~500+ functions)
// 2. europe-west3 (Frankfurt) - Call functions (isolated for CPU quota)
// 3. europe-west3 (Frankfurt) - Payment functions (co-located with calls
//    for reliability isolation from general functions)
//
// Calls and payments share europe-west3 to isolate them from the CPU quota
// pressure of 500+ general functions in europe-west1. This ensures that
// real-time call handling and financial operations always have resources.
// ============================================================================

/**
 * Region for all call-related functions.
 *
 * These functions are deployed to a separate region to:
 * - Avoid CPU quota exhaustion from other functions (500+ functions in europe-west1)
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
 * Region for payment-related functions.
 *
 * Payment functions are deployed to the same isolated region as calls to:
 * - Ensure financial operations are never blocked by CPU quota from general functions
 * - Provide reliability isolation for withdrawal processing
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
export const PAYMENT_FUNCTIONS_REGION = "europe-west3" as const;

/**
 * Default region for non-call, non-payment functions.
 * Most functions remain in europe-west1.
 */
export const DEFAULT_REGION = "europe-west1" as const;

/**
 * Type for supported regions
 */
export type SupportedRegion = typeof CALL_FUNCTIONS_REGION | typeof DEFAULT_REGION | typeof PAYMENT_FUNCTIONS_REGION;

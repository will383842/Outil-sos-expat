// firebase/functions/src/configs/callRegion.ts
// ============================================================================
// FUNCTION REGION CONFIGURATION
// ============================================================================
// This file centralizes the region configuration for all functions.
//
// 2 regions:
// 1. europe-west1 (Belgium) - General business logic (~500+ functions)
// 2. europe-west3 (Frankfurt) - Triggers + Call/webhook + Payment callables
// ============================================================================

/**
 * Region for all call-related functions (webhooks + Cloud Tasks endpoints).
 *
 * These stay in europe-west3 because:
 * - Twilio webhook URLs are configured to point here
 * - Cloud Tasks queue (call-scheduler-queue) is in europe-west3
 * - Changing would require updating Twilio dashboard + Cloud Tasks URLs
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
 */
export const CALL_FUNCTIONS_REGION = "europe-west4" as const;

/**
 * Region for payment-related callable functions.
 *
 * Payment callables are deployed to europe-west3 alongside call functions:
 * - Separate from europe-west1 (500+ functions) to avoid CPU quota exhaustion
 * - Frontend calls these via httpsCallable with dedicated region parameter
 * - NOTE: europe-west4 migration blocked by GCP "Project failed to initialize" quota
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
 * - createPaymentIntent
 * - getRecommendedPaymentGateway
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
